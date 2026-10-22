import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DB_NAME, LIVE_HEARTBEAT_MS, assemble, beginBackup, discard, listRuns, markInterrupted, markStopped, putChunk, recoverRcRecallBackups,
  resetBackupConnection, type BackupRun,
} from "./backup";

const run = (recapId: string, studentId = "s1"): BackupRun => ({
  recapId, attemptId: "a1", studentId, path: `${studentId}/a1/${recapId}.webm`, mimeType: "audio/webm", startedAt: 1, stopped: true,
});
/** jsdom's Blob has no `arrayBuffer`, so read it the way jsdom supports. */
const text = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});
const ok = async (result: ReturnType<typeof assemble>) => {
  const r = await result;
  if (r.ok === false) throw new Error(`assemble failed: ${r.reason}`);
  return r.blob;
};

beforeEach(async () => {
  for (const id of ["s1", "s2"]) for (const r of await listRuns(id)) await discard(r.recapId);
});
afterEach(() => { vi.restoreAllMocks(); resetBackupConnection(); });

describe("RC Training backup", () => {
  it("uses its own database, not the LR one", () => {
    expect(DB_NAME).toBe("rc-recall-backup");
    expect(DB_NAME).not.toBe("ac-recording-backup");
  });

  it("reassembles contiguous pieces in sequence order", async () => {
    await beginBackup(run("r1"));
    await putChunk("r1", 2, new Blob(["C"]));
    await putChunk("r1", 0, new Blob(["A"]));
    await putChunk("r1", 1, new Blob(["B"]));
    expect(await text(await ok(assemble(run("r1"))))).toBe("ABC");
  });

  describe("missing chunks", () => {
    it("refuses to stitch audio across a gap and names what is missing", async () => {
      await beginBackup(run("gap"));
      await putChunk("gap", 0, new Blob(["A"]));
      await putChunk("gap", 2, new Blob(["C"]));
      expect(await assemble(run("gap"))).toEqual({ ok: false, reason: "incomplete", missing: [1] });
    });

    it("notices a missing tail using the piece count the recorder reported", async () => {
      await beginBackup(run("tail"));
      await putChunk("tail", 0, new Blob(["A"]));
      await putChunk("tail", 1, new Blob(["B"]));
      await markStopped("tail", 9000, 4);
      const [stored] = await listRuns("s1");
      expect(stored.chunkCount).toBe(4);
      expect(await assemble(stored)).toEqual({ ok: false, reason: "incomplete", missing: [2, 3] });
    });

    it("never uploads an incomplete run, never deletes it, and reports it", async () => {
      await beginBackup(run("gap")); await putChunk("gap", 0, new Blob(["A"])); await putChunk("gap", 2, new Blob(["C"]));
      const upload = vi.fn();
      const result = await recoverRcRecallBackups("s1", upload);
      expect(upload).not.toHaveBeenCalled();
      expect(result.incomplete).toBe(1);
      expect(result.details[0]).toMatchObject({ outcome: "incomplete", reason: "Missing pieces: 1" });
      expect((await listRuns("s1")).map((r) => r.recapId)).toEqual(["gap"]);
    });
  });

  describe("backup unavailable", () => {
    it("reports when the browser cannot open its backup store", async () => {
      resetBackupConnection();
      vi.spyOn(indexedDB, "open").mockImplementation(() => { throw new Error("blocked"); });
      expect(await beginBackup(run("x"))).toEqual({ ok: false, reason: "This browser cannot keep a backup copy of the recording." });
    });

    it("reports a full device as a storage problem, not a generic failure", async () => {
      await beginBackup(run("q"));
      const full = { arrayBuffer: () => Promise.reject(Object.assign(new Error("full"), { name: "QuotaExceededError" })) } as unknown as Blob;
      expect(await putChunk("q", 0, full)).toEqual({ ok: false, reason: "This device is out of storage space for a backup copy." });
    });

    it("says storage could not be read instead of reporting nothing to recover", async () => {
      resetBackupConnection();
      vi.spyOn(indexedDB, "open").mockImplementation(() => { throw new Error("blocked"); });
      const result = await recoverRcRecallBackups("s1", vi.fn());
      expect(result.storageError).toMatch(/cannot keep a backup/);
      expect(result.recovered).toBe(0);
    });
  });

  describe("recovery", () => {
    it("undoes a raced clean-stop marker without losing partial audio", async () => {
      await beginBackup(run("raced-stop"));
      await putChunk("raced-stop", 0, new Blob(["partial"]));
      await markStopped("raced-stop", 1000, 1);
      expect(await markInterrupted("raced-stop")).toEqual({ ok: true });
      const [saved] = await listRuns("s1");
      expect(saved.stopped).toBe(false);
      expect(saved.chunkCount).toBeUndefined();
      const upload = vi.fn();
      expect((await recoverRcRecallBackups("s1", upload, () => false)).incomplete).toBe(1);
      expect(upload).not.toHaveBeenCalled();
      expect(await text(await ok(assemble(saved)))).toBe("partial");
    });
    it("recovers only the signed-in student's runs and discards them once uploaded", async () => {
      await beginBackup(run("r1")); await putChunk("r1", 0, new Blob(["audio"]));
      await beginBackup(run("other", "s2")); await putChunk("other", 0, new Blob(["theirs"]));
      const upload = vi.fn().mockResolvedValue(undefined);
      const result = await recoverRcRecallBackups("s1", upload);
      expect(result).toMatchObject({ recovered: 1, failed: 0, empty: 0, incomplete: 0 });
      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload.mock.calls[0][0].run.recapId).toBe("r1");
      expect(await listRuns("s1")).toEqual([]);
      expect(await listRuns("s2")).toHaveLength(1);
    });

    it("keeps a run whose upload fails, reports why, and skips a run still recording", async () => {
      await beginBackup(run("r1")); await putChunk("r1", 0, new Blob(["x"]));
      await beginBackup({ ...run("live"), stopped: false }); await putChunk("live", 0, new Blob(["y"]));
      const upload = vi.fn().mockRejectedValue(new Error("offline"));
      const result = await recoverRcRecallBackups("s1", upload, (r) => r.recapId === "live");
      expect(result).toMatchObject({ failed: 1, live: 1 });
      expect(result.details.find((d) => d.outcome === "failed")?.reason).toBe("offline");
      expect(upload).toHaveBeenCalledTimes(1);
      expect((await listRuns("s1")).map((r) => r.recapId).sort()).toEqual(["live", "r1"]);
    });

    it("keeps empty metadata and seals inactive empty runs so recording can retry", async () => {
      await beginBackup(run("empty"));
      await beginBackup({ ...run("fresh"), stopped: false });
      const result = await recoverRcRecallBackups("s1", vi.fn(), () => false);
      expect(result.empty).toBe(2);
      expect((await listRuns("s1")).map((r) => [r.recapId, r.stopped])).toEqual([["empty", true], ["fresh", true]]);
    });

    it("retries on the next pass: a failed upload is recovered when the connection returns", async () => {
      await beginBackup(run("r1")); await putChunk("r1", 0, new Blob(["x"]));
      const upload = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(undefined);
      expect((await recoverRcRecallBackups("s1", upload)).failed).toBe(1);
      expect((await recoverRcRecallBackups("s1", upload)).recovered).toBe(1);
      expect(await listRuns("s1")).toEqual([]);
    });
  });

  describe("crash remnants without Web Locks", () => {
    // jsdom has no navigator.locks, which is the situation under test.
    it("has no Web Locks here", () => { expect((navigator as { locks?: unknown }).locks).toBeUndefined(); });

    it("leaves a run alone while it is still writing pieces", async () => {
      await beginBackup({ ...run("live"), stopped: false, heartbeatAt: Date.now() }); await putChunk("live", 0, new Blob(["partial"]));
      const upload = vi.fn();
      const result = await recoverRcRecallBackups("s1", upload);
      expect(result.live).toBe(1);
      expect(upload).not.toHaveBeenCalled();
    });

    it("keeps crashed audio downloadable without claiming its unknown ending is complete", async () => {
      await beginBackup({ ...run("crashed"), stopped: false, heartbeatAt: Date.now() - LIVE_HEARTBEAT_MS - 1000 });
      await putChunk("crashed", 0, new Blob(["rescued"]));
      // putChunk refreshes the heartbeat for a live run, so age it again as a crash would leave it.
      await beginBackup({ ...run("crashed"), stopped: false, heartbeatAt: Date.now() - LIVE_HEARTBEAT_MS - 1000 });
      const upload = vi.fn().mockResolvedValue(undefined);
      const result = await recoverRcRecallBackups("s1", upload);
      expect(result.recovered).toBe(0);
      expect(result.incomplete).toBe(1);
      expect(upload).not.toHaveBeenCalled();
      expect(result.details[0].reason).toMatch(/end may be missing/);
      const [saved] = await listRuns("s1");
      expect(saved.stopped).toBe(false);
      expect(await text(await ok(assemble(saved)))).toBe("rescued");
    });

    it("does not upload the same run twice when recovery overlaps itself", async () => {
      await beginBackup(run("r1")); await putChunk("r1", 0, new Blob(["x"]));
      let release!: () => void;
      const upload = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
      const first = recoverRcRecallBackups("s1", upload);
      await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
      const second = await recoverRcRecallBackups("s1", upload);
      expect(second.details[0].outcome).toBe("busy");
      release();
      expect((await first).recovered).toBe(1);
      expect(upload).toHaveBeenCalledTimes(1);
    });
  });
});


it("preserves an earlier recording when the same recap is recorded again", async () => {
  await beginBackup(run("r1"));
  await putChunk("r1", 0, new Blob(["original"]));
  expect(await beginBackup({ ...run("r1"), path: "s1/a1/new.webm" })).toMatchObject({ ok: false, existing: true });
  expect(await text(await ok(assemble(run("r1"))))).toBe("original");
});

it("rejects surplus chunks instead of appending an old recording's tail", async () => {
  await beginBackup(run("r1"));
  await putChunk("r1", 0, new Blob(["A"]));
  await putChunk("r1", 1, new Blob(["B"]));
  expect(await assemble({ ...run("r1"), chunkCount: 1 })).toMatchObject({ ok: false, reason: "incomplete" });
});


it("allows a new recording path after an empty failed start is sealed", async () => {
  await beginBackup({ ...run("r1"), stopped: false });
  await markStopped("r1", 0, 0);
  expect(await beginBackup({ ...run("r1"), path: "s1/a1/retry.webm", stopped: false })).toEqual({ ok: true });
});
it("seals a dead empty orphan for retry without discarding existing backup metadata", async () => {
  await beginBackup({ ...run("orphan"), stopped: false, heartbeatAt: 1 });
  const upload = vi.fn();
  expect((await recoverRcRecallBackups("s1", upload, async () => false)).empty).toBe(1);
  expect(upload).not.toHaveBeenCalled();
  expect((await listRuns("s1"))[0].stopped).toBe(true);
  expect(await beginBackup({ ...run("orphan"), path: "s1/a1/retry.webm" })).toEqual({ ok: true });
});
