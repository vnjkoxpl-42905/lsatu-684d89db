import { describe, expect, it, vi } from 'vitest';
import { fakePlanDb, type FakePlanDb } from '@/test/fakePlanDb';

const state = vi.hoisted(() => ({
  db: null as unknown as FakePlanDb,
  session: { data: { session: { user: { id: 't' } } as { user: { id: string } } | null }, error: null as unknown },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => state.db.from(t), auth: { getSession: async () => state.session } },
}));
const createClassroomItem = vi.hoisted(() => vi.fn(async () => ({ id: 'new-ci' })));
vi.mock('@/lib/classroomItems', () => ({ createClassroomItem }));

import { supabasePublishDeps } from './useWeeklyPlanPublisher';

// The fake records writes without applying them and answers each query with
// the rows its filters match, which is what PostgREST returns for
// update ... select.

describe('supabasePublishDeps acknowledgments', () => {
  it('reads the actor from the live session and reports none when it cannot', async () => {
    state.db = fakePlanDb({});
    const deps = supabasePublishDeps();
    expect(await deps.currentActorId()).toBe('t');
    state.session = { data: { session: null }, error: null };
    expect(await deps.currentActorId()).toBeNull();
    state.session = { data: { session: { user: { id: 't' } } }, error: new Error('expired') };
    expect(await deps.currentActorId()).toBeNull();
  });

  it('has no assignment writer', () => {
    expect(Object.keys(supabasePublishDeps())).not.toContain('assignCurriculum');
  });

  it('counts a plan that is already published as published (a lost answer), but not a missing one', async () => {
    state.db = fakePlanDb({ weekly_plans: [{ id: 'p1', status: 'published' }] });
    const deps = supabasePublishDeps();
    expect(await deps.publishPlan('p1', 'now')).toBe(1);
    expect(await deps.publishPlan('gone', 'now')).toBe(0);
  });

  it('reports zero when the backlink update matched no row', async () => {
    state.db = fakePlanDb({ weekly_plan_items: [{ id: 'i1' }] });
    const deps = supabasePublishDeps();
    expect(await deps.linkMirror('i1', 'ci')).toBe(1);
    expect(await deps.linkMirror('missing', 'ci')).toBe(0);
  });

  it('reuses the Classroom row already pointing at a task instead of creating another', async () => {
    state.db = fakePlanDb({
      classroom_items: [{ id: 'ci-existing', source_table: 'weekly_plan_items', source_id: 'i1', student_id: 's' }],
    });
    const deps = supabasePublishDeps();
    expect((await deps.createMirror({ sourceId: 'i1', studentId: 's' })).id).toBe('ci-existing');
    expect(createClassroomItem).not.toHaveBeenCalled();
    expect(await deps.createMirror({ sourceId: 'i2', studentId: 's' })).toEqual({ id: 'new-ci' });
  });

  it('reports a failed write instead of a match when the table is unavailable', async () => {
    state.db = fakePlanDb({ weekly_plan_items: [{ id: 'i1' }] });
    state.db.failTable.add('weekly_plan_items');
    await expect(supabasePublishDeps().linkMirror('i1', 'ci')).rejects.toThrow('unavailable');
  });
});
