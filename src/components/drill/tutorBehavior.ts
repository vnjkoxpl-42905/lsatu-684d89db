export type TutorMode = "pre-answer" | "socratic" | "post-answer";

export function resolveTutorMode({
  userAnswer,
  answerRevealed,
}: {
  userAnswer: string | null | undefined;
  answerRevealed: boolean;
}): TutorMode {
  if (answerRevealed) return "post-answer";
  return userAnswer ? "socratic" : "pre-answer";
}

export function resolveTutorLaunch({
  tutorModeEnabled,
  correct,
  answerRevealed,
}: {
  tutorModeEnabled: boolean;
  correct: boolean;
  answerRevealed: boolean;
}): { shouldOpen: boolean; mode: TutorMode } {
  return {
    shouldOpen: tutorModeEnabled && !correct,
    mode: resolveTutorMode({ userAnswer: "submitted", answerRevealed }),
  };
}
