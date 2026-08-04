import { describe, it, expect } from 'vitest';
import { DEFAULT_STUDY_DAYS, planWeekDays } from './curriculumSchedule';
import type { CurriculumEntry } from './curriculum';

/** 2026-08-03 is a Monday. */
const MONDAY = '2026-08-03';

function entry(n: number, minutes: number | null = 30): CurriculumEntry {
  return {
    trackItemId: `item-${n}`,
    guidedDrillId: `drill-${n}`,
    position: n,
    suggestedWeek: null,
    estimatedMinutes: minutes,
    isOptional: false,
    level: null,
    inserted: false,
    moved: false,
  };
}

const flat = (days: { entries: CurriculumEntry[] }[]) =>
  days.flatMap((d) => d.entries.map((e) => e.guidedDrillId));

describe('planWeekDays', () => {
  it('places work on weekdays only, starting from the week start', () => {
    const days = planWeekDays([entry(1), entry(2), entry(3)], {
      weekStart: MONDAY,
      minutesPerDay: 30,
    });
    expect(days.map((d) => d.dayDate)).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
  });

  it('fills a day before moving to the next, rather than round-robining', () => {
    // 60 min/day, 30 min each: two drills per day, consecutively.
    const days = planWeekDays([entry(1), entry(2), entry(3), entry(4)], {
      weekStart: MONDAY,
      minutesPerDay: 60,
    });
    expect(days).toHaveLength(2);
    expect(days[0].entries.map((e) => e.guidedDrillId)).toEqual(['drill-1', 'drill-2']);
    expect(days[1].entries.map((e) => e.guidedDrillId)).toEqual(['drill-3', 'drill-4']);
  });

  it('never reorders the curriculum', () => {
    const entries = [entry(1), entry(2), entry(3), entry(4), entry(5)];
    const days = planWeekDays(entries, { weekStart: MONDAY, minutesPerDay: 45 });
    expect(flat(days)).toEqual(['drill-1', 'drill-2', 'drill-3', 'drill-4', 'drill-5']);
  });

  it('lets one over-budget drill occupy a day rather than dropping it', () => {
    const days = planWeekDays([entry(1, 500)], { weekStart: MONDAY, minutesPerDay: 60 });
    expect(days).toHaveLength(1);
    expect(days[0].entries).toHaveLength(1);
  });

  it('places every entry even when the week overflows', () => {
    // 12 drills at 30 min into 5 days at 60 min: the last day absorbs the rest.
    const entries = Array.from({ length: 12 }, (_, i) => entry(i + 1));
    const days = planWeekDays(entries, { weekStart: MONDAY, minutesPerDay: 60 });
    expect(flat(days)).toHaveLength(12);
    expect(days.length).toBeLessThanOrEqual(DEFAULT_STUDY_DAYS.length);
    expect(days.at(-1)!.entries.length).toBeGreaterThan(2);
  });

  it('honours a custom set of study days', () => {
    // Saturday and Sunday only.
    const days = planWeekDays([entry(1), entry(2)], {
      weekStart: MONDAY,
      studyDays: [0, 6],
      minutesPerDay: 30,
    });
    expect(days.map((d) => d.dayDate)).toEqual(['2026-08-08', '2026-08-09']);
  });

  it('reports the minutes on each day', () => {
    const days = planWeekDays([entry(1, 20), entry(2, 25), entry(3, 40)], {
      weekStart: MONDAY,
      minutesPerDay: 50,
    });
    expect(days[0].totalMinutes).toBe(45);
    expect(days[1].totalMinutes).toBe(40);
  });

  it('treats an unknown duration as free rather than as blocking', () => {
    const days = planWeekDays([entry(1, null), entry(2, null)], {
      weekStart: MONDAY,
      minutesPerDay: 60,
    });
    expect(days).toHaveLength(1);
    expect(days[0].totalMinutes).toBe(0);
  });

  it('returns no days at all when there is nothing to schedule', () => {
    expect(planWeekDays([], { weekStart: MONDAY })).toEqual([]);
  });

  it('returns nothing when no study day falls in the week', () => {
    expect(planWeekDays([entry(1)], { weekStart: MONDAY, studyDays: [] })).toEqual([]);
  });

  it('rejects a week start that is not a calendar date', () => {
    expect(() => planWeekDays([entry(1)], { weekStart: 'next monday' })).toThrow(
      /Not a calendar date/,
    );
  });

  it('starts the week on whatever day it is given', () => {
    // A Wednesday start: the first placed day is that Wednesday, not the Monday.
    const days = planWeekDays([entry(1)], { weekStart: '2026-08-05', minutesPerDay: 30 });
    expect(days[0].dayDate).toBe('2026-08-05');
  });
});
