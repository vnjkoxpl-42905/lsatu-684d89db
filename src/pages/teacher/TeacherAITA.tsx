import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Check,
  X,
  MessageSquare,
  FileText,
  Users,
  UploadCloud,
  CalendarDays,
  ClipboardList,
  ArrowUpRight,
  Send,
  Target,
  BarChart3,
  Sparkles,
  ListChecks,
  UserRoundCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAITADrafts, useUpdateDraftStatus, type AITADraftStatus } from '@/hooks/useAITADrafts';
import { postDraftAsClassroomItem } from '@/lib/aiTAQueue';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import OperatorChat from '@/components/teacher/ai-ta/OperatorChat';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';

type TopTab = 'chat' | 'drafts';
type QueueId = 'replies' | 'approvals' | 'review' | 'assign' | 'analytics';

// Counts are nullable on purpose: a query that failed has no count, and the
// tiles must say so rather than print a zero the data never supported.
interface WorkspaceStats {
  pendingDrafts: number | null;
  uploadsToReview: number | null;
}

const STATUS_TABS: { id: AITADraftStatus | 'all'; label: string }[] = [
  { id: 'draft', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'posted', label: 'Posted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

function useWorkspaceStats(): WorkspaceStats {
  const { data } = useQuery<WorkspaceStats>({
    queryKey: ['teacher-command-stats'],
    queryFn: async () => {
      const [draftsRes, uploadsRes] = await Promise.all([
        supabase
          .from('ai_ta_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('external_work_uploads')
          .select('*', { count: 'exact', head: true })
          .in('processing_status', ['uploaded', 'needs_review']),
      ]);

      if (draftsRes.error) throw draftsRes.error;
      if (uploadsRes.error) throw uploadsRes.error;

      return {
        pendingDrafts: draftsRes.count ?? 0,
        uploadsToReview: uploadsRes.count ?? 0,
      };
    },
  });

  return data ?? { pendingDrafts: null, uploadsToReview: null };
}

// A count that could not be read renders as an em dash that explains itself on
// hover, never as 0.
function StatValue({ value, className }: { value: number | null; className?: string }) {
  if (value === null) {
    return (
      <span className={className} title="Couldn't load">
        —
      </span>
    );
  }
  return <span className={className}>{value}</span>;
}

function getStudentName(student: HubStudentRow) {
  return student.display_name || student.email || 'Student';
}

function getCompletionRate(student: HubStudentRow) {
  if (student.assignments_total === 0) return 0;
  return Math.round((student.assignments_completed / student.assignments_total) * 100);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface QueueRow {
  title: string;
  detail: string;
  meta: string;
  badge?: string;
  action: () => void;
}

interface QueueDef {
  id: QueueId;
  title: string;
  label: string;
  count: number | null;
  description: string;
  empty: string;
  Icon: typeof MessageSquare;
  actionLabel: string;
  action: () => void;
  rows: QueueRow[];
}

function CommandCenter() {
  const navigate = useNavigate();
  const stats = useWorkspaceStats();
  const { rows: students = [], loading, error: rosterError } = useHubStudents();
  const [activeQueue, setActiveQueue] = useState<QueueId>('replies');

  // The roster failing is not an empty roster. Anything counted off `students`
  // reports as unavailable rather than as zero.
  const rosterFailed = !!rosterError;
  const countFromRoster = (n: number) => (rosterFailed ? null : n);

  const needsReply = students.filter((student) => student.has_unread_from_student);
  const activeStudents = students.filter((student) => student.assignments_total > 0);
  const needsPlan = students.filter((student) => {
    const completion = getCompletionRate(student);
    return student.assignments_total === 0 || completion >= 80;
  });
  const completionAverage = rosterFailed
    ? null
    : activeStudents.length === 0
      ? 0
      : Math.round(
          activeStudents.reduce((sum, student) => sum + getCompletionRate(student), 0) /
            activeStudents.length,
        );

  const priorityStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => {
        if (a.has_unread_from_student !== b.has_unread_from_student) {
          return a.has_unread_from_student ? -1 : 1;
        }
        return getCompletionRate(a) - getCompletionRate(b);
      })
      .slice(0, 4);
  }, [students]);

  const queues: QueueDef[] = [
    {
      id: 'replies',
      title: 'Reply Queue',
      label: 'Student conversations waiting on Joshua.',
      count: countFromRoster(needsReply.length),
      description: 'Start here when students are waiting. These are conversations with unread student messages.',
      empty: 'No student replies are waiting.',
      Icon: MessageSquare,
      actionLabel: 'Open conversations',
      action: () => navigate('/teacher/conversations'),
      rows: needsReply.slice(0, 5).map((student) => ({
        title: getStudentName(student),
        detail: 'Unread student conversation',
        meta: `${student.assignments_completed}/${student.assignments_total} assignments complete`,
        badge: 'Reply',
        action: () => navigate('/teacher/conversations'),
      })),
    },
    {
      id: 'approvals',
      title: 'Approval Queue',
      label: 'Assistant output that cannot reach students yet.',
      count: stats.pendingDrafts,
      description: 'Review assistant drafts before anything is posted into a student-facing surface.',
      empty: 'No assistant drafts need approval.',
      Icon: FileText,
      actionLabel: 'Review drafts',
      action: () => navigate('/teacher/command?tab=drafts'),
      rows:
        stats.pendingDrafts > 0
          ? [
              {
                title: `${stats.pendingDrafts} assistant ${stats.pendingDrafts === 1 ? 'draft' : 'drafts'}`,
                detail: 'Approve, reject, or post drafts to Classroom.',
                meta: 'Nothing reaches students without approval',
                badge: 'Approval',
                action: () => navigate('/teacher/command?tab=drafts'),
              },
            ]
          : [],
    },
    {
      id: 'review',
      title: 'Review Queue',
      label: 'Uploaded work and outside material to inspect.',
      count: stats.uploadsToReview,
      description: 'Work that came in from outside the normal assignment flow and needs a teacher pass.',
      empty: 'No uploaded work is waiting for review.',
      Icon: UploadCloud,
      actionLabel: 'Review uploads',
      action: () => navigate('/teacher/library/uploads'),
      rows:
        stats.uploadsToReview > 0
          ? [
              {
                title: `${stats.uploadsToReview} ${stats.uploadsToReview === 1 ? 'upload' : 'uploads'} waiting`,
                detail: 'External work uploaded by students.',
                meta: 'Review before turning it into next steps',
                badge: 'Review',
                action: () => navigate('/teacher/library/uploads'),
              },
            ]
          : [],
    },
    {
      id: 'assign',
      title: 'Assign Queue',
      label: 'Students who may need the next piece of work.',
      count: countFromRoster(needsPlan.length),
      description: 'Use this queue to move from “who needs work?” into the assignment builder or student plan.',
      empty: 'No obvious assignment gaps from the current roster data.',
      Icon: ClipboardList,
      actionLabel: 'Assign from library',
      action: () => navigate('/teacher/library/assignments/new'),
      rows: needsPlan.slice(0, 5).map((student) => {
        const completion = getCompletionRate(student);
        return {
          title: getStudentName(student),
          detail:
            student.assignments_total === 0
              ? 'No active assignment data yet'
              : 'Most assigned work is complete',
          meta: `${completion}% completion`,
          badge: 'Assign',
          action: () => navigate(`/teacher/students/${student.class_id}`),
        };
      }),
    },
    {
      id: 'analytics',
      title: 'Analytics Queue',
      label: 'Progress patterns that need a teaching decision.',
      count: countFromRoster(activeStudents.length),
      description: 'A compact watchlist for low completion and progress checks, with the full Insights surface one click away.',
      Icon: Target,
      empty: 'No active assignment analytics are available yet.',
      actionLabel: 'Open insights',
      action: () => navigate('/teacher/insights'),
      rows: [...activeStudents]
        .sort((a, b) => getCompletionRate(a) - getCompletionRate(b))
        .slice(0, 5)
        .map((student) => {
          const completion = getCompletionRate(student);
          return {
            title: getStudentName(student),
            detail: 'Assignment completion watch',
            meta: `${completion}% complete`,
            badge: completion < 50 ? 'Watch' : 'Progress',
            action: () => navigate(`/teacher/students/${student.class_id}`),
          };
        }),
    },
  ];

  const active = queues.find((queue) => queue.id === activeQueue) ?? queues[0];
  // One unreadable part makes the total unknowable, so the whole tile says so.
  const waitingParts = [
    countFromRoster(needsReply.length),
    stats.pendingDrafts,
    stats.uploadsToReview,
    countFromRoster(needsPlan.length),
  ];
  const totalWaiting = waitingParts.some((n) => n === null)
    ? null
    : waitingParts.reduce((sum, n) => sum + (n as number), 0);

  const commandActions = [
    {
      title: 'Assign work',
      detail: 'Create homework or send prepared material.',
      Icon: Send,
      action: () => navigate('/teacher/library/assignments/new'),
    },
    {
      title: 'Student plans',
      detail: 'Open roster, plan, recaps, and per-student actions.',
      Icon: Users,
      action: () => navigate('/teacher?ws=people'),
    },
    {
      title: 'Insights',
      detail:
        completionAverage === null
          ? "Average completion: couldn't load"
          : `Average completion: ${completionAverage}%`,
      Icon: BarChart3,
      action: () => navigate('/teacher/insights'),
    },
    {
      title: 'Schedule',
      detail: 'Build weekly plans and session cadence.',
      Icon: CalendarDays,
      action: () => navigate('/teacher/schedule'),
    },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#080808]">
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800/70 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">
              <ListChecks className="h-3.5 w-3.5" />
              Work queue hub
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Handle the next teacher move.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Queues first, students inside the queue. Assign work, inspect progress, and open the
              exact surface without sorting through page divisions.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-[420px]">
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Waiting</div>
              <StatValue
                value={totalWaiting}
                className="mt-1 block text-xl font-semibold tabular-nums text-zinc-50"
              />
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Students</div>
              <StatValue
                value={countFromRoster(students.length)}
                className="mt-1 block text-xl font-semibold tabular-nums text-zinc-50"
              />
            </div>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Avg done</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-zinc-50">
                {completionAverage === null ? (
                  <span title="Couldn't load">—</span>
                ) : (
                  `${completionAverage}%`
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-h-[720px] grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_380px]">
          <section className="rounded-lg border border-zinc-800/80 bg-zinc-950/70">
            <div className="border-b border-zinc-800/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-zinc-100">Queues</h3>
              <p className="mt-0.5 text-xs text-zinc-500">Choose the work type first.</p>
            </div>
            <div className="space-y-1 p-2">
              {queues.map((queue) => (
                <button
                  key={queue.id}
                  type="button"
                  onClick={() => setActiveQueue(queue.id)}
                  className={cn(
                    'group grid w-full grid-cols-[34px_minmax(0,1fr)_44px] items-center gap-3 rounded-md px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
                    active.id === queue.id
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'text-zinc-300 hover:bg-zinc-900',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md',
                      active.id === queue.id ? 'bg-zinc-950 text-amber-200' : 'bg-zinc-900 text-zinc-500',
                    )}
                  >
                    <queue.Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{queue.title}</div>
                    <div
                      className={cn(
                        'mt-0.5 truncate text-[11px]',
                        active.id === queue.id ? 'text-zinc-600' : 'text-zinc-500',
                      )}
                    >
                      {queue.label}
                    </div>
                  </div>
                  <div
                    className={cn(
                      'rounded-full px-2 py-1 text-center text-xs font-semibold tabular-nums',
                      active.id === queue.id ? 'bg-zinc-950 text-zinc-50' : 'bg-zinc-900 text-zinc-300',
                    )}
                  >
                    <StatValue value={queue.count} />
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-zinc-800/80 bg-zinc-950/60">
            <div className="flex flex-col gap-3 border-b border-zinc-800/70 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-400/10 text-amber-200">
                    <active.Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-zinc-50">{active.title}</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">{active.label}</p>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">{active.description}</p>
              </div>
              <Button
                size="sm"
                onClick={active.action}
                className="bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                {active.actionLabel}
                <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="p-3">
              {loading ? (
                <div className="flex items-center gap-2 px-3 py-10 text-sm text-zinc-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading teacher workspace...
                </div>
              ) : active.rows.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-800 px-4 py-12 text-center">
                  <Sparkles className="mx-auto h-5 w-5 text-zinc-600" />
                  <div className="mt-3 text-sm font-medium text-zinc-300">{active.empty}</div>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-zinc-500">
                    Use the action button above when you want to enter this workspace anyway.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {active.rows.map((row) => (
                    <button
                      key={`${active.id}-${row.title}-${row.meta}`}
                      type="button"
                      onClick={row.action}
                      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-md border border-zinc-800/80 bg-[#0d0d0d] px-4 py-4 text-left transition-colors hover:border-amber-400/30 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate text-sm font-semibold text-zinc-100">{row.title}</div>
                          {row.badge && (
                            <span className="rounded-sm bg-amber-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
                              {row.badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{row.detail}</p>
                        <div className="mt-2 text-xs text-zinc-600">{row.meta}</div>
                      </div>
                      <ArrowUpRight className="mt-1 h-4 w-4 text-zinc-600 transition-colors group-hover:text-amber-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-zinc-800/80 bg-zinc-950/70">
              <div className="border-b border-zinc-800/70 px-4 py-3">
                <h3 className="text-sm font-semibold text-zinc-100">Command stack</h3>
                <p className="mt-0.5 text-xs text-zinc-500">The common moves stay one click away.</p>
              </div>
              <div className="grid grid-cols-1 divide-y divide-zinc-800/70">
                {commandActions.map((action) => (
                  <button
                    key={action.title}
                    type="button"
                    onClick={action.action}
                    className="group flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
                  >
                    <div className="rounded-md bg-zinc-900 p-2 text-zinc-400 group-hover:text-amber-200">
                      <action.Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-zinc-100">{action.title}</div>
                      <p className="mt-0.5 text-xs leading-5 text-zinc-500">{action.detail}</p>
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 text-zinc-600 group-hover:text-amber-300" />
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-800/80 bg-zinc-950/70">
              <div className="flex items-center justify-between border-b border-zinc-800/70 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Student watchlist</h3>
                  <p className="mt-0.5 text-xs text-zinc-500">Support view, not the page structure.</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/teacher?ws=people')}
                  className="h-8 text-zinc-300 hover:bg-zinc-900"
                >
                  View all
                </Button>
              </div>
              <div className="divide-y divide-zinc-800/70">
                {priorityStudents.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-zinc-500">No students are loaded yet.</div>
                ) : (
                  priorityStudents.map((student) => {
                    const completion = getCompletionRate(student);
                    return (
                      <button
                        key={student.class_id}
                        type="button"
                        onClick={() => navigate(`/teacher/students/${student.class_id}`)}
                        className="group grid w-full grid-cols-[minmax(0,1fr)_62px] gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <UserRoundCheck className="h-3.5 w-3.5 text-zinc-600" />
                            <div className="truncate text-sm font-medium text-zinc-100">
                              {getStudentName(student)}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {student.assignments_completed}/{student.assignments_total} assignments complete
                          </div>
                        </div>
                        <div className="text-right text-sm font-semibold tabular-nums text-zinc-100">
                          {completion}%
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            <section className="h-[430px] overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950">
              <OperatorChat />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DraftsView() {
  const { user } = useAuth();
  const [status, setStatus] = useState<AITADraftStatus | 'all'>('draft');
  const { data: drafts = [], isLoading, refetch } = useAITADrafts({ status });
  const updateStatus = useUpdateDraftStatus();

  const { data: nameMap = {} } = useQuery<Record<string, string>>({
    queryKey: ['ai-ta-drafts-names', drafts.map((d) => d.student_id).sort().join(',')],
    enabled: drafts.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(drafts.map((d) => d.student_id)));
      if (ids.length === 0) return {};
      const { data } = await supabase.rpc('get_conversation_participant_names', {
        _user_ids: ids,
      });
      const out: Record<string, string> = {};
      for (const r of (data ?? []) as { user_id: string; display_name: string | null }[]) {
        out[r.user_id] = r.display_name ?? 'Student';
      }
      return out;
    },
  });

  const handleApprove = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'approved' });
      toast.success('Approved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Approve failed'));
    }
  };
  const handleReject = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'rejected' });
      toast.success('Rejected');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Reject failed'));
    }
  };
  const handlePost = async (id: string) => {
    if (!user) return;
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    try {
      await postDraftAsClassroomItem(draft, user.id);
      await refetch();
      toast.success('Posted to Classroom');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Post failed'));
    }
  };

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Drafts</h2>
        <p className="text-sm text-zinc-400 mt-1">
          Everything the assistant proposed — nothing reaches a student until you approve.
        </p>
      </div>

      <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900/60">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={cn(
              'px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors',
              status === t.id
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-400 hover:text-zinc-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-zinc-500 text-sm flex items-center">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          No drafts here. Ask the assistant to make one.
        </div>
      ) : (
        <ul className="space-y-2">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {d.draft_type.replace('_', ' ')} · {nameMap[d.student_id] ?? 'Student'}
                  </div>
                  {d.prompt && (
                    <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      Prompt: {d.prompt}
                    </div>
                  )}
                  {d.draft_markdown && (
                    <div className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap line-clamp-6">
                      {d.draft_markdown}
                    </div>
                  )}
                  <div className="mt-2 text-[11px] text-zinc-500">
                    {format(new Date(d.created_at), 'MMM d, h:mm a')}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {d.status === 'draft' && (
                    <>
                      <Button size="sm" onClick={() => handleApprove(d.id)}>
                        <Check className="w-3.5 h-3.5 mr-1.5" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleReject(d.id)}>
                        <X className="w-3.5 h-3.5 mr-1.5" /> Reject
                      </Button>
                    </>
                  )}
                  {d.status === 'approved' && (
                    <Button size="sm" onClick={() => handlePost(d.id)}>
                      Post to Classroom
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TeacherAITA() {
  const [params, setParams] = useSearchParams();
  const tab: TopTab = (params.get('tab') as TopTab) === 'drafts' ? 'drafts' : 'chat';
  const setTab = (t: TopTab) => {
    if (t === 'chat') setParams({});
    else setParams({ tab: t });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#090909]">
      <div className="shrink-0 border-b border-zinc-800/60 px-4 py-2 sm:px-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            Teacher workspace
          </div>
          <div className="truncate text-sm font-semibold text-zinc-100">
            Command center and assistant
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
        <button
          onClick={() => setTab('chat')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'chat'
              ? 'bg-zinc-100 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100',
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Command
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'drafts'
              ? 'bg-zinc-100 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100',
          )}
        >
          <FileText className="w-3.5 h-3.5" /> Drafts
        </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'chat' ? (
          <CommandCenter />
        ) : (
          <div className="h-full overflow-y-auto">
            <DraftsView />
          </div>
        )}
      </div>
    </div>
  );
}
