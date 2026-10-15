export type QuestionModuleId =
  | 'causal-flaws'
  | 'conditional-flaws'
  | 'sampling-comparison-scope'
  | 'famous-flaws-capstone';

export interface Choice {
  text: string;
}

export interface ChoiceBreakdown {
  explanation: string;
  analogy?: string;
}

export interface QuestionBreakdown {
  mainConclusion: string;
  subConclusion?: string;
  premises: string[];
  choiceBreakdowns: { [key: number]: ChoiceBreakdown };
}

export interface Deconstruction {
  prompt: string;
  cause: string;
  effect: string;
}

export interface Question {
  id: string;
  moduleId: QuestionModuleId;
  stem: string;
  stimulus?: string;
  question?: string;
  choices: Choice[];
  correctIndex: number;
  explanation: string;
  sourcePT?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  primaryConcept?: string;
  breakdown?: QuestionBreakdown;
  deconstruction?: Deconstruction;
  placeholder?: boolean;
  sourceId?: string;
}

export interface Attempt {
  questionId: string;
  answerIndex: number;
  correct: boolean;
  responseTimeMs: number;
  hintsUsed: number;
  tutorExplanation?: string;
}

export interface JournalEntry {
  question: Question;
  notes: string;
  tags: string[];
}

export interface DashboardStats {
  overallAccuracy: number;
  avgTimePerQuestion: number;
  currentStreak: number;
  moduleProgress: Record<QuestionModuleId, { accuracy: number; avgTime: number; questionsAttempted: number }>;
  recentPerformance: { name: string; accuracy: number }[];
  performanceByConcept: { concept: string; accuracy: number }[];
  errorAnalysis: { reason: string; percentage: number }[];
}

export interface Flashcard {
  term: string;
  definition: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  cards: Flashcard[];
}

export interface DrillProgress {
  moduleId: QuestionModuleId;
  questions: Question[];
  currentQuestionIndex: number;
  attempts: Attempt[];
  lastUpdated: number;
}
