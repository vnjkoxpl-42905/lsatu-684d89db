import { describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mock.from } }));

import { findRcLegSession, readLegResult } from './practiceTestRunner';
import type { PracticeTestRun } from './practiceTest';

function query() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'rc-1', status: 'in_progress' }, error: null }),
  };
  mock.from.mockReturnValue(chain);
  return chain;
}

const base: PracticeTestRun = {
  id: 'exam-1', pt: 101, pace: 'standard', status: 'in-progress',
  currentLeg: 0, breakAfterLeg: 2, breakTaken: false,
  createdAt: '2026-09-27T00:00:00Z',
  legs: [{ kind: 'lr', section: 1, questionCount: 25, startedAt: '2026-09-27T00:05:00Z' }],
};

describe('practice test result attribution', () => {
  it('requires exact run and leg IDs for an account-backed exam', async () => {
    const q = query();
    await readLegResult('student-1', { ...base, revision: 1 }, base.legs[0]);
    expect(q.eq).toHaveBeenCalledWith('practice_test_run_id', 'exam-1');
    expect(q.eq).toHaveBeenCalledWith('practice_test_leg', 0);
    expect(q.gte).not.toHaveBeenCalled();
  });

  it('keeps the timestamp fallback only for legacy browser exams', async () => {
    const q = query();
    await readLegResult('student-1', base, base.legs[0]);
    expect(q.gte).toHaveBeenCalledWith('completed_at', '2026-09-27T00:05:00Z');
    expect(q.eq).not.toHaveBeenCalledWith('practice_test_run_id', 'exam-1');
  });

  it('finds the existing RC session by exact exam leg for resume', async () => {
    const q = query();
    expect(await findRcLegSession('student-1', 'exam-1', 2)).toEqual({ id: 'rc-1', status: 'in_progress' });
    expect(q.eq).toHaveBeenCalledWith('user_id', 'student-1');
    expect(q.eq).toHaveBeenCalledWith('practice_test_run_id', 'exam-1');
    expect(q.eq).toHaveBeenCalledWith('practice_test_leg', 2);
  });
});
