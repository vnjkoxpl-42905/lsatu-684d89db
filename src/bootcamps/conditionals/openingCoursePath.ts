export type OpeningCourseStep = {
  id: string;
  type: 'note' | 'drill';
  title: string;
  description: string;
  alsoAvailableIn?: Array<'orientation' | 'sufficient-necessary' | 'group-1' | 'group-2'>;
  unitId: 'orientation' | 'sufficient-necessary' | 'group-1' | 'group-2';
};

// Reading destinations are not legacy completion IDs. Visiting one records no completion.
export const OPENING_COURSE_PATH: OpeningCourseStep[] = [
  { id: 'meaning', type: 'note', title: 'What conditionals are', description: 'Separate a rule from a fact, and see what a conditional actually promises.', unitId: 'orientation' },
  { id: 'sufficient', type: 'note', title: 'The sufficient condition', description: 'Understand why enough does not mean the only possible way.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'necessary', type: 'note', title: 'The necessary condition', description: 'Find what the rule requires, without turning that requirement into a guarantee.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'foundation-practice', type: 'drill', title: 'Enough, required, or still open?', description: 'Use fresh facts and build a case that exposes a reversed rule.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'must-arrow', type: 'note', title: 'Read the must arrow', description: 'Put sufficient on the left and necessary on the right, wherever they appear in the sentence.', unitId: 'orientation' },
  { id: 'sufficient-words', type: 'note', title: 'Sufficient-condition words', description: 'Read if, when, where, all, the only, every and any in complete sentences.', unitId: 'group-1' },
  { id: 'sufficient-practice', type: 'drill', title: 'Build the sufficient side', description: 'Find the whole condition, construct the diagram and repair its direction.', unitId: 'group-1' },
  { id: 'necessary-words', type: 'note', title: 'Necessary-condition words', description: 'Read only, only if, only when, only where, always, requires and must.', unitId: 'group-2' },
  { id: 'whole-meaning', type: 'note', title: 'Keep the whole meaning', description: 'Compare changed wording, keep every qualification and test what your arrow says.', unitId: 'group-2' },
  { id: 'mixed-practice', type: 'drill', title: 'Conditional translation practice', description: 'Who or what does the rule cover? What does it require? Practise answering those questions without adding to what the sentence says.', unitId: 'group-2' },
  { id: 'missing-requirement', type: 'note', title: 'When a requirement is missing', description: 'Distinguish the two facts that settle something from the two that leave it open.', unitId: 'orientation' },
  { id: 'contrapositive', type: 'note', title: 'Write and read the contrapositive', description: 'Reverse the sides, negate both complete conditions and check the meaning.', unitId: 'orientation' },
  { id: 'contrapositive-practice', type: 'drill', title: 'Put the whole process together', description: 'Build original diagrams and contrapositives, including sentences with negative conditions.', unitId: 'orientation' },
];

export function openingCourseStep(id?: string) {
  return OPENING_COURSE_PATH.find(step => step.id === id);
}

// Alternatives name legacy units that already teach this complete concept.
export function openingStepAccessUnits(step: OpeningCourseStep) {
  return [step.unitId, ...(step.alsoAvailableIn ?? [])];
}
