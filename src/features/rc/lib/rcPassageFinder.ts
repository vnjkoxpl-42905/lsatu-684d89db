/**
 * Pure logic for the RC builder's left-side passage finder. The finder reads
 * the passage index the builder already loaded and never fetches anything.
 *
 * Search sees metadata only: PrepTest, section, passage number, title, topic
 * and question count. `toFinderPassage` drops every other field before a
 * passage enters the finder index, so opening words, passage text, questions
 * and answers cannot be matched or shown, even by accident.
 */
import type { RcIndexPassageWithPt } from './rcAdaptive';

/** Same shape as the builder's lookup address. Empty string means unset. */
export interface RcFinderAddress {
  pt: string;
  section: string;
  passage: string;
}

export const EMPTY_RC_FINDER_ADDRESS: RcFinderAddress = { pt: '', section: '', passage: '' };

export interface RcFinderPassage {
  passageId: number;
  preptest: number;
  section: number;
  setNumber: number;
  title: string | null;
  topic: string | null;
  questionCount: number;
}

export interface RcFinderSection {
  preptest: number;
  section: number;
  passages: RcFinderPassage[];
  questionCount: number;
}

export interface RcFinderPreptest {
  preptest: number;
  sections: RcFinderSection[];
  passageCount: number;
  questionCount: number;
}

export interface RcFinderIndex {
  passages: RcFinderPassage[];
  preptests: RcFinderPreptest[];
}

/** The only fields search and results may read. */
export function toFinderPassage(passage: RcIndexPassageWithPt): RcFinderPassage {
  return {
    passageId: passage.passageId,
    preptest: passage.preptest,
    section: passage.section,
    setNumber: passage.setNumber,
    title: passage.title,
    topic: passage.topic,
    questionCount: passage.questionCount,
  };
}

/** Drillable passages only, the same rule the builder's lookup uses. */
export function buildRcFinderIndex(source: readonly RcIndexPassageWithPt[]): RcFinderIndex {
  const passages = source
    .filter(passage => passage.questionCount > 0)
    .map(toFinderPassage)
    .sort((a, b) => a.preptest - b.preptest || a.section - b.section || a.setNumber - b.setNumber || a.passageId - b.passageId);
  const preptests: RcFinderPreptest[] = [];
  for (const passage of passages) {
    let pt = preptests[preptests.length - 1];
    if (!pt || pt.preptest !== passage.preptest) {
      pt = { preptest: passage.preptest, sections: [], passageCount: 0, questionCount: 0 };
      preptests.push(pt);
    }
    let section = pt.sections[pt.sections.length - 1];
    if (!section || section.section !== passage.section) {
      section = { preptest: passage.preptest, section: passage.section, passages: [], questionCount: 0 };
      pt.sections.push(section);
    }
    section.passages.push(passage);
    section.questionCount += passage.questionCount;
    pt.passageCount += 1;
    pt.questionCount += passage.questionCount;
  }
  return { passages, preptests };
}

export function decadeOf(preptest: number): number {
  return Math.floor(preptest / 10) * 10;
}

export function decadeLabel(decade: number): string {
  return `${decade}s`;
}

/* ------------------------------------------------------------------ query */

export type RcFinderQuery =
  | { kind: 'empty' }
  | {
      kind: 'address';
      /** Digits typed for the PrepTest so far. Three digits name one test. */
      ptDigits: string;
      section: number | null;
      passage: number | null;
      /** A single unlabeled number, which a scoped level may read as its own ordinal. */
      bare: boolean;
    }
  | { kind: 'text'; terms: string[]; numbers: string[] }
  | { kind: 'invalid'; message: string };

const PT_LABELS = new Set(['pt', 'preptest', 'prep', 'test']);
const SECTION_LABELS = new Set(['s', 'sec', 'section']);
const PASSAGE_LABELS = new Set(['p', 'psg', 'passage']);
const QUESTION_LABELS = new Set(['q', 'question']);

/** Lower-case, strip accents and soft hyphens, collapse whitespace. */
export function normalizeFinderText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ­]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Reads "140 3 1", "PT140 S3 P1", "140.3.1", "pt 140 section 3" and partial
 * forms as an address. Anything with other words is a title or topic search.
 */
export function parseRcFinderQuery(raw: string): RcFinderQuery {
  const text = normalizeFinderText(raw);
  if (!text) return { kind: 'empty' };
  const tokens = text.match(/[a-z]+|\d+/g) ?? [];
  if (tokens.length === 0) return { kind: 'empty' };
  const words = tokens.filter(token => !/^\d+$/.test(token));
  const numberTokens = tokens.filter(token => /^\d+$/.test(token));
  if (numberTokens.length === 0) return { kind: 'text', terms: words, numbers: [] };
  const addressLike = words.every(word => PT_LABELS.has(word) || SECTION_LABELS.has(word) || PASSAGE_LABELS.has(word) || QUESTION_LABELS.has(word));
  if (!addressLike) {
    const terms = words.filter(word => !PT_LABELS.has(word) && !SECTION_LABELS.has(word) && !PASSAGE_LABELS.has(word));
    return { kind: 'text', terms, numbers: numberTokens };
  }
  if (words.some(word => QUESTION_LABELS.has(word))) {
    return { kind: 'invalid', message: 'This finder opens whole passages. Use P for a passage number, like 140 3 1.' };
  }
  const slots: { pt: string | null; section: string | null; passage: string | null } = { pt: null, section: null, passage: null };
  const order: (keyof typeof slots)[] = ['pt', 'section', 'passage'];
  let pending: keyof typeof slots | null = null;
  let labeled = false;
  let numbers = 0;
  for (const token of tokens) {
    if (PT_LABELS.has(token)) { pending = 'pt'; labeled = true; continue; }
    if (SECTION_LABELS.has(token)) { pending = 'section'; labeled = true; continue; }
    if (PASSAGE_LABELS.has(token)) { pending = 'passage'; labeled = true; continue; }
    numbers += 1;
    const slot = pending ?? order.find(name => slots[name] === null && order.indexOf(name) >= lastFilled(slots, order));
    if (!slot || slots[slot] !== null) {
      return { kind: 'invalid', message: 'An address has at most a PrepTest, a section and a passage, like 140 3 1.' };
    }
    slots[slot] = token;
    pending = null;
  }
  if (numbers === 0) return { kind: 'empty' };
  if (slots.pt === null) {
    return { kind: 'invalid', message: 'Start with the PrepTest number, like 140 3 1.' };
  }
  if (slots.pt.length > 3) {
    return { kind: 'invalid', message: 'PrepTest numbers have three digits, like 140.' };
  }
  if (slots.passage !== null && slots.section === null) {
    return { kind: 'invalid', message: 'Add the section before the passage, like 140 3 1.' };
  }
  const ordinal = (value: string | null) => value === null ? null : Number(value);
  return {
    kind: 'address',
    ptDigits: slots.pt,
    section: ordinal(slots.section),
    passage: ordinal(slots.passage),
    bare: numbers === 1 && !labeled,
  };
}

function lastFilled(slots: Record<string, string | null>, order: string[]): number {
  let last = 0;
  order.forEach((name, index) => { if (slots[name] !== null) last = index + 1; });
  return last;
}

/* ---------------------------------------------------------------- results */

export type RcFinderOption =
  | { kind: 'preptest'; key: string; preptest: RcFinderPreptest }
  | { kind: 'section'; key: string; section: RcFinderSection }
  | { kind: 'passage'; key: string; passage: RcFinderPassage };

export interface RcFinderGroup {
  key: string;
  label: string;
  options: RcFinderOption[];
}

export type RcFinderLevel = 'preptest' | 'section' | 'passage' | 'search';

export interface RcFinderView {
  level: RcFinderLevel;
  groups: RcFinderGroup[];
  /** Matching options before any display cap. */
  total: number;
  /** Explains an empty, capped or impossible result. Never invented data. */
  message: string | null;
  /** The first option is the one exact answer to a complete typed address. */
  exact: boolean;
}

export const RC_FINDER_RESULT_LIMIT = 40;

const preptestOption = (preptest: RcFinderPreptest): RcFinderOption => ({ kind: 'preptest', key: `pt-${preptest.preptest}`, preptest });
const sectionOption = (section: RcFinderSection): RcFinderOption => ({ kind: 'section', key: `s-${section.preptest}-${section.section}`, section });
const passageOption = (passage: RcFinderPassage): RcFinderOption => ({ kind: 'passage', key: `p-${passage.passageId}`, passage });

function byDecade(preptests: RcFinderPreptest[]): RcFinderGroup[] {
  const groups: RcFinderGroup[] = [];
  for (const preptest of preptests) {
    const decade = decadeOf(preptest.preptest);
    const last = groups[groups.length - 1];
    if (last && last.key === `decade-${decade}`) last.options.push(preptestOption(preptest));
    else groups.push({ key: `decade-${decade}`, label: decadeLabel(decade), options: [preptestOption(preptest)] });
  }
  return groups;
}

function passagesByDecade(passages: RcFinderPassage[]): RcFinderGroup[] {
  const groups: RcFinderGroup[] = [];
  for (const passage of passages) {
    const decade = decadeOf(passage.preptest);
    const last = groups[groups.length - 1];
    if (last && last.key === `decade-${decade}`) last.options.push(passageOption(passage));
    else groups.push({ key: `decade-${decade}`, label: decadeLabel(decade), options: [passageOption(passage)] });
  }
  return groups;
}

export function findFinderPreptest(index: RcFinderIndex, preptest: number): RcFinderPreptest | undefined {
  return index.preptests.find(item => item.preptest === preptest);
}

export function findFinderSection(index: RcFinderIndex, preptest: number, section: number): RcFinderSection | undefined {
  return findFinderPreptest(index, preptest)?.sections.find(item => item.section === section);
}

/** The passage a complete address names, or undefined. Mirrors the builder's lookup. */
export function resolveFinderAddress(index: RcFinderIndex, address: RcFinderAddress): RcFinderPassage | undefined {
  if (!address.pt || !address.section || !address.passage) return undefined;
  return index.passages.find(passage => String(passage.preptest) === address.pt
    && String(passage.section) === address.section && String(passage.setNumber) === address.passage);
}

export function describeSections(preptest: RcFinderPreptest): string {
  const numbers = preptest.sections.map(section => section.section);
  if (numbers.length === 1) return `Section ${numbers[0]}`;
  return `Sections ${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

function sectionsHint(preptest: RcFinderPreptest): string {
  return `PT ${preptest.preptest} has Reading Comprehension in ${describeSections(preptest).replace(/^S/, 's')}.`;
}

function scopedView(index: RcFinderIndex, address: RcFinderAddress): RcFinderView {
  if (!address.pt) {
    const groups = byDecade(index.preptests);
    return { level: 'preptest', groups, total: index.preptests.length, message: index.preptests.length ? null : 'No drillable passages are available.', exact: false };
  }
  const preptest = findFinderPreptest(index, Number(address.pt));
  if (!preptest) {
    return { level: 'section', groups: [], total: 0, message: `PT ${address.pt} has no drillable Reading Comprehension passages.`, exact: false };
  }
  if (!address.section) {
    return { level: 'section', groups: [{ key: `pt-${preptest.preptest}`, label: `PT ${preptest.preptest}`, options: preptest.sections.map(sectionOption) }], total: preptest.sections.length, message: null, exact: false };
  }
  const section = preptest.sections.find(item => item.section === Number(address.section));
  if (!section) {
    return { level: 'passage', groups: [], total: 0, message: `PT ${preptest.preptest} has no Reading Comprehension section ${address.section}. ${sectionsHint(preptest)}`, exact: false };
  }
  return { level: 'passage', groups: [{ key: `s-${preptest.preptest}-${section.section}`, label: `PT ${preptest.preptest} · Section ${section.section}`, options: section.passages.map(passageOption) }], total: section.passages.length, message: null, exact: false };
}

function scopedOrdinal(index: RcFinderIndex, address: RcFinderAddress, value: number): RcFinderView | null {
  if (!address.pt) return null;
  const preptest = findFinderPreptest(index, Number(address.pt));
  if (!preptest) return null;
  if (!address.section) {
    const sections = preptest.sections.filter(section => section.section === value);
    if (!sections.length) return null;
    return { level: 'section', groups: [{ key: `pt-${preptest.preptest}`, label: `PT ${preptest.preptest}`, options: sections.map(sectionOption) }], total: sections.length, message: null, exact: false };
  }
  const section = preptest.sections.find(item => item.section === Number(address.section));
  const passages = section?.passages.filter(passage => passage.setNumber === value) ?? [];
  if (!section || !passages.length) return null;
  return { level: 'passage', groups: [{ key: `s-${preptest.preptest}-${section.section}`, label: `PT ${preptest.preptest} · Section ${section.section}`, options: passages.map(passageOption) }], total: passages.length, message: null, exact: true };
}

function addressView(index: RcFinderIndex, query: Extract<RcFinderQuery, { kind: 'address' }>): RcFinderView {
  if (query.ptDigits.length < 3) {
    const matches = index.preptests.filter(item => String(item.preptest).startsWith(query.ptDigits));
    if (query.section !== null) {
      return { level: 'search', groups: [], total: 0, message: 'PrepTest numbers have three digits, like 140 3 1.', exact: false };
    }
    return { level: 'preptest', groups: byDecade(matches), total: matches.length, message: matches.length ? null : `No PrepTest number starts with ${query.ptDigits}.`, exact: false };
  }
  const pt = Number(query.ptDigits);
  const preptest = findFinderPreptest(index, pt);
  if (!preptest) {
    const first = index.preptests[0]?.preptest;
    const last = index.preptests[index.preptests.length - 1]?.preptest;
    const range = first !== undefined ? ` Available PrepTests run from ${first} to ${last}.` : '';
    return { level: 'search', groups: [], total: 0, message: `No drillable Reading Comprehension passages for PT ${pt}.${range}`, exact: false };
  }
  if (query.section === null) {
    return { level: 'preptest', groups: [{ key: `decade-${decadeOf(pt)}`, label: decadeLabel(decadeOf(pt)), options: [preptestOption(preptest)] }], total: 1, message: null, exact: false };
  }
  const section = preptest.sections.find(item => item.section === query.section);
  if (!section) {
    return { level: 'search', groups: [], total: 0, message: `PT ${pt} has no Reading Comprehension section ${query.section}. ${sectionsHint(preptest)}`, exact: false };
  }
  if (query.passage === null) {
    return { level: 'section', groups: [{ key: `pt-${pt}`, label: `PT ${pt}`, options: [sectionOption(section)] }], total: 1, message: null, exact: false };
  }
  const passage = section.passages.find(item => item.setNumber === query.passage);
  if (!passage) {
    const count = section.passages.length;
    return { level: 'search', groups: [], total: 0, message: `PT ${pt} section ${section.section} has no passage ${query.passage}. It has ${count === 1 ? 'passage 1' : `passages 1 to ${count}`}.`, exact: false };
  }
  return { level: 'passage', groups: [{ key: `s-${pt}-${section.section}`, label: `PT ${pt} · Section ${section.section}`, options: [passageOption(passage)] }], total: 1, message: null, exact: true };
}

/** Lower is better. Title-start beats title-word beats anywhere in title beats topic. */
function rankText(passage: RcFinderPassage, terms: string[]): number | null {
  const title = normalizeFinderText(passage.title ?? '');
  const topic = normalizeFinderText(passage.topic ?? '');
  let score = 0;
  for (const term of terms) {
    if (title.startsWith(term)) score += 0;
    else if (title.split(/[^a-z0-9]+/).some(word => word.startsWith(term))) score += 1;
    else if (title.includes(term)) score += 2;
    else if (topic.split(/[^a-z0-9]+/).some(word => word.startsWith(term))) score += 3;
    else if (topic.includes(term)) score += 4;
    else return null;
  }
  return score;
}

function textView(index: RcFinderIndex, query: Extract<RcFinderQuery, { kind: 'text' }>, limit: number): RcFinderView {
  const ranked: { passage: RcFinderPassage; score: number }[] = [];
  for (const passage of index.passages) {
    if (query.numbers.some(number => !String(passage.preptest).startsWith(number))) continue;
    const score = rankText(passage, query.terms);
    if (score !== null) ranked.push({ passage, score });
  }
  const total = ranked.length;
  if (!total) {
    return { level: 'search', groups: [], total: 0, message: 'No passage titles or topics match. Try one word from a title, a subject like law, or an address like 140 3 1.', exact: false };
  }
  // Best matches survive the cap; the shown set is then read in index order.
  const kept = [...ranked].sort((a, b) => a.score - b.score).slice(0, limit).map(item => item.passage)
    .sort((a, b) => a.preptest - b.preptest || a.section - b.section || a.setNumber - b.setNumber || a.passageId - b.passageId);
  return {
    level: 'search',
    groups: passagesByDecade(kept),
    total,
    message: total > limit ? `Showing the ${limit} closest of ${total} matches. Add a word to narrow them.` : null,
    exact: false,
  };
}

/**
 * What the finder shows for the committed address and the typed query. An
 * empty query browses the next level of the committed address. A bare number
 * reads as that level's section or passage when one exists, and otherwise as
 * the start of a PrepTest number.
 */
export function resolveRcFinderView(index: RcFinderIndex, address: RcFinderAddress, rawQuery: string, limit = RC_FINDER_RESULT_LIMIT): RcFinderView {
  const query = parseRcFinderQuery(rawQuery);
  if (query.kind === 'empty') return scopedView(index, address);
  if (query.kind === 'invalid') return { level: 'search', groups: [], total: 0, message: query.message, exact: false };
  if (query.kind === 'text') return textView(index, query, limit);
  if (query.bare && query.ptDigits.length <= 2) {
    const scoped = scopedOrdinal(index, address, Number(query.ptDigits));
    if (scoped) return scoped;
  }
  return addressView(index, query);
}

export function flattenFinderOptions(view: RcFinderView): RcFinderOption[] {
  return view.groups.flatMap(group => group.options);
}

/** The committed address an option stands for. A coarser level clears finer ones. */
export function addressForOption(option: RcFinderOption): RcFinderAddress {
  if (option.kind === 'preptest') return { pt: String(option.preptest.preptest), section: '', passage: '' };
  if (option.kind === 'section') return { pt: String(option.section.preptest), section: String(option.section.section), passage: '' };
  return { pt: String(option.passage.preptest), section: String(option.passage.section), passage: String(option.passage.setNumber) };
}

/** Clears the finest committed level: passage, then section, then PrepTest. */
export function stepBackAddress(address: RcFinderAddress): RcFinderAddress {
  if (address.passage) return { ...address, passage: '' };
  if (address.section) return { ...address, section: '', passage: '' };
  return EMPTY_RC_FINDER_ADDRESS;
}

/** True when the option is the committed choice at its own level. */
export function isCommittedOption(option: RcFinderOption, address: RcFinderAddress): boolean {
  if (option.kind === 'preptest') return address.pt === String(option.preptest.preptest);
  if (option.kind === 'section') return address.pt === String(option.section.preptest) && address.section === String(option.section.section);
  return address.pt === String(option.passage.preptest) && address.section === String(option.passage.section) && address.passage === String(option.passage.setNumber);
}

export interface RcFinderPlateSlot {
  label: 'PT' | 'S' | 'P';
  value: string;
  /** Committed by the student, read from what they are typing, or not set. */
  state: 'committed' | 'draft' | 'empty';
}

/**
 * The PT / S / P readout. Typing shows a draft without committing it: a full
 * typed address replaces the whole readout, and a bare number typed inside a
 * committed PrepTest fills only the next level.
 */
export function finderPlate(address: RcFinderAddress, rawQuery: string): RcFinderPlateSlot[] {
  const labels = ['PT', 'S', 'P'] as const;
  const committed = [address.pt, address.section, address.passage];
  const query = parseRcFinderQuery(rawQuery);
  const draft: (string | null)[] = [null, null, null];
  let scopedSlot: number | null = null;
  if (query.kind === 'address') {
    if (query.bare && address.pt && query.ptDigits.length <= 2) {
      scopedSlot = address.section ? 2 : 1;
      draft[scopedSlot] = query.ptDigits;
    } else {
      draft[0] = query.ptDigits;
      draft[1] = query.section === null ? null : String(query.section);
      draft[2] = query.passage === null ? null : String(query.passage);
    }
  }
  const typing = draft.some(value => value !== null);
  return labels.map((label, slot) => {
    const typed = draft[slot];
    if (!typing) return committed[slot] ? { label, value: committed[slot], state: 'committed' } : { label, value: '', state: 'empty' };
    if (scopedSlot !== null) {
      if (slot < scopedSlot) return { label, value: committed[slot], state: 'committed' };
      if (slot === scopedSlot) return { label, value: typed!, state: 'draft' };
      return { label, value: '', state: 'empty' };
    }
    if (typed === null) return { label, value: '', state: 'empty' };
    const sameSoFar = draft.slice(0, slot + 1).every((value, i) => value === committed[i]);
    return { label, value: typed, state: sameSoFar ? 'committed' : 'draft' };
  });
}

export function formatPassageReference(passage: Pick<RcFinderPassage, 'preptest' | 'section' | 'setNumber'>): string {
  return `PT ${passage.preptest} · S${passage.section} · P${passage.setNumber}`;
}

export function finderOptionLabel(option: RcFinderOption): string {
  if (option.kind === 'preptest') {
    const { preptest } = option;
    return `PT ${preptest.preptest}, ${describeSections(preptest)}, ${preptest.passageCount} ${preptest.passageCount === 1 ? 'passage' : 'passages'}`;
  }
  if (option.kind === 'section') {
    const { section } = option;
    return `PT ${section.preptest} Section ${section.section}, ${section.passages.length} ${section.passages.length === 1 ? 'passage' : 'passages'}, ${section.questionCount} questions`;
  }
  const { passage } = option;
  return `${passage.title || `Passage ${passage.setNumber}`}, PT ${passage.preptest} Section ${passage.section} Passage ${passage.setNumber}${passage.topic ? `, ${passage.topic}` : ''}, ${passage.questionCount} ${passage.questionCount === 1 ? 'question' : 'questions'}`;
}

export function describeFinderView(view: RcFinderView): string {
  if (!view.total) return view.message ?? 'No matches.';
  if (view.exact) return 'Exact address found. Press Enter to choose it.';
  const noun = view.level === 'preptest' ? 'PrepTest' : view.level === 'section' ? 'section' : 'passage';
  const count = `${view.total} ${noun}${view.total === 1 ? '' : 's'}`;
  return view.message ? `${count}. ${view.message}` : `${count}.`;
}
