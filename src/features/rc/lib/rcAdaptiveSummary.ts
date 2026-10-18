import type { RcHistorySnapshot } from '../api/rcProgress';
import { rollingAccuracy, targetDifficulty } from './rcAdaptive';

export interface RcAdaptiveSummaryData {
  hiddenResults: boolean;
  firstEver: { correct: number; total: number } | null;
  recent: { accuracy: number; total: number } | null;
  reviewCorrections: number | null;
  target: number | null;
}

/** Explains the existing selector; this does not change its thresholds or ordering. */
export function buildRcAdaptiveSummary(snapshot: RcHistorySnapshot): RcAdaptiveSummaryData {
  if (snapshot.hasHiddenGradedResults) return { hiddenResults: true, firstEver: null, recent: null, reviewCorrections: null, target: null };
  const entries = [...snapshot.history.values()];
  const first = entries.filter(entry => typeof entry.firstEverCorrect === 'boolean');
  const accuracy = rollingAccuracy(snapshot.history);
  const graded = entries.filter(entry => entry.attempts > 0 && entry.answered !== false
    && entry.unansweredOnFirstTake !== true && typeof entry.firstTakeCorrect === 'boolean'
    && !!(entry.lastGradedAt ?? entry.lastSeenAt));
  return { hiddenResults: false,
    firstEver: { correct: first.filter(entry => entry.firstEverCorrect).length, total: first.length },
    recent: accuracy === null ? null : { accuracy, total: Math.min(40, graded.length) },
    reviewCorrections: entries.filter(entry => entry.reviewCorrected).length,
    target: targetDifficulty(accuracy),
  };
}
