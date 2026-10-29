import { DIAGRAM_ITEMS, FLASHCARDS, type DiagramItem, type FlashAnswerRow, type GroupId } from './content';
import { atom, and, or, not, implies, equivalent } from '@/bootcamps/conditionals/content/fullCourseLogic';
import type { Formula } from '@/bootcamps/conditionals/content/fullCourseTypes';

export const PRACTICE_REVISION = 'conditional-practice-20261027-v4';
const statements: string[][] = [
  ['Mia trains', 'Mia qualifies'], ['the person is a dancer', 'the person stretches'],
  ['the student is admitted', 'the student is a senior'], ['Ada studies', 'Ada rests', 'Ada passes'],
  ['the person votes', 'the person is a member'], ['the bridge opens', 'the bridge has been inspected'],
  ['there is funding', 'there is approval'], ['the person is a hiker', 'the person brings a map'],
  ['the person is a finalist', 'the person writes', 'the person presents'],
  ['the rain stops', 'the game is cancelled'], ['the plant gets water', 'the plant dies'],
  ['the terms have changed by then', 'Nina has signed by then'],
  ['the creature is a reptile', 'the creature is warm-blooded'], ['it is a weekend', 'Sam works'],
  ['the pool is open', 'the gym is open'], ['the item is a refund', 'the refund is automatic'],
];
const negatives: string[][] = [
  ['Mia does not train', 'Mia does not qualify'], ['the person is not a dancer', 'the person does not stretch'],
  ['the student is not admitted', 'the student is not a senior'], ['Ada does not study', 'Ada does not rest', 'Ada does not pass'],
  ['the person does not vote', 'the person is not a member'], ['the bridge does not open', 'the bridge has not been inspected'],
  ['there is no funding', 'there is no approval'], ['the person is not a hiker', 'the person does not bring a map'],
  ['the person is not a finalist', 'the person does not write', 'the person does not present'],
  ['the rain does not stop', 'the game is not cancelled'], ['the plant does not get water', 'the plant does not die'],
  ['the terms have not changed yet', 'Nina has not signed yet'],
  ['the creature is not a reptile', 'the creature is not warm-blooded'], ['it is not a weekend', 'Sam does not work'],
  ['the pool is not open', 'the gym is not open'], ['the item is not a refund', 'the refund is not automatic'],
];
export const PRACTICE_DIAGRAMS: DiagramItem[] = [
  ...DIAGRAM_ITEMS.map((item, index) => ({
    ...item, group: item.id === 'd9' ? 'g1' as GroupId : item.group,
    meanings: Object.fromEntries(item.names.map((name, n) => [name, { yes: statements[index][n], no: negatives[index][n] }])),
  })),
  { id: 'transfer-g1', group: 'g1', prompt: 'Every violinist reads music.', names: ['violinist', 'reads'], left: 'violinist', right: 'reads', meanings: { violinist: { yes: 'the person is a violinist', no: 'the person is not a violinist' }, reads: { yes: 'the person reads music', no: 'the person does not read music' } } },
  { id: 'transfer-g2', group: 'g2', prompt: 'Only residents use the garden.', names: ['resident', 'uses'], left: 'uses', right: 'resident', meanings: { resident: { yes: 'the person is a resident', no: 'the person is not a resident' }, uses: { yes: 'the person uses the garden', no: 'the person does not use the garden' } } },
  { id: 'transfer-without', group: 'g3', prompt: 'Without sunlight, the seedlings wilt.', names: ['sunlight', 'wilt'], left: '/sunlight', right: 'wilt', meanings: { sunlight: { yes: 'the seedlings receive sunlight', no: 'the seedlings do not receive sunlight' }, wilt: { yes: 'the seedlings wilt', no: 'the seedlings do not wilt' } } },
  { id: 'transfer-until', group: 'g3', prompt: 'Jo will not publish until the editor approves.', names: ['approves', 'publishes'], left: '/approves', right: '/publishes', meanings: { approves: { yes: 'the editor has approved by then', no: 'the editor has not approved yet' }, publishes: { yes: 'Jo has published by then', no: 'Jo has not published yet' } } },
  { id: 'transfer-g4', group: 'g4', prompt: 'No square is a circle.', names: ['square', 'circle'], left: 'square', right: '/circle', meanings: { square: { yes: 'the shape is a square', no: 'the shape is not a square' }, circle: { yes: 'the shape is a circle', no: 'the shape is not a circle' } } },
];
const cardGroups: GroupId[][] = [['g1'], ['g2'], ['g3'], ['g4'], ['g2'], ['g3'], ['g4'], ['g1'], ['g1', 'g2'], ['g1', 'g3'], ['g3'], ['g2']];
const contrastRows: Record<string, FlashAnswerRow[]> = {
  f9: [
    { label: 'All runners hydrate', left: 'runner', right: 'hydrate', english: 'If someone is a runner, then that person hydrates.', contraEnglish: 'If someone does not hydrate, then that person is not a runner.' },
    { label: 'Only runners hydrate', left: 'hydrate', right: 'runner', english: 'If someone hydrates, then that person is a runner.', contraEnglish: 'If someone is not a runner, then that person does not hydrate.' },
  ],
  f10: [
    { label: 'Unless you pay, you leave', left: '/pay', right: 'leave', english: 'If you do not pay, then you leave.', contraEnglish: 'If you do not leave, then you pay.' },
    { label: 'If you pay, you leave', left: 'pay', right: 'leave', english: 'If you pay, then you leave.', contraEnglish: 'If you do not leave, then you do not pay.' },
  ],
};
export const PRACTICE_CARDS = FLASHCARDS.map((card, index) => {
  const [left, right] = card.conditional.split(' → ');
  return { ...card, groups: cardGroups[index], rows: contrastRows[card.id] ?? [{ label: 'Translation', left, right, english: card.englishConditional, contraEnglish: card.englishContrapositive }] };
});

/** Parse the small authored palette language, then use the course truth-table checker. */
export function sideFormula(text: string, names: string[]): Formula | null {
  const pieces = text.split(/ (\+|or) /);
  const literal = (value: string): Formula | null => {
    const negative = value.startsWith('/');
    const name = negative ? value.slice(1) : value;
    return names.includes(name) ? negative ? not(atom(name)) : atom(name) : null;
  };
  if (pieces.length === 1) return literal(text);
  const values = pieces.filter((_, index) => index % 2 === 0).map(literal);
  const joins = pieces.filter((_, index) => index % 2 === 1);
  if (values.some(value => !value) || new Set(joins).size !== 1) return null;
  return joins[0] === '+' ? and(...values as Formula[]) : or(...values as Formula[]);
}
export function diagramMatches(item: DiagramItem, left: string, right: string, acceptContrapositive: boolean) {
  const l = sideFormula(left, item.names), r = sideFormula(right, item.names);
  const targetLeft = sideFormula(item.left, item.names)!, targetRight = sideFormula(item.right, item.names)!;
  if (!l || !r) return false;
  return acceptContrapositive
    ? equivalent(implies(l, r), implies(targetLeft, targetRight)).correct
    : equivalent(l, targetLeft).correct && equivalent(r, targetRight).correct;
}
export function negateSideText(text: string) {
  const join = text.includes(' + ') ? ' + ' : text.includes(' or ') ? ' or ' : null;
  const neg = (value: string) => value.startsWith('/') ? value.slice(1) : `/${value}`;
  return join ? text.split(join).map(neg).join(join === ' + ' ? ' or ' : ' + ') : neg(text);
}
export function englishRule(item: DiagramItem, left: string, right: string) {
  const read = (text: string) => text.split(/ (\+|or) /).map(token => token === '+' ? 'and' : token === 'or' ? 'or' : item.meanings?.[token.replace(/^\//, '')]?.[token.startsWith('/') ? 'no' : 'yes'] ?? token).join(' ');
  return `If ${read(left)}, then ${read(right)}.`;
}
