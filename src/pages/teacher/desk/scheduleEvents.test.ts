import { describe, expect, it } from 'vitest';
import { getTeacherCalendarTodoWindow } from './scheduleEvents';

describe('getTeacherCalendarTodoWindow', () => {
  it('uses a one-day look-back and one-day look-ahead window', () => {
    expect(getTeacherCalendarTodoWindow(new Date('2026-06-19T12:00:00.000Z'))).toEqual({
      startsAfter: '2026-06-18T12:00:00.000Z',
      startsBefore: '2026-06-20T12:00:00.000Z',
      endsAfter: '2026-06-19T12:00:00.000Z',
    });
  });
});
