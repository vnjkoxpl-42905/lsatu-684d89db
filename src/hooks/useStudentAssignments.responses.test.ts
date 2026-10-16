import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const select = vi.fn(() => ({ maybeSingle }));
  const neq = vi.fn(() => ({ select }));
  const eq = vi.fn(() => ({ neq }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { maybeSingle, select, neq, eq, update, from };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

import {
  saveTAAssignmentResponses,
  submitTAAssignmentResponses,
} from "./useStudentAssignments";

describe("structured assignment response writes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not report a successful save when no assignment row was updated", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await saveTAAssignmentResponses("assignment-1", {
      p1: "CI",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("not saved");
  });

  it("verifies the persisted response while ignoring JSON key order", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "assignment-1",
        response_data: { p2: "V", p1: "CI" },
        response_saved_at: "2026-07-31T12:00:00.000Z",
      },
      error: null,
    });

    const result = await saveTAAssignmentResponses("assignment-1", {
      p1: "CI",
      p2: "V",
    });

    expect(result.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        response_data: { p1: "CI", p2: "V" },
      }),
    );
  });

  it("keeps submission open when the returned response cannot be verified", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "assignment-1",
        status: "completed",
        response_data: { p1: "different" },
      },
      error: null,
    });

    const result = await submitTAAssignmentResponses("assignment-1", {
      p1: "CI",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("not submitted");
  });
});
