import { FULL_CONDITIONAL_EDITION } from '@/lib/conditionalCourseEdition';
import { fullCourseLessons, fullCourseDrillSets } from './content/fullCourseContent';

export type OpeningCourseStep = {
  id: string;
  type: 'note' | 'drill';
  title: string;
  description: string;
  part?: number;
  lessonNumber?: `${number}.${number}`;
  alsoAvailableIn?: string[];
  /** Access topic only. Chapter 2 steps use `and-or` and `de-morgan` to filter assignments; their progress lives under their own step IDs. */
  unitId: string;
  primaryUnitId?: string;
  accessAnyOfUnitIDs?: string[];
  requiredAllOfUnitIDs?: string[];
  editions?: Array<'legacy' | typeof FULL_CONDITIONAL_EDITION>;
  requiredForEditionCompletion?: boolean;
  allowedAction?: 'learn' | 'guided';
  contentRevision?: string;
  compatibleLegacyRevision?: string;
  sourceProvenance?: string[];
};

// Reading destinations are not legacy completion IDs. Visiting one records no completion.
const PRESERVED_COURSE_STEPS: OpeningCourseStep[] = [
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
  { id: 'and-or-both-or-either', type: 'note', part: 2, lessonNumber: '2.1', title: 'AND', description: 'What AND does to a rule, how to diagram it, and when the rule is broken.', unitId: 'and-or' },
  { id: 'and-or-either-condition', type: 'note', part: 2, lessonNumber: '2.2', title: 'OR', description: 'Why OR includes at least one, how to write it as if/then, and why both still counts.', unitId: 'and-or' },
  { id: 'and-or-either-side', type: 'note', part: 2, lessonNumber: '2.3', title: 'Where the group sits', description: 'A group on the left is enough. A group on the right is required.', unitId: 'and-or' },
  { id: 'and-or-negate-group', type: 'note', part: 2, lessonNumber: '2.4', title: 'Contrapositives with AND and OR', description: 'Reverse the sides, negate every condition, and switch AND and OR.', unitId: 'de-morgan' },
  { id: 'and-or-meaning-practice', type: 'drill', part: 2, title: 'Check AND and OR', description: 'Decide whether the given facts meet the conditions joined by AND or OR.', unitId: 'and-or' },
  { id: 'and-or-placement-practice', type: 'drill', part: 2, title: 'Read the rule with a group in it', description: 'Find which side the group is on, then decide what the rules and facts settle.', unitId: 'and-or' },
  { id: 'and-or-whole-group-practice', type: 'drill', part: 2, title: 'Practice negating AND and OR', description: 'Negate conditions joined by AND or OR without changing their meaning.', unitId: 'de-morgan' },
  { id: 'and-or-transfer-practice', type: 'drill', part: 2, title: 'Diagram it and flip it', description: 'Build the diagram, take the contrapositive, and use it on fresh rules.', unitId: 'de-morgan' },
];

/** Exact 16-step public baseline at 6a167c8555b4a404334310aad48a5d748b1b0861. Never derive from new chapters. */
export const LEGACY_COURSE_STEP_IDS = ['meaning', 'sufficient', 'necessary', 'must-arrow', 'contrapositive', 'foundation-practice', 'sufficient-practice', 'source-intro-identify', 'source-intro-diagrams', 'source-rephrase', 'mixed-practice', 'source-intro-diagrams-contrapositive', 'source-rephrase-contrapositive', 'contrapositive-practice', 'source-full-translation', 'source-independent'] as const;
const enrich = (step: OpeningCourseStep, legacy = false): OpeningCourseStep => ({
  ...step, primaryUnitId: step.unitId, accessAnyOfUnitIDs: [step.unitId, ...(step.alsoAvailableIn ?? [])], requiredAllOfUnitIDs: [],
  editions: legacy ? ['legacy', FULL_CONDITIONAL_EDITION] : [FULL_CONDITIONAL_EDITION],
  requiredForEditionCompletion: true, allowedAction: step.type === 'note' ? 'learn' : 'guided',
  contentRevision: legacy ? 'main-6a167c85' : 'and-or-20261019',
  ...(legacy ? { compatibleLegacyRevision: 'main-6a167c85' } : {}),
  sourceProvenance: [legacy ? 'public main 6a167c85 frozen Chapter 1' : 'preserved Claude Chapter 2 draft 2026-10-19'],
});
export const LEGACY_OPENING_COURSE_PATH: OpeningCourseStep[] = LEGACY_COURSE_STEP_IDS.map(id => enrich(PRESERVED_COURSE_STEPS.find(step => step.id === id)!, true));
/** Historical consumers retain the frozen public edition by default. */
export const OPENING_COURSE_PATH = LEGACY_OPENING_COURSE_PATH;
/**
 * 2026-10-25: the combined AND/OR lesson split into separate AND and OR lessons, and its contrapositive page moved
 * into the compound-contrapositive lesson. A completion of the combined lesson (which required reaching its last page)
 * stays on the AND lesson and also counts, read only, for the OR lesson. The new revision tells those older completions
 * apart from AND completions made after the split, which say nothing about OR.
 */
export const AND_OR_SPLIT_REVISION = 'and-or-split-20261025';
export const AND_OR_COMBINED_REVISION = 'and-or-20261019';
const SPLIT_LESSON_IDS = ['and-or-both-or-either', 'and-or-either-condition', 'and-or-negate-group'];
const chapterTwo = PRESERVED_COURSE_STEPS.filter(step => step.part === 2).map(step => enrich(step))
  .map(step => SPLIT_LESSON_IDS.includes(step.id) ? { ...step, contentRevision: AND_OR_SPLIT_REVISION } : step);
/** The OR lesson inherits a completion of the combined lesson. Read only: nothing is written on its behalf. */
export const SPLIT_LESSON_SOURCES: Record<string, { sourceId: string; sourceRevision: string }> = {
  'and-or-either-condition': { sourceId: 'and-or-both-or-either', sourceRevision: AND_OR_COMBINED_REVISION },
};
const chapterTwoOrder = ['and-or-both-or-either', 'and-or-either-condition', 'and-or-meaning-practice', 'and-or-either-side', 'and-or-placement-practice', 'and-or-negate-group', 'and-or-whole-group-practice', 'and-or-transfer-practice'];
/** One-line summary shown under each Chapter 3 to 7 lesson title, matching Chapters 1 and 2. */
const LESSON_SUMMARIES: Record<string, string> = {
  'exception-language': 'Learn one method for translating unless, until and without into if/then statements.',
  'exclusion-language': 'When two conditions cannot hold together, one requires the absence of the other.',
  'negative-translation': 'Handle several negatives in one sentence, one complete idea at a time.',
  'implicit-guarantees': 'Find the sufficient and necessary conditions when a rule never says if.',
  'two-way-rules': 'A rule that runs both ways: each condition is enough for the other and required by it.',
  'contextual-two-way': 'At least one, not both, and exactly one make three different claims.',
  'deny-whole-rule': 'To show a conditional is false, describe the one case it rules out.',
  'facts-with-rules': 'A rule says what would follow. A fact says what is true. Put them together.',
  'direct-chains': 'Link rules when the result of one is exactly what triggers the next.',
  'hidden-chain': 'Some rules connect only after you write one of them as its contrapositive.',
  'failed-connections': 'Two rules that mention the same idea do not always connect.',
  'same-domain': 'A rule covers only its stated subject and circumstances. Keep them when you link.',
  'missing-bridges': 'Find the one added rule that carries the premises to the conclusion.',
  'quantity-meaning': 'What some, most and all actually claim, and what each one allows.',
  'quantity-denial': 'Negate a quantity statement by finding exactly what makes it false.',
  'quantity-links': 'When quantity statements combine to guarantee a new conclusion.',
  'quantity-gaps': 'When two quantity statements share a category but guarantee no overlap.',
  'supported-inferences': 'Pick the answer the premises guarantee, or support most strongly.',
  'sufficient-bridges': 'Find the assumption that, added to the premises, proves the conclusion.',
  'necessary-assumptions': 'Find what the argument cannot work without.',
  'apply-principle': 'Match a case to every condition of a principle before applying it.',
  'match-structure': 'Find the argument with the same logical structure on a different topic.',
  'conditional-flaws': 'Spot an argument that concludes more than its rule allows.',
  'conditional-conclusions': 'Judge a conclusion that says one condition would be enough for another.',
  'nested-extension': 'Read a rule whose result is itself another rule.',
};
const later: OpeningCourseStep[] = fullCourseLessons.flatMap(lesson => [
  { id: lesson.id, type: 'note' as const, unitId: lesson.unitId, part: lesson.part, lessonNumber: lesson.lessonNumber as `${number}.${number}`, title: lesson.title, description: LESSON_SUMMARIES[lesson.id] ?? lesson.purpose, sourceProvenance: lesson.sourceRefs },
  ...fullCourseDrillSets.filter(set => set.afterLessonId === lesson.id).map(set => ({ id: set.id, type: 'drill' as const, unitId: set.unitId, part: set.part, title: set.title, description: set.instructions[0] ?? '', sourceProvenance: set.sourceRefs ?? [], requiredAllOfUnitIDs: set.requiredAllOfUnitIDs ?? [set.unitId] })),
]).map((step: OpeningCourseStep) => ({ ...enrich(step), contentRevision: 'full-20261025-r1', sourceProvenance: step.sourceProvenance, requiredAllOfUnitIDs: step.requiredAllOfUnitIDs ?? [],
  requiredForEditionCompletion: !step.id.includes('nested-extension'),
}));
export const COURSE_STEP_REGISTRY: OpeningCourseStep[] = [...LEGACY_OPENING_COURSE_PATH, ...chapterTwoOrder.map(id => chapterTwo.find(step => step.id === id)!), ...later];
export function courseStepsForEdition(edition?: string): OpeningCourseStep[] { return edition === FULL_CONDITIONAL_EDITION ? COURSE_STEP_REGISTRY : LEGACY_OPENING_COURSE_PATH; }
export function registryStepById(id?: string) { return COURSE_STEP_REGISTRY.find(step => step.id === id); }
export const LEGACY_UNIT_DISPOSITIONS: Record<string, { chapter: number; kind: 'primary' | 'supplementary' }> = Object.fromEntries([
  ...['orientation', 'sufficient-necessary', 'group-1', 'group-2'].map(id => [id, { chapter: 1, kind: 'primary' }]),
  ...['and-or', 'de-morgan'].map(id => [id, { chapter: 2, kind: 'primary' }]),
  ...['group-3', 'group-4', 'mixed-translation', 'implicit-conditionals'].map(id => [id, { chapter: 3, kind: 'primary' }]),
  ...['biconditionals', 'whole-rule-negation'].map(id => [id, { chapter: 4, kind: 'primary' }]),
  ...['direct-linking', 'no-link', 'triggering', 'domain'].map(id => [id, { chapter: 5, kind: 'primary' }]),
  ...['quantifier-meaning', 'quantifier-negation', 'quantifier-linking', 'quantifier-invalid'].map(id => [id, { chapter: 6, kind: 'primary' }]),
  ...['mbt', 'sufficient-assumption', 'necessary-assumption', 'flaw', 'parallel', 'principle'].map(id => [id, { chapter: 7, kind: 'primary' }]),
  ['rules-facts', { chapter: 5, kind: 'supplementary' }], ['truth-validity', { chapter: 1, kind: 'supplementary' }], ['negation', { chapter: 4, kind: 'supplementary' }], ['contraposition', { chapter: 1, kind: 'supplementary' }],
]);

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
  return [...COURSE_STEP_REGISTRY, ...LEGACY_OPENING_COURSE_STEPS].find(step => step.id === id);
}

/** Display order belongs to the active course, never to saved IDs or assignment filtering. */
export function openingDrillNumber(id: string) {
  const index = COURSE_STEP_REGISTRY.filter(step => step.type === 'drill' && (step.part ?? 1) <= 2).findIndex(step => step.id === id);
  return index < 0 ? undefined : index + 1;
}

// Alternatives name legacy units that already teach this complete concept.
export function openingStepAccessUnits(step: OpeningCourseStep) {
  return [step.unitId, ...(step.alsoAvailableIn ?? [])];
}
