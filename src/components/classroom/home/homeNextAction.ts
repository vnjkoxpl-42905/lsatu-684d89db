import type { HomeKind, HomeRow } from './homeModel';

/** Practice reaches Completed through its saved work flow, never a Home checkbox. */
export function manualCompletionAllowed(kind: HomeKind, selfCompleting?: boolean): boolean {
  return !selfCompleting && (kind === 'ta' || kind === 'plan');
}

/** The copy explains the next action using only a deadline or saved work. */
export function nextActionFor(row: HomeRow): { label: 'Start' | 'Continue'; reason: string } {
  if (row.overdue) return { label: row.workStatus === 'in_progress' ? 'Continue' : 'Start', reason: 'This assignment is overdue.' };
  if (row.dueToday) return { label: row.workStatus === 'in_progress' ? 'Continue' : 'Start', reason: 'This assignment is due today.' };
  if (row.workStatus === 'in_progress') return { label: 'Continue', reason: 'You have saved work to pick up.' };
  return { label: 'Start', reason: 'This is your next assigned task.' };
}

export function workSummary(rows: Array<{ workStatus?: HomeRow['workStatus'] }>) {
  return {
    open: rows.length,
    inProgress: rows.filter((row) => row.workStatus === 'in_progress').length,
  };
}
