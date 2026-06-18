import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createAssignments, listGuidedDrills } from '@/lib/guidedDrills';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem } from '@/lib/classroomNotify';
import type { DeskTask } from './deskTasks';

export interface DrillOption {
  id: string;
  title: string;
}

/**
 * Loads published guided drills for an assign card. Honest in local preview:
 * never calls Supabase (returns seeded sample drills), mirroring the desk's
 * preview discipline.
 */
export function useGuidedDrillOptions(enabled: boolean, localPreview: boolean) {
  const [options, setOptions] = useState<DrillOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded || loading) return;
    if (localPreview) {
      setOptions([
        { id: 'preview-drill-weaken', title: 'Weaken — causal claims' },
        { id: 'preview-drill-sa', title: 'Sufficient assumption — short set' },
        { id: 'preview-drill-structure', title: 'Argument structure — diagnostic' },
      ]);
      setLoaded(true);
      return;
    }
    setLoading(true);
    listGuidedDrills()
      .then((drills) => {
        setOptions(drills.filter((d) => d.is_published).map((d) => ({ id: d.id, title: d.title })));
        setLoaded(true);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load guided drills'))
      .finally(() => setLoading(false));
  }, [enabled, loaded, loading, localPreview]);

  return { options, loading };
}

export interface ApproveOptions {
  /** Edited draft body (reply message / recap markdown). */
  body?: string;
  /** Guided-drill id for an assign card. */
  drillId?: string;
  drillTitle?: string;
  dueAt?: string | null;
  /** ai_ta_drafts row the assistant created for a reply, to reconcile on send. */
  draftRowId?: string;
}

/**
 * The four real desk consequences, wired to existing actions and reconciling the
 * left queue afterward (query invalidation / inbox + roster refresh). Idempotency
 * is enforced by the caller (DeskActionCard status guard); these just perform the
 * action and surface failures rather than swallowing them.
 */
export function useDeskActions({
  refreshInbox,
  refreshStudents,
}: {
  refreshInbox: () => void;
  refreshStudents: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const approve = useCallback(
    async (task: DeskTask, opts: ApproveOptions = {}) => {
      if (!user) throw new Error('Not signed in');

      switch (task.sourceKind) {
        case 'conversation': {
          const body = (opts.body ?? '').trim();
          if (!body) throw new Error('Write a reply before sending');
          if (!task.sourceId) throw new Error('No conversation linked to this task');
          const { error } = await supabase
            .from('messages')
            .insert({ conversation_id: task.sourceId, sender_id: user.id, body });
          if (error) throw error;
          // Reconcile the assistant's message draft, if one was created.
          if (opts.draftRowId) {
            await supabase
              .from('ai_ta_drafts')
              .update({ status: 'posted', posted_at: new Date().toISOString() })
              .eq('id', opts.draftRowId);
            queryClient.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
          }
          refreshInbox();
          return;
        }

        case 'draft': {
          if (!task.sourceId) throw new Error('No draft linked to this task');
          const patch: Record<string, unknown> = {
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          };
          const body = (opts.body ?? '').trim();
          if (body) patch.draft_markdown = body;
          const { error } = await supabase.from('ai_ta_drafts').update(patch).eq('id', task.sourceId);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
          return;
        }

        case 'upload': {
          if (!task.sourceId) throw new Error('No upload linked to this task');
          const { error } = await supabase
            .from('external_work_uploads')
            .update({ processing_status: 'parsed', reviewed_at: new Date().toISOString() })
            .eq('id', task.sourceId);
          if (error) throw error;
          queryClient.invalidateQueries({ queryKey: ['external-uploads-queue'] });
          return;
        }

        case 'assignment-gap': {
          if (!task.studentId) throw new Error('No student linked to this task');
          if (!opts.drillId) throw new Error('Pick a guided drill to assign');
          const dueAt = opts.dueAt ? new Date(opts.dueAt).toISOString() : null;
          const assignments = await createAssignments({
            guided_drill_ids: [opts.drillId],
            student_ids: [task.studentId],
            assigned_by: user.id,
          });
          await Promise.all(
            assignments.map(async (assignment) => {
              await createClassroomItem({
                studentId: assignment.student_id,
                createdBy: user.id,
                type: 'drill',
                title: opts.drillTitle ?? 'Guided drill',
                description: `New guided drill: ${opts.drillTitle ?? ''}`,
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
                  title: opts.drillTitle ?? 'Guided drill',
                  route: `/guided/${assignment.id}?returnTo=/classroom`,
                  description: `New guided drill: ${opts.drillTitle ?? ''}`,
                });
              } catch (notifyError) {
                console.warn('[DeskAssistant] notify failed', notifyError);
              }
            }),
          );
          queryClient.invalidateQueries({ queryKey: ['guided-drill-assignments'] });
          queryClient.invalidateQueries({ queryKey: ['classroom-items'] });
          queryClient.invalidateQueries({ queryKey: ['hub-assignment-counts'] });
          refreshStudents();
          return;
        }

        default:
          throw new Error('This task type cannot be approved from the desk yet');
      }
    },
    [queryClient, refreshInbox, refreshStudents, user],
  );

  const discard = useCallback(
    async (task: DeskTask, opts: ApproveOptions = {}) => {
      // Reject any persisted draft so it leaves the Review queue; other task
      // types have nothing persisted and just dismiss the card.
      const draftId = task.sourceKind === 'draft' ? task.sourceId : opts.draftRowId;
      if (draftId) {
        const { error } = await supabase.from('ai_ta_drafts').update({ status: 'rejected' }).eq('id', draftId);
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['ai-ta-drafts'] });
      }
    },
    [queryClient],
  );

  return { approve, discard };
}
