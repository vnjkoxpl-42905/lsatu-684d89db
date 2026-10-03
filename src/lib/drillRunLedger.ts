import { z } from 'zod';
import { PracticeSession, PracticeSessionAttempt, TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import {
  migratePracticeSession,
  PRACTICE_SESSION_DATA_VERSION,
  type PracticeSessionSnapshot,
} from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { supabase } from '@/integrations/supabase/client';
import { LrRunProvenanceSchema, type LrRunProvenance } from '@/lib/lrRunProvenance';

/** Each LR or guided drill sitting has its own account row, even when its source repeats. */
const StandaloneDrillRunSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  source_key: z.string().min(1),
  mode: z.string(),
  label: z.string(),
  provenance: LrRunProvenanceSchema.optional(),
  session: PracticeSession,
  // The answer sent to analytics on closeout. Once acknowledged, a retry must
  // finish with this exact answer even if the final status write fails.
  closeout_attempts: z.array(PracticeSessionAttempt).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).superRefine((row, context) => {
  const check = (value: LrRunProvenance | undefined) => {
    if (!value) return;
    if (value.source_key !== row.source_key || (value.launch_kind === 'smart-drill' ? row.mode !== 'adaptive' : row.mode !== 'type-drill')) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Saved LR conditions do not match this sitting.' });
    }
    if (row.provenance && Object.keys(row.provenance).some(key => row.provenance![key as keyof LrRunProvenance] !== value[key as keyof LrRunProvenance])) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Saved attempt conditions do not match this sitting.' });
    }
  };
  check(row.provenance);
  row.session.attempts.forEach(attempt => check(attempt.provenance));
  row.closeout_attempts?.forEach(attempt => check(attempt.provenance));
});

export type StandaloneDrillRun = z.infer<typeof StandaloneDrillRunSchema>;
export type StandaloneDrillRunMeta = { mode?: string; label?: string; provenance?: LrRunProvenance };

const runWriteChains = new Map<string, Promise<unknown>>();

function withRun<T>(runId: string, write: () => Promise<T>): Promise<T> {
  const previous = runWriteChains.get(runId) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(write);
  runWriteChains.set(runId, current);
  void current.finally(() => {
    if (runWriteChains.get(runId) === current) runWriteChains.delete(runId);
  }).catch(() => undefined);
  return current;
}

async function assertOwner(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== userId) {
    throw new Error('Sign in to save or view your drills.');
  }
}

/** Pure row validation; scoped teacher reads use RLS without changing the actor. */
export function parseOwnedDrillRun(userId: string, recordId: string, raw: unknown): StandaloneDrillRun | null {
  const parsed = StandaloneDrillRunSchema.safeParse(raw);
  if (!parsed.success) return null;
  const row = parsed.data;
  if (row.id !== recordId || row.user_id !== userId || row.session.id !== row.id || row.session.user_id !== userId) return null;
  return { ...row, session: migratePracticeSession(row.session) };
}

function sessionFromSnapshot(
  userId: string,
  runId: string,
  sourceKey: string,
  snapshot: PracticeSessionSnapshot,
  createdAt: string,
  updatedAt: string,
  status: 'in_progress' | 'completed',
  previous?: PracticeSession,
  provenance?: LrRunProvenance,
): PracticeSession {
  if (!snapshot.questionQueue.length && !previous?.question_queue.length) {
    throw new Error('A drill needs questions before its run can be saved.');
  }
  const queue = snapshot.questionQueue.length ? snapshot.questionQueue : previous!.question_queue;
  return PracticeSession.parse({
    id: runId,
    user_id: userId,
    pool_slug: sourceKey,
    completion_id: sourceKey,
    data_version: PRACTICE_SESSION_DATA_VERSION,
    question_queue: queue,
    current_index: Math.min(Math.max(snapshot.currentIndex, 0), queue.length - 1),
    attempts: snapshot.attempts.map(attempt => {
      const saved = previous?.attempts.find(item => item.qid === attempt.qid);
      // A new policy must never become an assertion about a historical answer.
      const { provenance: incoming, ...answer } = attempt;
      const conditions = saved ? saved.provenance : provenance ?? incoming;
      return conditions ? { ...answer, provenance: conditions } : answer;
    }),
    status,
    elapsed_ms: snapshot.elapsedMs ?? previous?.elapsed_ms,
    timer_mode: snapshot.timerMode ?? previous?.timer_mode,
    timer_custom_minutes: snapshot.timerCustomMinutes ?? previous?.timer_custom_minutes,
    regulation_answered_qids: snapshot.regulationAnsweredQids ?? previous?.regulation_answered_qids,
    started_at: createdAt,
    updated_at: updatedAt,
  });
}

async function writeRun(row: StandaloneDrillRun): Promise<StandaloneDrillRun> {
  const { error } = await supabase.from('bootcamp_kv').upsert({
    user_id: row.user_id,
    table_name: TABLES.drill_runs,
    record_id: row.id,
    data: row,
  }, { onConflict: 'user_id,table_name,record_id' });
  if (error) throw error;
  return row;
}

/** Create a new sitting only after its first snapshot is acknowledged by the account. */
export async function createStandaloneDrillRun(
  userId: string,
  sourceKey: string,
  snapshot: PracticeSessionSnapshot,
  meta: StandaloneDrillRunMeta = {},
): Promise<StandaloneDrillRun> {
  await assertOwner(userId);
  if (!(sourceKey.startsWith('drill::') || sourceKey.startsWith('guided::')) || [
    'drill::section::',
    'drill::practice-test::',
    'drill::assignment::',
    'drill::bootcamp-day::',
  ].some((prefix) => sourceKey.startsWith(prefix))) {
    throw new Error('A standalone drill needs a valid source key.');
  }
  const id = crypto.randomUUID();
  const time = new Date().toISOString();
  const row = StandaloneDrillRunSchema.parse({
    id,
    user_id: userId,
    source_key: sourceKey,
    mode: meta.mode ?? '',
    label: meta.label ?? '',
    provenance: meta.provenance,
    session: sessionFromSnapshot(userId, id, sourceKey, snapshot, time, time, 'in_progress', undefined, meta.provenance),
    created_at: time,
    updated_at: time,
  });
  return withRun(id, () => writeRun(row));
}

/** A missing, malformed, or different owner's row is never returned. */
export async function loadStandaloneDrillRun(userId: string, runId: string): Promise<StandaloneDrillRun | null> {
  await assertOwner(userId);
  if (!z.string().uuid().safeParse(runId).success) return null;
  const { data, error } = await supabase.from('bootcamp_kv')
    .select('record_id,data')
    .eq('user_id', userId)
    .eq('table_name', TABLES.drill_runs)
    .eq('record_id', runId)
    .maybeSingle();
  if (error) throw error;
  return data ? parseOwnedDrillRun(userId, data.record_id, data.data) : null;
}

/** Page through account rows so older sittings do not disappear at the API limit. */
export async function listStandaloneDrillRuns(userId: string): Promise<StandaloneDrillRun[]> {
  await assertOwner(userId);
  const runs: StandaloneDrillRun[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('bootcamp_kv')
      .select('record_id,data')
      .eq('user_id', userId)
      .eq('table_name', TABLES.drill_runs)
      .order('record_id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    for (const item of data ?? []) {
      const run = parseOwnedDrillRun(userId, item.record_id, item.data);
      if (run) runs.push(run);
    }
    if ((data ?? []).length < pageSize) break;
  }
  return runs.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

async function updateRun(
  userId: string,
  runId: string,
  snapshot: PracticeSessionSnapshot,
  status: 'in_progress' | 'completed',
): Promise<StandaloneDrillRun> {
  return withRun(runId, async () => {
    const current = await loadStandaloneDrillRun(userId, runId);
    if (!current) throw new Error('This drill run could not be found in your account.');
    if (current.session.status === 'completed') return current;
    const time = new Date().toISOString();
    const row = StandaloneDrillRunSchema.parse({
      ...current,
      session: sessionFromSnapshot(
        userId, runId, current.source_key,
        current.source_key.startsWith('guided::') && current.closeout_attempts
          ? { ...snapshot, attempts: current.closeout_attempts }
          : snapshot,
        current.created_at, time, status, current.session, current.provenance,
      ),
      updated_at: time,
    });
    return writeRun(row);
  });
}

/** Acknowledged before analytics inserts, so a failed finish has one immutable answer set. */
export async function beginGuidedDrillCloseout(
  userId: string,
  runId: string,
  snapshot: PracticeSessionSnapshot,
): Promise<StandaloneDrillRun> {
  return withRun(runId, async () => {
    const current = await loadStandaloneDrillRun(userId, runId);
    if (!current || !current.source_key.startsWith('guided::')) {
      throw new Error('This guided drill sitting could not be found in your account.');
    }
    if (current.session.status === 'completed' || current.closeout_attempts) return current;
    if (snapshot.attempts.length === 0) throw new Error('Submit an answer before finishing.');
    const time = new Date().toISOString();
    const row = StandaloneDrillRunSchema.parse({
      ...current,
      session: sessionFromSnapshot(userId, runId, current.source_key, snapshot,
        current.created_at, time, 'in_progress', current.session, current.provenance),
      closeout_attempts: snapshot.attempts,
      updated_at: time,
    });
    return writeRun(row);
  });
}

export async function saveStandaloneDrillRun(
  userId: string,
  runId: string,
  snapshot: PracticeSessionSnapshot,
): Promise<StandaloneDrillRun> {
  return updateRun(userId, runId, snapshot, 'in_progress');
}

export async function completeStandaloneDrillRun(
  userId: string,
  runId: string,
  snapshot: PracticeSessionSnapshot,
): Promise<StandaloneDrillRun> {
  return updateRun(userId, runId, snapshot, 'completed');
}
