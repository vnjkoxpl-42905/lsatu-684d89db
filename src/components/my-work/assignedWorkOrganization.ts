import type { AssignedTodoRow } from '@/hooks/useAssignedTodoFeed';
import { READING_CENTER_SOURCE } from '@/lib/readingCenterAccess';

export const WORK_SUBJECT_LABELS: Record<string, string> = {
  lr: 'Logical Reasoning', rc: 'Reading Comprehension', mixed: 'LR and RC', unknown: 'Other work',
};
const WORK_KIND_LABELS = { homework: 'Practice set', ta: 'Assignment', activity: 'Activity', guided: 'Guided drill', bootcamp: 'Course', plan: 'Weekly task', practice_test: 'Practice test', link: 'Link' } as const;
export const WORK_KINDS = [...Object.values(WORK_KIND_LABELS), 'Reading Center'];

export function workKindLabel(row: AssignedTodoRow): string {
  if (row.sourceTable === READING_CENTER_SOURCE) return 'Reading Center';
  return WORK_KIND_LABELS[row.kind] ?? 'Assignment';
}

export function workDateLabel(value: string | undefined): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

/**
 * What a student sees for a row. Display only: opening work never changes the
 * stored status, so completion still comes from saved work evidence.
 */
export type WorkDisplayState = 'to_start' | 'continue' | 'completed' | 'unverified';

export function workDisplayState(row: AssignedTodoRow): WorkDisplayState {
  if (row.status === 'completed') return 'completed';
  if (row.progressUnverified) return 'unverified';
  if (row.status === 'in_progress' || (row.status === 'assigned' && Boolean(row.openedAt))) return 'continue';
  return 'to_start';
}

export const WORK_ACTION_LABEL: Record<WorkDisplayState, string> = { to_start: 'Start', continue: 'Continue', completed: 'Review', unverified: 'Open' };

/** One plain line about where the student is. Never invents a count. */
export function workProgressLine(row: AssignedTodoRow): string {
  const state = workDisplayState(row);
  if (state === 'completed') return 'Finished';
  if (state === 'unverified') return 'Not checked yet';
  if (state === 'continue') return row.status === 'in_progress' ? 'Started, not finished' : 'Opened, not started';
  return 'Not started';
}

/** Preserve the feed's ordering and identities within each evidence-backed group. */
export function groupAssignedWork(rows: AssignedTodoRow[], completed: boolean) {
  if (completed) return rows.length ? [{ label: 'Completed assignments', rows }] : [];
  return [
    { label: 'Continue', rows: rows.filter((row) => workDisplayState(row) === 'continue') },
    { label: 'To start', rows: rows.filter((row) => workDisplayState(row) === 'to_start') },
    { label: 'Progress to confirm', rows: rows.filter((row) => workDisplayState(row) === 'unverified') },
  ].filter((group) => group.rows.length > 0);
}
