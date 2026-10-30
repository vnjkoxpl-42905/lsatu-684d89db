import { describe, expect, it } from 'vitest';
import { parseScheduleTemplateText } from './scheduleTemplateParser';

describe('parseScheduleTemplateText', () => {
  it('parses day headings with bullet tasks', () => {
    expect(
      parseScheduleTemplateText(`
        Monday
        - Read flaw lesson (25 min)
        - Drill 10 flaw questions

        Wednesday:
        1. Blind review set (45 minutes)
      `),
    ).toEqual([
      {
        day_offset: 0,
        title: 'Read flaw lesson',
        estimated_minutes: 25,
        deadline_offset_minutes: null,
      },
      {
        day_offset: 0,
        title: 'Drill 10 flaw questions',
        estimated_minutes: null,
        deadline_offset_minutes: null,
      },
      {
        day_offset: 2,
        title: 'Blind review set',
        estimated_minutes: 45,
        deadline_offset_minutes: null,
      },
    ]);
  });

  it('parses inline day labels', () => {
    expect(parseScheduleTemplateText('Mon: Logic games redo (30m)\nFri: Review notes')).toEqual([
      {
        day_offset: 0,
        title: 'Logic games redo',
        estimated_minutes: 30,
        deadline_offset_minutes: null,
      },
      {
        day_offset: 4,
        title: 'Review notes',
        estimated_minutes: null,
        deadline_offset_minutes: null,
      },
    ]);
  });
});

