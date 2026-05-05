import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAITADrafts, useUpdateDraftStatus, type AITADraftStatus } from '@/hooks/useAITADrafts';
import { postDraftAsClassroomItem } from '@/lib/aiTAQueue';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const STATUS_TABS: { id: AITADraftStatus | 'all'; label: string }[] = [
  { id: 'draft', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'posted', label: 'Posted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export default function TeacherAITA() {
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
      const { data } = await (supabase as any).rpc('get_conversation_participant_names', {
        _user_ids: ids,
      });
      const out: Record<string, string> = {};
      for (const r of (data ?? []) as { user_id: string; display_name: string | null }[]) {
        out[r.user_id] = r.display_name ?? 'Student';
      }
      return out;
    },
  });

  const handleApprove = async (draftId: string) => {
    try {
      await updateStatus.mutateAsync({ id: draftId, status: 'approved' });
      toast.success('Approved');
    } catch (e: any) {
      toast.error(e?.message ?? 'Approve failed');
    }
  };

  const handleReject = async (draftId: string) => {
    try {
      await updateStatus.mutateAsync({ id: draftId, status: 'rejected' });
      toast.success('Rejected');
    } catch (e: any) {
      toast.error(e?.message ?? 'Reject failed');
    }
  };

  const handlePost = async (draftId: string) => {
    if (!user) return;
    const draft = drafts.find((d) => d.id === draftId);
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
    <div className="px-6 py-6 max-w-4xl space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-zinc-400">
          <Sparkles className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            AI Teaching Assistant
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Drafts</h2>
        <p className="text-sm text-zinc-400">
          Drafts the AI created for your review. Nothing posts to a student
          until you approve it.
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
          No drafts here.
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
