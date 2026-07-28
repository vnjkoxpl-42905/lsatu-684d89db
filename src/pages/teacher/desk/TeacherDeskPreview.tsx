import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useAITADrafts } from '@/hooks/useAITADrafts';
import { useAllClassroomItems } from '@/hooks/useAllClassroomItems';
import { useAdminUploadsQueue } from '@/hooks/useExternalWorkUploads';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { useInbox } from '@/hooks/useInbox';
import { OperatorChatProvider } from '@/components/teacher/ai-ta/OperatorChatProvider';
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
  normalizeWorkspaceKey,
  type DeskMode,
  type DeskTask,
  type WorkspaceKey,
} from './deskTasks';
import { GlobalRail } from './GlobalRail';
import { cn } from '@/lib/utils';
import { DeskChatRail } from './DeskChatRail';
import { DeskChatPanel, type DeskChatInsert } from './DeskChatPanel';
import { DeskTodoRail } from './DeskTodoRail';
import { DeskPeopleSurface } from './DeskPeopleSurface';

import { DeskLibrarySurface } from './DeskLibrarySurface';
import { DeskGmailSurface } from './DeskGmailSurface';
import { DeskDriveSurface } from './DeskDriveSurface';
import { useNextSession } from './useNextSession';
import { useTeacherTodoQueue } from './useTeacherTodoQueue';
import { AdminInboxCommandCenter } from '@/components/inbox/AdminInboxCommandCenter';

const FLOOR_GRID_STYLE: React.CSSProperties = {
  transform: 'perspective(440px) rotateX(62deg)',
  transformOrigin: 'top center',
  backgroundImage:
    'linear-gradient(rgba(13,19,22,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(13,19,22,0.10) 1px, transparent 1px)',
  backgroundSize: '46px 46px',
  maskImage: 'linear-gradient(to top, black 30%, transparent 88%)',
  WebkitMaskImage: 'linear-gradient(to top, black 30%, transparent 88%)',
};

function isLocalPreviewHost() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function teacherDeskPathForSource(path: string) {
  if (!path.startsWith('/inbox')) return path;
  const url = new URL(path, 'http://lsatu.local');
  const pane = url.searchParams.get('pane');
  // A `pane=gmail|drive` source link folds into the matching top-level
  // workspace; anything else lands on Messages. `pane` is dropped, every other
  // param (t, label, cat, q, ...) is preserved so deep links keep their thread.
  const ws = pane === 'gmail' ? 'gmail' : pane === 'drive' ? 'drive' : 'messages';
  const next = new URLSearchParams();
  next.set('ws', ws);
  url.searchParams.forEach((value, key) => {
    if (key === 'pane') return;
    next.set(key, value);
  });
  return `/teacher?${next.toString()}`;
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
      openPath: '/teacher/conversations',
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
      openPath: '/teacher/command?tab=drafts',
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
 * Teacher Desk — a chat-first assistant workspace that keeps the light
 * instrument-panel shell. Left rail: the 5 Workspace shortcuts (GlobalRail) +
 * ChatGPT-style saved chats (DeskChatRail). Center: the light assistant
 * transcript + composer (DeskChatPanel). Right: a light task/to-do list
 * (DeskTodoRail). A single OperatorChatProvider shares the chat session.
 */
export default function TeacherDeskPreview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const localPreview = isLocalPreviewHost() && !user;
  const { rows: loadedStudents = [], loading: studentsLoading } = useHubStudents();
  const { conversations, loading: inboxLoading } = useInbox();
  const { data: drafts = [], isLoading: draftsLoading } = useAITADrafts({ status: 'draft' });
  const { data: uploads = [], isLoading: uploadsLoading } = useAdminUploadsQueue();
  const { items: classroomItems = [], isLoading: classroomItemsLoading } = useAllClassroomItems();
  const { data: nextSession } = useNextSession();
  const [chatInsert, setChatInsert] = useState<DeskChatInsert | null>(null);

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

  const isLoading = !localPreview && (studentsLoading || inboxLoading || draftsLoading || uploadsLoading || classroomItemsLoading);
  const todoQueue = useTeacherTodoQueue(legacyTasks, { externalSources: !localPreview });

  const workspaceParam = searchParams.get('ws');
  const workspace: WorkspaceKey = normalizeWorkspaceKey(workspaceParam);

  useEffect(() => {
    // Legacy students/admin workspaces fold into People.
    if (workspaceParam === 'students' || workspaceParam === 'admin') {
      const next = new URLSearchParams(searchParams);
      next.set('ws', 'people');
      setSearchParams(next, { replace: true });
      return;
    }
    // Legacy combined Inbox splits into Messages/Gmail/Drive by its old `pane`.
    // Also catch a bare `pane=gmail|drive` with no `ws`. Strip `pane`, keep
    // every other param (e.g. `t`) so Gmail deep links preserve the thread.
    const pane = searchParams.get('pane');
    if (workspaceParam === 'inbox' || (!workspaceParam && (pane === 'gmail' || pane === 'drive'))) {
      const nextWs = pane === 'gmail' ? 'gmail' : pane === 'drive' ? 'drive' : 'messages';
      const next = new URLSearchParams(searchParams);
      next.set('ws', nextWs);
      next.delete('pane');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, workspaceParam]);

  const selectWorkspace = (key: WorkspaceKey) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'today') {
      next.delete('ws');
    } else {
      next.set('ws', key);
    }
    setSearchParams(next, { replace: true });
  };

  const insertInChat = (text: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete('ws');
    setSearchParams(next, { replace: true });
    setChatInsert({ id: Date.now(), text });
  };

  const todayLabel = format(new Date(), 'd MMMM');
  const weekdayLabel = format(new Date(), 'EEE');
  const nextSessionCue = useMemo(() => {
    if (!nextSession) return null;
    const name = studentById.get(nextSession.student_id)?.display_name?.trim();
    const when = format(parseISO(nextSession.scheduled_at), 'EEE h:mm a');
    return `Next session: ${name ? `${name} · ` : ''}${when}`;
  }, [nextSession, studentById]);

  return (
    <OperatorChatProvider>
      <div className="relative min-h-screen overflow-x-hidden bg-[#c3cace] text-[#11181c] lg:h-screen lg:overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[220%] w-[320%] -translate-x-1/2" style={FLOOR_GRID_STYLE} />
        </div>

        <div className="relative flex min-h-screen flex-col lg:h-full lg:min-h-0">
          <header className="flex items-center justify-between px-6 py-4 text-[12px] font-semibold sm:px-8">
            <div className="flex items-center gap-4">
              <span>{weekdayLabel}</span>
              <span className="h-px w-8 bg-black/30" />
              <span>{todayLabel}</span>
            </div>
            <div className="flex items-center gap-4 text-black/55">
              {localPreview ? (
                <span className="hidden truncate sm:inline">Preview data</span>
              ) : nextSessionCue ? (
                <span className="hidden truncate sm:inline">{nextSessionCue}</span>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/classroom')}
                aria-label="Close Teacher Desk"
                className="inline-flex h-7 w-7 items-center justify-center border border-black/20 text-black/55 transition hover:bg-black hover:text-white"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </header>

          <div
            className={cn(
              'grid flex-1 grid-cols-1 lg:min-h-0',
              'lg:grid-cols-[300px_minmax(0,1fr)_320px]',
            )}
          >
            <aside className="flex flex-col gap-8 border-b border-black/10 px-6 py-6 lg:overflow-y-auto lg:border-b-0 lg:border-r">
              <GlobalRail active={workspace} onSelect={selectWorkspace} />
              <DeskChatRail />
            </aside>

            <main className="relative flex min-w-0 flex-col items-center px-5 py-6 lg:min-h-0 lg:overflow-hidden">
              {workspace === 'today' ? (
                <DeskChatPanel
                  localPreview={localPreview}
                  insert={chatInsert}
                  onInsertConsumed={() => setChatInsert(null)}
                />
              ) : null}
              {workspace === 'people' ? <DeskPeopleSurface /> : null}
              {workspace === 'messages' ? <AdminInboxCommandCenter embedded /> : null}
              {workspace === 'gmail' ? <DeskGmailSurface /> : null}
              {workspace === 'drive' ? <DeskDriveSurface /> : null}
              {workspace === 'library' ? <DeskLibrarySurface /> : null}
            </main>

            <aside className="flex flex-col border-t border-black/10 px-6 py-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <DeskTodoRail
                items={todoQueue.items}
                loading={isLoading || todoQueue.loading}
                onOpen={(path) => navigate(teacherDeskPathForSource(path))}
                onInsertInChat={insertInChat}
              />
            </aside>
          </div>
        </div>
      </div>
    </OperatorChatProvider>
  );
}
