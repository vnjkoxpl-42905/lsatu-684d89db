import { loadFirstAnswerLedger } from "./firstAnswerSources";
import type { GradedQuestionAnswer } from "./firstAnswerProgress";
import { questionBank } from "./questionLoader";

export async function loadLrRatingAnswers(actorId: string) {
  const ledger = await loadFirstAnswerLedger({ mode: "self", actorId, studentId: actorId });
  const missingLr = ledger.coverage.missingSources.some(({ source }) =>
    source === "lr_attempts" || source === "lr_section_history" || source === "practice_test_runs",
  );
  return missingLr ? null : ledger.answers.filter((answer) => answer.area === "LR");
}

export function lrRatingQuestion(answer: GradedQuestionAnswer) {
  const question = questionBank.getQuestion(answer.questionKey.slice(3));
  return question && { difficulty: question.difficulty, skill: question.qtype };
}

/** Optional rating data must not hold up a drill when the ledger is slow. */
export async function ratingAnswersWithinDeadline(history: Promise<GradedQuestionAnswer[] | null>) {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      history.catch(() => null),
      new Promise<null>((resolve) => { deadline = setTimeout(() => resolve(null), 800); }),
    ]);
  } finally {
    clearTimeout(deadline);
  }
}
