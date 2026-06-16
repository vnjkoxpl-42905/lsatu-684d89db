import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlert, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAITADrafts, useUpdateDraftStatus } from '@/hooks/useAITADrafts';
import { useAdminUploadsQueue } from '@/hooks/useExternalWorkUploads';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { useInbox } from '@/hooks/useInbox';
import { createAssignments, listGuidedDrills } from '@/lib/guidedDrills';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem } from '@/lib/classroomNotify';
import { supabase } from '@/integrations/supabase/client';
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
  type ContextKey,
  type AssistantScope,
  type DeskMode,
  type DeskTask,
} from './deskTasks';
import { GlobalRail } from './GlobalRail';
import { ModeList } from './ModeList';
import { DeskCube } from './DeskCube';
import { WorkSurface, type MaterialOption } from './WorkSurface';
import { ActionContextPanel } from './ActionContextPanel';
import { AssistantCommandLine } from './AssistantCommandLine';
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

export default function TeacherDeskPreview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const updateDraft = useUpdateDraftStatus();

  const { rows: students = [], loading: studentsLoading, error: studentsError, refresh: refreshStudents } =
    useHubStudents();
  const { conversations, loading: inboxLoading, refresh: refreshInbox } = useInbox();
  const { data: drafts = [], isLoading: draftsLoading } = useAITADrafts({ status: 'draft' });
  const { data: uploads = [], isLoading: uploadsLoading } = useAdminUploadsQueue();
  const { data: nextSession } = useNextSession();

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
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // Guided drills power the real Assign material picker. Loaded lazily the
  // first time Assign mode is opened.
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);

  useEffect(() => {
    if (mode !== 'assign' || materialsLoaded || materialsLoading) return;
    setMaterialsLoading(true);
    listGuidedDrills()
      .then((drills) => {
        setMaterials(drills.filter((d) => d.is_published).map((d) => ({ id: d.id, title: d.title })));
        setMaterialsLoaded(true);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Could not load guided drills');
      })
      .finally(() => setMaterialsLoading(false));
  }, [mode, materialsLoaded, materialsLoading]);

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
      .filter((student) => student.assignments_total === 0 || (student.assignments_completed / Math.max(1, student.assignments_total)) >= 0.8)
      .map((student) => studentToAssignTask(student));
    return {
      reply: sortTasks(replyTasks),
      review: sortTasks([...draftTasks, ...uploadTasks]),
      assign: sortTasks(assignTasks),
    };
  }, [conversations, drafts, studentById, students, uploads]);

  const isLoading = studentsLoading || inboxLoading || draftsLoading || uploadsLoading;
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

  // Pinned tasks float to the front; the list is already priority-sorted, so a
  // stable partition keeps ranking within each group.
  const orderedTasks = useMemo(() => {
    const all = tasksByMode[mode];
    return [...all].sort((a, b) => (pinnedIds.has(b.id) ? 1 : 0) - (pinnedIds.has(a.id) ? 1 : 0));
  }, [tasksByMode, mode, pinnedIds]);

  const visibleTasks = orderedTasks.slice(0, 3);
  const selectedTaskId = selectedByMode[mode];
  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId) ?? visibleTasks[0] ?? null;

  useEffect(() => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (!autoModeApplied && !isLoading) {
      setModeState(highestMode);
      setAutoModeApplied(true);
    }
  }, [autoModeApplied, highestMode, isLoading]);

  useEffect(() => {
    if (!selectedTask) return;
    setSelectedByMode((current) => (current[mode] === selectedTask.id ? current : { ...current, [mode]: selectedTask.id }));
    if (selectedTask.editableText !== undefined && editTextByTask[selectedTask.id] === undefined) {
      setEditTextByTask((current) => ({ ...current, [selectedTask.id]: selectedTask.editableText ?? '' }));
    }
  }, [editTextByTask, mode, selectedTask]);

  const setMode = (next: DeskMode) => {
    setModeState(next);
    setContextKey('student');
  };

  const togglePin = (task: DeskTask) => {
    setPinnedIds((current) => {
      const next = new Set(current);
      if (next.has(task.id)) next.delete(task.id);
      else next.add(task.id);
      return next;
    });
  };

  const sendReply = useCallback(
    async (task: DeskTask) => {
      const body = (editTextByTask[task.id] ?? '').trim();
      if (!body || !user || !task.sourceId) return;
      setBusyTaskId(task.id);
      try {
        const { error } = await supabase
          .from('messages')
          .insert({ conversation_id: task.sourceId, sender_id: user.id, body });
        if (error) throw error;
        setEditTextByTask((current) => ({ ...current, [task.id]: '' }));
        toast.success('Reply sent');
        refreshInbox();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not send reply');
      } finally {
        setBusyTaskId(null);
      }
    },
    [editTextByTask, refreshInbox, user],
  );

  const assignWork = useCallback(
    async (task: DeskTask) => {
      const drillId = materialByTask[task.id];
      if (!drillId || !task.studentId || !user) return;
      const drill = materials.find((material) => material.id === drillId);
      const dueRaw = dueByTask[task.id];
      const dueAt = dueRaw ? new Date(dueRaw).toISOString() : null;
      setBusyTaskId(task.id);
      try {
        const assignments = await createAssignments({
          guided_drill_ids: [drillId],
          student_ids: [task.studentId],
          assigned_by: user.id,
        });
        await Promise.all(
          assignments.map(async (assignment) => {
            await createClassroomItem({
              studentId: assignment.student_id,
              createdBy: user.id,
              type: 'drill',
              title: drill?.title ?? 'Guided drill',
              description: `New guided drill: ${drill?.title ?? ''}`,
              dueAt,
              sourceTable: 'guided_drill_assignments',
              sourceId: assignment.id,
              status: 'assigned',
              visibleToStudent: true,
            });
            try {
              await notifyStudentOfClassroomItem({
                adminUserId: user.id,
                studentId: assignment.student_id,
                title: drill?.title ?? 'Guided drill',
                route: `/guided/${assignment.id}?returnTo=/classroom`,
                description: `New guided drill: ${drill?.title ?? ''}`,
              });
            } catch (notifyError) {
              console.warn('[TeacherDesk] notify failed', notifyError);
            }
          }),
        );
        queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
        queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
        queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });
        refreshStudents();
        toast.success('Work assigned');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not assign work');
      } finally {
        setBusyTaskId(null);
      }
    },
    [dueByTask, materialByTask, materials, queryClient, refreshStudents, user],
  );

  const handlePrimary = async (task: DeskTask) => {
    if (task.sourceKind === 'conversation') {
      await sendReply(task);
      return;
    }
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
    if (task.sourceKind === 'assignment-gap') {
      await assignWork(task);
    }
  };

  const primaryDisabled = useMemo(() => {
    if (!selectedTask) return true;
    if (selectedTask.sourceKind === 'conversation') return !(editTextByTask[selectedTask.id] ?? '').trim();
    if (selectedTask.sourceKind === 'assignment-gap') return !materialByTask[selectedTask.id];
    return false;
  }, [editTextByTask, materialByTask, selectedTask]);

  const todayLabel = format(new Date(), 'd MMMM');
  const weekdayLabel = format(new Date(), 'EEE');
  const nextSessionCue = useMemo(() => {
    if (!nextSession) return null;
    const name = studentById.get(nextSession.student_id)?.display_name?.trim();
    const when = format(parseISO(nextSession.scheduled_at), 'EEE h:mm a');
    return `Next session: ${name ? `${name} · ` : ''}${when}`;
  }, [nextSession, studentById]);

  const ModeIcon = MODE_META[mode].Icon;
  const selectedStudentRow = selectedTask?.studentId ? studentById.get(selectedTask.studentId) ?? null : null;

  return (
    <div className="relative h-screen overflow-hidden bg-[#c3cace] text-[#11181c]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[56%] overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[220%] w-[320%] -translate-x-1/2" style={FLOOR_GRID_STYLE} />
      </div>

      <div className="relative flex h-full flex-col">
        <header className="flex items-center justify-between px-6 py-4 text-[12px] font-semibold sm:px-8">
          <div className="flex items-center gap-4">
            <span>{weekdayLabel}</span>
            <span className="h-px w-8 bg-black/30" />
            <span>{todayLabel}</span>
          </div>
          <div className="flex items-center gap-4 text-black/55">
            {nextSessionCue && <span className="hidden truncate sm:inline">{nextSessionCue}</span>}
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

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_320px]">
          <aside className="flex flex-col gap-8 overflow-y-auto border-b border-black/10 px-6 py-6 lg:border-b-0 lg:border-r">
            <GlobalRail onOpen={(path) => navigate(path)} />
            <ModeList
              mode={mode}
              counts={counts}
              tasksByMode={tasksByMode}
              visibleTasks={visibleTasks}
              selectedTaskId={selectedTask?.id}
              loading={isLoading}
              onSelectMode={setMode}
              onSelectTask={(taskId) => {
                setSelectedByMode((current) => ({ ...current, [mode]: taskId }));
                setContextKey('student');
              }}
              onViewAll={() => navigate(MODE_META[mode].viewAllPath)}
            />
            <div className="mt-auto hidden lg:block">
              <BrandMark />
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-col items-center overflow-y-auto px-5 py-6">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-black/45">
              <ModeIcon className="h-4 w-4" strokeWidth={1.5} />
              <span>{MODE_META[mode].description}</span>
            </div>

            {studentsError ? (
              <div className="mb-4 w-full max-w-[620px] border border-black/20 bg-white/25 p-4 text-sm">
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

            <DeskCube mode={mode} hasTask={Boolean(selectedTask)} />

            <div className="mt-5 flex w-full justify-center">
              <WorkSurface
                task={selectedTask}
                mode={mode}
                editValue={selectedTask ? editTextByTask[selectedTask.id] ?? selectedTask.editableText ?? '' : ''}
                onEditChange={(value) => {
                  if (!selectedTask) return;
                  setEditTextByTask((current) => ({ ...current, [selectedTask.id]: value }));
                }}
                materials={materials}
                materialsLoading={materialsLoading}
                materialId={selectedTask ? materialByTask[selectedTask.id] ?? '' : ''}
                onMaterialChange={(value) => {
                  if (!selectedTask) return;
                  setMaterialByTask((current) => ({ ...current, [selectedTask.id]: value }));
                }}
                dueValue={selectedTask ? dueByTask[selectedTask.id] ?? '' : ''}
                onDueChange={(value) => {
                  if (!selectedTask) return;
                  setDueByTask((current) => ({ ...current, [selectedTask.id]: value }));
                }}
              />
            </div>

            <div className="mt-auto w-full pt-6">
              <AssistantCommandLine scope={assistantScope} onScopeChange={setAssistantScope} task={selectedTask} />
            </div>
          </main>

          <aside className="flex flex-col overflow-y-auto border-t border-black/10 px-6 py-6 lg:border-t-0 lg:border-l">
            <ActionContextPanel
              task={selectedTask}
              studentRow={selectedStudentRow}
              contextKey={contextKey}
              pinned={selectedTask ? pinnedIds.has(selectedTask.id) : false}
              busy={busyTaskId === selectedTask?.id || updateDraft.isPending}
              primaryDisabled={primaryDisabled}
              onContextChange={setContextKey}
              onPrimary={handlePrimary}
              onSecondary={(task) => navigate(task.openPath)}
              onTogglePin={togglePin}
            />
            <div className="mt-auto hidden pt-6 text-right text-[11px] uppercase tracking-[0.2em] text-black/35 lg:block">
              DESK
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="inline-flex flex-col border border-black/25 px-2.5 py-1.5 text-[9px] font-bold uppercase leading-[1.35] tracking-[0.1em]">
      <span>LSAT U</span>
      <span className="text-black/45">Teacher Desk</span>
    </div>
  );
}
