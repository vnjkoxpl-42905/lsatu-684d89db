import type { AssignedTodoRow } from '@/hooks/useAssignedTodoFeed';
import { READING_CENTER_SOURCE } from '@/lib/readingCenterAccess';

export function workKindLabel(row: AssignedTodoRow): string {
  if (row.sourceTable === READING_CENTER_SOURCE) return 'Reading Center';
  return ({ homework: 'Practice set', ta: 'Assignment', activity: 'Activity', guided: 'Guided drill', bootcamp: 'Course', plan: 'Weekly task' } as const)[row.kind] ?? 'Assignment';
}

export function workDateLabel(value: string | undefined): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

/** Preserve the feed's ordering and identities within each evidence-backed group. */
export function groupAssignedWork(rows: AssignedTodoRow[], completed: boolean) {
  if (completed) return rows.length ? [{ label: 'Completed assignments', rows }] : [];
  return [
    { label: 'In progress', rows: rows.filter((row) => row.status === 'in_progress' && !row.progressUnverified) },
    { label: 'To start', rows: rows.filter((row) => row.status === 'assigned' && !row.progressUnverified) },
    { label: 'Progress to confirm', rows: rows.filter((row) => row.progressUnverified) },
  ].filter((group) => group.rows.length > 0);
}
