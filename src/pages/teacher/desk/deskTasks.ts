import { format } from 'date-fns';
import {
  ClipboardList,
  BookOpen,
  FileText,
  HardDrive,
  Mail,
  MessageSquare,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AITADraft } from '@/hooks/useAITADrafts';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import type { ExternalWorkUpload } from '@/hooks/useExternalWorkUploads';
import type { HubStudentRow } from '@/hooks/useHubStudents';
import type { Conversation } from '@/hooks/useInbox';
import { todoScore } from './teacherTodoScore';
import type { DeskTaskTodoItem } from './teacherTodoTypes';

export type DeskMode = 'reply' | 'review' | 'assign';
export type WorkspaceKey = 'today' | 'people' | 'messages' | 'gmail' | 'drive' | 'library';
export type ContextKey = 'student' | 'source';
export type SourceKind = 'conversation' | 'draft' | 'upload' | 'assignment-gap' | 'schedule';
export type AssistantScope = 'task' | 'workspace';

export interface DeskTask {
  id: string;
  mode: DeskMode;
  verb: 'Reply' | 'Review' | 'Assign' | 'Schedule';
  subject: string;
  reason: string;
  timing: string;
  sourceLabel: string;
  title: string;
  preview: string;
  studentId?: string;
  studentName?: string;
  suggested?: boolean;
  priority: number;
  /**
   * When the thing behind this task happened, or is due to happen. Feeds the
   * queue's shared recency term (teacherTodoScore); `priority` still orders the
   * older mode-scoped rails. Absent when the task has no moment of its own —
   * an assignment-gap suggestion is true until acted on, not "recent".
   */
  occurredAt?: string | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  openPath: string;
  sourceKind: SourceKind;
  sourceId?: string;
  editableText?: string;
}

export const SESSION_MODE_KEY = 'teacher-desk-preview-mode';

export const MODE_ORDER: DeskMode[] = ['reply', 'review', 'assign'];

export const MODE_META: Record<
  DeskMode,
  {
    label: 'Reply' | 'Review' | 'Assign';
    description: string;
    empty: string;
    emptyActionLabel: string;
    emptyActionPath: string;
    viewAllLabel: string;
    viewAllPath: string;
    Icon: LucideIcon;
  }
> = {
  reply: {
    label: 'Reply',
    description: 'Student messages waiting on Joshua.',
    empty: 'No replies waiting',
    emptyActionLabel: 'Open conversations',
    emptyActionPath: '/teacher/conversations',
    viewAllLabel: 'Open Reply',
    viewAllPath: '/teacher/conversations',
    Icon: MessageSquare,
  },
  review: {
    label: 'Review',
    description: 'Drafts, uploads, and student work requiring judgment.',
    empty: 'No reviews waiting',
    emptyActionLabel: 'Open People',
    emptyActionPath: '/teacher/students',
    viewAllLabel: 'Open Review',
    viewAllPath: '/teacher/command?tab=drafts',
    Icon: FileText,
  },
  assign: {
    label: 'Assign',
    description: 'Students who need a next assignment decision.',
    empty: 'No assignments suggested',
    emptyActionLabel: 'Open Assign',
    emptyActionPath: '/teacher/library/assignments/new',
    viewAllLabel: 'Open Assign',
    viewAllPath: '/teacher/library/assignments/new',
    Icon: ClipboardList,
  },
};

export const DESK_WORKSPACES: { key: WorkspaceKey; label: string; Icon: LucideIcon }[] = [
  { key: 'today', label: 'Today', Icon: Sparkles },
  { key: 'people', label: 'People', Icon: Users },
  { key: 'messages', label: 'Messages', Icon: MessageSquare },
  { key: 'gmail', label: 'Gmail', Icon: Mail },
  { key: 'drive', label: 'Drive', Icon: HardDrive },
  { key: 'library', label: 'Library', Icon: BookOpen },
];

export function isWorkspaceKey(value: string | null): value is WorkspaceKey {
  return (
    value === 'today' ||
    value === 'people' ||
    value === 'messages' ||
    value === 'gmail' ||
    value === 'drive' ||
    value === 'library'
  );
}

export function normalizeWorkspaceKey(value: string | null): WorkspaceKey {
  if (value === 'students' || value === 'admin') return 'people';
  if (value === 'inbox') return 'messages';
  return isWorkspaceKey(value) ? value : 'today';
}

export function studentName(student?: Pick<HubStudentRow, 'display_name' | 'email'> | null) {
  return student?.display_name?.trim() || student?.email || 'Student';
}

export function completionRate(student: HubStudentRow) {
  if (student.assignments_total === 0) return 0;
  return Math.round((student.assignments_completed / student.assignments_total) * 100);
}

export function plainAge(iso: string | null | undefined) {
  if (!iso) return 'Today';
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'Today';
  const diff = Date.now() - then;
  const minutes = Math.max(1, Math.round(diff / 60_000));
  if (minutes < 60) return `${minutes}m waiting`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h waiting`;
  return format(new Date(then), 'MMM d');
}

export function scheduleTiming(iso: string | null | undefined) {
  if (!iso) return 'Today';
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'Today';
  const date = new Date(then);
  const today = new Date();
  const dateKey = format(date, 'yyyy-MM-dd');
  const todayKey = format(today, 'yyyy-MM-dd');
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (dateKey === todayKey) return 'Today';
  if (dateKey === format(tomorrow, 'yyyy-MM-dd')) return 'Tomorrow';
  return format(date, 'MMM d');
}

function draftTypeLabel(draft: AITADraft) {
  return draft.draft_type.replace(/_/g, ' ');
}

function uploadLabel(upload: ExternalWorkUpload) {
  return upload.upload_type.replace(/_/g, ' ');
}

function stripMarkdown(value: string) {
  return value.replace(/[#*_`>\-[\]]/g, '').replace(/\s+/g, ' ').trim();
}

function previewText(value: string | null | undefined, fallback: string) {
  const clean = stripMarkdown(value ?? '');
  return clean.length > 0 ? clean.slice(0, 240) : fallback;
}

export function modeFromStorage(): DeskMode | null {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(SESSION_MODE_KEY);
  return stored === 'reply' || stored === 'review' || stored === 'assign' ? stored : null;
}

export function conversationToReplyTask(conversation: Conversation): DeskTask {
  const studentParticipant = conversation.participants.find((participant) => !participant.is_admin);
  const name = studentParticipant?.display_name?.trim() || 'Student';
  const lastMessage = conversation.last_message;
  return {
    id: `reply-${conversation.id}`,
    mode: 'reply',
    verb: 'Reply',
    subject: name,
    reason: conversation.subject || 'Unread student message',
    timing: plainAge(lastMessage?.created_at ?? conversation.last_message_at),
    sourceLabel: 'Unread message',
    title: `Reply to ${name}`,
    preview: previewText(lastMessage?.body, 'Student message is waiting in the conversation.'),
    studentId: studentParticipant?.user_id,
    studentName: name,
    priority: 100 + Date.parse(lastMessage?.created_at ?? conversation.last_message_at) / 10_000_000_000,
    occurredAt: lastMessage?.created_at ?? conversation.last_message_at,
    primaryActionLabel: 'Send reply',
    secondaryActionLabel: 'Open conversation',
    openPath: '/teacher/conversations',
    sourceKind: 'conversation',
    sourceId: conversation.id,
    editableText: '',
  };
}

export function draftToReviewTask(draft: AITADraft, student?: HubStudentRow): DeskTask {
  const name = studentName(student);
  const label = draftTypeLabel(draft);
  return {
    id: `draft-${draft.id}`,
    mode: 'review',
    verb: 'Review',
    subject: name,
    reason: `${label} draft waiting`,
    timing: plainAge(draft.created_at),
    sourceLabel: 'Draft waiting',
    title: `Review ${label} for ${name}`,
    preview: previewText(draft.draft_markdown ?? draft.prompt, 'Assistant draft is waiting for approval.'),
    studentId: draft.student_id,
    studentName: name,
    suggested: true,
    priority: 92 + Date.parse(draft.created_at) / 10_000_000_000,
    occurredAt: draft.created_at,
    primaryActionLabel: label.includes('recap') ? 'Approve recap' : 'Approve draft',
    secondaryActionLabel: 'Open drafts',
    openPath: '/teacher/command?tab=drafts',
    sourceKind: 'draft',
    sourceId: draft.id,
    editableText: draft.draft_markdown ?? '',
  };
}

export function uploadToReviewTask(upload: ExternalWorkUpload, student?: HubStudentRow): DeskTask {
  const name = studentName(student);
  return {
    id: `upload-${upload.id}`,
    mode: 'review',
    verb: 'Review',
    subject: name,
    reason: upload.file_name,
    timing: plainAge(upload.created_at),
    sourceLabel: 'Upload received',
    title: `Review upload from ${name}`,
    preview: `${uploadLabel(upload)} file needs a teacher pass before it becomes next work: ${upload.file_name}`,
    studentId: upload.student_id,
    studentName: name,
    priority: 85 + Date.parse(upload.created_at) / 10_000_000_000,
    occurredAt: upload.created_at,
    primaryActionLabel: 'Mark reviewed',
    secondaryActionLabel: 'Open uploads',
    openPath: '/teacher/library/uploads',
    sourceKind: 'upload',
    sourceId: upload.id,
  };
}

function classroomTypeLabel(item: ClassroomItem) {
  return item.type.replace(/_/g, ' ');
}

function classroomItemDate(item: ClassroomItem) {
  return item.due_at ?? item.unlock_at ?? item.created_at;
}

export function classroomItemToScheduleTask(item: ClassroomItem, student?: HubStudentRow): DeskTask {
  const name = studentName(student);
  const when = classroomItemDate(item);
  const whenMs = Date.parse(when);
  const daysUntil = Number.isFinite(whenMs) ? Math.max(0, (whenMs - Date.now()) / (24 * 60 * 60 * 1000)) : 0;
  return {
    id: `schedule-${item.id}`,
    mode: 'assign',
    verb: 'Schedule',
    subject: name,
    reason: item.title,
    timing: scheduleTiming(when),
    sourceLabel: 'Calendar item',
    title: `${item.title} for ${name}`,
    preview: previewText(item.description ?? item.content_markdown, `${classroomTypeLabel(item)} is on the calendar.`),
    studentId: item.student_id,
    studentName: name,
    priority: 82 + Math.max(0, SCHEDULE_LOOKAHEAD_DAYS - daysUntil),
    occurredAt: when,
    primaryActionLabel: 'Open schedule',
    secondaryActionLabel: 'Open student',
    openPath: `/teacher/schedule?student=${encodeURIComponent(item.student_id)}`,
    sourceKind: 'schedule',
    sourceId: item.id,
  };
}

export function studentToAssignTask(student: HubStudentRow): DeskTask {
  const completion = completionRate(student);
  const name = studentName(student);
  return {
    id: `assign-${student.class_id}`,
    mode: 'assign',
    verb: 'Assign',
    subject: name,
    reason: `${completion}% complete`,
    timing: 'Before next session',
    sourceLabel: 'Assignment suggested',
    title: `Assign next work to ${name}`,
    preview: `${name} has completed most assigned work. Choose the next useful guided drill.`,
    studentId: student.class_id,
    studentName: name,
    suggested: true,
    priority: 72 + completion / 10,
    primaryActionLabel: 'Assign work',
    secondaryActionLabel: 'Open student',
    openPath: `/teacher/library/assignments/new?student=${encodeURIComponent(student.class_id)}`,
    sourceKind: 'assignment-gap',
    sourceId: student.class_id,
  };
}

export function sortTasks(tasks: DeskTask[]) {
  return [...tasks].sort((a, b) => b.priority - a.priority);
}

export function deskTaskToTodoItem(task: DeskTask): DeskTaskTodoItem {
  return {
    id: `desk-task:${task.id}`,
    sourceKind: 'desk-task',
    sourceId: task.id,
    deskTaskId: task.id,
    deskSourceKind: task.sourceKind,
    priorityBand: 'work',
    label: task.verb,
    subject: task.subject,
    title: task.title,
    preview: task.reason,
    timing: task.timing,
    sortScore: todoScore({ band: 'work', timestamp: task.occurredAt }),
    openPath: task.openPath,
    dismissExpiresAt: null,
  };
}

/**
 * Staleness windows for the desk to-do rail. A task whose source is older than
 * TASK_STALE_DAYS has gone cold and should drop off; an "Assign" suggestion is
 * only relevant for a student seen within ACTIVE_STUDENT_DAYS (so dormant former
 * students never linger as a standing to-do).
 */
export const TASK_STALE_DAYS = 5;
export const ACTIVE_STUDENT_DAYS = 14;
export const SCHEDULE_LOOKAHEAD_DAYS = 14;

export function isWithinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return false;
  return Date.now() - then <= days * 24 * 60 * 60 * 1000;
}

export function isWithinUpcomingDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return false;
  const now = Date.now();
  return then >= now - 24 * 60 * 60 * 1000 && then <= now + days * 24 * 60 * 60 * 1000;
}

export function firstName(value: string | undefined | null) {
  const full = (value ?? '').trim();
  if (!full) return 'this student';
  return full.split(/\s+/)[0];
}

export type ChipKicker = 'Reply' | 'Review' | 'Assign' | 'Schedule' | 'Ask';

export interface PriorityChip {
  id: string;
  kicker: ChipKicker;
  label: string;
  /** null for the freeform Ask chip. */
  task: DeskTask | null;
}

function chipLabel(task: DeskTask) {
  const name = firstName(task.studentName ?? task.subject);
  if (task.mode === 'reply') return `Reply to ${name}`;
  if (task.sourceKind === 'schedule') return `Schedule for ${name}`;
  if (task.mode === 'assign') return `Assign ${name}`;
  // review
  if (task.sourceKind === 'upload') return `Review ${name}'s upload`;
  return task.reason.toLowerCase().includes('recap')
    ? `Approve ${name}'s recap`
    : `Approve ${name}'s draft`;
}

/**
 * Top cross-mode priorities for the assistant empty state. Deliberately NOT a
 * duplicate of the left list (which shows the top-3 of the *selected* mode):
 * this takes the single highest-priority task from each mode, ranks across
 * modes, and appends a freeform Ask chip.
 */
export function buildPriorityChips(tasksByMode: Record<DeskMode, DeskTask[]>): PriorityChip[] {
  const top = MODE_ORDER.map((mode) => tasksByMode[mode][0])
    .filter((task): task is DeskTask => Boolean(task))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((task) => ({
      id: `chip-${task.id}`,
      kicker: task.verb as ChipKicker,
      label: chipLabel(task),
      task,
    }));
  return [...top, { id: 'chip-ask', kicker: 'Ask' as const, label: 'Ask about the workspace', task: null }];
}

/** Typed per-task context the desk attaches to a seeded assistant turn. */
export interface DeskContext {
  surface: 'teacher_desk';
  taskId: string;
  mode: DeskMode;
  studentId?: string;
  sourceKind: SourceKind;
  sourceId?: string;
  sourcePreview?: string;
}

export function buildTaskContext(task: DeskTask): DeskContext {
  return {
    surface: 'teacher_desk',
    taskId: task.id,
    mode: task.mode,
    studentId: task.studentId,
    sourceKind: task.sourceKind,
    sourceId: task.sourceId,
    sourcePreview: task.preview?.slice(0, 280),
  };
}

/**
 * The real consequence of approving a task's card — never a generic "Approve."
 * Cards must label what actually happens when Joshua confirms.
 */
export function approveLabel(task: DeskTask): string {
  switch (task.sourceKind) {
    case 'conversation':
      return 'Send to student';
    case 'draft':
      return task.reason.toLowerCase().includes('recap') ? 'Post recap' : 'Approve draft';
    case 'upload':
      return 'Mark reviewed';
    case 'assignment-gap':
      return 'Assign drill';
    case 'schedule':
      return 'Open schedule';
    default:
      return 'Approve';
  }
}

/** Past-tense confirmation shown on a completed card. */
export function approvedLabel(task: DeskTask): string {
  switch (task.sourceKind) {
    case 'conversation':
      return 'Sent to student';
    case 'draft':
      return task.reason.toLowerCase().includes('recap') ? 'Recap posted' : 'Draft approved';
    case 'upload':
      return 'Marked reviewed';
    case 'assignment-gap':
      return 'Drill assigned';
    case 'schedule':
      return 'Schedule opened';
    default:
      return 'Done';
  }
}

/**
 * The visible command the assistant seeds when a chip or left task is clicked,
 * so the action is legible in the transcript rather than silent. Per-task typed
 * context (studentId, sourceKind, ...) is attached separately by the caller.
 */
export function buildSeedCommand(task: DeskTask): string {
  const name = task.studentName ?? task.subject;
  switch (task.sourceKind) {
    case 'conversation':
      return `Draft a reply to ${name} about: "${task.reason}".`;
    case 'draft':
      return `Refine the ${task.reason.replace(/ waiting$/i, '')} for ${name} and show it for my approval.`;
    case 'upload':
      return `Review ${name}'s upload (${task.reason}) and draft what needs a teacher pass.`;
    case 'assignment-gap':
      return `Recommend the next assignment for ${name} and draft it for my approval.`;
    case 'schedule':
      return `Help me prepare for ${name}'s scheduled item: "${task.reason}".`;
    default:
      return `Help me with: ${task.title}.`;
  }
}
