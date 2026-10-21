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
  { id: 'must-arrow', type: 'note', title: 'Must arrow', description: 'What the arrow says, where to start reading it, and what it is for.', unitId: 'orientation' },
  { id: 'missing-requirement', type: 'note', title: 'The contrapositive', description: 'See what follows when a necessary condition is false.', unitId: 'orientation' },
  { id: 'foundation-practice', type: 'drill', title: 'Spot the condition', description: 'Identify sufficient and necessary conditions, place them beside the arrow, recognize indicators, and decide what the facts prove.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'sufficient-words', type: 'note', title: 'Find the complete condition', description: 'Identify the full sufficient condition, including the words that limit who or what the rule covers.', unitId: 'group-1' },
  { id: 'sufficient-practice', type: 'drill', title: 'Read the rule', description: 'Find the indicator and complete condition, build the diagram, then rewrite the rule in your own words.', unitId: 'group-1' },
  { id: 'necessary-words', type: 'note', title: 'Necessary-condition words', description: 'Read only, only if, only when, only where, always, requires and must.', unitId: 'group-2' },
  { id: 'whole-meaning', type: 'note', title: 'Keep the whole meaning', description: 'Keep qualifications, permission and obligation intact before translating a rule.', unitId: 'group-2' },
  { id: 'source-intro-identify', type: 'drill', title: 'Drill 2: Find both conditions', description: 'Find the indicators and their groups, then write the complete sufficient and necessary conditions.', unitId: 'group-2' },
  { id: 'source-roles', type: 'drill', title: 'Drill 3: Place the conditions', description: 'Put each condition on its side of the arrow.', unitId: 'group-2' },
  { id: 'source-intro-diagrams', type: 'drill', title: 'Drill 4: Build the diagram', description: 'Return to the introductory sentences and build each diagram.', unitId: 'group-2' },
  { id: 'source-rephrase', type: 'drill', title: 'Drill 5: Write it as if/then', description: 'Rewrite each rule as if/then without changing its meaning, then compare your wording with the explanation.', unitId: 'group-2' },
  { id: 'mixed-practice', type: 'drill', title: 'Conditional translation practice', description: 'Who or what does the rule cover? What does it require? Answer without adding anything the rule does not say.', unitId: 'group-2' },
  { id: 'contrapositive', type: 'note', title: 'Contrapositive', description: 'What it is, how to write it, and what it is not.', unitId: 'orientation' },
  { id: 'source-intro-diagrams-contrapositive', type: 'drill', title: 'Revisit Drill 4: Add the contrapositive', description: 'Add the contrapositive to the rules you already know.', unitId: 'group-2' },
  { id: 'source-rephrase-contrapositive', type: 'drill', title: 'Revisit Drill 5: Negate the whole condition', description: 'Complete the contrapositive for each rewritten rule. Keep every qualification.', unitId: 'group-2' },
  { id: 'contrapositive-practice', type: 'drill', title: 'Check your contrapositive', description: 'Choose the correct transformation, including rules that already contain negative conditions.', unitId: 'orientation' },
  { id: 'source-full-translation', type: 'drill', title: 'Drill 6: Build both diagrams', description: 'Build the original and the contrapositive. Keep each complete condition intact.', unitId: 'group-2' },
  { id: 'source-independent', type: 'drill', title: 'Drill 7: Put it into practice', description: 'Run the full process on your own. Work in short sessions and return where you left off.', unitId: 'group-2' },
];

export function openingCourseStep(id?: string) {
  return OPENING_COURSE_PATH.find(step => step.id === id);
}

// Alternatives name legacy units that already teach this complete concept.
export function openingStepAccessUnits(step: OpeningCourseStep) {
  return [step.unitId, ...(step.alsoAvailableIn ?? [])];
}
