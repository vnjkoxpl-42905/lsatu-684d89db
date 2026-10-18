import type { RcSessionItem } from './rcSession';
import type { RcAttempt } from './rcTypes';

/** Retry whole passages, with unanswered material only when explicitly requested. */
export function rcRetryPassageIds(items: RcSessionItem[], firstAttempts: ReadonlyMap<number, RcAttempt>, includeSkipped: boolean): number[] {
  return [...new Set(items.filter(item => {
    const attempt = firstAttempts.get(item.question.questionId);
    return !!attempt?.selected && attempt.isCorrect === false || includeSkipped && !attempt?.selected;
  }).map(item => item.passage.passageId))];
}

/** Historical duplicate first rows retain the earliest recorded answer in this sitting. */
export function firstRcAttempts(attempts: RcAttempt[]): Map<number, RcAttempt> {
  const result = new Map<number, RcAttempt>();
  for (const attempt of attempts) if (attempt.isFirstAttempt && !result.has(attempt.questionId)) result.set(attempt.questionId, attempt);
  return result;
}
