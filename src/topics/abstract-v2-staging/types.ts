export type ConfidenceLevel = 'Guessing' | 'Unsure' | 'Pretty sure' | 'Confident';

export type ViewState = 'dashboard' | 'drill' | 'completion_report' | 'lesson' | 'flashcards' | 'methods_library' | 'mixed_practice' | 'timed_final_set' | 'extraction_workspace' | 'translator_workspace' | 'timed_set';

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

export interface BootcampState {
  completedLessons: string[];
  completedDrills: string[];
  cards: Record<string, CardReview>;
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

export interface QuestionStem {
  id: string;
  category: 'Role' | 'Method' | 'Flaw' | 'Other';
  stem: string;
  explanation: string;
}
