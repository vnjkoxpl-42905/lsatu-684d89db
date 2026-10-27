/**
 * Typed semantics for Chapter 2 (And/Or). Every graded compound item is authored as
 * structure: atoms with complete canonical condition labels, flat AND/OR groups of
 * literals, and negation flags. Readbacks, contrapositives, answer keys and logical
 * checks are all derived from that one structure. Learner-written short labels are
 * drafts only; free text is never evaluated as logic.
 */
export type Connector = 'and' | 'or';

/** One complete condition. `yes` states it, `no` states its denial; `short` is the pill text. */
export interface Atom { id: string; short: string; yes: string; no: string }
export interface Literal { atom: string; negated?: boolean }
/** A flat group. A single member has no connector to show. */
export interface Side { op: Connector; members: Literal[] }
export interface Rule { sufficient: Side; necessary: Side }
/** Conditions the facts establish (true) or deny (false). Missing atoms are unknown. */
export type Facts = Record<string, boolean>;
export type Assignment = Record<string, boolean>;

export const lit = (atom: string, negated = false): Literal => ({ atom, ...(negated ? { negated: true } : {}) });
export const group = (op: Connector, ...members: Literal[]): Side => ({ op, members });

export function atomIdsOf(rules: Rule[]): string[] {
  const ids: string[] = [];
  for (const rule of rules) for (const side of [rule.sufficient, rule.necessary]) for (const member of side.members) if (!ids.includes(member.atom)) ids.push(member.atom);
  return ids;
}

export function allAssignments(ids: string[]): Assignment[] {
  return Array.from({ length: 2 ** ids.length }, (_, row) => Object.fromEntries(ids.map((id, index) => [id, Boolean(row & (1 << (ids.length - 1 - index)))])));
}

export function literalValue(member: Literal, assignment: Assignment): boolean {
  return assignment[member.atom] !== !!member.negated;
}
export function sideValue(side: Side, assignment: Assignment): boolean {
  const values = side.members.map(member => literalValue(member, assignment));
  return side.op === 'and' ? values.every(Boolean) : values.some(Boolean);
}
/** An implication holds unless its sufficient side is met and its necessary side is not. */
export function ruleHolds(rule: Rule, assignment: Assignment): boolean {
  return !sideValue(rule.sufficient, assignment) || sideValue(rule.necessary, assignment);
}

export const negateLiteral = (member: Literal): Literal => lit(member.atom, !member.negated);
/** Not-(A and B) is (not A) or (not B); not-(A or B) is (not A) and (not B). A negation already present cancels. */
export function negateSide(side: Side): Side {
  return { op: side.members.length > 1 ? (side.op === 'and' ? 'or' : 'and') : side.op, members: side.members.map(negateLiteral) };
}
export function contrapositive(rule: Rule): Rule {
  return { sufficient: negateSide(rule.necessary), necessary: negateSide(rule.sufficient) };
}
export const converse = (rule: Rule): Rule => ({ sufficient: rule.necessary, necessary: rule.sufficient });
export const inverse = (rule: Rule): Rule => ({ sufficient: negateSide(rule.sufficient), necessary: negateSide(rule.necessary) });

export function rulesEquivalent(a: Rule, b: Rule, ids = atomIdsOf([a, b])): boolean {
  return allAssignments(ids).every(assignment => ruleHolds(a, assignment) === ruleHolds(b, assignment));
}
export function sidesOpposite(a: Side, b: Side, ids = atomIdsOf([{ sufficient: a, necessary: b }])): boolean {
  return allAssignments(ids).every(assignment => sideValue(a, assignment) !== sideValue(b, assignment));
}
export function sidesEquivalent(a: Side, b: Side, ids = atomIdsOf([{ sufficient: a, necessary: b }])): boolean {
  return allAssignments(ids).every(assignment => sideValue(a, assignment) === sideValue(b, assignment));
}

const sameMembers = (a: Literal[], b: Literal[]) => a.length === b.length && a.every(x => b.some(y => y.atom === x.atom && !!y.negated === !!x.negated));
/** Structural equality ignoring member order; a one-member side ignores its connector. */
export function sidesSame(a: Side, b: Side): boolean {
  return sameMembers(a.members, b.members) && (a.members.length < 2 || a.op === b.op);
}
export const rulesSame = (a: Rule, b: Rule) => sidesSame(a.sufficient, b.sufficient) && sidesSame(a.necessary, b.necessary);

// ---- Facts and entailment ---------------------------------------------------------

export type Status = 'met' | 'not-met' | 'open';
/** Whether the facts alone establish or deny a whole group. Unknown members stay open. */
export function sideStatus(side: Side, facts: Facts, ids: string[]): Status {
  const completions = allAssignments(ids).filter(assignment => Object.entries(facts).every(([id, value]) => assignment[id] === value));
  const values = completions.map(assignment => sideValue(side, assignment));
  return values.every(Boolean) ? 'met' : values.every(value => !value) ? 'not-met' : 'open';
}

export type Settlement = 'must' | 'cannot' | 'open';
/** What the rules and facts together settle about one literal. Throws if the facts break a rule. */
export function settle(rules: Rule[], facts: Facts, target: Literal, ids = atomIdsOf(rules)): Settlement {
  const worlds = allAssignments(ids).filter(assignment => Object.entries(facts).every(([id, value]) => assignment[id] === value) && rules.every(rule => ruleHolds(rule, assignment)));
  if (!worlds.length) throw new Error('The facts contradict the rules');
  const values = worlds.map(assignment => literalValue(target, assignment));
  return values.every(Boolean) ? 'must' : values.every(value => !value) ? 'cannot' : 'open';
}

// ---- Wording ---------------------------------------------------------------------

export function atomOf(atoms: Atom[], id: string): Atom {
  const atom = atoms.find(item => item.id === id);
  if (!atom) throw new Error(`Unknown condition ${id}`);
  return atom;
}
export const literalText = (atoms: Atom[], member: Literal) => member.negated ? atomOf(atoms, member.atom).no : atomOf(atoms, member.atom).yes;
export const literalShort = (atoms: Atom[], member: Literal) => atomOf(atoms, member.atom).short;

export function sideText(atoms: Atom[], side: Side): string {
  const parts = side.members.map(member => literalText(atoms, member));
  if (parts.length === 1) return parts[0];
  return parts.length === 2 ? `${parts[0]} ${side.op} ${parts[1]}` : `${parts.slice(0, -1).join(', ')} ${side.op} ${parts[parts.length - 1]}`;
}
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** The canonical readback shown beside every diagram. */
export const ruleSentence = (atoms: Atom[], rule: Rule) => `If ${sideText(atoms, rule.sufficient)}, then ${sideText(atoms, rule.necessary)}.`;
/** Plain-language diagram line, used as the accessible name of every drawn diagram. */
export function diagramText(atoms: Atom[], rule: Rule): string {
  const side = (value: Side) => value.members.map(member => (member.negated ? 'NOT ' : '') + literalShort(atoms, member)).join(` ${value.op.toUpperCase()} `);
  return `${side(rule.sufficient)} → ${side(rule.necessary)}`;
}

// ---- Wrong answers, derived from the same structure -------------------------------

export type RuleMistake = 'converse' | 'inverse' | 'keeps-connector' | 'negates-one';
/** Look-alike contrapositives a student might choose, each shown to differ from the original in logic. */
export function ruleMistakes(rule: Rule): { kind: RuleMistake; rule: Rule }[] {
  const keepsConnector: Rule = { sufficient: { op: rule.necessary.op, members: rule.necessary.members.map(negateLiteral) }, necessary: { op: rule.sufficient.op, members: rule.sufficient.members.map(negateLiteral) } };
  const negatesOne = (side: Side): Side => ({ op: side.op, members: side.members.map((member, index) => index === 0 ? negateLiteral(member) : member) });
  const oneMember: Rule = { sufficient: negatesOne(negateSide(rule.necessary)), necessary: negateSide(rule.sufficient) };
  return [
    { kind: 'keeps-connector' as const, rule: keepsConnector },
    { kind: 'converse' as const, rule: converse(rule) },
    { kind: 'inverse' as const, rule: inverse(rule) },
    { kind: 'negates-one' as const, rule: oneMember },
  ];
}

export type SideMistake = 'keeps-connector' | 'flips-connector-only' | 'negates-one';
export function sideMistakes(side: Side): { kind: SideMistake; side: Side }[] {
  return [
    { kind: 'keeps-connector' as const, side: { op: side.op, members: side.members.map(negateLiteral) } },
    { kind: 'flips-connector-only' as const, side: { op: side.op === 'and' ? 'or' : 'and', members: side.members } },
    { kind: 'negates-one' as const, side: { op: negateSide(side).op, members: side.members.map((member, index) => index === 0 ? negateLiteral(member) : member) } },
  ];
}
