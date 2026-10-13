export type ConfidenceLevel = 'Guessing' | 'Unsure' | 'Pretty sure' | 'Confident';

export type ViewState = 'dashboard' | 'drill' | 'completion_report' | 'lesson' | 'flashcards' | 'methods_library' | 'mixed_practice' | 'timed_final_set' | 'timed_set' | 'module';

export type ModulePartName = 'note' | 'quiz' | 'drill';

export type MasteryLevel = 'none' | 'practicing' | 'solid' | 'mastered';

export interface ModuleProgressRow {
  moduleId: string;
  noteComplete: boolean;
  quizScore: number;
  quizTotal: number;
  quizStreakHigh: number;
  drillComplete: boolean;
  drillCorrect?: number;
  drillTotal?: number;
  aced: boolean;
  masteryLevel: MasteryLevel;
  completedAt?: string;
}

export type DrillType = 
  | 'keyword_extraction'
  | 'term_definition'
  | 'translation'
  | 'matching'
  | 'one_word_trap'
  | 'role'
  | 'method'
  | 'flaw'
  | 'mixed';

export interface CardReview {
  cardId: string;
  status: 'unseen' | 'seen' | 'reviewing' | 'mastered';
  lastReviewedAt?: string;
  reviewCount: number;
  // SRS bookkeeping. Optional so legacy localStorage records stay readable;
  // missing fields imply a brand-new card scheduled to be due immediately.
  rating?: 'again' | 'hard' | 'good' | 'easy';
  intervalDays?: number;
  dueAtIso?: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface MethodPattern {
  id: string;
  name: string;
  plainEnglish: string;
  answerChoiceLanguage: string;
  mustHappen: string;
  example: {
    stimulus: string;
    explanation: string;
  };
}

// DrillAttempt: per-attempt record retained client-side for the Drill view
// and CompletionReport. Mirrors the abstract_drill_attempts row written to
// Supabase, minus the server-side id/user_id columns.
export interface DrillAttempt {
  drillId: string;
  drillType: DrillType;
  selectedIndex: number;
  correct: boolean;
  confidence: ConfidenceLevel;
  trapTag?: string;
  // Response time in ms (from stimulus visible to Submit click). Optional
  // so legacy attempts without instrumentation can hydrate without backfill.
  timeMs?: number;
  completedAt: string;
}

// GauntletAttempt: client-side snapshot of an abstract_gauntlet_attempts row.
export interface GauntletAttempt {
  choiceId: number;
  keywordsPicked: string[];
  translationText: string;
  requirementsChecked: number[];
  correctCount: number;
  completedAt: string;
}

// TranslatorAttempt: client-side snapshot of an abstract_translator_attempts row.
// Used by the 14-stem question-stem translation drill.
export interface TranslatorAttempt {
  stemNumber: number;
  keywordsPicked: string[];
  translationText: string;
  completedAt: string;
}

export interface TranslatorVocabCallout {
  term: string;
  meaning: string;
  note?: string;
}

export interface TranslatorWalkthrough {
  reasoning: string[];
  vocab: TranslatorVocabCallout[];
  requirements: string[];
  example: { stimulus: string; explanation: string };
}

export interface TranslatorDrillItem {
  stemNumber: number;
  stemText: string;
  correctKeywords: string[];
  idealTranslation: string;
  walkthrough: TranslatorWalkthrough;
}

export interface BootcampState {
  completedLessons: string[];
  completedDrills: string[];
  drillAttempts: DrillAttempt[];
  gauntletAttempts: GauntletAttempt[];
  translatorAttempts: TranslatorAttempt[];
  cards: Record<string, CardReview>;
  moduleProgress: Record<string, ModuleProgressRow>;
  xpTotal: number;
  dailyStreak: number;
  dailyStreakLastActive?: string;
  aceBadges: string[];
  finalSetScore?: {
    score: number;
    total: number;
    completedAt: string;
  };
  drillsStats: {
    [key in DrillType]?: {
      correct: number;
      total: number;
    }
  };
}

export interface Lesson {
  id: string;
  title: string;
  content: string; // Markdown or plain text
  type: 'concept' | 'interactive';
  hasInteractiveContent?: boolean;
}

export interface KeywordExtractionItem {
  id: string;
  answerChoice: string;
  keywords: {
    text: string;
    type: 'noun' | 'verb' | 'qualifier' | 'relationship';
    definition: string;
  }[];
}

export interface MatchingItem {
  id: string;
  stimulus: string;
  answerChoice: string;
  parts: {
    text: string;
    matches: boolean;
    explanation: string;
    highlightText?: string;
  }[];
}

export interface TermDefinitionItem {
  id: string;
  term: string;
  options: string[];
  correctOption: number;
  definition: string;
  explanation: string;
}

export interface DrillOption {
  text: string;
  explanation: string;
}

export interface DrillItem {
  id: string;
  type: DrillType;
  stimulus?: string;
  question?: string;
  options: DrillOption[];
  correctOptionIndex: number;
  explanation: string;
  trapTag?: string;
}

export interface AbstractChoice {
  id: number;
  original: string;
  correctKeywords: string[];
  distractorKeywords: string[];
  plainEnglish: string;
  stimulusRequirements: string[];
  trapRequirements: string[];
  coachNote: string;
  example?: string;
  structureType?: string;
}

// BootcampMutationResult: standard LSATU {ok}|{ok:false,error} contract.
// Mirrors the AttemptResult shape used by hooks like useRecordChapterSection
// so callers can branch on .ok without learning a new pattern.
//
// Expressed as a single-shape interface (error optional) rather than a
// discriminated union because strictNullChecks is off in this project and
// the union-narrowing of !res.ok is unreliable under that config. Callers
// still write `if (!res.ok) { use res.error }` which works correctly at
// runtime; the type just admits res.error in both branches.
export interface BootcampMutationResult {
  ok: boolean;
  error?: unknown;
}

export interface QuestionStem {
  id: string;
  category: 'Role' | 'Method' | 'Flaw' | 'Other';
  stem: string;
  explanation: string;
}

export interface FinalSetChoice {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  text: string;
}

export interface FinalSetQuestion {
  id: string;
  ptRef: string;
  stimulus: string;
  questionStem: string;
  choices: FinalSetChoice[];
  correctLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
}
