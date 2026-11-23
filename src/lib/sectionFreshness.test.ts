import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: [] as Array<{ qid: string; class_id: string; br_selected?: boolean | null }>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      let classFilter: string | null = null;
      let excludeBr = false;
      const chain = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          if (col === 'class_id') classFilter = String(val);
          return chain;
        },
        not: (col: string, op: string, val: unknown) => {
          if (col === 'br_selected' && op === 'is' && val === true) excludeBr = true;
          return chain;
        },
        then: (resolve: (val: unknown) => void) => {
          if (table !== 'attempts') return resolve({ data: [], error: null });
          const filtered = state.rows.filter((r) => {
            if (classFilter && r.class_id !== classFilter) return false;
            if (excludeBr && r.br_selected === true) return false;
            return true;
          });
          resolve({ data: filtered.map((r) => ({ qid: r.qid })), error: null });
        },
      };
      return chain;
    },
  },
}));

import {
  buildSectionFreshness,
  fetchAnsweredQids,
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

describe('fetchAnsweredQids (F9)', () => {
  beforeEach(() => {
    state.rows = [];
  });

  it('excludes blind review rows (br_selected = true) from freshness qids', async () => {
    state.rows = [
      { qid: 'PT101.S2.Q1', class_id: 'class-1', br_selected: null },
      { qid: 'PT101.S2.Q2', class_id: 'class-1', br_selected: true },
      { qid: 'PT101.S2.Q3', class_id: 'other-class', br_selected: false },
    ];
    const qids = await fetchAnsweredQids('class-1');
    expect([...qids]).toEqual(['PT101.S2.Q1']);
  });
});
