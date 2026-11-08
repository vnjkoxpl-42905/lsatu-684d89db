import { describe, expect, it } from "vitest";
import type { GradedQuestionAnswer } from "./firstAnswerProgress";
import { expectedPracticeAccuracy, questionRating, ratingDifficultyFit, replayPracticeRating } from "./practiceRating";

const attempt = (id: string, correct: boolean, day = 1): GradedQuestionAnswer => ({
  attemptId: id, questionKey: `LR:${id}`, correct, area: "LR",
  source: "lr_attempts", mode: "adaptive", gradedAt: `2026-11-${String(day).padStart(2, "0")}`,
});
const replay = (rows: GradedQuestionAnswer[], difficulty = 3) =>
  replayPracticeRating(rows, () => ({ difficulty, skill: "Weaken" }));

describe("practice rating", () => {
  it("moves in proportion to surprise for both correct and incorrect answers", () => {
    expect(replay([attempt("a", true)], 5).LR.rating).toBeGreaterThan(replay([attempt("a", true)], 1).LR.rating);
    expect(replay([attempt("a", false)], 1).LR.rating).toBeLessThan(replay([attempt("a", false)], 5).LR.rating);
    expect(expectedPracticeAccuracy(1500, 1500)).toBe(0.5);
    expect(questionRating(Number.NaN)).toBeNull();
  });

  it("replays chronologically and counts the first released result only once", () => {
    const first = attempt("a", false);
    const repeat = { ...first, attemptId: "later", correct: true, gradedAt: "2026-11-04" };
    const held = { ...attempt("held", true), correct: null, resultVisibility: "withheld" as const };
    const heldRepeat = { ...held, attemptId: "held-repeat", correct: true, resultVisibility: "released" as const, gradedAt: "2026-11-05" };
    expect(replay([repeat, heldRepeat, first, held, first])).toEqual(replay([first]));
  });

  it("checks forecasts against answers without using their results to predict them", () => {
    const training = Array.from({ length: 10 }, (_, i) => attempt(`practice-${i}`, true));
    const prior = replay(training);
    const next = attempt("next", false, 2);
    expect(replay([...training, next]).calibration).toEqual({
      count: 1,
      expectedCorrect: expectedPracticeAccuracy(prior.LR.rating, 1500),
      actualCorrect: 0,
    });
  });

  it("gates drill influence, keeps rating finite and responds to sustained improvement", () => {
    const initial = Array.from({ length: 120 }, (_, i) => attempt(`low-${i}`, false));
    const improved = Array.from({ length: 120 }, (_, i) => attempt(`high-${i}`, true, 2));
    expect(ratingDifficultyFit(replay(initial.slice(0, 9)), 2, "Weaken")).toBeNull();
    const low = replay(initial);
    const recovered = replay([...initial, ...improved]);
    expect(low.LR.rating).toBeGreaterThanOrEqual(700);
    expect(recovered.LR.rating).toBeGreaterThan(low.LR.rating);
    expect(recovered.LR.rating).toBeLessThanOrEqual(2300);
    expect(recovered.RC.count).toBe(0);
  });
});
