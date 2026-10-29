import type { GuidedWorkEvidence, HomeworkWorkEvidence } from './studentWorkEvidence';

/**
 * An assignment is an issued instance of work, not the content it points to.
 * The same drill or activity can be assigned more than once, and each issue
 * must keep its own status and place in the student's history.
 */
export type StudentWorkSource =
  | 'homework_assignments'
  | 'ta_assignments'
  | 'guided_drill_assignments'
  | 'activity_assignments'
  | 'classroom_items';

export type StudentWorkStatus = 'assigned' | 'in_progress' | 'completed';

export interface StudentWorkIdentity {
  sourceTable: StudentWorkSource | string;
  /** Primary key of the issued assignment row, never a drill or activity ID. */
  assignmentId: string;
}

export function studentWorkKey({ sourceTable, assignmentId }: StudentWorkIdentity): string {
  return `${sourceTable}:${assignmentId}`;
}

/** Viewing instructions or an assignment does not start work. */
export function guidedWorkStatus(row: {
  status: 'assigned' | 'read' | 'started' | 'completed';
  completed_at: string | null;
}, saved?: GuidedWorkEvidence): StudentWorkStatus {
  if (row.status === 'completed' && row.completed_at) return 'completed';
  if (saved?.savedAnswerCount && saved.status === 'completed') return 'completed';
  if (saved?.savedAnswerCount) return 'in_progress';
  return 'assigned';
}

/** Homework is opened on first render; only a saved answer begins it. */
export function homeworkWorkStatus(row: {
  status: 'assigned' | 'in_progress' | 'completed';
  completed_at: string | null;
}, saved?: HomeworkWorkEvidence): StudentWorkStatus {
  if (row.status === 'completed' && row.completed_at) return 'completed';
  if (saved?.savedAnswerCount && saved.status === 'completed') return 'completed';
  if (saved?.savedAnswerCount) return 'in_progress';
  return 'assigned';
}

/** A saved response starts teacher-assigned written work; opening it does not. */
export function teacherWorkStatus(row: {
  status: 'assigned' | 'viewed' | 'completed';
  response_saved_at?: string | null;
  completed_at: string | null;
}): StudentWorkStatus {
  if (row.status === 'completed' && row.completed_at) return 'completed';
  if (row.response_saved_at) return 'in_progress';
  return 'assigned';
}

/** An Activity starts when a response is persisted, not when its page opens. */
export function activityWorkStatus(row: {
  status: 'assigned' | 'in_progress' | 'completed' | 'abandoned';
  completed_at: string | null;
}, hasSavedResponse: boolean): StudentWorkStatus {
  if (row.status === 'completed' && row.completed_at) return 'completed';
  return hasSavedResponse ? 'in_progress' : 'assigned';
}
