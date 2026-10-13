import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

interface CreateClassroomItemInput {
  studentId: string;
  createdBy: string;
  type: ClassroomItem['type'];
  title: string;
  description?: string;
  contentMarkdown?: string;
  contentHtml?: string;
  sourceTable?: string;
  sourceId?: string;
  unlockAt?: string | null;
  dueAt?: string | null;
  priority?: number;
  status?: ClassroomItem['status'];
  visibleToStudent?: boolean;
  metadata?: Record<string, unknown>;
}

export async function createClassroomItem(input: CreateClassroomItemInput) {
  const { data, error } = await supabase
    .from('classroom_items')
    .insert({
      student_id: input.studentId,
      created_by: input.createdBy,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      content_markdown: input.contentMarkdown ?? null,
      content_html: input.contentHtml ?? null,
      source_table: input.sourceTable ?? null,
      source_id: input.sourceId ?? null,
      unlock_at: input.unlockAt ?? null,
      due_at: input.dueAt ?? null,
      priority: input.priority ?? 0,
      status: input.status ?? 'assigned',
      visible_to_student: input.visibleToStudent ?? true,
      metadata_json: (input.metadata ?? {}) as Json,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ClassroomItem;
}

/** Read one item back, e.g. to show what an assign just created. */
export async function getClassroomItem(id: string) {
  const { data, error } = await supabase.from('classroom_items').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? (data as ClassroomItem) : null;
}

export async function updateClassroomItem(
  id: string,
  patch: Partial<{
    title: string;
    description: string | null;
    status: ClassroomItem['status'];
    unlock_at: string | null;
    due_at: string | null;
    visible_to_student: boolean;
    completed_at: string | null;
    priority: number;
    metadata_json: Record<string, unknown>;
  }>,
) {
  const { metadata_json, ...rest } = patch;
  const dbPatch =
    metadata_json !== undefined
      ? { ...rest, metadata_json: metadata_json as Json }
      : rest;
  const { data, error } = await supabase
    .from('classroom_items')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ClassroomItem;
}

export async function archiveClassroomItem(id: string) {
  return updateClassroomItem(id, { status: 'archived', visible_to_student: false });
}

/**
 * Keep the Classroom feed in step with a source assignment's progress.
 * Finds the classroom_items row that points at (sourceTable, sourceId) and
 * advances its status, so a completed activity stops showing "Start". RLS
 * scopes the update to the caller's own rows. Caller treats failure as
 * non-fatal — the source assignment remains the source of truth.
 */
export async function syncClassroomItemStatusBySource(
  sourceTable: string,
  sourceId: string,
  status: ClassroomItem['status'],
): Promise<void> {
  const patch: { status: ClassroomItem['status']; completed_at?: string } = { status };
  if (status === 'completed') patch.completed_at = new Date().toISOString();
  const { error } = await supabase
    .from('classroom_items')
    .update(patch)
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId);
  if (error) throw error;
}

export function nextActionFor(items: ClassroomItem[]): ClassroomItem | null {
  if (!items?.length) return null;
  const candidates = items.filter(
    (i) => i.status === 'assigned' || i.status === 'in_progress',
  );
  if (candidates.length === 0) return null;
  // Highest priority, then earliest due date, then earliest unlock.
  return [...candidates].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const adue = a.due_at ? new Date(a.due_at).getTime() : Infinity;
    const bdue = b.due_at ? new Date(b.due_at).getTime() : Infinity;
    if (adue !== bdue) return adue - bdue;
    const aun = a.unlock_at ? new Date(a.unlock_at).getTime() : 0;
    const bun = b.unlock_at ? new Date(b.unlock_at).getTime() : 0;
    return aun - bun;
  })[0];
}

/**
 * An assignment that carries its own page rather than pointing at one.
 *
 * A timed section is written straight into `classroom_items` with its cover
 * page in `content_html` and no backing assignment row, because there is no
 * assignment table for "sit PT 155 section 1 on a 53 minute clock". Both the
 * route resolver and the item view assumed every `homework` row was a mirror of
 * something else: the resolver sent it to `/classroom` and the item view
 * redirected it off its own page, so the button did nothing at all and the
 * direct link bounced back to Home.
 */
export function isSelfContainedItem(item: ClassroomItem): boolean {
  return !openableAssignmentId(item) && !!(item.content_html || item.content_markdown);
}

/**
 * The tables whose row id `/classroom/:assignmentId` can actually open.
 *
 * `source_id` says what a row was made from, not that the thing it was made
 * from is an assignment. `publishSessionBundle` stamps every part of a session
 * bundle with `source_table: 'ai_ta_drafts'` and the draft's id — including the
 * homework part, which is a `homework` row carrying its own markdown body and
 * no assignment anywhere. The resolver read the bare `source_id` and sent the
 * student to `/classroom/<draft uuid>`, where `useStudentAssignment` looked for
 * a homework_assignments row that has never existed and rendered "Assignment
 * not found". The homework Joshua reviewed and approved alongside the recap was
 * unreachable from the moment it was published.
 *
 * A missing `source_table` still counts: rows predating the column were written
 * by the assignment path, and nothing else has ever left it null with an id.
 */
const ASSIGNMENT_SOURCE_TABLES = new Set(['homework_assignments']);

function openableAssignmentId(item: ClassroomItem): string | null {
  if (!item.source_id) return null;
  if (item.source_table && !ASSIGNMENT_SOURCE_TABLES.has(item.source_table)) return null;
  return item.source_id;
}

/**
 * Resolve a classroom_items row to the right student-facing route.
 * Returns the path to navigate to, or null if the item is not actionable.
 */
export function resolveItemRoute(item: ClassroomItem): string | null {
  switch (item.type) {
    case 'drill':
      if (item.source_table === 'guided_drill_assignments' && item.source_id) {
        return `/guided/${encodeURIComponent(item.source_id)}?returnTo=${encodeURIComponent('/classroom')}`;
      }
      if (item.source_id) return `/drill?assignmentId=${encodeURIComponent(item.source_id)}`;
      return '/drill';
    case 'homework': {
      const assignmentId = openableAssignmentId(item);
      if (assignmentId) return `/classroom/${encodeURIComponent(assignmentId)}`;
      if (isSelfContainedItem(item)) return `/classroom/item/${encodeURIComponent(item.id)}`;
      return '/classroom';
    }
    case 'activity':
      // source_id is the activity_assignments row id; source_table='activity_assignments'.
      if (item.source_id) return `/activities/${encodeURIComponent(item.source_id)}`;
      return '/activities';
    case 'practice_test':
      // An assigned PrepTest sitting. The Testing Centre lists exactly the
      // assigned PrepTests for a student without the Practice tests switch.
      return '/testing';
    case 'bootcamp_module':
      if (item.source_id) return item.source_id; // expected to be a /bootcamp/* path
      return '/bootcamps';
    case 'session_recap':
    case 'smartboard_recap':
    case 'announcement':
    case 'note':
      return `/classroom/item/${encodeURIComponent(item.id)}`;
    default:
      return `/classroom/item/${encodeURIComponent(item.id)}`;
  }
}
