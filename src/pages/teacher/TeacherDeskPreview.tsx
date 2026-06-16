import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Pencil,
  Pin,
  Search,
  Send,
  Shield,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAITADrafts, useUpdateDraftStatus, type AITADraft } from '@/hooks/useAITADrafts';
import { useAdminUploadsQueue, type ExternalWorkUpload } from '@/hooks/useExternalWorkUploads';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { useInbox, type Conversation } from '@/hooks/useInbox';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type DeskMode = 'reply' | 'review' | 'assign';
type ContextKey = 'student' | 'history' | 'analytics' | 'source';
type AssistantScope = 'task' | 'workspace';
type SourceKind = 'conversation' | 'draft' | 'upload' | 'assignment-gap';

interface DeskTask {
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

const SESSION_MODE_KEY = 'teacher-desk-preview-mode';

const MODE_META: Record<
  DeskMode,
  {
    label: 'Reply' | 'Review' | 'Assign';
    description: string;
    empty: string;
    viewAllLabel: string;
    viewAllPath: string;
    Icon: typeof MessageSquare;
  }
> = {
  reply: {
    label: 'Reply',
    description: 'Student messages waiting on Joshua.',
    empty: 'No replies waiting',
    viewAllLabel: 'View all Reply',
    viewAllPath: '/teacher/conversations',
    Icon: MessageSquare,
  },
  review: {
    label: 'Review',
    description: 'Drafts, uploads, and student work requiring judgment.',
    empty: 'No reviews waiting',
    viewAllLabel: 'View all Review',
    viewAllPath: '/teacher?tab=drafts',
    Icon: FileText,
  },
  assign: {
    label: 'Assign',
    description: 'Students who need a next assignment decision.',
    empty: 'No assignments suggested',
    viewAllLabel: 'View all Assign',
    viewAllPath: '/teacher/library/assignments/new',
    Icon: ClipboardList,
  },
};

const GLOBAL_RAIL = [
  { label: 'Today', path: '/teacher/desk-preview', Icon: Sparkles },
  { label: 'Students', path: '/teacher/students', Icon: Users },
  { label: 'Assign', path: '/teacher/library/assignments/new', Icon: ClipboardList },
  { label: 'Teach', path: '/teacher/whiteboard', Icon: Pencil },
  { label: 'Admin', path: '/teacher/admin', Icon: Shield },
];

function studentName(student?: Pick<HubStudentRow, 'display_name' | 'email'> | null) {
  return student?.display_name?.trim() || student?.email || 'Student';
}

function completionRate(student: HubStudentRow) {
  if (student.assignments_total === 0) return 0;
  return Math.round((student.assignments_completed / student.assignments_total) * 100);
}

function plainAge(iso: string | null | undefined) {
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

function modeFromStorage(): DeskMode | null {
  if (typeof window === 'undefined') return null;
  const stored = window.sessionStorage.getItem(SESSION_MODE_KEY);
  return stored === 'reply' || stored === 'review' || stored === 'assign' ? stored : null;
}

export default function TeacherDeskPreview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateDraft = useUpdateDraftStatus();
  const storedMode = useMemo(() => modeFromStorage(), []);
  const [mode, setModeState] = useState<DeskMode>(storedMode ?? 'reply');
  const [autoModeApplied, setAutoModeApplied] = useState(Boolean(storedMode));
  const [selectedByMode, setSelectedByMode] = useState<Partial<Record<DeskMode, string>>>({});
  const [contextKey, setContextKey] = useState<ContextKey>('student');
  const [assistantScope, setAssistantScope] = useState<AssistantScope>('task');
  const [editTextByTask, setEditTextByTask] = useState<Record<string, string>>({});
  const [materialByTask, setMaterialByTask] = useState<Record<string, string>>({});
  const [dueByTask, setDueByTask] = useState<Record<string, string>>({});
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const { rows: students = [], loading: studentsLoading, error: studentsError } = useHubStudents();
  const { conversations, loading: inboxLoading } = useInbox();
  const { data: drafts = [], isLoading: draftsLoading } = useAITADrafts({ status: 'draft' });
  const { data: uploads = [], isLoading: uploadsLoading } = useAdminUploadsQueue();

  const studentById = useMemo(() => {
    const map = new Map<string, HubStudentRow>();
    for (const student of students) map.set(student.class_id, student);
    return map;
  }, [students]);

  const tasksByMode = useMemo<Record<DeskMode, DeskTask[]>>(() => {
    const replyTasks = conversations
      .filter((conversation) => conversation.unread)
      .map((conversation) => conversationToReplyTask(conversation));

    const draftTasks = drafts.map((draft) => draftToReviewTask(draft, studentById.get(draft.student_id)));
    const uploadTasks = uploads.map((upload) => uploadToReviewTask(upload, studentById.get(upload.student_id)));

    const assignTasks = students
      .filter((student) => student.assignments_total === 0 || completionRate(student) >= 80)
      .map((student) => studentToAssignTask(student));

    return {
      reply: sortTasks(replyTasks),
      review: sortTasks([...draftTasks, ...uploadTasks]),
      assign: sortTasks(assignTasks),
    };
  }, [conversations, drafts, studentById, students, uploads]);

  const isLoading = studentsLoading || inboxLoading || draftsLoading || uploadsLoading;
  const counts = {
    reply: tasksByMode.reply.length,
    review: tasksByMode.review.length,
    assign: tasksByMode.assign.length,
  };
  const highestMode = useMemo<DeskMode>(() => {
    const firstTasks = (Object.keys(tasksByMode) as DeskMode[])
      .map((key) => ({ key, priority: tasksByMode[key][0]?.priority ?? -1 }))
      .sort((a, b) => b.priority - a.priority);
    return firstTasks[0]?.priority >= 0 ? firstTasks[0].key : 'reply';
  }, [tasksByMode]);

  const visibleTasks = tasksByMode[mode].slice(0, 3);
  const selectedTaskId = selectedByMode[mode];
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(SESSION_MODE_KEY, mode);
    }
  }, [mode]);

  useEffect(() => {
    if (!autoModeApplied && !isLoading) {
      setModeState(highestMode);
      setAutoModeApplied(true);
    }
  }, [autoModeApplied, highestMode, isLoading]);

  useEffect(() => {
    if (!selectedTask) return;
    setSelectedByMode((current) => {
      if (current[mode] === selectedTask.id) return current;
      return { ...current, [mode]: selectedTask.id };
    });
    if (selectedTask.editableText && editTextByTask[selectedTask.id] === undefined) {
      setEditTextByTask((current) => ({
        ...current,
        [selectedTask.id]: selectedTask.editableText ?? '',
      }));
    }
  }, [editTextByTask, mode, selectedTask]);

  const setMode = (next: DeskMode) => {
    setModeState(next);
    setContextKey('student');
  };

  const openPath = (path: string) => navigate(path);

  const handlePrimaryAction = async (task: DeskTask) => {
    if (task.sourceKind === 'draft' && task.sourceId) {
      setBusyTaskId(task.id);
      try {
        await updateDraft.mutateAsync({ id: task.sourceId, status: 'approved' });
        toast.success('Draft approved');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not approve draft');
      } finally {
        setBusyTaskId(null);
      }
      return;
    }

    if (task.sourceKind === 'upload' && task.sourceId) {
      setBusyTaskId(task.id);
      try {
        const { error } = await supabase
          .from('external_work_uploads')
          .update({ processing_status: 'parsed', reviewed_at: new Date().toISOString() })
          .eq('id', task.sourceId);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['external-uploads-queue'] });
        toast.success('Upload marked reviewed');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not mark reviewed');
      } finally {
        setBusyTaskId(null);
      }
      return;
    }

    navigate(task.openPath);
  };

  const nextSession = 'Next session: Lydia at 4:30 PM';
  const todayLabel = format(new Date(), 'EEE — d MMMM');
  const ModeIcon = MODE_META[mode].Icon;

  return (
    <div className="h-screen overflow-hidden bg-[#b7c0c4] text-[#0d1114]">
      <div
        className="grid h-full grid-cols-1 overflow-y-auto lg:grid-cols-[168px_minmax(250px,330px)_minmax(420px,1fr)] lg:overflow-hidden xl:grid-cols-[168px_minmax(250px,330px)_minmax(420px,1fr)_318px]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(12,18,22,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(12,18,22,0.055) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      >
        <GlobalRail onOpen={openPath} />

        <aside className="relative hidden border-r border-black/12 px-5 py-7 lg:block">
          <div className="mb-16 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/48">
            Modes
          </div>

          <div className="mb-9 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/mainhub')}
              className="inline-flex h-8 w-8 items-center justify-center border border-black/20 text-black/55 transition hover:bg-black hover:text-white"
              aria-label="Back to main hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">LSAT U</div>
              <div className="text-sm font-semibold">Teacher Desk</div>
            </div>
          </div>

          <div className="space-y-2">
            {(Object.keys(MODE_META) as DeskMode[]).map((key) => {
              const meta = MODE_META[key];
              const active = key === mode;
              const urgent = key !== mode && counts[key] > 0 && tasksByMode[key][0]?.priority >= 80;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={cn(
                    'grid w-full grid-cols-[28px_minmax(0,1fr)_32px] items-center gap-3 border px-3 py-2.5 text-left transition',
                    active
                      ? 'border-black bg-black text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]'
                      : 'border-transparent text-black/70 hover:border-black/20 hover:bg-white/18',
                  )}
                >
                  <meta.Icon className="h-4 w-4" />
                  <span className="truncate text-sm font-semibold">{meta.label}</span>
                  <span
                    className={cn(
                      'relative justify-self-end text-xs tabular-nums',
                      active ? 'text-white' : 'text-black/55',
                    )}
                  >
                    {counts[key]}
                    {urgent && <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[#d18b2f]" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-12 text-[10px] uppercase tracking-[0.18em] text-black/42">Top 3</div>
          <div className="mt-3 space-y-2">
            {isLoading ? (
              <LoadingLine label="Loading tasks" />
            ) : visibleTasks.length === 0 ? (
              <EmptyMode mode={mode} />
            ) : (
              visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={selectedTask?.id === task.id}
                  onSelect={() => {
                    setSelectedByMode((current) => ({ ...current, [mode]: task.id }));
                    setContextKey('student');
                  }}
                />
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate(MODE_META[mode].viewAllPath)}
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-black/58 transition hover:text-black"
          >
            {MODE_META[mode].viewAllLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </aside>

        <main className="relative flex min-w-0 flex-col px-4 py-7 lg:px-8">
          <header className="flex items-start justify-between gap-4 text-[12px] font-semibold">
            <div className="flex items-center gap-4">
              <span>{todayLabel}</span>
              <span className="h-px w-8 bg-black/32" />
              <span className="text-black/52">Teacher Desk</span>
            </div>
            <div className="text-right text-black/52">{nextSession}</div>
          </header>

          {studentsError ? (
            <div className="mt-8 border border-black/20 bg-white/20 p-4 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <CircleAlert className="h-4 w-4" />
                Teacher data did not load.
              </div>
              <p className="mt-1 text-black/58">Roster data is required before the desk can rank tasks.</p>
            </div>
          ) : null}

          <section className="relative flex flex-1 flex-col items-center justify-center py-8">
            <div className="mb-10 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-black/48">
              <ModeIcon className="h-4 w-4" />
              <span>{MODE_META[mode].description}</span>
            </div>

            <Cube mode={mode} hasTask={Boolean(selectedTask)} />

            <SelectedWorkSurface
              task={selectedTask}
              mode={mode}
              editValue={selectedTask ? editTextByTask[selectedTask.id] ?? selectedTask.editableText ?? '' : ''}
              materialValue={selectedTask ? materialByTask[selectedTask.id] ?? 'Suggested LSAT review drill' : ''}
              dueValue={selectedTask ? dueByTask[selectedTask.id] ?? '' : ''}
              onEditChange={(value) => {
                if (!selectedTask) return;
                setEditTextByTask((current) => ({ ...current, [selectedTask.id]: value }));
              }}
              onMaterialChange={(value) => {
                if (!selectedTask) return;
                setMaterialByTask((current) => ({ ...current, [selectedTask.id]: value }));
              }}
              onDueChange={(value) => {
                if (!selectedTask) return;
                setDueByTask((current) => ({ ...current, [selectedTask.id]: value }));
              }}
            />
          </section>

          <AssistantCommandLine scope={assistantScope} onScopeChange={setAssistantScope} task={selectedTask} />
        </main>

        <RightPanel
          task={selectedTask}
          contextKey={contextKey}
          onContextChange={setContextKey}
          onPrimary={handlePrimaryAction}
          onSecondary={(task) => navigate(task.openPath)}
          busy={busyTaskId === selectedTask?.id || updateDraft.isPending}
          className="hidden xl:block"
        />
      </div>
    </div>
  );
}

function conversationToReplyTask(conversation: Conversation): DeskTask {
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
    primaryActionLabel: 'Open reply',
    secondaryActionLabel: 'Open student',
    openPath: '/teacher/conversations',
    sourceKind: 'conversation',
    sourceId: conversation.id,
    editableText: '',
  };
}

function draftToReviewTask(draft: AITADraft, student?: HubStudentRow): DeskTask {
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
    openPath: '/teacher?tab=drafts',
    sourceKind: 'draft',
    sourceId: draft.id,
    editableText: draft.draft_markdown ?? '',
  };
}

function uploadToReviewTask(upload: ExternalWorkUpload, student?: HubStudentRow): DeskTask {
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

function studentToAssignTask(student: HubStudentRow): DeskTask {
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
      ? `${name} does not have active assignment data yet. Start with a prepared LSAT drill or bootcamp module.`
      : `${name} has completed most assigned work. Choose the next useful review or new-material assignment.`,
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

function sortTasks(tasks: DeskTask[]) {
  return [...tasks].sort((a, b) => b.priority - a.priority);
}

function GlobalRail({ onOpen }: { onOpen: (path: string) => void }) {
  return (
    <aside className="hidden border-r border-black/14 px-5 py-7 lg:block">
      <div className="mb-20 text-[13px] font-bold tracking-tight">LSAT U</div>
      <nav className="space-y-3" aria-label="Teacher workspace preview">
        {GLOBAL_RAIL.map((item) => {
          const active = item.label === 'Today';
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onOpen(item.path)}
              className={cn(
                'flex w-full items-center gap-3 border px-3 py-2.5 text-left text-sm font-semibold transition',
                active
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black/58 hover:border-black/20 hover:bg-white/15 hover:text-black',
              )}
            >
              <item.Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

function TaskRow({ task, selected, onSelect }: { task: DeskTask; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full border px-3 py-2.5 text-left transition',
        selected ? 'border-black bg-black text-white' : 'border-black/14 bg-white/10 text-black hover:bg-white/22',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.15em]">{task.verb}</span>
        <span className={cn('text-[11px] tabular-nums', selected ? 'text-white/70' : 'text-black/46')}>
          {task.timing}
        </span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{task.subject}</div>
      <div className={cn('mt-0.5 truncate text-xs', selected ? 'text-white/62' : 'text-black/52')}>
        {task.reason}
      </div>
      {task.suggested && (
        <div className={cn('mt-1 text-[10px] uppercase tracking-[0.14em]', selected ? 'text-white/52' : 'text-black/40')}>
          Suggested
        </div>
      )}
    </button>
  );
}

function Cube({ mode, hasTask }: { mode: DeskMode; hasTask: boolean }) {
  const markerClass =
    mode === 'reply' ? 'left-[43%] top-[18%]' : mode === 'review' ? 'left-[63%] top-[50%]' : 'left-[34%] top-[68%]';
  return (
    <div className="relative h-[250px] w-[330px] max-w-full">
      <div className="absolute left-1/2 top-[53%] h-[82px] w-[245px] -translate-x-1/2 rounded-[50%] border-b-2 border-black/70 border-l border-r border-t border-black/18" />
      <div className="absolute left-1/2 top-[46%] h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-black" />
      <div className="absolute left-1/2 top-[46%] h-[132px] w-px -translate-y-1/2 bg-black/40" />
      <div className="absolute left-[30%] top-[46%] h-px w-[132px] bg-black/40" />
      <div className="absolute left-[50%] top-[20%] h-[92px] w-px origin-bottom rotate-[60deg] bg-black/70" />
      <div className="absolute left-[50%] top-[20%] h-[92px] w-px origin-bottom -rotate-[60deg] bg-black/70" />
      <div className="absolute left-[50%] top-[46%] h-[92px] w-px origin-top rotate-[60deg] bg-black/70" />
      <div className="absolute left-[50%] top-[46%] h-[92px] w-px origin-top -rotate-[60deg] bg-black/70" />
      <span className={cn('absolute h-2.5 w-2.5 rounded-full bg-black transition-opacity', markerClass, hasTask ? 'opacity-100' : 'opacity-20')} />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
        <div className="text-[10px] uppercase tracking-[0.18em] text-black/38">Current mode</div>
        <div className="text-2xl font-semibold">{MODE_META[mode].label}</div>
      </div>
    </div>
  );
}

function SelectedWorkSurface({
  task,
  mode,
  editValue,
  materialValue,
  dueValue,
  onEditChange,
  onMaterialChange,
  onDueChange,
}: {
  task: DeskTask | null;
  mode: DeskMode;
  editValue: string;
  materialValue: string;
  dueValue: string;
  onEditChange: (value: string) => void;
  onMaterialChange: (value: string) => void;
  onDueChange: (value: string) => void;
}) {
  if (!task) {
    return (
      <div className="mt-2 w-full max-w-[560px] border border-black/18 bg-white/10 p-5 text-center">
        <div className="text-sm font-semibold">{MODE_META[mode].empty}</div>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-black/52">
          The desk is clear for this mode. Use the mode list or open the full surface when you want to inspect more.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 w-full max-w-[640px] border border-black/20 bg-[#c2cace]/55 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-black/46">
        <span>{task.sourceLabel}</span>
        {task.suggested && (
          <>
            <span className="h-px w-5 bg-black/24" />
            <span>Suggested by assistant</span>
          </>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{task.title}</h1>
      <div className="mt-1 text-sm text-black/56">{task.studentName || task.subject}</div>
      <p className="mt-4 max-h-[4.75rem] overflow-hidden text-sm leading-6 text-black/66">{task.preview}</p>

      {task.mode === 'reply' || (task.mode === 'review' && task.editableText !== undefined) ? (
        <textarea
          value={editValue}
          onChange={(event) => onEditChange(event.target.value)}
          placeholder={task.mode === 'reply' ? 'Draft a short reply here, or open the conversation.' : 'Light edit before approval.'}
          className="mt-4 min-h-[88px] w-full resize-none border border-black/18 bg-white/28 px-3 py-2 text-sm outline-none placeholder:text-black/34 focus:border-black"
        />
      ) : null}

      {task.mode === 'assign' ? (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_150px] gap-3">
          <select
            value={materialValue}
            onChange={(event) => onMaterialChange(event.target.value)}
            className="h-10 border border-black/18 bg-white/28 px-3 text-sm outline-none focus:border-black"
          >
            <option>Suggested LSAT review drill</option>
            <option>Conditional logic refresher</option>
            <option>Causation flaw mini-set</option>
            <option>Weakening question review</option>
          </select>
          <input
            value={dueValue}
            onChange={(event) => onDueChange(event.target.value)}
            placeholder="Due date"
            className="h-10 border border-black/18 bg-white/28 px-3 text-sm outline-none placeholder:text-black/34 focus:border-black"
          />
        </div>
      ) : null}
    </div>
  );
}

function RightPanel({
  task,
  contextKey,
  onContextChange,
  onPrimary,
  onSecondary,
  busy,
  className,
}: {
  task: DeskTask | null;
  contextKey: ContextKey;
  onContextChange: (key: ContextKey) => void;
  onPrimary: (task: DeskTask) => void;
  onSecondary: (task: DeskTask) => void;
  busy: boolean;
  className?: string;
}) {
  return (
    <aside className={cn('border-l border-black/12 px-5 py-7', className)}>
      <div className="mb-16 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-black/45">
        <span>Controls</span>
        <span>016</span>
      </div>

      {!task ? (
        <div className="border border-black/18 bg-white/10 p-4 text-sm text-black/54">
          Select a task to show controls.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPrimary(task)}
              disabled={busy}
              className="col-span-2 inline-flex h-11 items-center justify-center gap-2 bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/86 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {task.primaryActionLabel}
            </button>
            <button
              type="button"
              onClick={() => onSecondary(task)}
              className="inline-flex h-10 items-center justify-center gap-2 border border-black/18 bg-white/14 px-3 text-sm font-semibold text-black/70 transition hover:bg-white/28"
            >
              <Search className="h-4 w-4" />
              {task.secondaryActionLabel}
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 border border-black/18 bg-white/14 px-3 text-sm font-semibold text-black/70 transition hover:bg-white/28"
            >
              <Pin className="h-4 w-4" />
              Pin
            </button>
          </div>

          <div className="mt-8">
            <div className="mb-3 text-[10px] uppercase tracking-[0.18em] text-black/42">Context</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['student', UserRound],
                ['history', History],
                ['analytics', BarChart3],
                ['source', FileText],
              ] as const).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onContextChange(key)}
                  className={cn(
                    'inline-flex h-9 items-center justify-center gap-2 border px-2 text-xs font-semibold capitalize transition',
                    contextKey === key
                      ? 'border-black bg-black text-white'
                      : 'border-black/16 bg-white/10 text-black/58 hover:bg-white/24',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {key}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 min-h-[190px] border border-black/18 bg-white/10 p-4">
            <ContextPanel task={task} contextKey={contextKey} />
          </div>

          <div className="mt-8 text-[10px] uppercase tracking-[0.18em] text-black/38">Next session</div>
          <div className="mt-2 border-t border-black/18 pt-3 text-sm text-black/62">
            Lydia at 4:30 PM. Prep only if Reply and Review are clear.
          </div>
        </>
      )}
    </aside>
  );
}

function ContextPanel({ task, contextKey }: { task: DeskTask; contextKey: ContextKey }) {
  if (contextKey === 'student') {
    return (
      <div>
        <div className="text-sm font-semibold">{task.studentName || task.subject}</div>
        <p className="mt-2 text-sm leading-6 text-black/56">
          Student context stays compact here. Open the full student page for profile, files, recaps, and detailed progress.
        </p>
      </div>
    );
  }
  if (contextKey === 'history') {
    return (
      <div>
        <div className="text-sm font-semibold">Recent history</div>
        <p className="mt-2 text-sm leading-6 text-black/56">
          Showing source age: {task.timing}. Deeper history remains in the existing student and conversation surfaces.
        </p>
      </div>
    );
  }
  if (contextKey === 'analytics') {
    return (
      <div>
        <div className="text-sm font-semibold">Analytics context</div>
        <p className="mt-2 text-sm leading-6 text-black/56">
          Analytics is hidden until requested. If it creates work, it should become a Reply, Review, or Assign task.
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="text-sm font-semibold">{task.sourceLabel}</div>
      <p className="mt-2 text-sm leading-6 text-black/56">{task.preview}</p>
    </div>
  );
}

function AssistantCommandLine({
  scope,
  onScopeChange,
  task,
}: {
  scope: AssistantScope;
  onScopeChange: (scope: AssistantScope) => void;
  task: DeskTask | null;
}) {
  return (
    <div className="mx-auto mb-2 flex w-full max-w-[680px] items-center gap-2 border border-black/18 bg-white/16 px-2 py-2">
      <div className="flex border border-black/16 bg-white/14 p-0.5">
        {(['task', 'workspace'] as AssistantScope[]).map((next) => (
          <button
            key={next}
            type="button"
            onClick={() => onScopeChange(next)}
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold capitalize transition',
              scope === next ? 'bg-black text-white' : 'text-black/52 hover:text-black',
            )}
          >
            {next}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-sm text-black/44">
        <Send className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {task
            ? `Assistant command shell for ${task.verb.toLowerCase()} task. Functional assistant execution is not wired here yet.`
            : 'Assistant command shell. Select a task first.'}
        </span>
      </div>
    </div>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 border border-black/14 bg-white/10 px-3 py-3 text-sm text-black/52">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

function EmptyMode({ mode }: { mode: DeskMode }) {
  return (
    <div className="border border-dashed border-black/18 bg-white/10 px-3 py-4">
      <div className="text-sm font-semibold">{MODE_META[mode].empty}</div>
      <p className="mt-1 text-xs leading-5 text-black/50">Open the full surface if you want to inspect more.</p>
    </div>
  );
}
