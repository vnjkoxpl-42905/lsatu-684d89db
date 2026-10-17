import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createPracticeTestRun,
  listPracticeTestRuns,
  loadPracticeTestRun,
  practiceTestRaw,
  practiceTestScaled,
  savePracticeTestRun,
  type PracticeTestBlueprint,
  type PracticeTestPaceId,
  type PracticeTestRun,
} from '@/lib/practiceTest';

type RunRow = {
  timed_contract_version?: number | null;
  id: string;
  user_id: string;
  pt: number;
  pace: string;
  section_seconds: number | null;
  legs: PracticeTestRun['legs'];
  current_leg: number;
  break_after_leg: number;
  break_taken: boolean;
  break_started_at: string | null;
  status: PracticeTestRun['status'];
  revision: number;
  active_device_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  raw_correct: number | null;
  raw_total: number | null;
  scaled_score: number | null;
  score_source: string | null;
};

// The migration is pending deployment; generated types are updated by the
// backend generator, never edited by hand in this checkout.
type PracticeTestDatabase = {
  public: {
    Tables: {
      practice_test_runs: {
        Row: RunRow;
        Insert: Omit<RunRow, 'updated_at'> & { updated_at?: string };
        Update: Partial<RunRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
const table = () => (supabase as unknown as SupabaseClient<PracticeTestDatabase>).from('practice_test_runs');

const DEVICE_KEY = 'lsatu:practice-test-device-id';
const PENDING_PREFIX = 'lsatu:practice-test-pending:';
let memoryDeviceId: string | null = null;

export class PracticeTestConflictError extends Error {
  constructor() {
    super('This exam changed in another browser. Your device copy has been kept. Reload the exam to continue.');
    this.name = 'PracticeTestConflictError';
  }
}

/** Stable in one browser, different on another device or browser profile. */
export function getPracticeTestDeviceId(): string {
  if (memoryDeviceId) return memoryDeviceId;
  let id: string | null = null;
  try { id = localStorage.getItem(DEVICE_KEY); } catch { /* storage disabled */ }
  if (id) return (memoryDeviceId = id);
  id = globalThis.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random()}`;
  try { localStorage.setItem(DEVICE_KEY, id); } catch { /* revision still protects writes */ }
  return (memoryDeviceId = id);
}

async function assertAccount(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== userId) {
    throw new Error('Your account session changed. Sign in again before continuing this exam.');
  }
}

function fromRow(row: RunRow): PracticeTestRun {
  return {
    timedContractVersion: row.timed_contract_version ?? null,
    id: row.id,
    userId: row.user_id,
    revision: row.revision,
    activeDeviceId: row.active_device_id,
    updatedAt: row.updated_at,
    pt: row.pt,
    pace: row.pace as PracticeTestPaceId,
    // Pre-migration rows have no resolved clock. Preserve the old run's
    // fallback behavior rather than assigning an assumed accommodation.
    sectionSeconds: row.section_seconds === null && row.pace !== 'untimed'
      ? undefined : row.section_seconds,
    legs: row.legs,
    currentLeg: row.current_leg,
    breakAfterLeg: row.break_after_leg,
    breakTaken: row.break_taken,
    ...(row.break_started_at ? { breakStartedAt: row.break_started_at } : {}),
    status: row.status,
    createdAt: row.created_at,
  };
}

function toRow(run: PracticeTestRun, userId: string) {
  const raw = practiceTestRaw(run);
  return {
    id: run.id,
    user_id: userId,
    pt: run.pt,
    pace: run.pace,
    section_seconds: run.sectionSeconds ?? null,
    legs: run.legs,
    current_leg: run.currentLeg,
    break_after_leg: run.breakAfterLeg,
    break_taken: run.breakTaken,
    break_started_at: run.breakStartedAt ?? null,
    status: run.status,
    created_at: run.createdAt,
    completed_at: run.status === 'complete' ? run.legs.at(-1)?.completedAt ?? new Date().toISOString() : null,
    raw_correct: run.status === 'complete' ? raw.correct : null,
    raw_total: run.status === 'complete' ? raw.total : null,
    scaled_score: run.status === 'complete' ? practiceTestScaled(run) : null,
    score_source: run.status === 'complete' ? 'estimate' : null,
  };
}

function pendingKey(userId: string, id: string): string {
  return `${PENDING_PREFIX}${userId}:${id}`;
}

function keepPendingCopy(run: PracticeTestRun): void {
  if (!run.userId) return;
  try { localStorage.setItem(pendingKey(run.userId, run.id), JSON.stringify({ run, synced: false })); } catch { /* account write may still succeed */ }
}

function markPendingSynced(run: PracticeTestRun): void {
  if (!run.userId) return;
  try { localStorage.setItem(pendingKey(run.userId, run.id), JSON.stringify({ run, synced: true })); } catch { /* account write already succeeded */ }
}

/** A failed account write remains here for deliberate recovery, never silently replayed. */
export function readPendingPracticeTestBackup(userId: string, id: string): PracticeTestRun | null {
  try {
    const raw = localStorage.getItem(pendingKey(userId, id));
    if (!raw) return null;
    const backup = JSON.parse(raw) as { run: PracticeTestRun; synced: boolean };
    if (backup.synced) return null;
    const run = backup.run;
    return run.userId === userId && run.id === id ? run : null;
  } catch { return null; }
}

function remember(run: PracticeTestRun): void {
  if (run.timedContractVersion != null) return;
  // A local copy is kept after successful account writes and after failed
  // writes. It never silently replaces the account's newer revision.
  const previous = loadPracticeTestRun(run.id);
  if (previous?.userId === run.userId &&
      (previous.revision === undefined || previous.revision >= (run.revision ?? 0)) &&
      JSON.stringify(previous) !== JSON.stringify(run)) {
    keepPendingCopy(previous);
  }
  savePracticeTestRun(run);
}

/**
 * An old run without an owner cannot safely be assigned to whoever happens
 * to be signed into a shared browser today. Runs created by the account-aware
 * client carry userId and can be imported without student intervention.
 */
export async function importOwnedDevicePracticeTestRuns(userId: string): Promise<number> {
  await assertAccount(userId);
  let imported = 0;
  for (const run of listPracticeTestRuns()) {
    if (run.userId !== userId || run.revision !== undefined || run.timedContractVersion != null) continue;
    const { data: existing, error: lookupError } = await table()
      .select('*').eq('id', run.id).eq('user_id', userId).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) {
      remember(fromRow(existing as unknown as RunRow));
      continue;
    }
    const row = { ...toRow(run, userId), revision: 0, active_device_id: getPracticeTestDeviceId() };
    const { data, error } = await table().insert(row).select('*').single();
    if (error) {
      // An insert might have succeeded while its response was lost. Keep the
      // original device copy and let the next load resolve that case.
      if (error.code === '23505') {
        const { data: saved, error: reloadError } = await table()
          .select('*').eq('id', run.id).eq('user_id', userId).maybeSingle();
        if (reloadError) throw reloadError;
        if (saved) {
          remember(fromRow(saved as unknown as RunRow));
          continue;
        }
      }
      throw error;
    }
    remember(fromRow(data as unknown as RunRow));
    imported += 1;
  }
  return imported;
}

export async function listAccountPracticeTestRuns(userId: string): Promise<PracticeTestRun[]> {
  await assertAccount(userId);
  const runs = await listSavedAccountPracticeTestRuns(userId);
  runs.forEach(remember);
  const ids = new Set(runs.map(run => run.id));
  // Device-only work remains readable; opening the exam does not adopt or rewrite it.
  const preserved = listPracticeTestRuns().filter(run => run.userId === userId && !ids.has(run.id));
  return [...runs, ...preserved];
}

/** Read persisted account runs without importing or writing device backups. */
export async function listSavedAccountPracticeTestRuns(userId: string): Promise<PracticeTestRun[]> {
  await assertAccount(userId);
  const { data, error } = await table()
    .select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => fromRow(row as unknown as RunRow));
}

export async function loadAccountPracticeTestRun(userId: string, id: string): Promise<PracticeTestRun | null> {
  await assertAccount(userId);
  const { data, error } = await table()
    .select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (data) {
    const run = fromRow(data as unknown as RunRow);
    remember(run);
    return run;
  }
  const local = loadPracticeTestRun(id);
  if (local?.userId === userId && local.revision === undefined) {
    return local;
  }
  return null;
}

/** Check the current writer before a PT leg commits answers or a result. */
export async function isActivePracticeTestDevice(userId: string, runId: string): Promise<boolean> {
  await assertAccount(userId);
  const { data, error } = await table().select('*')
    .eq('id', runId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data?.timed_contract_version == null && data?.status === 'in-progress' && data.active_device_id === getPracticeTestDeviceId();
}

export async function createAccountPracticeTestRun(
  userId: string,
  blueprint: PracticeTestBlueprint,
  pace: PracticeTestPaceId,
  sectionSeconds: number | null,
): Promise<PracticeTestRun> {
  await assertAccount(userId);
  const run = { ...createPracticeTestRun(blueprint, pace, sectionSeconds), userId };
  remember(run);
  const { data, error } = await table().insert({
    ...toRow(run, userId), revision: 0, active_device_id: getPracticeTestDeviceId(),
  }).select('*').single();
  if (error) throw error;
  const saved = fromRow(data as unknown as RunRow);
  remember(saved);
  markPendingSynced(saved);
  return saved;
}

export async function saveAccountPracticeTestRun(
  userId: string,
  run: PracticeTestRun,
  pendingBackup: PracticeTestRun = run,
): Promise<PracticeTestRun> {
  if (run.timedContractVersion != null) throw new Error('Protected exams require the atomic timed writer.');
  if (run.userId !== userId || run.revision === undefined) throw new PracticeTestConflictError();
  const deviceId = getPracticeTestDeviceId();
  if (run.activeDeviceId !== deviceId) throw new PracticeTestConflictError();
  keepPendingCopy(pendingBackup);
  savePracticeTestRun(pendingBackup);
  await assertAccount(userId);
  const row = toRow(run, userId);
  const { id: _id, user_id: _owner, created_at: _created, ...changes } = row;
  const { data, error } = await table()
    .update({ ...changes, revision: run.revision + 1 })
    .eq('id', run.id).eq('user_id', userId).eq('revision', run.revision)
    .eq('active_device_id', deviceId).eq('status', 'in-progress')
    .select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new PracticeTestConflictError();
  const saved = fromRow(data as unknown as RunRow);
  remember(saved);
  markPendingSynced(saved);
  return saved;
}

export async function abandonAccountPracticeTestRun(userId: string, run: PracticeTestRun): Promise<PracticeTestRun> {
  return saveAccountPracticeTestRun(userId, { ...run, status: 'abandoned' });
}

/** Called only after the student chooses to continue this existing run here. */
export async function continueAccountPracticeTestHere(userId: string, run: PracticeTestRun): Promise<PracticeTestRun> {
  await assertAccount(userId);
  if (run.timedContractVersion != null) throw new Error('Protected exams require the atomic timed writer.');
  if (run.userId !== userId || run.revision === undefined || run.status !== 'in-progress') {
    throw new PracticeTestConflictError();
  }
  const { data, error } = await table()
    .update({ active_device_id: getPracticeTestDeviceId(), revision: run.revision + 1 })
    .eq('id', run.id).eq('user_id', userId).eq('revision', run.revision)
    .eq('status', 'in-progress').select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new PracticeTestConflictError();
  const saved = fromRow(data as unknown as RunRow);
  remember(saved);
  return saved;
}
