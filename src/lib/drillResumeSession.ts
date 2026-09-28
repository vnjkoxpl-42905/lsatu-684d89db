/**
 * Resume state for every OTHER drill — Smart Drill, custom type drills, and
 * full sections.
 *
 * Guided drills and Intro to LR practice sets already survive a closed tab, a
 * sign-out, or a different device (see guidedDrillSession). Nothing else did:
 * a student mid-way through a Smart Drill who closed the browser came back to
 * a fresh shuffle, and the answers they had already given were nowhere on the
 * screen. The attempts themselves were never lost — those are written to the
 * `attempts` table per question — but the run was, which reads as lost work.
 *
 * This rides the exact same store as the other two, namespaced so the three can
 * never collide:
 *
 *     practice set   →  pool_slug "mc-practice-1"
 *     guided drill   →  pool_slug "guided::<assignmentId>"
 *     bootcamp day   →  pool_slug "drill::bootcamp-day::<day>::<part>"
 *     homework       →  pool_slug "drill::assignment::<assignmentId>"
 *     everything else→  pool_slug "drill::<mode>::<fingerprint>"
 *
 * Failure policy, inherited: reads degrade to null (a missing resume row must
 * never block starting a drill), writes surface to the caller.
 */

import {
  loadPracticeSession,
  savePracticeSessionSnapshot,
  completePracticeSession,
  migratePracticeSession,
  practiceSessionIdFor,
  PRACTICE_SESSION_DATA_VERSION,
  type PracticeSessionSnapshot,
} from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { PracticeSession, TABLES } from '@/bootcamps/main-conclusion/persistence/records';
import { supabase } from '@/integrations/supabase/client';
import { isActivePracticeTestDevice } from '@/lib/practiceTestStore';

export const DRILL_SESSION_PREFIX = 'drill::';
const SECTION_PREFIX = `${DRILL_SESSION_PREFIX}section::`;
const TEST_LEG_PREFIX = `${DRILL_SESSION_PREFIX}practice-test::`;
const accountSectionKey = (key: string) =>
  key.startsWith(SECTION_PREFIX) || key.startsWith(TEST_LEG_PREFIX);
const accountWriteChains = new Map<string, Promise<void>>();

function queueAccountWrite(userId: string, key: string, write: () => Promise<void>): Promise<void> {
  const identity = `${userId}::${key}`;
  const previous = accountWriteChains.get(identity) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(write);
  accountWriteChains.set(identity, current);
  void current.finally(() => {
    if (accountWriteChains.get(identity) === current) accountWriteChains.delete(identity);
  }).catch(() => undefined);
  return current;
}

async function assertActiveTestLeg(userId: string, key: string): Promise<void> {
  if (!key.startsWith(TEST_LEG_PREFIX)) return;
  const runId = key.slice(TEST_LEG_PREFIX.length).split('::')[0];
  if (!await isActivePracticeTestDevice(userId, runId)) {
    throw new Error('This practice test is active on another device.');
  }
}

async function readSectionFromAccount(userId: string, key: string): Promise<PracticeSession | null> {
  const { data, error } = await supabase.from('bootcamp_kv')
    .select('data')
    .eq('user_id', userId)
    .eq('table_name', TABLES.practice_sessions)
    .eq('record_id', practiceSessionIdFor(userId, key))
    .maybeSingle();
  if (error) throw error;
  const parsed = PracticeSession.safeParse(data?.data);
  return parsed.success ? migratePracticeSession(parsed.data) : null;
}

async function syncSectionToAccount(userId: string, key: string): Promise<void> {
  const record = await loadPracticeSession(userId, key);
  if (!record) throw new Error('The section could not be saved.');
  const { error } = await supabase.from('bootcamp_kv').upsert({
    user_id: userId,
    table_name: TABLES.practice_sessions,
    record_id: record.id,
    data: record,
  }, { onConflict: 'user_id,table_name,record_id' });
  if (error) throw error;
}

export type DrillResumeSession = PracticeSession;
export type DrillResumeSnapshot = PracticeSessionSnapshot;

const sectionBackupKey = (userId: string, key: string) =>
  `lsatu:section-backup:${practiceSessionIdFor(userId, key)}`;

/** Synchronous device copy, including the latest unacknowledged choice. */
export function writeSectionDeviceBackup(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): string | null {
  if (!userId || !key || !accountSectionKey(key) || !snapshot.questionQueue.length) return null;
  const previous = readSectionDeviceBackup(userId, key);
  const time = new Date(Math.max(Date.now(), previous ? Date.parse(previous.updated_at) + 1 : 0)).toISOString();
  const record = PracticeSession.safeParse({
    id: practiceSessionIdFor(userId, key),
    user_id: userId,
    pool_slug: key,
    completion_id: key,
    data_version: PRACTICE_SESSION_DATA_VERSION,
    question_queue: snapshot.questionQueue,
    current_index: Math.min(Math.max(snapshot.currentIndex, 0), snapshot.questionQueue.length - 1),
    attempts: snapshot.attempts,
    status: 'in_progress',
    elapsed_ms: snapshot.elapsedMs,
    timer_mode: snapshot.timerMode,
    timer_custom_minutes: snapshot.timerCustomMinutes,
    regulation_answered_qids: snapshot.regulationAnsweredQids,
    started_at: time,
    updated_at: time,
  });
  if (!record.success) return null;
  try {
    window.localStorage.setItem(sectionBackupKey(userId, key), JSON.stringify(record.data));
    return time;
  } catch (error) {
    console.warn('[drill:section] device backup unavailable', error);
    return null;
  }
}

function readSectionDeviceBackup(userId: string, key: string): DrillResumeSession | null {
  try {
    const raw = window.localStorage.getItem(sectionBackupKey(userId, key));
    const parsed = PracticeSession.safeParse(raw ? JSON.parse(raw) : null);
    if (!parsed.success || parsed.data.user_id !== userId || parsed.data.pool_slug !== key) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function clearSectionDeviceBackup(userId: string, key: string): void {
  try {
    window.localStorage.removeItem(sectionBackupKey(userId, key));
  } catch {
    // The completed account row is authoritative even if browser storage is unavailable.
  }
}

export type DrillResumeIdentity = {
  kind: 'bootcamp-day';
  day: number;
  part: 'homework' | 'practice';
};

/** Short, stable, filename-safe digest of whatever identifies the run. */
function fingerprint(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Key one run's resume row.
 *
 * A homework assignment is identified by the assignment: two assignments of
 * the same section are two sittings, and a row named by the section alone let
 * the second one open on the first one's answers and the first one's spent
 * clock. Otherwise a full section is identified by the section itself; a
 * filtered drill by the filters that drew it; Smart Drill by nothing but its
 * mode, because it has a single continuous run per student. Returns null for
 * the surfaces that own their own resume rows (guided, practice sets) and for
 * anything launched from an explicit list of qids, where the caller already
 * knows the set.
 */
export function drillResumeKey(input: {
  mode: string;
  config?: unknown;
  identity?: DrillResumeIdentity;
  /** The classroom homework assignment this run belongs to, when it does. */
  assignmentId?: string | null;
  /** Full exam legs must never share the standalone section's resume row. */
  ptRun?: { runId: string; legIndex: number } | null;
}): string | null {
  if (input.ptRun) {
    return `${TEST_LEG_PREFIX}${input.ptRun.runId}::leg-${input.ptRun.legIndex}`;
  }
  if (input.assignmentId) {
    return `${DRILL_SESSION_PREFIX}assignment::${input.assignmentId}`;
  }
  if (input.identity?.kind === 'bootcamp-day') {
    return `${DRILL_SESSION_PREFIX}bootcamp-day::${input.identity.day}::${input.identity.part}`;
  }

  const mode = input.mode;
  if (mode === 'adaptive') return `${DRILL_SESSION_PREFIX}adaptive`;

  const config = (input.config ?? null) as Record<string, unknown> | null;

  if (mode === 'full-section') {
    if (!config) return null;
    const pt = config.pt;
    const section = config.section;
    if (pt == null || section == null) return null;
    return `${DRILL_SESSION_PREFIX}section::pt${pt}-s${section}`;
  }

  if (mode === 'type-drill' || mode === 'natural-drill') {
    if (!config) return null;
    const selected = config.selectedQids as string[] | undefined;
    if (selected?.length) {
      // A pre-selected set is its own identity: the same list re-opened is the
      // same run, a different list is a different one.
      return `${DRILL_SESSION_PREFIX}${mode}::set-${fingerprint([...selected].sort().join(','))}`;
    }
    const shape = JSON.stringify({
      qtypes: config.qtypes ?? [],
      difficulties: config.difficulties ?? [],
      pts: config.pts ?? [],
      sections: config.sections ?? [],
      qfeatures: config.qfeatures ?? [],
      reasoningTypes: config.reasoningTypes ?? [],
      searchQuery: config.searchQuery ?? '',
      questionNumber: config.questionNumber ?? null,
      count: config.count ?? null,
    });
    return `${DRILL_SESSION_PREFIX}${mode}::${fingerprint(shape)}`;
  }

  return null;
}

/** The stored run for this drill, or null when there is nothing to resume. */
export async function loadDrillResumeSession(
  userId: string,
  key: string | null,
  legacyKey?: string | null,
): Promise<DrillResumeSession | null> {
  if (!userId || !key) return null;
  // Hydration compares the locally saved timestamp with the account row before
  // returning. Reading the cloud first could bypass a newer unsynced answer.
  let current: DrillResumeSession | null;
  try {
    current = await loadPracticeSession(userId, key);
  } catch (error) {
    console.warn('[drill:section] local resume read failed', error);
    current = null;
  }
  if (accountSectionKey(key)) {
    const backup = readSectionDeviceBackup(userId, key);
    if (backup && (!current || backup.updated_at > current.updated_at)) current = backup;
    try {
      const account = await readSectionFromAccount(userId, key);
      if (account && (!current || account.updated_at >= current.updated_at)) {
        if (backup) clearSectionDeviceBackup(userId, key);
        return account;
      }
      if (current) {
        // A backup can be newer than IndexedDB. The runner will sync it as soon
        // as it mounts; syncing the stale IndexedDB row here would overwrite it.
        if (current !== backup) await syncSectionToAccount(userId, key);
        return current;
      }
    } catch (error) {
      console.warn('[drill:section] account read failed, checking local backup', error);
    }
  }
  if (current || !legacyKey || legacyKey === key) return current;
  return loadPracticeSession(userId, legacyKey);
}

/** Write the local safety copy and confirm the account write for official sections. */
export async function saveDrillResumeSnapshot(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): Promise<void> {
  if (!userId || !key) return;
  const backupStamp = accountSectionKey(key) ? writeSectionDeviceBackup(userId, key, snapshot) : null;
  await queueAccountWrite(userId, key, async () => {
    await assertActiveTestLeg(userId, key);
    await savePracticeSessionSnapshot(userId, { slug: key, completionId: key }, snapshot);
    if (accountSectionKey(key)) await syncSectionToAccount(userId, key);
  });
  if (backupStamp && readSectionDeviceBackup(userId, key)?.updated_at === backupStamp) {
    clearSectionDeviceBackup(userId, key);
  }
}

export function hasPendingSectionDeviceBackup(userId: string, key: string | null): boolean {
  return !!userId && !!key && !!readSectionDeviceBackup(userId, key);
}

/**
 * Mark the run finished. Nothing is deleted — the queue and every answer stay
 * in the row for review — it simply stops being offered as a resume, so the
 * next launch of the same drill draws fresh questions.
 */
export async function completeDrillResumeSession(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): Promise<void> {
  if (!userId || !key) return;
  await queueAccountWrite(userId, key, async () => {
    await assertActiveTestLeg(userId, key);
    await completePracticeSession(userId, { slug: key, completionId: key }, snapshot);
    if (accountSectionKey(key)) await syncSectionToAccount(userId, key);
  });
  if (accountSectionKey(key)) clearSectionDeviceBackup(userId, key);
}

/**
 * Is this stored row worth resuming?
 *
 * Unlike a guided drill, these runs are drawn fresh on every launch, so there
 * is no fixed set to compare against — the stored queue IS the run. It is
 * resumable when it is still in progress and the student answered something.
 * Official sections are resumable as soon as they start, including before the
 * first answer, because their fixed question order is itself worth restoring.
 */
export function isResumableDrillSession(stored: DrillResumeSession | null): boolean {
  return (
    !!stored &&
    stored.status === 'in_progress' &&
    stored.question_queue.length > 0 &&
    (stored.attempts.length > 0 || accountSectionKey(stored.pool_slug))
  );
}

/**
 * Was this row's section clock already spent when it was stored?
 *
 * A row written at or after the buzzer carries elapsed_ms equal to the budget
 * (the countdown reports zero, so the spend is the whole budget). Restoring it
 * as an ordinary resume opens the section on 00:00 with no buzzer, because the
 * regulation mark it also carries tells the buzzer effect it has already
 * asked. The runner uses this to open such a row on the buzzer instead: the
 * answers are kept, the clock is not handed back, and the student is asked to
 * finish and score the section as it was sat.
 *
 * Untimed runs have no budget and are never "spent".
 */
export function isSpentDrillSession(
  stored: DrillResumeSession | null,
  budgetMs: number | undefined,
): boolean {
  if (!stored || !budgetMs || !Number.isFinite(budgetMs)) return false;
  return (stored.elapsed_ms ?? 0) >= budgetMs;
}
