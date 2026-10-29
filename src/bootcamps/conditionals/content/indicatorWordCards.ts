/** The indicator-word deck. One card per word, both groups mixed. Word list confirmed by Joshua 2026-10-11. */
export type IndicatorGroup = 1 | 2;
export interface IndicatorWordCard { id: string; word: string; group: IndicatorGroup }

const group1 = ['if', 'when', 'whenever', 'where', 'all', 'every', 'any', 'anyone', 'anytime', 'every time', 'each', 'the only', 'who'];
const group2 = ['only', 'only if', 'only when', 'only where', 'always', 'must', 'requires'];
const slug = (word: string) => word.replace(/\s+/g, '-');

export const indicatorWordCards: IndicatorWordCard[] = [
  ...group1.map(word => ({ id: `g1-${slug(word)}`, word, group: 1 as const })),
  ...group2.map(word => ({ id: `g2-${slug(word)}`, word, group: 2 as const })),
];

export const displayWord = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
export const groupKind = (group: IndicatorGroup) => group === 1 ? 'sufficient' : 'necessary';
/** The one line on the back of every card. */
export const groupSentence = (group: IndicatorGroup) => `This is a ${groupKind(group)} condition indicator word, Group ${group}.`;
/** Sufficient ideas go on the left of the arrow, necessary ideas on the right. */
export const groupSide = (group: IndicatorGroup) => group === 1 ? 'left' : 'right';
