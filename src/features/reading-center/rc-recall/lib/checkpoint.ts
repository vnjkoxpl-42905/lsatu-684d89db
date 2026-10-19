/**
 * Same-device progress checkpoints for an unfinished RC Training section.
 *
 * The attempts table holds no step, paragraph or time-away data, and no server
 * checkpoint schema is deployed. Until one is, progress is kept in this browser's
 * local storage, scoped to the signed-in account. That means resume works on this
 * device only. Nothing here may be described as cross-device, and a checkpoint
 * that belongs to another account, another attempt or different content is
 * refused rather than adapted.
 *
 * A failed finalization is kept in the same record with its original duration, so
 * it can be retried exactly once after the student leaves or reloads.
 */
import type { AttemptRow, RecordingState } from "./attempts";
import type { ConfirmScope, Voice } from "./sequence";

export const CHECKPOINT_VERSION = 1;
const PREFIX = `rc-training:checkpoint:v${CHECKPOINT_VERSION}:`;

export interface CheckpointRecap { key: string; voice: Voice; state: RecordingState; rowId: string | null; label: string }

export interface PendingFinalization { completed: boolean; seconds: number; savedAt: number }

export interface Checkpoint {
  captureWorkflow?: boolean;
  version: typeof CHECKPOINT_VERSION;
  studentId: string;
  attemptId: string;
  /** Last verified server identity, for same-device offline history only. */
  attempt?: AttemptRow;
  contentKey: string;
  scope: ConfirmScope;
  stepIndex: number;
  stepId: string;
  recaps: CheckpointRecap[];
  /** Active time only. Time away is not included. */
  sectionMs: number;
  passageMs: number;
  showElapsedTimer: boolean;
  savedAt: number;
  pending: PendingFinalization | null;
}

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function defaultStorage(): StorageLike | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

export const checkpointKey = (studentId: string, attemptId: string): string => `${PREFIX}${studentId}:${attemptId}`;

/** What a section is, independent of the attempt id: used to refuse a checkpoint for other content. */
export function contentKeyFor(section: { preptest: number; section: number; passageIds: number[] }): string {
  return `pt${section.preptest}-s${section.section}:${section.passageIds.join(",")}`;
}

export type SaveResult = { ok: true } | { ok: false; reason: string };

export function saveCheckpoint(checkpoint: Checkpoint, storage: StorageLike | null = defaultStorage()): SaveResult {
  if (!storage) return { ok: false, reason: "This browser does not allow progress to be kept on this device." };
  try {
    storage.setItem(checkpointKey(checkpoint.studentId, checkpoint.attemptId), JSON.stringify(checkpoint));
    return { ok: true };
  } catch {
    return { ok: false, reason: "This device has no room to keep your place." };
  }
}

export function clearCheckpoint(studentId: string, attemptId: string, storage: StorageLike | null = defaultStorage()): void {
  try { storage?.removeItem(checkpointKey(studentId, attemptId)); } catch { /* nothing to clear */ }
}

export type CheckpointRejection = "missing" | "unreadable" | "other_account" | "other_attempt" | "content_changed" | "out_of_range";

export type CheckpointLoad = { ok: true; checkpoint: Checkpoint } | { ok: false; reason: CheckpointRejection };

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

function parse(raw: string | null): Checkpoint | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as Partial<Checkpoint> | null;
    if (!c || c.version !== CHECKPOINT_VERSION || typeof c.studentId !== "string" || typeof c.attemptId !== "string"
      || typeof c.contentKey !== "string" || typeof c.stepId !== "string" || !Number.isInteger(c.stepIndex)
      || !Array.isArray(c.recaps) || !finite(c.sectionMs) || !finite(c.passageMs)) return null;
    if (c.attempt && (c.attempt.id !== c.attemptId || c.attempt.student_id !== c.studentId
      || !Number.isInteger(c.attempt.preptest) || !Number.isInteger(c.attempt.section)
      || !Array.isArray(c.attempt.passage_ids) || !c.attempt.passage_ids.every(Number.isInteger))) return null;
    if (c.pending && (typeof c.pending.completed !== "boolean" || !finite(c.pending.seconds) || !finite(c.pending.savedAt))) return null;
    if (c.scope !== "all_read" && c.scope !== "current_sub_passage") return null;
    if (!c.recaps.every((r) => r && typeof r.key === "string" && (r.voice === "silent" || r.voice === "spoken")
      && ["not_recorded", "pending", "saved", "failed"].includes(r.state) && (r.rowId === null || typeof r.rowId === "string"))) return null;
    return c as Checkpoint;
  } catch { return null; }
}

/**
 * Read a checkpoint for this account and attempt and check it against what is
 * about to be resumed. Every mismatch is a refusal with a reason.
 */
export function loadCheckpoint(
  expected: { studentId: string; attemptId: string; contentKey: string; stepIds: string[] },
  storage: StorageLike | null = defaultStorage(),
): CheckpointLoad {
  let raw: string | null = null;
  try { raw = storage?.getItem(checkpointKey(expected.studentId, expected.attemptId)) ?? null; } catch { return { ok: false, reason: "unreadable" }; }
  if (raw === null) return { ok: false, reason: "missing" };
  const checkpoint = parse(raw);
  if (!checkpoint) return { ok: false, reason: "unreadable" };
  if (checkpoint.studentId !== expected.studentId) return { ok: false, reason: "other_account" };
  if (checkpoint.attemptId !== expected.attemptId) return { ok: false, reason: "other_attempt" };
  if (checkpoint.contentKey !== expected.contentKey) return { ok: false, reason: "content_changed" };
  if (checkpoint.stepIndex < 0 || checkpoint.stepIndex >= expected.stepIds.length || expected.stepIds[checkpoint.stepIndex] !== checkpoint.stepId) {
    return { ok: false, reason: "out_of_range" };
  }
  return { ok: true, checkpoint };
}

/** Checkpoints on this device for one account. Another account's are never returned. */
export function listCheckpoints(studentId: string, storage: StorageLike | null = defaultStorage()): Checkpoint[] {
  const found: Checkpoint[] = [];
  if (!storage) return found;
  try {
    const prefix = `${PREFIX}${studentId}:`;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const checkpoint = parse(storage.getItem(key));
      if (checkpoint && checkpoint.studentId === studentId && key === checkpointKey(studentId, checkpoint.attemptId)) found.push(checkpoint);
    }
  } catch { /* unreadable storage reads as no checkpoints */ }
  return found;
}

export const REJECTION_MESSAGE: Record<CheckpointRejection, string> = {
  missing: "No saved place was found on this device.",
  unreadable: "The saved place on this device could not be read.",
  other_account: "The saved place on this device belongs to a different account.",
  other_attempt: "The saved place on this device belongs to a different attempt.",
  content_changed: "The passages in this section have changed since your place was saved.",
  out_of_range: "The saved place no longer matches this section's steps.",
};
