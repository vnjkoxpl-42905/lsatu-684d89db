// Client-side executor for an agent ActionProposal.
//
// The ta-agent edge function only PROPOSES actions (resolving the target student
// and resource server-side). When the admin clicks Confirm, this module runs the
// real mutation through the same battle-tested helpers the manual admin UI uses.
// RLS already permits admin writes, so no service role is needed here.

import DOMPurify from 'dompurify';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateAdminStudentConversation } from '@/lib/adminConversation';
import { assignResourceToStudent } from '@/lib/teacherAssignResource';
import { assignWork } from '@/lib/assignWork';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem } from '@/lib/classroomNotify';

export type AgentActionKind =
  | 'guided_drill'
  | 'homework'
  | 'bootcamp_module'
  | 'note'
  | 'activity'
  | 'message';

export interface ResolvedStudent {
  id: string;
  name: string;
}

export interface ResolvedResource {
  id?: string;
  title: string;
  kind: string;
  route?: string;
}

export interface ActionProposal {
  type: 'action';
  kind: AgentActionKind;
  student: ResolvedStudent;
  resource?: ResolvedResource;
  params?: { unlock_at?: string };
  generated_html?: string;
  summary: string;
}

export interface Disambiguation {
  type: 'disambiguation';
  field: 'student' | 'resource';
  query: string;
  candidates: Array<{ id: string; label: string }>;
  summary: string;
}

export type Proposal = ActionProposal | Disambiguation;

export interface ExecuteResult {
  ok: boolean;
  summary: string;
  route?: string;
}

export function isActionProposal(p: Proposal | null | undefined): p is ActionProposal {
  return !!p && p.type === 'action';
}

async function executeHomework(
  proposal: ActionProposal,
  adminUserId: string,
): Promise<ExecuteResult> {
  const setId = proposal.resource?.id;
  if (!setId) throw new Error('Homework set id missing from proposal');

  const { data: set, error: setErr } = await supabase
    .from('homework_sets')
    .select('id, title')
    .eq('id', setId)
    .maybeSingle();
  if (setErr) throw setErr;
  if (!set) throw new Error('That homework set no longer exists');

  const { ok, failed } = await assignWork({
    teacherId: adminUserId,
    studentIds: [proposal.student.id],
    item: { kind: 'homework_set', setId: set.id },
  });

  const failure = failed[0];
  if (failure) {
    // Already assigned is not an error worth surfacing as one.
    if (/duplicate key|23505/i.test(failure.error ?? '')) {
      return { ok: true, summary: `${set.title} is already assigned to ${proposal.student.name}` };
    }
    throw new Error(failure.error ?? 'Assign failed');
  }

  return {
    ok: true,
    summary: `Assigned "${set.title}" to ${proposal.student.name}`,
    route: ok[0]?.route,
  };
}

async function executeNote(
  proposal: ActionProposal,
  adminUserId: string,
): Promise<ExecuteResult> {
  const title = proposal.resource?.title || 'Note';
  const html = DOMPurify.sanitize(proposal.generated_html ?? '');
  const item = await createClassroomItem({
    studentId: proposal.student.id,
    createdBy: adminUserId,
    type: 'note',
    title,
    contentHtml: html,
    visibleToStudent: true,
    status: 'assigned',
  });
  const route = `/classroom/item/${item.id}`;
  await notifyStudentOfClassroomItem({
    adminUserId,
    studentId: proposal.student.id,
    title,
    route,
    assignmentType: 'note',
  });
  return { ok: true, summary: `Sent note "${title}" to ${proposal.student.name}`, route };
}

async function executeActivity(
  proposal: ActionProposal,
  adminUserId: string,
): Promise<ExecuteResult> {
  const activityId = proposal.resource?.id;
  if (!activityId) throw new Error('Activity id missing from proposal');

  const { ok, failed } = await assignWork({
    teacherId: adminUserId,
    studentIds: [proposal.student.id],
    item: { kind: 'activity', activityId },
  });

  const failure = failed[0];
  if (failure) {
    if (/duplicate key|23505/i.test(failure.error ?? '')) {
      return {
        ok: true,
        summary: `${proposal.resource?.title} is already assigned to ${proposal.student.name}`,
      };
    }
    throw new Error(failure.error ?? 'Assign failed');
  }

  return {
    ok: true,
    summary: `Assigned "${proposal.resource?.title}" to ${proposal.student.name}`,
    route: ok[0]?.route,
  };
}

async function executeMessage(
  proposal: ActionProposal,
  adminUserId: string,
): Promise<ExecuteResult> {
  const body = (proposal.generated_html ?? '').trim();
  if (!body) throw new Error('Message text is empty');

  const conversationId = await getOrCreateAdminStudentConversation(
    { id: adminUserId } as User,
    proposal.student.id,
  );
  const { error: mErr } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: adminUserId,
    body,
  });
  if (mErr) throw mErr;
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  await supabase.from('notifications').insert({
    user_id: proposal.student.id,
    type: 'message',
    title: 'New message from Joshua',
    body: body.length > 120 ? `${body.slice(0, 120)}…` : body,
    link: `/inbox/${encodeURIComponent(conversationId)}`,
  });

  return { ok: true, summary: `Message sent to ${proposal.student.name}` };
}

/**
 * Execute a confirmed ActionProposal. Throws on failure so callers can surface a
 * toast and avoid marking the interaction confirmed.
 */
export async function executeActionProposal(
  proposal: ActionProposal,
  adminUserId: string,
): Promise<ExecuteResult> {
  switch (proposal.kind) {
    case 'guided_drill': {
      const res = await assignResourceToStudent({
        adminUserId,
        studentId: proposal.student.id,
        resource: {
          title: proposal.resource?.title ?? 'Guided drill',
          kind: 'guided_drill',
          source_id: proposal.resource?.id ?? null,
        },
      });
      return {
        ok: res.ok,
        summary: `Assigned "${proposal.resource?.title}" to ${proposal.student.name}`,
        route: res.route,
      };
    }
    case 'bootcamp_module': {
      const res = await assignResourceToStudent({
        adminUserId,
        studentId: proposal.student.id,
        resource: {
          title: proposal.resource?.title ?? 'Bootcamp module',
          kind: 'bootcamp_module',
          url: proposal.resource?.route ?? '/bootcamps',
        },
      });
      return {
        ok: res.ok,
        summary: `Assigned "${proposal.resource?.title}" to ${proposal.student.name}`,
        route: res.route,
      };
    }
    case 'homework':
      return executeHomework(proposal, adminUserId);
    case 'note':
      return executeNote(proposal, adminUserId);
    case 'activity':
      return executeActivity(proposal, adminUserId);
    case 'message':
      return executeMessage(proposal, adminUserId);
    default:
      throw new Error(`Unsupported action: ${(proposal as ActionProposal).kind}`);
  }
}
