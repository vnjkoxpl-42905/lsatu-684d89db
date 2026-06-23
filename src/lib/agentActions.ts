// Client-side executor for an agent ActionProposal.
//
// The ta-agent edge function only PROPOSES actions (resolving the target student
// and resource server-side). When the admin clicks Confirm, this module runs the
// real mutation through the same battle-tested helpers the manual admin UI uses.
// RLS already permits admin writes, so no service role is needed here.

import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { assignResourceToStudent } from '@/lib/teacherAssignResource';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem } from '@/lib/classroomNotify';

export type AgentActionKind = 'guided_drill' | 'homework' | 'bootcamp_module' | 'note';

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
    .select('id, title, description, question_qids, class_id')
    .eq('id', setId)
    .maybeSingle();
  if (setErr) throw setErr;
  if (!set) throw new Error('That homework set no longer exists');

  const { data: assignment, error: asgErr } = await supabase
    .from('homework_assignments')
    .insert({
      set_id: set.id,
      student_id: proposal.student.id,
      question_qids: set.question_qids,
      set_title: set.title,
      set_description: set.description,
      status: 'assigned',
      assigned_by: adminUserId,
      class_id: set.class_id,
    })
    .select('id')
    .single();
  if (asgErr) {
    if (asgErr.code === '23505') {
      return { ok: true, summary: `${set.title} is already assigned to ${proposal.student.name}` };
    }
    throw asgErr;
  }

  const assignmentId = (assignment as { id: string }).id;
  const route = `/classroom/${assignmentId}`;
  await createClassroomItem({
    studentId: proposal.student.id,
    createdBy: adminUserId,
    type: 'homework',
    title: set.title,
    description: set.description ?? undefined,
    sourceTable: 'homework_assignments',
    sourceId: assignmentId,
    visibleToStudent: true,
    status: 'assigned',
    metadata: { assigned_route: route },
  });
  await notifyStudentOfClassroomItem({
    adminUserId,
    studentId: proposal.student.id,
    title: set.title,
    description: set.description ?? undefined,
    route,
    assignmentType: 'homework',
  });
  return { ok: true, summary: `Assigned "${set.title}" to ${proposal.student.name}`, route };
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
    default:
      throw new Error(`Unsupported action: ${(proposal as ActionProposal).kind}`);
  }
}
