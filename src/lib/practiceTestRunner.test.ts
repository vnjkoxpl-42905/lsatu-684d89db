import { describe, it, expect, vi } from 'vitest';
const reads = vi.hoisted(() => ({ filters: [] as unknown[][], columns: [] as string[], attemptsError: null as Error | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const result = () => table === 'rc_drill_sessions'
      ? { data: [{ id: 'rc-one', passage_ids: [1, 2], config: { clockElapsedSeconds: 120 } }], error: null }
      : { data: [{ selected: 'A', is_correct: true, time_ms: 24_000 }, { selected: null, is_correct: false, time_ms: 99_000 }], error: reads.attemptsError };
    const query = {
      select: (columns: string) => { reads.columns.push(columns); return query; },
      eq: (column: string, value: unknown) => { reads.filters.push([table, column, value]); return query; },
      order: () => query,
      limit: () => Promise.resolve(result()),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  },
} }));
import { isSittingReturn, practiceTestPath, projectRcLegResult, readRcLegResult } from './practiceTestRunner';

describe('RC leg result readback', () => {
  it('loads selected choices and durable clock under exact owner and leg filters', async () => {
    reads.filters = []; reads.columns = []; reads.attemptsError = null;
    expect(await readRcLegResult('student-one', [2, 1], '2026-09-30T00:00:00Z', { runId: 'pt-one', legIndex: 0 }))
      .toEqual({ correct: 1, answered: 1, timeMs: 120_000 });
    expect(reads.columns).toEqual(['id, passage_ids, completed_at, config', 'selected, is_correct, time_ms']);
    expect(reads.filters).toContainEqual(['rc_drill_sessions', 'practice_test_run_id', 'pt-one']);
    expect(reads.filters).toContainEqual(['rc_drill_sessions', 'practice_test_leg', 0]);
    expect(reads.filters).toContainEqual(['rc_attempts', 'user_id', 'student-one']);
  });

  it('does not score stale partial data accompanying a failed attempt read', async () => {
    reads.attemptsError = new Error('read failed');
    expect(await readRcLegResult('student-one', [1, 2], '', { runId: 'pt-one', legIndex: 0 })).toBeNull();
    reads.attemptsError = null;
  });

  it('counts a single selected answer and uses the saved session clock instead of blank closeout times', () => {
    const attempts = [
      { selected: 'A', is_correct: true, time_ms: 24_000 },
      ...Array.from({ length: 26 }, () => ({ selected: null, is_correct: false, time_ms: 28_000 })),
    ];
    expect(projectRcLegResult(attempts, 120)).toEqual({ correct: 1, answered: 1, timeMs: 120_000 });
  });

  it('keeps all-unanswered submission as zero answered with account-saved reading time', () => {
    expect(projectRcLegResult([{ selected: null, is_correct: false, time_ms: 90_000 }], 90))
      .toEqual({ correct: 0, answered: 0, timeMs: 90_000 });
  });

  it('falls back only to answered-question times for legacy rows without a saved clock', () => {
    expect(projectRcLegResult([
      { selected: 'B', is_correct: false, time_ms: 12_000 },
      { selected: 'C', is_correct: true, time_ms: 7_000 },
      { selected: null, is_correct: true, time_ms: 55_000 },
    ])).toEqual({ correct: 1, answered: 2, timeMs: 19_000 });
  });

  it('accepts saved zero and rejects malformed timing or answer claims', () => {
    const attempts = [{ selected: 'A', is_correct: true, time_ms: -50 }, { selected: '', is_correct: true, time_ms: 40 }];
    expect(projectRcLegResult(attempts, 0)).toEqual({ correct: 1, answered: 1, timeMs: 0 });
    expect(projectRcLegResult(attempts, Number.NaN).timeMs).toBe(0);
  });
});

describe('practiceTestPath', () => {
  it('builds the invigilator path for a run', () => {
    expect(practiceTestPath('run-1')).toBe('/testing/test/run-1');
  });
});

describe('isSittingReturn', () => {
  it('recognises the path practiceTestPath builds', () => {
    // The pair that must never drift: whatever we navigate TO, we recognise.
    expect(isSittingReturn(practiceTestPath('abc-123'))).toBe(true);
  });

  it('is false for a missing return path', () => {
    expect(isSittingReturn(undefined)).toBe(false);
    expect(isSittingReturn(null)).toBe(false);
    expect(isSittingReturn('')).toBe(false);
  });

  it('is false for standalone drill routes', () => {
    expect(isSittingReturn('/classroom')).toBe(false);
    expect(isSittingReturn('/drill')).toBe(false);
    expect(isSittingReturn('/rc')).toBe(false);
  });

  it('does not match the Testing Centre landing page itself', () => {
    // /testing is the two doors, not a sitting. Suppressing score UI there
    // would hide the finished-run report the student came to read.
    expect(isSittingReturn('/testing')).toBe(false);
  });

  it('does not match a lookalike prefix', () => {
    expect(isSittingReturn('/testing/tests/run-1')).toBe(false);
    expect(isSittingReturn('/x/testing/test/run-1')).toBe(false);
  });
});
