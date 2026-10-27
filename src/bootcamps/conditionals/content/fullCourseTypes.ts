/** Authored meaning, independent of the learner-facing wording or choice order. */
export type Formula = { atom: string } | { not: Formula } | { and: Formula[] } | { or: Formula[] };
export type Atom = { id: string; label: string; subject: string; domain: string; restrictions?: string[] };
export type Rule = { if: Formula; then: Formula };
export type QuantityStatement = {
  quantifier: 'some' | 'all' | 'most' | 'none' | 'exactly' | 'not-all';
  subject: string;
  predicate: string;
  predicateNegated?: boolean;
  count?: number;
};
export type ChoiceSemantic =
  | { kind: 'equivalent'; target: Formula }
  | { kind: 'entailed'; premises: Formula[] }
  | { kind: 'finite-quantity'; population: number; predicates: string[]; premises: QuantityStatement[]; nonempty?: string[] }
  | { kind: 'quantity-proof'; premises: QuantityStatement[]; nonempty?: string[] };
export type ChoiceOption = { id: string; text: string; hint?: string; formula?: Formula; quantity?: QuantityStatement };
type ItemBase = { id: string; prompt: string; hint: string; explanation: string; sourceRefs?: string[] };
export type FullCourseChoiceItem = ItemBase & {
  kind: 'choice'; options: ChoiceOption[]; correctOptionId: string; semantic: ChoiceSemantic;
};
export type FullCourseBuildItem = ItemBase & {
  kind: 'build-rule'; atoms: Atom[]; target: Rule;
};
export type FullCourseBuildRulesItem = ItemBase & { kind: 'build-rules'; atoms: Atom[]; targets: Rule[] };
export type FullCourseBridgeItem = ItemBase & { kind: 'build-bridge'; atoms: Atom[]; premises: Formula[]; conclusion: Formula };
export type FullCourseCaseItem = ItemBase & {
  kind: 'case'; atoms: Atom[]; premises: Formula[]; target: Formula; task: 'counterexample' | 'consistent';
};
export type FullCourseChainItem = ItemBase & {
  kind: 'chain'; atoms: Atom[]; rules: { id: string; text: string; rule: Rule }[];
  start: Formula; target: Formula;
};
export type FullCourseArgumentItem = ItemBase & {
  kind: 'argument'; atoms: Atom[]; premises: Formula[]; conclusion: Formula;
  assumptions: { id: string; text: string; formula: Formula; hint?: string }[]; correctAssumptionId: string;
};
/** A concrete population is part of the problem, not an approximation of all populations. */
export type FullCourseQuantityCaseItem = ItemBase & {
  kind: 'quantity-case'; population: number; predicates: { id: string; label: string }[];
  premises: QuantityStatement[]; conclusion: QuantityStatement; nonempty?: string[];
};
export type FullCourseItem = FullCourseChoiceItem | FullCourseBuildItem | FullCourseBuildRulesItem | FullCourseBridgeItem | FullCourseCaseItem | FullCourseChainItem | FullCourseArgumentItem | FullCourseQuantityCaseItem;
export type FullCourseLesson = {
  id: string; title: string; unitId: string; part: number; lessonNumber: string;
  definition: string[];
  mainExample: { sentence: string; explanation: string; diagram: string };
  purpose: string;
  steps: { title: string; body: string }[];
  demos: { sentence: string; steps: { label: string; explanation: string; diagram: string }[]; readback: string }[];
  mistakes: { label: string; diagram: string; explanation: string; correct: boolean }[];
  habit: string;
  quiz: FullCourseChoiceItem[];
  mediaScript: string[];
  sourceRefs: string[];
};
export type FullCourseDrillSet = {
  id: string; title: string; unitId: string; part: number; afterLessonId: string;
  instructions: string[]; items: FullCourseItem[]; sourceRefs?: string[];
  requiredAllOfUnitIDs?: string[];
  requiredForEditionCompletion?: boolean;
};
export type FullCourseMedia = { src: string; poster: string; captions: string; transcript: string[] };
export type RuleDraft = { left: Formula | null; right: Formula | null };
export type ItemResponse =
  | { kind: 'choice'; optionId: string }
  | { kind: 'build-rule'; left: Formula | null; right: Formula | null }
  | { kind: 'build-rules'; rules: { left: Formula | null; right: Formula | null }[] }
  | { kind: 'build-bridge'; left: Formula | null; right: Formula | null }
  | { kind: 'case'; values: Record<string, boolean> }
  | { kind: 'chain'; ruleIds: string[] }
  | { kind: 'argument'; assumptionId: string }
  | { kind: 'quantity-case'; members: Record<string, boolean>[] };
