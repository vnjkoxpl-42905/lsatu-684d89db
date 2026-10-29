import { describe, it, expect, vi, beforeEach } from 'vitest';

// Records every update the helper issues, per table, with the filters it
// applied, and replays a canned result. The point of these tests is the shape
// of the writes: which table, which row, what status.
type Call = { table: string; values: Record<string, unknown>; filters: string[] };
const calls: Call[] = [];
let assignmentResult: { data: unknown[] | null; error: { message: string } | null } = {
  data: [{ id: 'hw-1' }],
  error: null,
};
let mirrorResult: { error: { message: string } | null } = { error: null };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const call: Call = { table, values: {}, filters: [] };
      const chain: Record<string, unknown> = {};
      const filter = (op: string) => (col: string, val: unknown) => {
        call.filters.push(`${op}:${col}=${String(val)}`);
        return chain;
      };
      chain.update = (values: Record<string, unknown>) => {
        call.values = values;
        calls.push(call);
        return chain;
      };
      chain.eq = filter('eq');
      chain.neq = filter('neq');
      chain.select = () => Promise.resolve(assignmentResult);
      // classroom_items and weekly_plan_items updates end on a filter, so the
      // chain itself has to be awaitable.
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(table === 'classroom_items' ? mirrorResult : { error: null }).then(resolve);
      return chain;
    },
  },
}));

import { closeOutHomeworkAssignment, homeworkScore } from './closeOutAssignedSection';

beforeEach(() => {
  calls.length = 0;
  assignmentResult = { data: [{ id: 'hw-1' }], error: null };
  mirrorResult = { error: null };
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('closeOutHomeworkAssignment', () => {
  it('stamps the assignment row, its classroom mirror, and any linked to-do', async () => {
    const stamped = await closeOutHomeworkAssignment('hw-1', 'stu-1', 84);
    expect(stamped).toBe(true);

    const hw = calls.find((c) => c.table === 'homework_assignments');
    expect(hw?.values).toMatchObject({ status: 'completed', score: 84 });
    expect(typeof hw?.values.completed_at).toBe('string');
    expect(hw?.filters).toEqual(['eq:id=hw-1', 'eq:student_id=stu-1', 'neq:status=completed']);

    const mirror = calls.find((c) => c.table === 'classroom_items');
    expect(mirror?.values).toMatchObject({ status: 'completed' });
    expect(mirror?.filters).toEqual([
      'eq:student_id=stu-1',
      'eq:source_table=homework_assignments',
      'eq:source_id=hw-1',
      'neq:status=completed',
    ]);

    expect(calls.some((c) => c.table === 'weekly_plan_items')).toBe(true);
  });

  it('reports false when the row was already completed, and still closes the mirror', async () => {
    assignmentResult = { data: [], error: null };
    const stamped = await closeOutHomeworkAssignment('hw-1', 'stu-1', 50);
    expect(stamped).toBe(false);
    expect(calls.some((c) => c.table === 'classroom_items')).toBe(true);
  });

  it('throws when the source row cannot be updated, before touching the mirror', async () => {
    assignmentResult = { data: null, error: { message: 'rls' } };
    await expect(closeOutHomeworkAssignment('hw-1', 'stu-1', 50)).rejects.toMatchObject({
      message: 'rls',
    });
    expect(calls.some((c) => c.table === 'classroom_items')).toBe(false);
  });

  it('swallows a mirror failure because the source row already says done', async () => {
    mirrorResult = { error: { message: 'mirror down' } };
    await expect(closeOutHomeworkAssignment('hw-1', 'stu-1', 50)).resolves.toBe(true);
  });
});

describe('homeworkScore', () => {
  const attempts = new Map<string, { selectedAnswer?: string | null; correct?: boolean }>([
    ['q1', { selectedAnswer: 'A', correct: true }],
    ['q2', { selectedAnswer: 'B', correct: false }],
    ['q3', { selectedAnswer: null, correct: true }], // deselected: not a score
  ]);

  it('counts a blank as wrong and rounds to two decimals', () => {
    expect(homeworkScore(3, attempts)).toBe(33.33);
  });

  it('is zero for an empty set rather than NaN', () => {
    expect(homeworkScore(0, attempts)).toBe(0);
  });
});
