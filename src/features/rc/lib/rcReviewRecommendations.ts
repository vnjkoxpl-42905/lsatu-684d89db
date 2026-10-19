import type { RcAttempt } from './rcTypes';
import type { RcSessionItem } from './rcSession';
import type { RcLearningEvent } from './rcLearning';
export interface RcReviewPreferences { flagged: boolean; unanswered: boolean; lowConfidence: boolean; timeThresholdMs: number | null }
export interface RcReviewRecommendation { questionId: number; source: string; reasons: string[] }
/** Only the learner's own observations. Never read correctness or the answer key. */
export function rcReviewRecommendations(items: RcSessionItem[], attempts: ReadonlyMap<number, RcAttempt>, learning: RcLearningEvent[], preferences: RcReviewPreferences): RcReviewRecommendation[] {
  return items.flatMap(item => {
    const qid = item.question.questionId; const attempt = attempts.get(qid); const reasons: string[] = [];
    if (preferences.flagged && attempt?.flagged) reasons.push('Flagged');
    if (preferences.unanswered && !attempt?.selected) reasons.push('Unanswered');
    const confidence = learning.filter(event => event.kind === 'confidence' && event.passageId === item.passage.passageId && event.questionId === qid).at(-1)?.value;
    if (preferences.lowConfidence && confidence === 'low') reasons.push('Low confidence (your report)');
    if (preferences.timeThresholdMs !== null && preferences.timeThresholdMs > 0 && typeof attempt?.timeMs === 'number' && Number.isFinite(attempt.timeMs) && attempt.timeMs > preferences.timeThresholdMs) {
      reasons.push(`Recorded question time over ${preferences.timeThresholdMs / 1000} seconds`);
    }
    return reasons.length ? [{ questionId: qid, source: `PT ${item.passage.preptest} · S${item.passage.section} · P${item.passage.setNumber} · Q${item.question.position}`, reasons }] : [];
  });
}
