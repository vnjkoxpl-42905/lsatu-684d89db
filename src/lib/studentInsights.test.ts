import { describe, expect, it, vi } from "vitest";
import type { GradedQuestionAnswer } from "@/lib/firstAnswerProgress";
import { answersInScope, breakdownInsights, loadInsightTraps } from "./studentInsights";

vi.mock("@/lib/questionLoader", () => ({
  CANONICAL_QTYPES: { groups: [] },
  questionBank: { getQuestion: () => ({ pt: 101, section: 2, qnum: 4, qtype: "Weaken" }) },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ in: async () => ({
    data: [{ preptest: 101, section: 2, question_number: 4, lr_answer_choices: [
      { letter: "A", tag: "Out of scope" },
      { letter: "B", tag: "Reversed relationship" },
    ] }],
    error: null,
  }) }) }) },
}));

const answer = (id: string, questionKey: string, gradedAt: string): GradedQuestionAnswer => ({
  attemptId: id, questionKey, gradedAt, area: "LR", source: "lr_attempts", mode: "adaptive", correct: false,
});

describe("student Insights evidence", () => {
  it("keeps global first-answer order before date, source and release filters", () => {
    const old = answer("old", "LR:q1", "2026-10-01");
    const repeat = answer("repeat", "LR:q1", "2026-11-01");
    const withheld = { ...answer("held", "RC:3:4", "2026-10-01"), resultVisibility: "withheld" as const, correct: null };
    const releasedRepeat = answer("later", withheld.questionKey, "2026-11-01");
    const excluded = { ...answer("section", "LR:q2", "2026-11-01"), mode: "timed-section" };
    const current = answer("new", "LR:q3", "2026-11-01");
    expect(answersInScope([repeat, old, releasedRepeat, withheld, excluded, current], {
      preptest: true, section: false, drill: true,
    }, "2026-10-25", "2026-11-08").map((row) => row.attemptId)).toEqual(["new"]);
  });

  it("uses the selected distractor's tag and counts only recorded time", async () => {
    const a = { ...answer("a", "LR:q1", "2026-11-01"), correct: false, selectedAnswer: "B", timeMs: 60000 };
    const b = { ...a, attemptId: "b", selectedAnswer: "C", timeMs: 0 };
    const traps = await loadInsightTraps([a, b]);
    expect([...traps]).toEqual([["a", "Reversed relationship"]]);
    const result = breakdownInsights([a, b], "qtype", new Map(), traps);
    expect(result.rows[0]).toMatchObject({ label: "Weaken", timedCount: 1, averageTime: 60000, misses: [a, b] });
  });
});
