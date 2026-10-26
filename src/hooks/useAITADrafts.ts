import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type AITADraftType =
  | 'weekly_plan'
  | 'next_assignment'
  | 'session_recap'
  | 'next_session_plan'
  | 'classroom_update_bundle'
  | 'message';

export type AITADraftStatus = 'draft' | 'approved' | 'rejected' | 'posted';

export interface AITADraft {
  id: string;
  student_id: string;
  created_by: string;
  draft_type: AITADraftType;
  prompt: string | null;
  input_snapshot_json: Record<string, unknown>;
  draft_json: Record<string, unknown> | null;
  draft_markdown: string | null;
  status: AITADraftStatus;
  approved_by: string | null;
  approved_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useAITADrafts(opts: { studentId?: string | null; status?: AITADraftStatus | 'all' } = {}) {
  const { studentId = null, status = 'all' } = opts;
  const { user } = useAuth();
  return useQuery<AITADraft[]>({
    queryKey: ['ai-ta-drafts', studentId, status],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from('ai_ta_drafts').select('*');
      if (studentId) q = q.eq('student_id', studentId);
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as AITADraft[];
    },
  });
}

interface CreateDraftInput {
  studentId: string;
  draftType: AITADraftType;
  prompt?: string;
  draftMarkdown?: string;
  draftJson?: Record<string, unknown>;
  inputSnapshot?: Record<string, unknown>;
}

export function useCreateAITADraft() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDraftInput) => {
      if (!user) throw new Error('Not signed in');
      const { data, error } = await supabase
        .from('ai_ta_drafts')
        .insert({
          student_id: input.studentId,
          created_by: user.id,
          draft_type: input.draftType,
          prompt: input.prompt ?? null,
          draft_markdown: input.draftMarkdown ?? null,
          draft_json: (input.draftJson ?? null) as Json | null,
          input_snapshot_json: (input.inputSnapshot ?? {}) as Json,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
      return data as AITADraft;
    },
  });
}

export function useUpdateDraftStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AITADraftStatus }) => {
      const patch: {
        status: AITADraftStatus;
        approved_by?: string | null;
        approved_at?: string;
        posted_at?: string;
      } = { status };
      if (status === 'approved') {
        patch.approved_by = user?.id ?? null;
        patch.approved_at = new Date().toISOString();
      }
      if (status === 'posted') {
        patch.posted_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('ai_ta_drafts')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
      return data as AITADraft;
    },
  });
}
