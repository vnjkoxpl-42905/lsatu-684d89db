import generatedCurriculum from '../data/curriculum.generated.json';
import type { ConditionalArea, ConditionalDifficulty, ConditionalQuestion, ConditionalUnit } from './types';
export * from './types';

export const conditionalUnits = generatedCurriculum as ConditionalUnit[];
export function findConditionalUnit(id: string | undefined): ConditionalUnit | undefined {
  return conditionalUnits.find(unit => unit.id === id);
}
export interface ConditionalPracticeQuestion extends ConditionalQuestion {
  unitId: string;
  unitTitle: string;
  difficulty: ConditionalDifficulty;
}
export function getConditionalQuestions(filter: {
  difficulty: ConditionalDifficulty;
  unitId?: string;
  area?: ConditionalArea;
  phase?: ConditionalUnit['phase'];
}): ConditionalPracticeQuestion[] {
  return conditionalUnits.filter(unit =>
    (!filter.unitId || unit.id === filter.unitId) &&
    (!filter.area || unit.area === filter.area) &&
    (!filter.phase || unit.phase === filter.phase)
  ).flatMap(unit => unit.drills[filter.difficulty].map(question => ({
    ...question, unitId: unit.id, unitTitle: unit.title, difficulty: filter.difficulty,
  })));
}
export interface ConditionalResource { title: string; description: string; route: string }
export const conditionalResources: ConditionalResource[] = [
  { title: 'Conditional Indicators Refresher', description: 'Existing four-group reference, sorting, flashcards and diagrams. This opens the full Activity.', route: '/conditional-indicators-refresher' },
  { title: 'Conditional practice worlds', description: 'Existing General, Linking, Missing Link and Must Be True practice.', route: '/activities/conditionals' },
  { title: 'Conditional Logic: introductory guided practice', description: 'Existing mixed official-question set. Learn the relevant operations before transfer.', route: '/guided-drills/w5-02-conditional-logic-easier-set-4' },
  { title: 'Conditional Logic: Medium guided practice', description: 'Existing mixed official-question set; its catalog band is not a specific-skill mastery check.', route: '/guided-drills/w5-09-conditional-logic-medium-set-1' },
  { title: 'Conditional Logic: Advanced guided practice', description: 'Existing harder official-question set for later transfer and review.', route: '/guided-drills/w9-05-conditional-logic-harder-set-1' },
];
