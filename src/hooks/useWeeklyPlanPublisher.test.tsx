import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { newPublishJob, type PublishDeps } from '@/lib/weeklyPlanPublish';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => { throw new Error('not used'); } } }));
vi.mock('@/lib/classroomItems', () => ({ createClassroomItem: vi.fn() }));

import { useWeeklyPlanPublisher } from './useWeeklyPlanPublisher';

/**
 * Deps whose final publish waits until released. `session.actor` is what the
 * engine sees as the signed-in account before each write.
 */
function slowDeps(actor = 'ta') {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  const state = { failPublish: false, published: 0, actor: actor as string | null, writes: 0 };
  let n = 0;
  const deps: PublishDeps = {
    currentActorId: async () => state.actor,
    insertDraftPlan: async (row) => (state.writes++, { id: row.id as string }),
    insertItems: async (rows) => (state.writes++, rows.map((r) => ({ id: r.id as string, sort_order: r.sort_order as number }))),
    createMirror: async () => (state.writes++, { id: `ci${++n}` }),
    linkMirror: async () => (state.writes++, 1),
    revealMirrors: async (ids) => (state.writes++, ids.length),
    publishPlan: async () => {
      state.writes++;
      await gate;
      if (state.failPublish) throw new Error('publish failed');
      state.published++;
      return 1;
    },
  };
  return { deps, release, state };
}

let seq = 0;
const jobFor = (teacherId: string, studentId: string) =>
  newPublishJob(
    { teacherId, studentId, title: `Plan for ${studentId}`, weekStart: '2026-10-05', drafts: [{ day: '2026-10-05', title: 'Task' }] },
    () => `k${++seq}`,
  );

function setup(teacher: string, student: string) {
  const slow = slowDeps(teacher);
  const onPublished = vi.fn();
  const hook = renderHook(
    ({ teacher, student }) =>
      useWeeklyPlanPublisher({ currentTeacherId: teacher, currentStudentId: student, deps: slow.deps, onPublished }),
    { initialProps: { teacher, student } },
  );
  return { ...slow, onPublished, hook };
}

describe('useWeeklyPlanPublisher: student changes', () => {
  it('lets a late success for student A report that the view changed, so B\'s draft is not cleared', async () => {
    const { hook, release, onPublished } = setup('ta', 'a');
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 'a'));
    });
    expect(hook.result.current.busyFor('a')).toBe(true);
    hook.rerender({ teacher: 'ta', student: 'b' });
    expect(hook.result.current.busyFor('b')).toBe(false);
    await act(async () => {
      release();
      await pending;
    });
    expect(onPublished.mock.calls[0][1]).toEqual({ sameActor: true, sameView: false });
  });

  it('treats student A -> B -> A during the writes as a different view', async () => {
    const { hook, release, onPublished } = setup('ta', 'a');
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 'a'));
    });
    hook.rerender({ teacher: 'ta', student: 'b' });
    hook.rerender({ teacher: 'ta', student: 'a' });
    await act(async () => {
      release();
      await pending;
    });
    expect(onPublished.mock.calls[0][1]).toEqual({ sameActor: true, sameView: false });
  });

  it('reports the same view when nothing changed', async () => {
    const { hook, release, onPublished } = setup('ta', 'a');
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 'a'));
    });
    await act(async () => {
      release();
      await pending;
    });
    expect(onPublished.mock.calls[0][1]).toEqual({ sameActor: true, sameView: true });
  });
});

describe('useWeeklyPlanPublisher: teacher account changes', () => {
  it('teacher A -> B with the same student: late success is neither same view nor same actor', async () => {
    const { hook, release, onPublished } = setup('ta', 's');
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 's'));
    });
    // The final write is already in flight; the account changes.
    hook.rerender({ teacher: 'tb', student: 's' });
    expect(hook.result.current.busyFor('s')).toBe(false);
    await act(async () => {
      release();
      await pending;
    });
    expect(onPublished).toHaveBeenCalledTimes(1);
    expect(onPublished.mock.calls[0][0].teacherId).toBe('ta');
    expect(onPublished.mock.calls[0][1]).toEqual({ sameActor: false, sameView: false });
  });

  it('teacher A -> B -> A with delayed completion is still a different view (A\'s new draft is kept)', async () => {
    const { hook, release, onPublished } = setup('ta', 's');
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 's'));
    });
    hook.rerender({ teacher: 'tb', student: 's' });
    hook.rerender({ teacher: 'ta', student: 's' });
    await act(async () => {
      release();
      await pending;
    });
    expect(onPublished.mock.calls[0][1]).toEqual({ sameActor: false, sameView: false });
  });

  it('never shows, retries or dismisses teacher A\'s stopped job for teacher B on the same student', async () => {
    const { hook, release, onPublished, state } = setup('ta', 's');
    state.failPublish = true;
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 's'));
    });
    await act(async () => {
      release();
      await pending;
    });
    expect(hook.result.current.stoppedFor('s')).toMatchObject({ failedAt: 'publish' });

    hook.rerender({ teacher: 'tb', student: 's' });
    state.actor = 'tb';
    expect(hook.result.current.stoppedFor('s')).toBeNull();
    const writesBefore = state.writes;
    await act(async () => {
      expect(await hook.result.current.retry('s')).toBeNull();
    });
    act(() => hook.result.current.dismiss('s'));
    expect(state.writes).toBe(writesBefore);

    // Back to A: A's job is still there, intact, and A can finish it.
    hook.rerender({ teacher: 'ta', student: 's' });
    state.actor = 'ta';
    state.failPublish = false;
    expect(hook.result.current.stoppedFor('s')).toMatchObject({ failedAt: 'publish' });
    await act(async () => {
      await hook.result.current.retry('s');
    });
    expect(state.published).toBe(1);
    expect(onPublished).toHaveBeenCalledTimes(1);
  });

  it('refuses to start a job whose teacher is not the current one', async () => {
    const { hook, state } = setup('tb', 's');
    await act(async () => {
      expect(await hook.result.current.run(jobFor('ta', 's'))).toBeNull();
    });
    expect(state.writes).toBe(0);
  });

  it('a job retried while the real session is another account stops before writing', async () => {
    const { hook, release, state } = setup('ta', 's');
    state.failPublish = true;
    let pending!: Promise<unknown>;
    act(() => {
      pending = hook.result.current.run(jobFor('ta', 's'));
    });
    await act(async () => {
      release();
      await pending;
    });
    // The page still says A, but the session underneath is B.
    state.actor = 'tb';
    state.failPublish = false;
    const writesBefore = state.writes;
    await act(async () => {
      await hook.result.current.retry('s');
    });
    expect(state.writes).toBe(writesBefore);
    expect(hook.result.current.stoppedFor('s')).toMatchObject({ failedAt: 'actor' });
  });
});

describe('useWeeklyPlanPublisher: other guards', () => {
  it('ignores a second publish for the same teacher and student while one is running', async () => {
    const { hook, release } = setup('ta', 'a');
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    act(() => {
      first = hook.result.current.run(jobFor('ta', 'a'));
      second = hook.result.current.run(jobFor('ta', 'a'));
    });
    await act(async () => {
      release();
      await first;
    });
    expect(await second).toBeNull();
  });

  it('does not keep a blocked job (it wrote nothing)', async () => {
    const { hook, state } = setup('ta', 'a');
    const blocked = newPublishJob(
      { teacherId: 'ta', studentId: 'a', title: 'W', weekStart: '2026-10-05', drafts: [{ day: '2026-10-05', title: 'Drill', curriculumDrillId: 'd' }] },
      () => `b${++seq}`,
    );
    await act(async () => {
      const out = await hook.result.current.run(blocked);
      expect(out?.failedAt).toBe('blocked');
    });
    expect(hook.result.current.stoppedFor('a')).toBeNull();
    expect(state.writes).toBe(0);
  });
});
