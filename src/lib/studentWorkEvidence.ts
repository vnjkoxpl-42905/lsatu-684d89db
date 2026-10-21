import { supabase } from '@/integrations/supabase/client';
import { PracticeSession } from '@/bootcamps/main-conclusion/persistence/records';
import { practiceSessionIdFor } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { GUIDED_SESSION_PREFIX } from '@/lib/guidedDrillSession';
import { DRILL_SESSION_PREFIX } from '@/lib/drillResumeSession';

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

export function projectGuidedWorkEvidence(studentId: string, rows: StoredWorkRow[]) {
  return projectSavedAssignmentEvidence(studentId, rows, GUIDED_SESSION_PREFIX);
}

export function projectHomeworkWorkEvidence(studentId: string, rows: StoredWorkRow[]) {
  return projectSavedAssignmentEvidence(studentId, rows, HOMEWORK_SESSION_PREFIX);
}

/** RLS limits students to their own rows and permits authorized admins to read selected students. */
export async function loadAssignmentWorkEvidence(studentId: string): Promise<{
  guided: Record<string, GuidedWorkEvidence>;
  homework: Record<string, HomeworkWorkEvidence>;
}> {
  const rows: StoredWorkRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('bootcamp_kv')
      .select('record_id,data')
      .eq('user_id', studentId)
      .eq('table_name', 'practice_sessions')
      .order('record_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < pageSize) break;
  }
  return {
    guided: projectGuidedWorkEvidence(studentId, rows),
    homework: projectHomeworkWorkEvidence(studentId, rows),
  };
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
