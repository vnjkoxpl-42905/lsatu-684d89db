import { useMemo } from 'react';
import { format } from 'date-fns';
import { useGoogleCalendarBackgroundSync, useUpcomingScheduleEvents, type ScheduleEventRow } from './scheduleEvents';
import { todoScore } from './teacherTodoScore';
import type { CalendarTodoItem } from './teacherTodoTypes';

function calendarTiming(startAt: string) {
  const start = new Date(startAt);
  const now = new Date();
  const sameDay = format(start, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
  if (sameDay) return format(start, 'h:mm a');
  return format(start, 'MMM d, h:mm a');
}

export function scheduleEventToTodo(event: ScheduleEventRow): CalendarTodoItem {
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
    // A session inside the imminent window jumps the whole queue; otherwise a
    // calendar entry sits below work and email, ordered by how soon it starts.
    sortScore: todoScore({ band: 'calendar', timestamp: event.start_at, imminentAt: event.start_at }),
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
