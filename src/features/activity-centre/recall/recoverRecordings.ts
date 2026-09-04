import { supabase } from "@/integrations/supabase/client";
import { assemble, discard, isActive, isLive, listPendingRuns, purgeStale } from "./recordingBackup";

/**
 * Upload the recordings of sections that never finished.
 *
 * A section that crashed, or whose lid closed at minute nineteen, left its
 * stimulus rows in the database and its audio nowhere. The pieces of that audio
 * are still on the student's own machine, and this is what puts them where they
 * belong the next time she opens the app.
 *
 * The rows written during that run already name the file, so uploading it to
 * that path is the whole of the repair: nothing has to be rewritten, and a
 * Report Card can then be produced from a sitting that was previously lost.
 *
 * Everything here is best-effort and silent. It runs on the way into a screen
 * she asked for, and a failed recovery must never be the reason that screen does
 * not open.
 */
export async function recoverPendingRecordings(studentId: string): Promise<number> {
  let recovered = 0;
  try {
    // Anything abandoned long enough that nobody is coming back for it.
    await purgeStale();

    for (const run of await listPendingRuns()) {
      // Not hers, and not one still being recorded -- in this tab, or in any
      // other. `isActive` is this tab's memory; `isLive` is the record's own
      // heartbeat, and the only one of the two a second tab can see.
      if (run.studentId !== studentId) continue;
      if (isActive(run.runId)) continue;
      if (isLive(run)) continue;

      const blob = await assemble(run);
      if (!blob || blob.size === 0) {
        // Announced and never written to. Nothing to recover and no reason to
        // keep looking at it.
        await discard(run.runId);
        continue;
      }

      const { error } = await supabase.storage
        .from(run.bucket)
        .upload(run.path, blob, { contentType: run.mimeType, upsert: true });
      if (error) {
        // Keep it. The next open tries again, and until then this copy is the
        // only one that exists.
        console.error("[rrc] could not upload a recovered recording", error);
        continue;
      }

      await discard(run.runId);
      recovered += 1;
    }
  } catch (e) {
    console.error("[rrc] recovery pass failed", e);
  }
  return recovered;
}
