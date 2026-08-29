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
    revisitCount?: number; // Number of times returned to question
    answerRevealed?: boolean; // Tracks if "Show Answer" clicked
  }>;
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
