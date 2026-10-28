import { newAssignmentDelivery } from '@/lib/assignmentDelivery';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { notifyStudentOfSessionRecap } from '@/lib/sessionBundleNotify';
import type { Json } from '@/integrations/supabase/types';
import {
  type PartKey,
  type SessionBundle,
  PART_LABELS,
  partToMarkdown,
  unpublishedApprovedParts,
} from '@/lib/sessionBundle';

/**
 * Publish step (build-spec §6, Phase 3). Separate from approve. Materializes
 * ONLY approved, not-yet-posted, student-facing parts into the real Classroom
 * rails, then notifies. Partial publish is allowed; re-publish is idempotent
 * (parts already marked posted are skipped).
 *
 * V1 runs under the admin's JWT (manual action), so the existing
 * `created_by = auth.uid()` RLS on classroom_items / conversations / messages
 * is satisfied directly. No new edge function and no service-role path needed
 * until cron (Phase 3-later).
 *
 * HARD RULES: never publish an unapproved part, never expose source labels.
 * Reuses `notifyStudentOfClassroomItem` (correct "assignment" copy) for
 * homework/quiz, and the dedicated session-recap notifier for the note.
 */

export interface PublishPartOutcome {
  part: PartKey;
  ok: boolean;
  classroom_item_id?: string;
  notify_summary?: string;
  error?: string;
}

export interface PublishResult {
  ok: boolean;
  published: PublishPartOutcome[];
  /** The mutated bundle, with posted flags + materialized ids written back. */
  bundle: SessionBundle;
  nothing_to_publish: boolean;
}

interface PublishArgs {
  admin: User;
  /** auth.users.id of the matched student (ai_ta_drafts.student_id). */
  studentId: string;
  draftId: string;
  bundle: SessionBundle;
  /** Restrict to these parts; defaults to all approved + unpublished parts. */
  only?: PartKey[];
}

function itemRoute(id: string): string {
  return `/classroom/item/${encodeURIComponent(id)}`;
}

export async function publishSessionBundle(args: PublishArgs): Promise<PublishResult> {
  const { admin, studentId, draftId, bundle } = args;
  const targets = (args.only ?? unpublishedApprovedParts(bundle)).filter((k) =>
    unpublishedApprovedParts(bundle).includes(k),
  );

  if (targets.length === 0) {
    return { ok: true, published: [], bundle, nothing_to_publish: true };
  }

  // Work on a mutable copy so we can write posted flags back atomically.
  const next: SessionBundle = { ...bundle, parts: { ...bundle.parts } };
  const outcomes: PublishPartOutcome[] = [];
  const delivery = newAssignmentDelivery();
  const assignedParts: Array<{ title: string; id: string }> = [];

  for (const key of targets) {
    const part = next.parts[key];
    if (!part) continue;
    try {
      const title = (part.title?.trim() || PART_LABELS[key]).slice(0, 200);
      const markdown = partToMarkdown(key, part);

      // An approved part can still render to nothing (body edited blank in
      // review, or items emptied). Posting it would notify the student about a
      // blank recap, so fail this part closed and leave it unposted.
      if (!markdown) {
        outcomes.push({
          part: key,
          ok: false,
          error: `${PART_LABELS[key]} is empty — add content or exclude the part before publishing.`,
        });
        continue;
      }

      if (key === 'session_note') {
        const item = await createClassroomItem({
          studentId,
          createdBy: admin.id,
          type: 'session_recap',
          title,
          contentMarkdown: markdown,
          sourceTable: 'ai_ta_drafts',
          sourceId: draftId,
          status: 'assigned',
          visibleToStudent: true,
          metadata: { bundle_part: key },
        });
        const notify = await notifyStudentOfSessionRecap({
          admin,
          studentId,
          route: itemRoute(item.id),
        });
        outcomes.push({
          part: key,
          ok: true,
          classroom_item_id: item.id,
          notify_summary: notify.inbox_ok && notify.bell_ok
            ? 'Posted and notified'
            : 'Posted, partial notification',
        });
        next.parts[key] = { ...part, posted: true, classroom_item_id: item.id };
      } else {
        // Persist this publication identity before inserting work.
        const item = await createClassroomItem({
          studentId,
          createdBy: admin.id,
          ...delivery,
          type: 'homework',
          title,
          contentMarkdown: markdown,
          sourceTable: 'ai_ta_drafts',
          sourceId: draftId,
          status: 'assigned',
          visibleToStudent: true,
          metadata: { bundle_part: key },
        });
        assignedParts.push({ title, id: item.id });
        outcomes.push({
          part: key,
          ok: true,
          classroom_item_id: item.id,
          notify_summary: 'Posted',
        });
        next.parts[key] = { ...part, posted: true, classroom_item_id: item.id };
      }
    } catch (e) {
      console.error('[publishSessionBundle] part failed', { part: key, error: e });
      outcomes.push({ part: key, ok: false, error: e instanceof Error ? e.message : 'publish failed' });
    }
  }

  const anyPosted = outcomes.some((o) => o.ok);

  // Persist posted flags back into the draft, and roll the row status to
  // 'posted' once at least one part is materialized.
  if (anyPosted) {
    const patch: { draft_json: Json; status?: string; posted_at?: string } = {
      draft_json: next as unknown as Json,
    };
    patch.status = 'posted';
    patch.posted_at = new Date().toISOString();
    const { error } = await supabase.from('ai_ta_drafts').update(patch).eq('id', draftId);
    if (error) {
      console.error('[publishSessionBundle] failed to persist posted flags', error);
      return { ok: false, published: outcomes, bundle: next, nothing_to_publish: false };
    }
    // Best-effort: advance the ledger row if this draft came from one.
    if (next.source?.ledger_id) {
      await supabase
        .from('session_ingestions')
        .update({ status: 'published' })
        .eq('id', next.source.ledger_id);
    }
  }

  if (assignedParts.length > 0) {
    const notify = await notifyStudentOfClassroomItem({
      notificationGroupId: delivery.notificationGroupId!, adminUserId: admin.id, studentId,
      title: assignedParts.length === 1 ? assignedParts[0].title : 'New work from your session',
      route: assignedParts.length === 1 ? itemRoute(assignedParts[0].id) : '/my-work/to-do?workGroup=' + encodeURIComponent(delivery.notificationGroupId!),
      description: assignedParts.length > 1 ? assignedParts.map((part) => part.title).join('\n') : undefined,
      assignmentType: 'homework',
    });
    for (const outcome of outcomes) if (assignedParts.some((part) => part.id === outcome.classroom_item_id)) outcome.notify_summary = summarizeNotifyResult(notify);
  }

  return {
    ok: outcomes.every((o) => o.ok),
    published: outcomes,
    bundle: next,
    nothing_to_publish: false,
  };
}
