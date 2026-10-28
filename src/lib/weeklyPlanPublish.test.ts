import { describe, expect, it } from 'vitest';
import {
  newPublishJob,
  runPublish,
  stoppedPublishNote,
  unlinkedCurriculum,
  type PublishDeps,
  type PublishDraft,
} from './weeklyPlanPublish';

type Fail = Partial<Record<'plan' | 'planLost' | 'items' | 'mirror' | 'link' | 'linkZero' | 'reveal' | 'publish', number>>;

/** An in-memory server with switchable failures. Each failure fires `n` times. */
function fakeServer() {
  const plans = new Map<string, { status: string; student_id: string }>();
  const items = new Map<string, { sort_order: number; classroom_item_id: string | null }>();
  const mirrors = new Map<string, { sourceId: string; visible: boolean }>();
  const order: string[] = [];
  const fail: Fail = {};
  const session = { actor: 't' as string | null };
  const trip = (k: keyof Fail) => {
    if ((fail[k] ?? 0) > 0) {
      fail[k] = (fail[k] as number) - 1;
      return true;
    }
    return false;
  };
  let mirrorSeq = 0;
  const deps: PublishDeps = {
    async currentActorId() {
      return session.actor;
    },
    async insertDraftPlan(row) {
      order.push(`plan:${row.status}`);
      if (trip('plan')) throw new Error('plan insert failed');
      if (!plans.has(row.id as string)) plans.set(row.id as string, { status: row.status as string, student_id: row.student_id as string });
      // The row landed but the answer was lost.
      if (trip('planLost')) throw new Error('network');
      return { id: row.id as string };
    },
    async insertItems(rows) {
      order.push(`items:${rows.length}`);
      if (trip('items')) throw new Error('items insert failed');
      for (const r of rows) {
        if (!items.has(r.id as string)) items.set(r.id as string, { sort_order: r.sort_order as number, classroom_item_id: null });
      }
      return rows.map((r) => ({ id: r.id as string, sort_order: r.sort_order as number }));
    },
    async createMirror(input) {
      order.push('mirror');
      if (input.visibleToStudent !== false) throw new Error('mirror must start hidden');
      if (trip('mirror')) throw new Error('mirror failed');
      const existing = [...mirrors.entries()].find(([, m]) => m.sourceId === input.sourceId);
      if (existing) return { id: existing[0] };
      const id = `ci${++mirrorSeq}`;
      mirrors.set(id, { sourceId: input.sourceId as string, visible: false });
      return { id };
    },
    async linkMirror(itemId, mirrorId) {
      order.push('link');
      if (trip('link')) throw new Error('link failed');
      if (trip('linkZero')) return 0;
      const it = items.get(itemId);
      if (!it) return 0;
      it.classroom_item_id = mirrorId;
      return 1;
    },
    async revealMirrors(ids) {
      order.push('reveal');
      if (trip('reveal')) throw new Error('reveal failed');
      ids.forEach((id) => {
        const m = mirrors.get(id);
        if (m) m.visible = true;
      });
      return ids.filter((id) => mirrors.has(id)).length;
    },
    async publishPlan(planId) {
      order.push('publish');
      if (trip('publish')) throw new Error('publish failed');
      const p = plans.get(planId);
      if (!p) return 0;
      p.status = 'published';
      return 1;
    },
  };
  const writes = () => order.length;
  return { plans, items, mirrors, order, fail, deps, session, writes };
}

let seq = 0;
const ids = () => `id${++seq}`;
const linkedDrill = { kind: 'drill' as const, ref_id: 'ga-saved', route: '/guided/ga-saved' };
const job = (
  drafts: PublishDraft[] = [
    { day: '2026-10-07', title: 'Wed task' },
    { day: '2026-10-05', title: 'Mon task', estimatedMinutes: 30 },
    // A curriculum suggestion already linked to its saved assignment.
    { day: '2026-10-05', title: 'Curriculum drill', curriculumDrillId: 'd1', action: linkedDrill },
  ],
) => newPublishJob({ teacherId: 't', studentId: 's', title: 'Week 5', weekStart: '2026-10-05', drafts }, ids);

describe('runPublish', () => {
  it('stages everything as a draft and marks the plan published last', async () => {
    const s = fakeServer();
    const out = await runPublish(job(), s.deps);
    expect(out.ok).toBe(true);
    expect(s.order[0]).toBe('plan:draft');
    expect(s.order[s.order.length - 1]).toBe('publish');
    expect(s.order.indexOf('reveal')).toBeLessThan(s.order.indexOf('publish'));
    expect([...s.plans.values()]).toEqual([{ status: 'published', student_id: 's' }]);
    expect([...s.mirrors.values()].every((m) => m.visible)).toBe(true);
    expect([...s.items.values()].every((i) => i.classroom_item_id)).toBe(true);
    const sortByTitle = Object.fromEntries(out.job.drafts.map((d, i) => [d.title, s.items.get(out.job.itemIds[i])!.sort_order]));
    expect(sortByTitle).toEqual({ 'Mon task': 0, 'Curriculum drill': 1, 'Wed task': 2 });
  });

  it('publishes a curriculum task linked to an existing saved assignment, with that link stored', async () => {
    const s = fakeServer();
    const captured: Record<string, unknown>[] = [];
    const deps = { ...s.deps, insertItems: async (rows: Record<string, unknown>[]) => (captured.push(...rows), s.deps.insertItems(rows)) };
    const out = await runPublish(job(), deps);
    expect(out.ok).toBe(true);
    const drillRow = captured.find((r) => r.title === 'Curriculum drill');
    expect(drillRow?.metadata_json).toEqual({ action: linkedDrill });
    // The deps have no assignment writer at all.
    expect(Object.keys(s.deps)).not.toContain('assignCurriculum');
  });

  it('refuses an unassigned curriculum suggestion with zero write calls, first time and on retry', async () => {
    const s = fakeServer();
    const blockedJob = job([
      { day: '2026-10-05', title: 'Mon task' },
      { day: '2026-10-05', title: 'Unassigned drill', curriculumDrillId: 'd2' },
    ]);
    expect(unlinkedCurriculum(blockedJob.drafts)).toHaveLength(1);
    const first = await runPublish(blockedJob, s.deps);
    expect(first).toMatchObject({ ok: false, failedAt: 'blocked' });
    expect(first.message).toContain('Assign each one through the usual assignment workflow first');
    expect(stoppedPublishNote(first)).toBe('Nothing was sent.');
    const again = await runPublish(first.job, s.deps);
    expect(again.failedAt).toBe('blocked');
    expect(s.writes()).toBe(0);
    expect(s.plans.size).toBe(0);
  });

  it('after a lost answer on the plan insert, the retry finds the same draft and assigns nothing', async () => {
    const s = fakeServer();
    s.fail.planLost = 1;
    const first = await runPublish(job(), s.deps);
    expect(first).toMatchObject({ ok: false, failedAt: 'plan' });
    expect(first.message).toContain('could not be confirmed');
    expect(stoppedPublishNote(first)).toContain('may or may not have been saved');
    const second = await runPublish(first.job, s.deps);
    expect(second.ok).toBe(true);
    expect(s.plans.size).toBe(1);
    expect(s.order.some((o) => o.includes('curriculum'))).toBe(false);
  });

  it('stops on a failed task insert, keeps the draft plan, and resumes without a second plan', async () => {
    const s = fakeServer();
    s.fail.items = 1;
    const first = await runPublish(job(), s.deps);
    expect(first).toMatchObject({ ok: false, failedAt: 'items' });
    expect([...s.plans.values()][0].status).toBe('draft');
    expect(stoppedPublishNote(first)).toContain('student cannot see this week yet');
    const second = await runPublish(first.job, s.deps);
    expect(second.ok).toBe(true);
    expect(s.plans.size).toBe(1);
    expect(s.items.size).toBe(3);
    expect(s.order.filter((o) => o.startsWith('plan:'))).toHaveLength(1);
  });

  it('treats a zero-row or failed backlink as a failure and retries without new Classroom rows', async () => {
    const s = fakeServer();
    s.fail.linkZero = 1;
    const first = await runPublish(job(), s.deps);
    expect(first).toMatchObject({ ok: false, failedAt: 'links' });
    expect([...s.mirrors.values()].every((m) => !m.visible)).toBe(true);
    s.fail.link = 1;
    const second = await runPublish(first.job, s.deps);
    expect(second.failedAt).toBe('links');
    expect((await runPublish(second.job, s.deps)).ok).toBe(true);
    expect(s.mirrors.size).toBe(3);
  });

  it('stops when the final publish fails, says the tasks are visible, and finishes on retry', async () => {
    const s = fakeServer();
    s.fail.publish = 1;
    const first = await runPublish(job(), s.deps);
    expect(first).toMatchObject({ ok: false, failedAt: 'publish' });
    expect(stoppedPublishNote(first)).toContain('already visible');
    const second = await runPublish(first.job, s.deps);
    expect(second.ok).toBe(true);
    expect(s.plans.size).toBe(1);
    expect(s.mirrors.size).toBe(3);
  });

  it('snapshots the builder so later edits cannot change what is published', () => {
    const drafts = [{ day: '2026-10-05', title: 'Original' }];
    const j = newPublishJob({ teacherId: 't', studentId: 's', title: 'W', weekStart: '2026-10-05', drafts }, ids);
    drafts[0].title = 'Edited later';
    expect(j.drafts[0].title).toBe('Original');
  });
});

describe('runPublish actor guard', () => {
  it('writes nothing when the signed-in account is not the job\'s teacher', async () => {
    const s = fakeServer();
    s.session.actor = 'someone-else';
    const out = await runPublish(job(), s.deps);
    expect(out).toMatchObject({ ok: false, failedAt: 'actor' });
    expect(out.message).toContain('different account');
    expect(s.writes()).toBe(0);
  });

  it('fails closed when the sign-in cannot be confirmed', async () => {
    const s = fakeServer();
    s.session.actor = null;
    const out = await runPublish(job(), s.deps);
    expect(out).toMatchObject({ ok: false, failedAt: 'actor' });
    expect(out.message).toContain('could not be confirmed');
    expect(s.writes()).toBe(0);
    const throwing = { ...s.deps, currentActorId: async () => { throw new Error('no session'); } };
    s.session.actor = 't';
    expect((await runPublish(job(), throwing)).failedAt).toBe('actor');
    expect(s.writes()).toBe(0);
  });

  it('stops before the next write when the account changes mid-publish, and the old job cannot run under the new account', async () => {
    const s = fakeServer();
    // Switch accounts as soon as the tasks are saved.
    const deps: PublishDeps = {
      ...s.deps,
      insertItems: async (rows) => {
        const out = await s.deps.insertItems(rows);
        s.session.actor = 'b';
        return out;
      },
    };
    const first = await runPublish(job(), deps);
    expect(first).toMatchObject({ ok: false, failedAt: 'actor' });
    expect(s.order).toEqual(['plan:draft', 'items:3']);
    expect(first.job.teacherId).toBe('t');
    expect(stoppedPublishNote(first)).toContain('draft the student cannot see');

    const underB = await runPublish(first.job, s.deps);
    expect(underB.failedAt).toBe('actor');
    expect(s.order).toEqual(['plan:draft', 'items:3']);

    s.session.actor = 't';
    expect((await runPublish(first.job, s.deps)).ok).toBe(true);
    expect(s.plans.size).toBe(1);
    expect(s.items.size).toBe(3);
  });
});

it('suppresses all seven daily task mirrors under the same persisted publication identity', async () => {
  const server = fakeServer(); const inputs: Record<string, unknown>[] = []; const create = server.deps.createMirror;
  server.deps.createMirror = async (input) => { inputs.push(input); return create(input); };
  const week = newPublishJob({ teacherId: 't', studentId: 's', title: 'Private plan title', weekStart: '2099-01-01', drafts: Array.from({ length: 7 }, (_, i) => ({ day: '2099-01-0' + (i + 1), title: 'Private future task ' + i })) }, ids);
  const result = await runPublish(week, server.deps); expect(result.ok).toBe(true); expect(inputs).toHaveLength(7);
  for (const input of inputs) { expect(input.notificationPolicy).toBe('suppressed'); expect(input.notificationGroupId).toBe(week.planKey); }
});
