import { supabase } from "@/integrations/supabase/client";
import { requestSectionGrading } from "../api/activitiesClient";
import {
  assemble,
  discard,
  discardRow,
  isActive,
  isLive,
  listPendingRuns,
  listStashedRows,
  purgeStale,
  purgeStaleRows,
  type StashedRow,
} from "./recordingBackup";

/**
 * Storage's answer when the object is already there.
 *
 * supabase-js reports it as a `StorageApiError` with `statusCode` "409" and
 * the message "The resource already exists". Both are matched, because the
 * status has changed type across versions and the message has not.
 */
function alreadyStored(error: unknown): boolean {
  const e = error as { statusCode?: string | number; status?: number; message?: string } | null;
  if (!e) return false;
  if (String(e.statusCode ?? e.status ?? "") === "409") return true;
  return /already exists/i.test(e.message ?? "");
}

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

    /*
     * Newest sitting first.
     *
     * Two pending runs can name the same path: a sitting that crashed before
     * its first row kept the Attempt number, so the next sitting of that
     * section took the same name. Only one of them can land, now that the
     * upload refuses to overwrite, and it should be the one she actually ran,
     * which is the later one. The earlier then meets a conflict and is
     * forgotten, which is what it deserves.
     */
    const pending = (await listPendingRuns()).sort((a, b) => b.startedAt - a.startedAt);
    for (const run of pending) {
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

      /*
       * Never over the top of a recording that is already there.
       *
       * The backup is for a run that never reached its own upload. A path that
       * already holds a file was written by a sitting that finished, and that
       * file is the evidence its grade rests on. This used to upsert, and on
       * 2026-09-08 it put an orphaned recorder's 116-minute backup over a
       * finished 66-minute run, which the grader then refused. A conflict here
       * means the real recording landed; the pieces are surplus and go.
       */
      const { error } = await supabase.storage
        .from(run.bucket)
        .upload(run.path, blob, { contentType: run.mimeType, upsert: false });
      if (error) {
        if (alreadyStored(error)) {
          await discard(run.runId);
          continue;
        }
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

/**
 * Send the answers of sections whose rows never reached the database.
 *
 * The other half of `recoverPendingRecordings`, and the half that had nothing.
 * A run whose response rows do not cover its section is refused by the grader
 * and by the sweeper alike (ADR 0027), so a row lost to the network takes the
 * whole sitting with it -- and the recording, which very often uploaded
 * perfectly, could then be marked by nothing, ever. W2 stopped that being
 * silent. This is the way back.
 *
 * Runs after the recordings, because the grade needs the audio to be in place
 * before it is asked for.
 */
export async function recoverPendingRows(studentId: string): Promise<number> {
  let recovered = 0;
  try {
    await purgeStaleRows();

    const byRun = new Map<string, StashedRow[]>();
    for (const row of await listStashedRows()) {
      if (row.studentId !== studentId) continue;
      // A run this tab is still recording is not a run to be repairing. Rows
      // are only ever stashed at the end of one, so this is belt and braces.
      if (isActive(row.runId)) continue;
      const at = byRun.get(row.runId);
      if (at) at.push(row);
      else byRun.set(row.runId, [row]);
    }

    for (const [, rows] of byRun) {
      let landed = 0;
      for (const stashed of rows) {
        /*
         * One row per statement, and idempotent, exactly as the run's own
         * backstop writes it. `ignoreDuplicates` means a row that did in fact
         * arrive -- a response that succeeded after the tab gave up on it --
         * is a success here rather than a conflict.
         */
        const { error } = await supabase
          .from("activity_item_responses")
          .upsert([stashed.row as never], {
            onConflict: "assignment_id,student_id,item_order,attempt_no",
            ignoreDuplicates: true,
          });
        if (error) {
          // Keep it. The next open tries again, and until then this copy is
          // the only one that exists.
          console.error("[rrc] could not send a recovered answer", error);
          continue;
        }
        await discardRow(stashed.key);
        landed += 1;
      }

      /*
       * Ask for the grade only once the run is whole again.
       *
       * ADR 0027 refuses a run whose rows do not cover its section, so asking
       * on a partial recovery buys a certain 409 -- which is the thing W2
       * exists to stop happening in silence. `landed === rows.length` is the
       * last row of that run landing, and nothing else.
       */
      if (landed > 0 && landed === rows.length) {
        recovered += landed;
        void requestSectionGrading(rows[0].assignmentId);
      }
    }
  } catch (e) {
    console.error("[rrc] answer recovery pass failed", e);
  }
  return recovered;
}
