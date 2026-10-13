export type TeacherTodoSourceKind = 'gmail' | 'calendar' | 'desk-task';

export type TeacherTodoPriorityBand = 'email' | 'calendar' | 'work';

export interface TeacherTodoBase {
  id: string;
  sourceKind: TeacherTodoSourceKind;
  sourceId: string;
  priorityBand: TeacherTodoPriorityBand;
  label: 'Email' | 'Calendar' | 'Reply' | 'Review' | 'Assign' | 'Schedule';
  subject: string;
  title: string;
  preview: string;
  timing: string;
  sortScore: number;
  openPath?: string;
  dismissExpiresAt?: string | null;
}

export interface GmailTodoItem extends TeacherTodoBase {
  sourceKind: 'gmail';
  label: 'Email';
  threadId: string;
  from: string;
  fromName: string;
  fromEmail: string;
  subjectLine: string;
  snippet: string;
  internalDate: number;
}

export interface CalendarTodoItem extends TeacherTodoBase {
  sourceKind: 'calendar';
  label: 'Calendar';
  eventId: string;
  startAt: string;
  endAt: string;
  location: string | null;
  htmlLink: string | null;
  description: string | null;
}

export interface DeskTaskTodoItem extends TeacherTodoBase {
  sourceKind: 'desk-task';
  deskTaskId: string;
  deskSourceKind: string;
}

export type TeacherTodoItem = GmailTodoItem | CalendarTodoItem | DeskTaskTodoItem;
