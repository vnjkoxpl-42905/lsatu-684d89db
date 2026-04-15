export interface KeywordDef {
  word: string;
  definition: string;
}

export interface StemDrill {
  id: number;
  rawStem: string;
  keywords: KeywordDef[];
  coachTranslation: string;
  concreteExample: string;
}

export interface AnswerBreakdown {
  letter: string;
  text: string;
  explanation: string;
  isCorrect: boolean;
}

export interface StructuralMapEntry {
  label: string;
  text: string;
}

export interface RoleQuestion {
  id: string;
  stimulus: string;
  questionStem: string;
  options: { letter: string; text: string }[];
  correctAnswer: string;
  structuralMap: StructuralMapEntry[];
  answerBreakdowns: AnswerBreakdown[];
  causalTrapWarning?: string;
}
