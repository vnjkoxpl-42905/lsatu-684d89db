import { describe, expect, it } from 'vitest';
import type { LRQuestion } from '@/lib/questionLoader';
import { composeLRDrillSet, getLRDrillSetAvailability } from './lrDrillSetComposition';

const question = (qid: string) => ({ qid } as LRQuestion);
const all = [question('exact-outside-filter'), question('a'), question('b'), question('c')];
const pool = all.slice(1);
const keepOrder = (questions: LRQuestion[]) => questions;

describe('LR drill set composition', () => {
  it('keeps exact picks and fills only the remaining places from filters', () => {
    const result = composeLRDrillSet(new Set(['exact-outside-filter']), all, pool, 3, keepOrder);
    expect(result?.map((q) => q.qid)).toEqual(['exact-outside-filter', 'a', 'b']);
  });

  it('rejects a set smaller than its exact picks', () => {
    const selected = new Set(['exact-outside-filter', 'a']);
    expect(getLRDrillSetAvailability(selected, pool, 1).exceedsSize).toBe(true);
    expect(composeLRDrillSet(selected, all, pool, 1, keepOrder)).toBeNull();
  });

  it('reports a shortage when filters cannot fill the set', () => {
    const selected = new Set(['exact-outside-filter']);
    expect(getLRDrillSetAvailability(selected, pool.slice(0, 1), 3).missingCount).toBe(1);
    expect(composeLRDrillSet(selected, all, pool.slice(0, 1), 3, keepOrder)).toBeNull();
  });

  it('never lets an exact pick or a duplicated pool entry take a second place', () => {
    const pooled = [question('a'), question('b'), question('b'), question('c'), question('d')];
    const bank = [...all, question('d')];
    const result = composeLRDrillSet(new Set(['a']), bank, pooled, 4, keepOrder);
    expect(result?.map((q) => q.qid)).toEqual(['a', 'b', 'c', 'd']);
    // Availability counts distinct questions outside the exact picks.
    expect(getLRDrillSetAvailability(new Set(['a']), pooled, 5)).toMatchObject({ availableCount: 3, missingCount: 1 });
    expect(composeLRDrillSet(new Set(['a']), bank, pooled, 5, keepOrder)).toBeNull();
  });

  it('refuses an exact pick the loaded bank does not contain', () => {
    expect(composeLRDrillSet(new Set(['not-in-bank']), all, pool, 2, keepOrder)).toBeNull();
  });
});
