import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginBackup,
  discard,
  listPendingRuns,
  LIVE_GRACE_MS,
  putChunk,
  type BackupRun,
} from "./recordingBackup";

/**
 * Recovery, in a tab that is not the one recording.
 *
 * `isActive` protects the live run from the tab that is making it. It cannot
 * protect it from any OTHER tab, and a student who opens a second section page
 * mid-run has one. These run recovery as that second tab would: same browser,
 * same IndexedDB, none of this tab's memory.
 */

const upload = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { storage: { from: () => ({ upload: (...a: unknown[]) => upload(...(a as [])) }) } },
}));

// Imported after the mock, and with `isActive` neutered: a second tab has an
// empty Set of its own.
vi.mock("./recordingBackup", async (importOriginal) => {
  const real = await importOriginal<typeof import("./recordingBackup")>();
  return { ...real, isActive: () => false };
});
const { recoverPendingRecordings } = await import("./recoverRecordings");

const RUN: BackupRun = {
  runId: "run-live",
  assignmentId: "a1",
  studentId: "s1",
  attempt: 2,
  path: "s1/a1-a2.webm",
  bucket: "drill-recordings",
  mimeType: "audio/webm",
  startedAt: Date.now(),
};

beforeEach(async () => {
  vi.restoreAllMocks();
  upload.mockClear();
  for (const run of await listPendingRuns()) await discard(run.runId);
});

describe("recovery from a second tab", () => {
  it("leaves a run another tab is still recording alone", async () => {
    await beginBackup(RUN);
    await putChunk(RUN.runId, 0, new Blob(["header"]));

    const recovered = await recoverPendingRecordings("s1");

    expect(recovered).toBe(0);
    expect(upload).not.toHaveBeenCalled();
    // And, above all, did not throw the live run's crash protection away.
    expect((await listPendingRuns()).map((r) => r.runId)).toEqual([RUN.runId]);
  });

  it("still uploads a run whose tab has gone quiet", async () => {
    await beginBackup({ ...RUN, runId: "run-dead" });
    await putChunk("run-dead", 0, new Blob(["header"]));
    // Silence for well past the grace: the tab crashed. Age the clock rather
    // than writing a stale marker back, because announcing a run is itself a
    // claim that it is live -- `beginBackup` refreshes the heartbeat by design.
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + LIVE_GRACE_MS + 1000);

    const recovered = await recoverPendingRecordings("s1");

    expect(recovered).toBe(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect(await listPendingRuns()).toEqual([]);
  });
});

/**
 * A recovered file must never replace one the run itself stored.
 *
 * The backup exists for a run that never reached its own upload. A path that
 * already holds a recording was written by a sitting that finished, and that
 * file is the whole of the evidence for its grade. On 2026-09-08 an orphaned
 * recorder's 116-minute backup was uploaded over a finished 66-minute run
 * because the recovery upload overwrote whatever was there.
 */
describe("recovery never overwrites a stored recording", () => {
  const dead = () => {
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + LIVE_GRACE_MS + 1000);
  };

  it("uploads without overwrite", async () => {
    await beginBackup({ ...RUN, runId: "run-a" });
    await putChunk("run-a", 0, new Blob(["header"]));
    dead();

    await recoverPendingRecordings("s1");

    expect(upload).toHaveBeenCalledTimes(1);
    const options = (upload.mock.calls[0] as unknown[])[2] as { upsert?: boolean };
    expect(options.upsert).toBe(false);
  });

  it("forgets a run whose path already holds a recording", async () => {
    upload.mockResolvedValueOnce({
      error: { statusCode: "409", message: "The resource already exists" },
    } as never);
    await beginBackup({ ...RUN, runId: "run-b" });
    await putChunk("run-b", 0, new Blob(["header"]));
    dead();

    const recovered = await recoverPendingRecordings("s1");

    expect(recovered).toBe(0);
    expect(await listPendingRuns()).toEqual([]);
  });

  it("keeps a run whose upload failed for any other reason", async () => {
    upload.mockResolvedValueOnce({ error: { statusCode: "500", message: "boom" } } as never);
    await beginBackup({ ...RUN, runId: "run-c" });
    await putChunk("run-c", 0, new Blob(["header"]));
    dead();

    const recovered = await recoverPendingRecordings("s1");

    expect(recovered).toBe(0);
    expect((await listPendingRuns()).map((r) => r.runId)).toEqual(["run-c"]);
  });
});
