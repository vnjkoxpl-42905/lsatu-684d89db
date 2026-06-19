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
    return sortTeacherTodos(filterDismissed([...gmail.items, ...calendar.items, ...legacy], dismissals.data ?? []));
  }, [calendar.items, dismissals.data, gmail.items, legacyTasks]);

  return {
    items,
    loading: gmail.isLoading || calendar.isLoading || dismissals.isLoading,
    error: gmail.error ?? calendar.error ?? dismissals.error,
  };
}
