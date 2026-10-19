import type { ConditionalDifficulty } from './content/types';

export const CONDITIONAL_OPENING_UNIT_IDS = ['orientation', 'sufficient-necessary', 'group-1', 'group-2'] as const;
export const CONDITIONAL_OPENING_EDITION = 'opening-2026-10-02-v2';
export const CONDITIONAL_REFERENCE_EDITION = 'opening-2026-10-03-reference-v1';
const lessonEditionPrefix = '__lessonEdition:';

// Edition timestamps live in the existing lessons map. Stamp them only when the
// student marks this edition as read; builds and navigation never change them.
export function conditionalOpeningEditionKey(unitId: string): string | undefined {
  return CONDITIONAL_OPENING_UNIT_IDS.some(id => id === unitId)
    ? `${lessonEditionPrefix}${unitId === 'orientation' ? CONDITIONAL_REFERENCE_EDITION : CONDITIONAL_OPENING_EDITION}:${unitId}` : undefined;
}
export function isConditionalLessonEditionKey(id: string): boolean {
  return id.startsWith(lessonEditionPrefix);
}
export function needsExpandedConditionalLessonReview(lessons: Record<string, string>, unitId: string): boolean {
  const editionKey = conditionalOpeningEditionKey(unitId);
  return !!editionKey && !!lessons[unitId] && !lessons[editionKey];
}

interface OpeningQuestionRevision {
  unitId: string;
  difficulty: ConditionalDifficulty;
  previousIds: string[];
  addedIds: string[];
  replacements: Record<string, string>;
}

// Only these authored changes migrate saved runs. Assignment filters are not revisions.
export const openingQuestionRevisions: OpeningQuestionRevision[] = [
  { unitId: 'group-1', difficulty: 'beginner', previousIds: ['group-1-b1', 'group-1-b2', 'group-1-b3'], addedIds: ['group-1-b4', 'group-1-b5', 'group-1-b6', 'group-1-b7'], replacements: {} },
  { unitId: 'group-1', difficulty: 'medium', previousIds: ['group-1-m1', 'group-1-m2', 'group-1-m3'], addedIds: ['group-1-m4', 'group-1-m5', 'group-1-m6', 'group-1-m7'], replacements: {} },
  { unitId: 'group-1', difficulty: 'advanced', previousIds: ['group-1-a1', 'group-1-a2', 'group-1-a3'], addedIds: ['group-1-a3-v2', 'group-1-a4', 'group-1-a5', 'group-1-a6', 'group-1-a7', 'group-1-a8', 'group-1-a9'], replacements: { 'group-1-a3': 'group-1-a3-v2' } },
  { unitId: 'group-2', difficulty: 'beginner', previousIds: ['group-2-b1', 'group-2-b2', 'group-2-b3'], addedIds: ['group-2-b4', 'group-2-b5', 'group-2-b6', 'group-2-b7'], replacements: {} },
  { unitId: 'group-2', difficulty: 'medium', previousIds: ['group-2-m1', 'group-2-m2', 'group-2-m3'], addedIds: ['group-2-m2-v2', 'group-2-m4', 'group-2-m5', 'group-2-m6', 'group-2-m7'], replacements: { 'group-2-m2': 'group-2-m2-v2' } },
  { unitId: 'group-2', difficulty: 'advanced', previousIds: ['group-2-a1', 'group-2-a2', 'group-2-a3'], addedIds: ['group-2-a1-v2', 'group-2-a3-v2', 'group-2-a4', 'group-2-a5', 'group-2-a6', 'group-2-a7'], replacements: { 'group-2-a1': 'group-2-a1-v2', 'group-2-a3': 'group-2-a3-v2' } },
];
