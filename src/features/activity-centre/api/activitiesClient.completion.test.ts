import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeAssignment, completeSectionRun } from "./activitiesClient";

const db = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn(), or: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: db.from } }));
const confirmed = { id: "assign-1", status: "completed", completed_at: "2026-09-30T10:00:00Z" };
const score = { numerator: 1, judged: 1, total: 1, percent: 100 };

beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db);
  db.update.mockReturnValue(db);
  db.eq.mockReturnValue(db);
  db.or.mockReturnValue(db);
  db.select.mockReturnValue(db);
  db.maybeSingle.mockReset().mockResolvedValue({ data: confirmed, error: null });
});

describe("typed activity account completion acknowledgment", () => {
  const finish = () => completeAssignment("assign-1", score);
  it("requires the updated assignment's stored completion timestamp", async () => {
    await expect(finish()).resolves.toBeUndefined();
    expect(db.select).toHaveBeenCalledWith("id,status,completed_at");
    expect(db.eq).toHaveBeenCalledWith("id", "assign-1");
  });
  it.each([null, { ...confirmed, completed_at: null }, { ...confirmed, status: "in_progress" }, { ...confirmed, id: "another-assignment" }])("rejects an unconfirmed update (%j)", async data => {
    db.maybeSingle.mockResolvedValue({ data, error: null });
    await expect(finish()).rejects.toThrow(/did not confirm completion/);
  });
  it("preserves a denied-write error", async () => {
    const error = { code: "42501", message: "denied" };
    db.maybeSingle.mockResolvedValue({ data: null, error });
    await expect(finish()).rejects.toBe(error);
  });
});

describe("RRC section completion acknowledgment", () => {
  it("reads back a prior completed timestamp after a lost response without updating it again", async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: confirmed, error: null });
    await expect(completeSectionRun("assign-1")).resolves.toBeUndefined();
    expect(db.or).toHaveBeenCalledWith("status.in.(assigned,in_progress),and(status.eq.completed,completed_at.is.null)");
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.maybeSingle).toHaveBeenCalledTimes(2);
  });
  it("allows a verified new take to finish an old completed row with no completion timestamp", async () => {
    await expect(completeSectionRun("assign-1")).resolves.toBeUndefined();
    expect(db.or).toHaveBeenCalledWith("status.in.(assigned,in_progress),and(status.eq.completed,completed_at.is.null)");
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.maybeSingle).toHaveBeenCalledTimes(1);
  });
  it("requires the matching returned assignment and writes no scoring columns", async () => {
    await expect(completeSectionRun("assign-1")).resolves.toBeUndefined();
    expect(db.select).toHaveBeenCalledWith("id,status,completed_at");
    expect(db.update.mock.calls[0][0]).toEqual({ status: "completed", completed_at: expect.any(String) });
  });
  it.each([null, { ...confirmed, completed_at: null }, { ...confirmed, id: "other" }])("rejects unacknowledged closeout (%j)", async data => {
    db.maybeSingle.mockResolvedValue({ data, error: null });
    await expect(completeSectionRun("assign-1")).rejects.toThrow(/did not confirm completion/);
  });
});

it("also checks acknowledgment on the legacy scoring-column fallback", async () => {
  db.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "PGRST204" } }).mockResolvedValueOnce({ data: null, error: null });
  await expect(completeAssignment("assign-1", score)).rejects.toThrow(/did not confirm completion/);
  expect(db.update).toHaveBeenCalledTimes(2);
  expect(db.update.mock.calls[1][0]).not.toHaveProperty("score_numerator");
});

it("accepts a confirmed legacy scoring-column fallback", async () => {
  db.maybeSingle.mockResolvedValueOnce({ data: null, error: { code: "42703" } }).mockResolvedValueOnce({ data: confirmed, error: null });
  await expect(completeAssignment("assign-1", score)).resolves.toBeUndefined();
});
