import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { discardRow, listStashedRows, stashRows, STALE_AFTER_MS } from "./recordingBackup";

/**
 * The way back for an answer that never reached us.
 *
 * ADR 0027 refuses a run whose response rows do not cover its section, so one
 * row lost to the network makes the whole sitting ungradable -- and the
 * recording, which very often uploaded perfectly, can then be marked by
 * nothing, ever. W2 stopped that being silent. This is the repair, and it is
 * the same shape as the one the recording already had.
 */

const upsert = vi.fn(() => Promise.resolve({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ upsert: (...a: unknown[]) => upsert(...(a as [])) }) },
}));

const askForGrading = vi.fn((_assignmentId: string) => Promise.resolve());
vi.mock("../api/activitiesClient", () => ({
  requestSectionGrading: (id: string) => askForGrading(id),
}));

// As a later visit sees it: a different tab, with an empty `active` Set.
vi.mock("./recordingBackup", async (importOriginal) => {
  const real = await importOriginal<typeof import("./recordingBackup")>();
  return { ...real, isActive: () => false };
});
const { recoverPendingRows } = await import("./recoverRecordings");

const row = (runId: string, itemOrder: number, over: Partial<{ assignmentId: string; studentId: string }> = {}) => ({
  runId,
  assignmentId: over.assignmentId ?? "a1",
  studentId: over.studentId ?? "s1",
  itemOrder,
  row: { assignment_id: over.assignmentId ?? "a1", student_id: over.studentId ?? "s1", item_order: itemOrder },
});

beforeEach(async () => {
  vi.restoreAllMocks();
  upsert.mockClear();
  askForGrading.mockClear();
  for (const r of await listStashedRows()) await discardRow(r.key);
});

describe("recovering the answers a run could not save", () => {
  it("re-sends every stashed row and then asks for the grade exactly once", async () => {
    await stashRows([row("run-a", 8), row("run-a", 13)]);

    expect(await recoverPendingRows("s1")).toBe(2);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(askForGrading).toHaveBeenCalledTimes(1);
    expect(askForGrading).toHaveBeenCalledWith("a1");
    // Stored is stored. A second pass has nothing to do.
    expect(await listStashedRows()).toEqual([]);
  });

  it("asks for nothing while a run is still short a row, and keeps that row", async () => {
    // The risk this order exists to avoid: ADR 0027 409s a partial run, which
    // is precisely the silent failure W2 was written to stop.
    await stashRows([row("run-b", 3), row("run-b", 9)]);
    upsert.mockImplementationOnce(() => Promise.resolve({ error: { message: "network" } }));

    expect(await recoverPendingRows("s1")).toBe(0);
    expect(askForGrading).not.toHaveBeenCalled();

    const left = await listStashedRows();
    expect(left).toHaveLength(1);
    expect(left[0].itemOrder).toBe(3);
  });

  it("finishes the job on the next visit, and only then asks", async () => {
    await stashRows([row("run-c", 4), row("run-c", 5)]);
    upsert.mockImplementationOnce(() => Promise.resolve({ error: { message: "network" } }));
    await recoverPendingRows("s1");
    expect(askForGrading).not.toHaveBeenCalled();

    expect(await recoverPendingRows("s1")).toBe(1);
    expect(askForGrading).toHaveBeenCalledTimes(1);
    expect(await listStashedRows()).toEqual([]);
  });

  it("leaves another student's rows exactly where they are", async () => {
    // One browser profile, two students. Hers is not his to send.
    await stashRows([row("run-d", 1, { studentId: "s2", assignmentId: "a9" })]);

    expect(await recoverPendingRows("s1")).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(await listStashedRows()).toHaveLength(1);
  });

  it("is a no-op on a second pass, so re-entering a screen costs nothing", async () => {
    await stashRows([row("run-e", 2)]);
    await recoverPendingRows("s1");
    upsert.mockClear();
    askForGrading.mockClear();

    expect(await recoverPendingRows("s1")).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(askForGrading).not.toHaveBeenCalled();
  });

  it("drops rows nobody is coming back for, rather than carrying them for ever", async () => {
    // The rows outlive their run record on purpose -- `discard` runs the moment
    // the recording uploads, which is the very case this exists for -- so they
    // are bounded by their own age instead.
    const longAgo = Date.now() - STALE_AFTER_MS - 1;
    await stashRows([row("run-f", 1)], longAgo);

    expect(await recoverPendingRows("s1")).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    expect(await listStashedRows()).toEqual([]);
  });

  it("survives a browser that will not give it IndexedDB at all", async () => {
    // Private windows and full disks. A stash that cannot be written leaves the
    // run as ungradable as it already was, and never breaks the screen.
    await expect(recoverPendingRows("s1")).resolves.toBe(0);
  });
});
