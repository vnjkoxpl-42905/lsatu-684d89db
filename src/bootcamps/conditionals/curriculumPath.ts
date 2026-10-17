import type { ConditionalDifficulty, ConditionalUnit } from './content/types';

/** Activity demands at this teaching point, not a placement or mastery score. */
export const curriculumActivityDifficulties: Record<string, ConditionalDifficulty> = {
  orientation: 'beginner',
  'rules-facts': 'beginner',
  'sufficient-necessary': 'beginner',
  'truth-validity': 'beginner',
  negation: 'beginner',
  contraposition: 'beginner',
  'group-1': 'beginner',
  'group-2': 'beginner',
  'group-3': 'beginner',
  'group-4': 'beginner',
  'mixed-translation': 'medium',
  'implicit-conditionals': 'medium',
  'direct-linking': 'medium',
  'no-link': 'medium',
  triggering: 'medium',
  'and-or': 'medium',
  'de-morgan': 'medium',
  domain: 'medium',
  biconditionals: 'medium',
  'whole-rule-negation': 'medium',
  mbt: 'medium',
  'sufficient-assumption': 'advanced',
  'necessary-assumption': 'advanced',
  flaw: 'medium',
  parallel: 'advanced',
  principle: 'advanced',
  'quantifier-meaning': 'beginner',
  'quantifier-negation': 'medium',
  'quantifier-linking': 'advanced',
  'quantifier-invalid': 'advanced',
};

export function getCurriculumDifficulty(unit: ConditionalUnit | string): ConditionalDifficulty {
  return curriculumActivityDifficulties[typeof unit === 'string' ? unit : unit.id] ?? 'beginner';
}

/** Starting later changes the assigned path without claiming earlier work was completed. */
export function getCurriculumUnits(units: ConditionalUnit[], startingUnitId?: string): ConditionalUnit[] {
  const ordered = [...units.filter(unit => unit.phase === 'conditional'), ...units.filter(unit => unit.phase === 'quantifier')];
  const startIndex = startingUnitId ? ordered.findIndex(unit => unit.id === startingUnitId) : 0;
  return ordered.slice(Math.max(0, startIndex));
}
