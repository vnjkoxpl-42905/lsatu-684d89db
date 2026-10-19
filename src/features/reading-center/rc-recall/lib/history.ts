/**
 * What each saved RC Training attempt is, in words that do not overstate it.
 *
 * Status comes from the stored attempt, its recaps and, for this device only, any
 * unsaved local work. There is no score here: RC Training recall is self-checked
 * and never graded, and nothing in this file turns time or completion into one.
 */
import type { AttemptRow, RecapRow } from "./attempts";
import type { Checkpoint } from "./checkpoint";
import type { RecallMode } from "./sequence";

export type RcAttemptStatus = "in_progress" | "not_resumable_here" | "completed" | "ended" | "pending" | "recovery_needed";

export const STATUS_LABEL: Record<RcAttemptStatus, string> = {
  in_progress: "In progress",
  not_resumable_here: "Not resumable here",
  completed: "Completed",
  ended: "Ended early",
  pending: "Result not saved yet",
  recovery_needed: "Recording needs attention",
};

/**
 * Labels describe the stored procedure family. rc_recall has no stored version,
 * so it cannot establish whether an attempt used the old RC Flow presentation
 * or current RC Training. Do not infer a release date or current voice defaults.
 */
export const PROCEDURE_LABEL: Record<RecallMode, string> = {
  rc_recall: "RC paragraph recall",
  cumulative_recall: "Earlier cumulative recall",
};

export interface HistoryEntry {
  attempt: AttemptRow;
  recaps: RecapRow[];
  status: RcAttemptStatus;
  /** Progress for this attempt is kept on this device and can be resumed here. */
  resumable: boolean;
  /** A finish that did not reach the server is waiting on this device. */
  pendingFinalization: Checkpoint["pending"];
  /** How many spoken recaps are not safely saved. */
  unsavedRecordings: number;
}

export function deriveStatus(attempt: AttemptRow, recaps: Pick<RecapRow, "voice" | "recording_state">[], local: Checkpoint | null): RcAttemptStatus {
  if (attempt.finished_at) {
    const unsaved = recaps.some((r) => r.voice === "spoken" && (r.recording_state === "failed" || r.recording_state === "pending"));
    if (unsaved) return "recovery_needed";
    return attempt.completed ? "completed" : "ended";
  }
  if (local?.pending) return "pending";
  return local ? "in_progress" : "not_resumable_here";
}

export function buildEntries(attempts: AttemptRow[], recaps: RecapRow[], local: Checkpoint[]): HistoryEntry[] {
  const byAttempt = new Map<string, RecapRow[]>();
  for (const recap of recaps) {
    const list = byAttempt.get(recap.attempt_id);
    if (list) list.push(recap); else byAttempt.set(recap.attempt_id, [recap]);
  }
  const checkpoints = new Map(local.map((c) => [c.attemptId, c]));
  return attempts.map((attempt) => {
    const own = byAttempt.get(attempt.id) ?? [];
    const checkpoint = checkpoints.get(attempt.id) ?? null;
    const status = deriveStatus(attempt, own, checkpoint);
    return {
      attempt, recaps: own, status,
      resumable: !attempt.finished_at && !!checkpoint && !checkpoint.pending,
      pendingFinalization: !attempt.finished_at ? checkpoint?.pending ?? null : null,
      unsavedRecordings: own.filter((r) => r.voice === "spoken" && (r.recording_state === "failed" || r.recording_state === "pending")).length,
    };
  });
}

/** A recap row's key in words: "p2-para3-recall" is "Passage 2, paragraph 3". */
export function recapLabel(recap: Pick<RecapRow, "recap_key" | "kind" | "passage_position">): string {
  const para = /-para(\d+)-/.exec(recap.recap_key)?.[1];
  const passage = `Passage ${recap.passage_position}`;
  if (recap.kind === "passage_recap") return `${passage}, whole-passage recall`;
  if (recap.kind === "cumulative") return `${passage}, paragraphs 1 to ${para ?? "?"} together`;
  return `${passage}, paragraph ${para ?? "?"}`;
}

export const RECORDING_LABEL: Record<RecapRow["recording_state"], string> = {
  not_recorded: "Silent, not recorded",
  pending: "Recording not saved yet",
  saved: "Recording saved",
  failed: "Recording not saved",
};

export const formatDuration =(seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/** Totals count attempts, whether one passage or four. Duration counts finished attempts only; no score is derived. */
export function summarizeHistory(entries: HistoryEntry[]): { completed: number; ended: number; inProgress: number; needsAttention: number; practiceSeconds: number } {
  let completed = 0, ended = 0, inProgress = 0, needsAttention = 0, practiceSeconds = 0;
  for (const e of entries) {
    if (e.attempt.finished_at) practiceSeconds += e.attempt.elapsed_seconds ?? 0;
    if (e.status === "completed") completed += 1;
    else if (e.status === "ended") ended += 1;
    else if (e.status === "in_progress") inProgress += 1;
    else if (e.status === "pending" || e.status === "recovery_needed") needsAttention += 1;
    if (e.status === "recovery_needed" && e.attempt.completed) completed += 1;
    else if (e.status === "recovery_needed") ended += 1;
  }
  return { completed, ended, inProgress, needsAttention, practiceSeconds };
}
