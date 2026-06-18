import { format } from 'date-fns';
import {
  ClipboardList,
  FileText,
  MessageSquare,
  Pencil,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { AITADraft } from '@/hooks/useAITADrafts';
import type { ExternalWorkUpload } from '@/hooks/useExternalWorkUploads';
import type { HubStudentRow } from '@/hooks/useHubStudents';
import type { Conversation } from '@/hooks/useInbox';

export type DeskMode = 'reply' | 'review' | 'assign';
export type ContextKey = 'student' | 'history' | 'analytics' | 'source';
export type AssistantScope = 'task' | 'workspace';
export type SourceKind = 'conversation' | 'draft' | 'upload' | 'assignment-gap';

export interface DeskTask {
  id: string;
  mode: DeskMode;
  verb: 'Reply' | 'Review' | 'Assign';
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
    emptyActionLabel: 'Open students',
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

export const GLOBAL_RAIL: { label: string; path: string; Icon: LucideIcon; active?: boolean }[] = [
  { label: 'Today', path: '/teacher', Icon: Sparkles, active: true },
  { label: 'Students', path: '/teacher/students', Icon: Users },
  { label: 'Assign', path: '/teacher/library/assignments/new', Icon: ClipboardList },
  { label: 'Teach', path: '/teacher/whiteboard', Icon: Pencil },
  { label: 'Admin', path: '/teacher/admin', Icon: Shield },
];

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
    primaryActionLabel: 'Mark reviewed',
    secondaryActionLabel: 'Open uploads',
    openPath: '/teacher/library/uploads',
    sourceKind: 'upload',
    sourceId: upload.id,
  };
}

export function studentToAssignTask(student: HubStudentRow): DeskTask {
  const completion = completionRate(student);
  const noAssignments = student.assignments_total === 0;
  const name = studentName(student);
  return {
    id: `assign-${student.class_id}`,
    mode: 'assign',
    verb: 'Assign',
    subject: name,
    reason: noAssignments ? 'No active assignment' : `${completion}% complete`,
    timing: noAssignments ? 'Today' : 'Before next session',
    sourceLabel: 'Assignment suggested',
    title: noAssignments ? `Assign first work to ${name}` : `Assign next work to ${name}`,
    preview: noAssignments
      ? `${name} does not have active assignment data yet. Start with a prepared guided drill.`
      : `${name} has completed most assigned work. Choose the next useful guided drill.`,
    studentId: student.class_id,
    studentName: name,
    suggested: true,
    priority: noAssignments ? 78 : 72 + completion / 10,
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
