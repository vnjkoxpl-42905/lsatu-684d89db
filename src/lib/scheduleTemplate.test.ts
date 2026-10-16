import { describe, it, expect } from 'vitest';
import {
  countDrillSlots,
  parseWeekTemplate,
  STANDARD_WEEK,
  templateStudyDays,
} from './scheduleTemplate';

describe('STANDARD_WEEK', () => {
  it('is the week captured in the brain, not an invented one', () => {
    // Four skill days, each carrying exactly one priority-drill position.
    for (const weekday of [1, 2, 3, 4]) {
      const drillSlots = STANDARD_WEEK[weekday]!.filter((t) => t.drillSlot);
      expect(drillSlots).toHaveLength(1);
      expect(drillSlots[0].title).toMatch(/priority question type drill/i);
    }

    // Friday is the one timed day, Sunday the full test, Saturday rest.
    expect(STANDARD_WEEK[5]![0].minutes).toBe(45);
    expect(STANDARD_WEEK[0]![0].title).toMatch(/full practice test/i);
    expect(STANDARD_WEEK[6]).toBeUndefined();
  });

  it('welds review onto the timed days rather than leaving it optional', () => {
    for (const weekday of [5, 0]) {
      expect(STANDARD_WEEK[weekday]!.some((t) => /blind review/i.test(t.title))).toBe(true);
    }
  });

  it('gives the curriculum four positions a week and no more', () => {
    expect(countDrillSlots(STANDARD_WEEK)).toBe(4);
  });

  it('works six days and rests one', () => {
    expect(templateStudyDays(STANDARD_WEEK)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('parseWeekTemplate', () => {
  it('reads a stored week back', () => {
    const parsed = parseWeekTemplate({
      '1': [
        { title: 'Priority drill', minutes: null, drill_slot: true },
        { title: 'Wrong answer journal', minutes: null },
      ],
      '6': [{ title: 'Full practice test', minutes: 180 }],
    });

    expect(templateStudyDays(parsed)).toEqual([1, 6]);
    expect(parsed[1]![0].drillSlot).toBe(true);
    expect(parsed[1]![1].drillSlot).toBeUndefined();
    expect(parsed[6]![0].minutes).toBe(180);
  });

  it('drops one bad task without losing the rest of the day', () => {
    const parsed = parseWeekTemplate({
      '1': [{ title: 'Real work', minutes: null }, { title: '' }, { nope: true }, null, 'string'],
    });
    expect(parsed[1]).toHaveLength(1);
    expect(parsed[1]![0].title).toBe('Real work');
  });

  it('treats a day whose every task is unusable as rest, not as empty', () => {
    const parsed = parseWeekTemplate({ '1': [{ title: '   ' }], '2': [] });
    expect(parsed[1]).toBeUndefined();
    expect(parsed[2]).toBeUndefined();
  });

  it('ignores weekdays outside 0-6', () => {
    const parsed = parseWeekTemplate({
      '7': [{ title: 'Eighth day', minutes: null }],
      '-1': [{ title: 'Day before Sunday', minutes: null }],
      monday: [{ title: 'Named day', minutes: null }],
      '3': [{ title: 'Real Wednesday', minutes: null }],
    });
    expect(templateStudyDays(parsed)).toEqual([3]);
  });

  it('treats a non-numeric duration as untimed rather than guessing', () => {
    const parsed = parseWeekTemplate({ '1': [{ title: 'Drill', minutes: '45 minutes' }] });
    expect(parsed[1]![0].minutes).toBeNull();
  });

  it('survives a blob that is not a week at all', () => {
    expect(parseWeekTemplate(null)).toEqual({});
    expect(parseWeekTemplate([])).toEqual({});
    expect(parseWeekTemplate('week')).toEqual({});
    expect(parseWeekTemplate(undefined)).toEqual({});
  });

  it('round-trips the standard week through storage', () => {
    // What the migration seeds is what the app reads back.
    const stored = Object.fromEntries(
      Object.entries(STANDARD_WEEK).map(([day, tasks]) => [
        day,
        tasks!.map((t) => ({
          title: t.title,
          minutes: t.minutes,
          ...(t.drillSlot ? { drill_slot: true } : {}),
        })),
      ]),
    );
    expect(parseWeekTemplate(stored)).toEqual(STANDARD_WEEK);
  });
});
