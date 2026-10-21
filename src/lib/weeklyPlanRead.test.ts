import { describe, expect, it } from 'vitest';
import { fakePlanDb } from '@/test/fakePlanDb';
import { PLAN_PAGE_SIZE, loadPlanItems, loadPrescribedPlan } from './weeklyPlanRead';

const TODAY = '2026-10-01';

let n = 0;
const plan = (over: Record<string, unknown>) => ({
  id: `p${++n}`,
  student_id: 'stu',
  created_by: 'teacher',
  title: 'Plan',
  status: 'published',
  ai_generated: false,
  rationale: null,
  published_at: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  ...over,
});
const item = (over: Record<string, unknown>) => ({
  id: `i${++n}`,
  student_id: 'stu',
  classroom_item_id: null,
  day_date: '2026-09-28',
  title: 'Task',
  instructions: null,
  estimated_minutes: null,
  unlock_at: null,
  due_at: null,
  status: 'assigned',
  sort_order: 0,
  metadata_json: {},
  ...over,
});

function futureWeeks(count: number, studentId = 'stu') {
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(2027, 0, 4 + i * 7);
    const end = new Date(2027, 0, 10 + i * 7);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return plan({ title: `Future ${i}`, week_start: iso(start), week_end: iso(end), student_id: studentId });
  });
}

describe('loadPrescribedPlan', () => {
  it('finds this week even when far more than a page of future plans exist', async () => {
    const current = plan({ title: 'This week', week_start: '2026-09-28', week_end: '2026-10-04' });
    const db = fakePlanDb({
      weekly_plans: [...futureWeeks(PLAN_PAGE_SIZE * 2 + 5), current],
      weekly_plan_items: [item({ weekly_plan_id: current.id })],
    });
    const out = await loadPrescribedPlan(db, 'stu', TODAY);
    expect(out.plan?.id).toBe(current.id);
    expect(out.relation).toBe('current');
    expect(out.items).toHaveLength(1);
  });

  it('finds the nearest upcoming week, not the latest one, with many future plans', async () => {
    const next = plan({ title: 'Next week', week_start: '2026-10-05', week_end: '2026-10-11' });
    const db = fakePlanDb({ weekly_plans: [...futureWeeks(30), next], weekly_plan_items: [] });
    const out = await loadPrescribedPlan(db, 'stu', TODAY);
    expect(out.plan?.title).toBe('Next week');
    expect(out.relation).toBe('upcoming');
  });

  it('falls back to the latest past week only when nothing current or upcoming exists', async () => {
    const old = plan({ title: 'Old', week_start: '2026-09-07', week_end: '2026-09-13' });
    const older = plan({ title: 'Older', week_start: '2026-08-31', week_end: '2026-09-06' });
    const db = fakePlanDb({ weekly_plans: [older, old], weekly_plan_items: [] });
    const out = await loadPrescribedPlan(db, 'stu', TODAY);
    expect(out.plan?.title).toBe('Old');
    expect(out.relation).toBe('past');
  });

  it('never returns another student\'s plan or items, even when the reader can see them', async () => {
    const mine = plan({ title: 'Mine', week_start: '2026-09-28', week_end: '2026-10-04' });
    const theirs = plan({ title: 'Theirs', student_id: 'other', week_start: '2026-09-30', week_end: '2026-10-06' });
    const db = fakePlanDb({
      weekly_plans: [mine, theirs],
      weekly_plan_items: [
        item({ weekly_plan_id: mine.id, title: 'mine' }),
        // A stray row on my plan that belongs to someone else.
        item({ weekly_plan_id: mine.id, student_id: 'other', title: 'stray' }),
      ],
    });
    const out = await loadPrescribedPlan(db, 'stu', TODAY);
    expect(out.plan?.title).toBe('Mine');
    expect(out.items.map((i) => i.title)).toEqual(['mine']);
    expect(db.log.every((q) => q.includes('student_id=stu'))).toBe(true);
  });

  it('excludes the personal to-do plan in the query itself', async () => {
    const personal = plan({ title: '__personal__', created_by: 'stu', week_start: '2000-01-01', week_end: '2999-12-31' });
    const db = fakePlanDb({ weekly_plans: [personal], weekly_plan_items: [] });
    const out = await loadPrescribedPlan(db, 'stu', TODAY);
    expect(out.plan).toBeNull();
    expect(db.log[0]).toContain('title!=__personal__');
  });

  it('reports a failed read instead of claiming there is no plan', async () => {
    const db = fakePlanDb({ weekly_plans: [], weekly_plan_items: [] });
    db.failTable.add('weekly_plans');
    await expect(loadPrescribedPlan(db, 'stu', TODAY)).rejects.toThrow('weekly_plans unavailable');
  });
});

describe('loadPlanItems', () => {
  it('refuses a plan that belongs to a different selected student', async () => {
    const db = fakePlanDb({ weekly_plan_items: [] });
    await expect(loadPlanItems(db, { id: 'p', student_id: 'a' }, 'b')).rejects.toThrow('different student');
    expect(db.log).toEqual([]);
  });

  it('reads every item of a plan across pages, scoped to the student', async () => {
    const rows = Array.from({ length: PLAN_PAGE_SIZE + 3 }, (_, i) => item({ weekly_plan_id: 'p', sort_order: i }));
    const db = fakePlanDb({ weekly_plan_items: rows });
    const out = await loadPlanItems(db, { id: 'p', student_id: 'stu' }, 'stu');
    expect(out).toHaveLength(PLAN_PAGE_SIZE + 3);
    expect(db.log.every((q) => q.includes('weekly_plan_id=p') && q.includes('student_id=stu'))).toBe(true);
  });
});
