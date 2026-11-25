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
 * Official section reads must confirm the account or retain a paused device
 * copy. Other drill reads preserve the legacy missing-row fallback.
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
const ASSIGNMENT_PREFIX = `${DRILL_SESSION_PREFIX}assignment::`;
const accountSectionKey = (key: string) =>
  key.startsWith(SECTION_PREFIX) ||
  key.startsWith(TEST_LEG_PREFIX) ||
  key.startsWith(ASSIGNMENT_PREFIX);
const sittingSectionKey = (key: string) => accountSectionKey(key) && key.includes('#');
const accountWriteChains = new Map<string, Promise<void>>();
const accountRevisionCache = new Map<string, string | null>();
const acknowledgedSittingRecords = new Map<string, DrillResumeSession>();
const revisionSessionKey = (userId: string, key: string) =>
  `lsatu:section-rev:${practiceSessionIdFor(userId, key)}`;

export class SectionRevisionConflictError extends Error {
  constructor(message = 'This section was updated in another tab. Both copies were kept.') {
    super(message);
    this.name = 'SectionRevisionConflictError';
  }
}

export function setAccountSectionRevision(
  userId: string,
  key: string | null,
  revision: string | null,
): void {
  if (!userId || !key || !accountSectionKey(key)) return;
  const cacheKey = `${userId}::${key}`;
  accountRevisionCache.set(cacheKey, revision);
  try {
    window.sessionStorage?.setItem(
      revisionSessionKey(userId, key),
      JSON.stringify({ rev: revision }),
    );
  } catch {
    // Session storage is optional; in-memory cache covers the active tab.
  }
}

export function getAccountSectionRevision(
  userId: string,
  key: string | null,
): string | null | undefined {
  if (!userId || !key || !accountSectionKey(key)) return undefined;
  const cacheKey = `${userId}::${key}`;
  if (accountRevisionCache.has(cacheKey)) return accountRevisionCache.get(cacheKey);
  try {
    const raw = window.sessionStorage?.getItem(revisionSessionKey(userId, key));
    if (raw) {
      const parsed = JSON.parse(raw) as { rev?: unknown };
      const rev = parsed.rev;
      if (rev === null) {
        accountRevisionCache.set(cacheKey, null);
        return null;
      }
      if (typeof rev === 'string') {
        accountRevisionCache.set(cacheKey, rev);
        return rev;
      }
    }
  } catch {
    // Ignore storage read errors.
  }
  return undefined;
}

export function clearAccountSectionRevisionsForTests(): void {
  accountRevisionCache.clear();
  acknowledgedSittingRecords.clear();
  try {
    window.sessionStorage?.clear();
  } catch {
    // Ignore storage clear errors.
  }
}

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
    .select('data, updated_at')
    .eq('user_id', userId)
    .eq('table_name', TABLES.practice_sessions)
    .eq('record_id', practiceSessionIdFor(userId, key))
    .maybeSingle();
  if (error) throw error;
  setAccountSectionRevision(
    userId,
    key,
    typeof data?.updated_at === 'string' ? data.updated_at : null,
  );
  const parsed = PracticeSession.safeParse(data?.data);
  if (!parsed.success) {
    acknowledgedSittingRecords.delete(revisionSessionKey(userId, key));
    return null;
  }
  const migrated = migratePracticeSession(parsed.data);
  const expectedId = practiceSessionIdFor(userId, key);
  const record = migrated.id !== expectedId || migrated.pool_slug !== key || migrated.completion_id !== key
    ? { ...migrated, id: expectedId, pool_slug: key, completion_id: key }
    : migrated;
  if (sittingSectionKey(key)) {
    acknowledgedSittingRecords.set(revisionSessionKey(userId, key), record);
  }
  return record;
}

async function readSectionRevisionFromAccount(userId: string, key: string): Promise<string | null> {
  const { data, error } = await supabase.from('bootcamp_kv')
    .select('updated_at')
    .eq('user_id', userId)
    .eq('table_name', TABLES.practice_sessions)
    .eq('record_id', practiceSessionIdFor(userId, key))
    .maybeSingle();
  if (error) throw error;
  const rev = typeof data?.updated_at === 'string' ? data.updated_at : null;
  setAccountSectionRevision(userId, key, rev);
  return rev;
}

async function syncSectionToAccount(
  userId: string,
  key: string,
  expectedDbUpdatedAt?: string | null,
  options?: { allowOverwrite?: boolean; record?: DrillResumeSession },
): Promise<string | undefined> {
  const record = options?.record ?? await loadPracticeSession(userId, key);
  if (!record) throw new Error('The section could not be saved.');
  if (options?.allowOverwrite) {
    const { error } = await supabase.from('bootcamp_kv').upsert({
      user_id: userId,
      table_name: TABLES.practice_sessions,
      record_id: record.id,
      data: record,
    }, { onConflict: 'user_id,table_name,record_id' });
    if (error) throw error;
    return undefined;
  }

  let expected = expectedDbUpdatedAt !== undefined
    ? expectedDbUpdatedAt
    : getAccountSectionRevision(userId, key);
  if (expected === undefined) {
    expected = await readSectionRevisionFromAccount(userId, key);
  }

  if (typeof expected === 'string') {
    const { data: rows, error } = await supabase.from('bootcamp_kv')
      .update({ data: record })
      .eq('user_id', userId)
      .eq('table_name', TABLES.practice_sessions)
      .eq('record_id', record.id)
      .eq('updated_at', expected)
      .select('updated_at');
    if (error) throw error;
    if (!rows || rows.length === 0) {
      throw new SectionRevisionConflictError();
    }
    const nextRev = typeof rows[0]?.updated_at === 'string' ? rows[0].updated_at : record.updated_at;
    setAccountSectionRevision(userId, key, nextRev);
    return nextRev;
  }

  const { data: rows, error } = await supabase.from('bootcamp_kv')
    .insert({
      user_id: userId,
      table_name: TABLES.practice_sessions,
      record_id: record.id,
      data: record,
    })
    .select('updated_at');
  if (error) {
    if (error.code === '23505') {
      throw new SectionRevisionConflictError();
    }
    throw error;
  }
  const nextRev = typeof rows?.[0]?.updated_at === 'string' ? rows[0].updated_at : record.updated_at;
  setAccountSectionRevision(userId, key, nextRev);
  return nextRev;
}

export type DrillResumeSession = PracticeSession;
export type DrillResumeSnapshot = PracticeSessionSnapshot;

const sectionBackupKey = (userId: string, key: string) =>
  `lsatu:section-backup:${practiceSessionIdFor(userId, key)}`;

interface PendingSittingCopy {
  record: DrillResumeSession;
  baseRevision: string | null;
  legacySource?: { key: string; snapshot: DrillResumeSession };
}

function readPendingSitting(userId: string, key: string): PendingSittingCopy | null {
  try {
    const raw = window.sessionStorage.getItem(sectionBackupKey(userId, key));
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingSittingCopy;
    const record = PracticeSession.safeParse(pending.record);
    if (!record.success || record.data.user_id !== userId || record.data.pool_slug !== key) return null;
    if (pending.baseRevision !== null && typeof pending.baseRevision !== 'string') return null;
    return { ...pending, record: record.data };
  } catch {
    return null;
  }
}

function writePendingSitting(userId: string, key: string, pending: PendingSittingCopy) {
  // sessionStorage survives reload and is isolated per tab. A shared slot
  // lets one tab erase another tab's pending answers when clearing its own.
  window.sessionStorage.setItem(sectionBackupKey(userId, key), JSON.stringify(pending));
}

function acknowledgePendingSitting(userId: string, key: string, pending: PendingSittingCopy): void {
  clearSectionDeviceBackup(userId, key);
  const source = pending.legacySource;
  if (source && source.key === key.split('#', 1)[0] &&
      JSON.stringify(readSectionDeviceBackup(userId, source.key)) === JSON.stringify(source.snapshot)) {
    clearSectionDeviceBackup(userId, source.key);
  }
}

/** Called after the server acknowledges the saved sitting's completion. */
export function clearReconciledSectionDeviceBackup(userId: string, key: string): void {
  const pending = readPendingSitting(userId, key);
  if (pending) acknowledgePendingSitting(userId, key, pending);
}

function makeSectionBackup(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): DrillResumeSession | null {
  if (!userId || !key || !accountSectionKey(key) || !snapshot.questionQueue.length) return null;
  const previous = sittingSectionKey(key)
    ? readPendingSitting(userId, key)?.record ?? acknowledgedSittingRecords.get(revisionSessionKey(userId, key))
    : readSectionDeviceBackup(userId, key);
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
    elapsed_ms: snapshot.elapsedMs ?? previous?.elapsed_ms,
    timer_mode: snapshot.timerMode ?? previous?.timer_mode,
    timer_custom_minutes: snapshot.timerCustomMinutes ?? previous?.timer_custom_minutes,
    regulation_answered_qids: snapshot.regulationAnsweredQids ?? previous?.regulation_answered_qids,
    started_at: previous?.started_at ?? time,
    updated_at: time,
  });
  return record.success ? record.data : null;
}

/** Synchronous device copy, including the latest unacknowledged choice. */
export function writeSectionDeviceBackup(
  userId: string,
  key: string | null,
  snapshot: DrillResumeSnapshot,
): string | null {
  if (!key) return null;
  const record = makeSectionBackup(userId, key, snapshot);
  if (!record) return null;
  try {
    if (sittingSectionKey(key)) {
      const pending = readPendingSitting(userId, key);
      writePendingSitting(userId, key, {
        ...pending,
        record,
        baseRevision: pending ? pending.baseRevision : getAccountSectionRevision(userId, key) ?? null,
      });
    } else {
      window.localStorage.setItem(sectionBackupKey(userId, key), JSON.stringify(record));
    }
    return record.updated_at;
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

export function clearSectionDeviceBackup(userId: string, key: string): void {
  try {
    if (sittingSectionKey(key)) {
      window.sessionStorage.removeItem(sectionBackupKey(userId, key));
      return;
    }
    window.localStorage.removeItem(sectionBackupKey(userId, key));
  } catch {
    // The completed account row is authoritative even if browser storage is unavailable.
  }
}

/** Keep recovered IndexedDB state pending until the guarded save acknowledges it. */
function retainUnverifiedSection(userId: string, key: string, record: DrillResumeSession): void {
  window.localStorage.setItem(sectionBackupKey(userId, key), JSON.stringify(record));
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
  adoptionRevision?: string | null,
): Promise<DrillResumeSession | null> {
  if (!userId || !key) return null;
  if (sittingSectionKey(key)) {
    const pending = readPendingSitting(userId, key);
    const legacyDevice = legacyKey ? readSectionDeviceBackup(userId, legacyKey) : null;
    const unversioned = !pending ? readSectionDeviceBackup(userId, key)
      ?? await loadPracticeSession(userId, key, { readOnly: true }) : null;
    const legacy = legacyDevice ?? (!pending && legacyKey
      ? await loadPracticeSession(userId, legacyKey, { readOnly: true }) : null);
    let account: DrillResumeSession | null;
    let verified = false;
    try {
      account = await readSectionFromAccount(userId, key);
      verified = true;
    } catch (error) {
      if (pending) return pending.record;
      if (!unversioned && !legacy) throw error;
      account = null;
    }
    if (pending) {
      if (JSON.stringify(account) !== JSON.stringify(pending.record)) return pending.record;
      acknowledgePendingSitting(userId, key, pending);
      return account;
    }
    const recovered = unversioned && (!legacy || unversioned.updated_at >= legacy.updated_at)
      ? unversioned
      : legacy;
    if (recovered?.status === 'in_progress' && (!account || recovered.updated_at > account.updated_at)) {
      const record = {
        ...recovered,
        id: practiceSessionIdFor(userId, key),
        pool_slug: key,
        completion_id: key,
      };
      // Only the legacy source can be tied to the revision copied by the server.
      // Older unversioned sitting backups are preserved without assuming they
      // were derived from the latest account record.
      const legacyRevision = legacyKey ? getAccountSectionRevision(userId, legacyKey) : undefined;
      const baseRevision = recovered === legacy
        ? legacyRevision === undefined ? adoptionRevision ?? null : legacyRevision
        : null;
      const legacySource = recovered === legacyDevice && legacyKey
        ? { key: legacyKey, snapshot: recovered }
        : undefined;
      writePendingSitting(userId, key, { record, baseRevision, legacySource });
      return record;
    }
    if (!verified) throw new Error('The section account copy could not be checked.');
    return account;
  }
  // Hydration compares the locally saved timestamp with the account row before
  // returning. Reading the cloud first could bypass a newer unsynced answer.
  let current: DrillResumeSession | null;
  try {
    current = accountSectionKey(key)
      ? await loadPracticeSession(userId, key, { readOnly: true })
      : await loadPracticeSession(userId, key);
  } catch (error) {
    console.warn('[drill:section] local resume read failed', error);
    current = null;
  }
  if (accountSectionKey(key)) {
    let backup = readSectionDeviceBackup(userId, key);
    if (legacyKey && legacyKey !== key && accountSectionKey(legacyKey)) {
      const legacyBackup = readSectionDeviceBackup(userId, legacyKey);
      if (legacyBackup && (!backup || legacyBackup.updated_at > backup.updated_at)) {
        backup = {
          ...legacyBackup,
          id: practiceSessionIdFor(userId, key),
          pool_slug: key,
          completion_id: key,
        };
      }
    }
    if (backup && (!current || backup.updated_at > current.updated_at)) current = backup;
    try {
      await assertActiveTestLeg(userId, key);
      const account = await readSectionFromAccount(userId, key);
      if (account && (!current || account.updated_at >= current.updated_at)) {
        if (backup) clearSectionDeviceBackup(userId, key);
        return account;
      }
      if (current) {
        // Hydration is read-only. A newer local clock or choice must pass the
        // runner's paused recovery gate and normal guarded account save.
        retainUnverifiedSection(userId, key, current);
        return current;
      }
    } catch (error) {
      console.warn('[drill:section] account read failed, checking local backup', error);
      if (!current) throw error;
      retainUnverifiedSection(userId, key, current);
      return current;
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
  options?: { expectedUpdatedAt?: string | null },
): Promise<void> {
  if (!userId || !key) return;
  if (sittingSectionKey(key)) {
    const pending = readPendingSitting(userId, key);
    const record = makeSectionBackup(userId, key, snapshot);
    if (!record) throw new Error('Could not save this section.');
    const baseRevision = pending ? pending.baseRevision :
      options?.expectedUpdatedAt !== undefined
        ? options.expectedUpdatedAt
        : getAccountSectionRevision(userId, key) ?? null;
    writePendingSitting(userId, key, { ...pending, record, baseRevision });
    await queueAccountWrite(userId, key, async () => {
      const latest = readPendingSitting(userId, key);
      const expected = latest ? latest.baseRevision : baseRevision;
      const revision = await syncSectionToAccount(userId, key, expected, { record });
      acknowledgedSittingRecords.set(revisionSessionKey(userId, key), record);
      const current = readPendingSitting(userId, key);
      if (current?.record.updated_at === record.updated_at) {
        acknowledgePendingSitting(userId, key, current);
      } else if (current && current.baseRevision === expected && revision) {
        writePendingSitting(userId, key, { ...current, baseRevision: revision });
      }
    });
    return;
  }
  const backupStamp = accountSectionKey(key) ? writeSectionDeviceBackup(userId, key, snapshot) : null;
  await queueAccountWrite(userId, key, async () => {
    await assertActiveTestLeg(userId, key);
    await savePracticeSessionSnapshot(userId, { slug: key, completionId: key }, snapshot);
    if (accountSectionKey(key)) {
      await syncSectionToAccount(userId, key, options?.expectedUpdatedAt);
    }
  });
  if (backupStamp && readSectionDeviceBackup(userId, key)?.updated_at === backupStamp) {
    clearSectionDeviceBackup(userId, key);
  }
}

export function hasPendingSectionDeviceBackup(userId: string, key: string | null): boolean {
  if (!userId || !key) return false;
  return sittingSectionKey(key) ? !!readPendingSitting(userId, key) : !!readSectionDeviceBackup(userId, key);
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
    if (accountSectionKey(key)) {
      await syncSectionToAccount(userId, key, undefined, { allowOverwrite: true });
    }
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
