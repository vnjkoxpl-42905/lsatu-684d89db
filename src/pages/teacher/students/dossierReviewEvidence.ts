import type { GradedQuestionAnswer } from '@/lib/firstAnswerProgress';

export interface DossierReviewEvidence {
  key: string;
  label: string;
  area: 'LR' | 'RC';
  topic: string | null;
  source: string;
  firstAnsweredAt: string;
}

function labelFor(questionKey: string): string {
  if (questionKey.startsWith('LR:')) return questionKey.slice(3);
  const rc = /^RC:(\d+):(\d+)$/.exec(questionKey);
  if (rc) return `Passage ${rc[1]}, question ${rc[2]}`;
  return questionKey;
}

/** Match Progress: each distinct question is judged by its first saved, graded answer. */
export function selectDossierReviewEvidence(answers: GradedQuestionAnswer[]): DossierReviewEvidence[] {
  const firstByQuestion = new Map<string, GradedQuestionAnswer>();
  const ordered = [...answers]
    .filter((answer) => Number.isFinite(Date.parse(answer.gradedAt)))
    .sort((a, b) => Date.parse(a.gradedAt) - Date.parse(b.gradedAt)
      || Date.parse(a.answeredAt ?? a.gradedAt) - Date.parse(b.answeredAt ?? b.gradedAt)
      || a.attemptId.localeCompare(b.attemptId));

  for (const answer of ordered) {
    if (!firstByQuestion.has(answer.questionKey)) firstByQuestion.set(answer.questionKey, answer);
  }

  return [...firstByQuestion.values()]
    .filter((answer) => !answer.correct)
    .sort((a, b) => b.gradedAt.localeCompare(a.gradedAt))
    .map((answer) => ({
      key: answer.questionKey,
      label: labelFor(answer.questionKey),
      area: answer.area,
      topic: answer.topic ?? null,
      source: answer.mode === 'practice-test' ? 'Completed PrepTest' : answer.mode === 'timed-section' ? 'Timed section' : answer.area === 'RC' ? 'Completed RC drill' : 'LR practice',
      firstAnsweredAt: answer.gradedAt,
    }));
}
