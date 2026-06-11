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
  Archive,
  BookOpen,
  ArrowUpRight,
  Radio,
  Send,
  Target,
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

interface WorkspaceStats {
  pendingDrafts: number;
  uploadsToReview: number;
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
      const [{ count: pendingDrafts }, { count: uploadsToReview }] = await Promise.all([
        supabase
          .from('ai_ta_drafts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('external_work_uploads')
          .select('*', { count: 'exact', head: true })
          .in('processing_status', ['uploaded', 'needs_review']),
      ]);

      return {
        pendingDrafts: pendingDrafts ?? 0,
        uploadsToReview: uploadsToReview ?? 0,
      };
    },
  });

  return data ?? { pendingDrafts: 0, uploadsToReview: 0 };
}

function getStudentName(student: HubStudentRow) {
  return student.display_name || student.email || 'Student';
}

function getCompletionRate(student: HubStudentRow) {
  if (student.assignments_total === 0) return 0;
  return Math.round((student.assignments_completed / student.assignments_total) * 100);
}

function CommandCenter() {
  const navigate = useNavigate();
  const stats = useWorkspaceStats();
  const { rows: students = [], loading } = useHubStudents();

  const needsReply = students.filter((student) => student.has_unread_from_student);
  const activeStudents = students.filter((student) => student.assignments_total > 0);
  const completionAverage =
    activeStudents.length === 0
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

  const commandTiles = [
    {
      label: 'Pending drafts',
      value: stats.pendingDrafts,
      detail: 'Review before anything reaches students',
      Icon: FileText,
      action: () => navigate('/teacher?tab=drafts'),
    },
    {
      label: 'Needs reply',
      value: needsReply.length,
      detail: 'Unread student conversations',
      Icon: MessageSquare,
      action: () => navigate('/teacher/conversations'),
    },
    {
      label: 'Uploads',
      value: stats.uploadsToReview,
      detail: 'External work waiting for review',
      Icon: UploadCloud,
      action: () => navigate('/teacher/library/uploads'),
    },
    {
      label: 'Completion',
      value: `${completionAverage}%`,
      detail: activeStudents.length === 0 ? 'No active assignment data yet' : 'Average active assignment completion',
      Icon: Target,
      action: () => navigate('/teacher/students'),
    },
  ];

  const workflows = [
    {
      title: 'Build a weekly plan',
      description: 'Open the schedule workspace and assemble the next seven days.',
      Icon: CalendarDays,
      action: () => navigate('/teacher/schedule'),
    },
    {
      title: 'Assign drills or homework',
      description: 'Create student work from the assignment library.',
      Icon: ClipboardList,
      action: () => navigate('/teacher/library/assignments/new'),
    },
    {
      title: 'Browse bootcamp sources',
      description: 'Inspect the admin-only reference library.',
      Icon: Archive,
      action: () => navigate('/teacher/reference-library'),
    },
    {
      title: 'Use message templates',
      description: 'Find reusable language for recaps and follow-ups.',
      Icon: BookOpen,
      action: () => navigate('/teacher/templates'),
    },
  ];

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#090909]">
      <div className="grid min-h-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="min-w-0 border-r border-zinc-800/70 px-5 py-5 sm:px-7 lg:px-9">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                  <Radio className="h-3.5 w-3.5" />
                  Live teacher command
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                  Run the teaching day from one place.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                  Prioritize replies, approve assistant drafts, review student work, and jump into
                  the exact admin surface without hunting through the app.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => navigate('/teacher/students')}
                  className="bg-zinc-100 text-zinc-950 hover:bg-white"
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Student hub
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate('/teacher?tab=drafts')}
                  className="border border-zinc-800 text-zinc-200 hover:bg-zinc-900"
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Approval queue
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {commandTiles.map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={tile.action}
                  className="group rounded-lg border border-zinc-800/80 bg-zinc-950/70 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-zinc-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-colors group-hover:text-amber-200">
                      <tile.Icon className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-amber-300" />
                  </div>
                  <div className="mt-4 text-3xl font-semibold tabular-nums text-zinc-50">
                    {tile.value}
                  </div>
                  <div className="mt-1 text-sm font-medium text-zinc-200">{tile.label}</div>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{tile.detail}</p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
              <section className="rounded-lg border border-zinc-800/80 bg-zinc-950/60">
                <div className="flex items-center justify-between border-b border-zinc-800/70 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">Priority students</h3>
                    <p className="text-xs text-zinc-500">Unread first, then lowest completion.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate('/teacher/students')}
                    className="h-8 text-zinc-300 hover:bg-zinc-900"
                  >
                    View all
                  </Button>
                </div>
                <div className="divide-y divide-zinc-800/70">
                  {loading ? (
                    <div className="px-4 py-8 text-sm text-zinc-500">Loading roster...</div>
                  ) : priorityStudents.length === 0 ? (
                    <div className="px-4 py-8 text-sm text-zinc-500">
                      No students are loaded yet.
                    </div>
                  ) : (
                    priorityStudents.map((student) => {
                      const completion = getCompletionRate(student);
                      return (
                        <button
                          key={student.class_id}
                          type="button"
                          onClick={() => navigate(`/teacher/students/${student.class_id}`)}
                          className="group grid w-full grid-cols-[minmax(0,1fr)_88px] gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-medium text-zinc-100">
                                {getStudentName(student)}
                              </div>
                              {student.has_unread_from_student && (
                                <span className="rounded-sm bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
                                  Reply
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {student.assignments_completed}/{student.assignments_total} assignments complete
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums text-zinc-100">
                              {completion}%
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-amber-300"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-zinc-800/80 bg-zinc-950/60">
                <div className="border-b border-zinc-800/70 px-4 py-3">
                  <h3 className="text-sm font-semibold text-zinc-100">Fast lanes</h3>
                  <p className="text-xs text-zinc-500">The workflows that should never be buried.</p>
                </div>
                <div className="grid grid-cols-1 divide-y divide-zinc-800/70">
                  {workflows.map((workflow) => (
                    <button
                      key={workflow.title}
                      type="button"
                      onClick={workflow.action}
                      className="group flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
                    >
                      <div className="rounded-md bg-zinc-900 p-2 text-zinc-400 group-hover:text-amber-200">
                        <workflow.Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-zinc-100">{workflow.title}</div>
                        <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                          {workflow.description}
                        </p>
                      </div>
                      <ArrowUpRight className="mt-1 h-4 w-4 text-zinc-600 group-hover:text-amber-300" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>

        <aside className="min-h-[620px] border-t border-zinc-800/70 xl:min-h-0 xl:border-t-0">
          <OperatorChat />
        </aside>
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
    } catch (e: any) {
      toast.error(e?.message ?? 'Approve failed');
    }
  };
  const handleReject = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'rejected' });
      toast.success('Rejected');
    } catch (e: any) {
      toast.error(e?.message ?? 'Reject failed');
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
    } catch (e: any) {
      toast.error(e?.message ?? 'Post failed');
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
