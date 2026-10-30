import { useMemo } from 'react';
import type { DeskTask } from './deskTasks';
import { deskTaskToTodoItem } from './deskTasks';
import { useCalendarTodoSource } from './useCalendarTodoSource';
import { useGmailTodoSource } from './useGmailTodoSource';
import { useTeacherTodoDismissals } from './teacherTodoDismissals';
import type { TeacherTodoItem } from './teacherTodoTypes';

function dismissalKey(sourceKind: string, sourceId: string) {
  return `${sourceKind}:${sourceId}`;
}

export function filterDismissed(items: TeacherTodoItem[], dismissals: Array<{ source_kind: string; source_id: string }>) {
  const hidden = new Set(dismissals.map((dismissal) => dismissalKey(dismissal.source_kind, dismissal.source_id)));
  return items.filter((item) => !hidden.has(dismissalKey(item.sourceKind, item.sourceId)));
}

/**
 * Start Here is a list of things waiting on Joshua right now. Two desk sources
 * are neither: an `assignment-gap` suggestion is a standing idea, and a
 * `schedule` row is simply a student's assignment with a due date — assigning
 * work should never post anything into the teacher's own calendar rail. Both
 * still exist in the Assign mode rails; they just stay out of this queue.
 */
const RAIL_EXCLUDED_DESK_SOURCES = new Set(['assignment-gap', 'schedule']);

export function filterRailSources(items: TeacherTodoItem[]) {
  return items.filter(
    (item) => item.sourceKind !== 'desk-task' || !RAIL_EXCLUDED_DESK_SOURCES.has(item.deskSourceKind),
  );
}

export function sortTeacherTodos(items: TeacherTodoItem[]) {
  return [...items].sort((a, b) => b.sortScore - a.sortScore);
}

export function useTeacherTodoQueue(legacyTasks: DeskTask[], options?: { externalSources?: boolean }) {
  const externalSources = options?.externalSources ?? true;
  const gmail = useGmailTodoSource(externalSources);
  const calendar = useCalendarTodoSource(externalSources);
  const dismissals = useTeacherTodoDismissals();

  const items = useMemo(() => {
    const legacy = legacyTasks.map(deskTaskToTodoItem);
    return sortTeacherTodos(
      filterRailSources(filterDismissed([...gmail.items, ...calendar.items, ...legacy], dismissals.data ?? [])),
    );
  }, [calendar.items, dismissals.data, gmail.items, legacyTasks]);

  return {
    items,
    loading: gmail.isLoading || calendar.isLoading || dismissals.isLoading,
    error: gmail.error ?? calendar.error ?? dismissals.error,
  };
}
