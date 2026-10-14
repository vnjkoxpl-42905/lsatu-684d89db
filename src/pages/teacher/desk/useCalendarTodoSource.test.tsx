import { describe, expect, it, vi } from 'vitest';
import { scheduleEventToTodo } from './useCalendarTodoSource';
import type { ScheduleEventRow } from './scheduleEvents';

function event(overrides: Partial<ScheduleEventRow> = {}): ScheduleEventRow {
  return {
    id: 'event-1',
    google_event_id: 'gcal-1',
    calendar_id: 'primary',
    title: 'Lydia LSAT session',
    description: 'Review sufficient assumption misses.',
    location: 'Zoom',
    start_at: '2026-06-19T18:00:00Z',
    end_at: '2026-06-19T19:00:00Z',
    all_day: false,
    status: 'confirmed',
    html_link: 'https://calendar.google.com/event?eid=abc',
    source: 'google',
    deleted_at: null,
    ...overrides,
  };
}

describe('scheduleEventToTodo', () => {
  it('turns a future Google Calendar event into a calendar to-do', () => {
    vi.setSystemTime(new Date('2026-06-19T12:00:00Z'));

    expect(scheduleEventToTodo(event())).toMatchObject({
      sourceKind: 'calendar',
      label: 'Calendar',
      eventId: 'event-1',
      title: 'Lydia LSAT session',
      preview: 'Review sufficient assumption misses.',
      openPath: '/teacher/schedule?event=event-1',
      dismissExpiresAt: '2026-06-19T19:00:00Z',
    });
  });
});
