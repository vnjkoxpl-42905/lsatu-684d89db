import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useAITADrafts } from '@/hooks/useAITADrafts';
import { useAdminUploadsQueue } from '@/hooks/useExternalWorkUploads';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { useInbox } from '@/hooks/useInbox';
import { cn } from '@/lib/utils';
import {
  MODE_META,
  MODE_ORDER,
  SESSION_MODE_KEY,
  conversationToReplyTask,
  draftToReviewTask,
  modeFromStorage,
  sortTasks,
  studentToAssignTask,
  uploadToReviewTask,
  type DeskMode,
  type DeskTask,
} from './deskTasks';
import { GlobalRail } from './GlobalRail';
import { ModeList } from './ModeList';
import { DeskAssistant, type DeskSeedSignal } from './DeskAssistant';
import { DeskContextStrip } from './DeskContextStrip';
import { DeskMobile } from './DeskMobile';
import { useDeskActions } from './useDeskActions';
import { useNextSession } from './useNextSession';

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
      id: 'preview-assign-dakota',
      mode: 'assign',
      verb: 'Assign',
      subject: 'Dakota Brown',
      reason: 'No active assignment',
      timing: 'Today',
      sourceLabel: 'Assignment suggested',
      title: 'Assign first work to Dakota Brown',
      preview: 'Start Dakota with a short diagnostic assignment so the next teacher move is based on observed misses rather than a generic sequence.',
      studentId: 'preview-dakota',
      studentName: 'Dakota Brown',
      suggested: true,
      priority: 78,
      primaryActionLabel: 'Assign work',
      secondaryActionLabel: 'Open student',
      openPath: '/teacher/students/preview-dakota',
      sourceKind: 'assignment-gap',
    },
  ],
};

export default function TeacherDeskPreview() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const localPreview = isLocalPreviewHost() && !user;
  const { rows: loadedStudents = [], loading: studentsLoading, error: studentsError, refresh: refreshStudents } =
    useHubStudents();
  const { conversations, loading: inboxLoading, refresh: refreshInbox } = useInbox();
  const { data: drafts = [], isLoading: draftsLoading } = useAITADrafts({ status: 'draft' });
  const { data: uploads = [], isLoading: uploadsLoading } = useAdminUploadsQueue();
  const { data: nextSession } = useNextSession();
  const deskActions = useDeskActions({ refreshInbox, refreshStudents });

  const storedMode = useMemo(() => modeFromStorage(), []);
  const [mode, setModeState] = useState<DeskMode>(storedMode ?? 'reply');
  const [autoModeApplied, setAutoModeApplied] = useState(Boolean(storedMode));
  const [selectedByMode, setSelectedByMode] = useState<Partial<Record<DeskMode, string>>>({});
  const [seedSignal, setSeedSignal] = useState<DeskSeedSignal | null>(null);
  const seedNonce = useRef(0);

  const students = localPreview ? PREVIEW_STUDENTS : loadedStudents;

  const studentById = useMemo(() => {
    const map = new Map<string, HubStudentRow>();
    for (const student of students) map.set(student.class_id, student);
    return map;
  }, [students]);

  const tasksByMode = useMemo<Record<DeskMode, DeskTask[]>>(() => {
    if (localPreview) return PREVIEW_TASKS;
    const replyTasks = conversations
      .filter((conversation) => conversation.unread)
      .map((conversation) => conversationToReplyTask(conversation));
    // 'message' drafts are reply artifacts (handled as Reply cards), not Review
    // items — excluding them keeps a seeded reply from also showing in Review.
    const draftTasks = drafts
      .filter((draft) => draft.draft_type !== 'message')
      .map((draft) => draftToReviewTask(draft, studentById.get(draft.student_id)));
    const uploadTasks = uploads.map((upload) => uploadToReviewTask(upload, studentById.get(upload.student_id)));
    const assignTasks = students
      .filter((student) => student.assignments_total === 0 || (student.assignments_completed / Math.max(1, student.assignments_total)) >= 0.8)
      .map((student) => studentToAssignTask(student));
    return {
      reply: sortTasks(replyTasks),
      review: sortTasks([...draftTasks, ...uploadTasks]),
      assign: sortTasks(assignTasks),
    };
  }, [conversations, drafts, localPreview, studentById, students, uploads]);

  const isLoading = !localPreview && (studentsLoading || inboxLoading || draftsLoading || uploadsLoading);
  const counts: Record<DeskMode, number> = {
    reply: tasksByMode.reply.length,
    review: tasksByMode.review.length,
    assign: tasksByMode.assign.length,
  };

  const highestMode = useMemo<DeskMode>(() => {
    const ranked = MODE_ORDER.map((key) => ({ key, priority: tasksByMode[key][0]?.priority ?? -1 })).sort(
      (a, b) => b.priority - a.priority,
    );
    return ranked[0]?.priority >= 0 ? ranked[0].key : 'reply';
  }, [tasksByMode]);

  // The single highest-priority task across all modes — the assistant's "Next move".
  const nextTask = useMemo<DeskTask | null>(() => tasksByMode[highestMode][0] ?? null, [tasksByMode, highestMode]);

  const visibleTasks = tasksByMode[mode].slice(0, 3);
  const selectedTaskId = selectedByMode[mode];
  // Explicit selection only — at rest nothing is selected, so the assistant
  // rests as the task-first "Today queue" and the right strip collapses.
  const selectedTask = useMemo<DeskTask | null>(() => {
    for (const key of MODE_ORDER) {
      const id = selectedByMode[key];
      if (id) {
        const found = tasksByMode[key].find((task) => task.id === id);
        if (found) return found;
      }
    }
    return null;
  }, [selectedByMode, tasksByMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (!autoModeApplied && !isLoading) {
      setModeState(highestMode);
      setAutoModeApplied(true);
    }
  }, [autoModeApplied, highestMode, isLoading]);

  // Clicking a left task row selects it AND seeds the assistant.
  const selectFromList = (taskId: string) => {
    setSelectedByMode((current) => ({ ...current, [mode]: taskId }));
    const task = tasksByMode[mode].find((candidate) => candidate.id === taskId);
    if (task) {
      seedNonce.current += 1;
      setSeedSignal({ task, nonce: seedNonce.current });
    }
  };

  // Chips inside the assistant seed themselves; this only syncs selection so the
  // right strip and left list reflect the seeded task.
  const selectFromAssistant = (task: DeskTask) => {
    setModeState(task.mode);
    setSelectedByMode((current) => ({ ...current, [task.mode]: task.id }));
  };

  const todayLabel = format(new Date(), 'd MMMM');
  const weekdayLabel = format(new Date(), 'EEE');
  const nextSessionCue = useMemo(() => {
    if (!nextSession) return null;
    const name = studentById.get(nextSession.student_id)?.display_name?.trim();
    const when = format(parseISO(nextSession.scheduled_at), 'EEE h:mm a');
    return `Next session: ${name ? `${name} · ` : ''}${when}`;
  }, [nextSession, studentById]);

  const selectedStudentRow = selectedTask?.studentId ? studentById.get(selectedTask.studentId) ?? null : null;

  return (
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
              onClick={() => navigate('/mainhub')}
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
            selectedTask ? 'lg:grid-cols-[300px_minmax(0,1fr)_320px]' : 'lg:grid-cols-[300px_minmax(0,1fr)]',
          )}
        >
          <aside className="hidden flex-col gap-8 border-b border-black/10 px-6 py-6 lg:flex lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <GlobalRail onOpen={(path) => navigate(path)} />
            <ModeList
              mode={mode}
              counts={counts}
              tasksByMode={tasksByMode}
              visibleTasks={visibleTasks}
              selectedTaskId={selectedTaskId}
              loading={isLoading}
              onSelectMode={setModeState}
              onSelectTask={selectFromList}
              onViewAll={() => navigate(MODE_META[mode].viewAllPath)}
            />
          </aside>

          <main className="relative flex min-w-0 flex-col px-5 py-6 lg:overflow-hidden">
            <DeskMobile
              mode={mode}
              counts={counts}
              tasks={tasksByMode[mode]}
              selectedTask={selectedTask}
              loading={isLoading}
              onSelectMode={setModeState}
              onSelectTask={selectFromList}
            />

            {!localPreview && studentsError ? (
              <div className="mb-4 w-full border border-black/20 bg-white/25 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold">
                  <CircleAlert className="h-4 w-4" strokeWidth={1.5} />
                  Teacher data did not load.
                </div>
                <p className="mt-1 text-black/55">Roster data is required before the desk can rank tasks.</p>
                <button
                  type="button"
                  onClick={() => refreshStudents()}
                  className="mt-3 inline-flex h-8 items-center border border-black/25 px-3 text-xs font-semibold transition hover:bg-black hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : null}

            <DeskAssistant
              tasksByMode={tasksByMode}
              nextTask={nextTask}
              selectedTask={selectedTask}
              localPreview={localPreview}
              loading={isLoading}
              seedSignal={seedSignal}
              actions={deskActions}
              onSelectTask={selectFromAssistant}
            />
          </main>

          {selectedTask ? (
            <aside className="hidden flex-col border-t border-black/10 px-6 py-6 lg:flex lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <DeskContextStrip task={selectedTask} studentRow={selectedStudentRow} />
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
