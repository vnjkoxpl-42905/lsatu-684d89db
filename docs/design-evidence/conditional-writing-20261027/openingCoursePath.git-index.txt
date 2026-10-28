export type OpeningCourseStep = {
  id: string;
  type: 'note' | 'drill';
  title: string;
  description: string;
  part?: number;
  lessonNumber?: `${number}.${number}`;
  alsoAvailableIn?: Array<'orientation' | 'sufficient-necessary' | 'group-1' | 'group-2' | 'and-or' | 'de-morgan'>;
  /** Access topic only. Chapter 2 steps use `and-or` and `de-morgan` to filter assignments; their progress lives under their own step IDs. */
  unitId: 'orientation' | 'sufficient-necessary' | 'group-1' | 'group-2' | 'and-or' | 'de-morgan';
};

// Reading destinations are not legacy completion IDs. Visiting one records no completion.
export const OPENING_COURSE_PATH: OpeningCourseStep[] = [
  { id: 'meaning', type: 'note', part: 1, lessonNumber: '1.1', title: 'What conditionals are', description: 'Separate a rule from a fact, and see what a conditional actually promises.', unitId: 'orientation' },
  { id: 'sufficient', type: 'note', part: 1, lessonNumber: '1.2', title: 'The Sufficient Condition', description: 'When one condition guarantees another.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation', 'group-1'] },
  { id: 'necessary', type: 'note', part: 1, lessonNumber: '1.3', title: 'The Necessary Condition', description: 'What the sufficient condition requires.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation', 'group-2'] },
  { id: 'must-arrow', type: 'note', part: 1, lessonNumber: '1.4', title: 'Must arrow', description: 'What the arrow says, where to start reading it, and what it is for.', unitId: 'orientation' },
  { id: 'contrapositive', type: 'note', part: 1, lessonNumber: '1.5', title: 'Contrapositive', description: 'What it is, how to write it, and what it is not.', unitId: 'orientation' },
  { id: 'foundation-practice', type: 'drill', part: 1, title: 'Spot the condition', description: 'Identify sufficient and necessary conditions, place them beside the arrow, recognize indicators, and decide what the facts prove.', unitId: 'sufficient-necessary', alsoAvailableIn: ['orientation'] },
  { id: 'sufficient-practice', type: 'drill', part: 1, title: 'Read the rule', description: 'Find the indicator and complete condition, build the diagram, then rewrite the rule in your own words.', unitId: 'group-1' },
  { id: 'source-intro-identify', type: 'drill', part: 1, title: 'Find the indicators', description: 'Find the indicator words and identify which condition they introduce.', unitId: 'group-2' },
  { id: 'source-intro-diagrams', type: 'drill', part: 1, title: 'Build the diagram', description: 'Return to the introductory sentences and build each diagram.', unitId: 'group-2' },
  { id: 'source-rephrase', type: 'drill', part: 1, title: 'Write it as if/then', description: 'Rewrite each rule as if/then without changing its meaning, then compare your wording with the explanation.', unitId: 'group-2' },
  { id: 'mixed-practice', type: 'drill', part: 1, title: 'Conditional translation practice', description: 'Who or what does the rule cover? What does it require? Answer without adding anything the rule does not say.', unitId: 'group-2' },
  { id: 'source-intro-diagrams-contrapositive', type: 'drill', part: 1, title: 'Add the contrapositive', description: 'Add the contrapositive to the rules you already know.', unitId: 'group-2' },
  { id: 'source-rephrase-contrapositive', type: 'drill', part: 1, title: 'Negate the whole condition', description: 'Complete the contrapositive for each rewritten rule. Keep every qualification.', unitId: 'group-2' },
  { id: 'contrapositive-practice', type: 'drill', part: 1, title: 'Check your contrapositive', description: 'Choose the correct transformation, including rules that already contain negative conditions.', unitId: 'orientation' },
  { id: 'source-full-translation', type: 'drill', part: 1, title: 'Build both diagrams', description: 'Build the original and the contrapositive. Keep each complete condition intact.', unitId: 'group-2' },
  { id: 'source-independent', type: 'drill', part: 1, title: 'Put it into practice', description: 'Run the full process on your own. Work in short sessions and return where you left off.', unitId: 'group-2' },
  // Chapter 2. New IDs only: legacy and-or / de-morgan read marks and question runs are separate records and stay untouched.
  { id: 'and-or-both-or-either', type: 'note', part: 2, lessonNumber: '2.1', title: 'Both, or at least one', description: 'What AND and OR ask for, and why the whole group counts.', unitId: 'and-or' },
  { id: 'and-or-either-side', type: 'note', part: 2, lessonNumber: '2.2', title: 'Where the group sits', description: 'A group on the left is enough. A group on the right is required.', unitId: 'and-or' },
  { id: 'and-or-negate-group', type: 'note', part: 2, lessonNumber: '2.3', title: 'Deny the whole group', description: 'Say when a group fails, then take the contrapositive of a rule that contains one.', unitId: 'de-morgan' },
  { id: 'and-or-meaning-practice', type: 'drill', part: 2, title: 'Check the whole group', description: 'Decide whether the facts establish a group joined by AND or by OR. Keep every member in view.', unitId: 'and-or' },
  { id: 'and-or-placement-practice', type: 'drill', part: 2, title: 'Read the rule with a group in it', description: 'Find which side the group is on, then decide what the rules and facts settle.', unitId: 'and-or' },
  { id: 'and-or-whole-group-practice', type: 'drill', part: 2, title: 'Say the opposite of the group', description: 'Choose the statement that denies a whole group, member by member.', unitId: 'de-morgan' },
  { id: 'and-or-transfer-practice', type: 'drill', part: 2, title: 'Diagram it and flip it', description: 'Build the diagram, take the contrapositive, and use it on fresh rules.', unitId: 'de-morgan' },
];

/**
 * Legacy topics that Chapter 2 now teaches in the numbered course. They stay outside the opening-edition
 * membership (CONDITIONAL_OPENING_UNIT_IDS): their lesson, guided and practice routes and saved runs are unchanged.
 */
export const CHAPTER_TWO_LEGACY_UNIT_IDS = ['and-or', 'de-morgan'] as const;

// Retained destinations preserve old links and saved progress without duplicating the course.
export const LEGACY_OPENING_COURSE_STEPS: OpeningCourseStep[] = [
  { id: 'source-roles', type: 'drill', part: 1, title: 'Place the conditions', description: 'Put each condition on its side of the arrow.', unitId: 'group-2' },
  { id: 'missing-requirement', type: 'note', title: 'The contrapositive', description: 'See what follows when a necessary condition is false.', unitId: 'orientation' },
  { id: 'sufficient-words', type: 'note', title: 'Find the complete condition', description: 'Identify the full sufficient condition, including the words that limit who or what the rule covers.', unitId: 'group-1' },
  { id: 'necessary-words', type: 'note', title: 'Necessary-condition words', description: 'Read only, only if, only when, only where, always, requires and must.', unitId: 'group-2' },
  { id: 'whole-meaning', type: 'note', title: 'Keep the whole meaning', description: 'Keep qualifications, permission and obligation intact before translating a rule.', unitId: 'group-2' },
];

export function openingCourseStep(id?: string) {
  return [...OPENING_COURSE_PATH, ...LEGACY_OPENING_COURSE_STEPS].find(step => step.id === id);
}

/** Display order belongs to the active course, never to saved IDs or assignment filtering. */
export function openingDrillNumber(id: string) {
  const index = OPENING_COURSE_PATH.filter(step => step.type === 'drill').findIndex(step => step.id === id);
  return index < 0 ? undefined : index + 1;
}

// Alternatives name legacy units that already teach this complete concept.
export function openingStepAccessUnits(step: OpeningCourseStep) {
  return [step.unitId, ...(step.alsoAvailableIn ?? [])];
}
