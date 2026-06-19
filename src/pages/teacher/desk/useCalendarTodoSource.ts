import { useMemo } from 'react';
import { format } from 'date-fns';
import { useGoogleCalendarBackgroundSync, useUpcomingScheduleEvents, type ScheduleEventRow } from './scheduleEvents';
import type { CalendarTodoItem } from './teacherTodoTypes';

function calendarTiming(startAt: string) {
  const start = new Date(startAt);
  const now = new Date();
  const sameDay = format(start, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  if (sameDay) return format(start, 'h:mm a');
  return format(start, 'MMM d, h:mm a');
}

export function scheduleEventToTodo(event: ScheduleEventRow): CalendarTodoItem {
  const start = Date.parse(event.start_at);
  return {
    id: `calendar:${event.id}`,
    sourceKind: 'calendar',
    sourceId: event.id,
    eventId: event.id,
    priorityBand: 'calendar',
    label: 'Calendar',
    subject: event.title,
    title: event.title,
    preview: event.description || event.location || 'Upcoming calendar session.',
    timing: calendarTiming(event.start_at),
    sortScore: 2_000 + Math.max(0, 2_000_000_000 - start / 1_000_000),
    startAt: event.start_at,
    endAt: event.end_at,
    location: event.location,
    htmlLink: event.html_link,
    description: event.description,
    openPath: `/teacher/schedule?event=${encodeURIComponent(event.id)}`,
    dismissExpiresAt: event.end_at,
  };
}

export function useCalendarTodoSource(enabled = true) {
  useGoogleCalendarBackgroundSync(enabled);
  const query = useUpcomingScheduleEvents(enabled);
  const items = useMemo(() => (query.data ?? []).map(scheduleEventToTodo), [query.data]);
  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}
