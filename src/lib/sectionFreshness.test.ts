import { describe, expect, it } from 'vitest';
import {
  buildSectionFreshness,
  freshnessLabel,
  matchesFreshness,
  sectionKey,
  type SectionFreshness,
} from './sectionFreshness';

const sections = [
  { pt: 101, section: 2, qids: ['a1', 'a2', 'a3', 'a4'] },
  { pt: 101, section: 3, qids: ['b1', 'b2'] },
  { pt: 102, section: 1, qids: ['c1'] },
];

const answered = (...qids: string[]) => new Set(qids);

describe('buildSectionFreshness', () => {
  it('calls a section fresh only when no question in it has been served', () => {
    const f = buildSectionFreshness(sections, answered('a1'));
    expect(f.get(sectionKey(101, 2))).toMatchObject({ unseen: 3, percentFresh: 75, isFresh: false });
    expect(f.get(sectionKey(101, 3))).toMatchObject({ unseen: 2, percentFresh: 100, isFresh: true });
  });

  it('reports a fully worked section as 0% fresh rather than omitting it', () => {
    const f = buildSectionFreshness(sections, answered('c1'));
    expect(f.get(sectionKey(102, 1))).toMatchObject({ unseen: 0, percentFresh: 0, isFresh: false });
  });

  it('treats an empty history as everything fresh', () => {
    const f = buildSectionFreshness(sections, new Set<string>());
    expect([...f.values()].every((s) => s.isFresh)).toBe(true);
  });

  it('skips sections with no questions rather than dividing by zero', () => {
    const f = buildSectionFreshness([{ pt: 999, section: 1, qids: [] }], new Set<string>());
    expect(f.size).toBe(0);
  });

  it('rounds the percentage to a whole number', () => {
    const f = buildSectionFreshness([{ pt: 1, section: 1, qids: ['x', 'y', 'z'] }], answered('x'));
    // 2/3 = 66.67
    expect(f.get(sectionKey(1, 1))?.percentFresh).toBe(67);
  });
});

describe('matchesFreshness', () => {
  const fresh = { isFresh: true } as SectionFreshness;
  const touched = { isFresh: false } as SectionFreshness;

  it('keeps only untouched sections under Fresh', () => {
    expect(matchesFreshness(fresh, 'fresh')).toBe(true);
    expect(matchesFreshness(touched, 'fresh')).toBe(false);
  });

  it('lifts the filter under Any rather than inverting it', () => {
    expect(matchesFreshness(fresh, 'any')).toBe(true);
    expect(matchesFreshness(touched, 'any')).toBe(true);
  });

  it('lets an unknown section through both filters rather than hiding it on a guess', () => {
    expect(matchesFreshness(undefined, 'fresh')).toBe(true);
    expect(matchesFreshness(undefined, 'any')).toBe(true);
  });
});

describe('freshnessLabel', () => {
  it('names a fully worked section rather than printing 0% fresh', () => {
    expect(freshnessLabel({ percentFresh: 0 } as SectionFreshness)).toBe('spent');
  });

  it('states the percentage otherwise', () => {
    expect(freshnessLabel({ percentFresh: 75 } as SectionFreshness)).toBe('75% fresh');
  });

  it('says nothing when freshness is unknown', () => {
    expect(freshnessLabel(undefined)).toBeNull();
  });
});
