import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  assemble,
  beginBackup,
  discard,
  isActive,
  isLive,
  LIVE_GRACE_MS,
  listPendingRuns,
  putChunk,
  purgeStale,
  type BackupRun,
} from "./recordingBackup";

/**
 * The local copy that stands between a student and a lost section.
 *
 * Twenty minutes of one unbroken recording used to live in the tab and nowhere
 * else, so a crash at minute nineteen took all of it. These pin the properties
 * that make the copy worth having, and every one of them fails silently rather
 * than loudly: a backup that stores nothing, or reassembles in the wrong order,
 * looks exactly like a backup that works right up until the day it is needed.
 */

const RUN: BackupRun = {
  runId: "run-1",
  assignmentId: "a1",
  studentId: "s1",
  attempt: 1,
  path: "s1/a1.webm",
  bucket: "drill-recordings",
  mimeType: "audio/webm",
  startedAt: Date.now(),
};

/** A piece of a recording, distinguishable by its content. */
const piece = (n: number) => new Blob([String(n)], { type: "audio/webm" });

/** jsdom's Blob has no `arrayBuffer`, so read it the way jsdom supports. */
function textOf(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

beforeEach(async () => {
  for (const run of await listPendingRuns()) await discard(run.runId);
});

describe("keeping a recording as it is made", () => {
  it("hands back every piece, in the order they were recorded", async () => {
    await beginBackup(RUN);
    for (let seq = 0; seq < 5; seq++) await putChunk(RUN.runId, seq, piece(seq));

    const blob = await assemble(RUN);
    expect(await textOf(blob!)).toBe("01234");
  });

  /*
   * The one that matters.
   *
   * Only the FIRST piece a MediaRecorder emits carries the file's header; every
   * later piece is a bare cluster. Reassembled out of order the result does not
   * begin with a header and is not a playable file at all -- it is the
   * documented way these recordings get corrupted. Pieces are written
   * asynchronously and can therefore land out of order, so assembly must sort
   * rather than trust arrival.
   */
  it("orders by number and not by text, past the tenth piece", async () => {
    await beginBackup(RUN);
    // Twelve, because the bug this guards is lexicographic order: an unpadded
    // key puts "10" and "11" between "1" and "2", which silently moves the
    // header-carrying first piece into the middle of the file. A twenty-minute
    // section is about 130 pieces, so this is the normal case rather than an
    // edge one. Written out of order too, as racing writes arrive.
    for (const seq of [11, 3, 0, 10, 4, 1, 9, 2, 5, 8, 6, 7]) {
      await putChunk(RUN.runId, seq, piece(seq % 10));
    }

    const blob = await assemble(RUN);
    expect(await textOf(blob!)).toBe("012345678901");
  });

  it("keeps two runs apart", async () => {
    const other = { ...RUN, runId: "run-2", attempt: 2, path: "s1/a1-a2.webm" };
    await beginBackup(RUN);
    await beginBackup(other);
    await putChunk(RUN.runId, 0, piece(1));
    await putChunk(other.runId, 0, piece(9));

    expect(await textOf((await assemble(RUN))!)).toBe("1");
    expect(await textOf((await assemble(other))!)).toBe("9");
  });

  it("carries where the recording belongs, so a recovered one can be filed", async () => {
    await beginBackup(RUN);
    const [pending] = await listPendingRuns();
    // The rows written during the run already name this path. Recovery is
    // putting the file where they say it is, not rewriting anything.
    expect(pending.path).toBe("s1/a1.webm");
    expect(pending.bucket).toBe("drill-recordings");
  });
});

describe("letting go of it", () => {
  it("forgets a run once its recording is safely away", async () => {
    await beginBackup(RUN);
    await putChunk(RUN.runId, 0, piece(1));
    await discard(RUN.runId);

    expect(await listPendingRuns()).toHaveLength(0);
    expect(await assemble(RUN)).toBeNull();
  });

  it("drops what nobody is coming back for, and keeps what they might", async () => {
    const old = { ...RUN, runId: "old", startedAt: Date.now() - 30 * 24 * 60 * 60 * 1000 };
    const recent = { ...RUN, runId: "recent", startedAt: Date.now() };
    await beginBackup(old);
    await beginBackup(recent);
    await putChunk(old.runId, 0, piece(1));
    await putChunk(recent.runId, 0, piece(1));

    // Fifteen megabytes a section is nothing once and not nothing for ever.
    expect(await purgeStale()).toBe(1);
    expect((await listPendingRuns()).map((r) => r.runId)).toEqual(["recent"]);
  });
});

describe("the run happening right now", () => {
  it("is marked active, so recovery cannot upload it from under her", async () => {
    await beginBackup(RUN);
    // The live run is "pending" too -- it is only finished at the end -- so
    // without this a reopened tab could upload a half-recording over itself.
    expect(isActive(RUN.runId)).toBe(true);
    await discard(RUN.runId);
    expect(isActive(RUN.runId)).toBe(false);
  });
});

describe("a run that is still being recorded", () => {
  it("is live in storage, not only in this tab's memory", async () => {
    // `isActive` is a Set in this module, which is to say per tab. Opening any
    // other section page in a second tab ran recovery there, found this run
    // pending, uploaded its first minutes over its own path and discarded its
    // backup. The 2026-09-03 audit did exactly that at minute 2:30 of a live
    // run. The record itself has to say it is live, so every tab can see it.
    await beginBackup(RUN);
    const [run] = await listPendingRuns();
    expect(isLive(run, Date.now())).toBe(true);
  });

  it("stays live for as long as pieces keep arriving, and no longer", async () => {
    const t0 = Date.now();
    await beginBackup({ ...RUN, startedAt: t0 });
    // Nothing for a long while: a crashed tab, which is what recovery is for.
    expect(isLive((await listPendingRuns())[0], t0 + LIVE_GRACE_MS + 1)).toBe(false);
    // A piece just landed: the tab is alive and the run is hers, whatever the
    // clock since it started says.
    await putChunk(RUN.runId, 0, piece(0));
    const run = (await listPendingRuns())[0];
    expect(isLive(run, Date.now() + LIVE_GRACE_MS - 1000)).toBe(true);
    expect(isLive(run, Date.now() + LIVE_GRACE_MS + 1000)).toBe(false);
  });

  it("treats a record from before the marker existed as not live", () => {
    // Written by an older build. There is no way to know, and a run that is
    // pending with no tab claiming it is the case recovery exists for.
    expect(isLive({ ...RUN }, Date.now())).toBe(false);
  });
});
