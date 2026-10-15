import { orderedDistinctAnswers, type GradedQuestionAnswer, type ProgressWindow } from './firstAnswerProgress';

export type HistoryAnswer = GradedQuestionAnswer & { isFirst: boolean };
export interface TopicAccuracy {
  topic: string;
  correct: number;
  denominator: number;
  percent: number | null;
  evidenceAttemptIds: string[];
}

export function inProgressWindow(date: string, window: ProgressWindow, asOf: string): boolean {
  const at = Date.parse(date);
  const end = Date.parse(asOf);
  const start = window === 'all' ? -Infinity : end - window * 86_400_000;
  return Number.isFinite(at) && at >= start && at <= end;
}

/** First identity is chosen across all time before the selected window. */
export function firstAnswerDetails(answers: GradedQuestionAnswer[], window: ProgressWindow, asOf: string) {
  const ordered = orderedDistinctAnswers(answers);
  const firstAnswers = new Set<GradedQuestionAnswer>();
  const seen = new Set<string>();
  for (const answer of ordered) {
    if (seen.has(answer.questionKey)) continue;
    seen.add(answer.questionKey);
    firstAnswers.add(answer);
  }

  const history: HistoryAnswer[] = ordered
    .filter((answer) => inProgressWindow(answer.gradedAt, window, asOf))
    .map((answer) => ({ ...answer, isFirst: firstAnswers.has(answer) }))
    .reverse();
  const byTopic = new Map<string, TopicAccuracy>();
  let untypedFirstAnswers = 0;
  for (const answer of history) {
    if (!answer.isFirst || answer.area !== 'LR') continue;
    if (!answer.topic) {
      untypedFirstAnswers++;
      continue;
    }
    const row = byTopic.get(answer.topic) ?? { topic: answer.topic, correct: 0, denominator: 0, percent: null, evidenceAttemptIds: [] };
    row.denominator++;
    row.evidenceAttemptIds.push(answer.attemptId);
    if (answer.correct) row.correct++;
    byTopic.set(answer.topic, row);
  }
  const topics = [...byTopic.values()]
    .map((row) => ({ ...row, percent: row.denominator < 3 ? null : Math.round(100 * row.correct / row.denominator) }))
    .sort((a, b) => b.denominator - a.denominator || a.topic.localeCompare(b.topic));
  return { history, topics, untypedFirstAnswers };
}
