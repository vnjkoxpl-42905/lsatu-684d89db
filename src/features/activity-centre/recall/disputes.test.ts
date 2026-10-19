import { beforeEach, describe, expect, it, vi } from "vitest";
import { raiseDispute } from "./disputes";

/*
 * The one rule this file exists to hold: a dispute that did not save must never
 * look like one that did.
 *
 * Every read path in this feature treats a missing table as an empty result,
 * which is right for a read and exactly wrong here. A student who taps "This is
 * not what I said" and is told it was noted, while the row went nowhere, has
 * been lied to on the one screen whose whole subject is the app getting
 * something wrong about her.
 */

const insert = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: (row: unknown) => insert(row) }) },
}));

const input = {
  assignmentId: "f8684334-a500-4dce-b593-00fd895c134e",
  attemptNo: 2,
  stimulusSlug: "PT134_S3_Q5",
  sourceSection: "PT134.S3",
  studentId: "5ff160ef-016e-4ab5-aab1-55c7a2ad888f",
  band: "lost-it",
  reason: 'quoted her as saying "clearly moral characters"',
};

beforeEach(() => {
  insert.mockReset();
});

describe("raising a dispute", () => {
  it("writes the stimulus, the sitting and what the card said at the time", async () => {
    insert.mockResolvedValue({ error: null });
    const result = await raiseDispute(input);

    expect(result).toEqual({ ok: true, alreadyRaised: false });
    const row = insert.mock.calls[0][0];
    expect(row.assignment_id).toBe(input.assignmentId);
    expect(row.attempt_no).toBe(2);
    expect(row.stimulus_slug).toBe("PT134_S3_Q5");
    expect(row.student_id).toBe(input.studentId);
    // Denormalised deliberately: a re-grade rewrites the grade row, and the
    // dispute has to stay legible after it.
    expect(row.source_section).toBe("PT134.S3");
    expect(row.disputed_band).toBe("lost-it");
    expect(row.disputed_reason).toContain("clearly moral characters");
  });

  it("treats a second tap as the same complaint, not a new one", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    expect(await raiseDispute(input)).toEqual({ ok: true, alreadyRaised: true });
  });

  it("does NOT report success when the table is not there", async () => {
    insert.mockResolvedValue({ error: { code: "42P01" } });
    const result = await raiseDispute(input);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: "not-configured" });
  });

  it("does NOT report success on any other failure", async () => {
    insert.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    const result = await raiseDispute(input);
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ reason: "failed" });
  });
});
