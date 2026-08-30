// Drill mode types and interfaces

export type DrillMode = 'adaptive' | 'full-section' | 'type-drill' | 'natural-drill' | 'practice-set';

export type { Highlight, HighlightColor } from '@/lib/highlightUtils';

export type TimerMode = '35' | '52.5' | '70' | 'custom' | 'unlimited';

export interface TimerConfig {
  mode: TimerMode;
  customMinutes?: number;
  isPaused: boolean;
  elapsedMs: number;
  startedAt: number;
}

export interface FullSectionConfig {
  pt: number;
  section: number;
  timer: TimerConfig;
}

export interface TypeDrillConfig {
  qtypes: string[];
  difficulties: number[];
  pts: number[];
  count: number; // number of questions to drill
  selectedQids?: string[]; // optional pre-selected question IDs
  unseen_only?: boolean; // if true, force unseen-only filtering regardless of user's global setting
  qfeatures?: string[];
  reasoningTypes?: string[];
  sections?: number[];
  searchQuery?: string;
  questionNumber?: number;
}

export interface DrillSession {
  mode: DrillMode;
  fullSectionConfig?: FullSectionConfig;
  typeDrillConfig?: TypeDrillConfig;
  questionQueue: string[]; // qids
  currentIndex: number;
  attempts: Map<string, {
    selectedAnswer: string;
    correct: boolean;
    timeMs: number;
    timestamp: number;
    confidence?: number; // 1-5
    reviewDone?: boolean;
    brMarked?: boolean; // Marked for Blind Review
    switchCount?: number; // Number of answer changes
    /**
     * Every choice the student put down on this question, in order, each
     * stamped with how far into the question it was made. A single answer is
     * a trail of one; changing A to B a minute in is two entries, and that is
     * what the results screen draws as a timeline. Times accumulate across
     * revisits, so a question returned to twice reads as one continuous run.
     */
    answerTrail?: Array<{ answer: string; atMs: number }>;
    /**
     * How many times the student opened this question, and how many of those
     * visits ended with the answer exactly as they found it.
     *
     * A second pass that changes nothing is the webinar's most concrete
     * finding — six questions revisited and left alone, because the student
     * went back with the same reading that produced the wrong answer the first
     * time. The answer trail records changes of mind; only this records a
     * change of mind that never came.
     */
    visitCount?: number;
    noChangeRevisits?: number;
    /**
     * Answer choices the student crossed off, in the order they crossed them.
     *
     * The runner has always tracked these and thrown them away at the end of
     * the question. Kept, they answer the webinar's primary flagging question:
     * "were you down to two?" Three eliminations and a choice between the last
     * two is exactly the state he says must always be flagged, and without
     * this the report can only offer the rule rather than point at the moment.
     */
    eliminations?: string[];
    revisitCount?: number; // Number of times returned to question
    answerRevealed?: boolean; // Tracks if "Show Answer" clicked
  }>;
  /**
   * Where the student had got to when the section clock ran out.
   *
   * A section can be carried on past its own buzzer — the clock turns around
   * and counts up, and the student finishes the questions. That is worth
   * doing and worth recording separately: the score under the real clock is
   * the one that predicts a test day, and the rest is what they can do with
   * unlimited time. Absent means the section never ran out.
   */
  regulationMark?: {
    /** Questions that already carried an answer at the buzzer. */
    answeredQids: string[];
  };
  /**
   * Every question the student actually opened.
   *
   * Without it an unanswered question is one fact; with it, it is two very
   * different ones. A question worked and left blank is a decision — the
   * webinar's "I skipped something I wasn't supposed to skip" — and a question
   * never reached is the clock. They call for opposite advice, and today both
   * land as "unanswered".
   */
  visitedQids?: string[];
  sessionId?: string; // For tracking BR sessions
}

// Unified Blind Review Result interface
export interface BlindReviewResult {
  qid: string;
  preAnswer: string;
  brAnswer: string;
  brRationale: string;
  brTimeMs: number;
  brChanged: boolean;
  /**
   * Whether the student put a fresh answer on this question during review.
   *
   * Blind review walks the WHOLE section, so most questions come back
   * untouched. An untouched question is not a wrong one: it keeps the answer
   * and the result it already had, which is what makes the review score
   * comparable to the timed score instead of a strictly worse number.
   */
  brTouched: boolean;
  correct: boolean;
  preCorrect: boolean;
  switchCount?: number;
  revisitCount?: number;
}

export interface DrillSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  avgTimeMs: number;
  byDifficulty: Record<number, { correct: number; total: number }>;
  byQType: Record<string, { correct: number; total: number }>;
}
