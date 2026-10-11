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
  { id: 'sufficient', type: 'note', title: 'The Sufficient Condition', description: 'When one condition guarantees another.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'necessary', type: 'note', title: 'The Necessary Condition', description: 'What the sufficient condition requires.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'must-arrow', type: 'note', title: 'Must arrow', description: 'Show what must be true.', unitId: 'orientation' },
  { id: 'missing-requirement', type: 'note', title: 'The contrapositive', description: 'See what follows when a necessary condition is false.', unitId: 'orientation' },
  { id: 'foundation-practice', type: 'drill', title: 'Drill 1', description: 'Identify sufficient and necessary conditions, place them beside the arrow, recognize indicators, and decide what the facts establish.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'sufficient-words', type: 'note', title: 'Find the complete condition', description: 'Identify the full sufficient condition, including the words that limit who or what the rule covers.', unitId: 'group-1' },
  { id: 'sufficient-practice', type: 'drill', title: 'Build the sufficient side', description: 'Find the whole condition, construct the diagram and repair its direction.', unitId: 'group-1' },
  { id: 'necessary-words', type: 'note', title: 'Necessary-condition words', description: 'Read only, only if, only when, only where, always, requires and must.', unitId: 'group-2' },
  { id: 'source-intro-identify', type: 'drill', title: 'Drill 2: Find both conditions', description: 'Find the indicator, then identify the complete sufficient and necessary conditions in 15 statements.', unitId: 'group-2' },
  { id: 'source-indicators', type: 'drill', title: 'Drill 3: Find the indicators', description: 'Select the words that identify each condition. Practise with 13 statements.', unitId: 'group-2' },
  { id: 'source-roles', type: 'drill', title: 'Drill 4: Place the conditions', description: 'Put the sufficient condition on the left and the necessary condition on the right in 10 statements.', unitId: 'group-2' },
  { id: 'source-intro-diagrams', type: 'drill', title: 'Drill 5: Build the arrow', description: 'Return to the 15 introductory statements and build their original diagrams.', unitId: 'group-2' },
  { id: 'whole-meaning', type: 'note', title: 'Keep the whole meaning', description: 'Compare changed wording, keep every qualification and test what your arrow says.', unitId: 'group-2' },
  { id: 'source-rephrase', type: 'drill', title: 'Drill 6: Write it as if/then', description: 'Rewrite 25 rules without changing their meaning, then compare your wording with the explanation.', unitId: 'group-2' },
  { id: 'mixed-practice', type: 'drill', title: 'Conditional translation practice', description: 'Who or what does the rule cover? What does it require? Practise answering those questions without adding to what the sentence says.', unitId: 'group-2' },
  { id: 'contrapositive', type: 'note', title: 'Write and read the contrapositive', description: 'Reverse the sides, negate both complete conditions and check the meaning.', unitId: 'orientation' },
  { id: 'source-intro-diagrams-contrapositive', type: 'drill', title: 'Revisit Drill 5: Add the contrapositive', description: 'Use the 15 familiar statements to build and read both forms of each rule.', unitId: 'group-2' },
  { id: 'source-rephrase-contrapositive', type: 'drill', title: 'Revisit Drill 6: Negate the whole condition', description: 'Complete the contrapositive work for the 25 rephrasing statements. Keep every qualification.', unitId: 'group-2' },
  { id: 'contrapositive-practice', type: 'drill', title: 'Put the whole process together', description: 'Build original diagrams and contrapositives, including sentences with negative conditions.', unitId: 'orientation' },
  { id: 'source-full-translation', type: 'drill', title: 'Drill 7: Build both diagrams', description: 'Build the original and contrapositive for 20 rules, keeping each complete condition intact.', unitId: 'group-2' },
  { id: 'source-independent', type: 'drill', title: 'Drill 8: Put it into practice', description: 'Apply the full process to 35 mixed statements. Work in short sessions and return where you left off.', unitId: 'group-2' },
];

export function openingCourseStep(id?: string) {
  return OPENING_COURSE_PATH.find(step => step.id === id);
}

// Alternatives name legacy units that already teach this complete concept.
export function openingStepAccessUnits(step: OpeningCourseStep) {
  return [step.unitId, ...(step.alsoAvailableIn ?? [])];
}
