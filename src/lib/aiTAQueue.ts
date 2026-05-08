import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem } from './classroomItems';
import type { AITADraft } from '@/hooks/useAITADrafts';

/**
 * Convert an approved AI TA draft into the appropriate classroom_items
 * row(s). Marks the draft as "posted" with a timestamp on success.
 *
 * V1 supports session_recap, next_assignment (note), classroom_update_bundle
 * (creates an announcement), and message (creates an announcement).
 * weekly_plan posting is handled separately in the Weekly Plan builder.
 */
export async function postDraftAsClassroomItem(draft: AITADraft, currentUserId: string) {
  if (!draft) throw new Error('No draft');
  if (draft.status !== 'approved' && draft.status !== 'draft') {
    throw new Error('Draft must be approved before posting');
  }

  let createdId: string | null = null;
  switch (draft.draft_type) {
    case 'session_recap': {
      const item = await createClassroomItem({
        studentId: draft.student_id,
        createdBy: currentUserId,
        type: 'session_recap',
        title: (draft.draft_json as { title?: string } | null)?.title ?? 'Session recap',
        contentMarkdown: draft.draft_markdown ?? null,
        visibleToStudent: true,
        status: 'assigned',
      });
      createdId = item.id;
      break;
    }
    case 'next_assignment':
    case 'next_session_plan': {
      const item = await createClassroomItem({
        studentId: draft.student_id,
        createdBy: currentUserId,
        type: 'note',
        title: (draft.draft_json as { title?: string } | null)?.title ?? 'From your tutor',
        contentMarkdown: draft.draft_markdown ?? null,
        visibleToStudent: true,
        status: 'assigned',
      });
      createdId = item.id;
      break;
    }
    case 'message':
    case 'classroom_update_bundle': {
      const item = await createClassroomItem({
        studentId: draft.student_id,
        createdBy: currentUserId,
        type: 'announcement',
        title: (draft.draft_json as { title?: string } | null)?.title ?? 'Announcement',
        contentMarkdown: draft.draft_markdown ?? null,
        visibleToStudent: true,
        status: 'assigned',
      });
      createdId = item.id;
      break;
    }
    case 'weekly_plan':
      // Weekly plans are constructed by the plan builder, not here.
      throw new Error('Weekly plan drafts are posted from the plan builder');
    default:
      throw new Error(`Unsupported draft type: ${draft.draft_type}`);
  }

  const { error } = await supabase
    .from('ai_ta_drafts')
    .update({ status: 'posted', posted_at: new Date().toISOString() })
    .eq('id', draft.id);
  if (error) throw error;
  return createdId;
}
