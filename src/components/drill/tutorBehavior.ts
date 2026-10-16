// "preview" is the pre-submission structural breakdown (Conclusion / Evidence /
// Evaluate / Goal), answer-blind. The other three are the live coaching modes.
export type TutorMode = "preview" | "pre-answer" | "socratic" | "post-answer";

export function resolveTutorMode({
  userAnswer,
  answerRevealed,
}: {
  userAnswer: string | null | undefined;
  answerRevealed: boolean;
}): TutorMode {
  if (answerRevealed) return "post-answer";
  // Before an answer is committed, the Explanation button opens the structural
  // preview rather than streaming coaching.
  return userAnswer ? "socratic" : "preview";
}

export function resolveTutorLaunch({
  flagEnabled,
  tutorModeEnabled,
  correct,
  answerRevealed,
}: {
  /** The product switch (`AI_TUTOR_ENABLED`). Off means never, whatever the student's Tutor mode says. */
  flagEnabled: boolean;
  tutorModeEnabled: boolean;
  correct: boolean;
  answerRevealed: boolean;
}): { shouldOpen: boolean; mode: TutorMode } {
  return {
    shouldOpen: flagEnabled && tutorModeEnabled && !correct,
    mode: resolveTutorMode({ userAnswer: "submitted", answerRevealed }),
  };
}
