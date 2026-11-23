import { UNANSWERED, type SectionQuestionStat } from '@/lib/sectionHistorySave';
import type { SectionHistoryRow } from '@/lib/sectionHistory';
import type { SectionReviewRecord } from '@/lib/sectionReviewRecord';
import type { BlindReviewResult, DrillSession } from '@/types/drill';
import type { ReviewWalkSession } from '@/components/drill/SectionReviewWalk';

export interface SavedWalkData {
  session: ReviewWalkSession;
  brResults: BlindReviewResult[] | null;
  savedCorrectAnswers: Record<string, string>;
  savedStatsByQid: Record<string, SectionQuestionStat>;
}

/**
 * Adapts a saved section_history row (plus optional review record) into the
 * read-only walk shape. Grading uses the saved `correctAnswer` per question,
 * never the current question bank's answer key (plan 3.4).
 */
export function sectionHistoryToWalkSession(
  row: SectionHistoryRow,
  record?: SectionReviewRecord | null,
): SavedWalkData {
  const questionQueue: string[] = [];
  const attempts = new Map<string, { selectedAnswer?: string | null }>();
  const savedCorrectAnswers: Record<string, string> = {};
  const savedStatsByQid: Record<string, SectionQuestionStat> = {};

  const recordBr =
    record?.brCompletedAt && Array.isArray(record.brResults)
      ? record.brResults
      : row.brResults && row.brResults.length > 0
        ? row.brResults
        : null;

  const fallbackBr: BlindReviewResult[] = [];

  for (const stat of row.questions) {
    questionQueue.push(stat.qid);
    attempts.set(stat.qid, {
      selectedAnswer:
        stat.initialAnswer && stat.initialAnswer !== UNANSWERED
          ? stat.initialAnswer
          : null,
    });
    if (stat.correctAnswer) {
      savedCorrectAnswers[stat.qid] = stat.correctAnswer;
    }
    savedStatsByQid[stat.qid] = stat;

    if (!recordBr && stat.brAnswer && stat.brAnswer !== UNANSWERED) {
      fallbackBr.push({
        qid: stat.qid,
        preAnswer: stat.initialAnswer,
        preCorrect: stat.initialCorrect,
        brAnswer: stat.brAnswer,
        brRationale: '',
        brTimeMs: stat.brTimeMs ?? 0,
        brTouched: true,
        brChanged: Boolean(stat.brChanged),
        correct: stat.brAnswer === stat.correctAnswer,
      });
    }
  }

  const brResults =
    recordBr && recordBr.length > 0
      ? recordBr
      : fallbackBr.length > 0
        ? fallbackBr
        : null;

  return {
    session: { questionQueue, attempts },
    brResults,
    savedCorrectAnswers,
    savedStatsByQid,
  };
}

/**
 * Builds a minimal DrillSession so EnhancedBlindReview can run after the fact.
 * When `row` is omitted (sealed assigned section), `attempts` is left empty so
 * no first answers are exposed before blind review completes.
 */
export function buildDeferredBrSession(args: {
  pt: number;
  section: number;
  questionQids: string[];
  row?: SectionHistoryRow;
}): DrillSession {
  const attempts = new Map<string, any>();
  if (args.row) {
    for (const stat of args.row.questions) {
      if (stat.initialAnswer && stat.initialAnswer !== UNANSWERED) {
        attempts.set(stat.qid, {
          selectedAnswer: stat.initialAnswer,
          correct: stat.initialCorrect,
          timeMs: stat.timeMs,
          timestamp: Date.parse(args.row.completedAt) || Date.now(),
          switchCount: stat.switchCount,
          answerTrail: stat.answerTrail,
        });
      }
    }
  }
  return {
    mode: 'full-section',
    questionQueue: args.questionQids,
    currentIndex: 0,
    attempts,
    fullSectionConfig: {
      pt: args.pt,
      section: args.section,
      timer: { mode: 'unlimited', isPaused: true, elapsedMs: 0, startedAt: 0 },
    },
  } as unknown as DrillSession;
}
