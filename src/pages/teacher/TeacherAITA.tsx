import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Check, X, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAITADrafts, useUpdateDraftStatus, type AITADraftStatus } from '@/hooks/useAITADrafts';
import { postDraftAsClassroomItem } from '@/lib/aiTAQueue';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import OperatorChat from '@/components/teacher/ai-ta/OperatorChat';

type TopTab = 'chat' | 'drafts';

const STATUS_TABS: { id: AITADraftStatus | 'all'; label: string }[] = [
  { id: 'draft', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'posted', label: 'Posted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

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
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b border-zinc-800/60 px-6 py-2 flex items-center gap-1">
        <button
          onClick={() => setTab('chat')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'chat'
              ? 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
              : 'text-zinc-400 hover:text-zinc-100 border border-transparent',
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button
          onClick={() => setTab('drafts')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            tab === 'drafts'
              ? 'bg-amber-500/15 text-amber-200 border border-amber-500/20'
              : 'text-zinc-400 hover:text-zinc-100 border border-transparent',
          )}
        >
          <FileText className="w-3.5 h-3.5" /> Drafts
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'chat' ? (
          <OperatorChat />
        ) : (
          <div className="h-full overflow-y-auto">
            <DraftsView />
          </div>
        )}
      </div>
    </div>
  );
}
