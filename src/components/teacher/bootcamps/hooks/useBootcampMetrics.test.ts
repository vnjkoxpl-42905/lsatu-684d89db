import { expect, it, vi } from "vitest";
import { findTopic } from "../topicRegistry";
import { useDrillBreakdown } from "./useBootcampMetrics";

vi.mock("@tanstack/react-query", () => ({ useQuery: (options: unknown) => options }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ in: async () => ({
    data: [
      { user_id: "student", drill_type: "role", correct: true, trap_tag: null },
      { user_id: "student", drill_type: "role", correct: false, trap_tag: null },
      { user_id: "student", drill_type: "role", correct: true, trap_tag: "source_breakdown_reviewed" },
      { user_id: "student", drill_type: "role", correct: true, trap_tag: "source_exercise_ungraded" },
      { user_id: "student", drill_type: "role", correct: false, trap_tag: "self_check_unverified" },
    ], error: null,
  }) }) }) },
}));

it("counts only graded answers in teacher accuracy and attempt totals", async () => {
  const query = useDrillBreakdown(findTopic("abstract")) as unknown as { queryFn: () => Promise<unknown[]> };
  const rows = await query.queryFn();
  expect(rows[0]).toMatchObject({ attempts: 2, correct: 1, accuracyPct: 50 });
});
