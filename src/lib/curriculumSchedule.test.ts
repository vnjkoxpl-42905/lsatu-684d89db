import { describe, it, expect } from 'vitest';
import { planWeekDays } from './curriculumSchedule';
import { countDrillSlots, STANDARD_WEEK, type WeekTemplate } from './scheduleTemplate';
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

const drills = (days: { entries: CurriculumEntry[] }[]) =>
  days.flatMap((d) => d.entries.map((e) => e.guidedDrillId));

const titles = (day: { tasks: { title: string }[] }) => day.tasks.map((t) => t.title);

describe('planWeekDays — Joshua’s weekly template', () => {
  it('emits the week from the corpus: four skill days, Friday timed, Saturday rest, Sunday test', () => {
    const days = planWeekDays([], { weekStart: MONDAY });
    expect(days.map((d) => d.dayDate)).toEqual([
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      // 2026-08-08 is the Saturday rest day and is deliberately absent.
      '2026-08-09',
    ]);
  });

  it('never schedules the Saturday rest day', () => {
    const week = planWeekDays(Array.from({ length: 20 }, (_, i) => entry(i + 1)), {
      weekStart: MONDAY,
    });
    expect(week.map((d) => d.dayDate)).not.toContain('2026-08-08');
    expect(STANDARD_WEEK[6]).toBeUndefined();
  });

  it('places exactly one priority drill per skill day, in curriculum order', () => {
    const days = planWeekDays([entry(1), entry(2), entry(3), entry(4)], { weekStart: MONDAY });
    expect(drills(days)).toEqual(['drill-1', 'drill-2', 'drill-3', 'drill-4']);
    for (const day of days) {
      expect(day.entries.length).toBeLessThanOrEqual(1);
    }
  });

  it('rolls surplus curriculum to next week rather than doubling up a day', () => {
    // Ten drills, four skill days: six wait rather than turning a skill day
    // into a session.
    const days = planWeekDays(Array.from({ length: 10 }, (_, i) => entry(i + 1)), {
      weekStart: MONDAY,
    });
    expect(drills(days)).toEqual(['drill-1', 'drill-2', 'drill-3', 'drill-4']);
  });

  it('welds review onto every task rather than leaving it optional', () => {
    const [monday] = planWeekDays([entry(1)], { weekStart: MONDAY });
    expect(titles(monday)).toEqual([
      'Priority question type drill (untimed)',
      'Wrong answer journal',
      '1-2 RC passages (untimed)',
      'Wrong answer journal',
    ]);
  });

  it('makes Friday the one timed day and Sunday the full test', () => {
    const days = planWeekDays([], { weekStart: MONDAY });
    const friday = days.find((d) => d.dayDate === '2026-08-07')!;
    const sunday = days.find((d) => d.dayDate === '2026-08-09')!;

    expect(titles(friday)).toEqual([
      'RC or LR supersection (5 passages / 35 questions), timed',
      'Blind review and wrong answer journal',
    ]);
    expect(friday.tasks[0].estimatedMinutes).toBe(45);
    expect(titles(sunday)).toEqual(['Full practice test', 'Blind review and wrong answer journal']);
  });

  it('drops the drill line but keeps the day when the curriculum runs dry', () => {
    // One drill, four skill days: Tuesday onward is RC and review only.
    const days = planWeekDays([entry(1)], { weekStart: MONDAY });
    const tuesday = days.find((d) => d.dayDate === '2026-08-04')!;

    expect(tuesday.entries).toEqual([]);
    expect(titles(tuesday)).toEqual([
      'Wrong answer journal',
      '1-2 RC passages (untimed)',
      'Wrong answer journal',
    ]);
  });

  it('still emits the standing week when there is no curriculum at all', () => {
    const days = planWeekDays([], { weekStart: MONDAY });
    expect(days).toHaveLength(6);
    expect(drills(days)).toEqual([]);
    // The schedule is the week, not the drills. It does not vanish.
    expect(days.every((d) => d.tasks.length > 0)).toBe(true);
  });

  it('marks only the drill slot as curriculum work', () => {
    const [monday] = planWeekDays([entry(1)], { weekStart: MONDAY });
    const withEntries = monday.tasks.filter((t) => t.entry);
    expect(withEntries).toHaveLength(1);
    expect(withEntries[0].entry!.guidedDrillId).toBe('drill-1');
    expect(withEntries[0].title).toBe('Priority question type drill (untimed)');
  });

  it('reports the drill minutes on the day', () => {
    const [monday] = planWeekDays([entry(1, 25)], { weekStart: MONDAY });
    expect(monday.totalMinutes).toBe(25);
  });

  it('treats an unknown drill duration as free rather than as blocking', () => {
    const [monday] = planWeekDays([entry(1, null)], { weekStart: MONDAY });
    expect(monday.entries).toHaveLength(1);
    expect(monday.totalMinutes).toBe(0);
  });

  it('honours a student who cannot work every day', () => {
    // Weekends only: the Sunday test survives, Saturday is still rest.
    const days = planWeekDays([entry(1)], { weekStart: MONDAY, studyDays: [0, 6] });
    expect(days.map((d) => d.dayDate)).toEqual(['2026-08-09']);
    // No skill day, so the drill has nowhere to go.
    expect(drills(days)).toEqual([]);
  });

  it('counts the drill positions a week offers', () => {
    expect(countDrillSlots()).toBe(4);
    expect(countDrillSlots(STANDARD_WEEK, [1, 2])).toBe(2);
    // Friday and Sunday carry no drill slot.
    expect(countDrillSlots(STANDARD_WEEK, [5, 0])).toBe(0);
  });

  it('lays a different schedule over the same curriculum', () => {
    // A three-day week with the test on Saturday: same drills, different shape.
    const threeDays: WeekTemplate = {
      1: [{ title: 'Priority question type drill (untimed)', minutes: null, drillSlot: true }],
      3: [{ title: 'Priority question type drill (untimed)', minutes: null, drillSlot: true }],
      6: [{ title: 'Full practice test', minutes: null }],
    };
    const days = planWeekDays([entry(1), entry(2), entry(3)], {
      weekStart: MONDAY,
      template: threeDays,
    });

    expect(days.map((d) => d.dayDate)).toEqual(['2026-08-03', '2026-08-05', '2026-08-08']);
    // Two drill slots, so the third drill waits for next week.
    expect(drills(days)).toEqual(['drill-1', 'drill-2']);
    expect(titles(days[2])).toEqual(['Full practice test']);
  });

  it('returns nothing when no template day falls in the week', () => {
    expect(planWeekDays([entry(1)], { weekStart: MONDAY, studyDays: [] })).toEqual([]);
    // Saturday alone is rest, so it is not a week.
    expect(planWeekDays([entry(1)], { weekStart: MONDAY, studyDays: [6] })).toEqual([]);
  });

  it('rejects a week start that is not a calendar date', () => {
    expect(() => planWeekDays([entry(1)], { weekStart: 'next monday' })).toThrow(
      /Not a calendar date/,
    );
  });

  it('starts the week on whatever day it is given', () => {
    // A Wednesday start: the week runs Wed to Tue, still skipping Saturday.
    const days = planWeekDays([entry(1)], { weekStart: '2026-08-05' });
    expect(days[0].dayDate).toBe('2026-08-05');
    expect(days.map((d) => d.dayDate)).not.toContain('2026-08-08');
  });
});
