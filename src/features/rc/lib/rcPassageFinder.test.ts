import { describe, expect, it } from 'vitest';
import type { RcIndexPassageWithPt } from './rcAdaptive';
import {
  EMPTY_RC_FINDER_ADDRESS,
  addressForOption,
  buildRcFinderIndex,
  finderPlate,
  flattenFinderOptions,
  isCommittedOption,
  parseRcFinderQuery,
  resolveFinderAddress,
  resolveRcFinderView,
  stepBackAddress,
  toFinderPassage,
} from './rcPassageFinder';

let nextId = 1;
function passage(preptest: number, section: number, setNumber: number, extra: Partial<RcIndexPassageWithPt> = {}): RcIndexPassageWithPt {
  return {
    passageId: nextId++,
    preptest,
    section,
    setNumber,
    title: `Title ${preptest}-${section}-${setNumber}`,
    topic: 'Humanities',
    format: 'Standard',
    frameworks: [],
    difficulty: 3,
    questionCount: 6,
    explainedCount: 6,
    questionIds: [],
    firstWords: 'Secret opening words about quantum physics',
    ...extra,
  };
}

const source: RcIndexPassageWithPt[] = [
  passage(140, 3, 1, { title: 'Marine ecosystems', topic: 'Natural Science', questionCount: 7 }),
  passage(140, 3, 2, { title: 'The history of public libraries' }),
  passage(140, 3, 3, { title: 'Judicial interpretation', topic: 'Law' }),
  passage(140, 3, 4, { title: 'Painting and perspective', topic: 'Arts' }),
  // A PrepTest with two authoritative RC sections.
  passage(152, 2, 1, { title: 'Water rights in the arid West', topic: 'Law' }),
  passage(152, 2, 2, { title: 'Bird song dialects', topic: 'Natural Science' }),
  passage(152, 4, 1, { title: 'Comparative: Legal positivism', topic: 'Law' }),
  // Not drillable: no questions. Must never appear.
  passage(141, 1, 1, { title: 'Unavailable marine passage', questionCount: 0 }),
  passage(101, 1, 1, { title: 'Early marine biology' }),
  passage(119, 4, 2, { title: 'Ocean currents', topic: 'Natural Science' }),
];
const index = buildRcFinderIndex(source);

describe('RC finder index', () => {
  it('keeps only drillable passages and only metadata fields', () => {
    expect(index.passages).toHaveLength(9);
    expect(index.passages.some(p => p.preptest === 141)).toBe(false);
    for (const p of index.passages) {
      expect(Object.keys(p).sort()).toEqual(['passageId', 'preptest', 'questionCount', 'section', 'setNumber', 'title', 'topic']);
    }
    expect(toFinderPassage(source[0])).not.toHaveProperty('firstWords');
  });

  it('groups authoritative sections without inventing missing ones', () => {
    const pt152 = index.preptests.find(p => p.preptest === 152)!;
    expect(pt152.sections.map(s => s.section)).toEqual([2, 4]);
    expect(pt152.passageCount).toBe(3);
    expect(pt152.sections[0].questionCount).toBe(12);
  });
});

describe('parseRcFinderQuery', () => {
  it.each([
    ['140 3 1', { ptDigits: '140', section: 3, passage: 1, bare: false }],
    ['PT140 S3 P1', { ptDigits: '140', section: 3, passage: 1, bare: false }],
    ['pt140s3p1', { ptDigits: '140', section: 3, passage: 1, bare: false }],
    ['140.3.1', { ptDigits: '140', section: 3, passage: 1, bare: false }],
    ['  PrepTest 140 · Section 3  ', { ptDigits: '140', section: 3, passage: null, bare: false }],
    ['14', { ptDigits: '14', section: null, passage: null, bare: true }],
    ['pt 14', { ptDigits: '14', section: null, passage: null, bare: false }],
  ])('reads %s as an address', (text, expected) => {
    expect(parseRcFinderQuery(text)).toEqual({ kind: 'address', ...expected });
  });

  it('treats ordinary words as title or topic search', () => {
    expect(parseRcFinderQuery('Marine  Ecosystems')).toEqual({ kind: 'text', terms: ['marine', 'ecosystems'], numbers: [] });
    expect(parseRcFinderQuery('law 15')).toEqual({ kind: 'text', terms: ['law'], numbers: ['15'] });
  });

  it.each(['test', 'passage', 'question'])('searches the title word %s without requiring an address', word => {
    expect(parseRcFinderQuery(word)).toEqual({ kind: 'text', terms: [word], numbers: [] });
  });

  it('combines a labeled PrepTest with a topic', () => {
    expect(parseRcFinderQuery('pt 140 law')).toEqual({ kind: 'text', terms: ['law'], numbers: ['140'] });
  });

  it.each([
    ['140 3 1 2', /at most/],
    ['s3 p1', /Start with the PrepTest/],
    ['1400', /three digits/],
    ['140 p1', /section before the passage/],
    ['140 3 q2', /whole passages/],
  ])('rejects %s with an explanation', (text, message) => {
    const parsed = parseRcFinderQuery(text);
    expect(parsed.kind).toBe('invalid');
    expect(parsed.kind === 'invalid' && parsed.message).toMatch(message);
  });

  it('ignores empty and punctuation-only input', () => {
    expect(parseRcFinderQuery('   ')).toEqual({ kind: 'empty' });
    expect(parseRcFinderQuery('·-.')).toEqual({ kind: 'empty' });
  });
});

describe('resolveRcFinderView', () => {
  const keys = (view: ReturnType<typeof resolveRcFinderView>) => flattenFinderOptions(view).map(option => option.key);

  it('browses PrepTests by decade with no address and no query', () => {
    const view = resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '');
    expect(view.level).toBe('preptest');
    expect(view.groups.map(g => g.label)).toEqual(['100s', '110s', '140s', '150s']);
    expect(keys(view)).toEqual(['pt-101', 'pt-119', 'pt-140', 'pt-152']);
  });

  it('filters PrepTests by a partial number', () => {
    expect(keys(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '1'))).toHaveLength(4);
    expect(keys(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '15'))).toEqual(['pt-152']);
    const none = resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '16');
    expect(none.total).toBe(0);
    expect(none.message).toMatch(/No PrepTest number starts with 16/);
  });

  it('resolves an exact address to exactly one passage', () => {
    const view = resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '140 3 1');
    expect(view.exact).toBe(true);
    const [option] = flattenFinderOptions(view);
    expect(option.kind === 'passage' && option.passage.title).toBe('Marine ecosystems');
    expect(addressForOption(option)).toEqual({ pt: '140', section: '3', passage: '1' });
  });

  it('explains a wrong section using the authoritative sections', () => {
    const view = resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '152 3');
    expect(view.total).toBe(0);
    expect(view.message).toBe('PT 152 has no Reading Comprehension section 3. PT 152 has Reading Comprehension in sections 2 and 4.');
  });

  it('explains missing passages and PrepTests without offering anything to choose', () => {
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '140 3 5').message).toMatch(/has no passage 5. It has passages 1 to 4/);
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '141').message).toMatch(/No drillable Reading Comprehension passages for PT 141/);
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, '141 1 1').total).toBe(0);
  });

  it('shows every RC section of a committed PrepTest', () => {
    const view = resolveRcFinderView(index, { pt: '152', section: '', passage: '' }, '');
    expect(view.level).toBe('section');
    expect(keys(view)).toEqual(['s-152-2', 's-152-4']);
  });

  it('reads a bare number as the next level inside a committed address', () => {
    expect(keys(resolveRcFinderView(index, { pt: '152', section: '', passage: '' }, '4'))).toEqual(['s-152-4']);
    const passageLevel = resolveRcFinderView(index, { pt: '140', section: '3', passage: '' }, '2');
    expect(passageLevel.exact).toBe(true);
    expect(keys(passageLevel)).toHaveLength(1);
    // Not a section of PT 152, so it falls back to a PrepTest prefix.
    expect(keys(resolveRcFinderView(index, { pt: '152', section: '', passage: '' }, '11'))).toEqual(['pt-119']);
  });

  it('searches titles and topics, never opening words or other text', () => {
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, 'quantum').total).toBe(0);
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, 'secret opening').total).toBe(0);
    const marine = resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, 'marine');
    expect(flattenFinderOptions(marine).map(o => o.kind === 'passage' && o.passage.title)).toEqual(['Early marine biology', 'Marine ecosystems']);
    const law = resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, 'law');
    expect(law.total).toBe(3);
    expect(law.groups.map(g => g.label)).toEqual(['140s', '150s']);
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, 'law 15').total).toBe(2);
    expect(resolveRcFinderView(index, EMPTY_RC_FINDER_ADDRESS, 'MARINE ecosys').total).toBe(1);
  });

  it('caps long result lists and says how many it held back', () => {
    const many = buildRcFinderIndex(Array.from({ length: 50 }, (_, i) => passage(101 + (i % 40), 1, Math.floor(i / 40) + 1, { title: `Law and order ${i}` })));
    const view = resolveRcFinderView(many, EMPTY_RC_FINDER_ADDRESS, 'law', 10);
    expect(flattenFinderOptions(view)).toHaveLength(10);
    expect(view.total).toBe(50);
    expect(view.message).toMatch(/10 closest of 50/);
  });

  it('reports an empty index instead of inventing PrepTests', () => {
    const empty = buildRcFinderIndex([]);
    const view = resolveRcFinderView(empty, EMPTY_RC_FINDER_ADDRESS, '');
    expect(view.total).toBe(0);
    expect(view.message).toMatch(/No drillable passages/);
    expect(resolveRcFinderView(empty, EMPTY_RC_FINDER_ADDRESS, '140').message).not.toMatch(/run from/);
  });
});

describe('address helpers', () => {
  it('resolves only a complete address held by the index', () => {
    expect(resolveFinderAddress(index, { pt: '140', section: '3', passage: '2' })?.title).toBe('The history of public libraries');
    expect(resolveFinderAddress(index, { pt: '140', section: '3', passage: '' })).toBeUndefined();
    expect(resolveFinderAddress(index, { pt: '141', section: '1', passage: '1' })).toBeUndefined();
  });

  it('steps back one level at a time and clears finer levels', () => {
    expect(stepBackAddress({ pt: '140', section: '3', passage: '1' })).toEqual({ pt: '140', section: '3', passage: '' });
    expect(stepBackAddress({ pt: '140', section: '3', passage: '' })).toEqual({ pt: '140', section: '', passage: '' });
    expect(stepBackAddress({ pt: '140', section: '', passage: '' })).toEqual(EMPTY_RC_FINDER_ADDRESS);
  });

  it('marks committed options separately from what is merely shown', () => {
    const view = resolveRcFinderView(index, { pt: '140', section: '3', passage: '2' }, '');
    const chosen = flattenFinderOptions(view).filter(option => isCommittedOption(option, { pt: '140', section: '3', passage: '2' }));
    expect(chosen.map(option => option.key)).toHaveLength(1);
  });

  it('shows a typed draft in the plate without treating it as committed', () => {
    expect(finderPlate(EMPTY_RC_FINDER_ADDRESS, '140 3').map(s => [s.value, s.state])).toEqual([['140', 'draft'], ['3', 'draft'], ['', 'empty']]);
    expect(finderPlate({ pt: '140', section: '3', passage: '' }, '2').map(s => [s.value, s.state])).toEqual([['140', 'committed'], ['3', 'committed'], ['2', 'draft']]);
    expect(finderPlate({ pt: '140', section: '3', passage: '1' }, '').map(s => s.state)).toEqual(['committed', 'committed', 'committed']);
    expect(finderPlate({ pt: '140', section: '3', passage: '1' }, '152').map(s => [s.value, s.state])).toEqual([['152', 'draft'], ['', 'empty'], ['', 'empty']]);
    expect(finderPlate({ pt: '140', section: '3', passage: '1' }, 'marine').map(s => s.state)).toEqual(['committed', 'committed', 'committed']);
  });
});
