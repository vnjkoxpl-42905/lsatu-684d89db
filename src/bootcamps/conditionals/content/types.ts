export const DIFFICULTIES = ['beginner', 'medium', 'advanced'] as const;
export type ConditionalDifficulty = typeof DIFFICULTIES[number];
export type ConditionalArea = 'understanding' | 'translation' | 'linking' | 'inference' | 'complex' | 'application' | 'quantifiers';
export interface ConditionalQuestion {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  hint: string;
  reasoningSteps: string[];
}
export interface ConditionalWorkedExample {
  statements: string[];
  reasoning: string[];
  conclusion: string;
}
export interface ConditionalUnit {
  id: string;
  title: string;
  area: ConditionalArea;
  phase: 'conditional' | 'quantifier';
  prerequisites: string[];
  goal: string;
  teaching: string[];
  method: string[];
  workedExample: ConditionalWorkedExample;
  guidedExample: ConditionalQuestion;
  commonMistake: { mistake: string; repair: string };
  drills: Record<ConditionalDifficulty, ConditionalQuestion[]>;
}
