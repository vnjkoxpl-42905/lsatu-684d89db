import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  type SessionBundle,
  type PartKey,
  type BundlePart,
  allIncludedApproved,
  patchPart,
} from '@/lib/sessionBundle';
import { publishSessionBundle, type PublishResult } from '@/lib/publishSessionBundle';

// Phase 2/3 — drive the session learning bundle: synthesize, per-part
// review/approve, and publish. The bundle lives in an `ai_ta_drafts` row of
// draft_type='classroom_update_bundle'; reads come through useAITADrafts.

interface SynthesizeResult {
  ok: boolean;
  draft_id?: string;
  included_student_parts?: number;
  error?: string;
}

/** Build (or regenerate) a bundle from a stored session via the edge function. */
export function useSynthesizeBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      ledgerId?: string;
      sessionId?: string;
      studentClassId?: string;
      regenerate?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke<SynthesizeResult>(
        'synthesize-session-bundle',
        {
          body: {
            ledger_id: args.ledgerId,
            session_id: args.sessionId,
            student_class_id: args.studentClassId,
            regenerate: args.regenerate ?? false,
          },
        },
      );
      if (error) throw error;
      if (data && !data.ok) throw new Error(data.error || 'Synthesis failed');
      return data as SynthesizeResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
      qc.invalidateQueries({ queryKey: ['session-ingestions'] });
    },
  });
}

/**
 * Write an edited / approved bundle back to its draft. Recomputes the coarse
 * row status: 'approved' only when every included part is approved, else
 * 'draft' (build-spec §5). Never touches a 'posted' row down to draft.
 */
export function useUpdateBundle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { draftId: string; bundle: SessionBundle; currentStatus: string }) => {
      const { draftId, bundle, currentStatus } = args;
      const fullyApproved = allIncludedApproved(bundle);
      const patch: {
        draft_json: Json;
        status?: string;
        approved_by?: string | null;
        approved_at?: string | null;
      } = { draft_json: bundle as unknown as Json };

      if (currentStatus !== 'posted') {
        if (fullyApproved) {
          patch.status = 'approved';
          patch.approved_by = user?.id ?? null;
          patch.approved_at = new Date().toISOString();
        } else {
          patch.status = 'draft';
          patch.approved_by = null;
          patch.approved_at = null;
        }
      }

      const { data, error } = await supabase
        .from('ai_ta_drafts')
        .update(patch)
        .eq('id', draftId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-ta-drafts'] }),
  });
}

/** Convenience: apply a single-part patch and persist. */
export function useApplyPartPatch() {
  const update = useUpdateBundle();
  return {
    ...update,
    applyPatch: (args: {
      draftId: string;
      bundle: SessionBundle;
      currentStatus: string;
      key: PartKey;
      patch: Partial<BundlePart>;
    }) =>
      update.mutateAsync({
        draftId: args.draftId,
        bundle: patchPart(args.bundle, args.key, args.patch),
        currentStatus: args.currentStatus,
      }),
  };
}

/** Publish approved, unposted, student-facing parts to the Classroom. */
export function usePublishBundle() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation<PublishResult, Error, { studentId: string; draftId: string; bundle: SessionBundle; only?: PartKey[] }>(
    {
      mutationFn: async (args) => {
        if (!user) throw new Error('Not signed in');
        return publishSessionBundle({
          admin: user,
          studentId: args.studentId,
          draftId: args.draftId,
          bundle: args.bundle,
          only: args.only,
        });
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
        qc.invalidateQueries({ queryKey: ['session-ingestions'] });
        qc.invalidateQueries({ queryKey: ['classroom-items'] });
      },
    },
  );
}
