import { finalizeAttempt, type AttemptRow } from "./attempts";
import { clearCheckpoint, type Checkpoint, type StorageLike } from "./checkpoint";

/**
 * Send a finish that did not reach the server, with the duration it had when it
 * was first attempted. Only a confirmed save removes the local record; a failure
 * leaves it exactly as it was, so the retry can be repeated later.
 */
export async function retryPendingFinalization(checkpoint: Checkpoint, storage?: StorageLike | null): Promise<AttemptRow> {
  if (!checkpoint.pending) throw new Error("There is no unsaved result to send.");
  const row = await finalizeAttempt({
    attemptId: checkpoint.attemptId, studentId: checkpoint.studentId,
    elapsedSeconds: checkpoint.pending.seconds, completed: checkpoint.pending.completed,
  });
  clearCheckpoint(checkpoint.studentId, checkpoint.attemptId, storage);
  return row;
}
