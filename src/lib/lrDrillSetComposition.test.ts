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
});
