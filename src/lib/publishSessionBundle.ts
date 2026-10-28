import { finalizeAssignmentDelivery, newAssignmentDelivery } from '@/lib/assignmentDelivery';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from '@/lib/classroomNotify';
import { notifyStudentOfSessionRecap } from '@/lib/sessionBundleNotify';
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
 * Runs under the admin's JWT. The materialization RPC locks the draft, verifies
 * its approved student part, reuses an existing part, and patches only that
 * part's posted flags in the same transaction as creating the Classroom row.
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
  const assignedParts: Array<{ title: string; id: string; groupId: string | null; created: boolean }> = [];

  async function materialize(key: PartKey, title: string, markdown: string) {
    const { data, error } = await supabase.rpc('materialize_session_bundle_part' as never, {
      p_draft_id: draftId, p_student_id: studentId, p_part: key, p_title: title,
      p_content_markdown: markdown, p_notification_group_id: delivery.notificationGroupId,
      p_expected_part: next.parts[key],
    } as never);
    if (error) throw error;
    const result = data as unknown as { item?: ClassroomItem & { notification_group_id?: string }; created?: boolean };
    if (!result?.item?.id || result.item.student_id !== studentId || result.item.source_id !== draftId || typeof result.created !== 'boolean') throw new Error('The published session part could not be verified.');
    if (result.created && !result.item.notification_group_id) throw new Error('The published assignment notification identity could not be verified.');
    return { item: result.item, created: result.created };
  }

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
        const { item, created } = await materialize(key, title, markdown);
        let summary = 'Already posted';
        if (created) {
          const notify = await notifyStudentOfSessionRecap({
            admin, studentId, route: itemRoute(item.id), notificationGroupId: item.notification_group_id!,
          });
          summary = notify.optional_channels_skipped && notify.bell_ok ? 'Already posted' : notify.inbox_ok && notify.bell_ok ? 'Posted and notified' : 'Posted, partial notification';
        } else if (item.notification_group_id) {
          try {
            await finalizeAssignmentDelivery(item.notification_group_id, 'New recap in your Classroom', 'A recap from your latest session is ready.', itemRoute(item.id));
          } catch {
            summary = 'Already posted. Bell notification will retry automatically.';
          }
        }
        outcomes.push({ part: key, ok: true, classroom_item_id: item.id, notify_summary: summary });
        next.parts[key] = { ...part, posted: true, classroom_item_id: item.id };
      } else {
        // Persist this publication identity before inserting work.
        const { item, created } = await materialize(key, title, markdown);
        assignedParts.push({ title: item.title, id: item.id, groupId: item.notification_group_id ?? null, created });
        outcomes.push({
          part: key,
          ok: true,
          classroom_item_id: item.id,
          notify_summary: created ? 'Posted' : 'Already posted',
        });
        next.parts[key] = { ...part, posted: true, classroom_item_id: item.id };
      }
    } catch (e) {
      console.error('[publishSessionBundle] part failed', { part: key, error: e });
      outcomes.push({ part: key, ok: false, error: e instanceof Error ? e.message : 'publish failed' });
    }
  }

  const anyPosted = outcomes.some((o) => o.ok);

  // The materialization RPC atomically patches only its own posted flags.
  // The ledger is advisory; it must never overwrite a concurrently edited draft.
  if (anyPosted && next.source?.ledger_id) {
    try {
      await supabase.from('session_ingestions').update({ status: 'published' }).eq('id', next.source.ledger_id);
    } catch (error) {
      console.error('[publishSessionBundle] advisory ledger update failed', error);
    }
  }

  const groups = [...new Set(assignedParts.map((part) => part.groupId).filter((id): id is string => !!id))];
  for (const groupId of groups) {
    const parts = assignedParts.filter((part) => part.groupId === groupId);
    const title = parts.length === 1 ? parts[0].title : 'New work from your session';
    const route = parts.length === 1 ? itemRoute(parts[0].id) : '/my-work/to-do?workGroup=' + encodeURIComponent(groupId);
    const description = parts.length > 1 ? parts.map((part) => part.title).join('\n') : undefined;
    let summary: string;
    if (parts.some((part) => part.created)) {
      const notify = await notifyStudentOfClassroomItem({
        notificationGroupId: groupId, adminUserId: admin.id, studentId, title, route, description, assignmentType: 'homework',
      });
      summary = summarizeNotifyResult(notify);
    } else {
      try {
        await finalizeAssignmentDelivery(groupId, 'New assignment: ' + title, description, route);
        summary = 'Already posted';
      } catch {
        summary = 'Already posted. Bell notification will retry automatically.';
      }
    }
    for (const outcome of outcomes) if (parts.some((part) => part.id === outcome.classroom_item_id)) outcome.notify_summary = summary;
  }

  return {
    ok: outcomes.every((o) => o.ok),
    published: outcomes,
    bundle: next,
    nothing_to_publish: false,
  };
}
