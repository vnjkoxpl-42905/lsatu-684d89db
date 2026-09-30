import { supabase } from '@/integrations/supabase/client';
import { PracticeSession, TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { practiceSessionIdFor } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { GUIDED_SESSION_PREFIX } from '@/lib/guidedDrillSession';
import { DRILL_SESSION_PREFIX } from '@/lib/drillResumeSession';
import { parseOwnedDrillRun } from '@/lib/drillRunLedger';

export interface GuidedWorkEvidence {
  sessionId: string;
  savedAnswerCount: number;
  status: 'in_progress' | 'completed';
}

export type HomeworkWorkEvidence = GuidedWorkEvidence;
const HOMEWORK_SESSION_PREFIX = `${DRILL_SESSION_PREFIX}assignment::`;

interface StoredWorkRow {
  record_id: string;
  data: unknown;
}

/** Only account-saved, per-assignment guided sessions count as work evidence. */
function projectSavedAssignmentEvidence(
  studentId: string,
  rows: StoredWorkRow[],
  prefix: string,
): Record<string, GuidedWorkEvidence> {
  const evidence: Record<string, GuidedWorkEvidence> = {};
  for (const row of rows) {
    const parsed = PracticeSession.safeParse(row.data);
    if (!parsed.success) continue;
    const session = parsed.data;
    if (session.user_id !== studentId || !session.pool_slug.startsWith(prefix)) continue;
    const assignmentId = session.pool_slug.slice(prefix.length);
    // Only assignment keys identify an issued instance. Guided direct-launch
    // keys are under the same namespace but do not belong in My Work.
    if (!assignmentId || (prefix === GUIDED_SESSION_PREFIX && (assignmentId.startsWith('drill:') || assignmentId.startsWith('slug:')))) continue;
    if (row.record_id !== session.id || row.record_id !== practiceSessionIdFor(studentId, session.pool_slug)) continue;
    if (session.attempts.length === 0) continue;
    evidence[assignmentId] = {
      sessionId: session.id,
      savedAnswerCount: session.attempts.length,
      status: session.status,
    };
  }
  return evidence;
}

export function projectGuidedWorkEvidence(studentId: string, rows: StoredWorkRow[], runRows: StoredWorkRow[] = []) {
  const evidence = projectSavedAssignmentEvidence(studentId, rows, GUIDED_SESSION_PREFIX);
  const times: Record<string, string> = {};
  for (const row of rows) {
    const parsed = PracticeSession.safeParse(row.data);
    if (!parsed.success || !parsed.data.pool_slug.startsWith(GUIDED_SESSION_PREFIX)) continue;
    const assignmentId = parsed.data.pool_slug.slice(GUIDED_SESSION_PREFIX.length);
    if (evidence[assignmentId]?.sessionId === row.record_id) times[assignmentId] = parsed.data.updated_at;
  }
  // Sort ties as well as dates, so database page order cannot choose a different sitting.
  const runs = runRows.map((row) => parseOwnedDrillRun(studentId, row.record_id, row.data))
    .filter((run) => run !== null)
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.id.localeCompare(b.id));
  for (const run of runs) {
    const { source_key: sourceKey, session } = run;
    if (!sourceKey.startsWith(GUIDED_SESSION_PREFIX) || session.pool_slug !== sourceKey || session.completion_id !== sourceKey) continue;
    const assignmentId = sourceKey.slice(GUIDED_SESSION_PREFIX.length);
    if (!assignmentId || assignmentId.startsWith('drill:') || assignmentId.startsWith('slug:') || session.attempts.length === 0) continue;
    const previous = evidence[assignmentId];
    // An already completed issued assignment stays complete when practiced again.
    if (previous?.status === 'completed' && session.status !== 'completed') continue;
    if (previous && previous.status === session.status && (times[assignmentId] ?? '') > run.updated_at) continue;
    evidence[assignmentId] = {
      sessionId: run.id,
      savedAnswerCount: session.attempts.length,
      status: session.status,
    };
    times[assignmentId] = run.updated_at;
  }
  return evidence;
}

export function projectHomeworkWorkEvidence(studentId: string, rows: StoredWorkRow[]) {
  return projectSavedAssignmentEvidence(studentId, rows, HOMEWORK_SESSION_PREFIX);
}

/** RLS limits students to their own rows and permits authorized admins to read selected students. */
export async function loadAssignmentWorkEvidence(studentId: string): Promise<{
  guided: Record<string, GuidedWorkEvidence>;
  homework: Record<string, HomeworkWorkEvidence>;
}> {
  const [rows, runRows] = await Promise.all([
    loadStoredWorkRows(studentId, TABLES.practice_sessions),
    loadStoredWorkRows(studentId, TABLES.drill_runs),
  ]);
  return {
    guided: projectGuidedWorkEvidence(studentId, rows, runRows),
    homework: projectHomeworkWorkEvidence(studentId, rows),
  };
}

async function loadStoredWorkRows(studentId: string, tableName: string): Promise<StoredWorkRow[]> {
  const rows: StoredWorkRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('bootcamp_kv')
      .select('record_id,data')
      .eq('user_id', studentId)
      .eq('table_name', tableName)
      .order('record_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return rows;
}

/** Compatibility for consumers that need only guided evidence. */
export async function loadGuidedWorkEvidence(studentId: string): Promise<Record<string, GuidedWorkEvidence>> {
  return (await loadAssignmentWorkEvidence(studentId)).guided;
}

/**
 * Opening an Activity writes `started_at`, but saving a response writes a row
 * here. Page through all matching rows so the default 1,000-row API limit
 * cannot make a later assignment look untouched.
 */
export async function loadActivityWorkEvidence(studentId: string, assignmentIds: string[]): Promise<Set<string>> {
  const found = new Set<string>();
  const ids = [...new Set(assignmentIds)];
  const pageSize = 500;
  for (let start = 0; start < ids.length; start += 50) {
    const group = ids.slice(start, start + 50);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('activity_item_responses')
        .select('id,assignment_id')
        .eq('student_id', studentId)
        .in('assignment_id', group)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      const rows = data ?? [];
      for (const row of rows) found.add(row.assignment_id);
      if (rows.length < pageSize || group.every((id) => found.has(id))) break;
    }
  }
  return found;
}
