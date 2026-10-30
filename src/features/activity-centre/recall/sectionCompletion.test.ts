import { beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeSectionCompletion, keepSectionCompletion, readSectionCompletion, requireSectionEvidence, requireSectionRecording } from "./sectionCompletion";

const close = vi.hoisted(() => vi.fn());
const list = vi.hoisted(() => vi.fn());
vi.mock("../api/activitiesClient", () => ({ completeSectionRun: close }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ list }) } } }));
const pending = { assignmentId: "a1", studentId: "s1", audioPath: "s1/a1/1.webm", attemptNo: 1, itemOrders: [1, 2] };
const rows = [1, 2].map(item_order => ({ assignment_id: "a1", student_id: "s1", attempt_no: 1, item_order, rrc: { audio_path: pending.audioPath } }));

beforeEach(() => { localStorage.clear(); close.mockReset().mockResolvedValue(undefined); list.mockReset().mockResolvedValue({ data: [{ id: "file-1", name: "1.webm" }], error: null }); });
describe("durable RRC closeout", () => {
  it("isolates saved closeout by owner and assignment", () => {
    keepSectionCompletion(pending);
    expect(readSectionCompletion("a1", "s1")).toEqual(pending);
    expect(readSectionCompletion("a1", "s2")).toBeNull();
    expect(readSectionCompletion("a2", "s1")).toBeNull();
    localStorage.setItem("rrc:completion:s1:a1", JSON.stringify({ ...pending, studentId: "s2" }));
    expect(() => readSectionCompletion("a1", "s1")).toThrow(/does not match/);
  });
  it("requires all rows from the same owned take and section", () => {
    expect(() => requireSectionEvidence(pending, rows, [1, 2])).not.toThrow();
    for (const patch of [{ student_id: "other" }, { assignment_id: "other" }, { attempt_no: 2 }, { rrc: { audio_path: "other" } }]) {
      expect(() => requireSectionEvidence(pending, [rows[0], { ...rows[1], ...patch }], [1, 2])).toThrow(/could not be verified/);
    }
    expect(() => requireSectionEvidence(pending, rows, [1, 3])).toThrow(/does not match/);
  });
  it("retains the marker after a lost response and clears it only after acknowledgment", async () => {
    keepSectionCompletion(pending);
    close.mockRejectedValueOnce(new Error("lost response"));
    await expect(acknowledgeSectionCompletion("a1", "s1")).rejects.toThrow("lost response");
    expect(readSectionCompletion("a1", "s1")).toEqual(pending);
    await acknowledgeSectionCompletion("a1", "s1");
    expect(readSectionCompletion("a1", "s1")).toBeNull();
    expect(close).toHaveBeenCalledTimes(2);
  });
  it("verifies the exact stored file and fails closed on absent or unreadable audio", async () => {
    await expect(requireSectionRecording(pending)).resolves.toBeUndefined();
    expect(list).toHaveBeenCalledWith("s1/a1", { search: "1.webm", limit: 100 });
    list.mockResolvedValueOnce({ data: [{ id: "other", name: "11.webm" }], error: null });
    await expect(requireSectionRecording(pending)).rejects.toThrow(/has not reached/);
    list.mockResolvedValueOnce({ data: null, error: new Error("offline") });
    await expect(requireSectionRecording(pending)).rejects.toThrow("offline");
  });
});
