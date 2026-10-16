import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DB_NAME, assemble, beginBackup, discard, listRuns, putChunk, recoverRcRecallBackups, type BackupRun,
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

beforeEach(async () => {
  for (const id of ["s1", "s2"]) for (const r of await listRuns(id)) await discard(r.recapId);
});

describe("RC Recall backup", () => {
  it("uses its own database, not the LR one", () => {
    expect(DB_NAME).toBe("rc-recall-backup");
    expect(DB_NAME).not.toBe("ac-recording-backup");
  });

  it("reassembles pieces in sequence order", async () => {
    await beginBackup(run("r1"));
    await putChunk("r1", 2, new Blob(["C"]));
    await putChunk("r1", 0, new Blob(["A"]));
    await putChunk("r1", 1, new Blob(["B"]));
    expect(await text((await assemble(run("r1")))!)).toBe("ABC");
  });

  it("recovers a student's own runs and discards them once uploaded", async () => {
    await beginBackup(run("r1")); await putChunk("r1", 0, new Blob(["audio"]));
    await beginBackup(run("other", "s2")); await putChunk("other", 0, new Blob(["theirs"]));
    const upload = vi.fn().mockResolvedValue(undefined);
    const result = await recoverRcRecallBackups("s1", upload);
    expect(result).toEqual({ recovered: 1, failed: 0, empty: 0 });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0].run.recapId).toBe("r1");
    expect(await listRuns("s1")).toEqual([]);
    expect(await listRuns("s2")).toHaveLength(1);
  });

  it("keeps a run whose upload fails, and skips a run still recording", async () => {
    await beginBackup(run("r1")); await putChunk("r1", 0, new Blob(["x"]));
    await beginBackup({ ...run("live"), stopped: false }); await putChunk("live", 0, new Blob(["y"]));
    const upload = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await recoverRcRecallBackups("s1", upload, (id) => id === "live");
    expect(result.failed).toBe(1);
    expect(upload).toHaveBeenCalledTimes(1);
    expect((await listRuns("s1")).map((r) => r.recapId).sort()).toEqual(["live", "r1"]);
  });

  it("drops a run that recorded nothing", async () => {
    await beginBackup(run("empty"));
    const result = await recoverRcRecallBackups("s1", vi.fn());
    expect(result.empty).toBe(1);
    expect(await listRuns("s1")).toEqual([]);
    await discard("empty");
  });

  it("does not recover an unmarked recording while another tab still holds its lock", async () => {
    await beginBackup({ ...run("live"), stopped: false, startedAt: Date.now() }); await putChunk("live", 0, new Blob(["partial"]));
    const upload = vi.fn();
    const result = await recoverRcRecallBackups("s1", upload, async (id) => id === "live");
    expect(result.recovered).toBe(0);
    expect(upload).not.toHaveBeenCalled();
  });

  it("waits before recovering an unmarked run even if no lock is found", async () => {
    await beginBackup({ ...run("fresh"), stopped: false, startedAt: Date.now() }); await putChunk("fresh", 0, new Blob(["partial"]));
    const upload = vi.fn();
    const result = await recoverRcRecallBackups("s1", upload, async () => false);
    expect(result.recovered).toBe(0);
    expect(upload).not.toHaveBeenCalled();
  });
});
