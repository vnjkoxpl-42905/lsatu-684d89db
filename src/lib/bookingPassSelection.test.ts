import { describe, expect, it } from "vitest";
import { selectStudentBookingPass } from "../../supabase/functions/_shared/bookingPassSelection";

describe("selectStudentBookingPass", () => {
  it("keeps the teacher on the student's active original pass even with a newer exhausted pass", () => {
    const original = { id: "original", status: "active", created_at: "2026-09-01T00:00:00Z" };
    expect(selectStudentBookingPass([{ id: "newer", status: "exhausted", created_at: "2026-10-01T00:00:00Z" }, original])).toEqual(original);
  });
  it("picks the latest pass within the same state and handles no passes", () => {
    const newest = { status: "exhausted", created_at: "2026-10-01T00:00:00Z" };
    expect(selectStudentBookingPass([{ status: "exhausted", created_at: "2026-09-01T00:00:00Z" }, newest])).toEqual(newest);
    expect(selectStudentBookingPass([])).toBeNull();
  });
});
