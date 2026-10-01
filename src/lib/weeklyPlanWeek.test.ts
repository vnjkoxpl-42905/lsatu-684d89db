import { describe, expect, it } from 'vitest';
import type { WeeklyPlan, WeeklyPlanItem } from '@/hooks/useWeeklyPlan';
import {
  buildPrescribedWeek,
  estimateSummary,
  knownEstimate,
  pickPrescribedPlan,
  planTaskHref,
  validDay,
} from './weeklyPlanWeek';

const plan = (over: Partial<WeeklyPlan> = {}): WeeklyPlan => ({
  id: 'p1',
  student_id: 'stu',
  created_by: 'teacher',
  title: 'Week 4',
  week_start: '2026-09-28',
  week_end: '2026-10-04',
  status: 'published',
  ai_generated: false,
  rationale: null,
  published_at: '2026-09-27T12:00:00Z',
  created_at: '2026-09-27T12:00:00Z',
  updated_at: '2026-09-27T12:00:00Z',
  ...over,
});

const item = (over: Partial<WeeklyPlanItem>): WeeklyPlanItem => ({
  id: 'i',
  weekly_plan_id: 'p1',
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

describe('pickPrescribedPlan', () => {
  const personal = plan({
    id: 'personal',
    title: '__personal__',
    created_by: 'stu',
    week_start: '2000-01-01',
    week_end: '2999-12-31',
  });

  it('never picks the student\'s own to-do plan, even though its dates contain today', () => {
    expect(pickPrescribedPlan([personal], '2026-10-01')).toBeNull();
    expect(pickPrescribedPlan([personal, plan()], '2026-10-01')?.plan.id).toBe('p1');
  });

  it('prefers the week containing today over a later published week', () => {
    const later = plan({ id: 'later', week_start: '2026-10-05', week_end: '2026-10-11' });
    expect(pickPrescribedPlan([later, plan()], '2026-10-01')).toMatchObject({
      plan: { id: 'p1' },
      relation: 'current',
    });
  });

  it('falls back to the soonest upcoming week, then the latest past one', () => {
    const next = plan({ id: 'next', week_start: '2026-10-05', week_end: '2026-10-11' });
    const after = plan({ id: 'after', week_start: '2026-10-12', week_end: '2026-10-18' });
    expect(pickPrescribedPlan([after, next], '2026-10-01')).toMatchObject({ plan: { id: 'next' }, relation: 'upcoming' });
    const old = plan({ id: 'old', week_start: '2026-09-14', week_end: '2026-09-20' });
    expect(pickPrescribedPlan([old, plan({ id: 'older', week_start: '2026-09-07', week_end: '2026-09-13' })], '2026-10-01'))
      .toMatchObject({ plan: { id: 'old' }, relation: 'past' });
  });

  it('ignores drafts and archived plans', () => {
    expect(pickPrescribedPlan([plan({ status: 'draft' }), plan({ id: 'a', status: 'archived' })], '2026-10-01')).toBeNull();
  });
});

describe('buildPrescribedWeek', () => {
  const now = new Date(2026, 9, 1, 9, 0); // Thu Oct 1 2026, local
  const today = '2026-10-01';

  it('keeps the teacher\'s order: day first, then sort_order, numbered across the week', () => {
    const week = buildPrescribedWeek(
      plan(),
      [
        item({ id: 'wed-b', day_date: '2026-09-30', sort_order: 5, title: 'Wed second' }),
        item({ id: 'mon', day_date: '2026-09-28', sort_order: 9, title: 'Mon only' }),
        item({ id: 'wed-a', day_date: '2026-09-30', sort_order: 2, title: 'Wed first' }),
      ],
      now,
      today,
    );
    const flat = week.days.flatMap((d) => d.tasks.map((t) => `${t.step}:${t.id}`));
    expect(flat).toEqual(['1:mon', '2:wed-a', '3:wed-b']);
    expect(week.days).toHaveLength(7);
    expect(week.days.find((d) => d.isToday)?.iso).toBe(today);
    expect(week.days[0].isPast).toBe(true);
  });

  it('reports stored status as stored and counts skipped tasks out of the finish line', () => {
    const week = buildPrescribedWeek(
      plan(),
      [
        item({ id: 'a', status: 'completed', estimated_minutes: 30 }),
        item({ id: 'b', status: 'in_progress', estimated_minutes: 45, sort_order: 1 }),
        item({ id: 'c', status: 'skipped', estimated_minutes: 60, sort_order: 2 }),
        item({ id: 'd', status: 'assigned', sort_order: 3 }),
      ],
      now,
      today,
    );
    const labels = week.days[0].tasks.map((t) => t.statusLabel);
    expect(labels).toEqual(['Completed', 'In progress', 'Skipped', 'Not started']);
    expect(week.totals).toMatchObject({
      tasks: 4,
      completed: 1,
      inProgress: 1,
      skipped: 1,
      required: 3,
      knownMinutes: 75,
      unknownEstimates: 1,
      knownMinutesLeft: 45,
    });
    expect(week.finished).toBe(false);
    expect(week.finishCriterion).toBe('This week is finished when all 3 tasks show Completed. Skipped tasks do not count.');
  });

  it('never invents an estimate: zero, missing and negative minutes are unknown', () => {
    const week = buildPrescribedWeek(
      plan(),
      [
        item({ id: 'a', estimated_minutes: 0 }),
        item({ id: 'b', estimated_minutes: null, sort_order: 1 }),
        item({ id: 'c', estimated_minutes: -5, sort_order: 2 }),
      ],
      now,
      today,
    );
    expect(week.days[0].tasks.every((t) => t.estimateMinutes === null)).toBe(true);
    expect(estimateSummary(week.totals)).toBe('No time estimates were given for this week.');
  });

  it('discloses how many tasks have no estimate next to the known total', () => {
    const week = buildPrescribedWeek(
      plan(),
      [item({ id: 'a', estimated_minutes: 90 }), item({ id: 'b', sort_order: 1 })],
      now,
      today,
    );
    expect(estimateSummary(week.totals)).toBe('About 1 hr 30 min in total, 1 hr 30 min left, not counting 1 task with no estimate.');
  });

  it('is finished only when every required task is completed', () => {
    const week = buildPrescribedWeek(
      plan(),
      [item({ id: 'a', status: 'completed' }), item({ id: 'b', status: 'skipped', sort_order: 1 })],
      now,
      today,
    );
    expect(week.finished).toBe(true);
  });

  it('keeps a task moved outside the week visible instead of dropping it', () => {
    const week = buildPrescribedWeek(plan(), [item({ id: 'x', day_date: '2026-10-09' })], now, today);
    expect(week.days.every((d) => d.tasks.length === 0)).toBe(true);
    expect(week.outsideWeek.map((t) => t.id)).toEqual(['x']);
  });

  it('marks a task locked until its unlock time and ignores another plan\'s items', () => {
    const week = buildPrescribedWeek(
      plan(),
      [
        item({ id: 'later', day_date: '2026-10-03', unlock_at: new Date(2026, 9, 3).toISOString() }),
        item({ id: 'foreign', weekly_plan_id: 'other' }),
      ],
      now,
      today,
    );
    const all = week.days.flatMap((d) => d.tasks);
    expect(all.map((t) => t.id)).toEqual(['later']);
    expect(all[0].locked).toBe(true);
  });
});

describe('source values that are not what they should be', () => {
  const now = new Date(2026, 9, 1, 9, 0);
  const today = '2026-10-01';

  it('keeps a positive fractional estimate positive', () => {
    expect(knownEstimate(0.4)).toBe(1);
    expect(knownEstimate(29.6)).toBe(30);
    expect(knownEstimate(Number.NaN)).toBeNull();
    expect(knownEstimate('30')).toBeNull();
  });

  it('accepts only real calendar dates with nothing after them', () => {
    expect(validDay('2026-10-01')).toBe('2026-10-01');
    expect(validDay('2026-02-31')).toBeNull();
    expect(validDay('2026-13-01')).toBeNull();
    expect(validDay('2026-10-01junk')).toBeNull();
    expect(validDay('2026-10-01T00:00:00Z')).toBeNull();
    expect(validDay(null)).toBeNull();
  });

  it('shows an unrecognised stored status as unknown and never as done', () => {
    const week = buildPrescribedWeek(
      plan(),
      [item({ id: 'a', status: 'archived' as never }), item({ id: 'b', status: 'completed', sort_order: 1 })],
      now,
      today,
    );
    const [a] = week.days[0].tasks;
    expect(a.status).toBe('unknown');
    expect(a.statusLabel).toBe('Status unknown');
    expect(week.totals).toMatchObject({ unknownStatus: 1, notStarted: 0, completed: 1, required: 2 });
    expect(week.finished).toBe(false);
  });

  it('lists a task with a malformed day as undated instead of dropping it', () => {
    const week = buildPrescribedWeek(plan(), [item({ id: 'x', day_date: '2026-02-31' })], now, today);
    expect(week.undated.map((t) => t.id)).toEqual(['x']);
    expect(week.outsideWeek).toEqual([]);
    expect(week.totals.tasks).toBe(1);
  });

  it('never picks a plan with an invalid start, and bounds a runaway end date', () => {
    expect(pickPrescribedPlan([plan({ week_start: '2026-09-31' })], today)).toBeNull();
    const long = buildPrescribedWeek(plan({ week_end: '2027-12-31' }), [], now, today);
    expect(long.days).toHaveLength(14);
    const backwards = buildPrescribedWeek(plan({ week_end: '2026-01-01' }), [], now, today);
    expect(backwards.days).toHaveLength(7);
  });

  it('says the dates are not available rather than inventing a week', () => {
    const week = buildPrescribedWeek(plan({ week_start: 'soon' }), [item({ id: 'a' })], now, today);
    expect(week.rangeLabel).toBe('Dates not available');
    expect(week.days).toEqual([]);
    expect(week.outsideWeek.map((t) => t.id)).toEqual(['a']);
  });
});

describe('planTaskHref', () => {
  it('opens the actual linked record without launching the runner', () => {
    expect(planTaskHref({ metadata_json: { action: { kind: 'drill', ref_id: 'g1', route: '/guided/g1' } }, classroom_item_id: 'ci' }))
      .toBe('/guided/g1');
    // The stored homework route launches /drill directly; the scan opens the
    // assignment page instead.
    expect(planTaskHref({ metadata_json: { action: { kind: 'homework', ref_id: 'h1', route: '/drill?assignmentId=h1' } }, classroom_item_id: 'ci' }))
      .toBe('/classroom/h1');
  });

  it('falls back to the task\'s own classroom page, or nothing', () => {
    expect(planTaskHref({ metadata_json: {}, classroom_item_id: 'ci-1' })).toBe('/classroom/item/ci-1');
    expect(planTaskHref({ metadata_json: {}, classroom_item_id: null })).toBeNull();
  });
});
