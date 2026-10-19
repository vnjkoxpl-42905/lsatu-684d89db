import {
  atomIdsOf, atomOf, capitalize, contrapositive, diagramText, literalShort, literalText, negateSide, ruleMistakes, rulesEquivalent, rulesSame, ruleSentence,
  settle, sideMistakes, sideStatus, sidesEquivalent, sideText, sidesOpposite, sidesSame,
  type Atom, type Connector, type Facts, type Literal, type Rule, type Settlement, type Side, type Status,
} from './andOrLogic';

export type SideName = 'sufficient' | 'necessary';

/** What the learner is asked to do. Every answer key below is derived, never typed in. */
export type AndOrTask =
  | { kind: 'status'; side: SideName; facts: Facts }
  | { kind: 'settles'; facts: Facts; target: Literal }
  | { kind: 'negate'; side: SideName }
  | { kind: 'contrapositive' }
  | { kind: 'build'; withContrapositive: boolean };

export interface AndOrItem {
  id: string;
  /** The rule in ordinary language, as the learner meets it. */
  statement: string;
  atoms: Atom[];
  rule: Rule;
  /** Further rules that also hold (for example a rule reaching only one member of an AND). */
  alsoHolds?: { statement: string; rule: Rule }[];
  task: AndOrTask;
  /** Joshua-voice reasoning shown after a correct answer or an explicit reveal. */
  why: string;
  /** Where the correct option sits among the choices (0-based). Fixed so resumed work never reshuffles. */
  answerAt?: number;
}

export interface ChoiceOption { text: string; correct: boolean; hint: string; rule?: Rule; side?: Side }
export interface ChoiceStep { prompt: string; options: ChoiceOption[] }

const factLine = (item: AndOrItem, facts: Facts) =>
  Object.entries(facts).map(([id, value]) => capitalize(value ? atomOf(item.atoms, id).yes : atomOf(item.atoms, id).no)).join('. ') + '.';
export const allRules = (item: AndOrItem): Rule[] => [item.rule, ...(item.alsoHolds ?? []).map(extra => extra.rule)];
export const itemAtomIds = (item: AndOrItem) => atomIdsOf(allRules(item));
export const sideOf = (rule: Rule, name: SideName): Side => rule[name];

// ---- Derived answers -----------------------------------------------------------------

export function statusAnswer(item: AndOrItem): Status {
  const task = item.task as Extract<AndOrTask, { kind: 'status' }>;
  return sideStatus(sideOf(item.rule, task.side), task.facts, itemAtomIds(item));
}
export function settleAnswer(item: AndOrItem): Settlement {
  const task = item.task as Extract<AndOrTask, { kind: 'settles' }>;
  return settle(allRules(item), task.facts, task.target, itemAtomIds(item));
}

// ---- Specific first hints: they respond to the choice made and never state the answer ----

const statusHints: Record<'and' | 'or' | 'single', Record<Status, Partial<Record<Status, string>>>> = {
  and: {
    met: { 'not-met': 'Look for a fact that denies one of the members. Does any fact do that?', open: 'Check each member against the facts. Is any member left unmentioned?' },
    'not-met': { met: 'AND needs every member at the same time. Check each member against the facts one by one.', open: 'Read the facts again. Does one of them deny a member of this group?' },
    open: { met: 'AND needs every member. Is each one actually established, or only some of them?', 'not-met': 'Does any fact deny a member? A member the facts never mention has not been denied.' },
  },
  or: {
    met: { 'not-met': 'OR needs only one member. Do the facts establish at least one?', open: 'OR needs just one established member. Is there one already?' },
    'not-met': { met: 'OR needs at least one member established. Do the facts establish any?', open: 'Check whether every member is denied. What happens to an OR when none of its members can be true?' },
    open: { met: 'Is any member actually established? A member the facts never mention is not established.', 'not-met': 'An OR is ruled out only when every member is denied. Are they all denied?' },
  },
  single: {
    met: { 'not-met': 'Check the fact against this condition again. Does it deny it?', open: 'Compare the facts with this condition. Do they establish it?' },
    'not-met': { met: 'Compare the facts with this condition. Do they establish it?', open: 'Does a fact deny this condition?' },
    open: { met: 'Do the facts actually establish this condition?', 'not-met': 'Does any fact deny this condition? Silence is not denial.' },
  },
};
export function statusHint(side: Side, correct: Status, chosen: Status): string {
  const kind = side.members.length > 1 ? side.op : 'single';
  return statusHints[kind][correct][chosen] ?? 'Check each member of the group against the facts.';
}

export function settleHint(item: AndOrItem, correct: Settlement, chosen: Settlement): string {
  const task = item.task as Extract<AndOrTask, { kind: 'settles' }>;
  const ids = itemAtomIds(item);
  if (correct === 'open' && chosen === 'must') {
    const reaching = allRules(item).find(rule => rule.necessary.members.some(member => member.atom === task.target.atom));
    if (reaching && sideStatus(reaching.sufficient, task.facts, ids) !== 'met') return 'A rule guarantees its requirement only when its whole sufficient side is established. Which part of that side do the facts still not supply?';
    if (reaching && reaching.necessary.members.length > 1 && reaching.necessary.op === 'or') return 'The rule guarantees at least one of the options, not a particular one. What else would have to be known to pick this one?';
    return 'Check what the facts actually establish. Does any rule reach this condition from them?';
  }
  if (correct === 'open') return 'Nothing here rules this condition out. Ask what would have to be false for it to be impossible.';
  if (chosen === 'open') return 'Test the facts against each rule: do they establish a whole sufficient side, or deny a whole requirement? Then see what that forces.';
  return 'Read the direction of each rule again. Which side do the facts reach, and what does that side guarantee?';
}

const negateHints: Record<string, string> = {
  'keeps-connector': 'Every member is denied here, but the connector stayed the same. Try a case where only one member is true: does your choice agree with the opposite of the group?',
  'flips-connector-only': 'The connector changed, but the members still say the same things. The opposite of a group has to deny its members.',
  'negates-one': 'Only some members were denied. The opposite of the whole group has to account for every member.',
};
const contrapositiveHints: Record<string, string> = {
  converse: 'That reverses the sides but leaves every condition as it was. The contrapositive also negates.',
  inverse: 'That negates the conditions but leaves the sides where they were. The contrapositive also reverses them.',
  'keeps-connector': 'The sides and the signs look right. Check the connectors: negating a whole group changes it.',
  'negates-one': 'One member was not negated the way the others were. Negate the whole side, member by member.',
};

// ---- Choice steps ----------------------------------------------------------------------

function place<T>(correct: T, wrong: T[], at = 0): T[] {
  const options = [...wrong];
  options.splice(Math.min(at, options.length), 0, correct);
  return options;
}

export function choiceStep(item: AndOrItem): ChoiceStep | null {
  const task = item.task;
  const atoms = item.atoms;
  if (task.kind === 'status') {
    const side = sideOf(item.rule, task.side);
    const correct = statusAnswer(item);
    const labels: Record<Status, string> = { met: 'Yes, the facts establish it.', 'not-met': 'No, the facts rule it out.', open: 'The facts do not settle it yet.' };
    return {
      prompt: `${factLine(item, task.facts)} Do these facts establish the whole group: ${sideText(atoms, side)}?`,
      options: (['met', 'not-met', 'open'] as Status[]).map(value => ({ text: labels[value], correct: value === correct, hint: value === correct ? '' : statusHint(side, correct, value) })),
    };
  }
  if (task.kind === 'settles') {
    const correct = settleAnswer(item);
    const labels: Record<Settlement, string> = { must: 'It must be true.', cannot: 'It cannot be true.', open: 'It could be either.' };
    const rules = [item.statement, ...(item.alsoHolds ?? []).map(extra => extra.statement)].join(' ');
    return {
      prompt: `${rules} ${factLine(item, task.facts)} What do the rules and facts settle about this: ${literalText(atoms, task.target)}?`,
      options: (['must', 'cannot', 'open'] as Settlement[]).map(value => ({ text: labels[value], correct: value === correct, hint: value === correct ? '' : settleHint(item, correct, value) })),
    };
  }
  if (task.kind === 'negate') {
    const side = sideOf(item.rule, task.side);
    const right = negateSide(side);
    const wrong = sideMistakes(side).filter(mistake => !sidesEquivalent(mistake.side, right));
    const options: ChoiceOption[] = place<ChoiceOption>(
      { text: sideText(atoms, right), side: right, correct: true, hint: '' },
      wrong.slice(0, 2).map(mistake => ({ text: sideText(atoms, mistake.side), side: mistake.side, correct: false, hint: negateHints[mistake.kind] })), item.answerAt ?? 0);
    return { prompt: `${item.statement} Which choice says the opposite of this group: ${sideText(atoms, side)}?`, options };
  }
  if (task.kind === 'contrapositive') {
    const right = contrapositive(item.rule);
    const wrong = ruleMistakes(item.rule).filter(mistake => !rulesEquivalent(mistake.rule, item.rule) && !rulesSame(mistake.rule, right) && !rulesEquivalent(mistake.rule, right));
    const options: ChoiceOption[] = place<ChoiceOption>(
      { text: ruleSentence(atoms, right), rule: right, correct: true, hint: '' },
      wrong.slice(0, 2).map(mistake => ({ text: ruleSentence(atoms, mistake.rule), rule: mistake.rule, correct: false, hint: contrapositiveHints[mistake.kind] })), item.answerAt ?? 0);
    return { prompt: `${item.statement} Which choice is the contrapositive?`, options };
  }
  return null;
}

// ---- Building a diagram -----------------------------------------------------------------

export interface BuilderState {
  place: Record<string, 'left' | 'right' | ''>;
  negated: Record<string, boolean>;
  leftOp: Connector;
  rightOp: Connector;
}
export const blankBuilder = (): BuilderState => ({ place: {}, negated: {}, leftOp: 'and', rightOp: 'and' });

/** The rule a builder describes, or null until every condition has been placed. */
export function builtRule(item: AndOrItem, state: BuilderState): Rule | null {
  const ids = itemAtomIds(item);
  if (ids.some(id => !state.place[id])) return null;
  const members = (where: 'left' | 'right'): Literal[] => ids.filter(id => state.place[id] === where).map(id => ({ atom: id, ...(state.negated[id] ? { negated: true } : {}) }));
  const left = members('left');
  const right = members('right');
  if (!left.length || !right.length) return null;
  return { sufficient: { op: state.leftOp, members: left }, necessary: { op: state.rightOp, members: right } };
}

export function expectedBuild(item: AndOrItem, stage: 'diagram' | 'contra'): Rule {
  return stage === 'diagram' ? item.rule : contrapositive(item.rule);
}

/** Points to where the build is off without giving the correct arrangement. */
export function diagnoseBuild(item: AndOrItem, built: Rule, stage: 'diagram' | 'contra'): string {
  const expected = expectedBuild(item, stage);
  const atoms = item.atoms;
  if (sidesSame(built.sufficient, expected.necessary) && sidesSame(built.necessary, expected.sufficient)) {
    return stage === 'diagram' ? 'The sides are swapped. Ask which group is enough on its own to guarantee the other.' : 'The sides are swapped. The contrapositive starts from the denied requirement of the original rule.';
  }
  const where = (rule: Rule, id: string) => rule.sufficient.members.some(member => member.atom === id) ? 'left' : 'right';
  const misplaced = itemAtomIds(item).filter(id => where(built, id) !== where(expected, id));
  if (misplaced.length) return `Check which side ${literalShort(atoms, { atom: misplaced[0] })} belongs on. Ask whether it is part of what is enough or part of what is required.`;
  const negatedIn = (rule: Rule, id: string) => !!(rule.sufficient.members.find(member => member.atom === id) ?? rule.necessary.members.find(member => member.atom === id))?.negated;
  const signs = itemAtomIds(item).filter(id => negatedIn(built, id) !== negatedIn(expected, id));
  if (signs.length) return `Check the NOT on ${signs.map(id => literalShort(atoms, { atom: id })).join(' and ')}. Compare it with the complete condition and with what the rule says.`;
  const badLeft = built.sufficient.members.length > 1 && built.sufficient.op !== expected.sufficient.op;
  const badRight = built.necessary.members.length > 1 && built.necessary.op !== expected.necessary.op;
  if (badLeft || badRight) return `Check the connector on the ${badLeft ? 'left' : 'right'} side. Does that side need every member, or at least one?${stage === 'contra' ? ' Remember what negating a whole group does to its connector.' : ''}`;
  return 'Compare each side with the rule once more.';
}

export function checkBuild(item: AndOrItem, state: BuilderState, stage: 'diagram' | 'contra'): { ready: boolean; correct: boolean; hint: string } {
  const built = builtRule(item, state);
  if (!built) return { ready: false, correct: false, hint: 'Place every condition on a side first.' };
  const correct = rulesSame(built, expectedBuild(item, stage));
  return { ready: true, correct, hint: correct ? '' : diagnoseBuild(item, built, stage) };
}

export const itemDiagramText = (item: AndOrItem, stage: 'diagram' | 'contra' = 'diagram') => diagramText(item.atoms, expectedBuild(item, stage));
export { sidesOpposite };
