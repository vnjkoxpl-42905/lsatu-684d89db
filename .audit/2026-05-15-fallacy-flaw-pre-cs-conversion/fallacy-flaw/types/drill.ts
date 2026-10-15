export type Language = 'assumption' | 'objection' | 'match';

export type Choice = 'A' | 'B' | 'C' | 'D' | 'E';

export interface PopQuizQuestion {
  id: string;
  prompt: string;
  partLabel: string;
  type: Language;
  test: string;
}

export interface DrillItem {
  id: string;
  cite: string;
  stimulus?: string;
  question?: string;
  choices?: Record<Choice, string>;
  correctChoice?: Choice;
  flawSlug?: string;
  whatIfCounter?: string;
  trapAnalysis?: { choice: Choice; trap: string }[];
  invented?: boolean;
}

export interface DrillStage {
  stage: number;
  set: number;
  timed: boolean;
  timeMin?: number;
  items: DrillItem[];
}

export interface QuizState {
  drillId: string;
  currentIndex: number;
  answers: Record<string, string>;
  missedIds: string[];
}
