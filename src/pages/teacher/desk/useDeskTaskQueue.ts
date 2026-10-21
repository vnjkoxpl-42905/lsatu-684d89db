import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAITADrafts } from '@/hooks/useAITADrafts';
import { useAllClassroomItems } from '@/hooks/useAllClassroomItems';
import { useAdminUploadsQueue } from '@/hooks/useExternalWorkUploads';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { useInbox } from '@/hooks/useInbox';
import {
  ACTIVE_STUDENT_DAYS,
  SCHEDULE_LOOKAHEAD_DAYS,
  TASK_STALE_DAYS,
  classroomItemToScheduleTask,
  conversationToReplyTask,
  draftToReviewTask,
  isWithinDays,
  isWithinUpcomingDays,
  sortTasks,
  studentToAssignTask,
  uploadToReviewTask,
  type DeskMode,
  type DeskTask,
} from './deskTasks';
import { useNextSession } from './useNextSession';
import { useTeacherTodoQueue } from './useTeacherTodoQueue';

export function isLocalPreviewHost() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

const PREVIEW_STUDENTS: HubStudentRow[] = [
  {
    class_id: 'preview-meghan',
    display_name: 'Meghan Mullins',
    email: 'meghan@example.com',
    last_seen_at: null,
    role: 'user',
    has_bootcamp_access: true,
    has_classroom_access: true,
    has_analytics_access: true,
    has_schedule_access: true,
    has_practice_access: true,
    has_drill_access: true,
    has_waj_access: true,
    has_flagged_access: true,
    has_chat_access: true,
    has_export_access: false,
    has_ta_access: false,
    assignments_total: 6,
    assignments_assigned: 1,
    assignments_viewed: 1,
    assignments_completed: 5,
    has_unread_from_student: true,
  },
  {
    class_id: 'preview-dakota',
    display_name: 'Dakota Brown',
    email: 'dakota@example.com',
    last_seen_at: null,
    role: 'user',
    has_bootcamp_access: true,
    has_classroom_access: true,
    has_analytics_access: true,
    has_schedule_access: true,
    has_practice_access: true,
    has_drill_access: true,
    has_waj_access: true,
    has_flagged_access: true,
    has_chat_access: true,
    has_export_access: false,
    has_ta_access: false,
    assignments_total: 0,
    assignments_assigned: 0,
    assignments_viewed: 0,
    assignments_completed: 0,
    has_unread_from_student: false,
  },
];

const PREVIEW_TASKS: Record<DeskMode, DeskTask[]> = {
  reply: [
    {
      id: 'preview-reply-meghan',
      mode: 'reply',
      verb: 'Reply',
      subject: 'Meghan Mullins',
      reason: 'Question about weaken drill timing',
      timing: '18m waiting',
      sourceLabel: 'Unread message',
      title: 'Reply to Meghan Mullins',
      preview: 'I finished the set, but I am still choosing between two answers on weaken questions when the stimulus has a causal claim.',
      studentId: 'preview-meghan',
      studentName: 'Meghan Mullins',
      priority: 104,
      primaryActionLabel: 'Send reply',
      secondaryActionLabel: 'Open thread',
      openPath: '/teacher/inbox',
      sourceKind: 'conversation',
      sourceId: 'preview-conversation-meghan',
      editableText: 'Good. For the next set, slow down at the causal claim and name the missing alternate explanation before looking at choices.',
    },
  ],
  review: [
    {
      id: 'preview-review-draft',
      mode: 'review',
      verb: 'Review',
      subject: 'Dakota Brown',
      reason: 'Session recap draft waiting',
      timing: 'Today',
      sourceLabel: 'Draft',
      title: 'Review recap for Dakota Brown',
      preview: 'Dakota improved on argument structure but needs a shorter review loop before moving into harder sufficient assumption questions.',
      studentId: 'preview-dakota',
      studentName: 'Dakota Brown',
      suggested: true,
      priority: 92,
      primaryActionLabel: 'Approve draft',
      secondaryActionLabel: 'Open draft',
      openPath: '/teacher/today',
      sourceKind: 'draft',
      sourceId: 'preview-draft-dakota',
      editableText: 'Dakota improved on argument structure. Next session should start with two short sufficient assumption drills, then review misses together.',
    },
  ],
  assign: [
    {
      id: 'preview-schedule-meghan',
      mode: 'assign',
      verb: 'Schedule',
      subject: 'Meghan Mullins',
      reason: 'Timed LR review',
      timing: 'Today',
      sourceLabel: 'Calendar item',
      title: 'Timed LR review for Meghan Mullins',
      preview: 'Review weaken timing and pick the next focused drill.',
      studentId: 'preview-meghan',
      studentName: 'Meghan Mullins',
      priority: 96,
      primaryActionLabel: 'Open schedule',
      secondaryActionLabel: 'Open student',
      openPath: '/teacher/schedule?student=preview-meghan',
      sourceKind: 'schedule',
      sourceId: 'preview-schedule-meghan',
    },
  ],
};

/**
 * The Teacher Desk work queue: every source (messages, assistant drafts,
 * uploads, upcoming classroom work, students due for new work) normalized into
 * one ranked to-do list, plus the next scheduled session.
 *
 * Extracted from TeacherDeskPreview so the new Today room and the legacy Desk
 * derive the queue from one place rather than two drifting copies.
 */
export function useDeskTaskQueue() {
  const { user } = useAuth();
  const localPreview = isLocalPreviewHost() && !user;

  const { rows: loadedStudents = [], loading: studentsLoading } = useHubStudents();
  const { conversations, loading: inboxLoading } = useInbox();
  const { data: drafts = [], isLoading: draftsLoading } = useAITADrafts({ status: 'draft' });
  const { data: uploads = [], isLoading: uploadsLoading } = useAdminUploadsQueue();
  const { items: classroomItems = [], isLoading: classroomItemsLoading } = useAllClassroomItems();
  const { data: nextSession } = useNextSession();

  const students = localPreview ? PREVIEW_STUDENTS : loadedStudents;

  const studentById = useMemo(() => {
    const map = new Map<string, HubStudentRow>();
    for (const student of students) map.set(student.class_id, student);
    return map;
  }, [students]);

  const legacyTasks = useMemo<DeskTask[]>(() => {
    if (localPreview) {
      return sortTasks([...PREVIEW_TASKS.reply, ...PREVIEW_TASKS.review, ...PREVIEW_TASKS.assign]);
    }
    const replyTasks = conversations
      .filter((conversation) => conversation.unread)
      .filter((conversation) =>
        isWithinDays(conversation.last_message?.created_at ?? conversation.last_message_at, TASK_STALE_DAYS),
      )
      .map((conversation) => conversationToReplyTask(conversation));
    const draftTasks = drafts
      .filter((draft) => isWithinDays(draft.created_at, TASK_STALE_DAYS))
      .map((draft) => draftToReviewTask(draft, studentById.get(draft.student_id)));
    const uploadTasks = uploads
      .filter((upload) => isWithinDays(upload.created_at, TASK_STALE_DAYS))
      .map((upload) => uploadToReviewTask(upload, studentById.get(upload.student_id)));
    const scheduleTasks = classroomItems
      .filter((item) => item.status !== 'archived' && item.status !== 'completed')
      .filter((item) => isWithinUpcomingDays(item.due_at ?? item.unlock_at ?? item.created_at, SCHEDULE_LOOKAHEAD_DAYS))
      .map((item) => classroomItemToScheduleTask(item, studentById.get(item.student_id)));
    // Only suggest assignments for students who are still active. A dormant
    // former student (last seen long ago, or never) should not linger here.
    const assignTasks = students
      .filter((student) => isWithinDays(student.last_seen_at, ACTIVE_STUDENT_DAYS))
      .filter(
        (student) =>
          student.assignments_total > 0 &&
          student.assignments_completed / Math.max(1, student.assignments_total) >= 0.8,
      )
      .map((student) => studentToAssignTask(student));
    return sortTasks([...replyTasks, ...draftTasks, ...uploadTasks, ...scheduleTasks, ...assignTasks]);
  }, [classroomItems, conversations, drafts, localPreview, studentById, students, uploads]);

  const isLoading =
    !localPreview && (studentsLoading || inboxLoading || draftsLoading || uploadsLoading || classroomItemsLoading);
  const todoQueue = useTeacherTodoQueue(legacyTasks, { externalSources: !localPreview });

  return {
    localPreview,
    students,
    studentById,
    nextSession,
    todoQueue,
    isLoading: isLoading || todoQueue.loading,
  };
}
