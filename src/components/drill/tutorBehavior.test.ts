import { describe, expect, it } from "vitest";
import {
  resolveTutorLaunch,
  resolveTutorMode,
} from "./tutorBehavior";

describe("tutorBehavior", () => {
  it("opens Socratic tutoring after a wrong Smart Drill submit even when auto-reveal is off", () => {
    expect(
      resolveTutorLaunch({
        flagEnabled: true,
        tutorModeEnabled: true,
        correct: false,
        answerRevealed: false,
      }),
    ).toEqual({ shouldOpen: true, mode: "socratic" });
  });

  it("opens post-answer tutoring after a wrong revealed Smart Drill submit", () => {
    expect(
      resolveTutorLaunch({
        flagEnabled: true,
        tutorModeEnabled: true,
        correct: false,
        answerRevealed: true,
      }),
    ).toEqual({ shouldOpen: true, mode: "post-answer" });
  });

  it("does not auto-open tutoring for correct answers or disabled Tutor mode", () => {
    expect(
      resolveTutorLaunch({
        flagEnabled: true,
        tutorModeEnabled: true,
        correct: true,
        answerRevealed: false,
      }).shouldOpen,
    ).toBe(false);

    expect(
      resolveTutorLaunch({
        flagEnabled: true,
        tutorModeEnabled: false,
        correct: false,
        answerRevealed: false,
      }).shouldOpen,
    ).toBe(false);
  });

  it('never launches the AI Tutor while the product flag is off', () => {
    expect(resolveTutorLaunch({ flagEnabled: false, tutorModeEnabled: true, correct: false, answerRevealed: true }).shouldOpen).toBe(false);
    expect(resolveTutorLaunch({ flagEnabled: false, tutorModeEnabled: false, correct: false, answerRevealed: false }).shouldOpen).toBe(false);
  });

  it("uses preview mode when Explanation opens before an answer is selected", () => {
    expect(resolveTutorMode({ userAnswer: "", answerRevealed: false })).toBe("preview");
  });

  it("uses socratic mode when an answer is selected but not revealed", () => {
    expect(resolveTutorMode({ userAnswer: "B", answerRevealed: false })).toBe("socratic");
  });
});
