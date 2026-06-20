import { supabase } from '@/integrations/supabase/client';
import { createClassroomItem } from '@/lib/classroomItems';
import { notifyStudentOfClassroomItem, type NotifyResult } from '@/lib/classroomNotify';
import type { Activity } from '@/features/activity-centre/api/types';
import type { GuidedDrill } from '@/lib/guidedDrills';

export interface AssignableResource {
  title: string;
  kind?: string | null;
  source_id?: string | null;
  url?: string | null;
  subtitle?: string | null;
  description?: string | null;
}

export interface ResourceAssignResult {
  ok: boolean;
  route: string;
  classroomItemId?: string;
  sourceAssignmentId?: string;
  reusedExisting?: boolean;
  notify: NotifyResult;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toPath(url?: string | null): string {
  if (!url) return '/classroom';
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url.startsWith('/') ? url : '/classroom';
  }
}

function slugFromTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function findActivity(resource: AssignableResource): Promise<Activity | null> {
  const sourceId = resource.source_id?.trim();
  if (sourceId) {
    const column = UUID_RE.test(sourceId) ? 'id' : 'slug';
    const { data, error } = await supabase.from('activities').select('*').eq(column, sourceId).maybeSingle();
    if (error) throw error;
    if (data) return data as unknown as Activity;
  }

  const slug = slugFromTitle(resource.title);
  const { data: bySlug, error: slugError } = await supabase.from('activities').select('*').eq('slug', slug).maybeSingle();
  if (slugError) throw slugError;
  if (bySlug) return bySlug as unknown as Activity;

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .ilike('title', `%${resource.title.trim()}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as unknown as Activity) : null;
}

async function findGuidedDrill(resource: AssignableResource): Promise<GuidedDrill | null> {
  const sourceId = resource.source_id?.trim();
  if (sourceId) {
    const column = UUID_RE.test(sourceId) ? 'id' : 'slug';
    const { data, error } = await supabase.from('guided_drills').select('*').eq(column, sourceId).maybeSingle();
    if (error) throw error;
    if (data) return data as GuidedDrill;
  }

  const slug = slugFromTitle(resource.title);
  const { data: bySlug, error: slugError } = await supabase.from('guided_drills').select('*').eq('slug', slug).maybeSingle();
  if (slugError) throw slugError;
  if (bySlug) return bySlug as GuidedDrill;

  const { data, error } = await supabase
    .from('guided_drills')
    .select('*')
    .ilike('title', `%${resource.title.trim()}%`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as GuidedDrill) : null;
}

async function ensureClassroomItem(input: {
  studentId: string;
  adminUserId: string;
  type: 'activity' | 'drill' | 'bootcamp_module' | 'note';
  title: string;
  description?: string | null;
  sourceTable?: string;
  sourceId?: string;
  route: string;
}) {
  if (input.sourceTable && input.sourceId) {
    const { data: existing, error } = await supabase
      .from('classroom_items')
      .select('id')
      .eq('student_id', input.studentId)
      .eq('source_table', input.sourceTable)
      .eq('source_id', input.sourceId)
      .neq('status', 'archived')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing?.id) return existing.id as string;
  }

  const item = await createClassroomItem({
    studentId: input.studentId,
    createdBy: input.adminUserId,
    type: input.type,
    title: input.title,
    description: input.description ?? undefined,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    visibleToStudent: true,
    status: 'assigned',
    metadata: { assigned_route: input.route },
  });
  return item.id;
}

export async function assignResourceToStudent(input: {
  adminUserId: string;
  studentId: string;
  resource: AssignableResource;
}): Promise<ResourceAssignResult> {
  const { adminUserId, studentId, resource } = input;
  const kind = (resource.kind ?? '').toLowerCase();

  if (kind === 'activity' || /activity|station/i.test(`${resource.title} ${resource.url ?? ''}`)) {
    const activity = await findActivity(resource);
    if (activity) {
      const { data: existing, error: existingError } = await supabase
        .from('activity_assignments')
        .select('*')
        .eq('student_id', studentId)
        .eq('activity_id', activity.id)
        .neq('status', 'completed')
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;

      let assignment = existing as { id: string } | null;
      const reusedExisting = Boolean(assignment?.id);
      if (!assignment) {
        const { data, error } = await supabase
          .from('activity_assignments')
          .insert({
            activity_id: activity.id,
            student_id: studentId,
            title: activity.title,
            subtitle: activity.subtitle,
            instructions: activity.instructions as never,
            item_format: activity.item_format,
            items: activity.items as never,
            status: 'assigned',
            assigned_by: adminUserId,
            class_id: adminUserId,
          })
          .select('*')
          .single();
        if (error) throw error;
        assignment = data as { id: string };
      }

      const route = `/activities/${assignment.id}`;
      const classroomItemId = await ensureClassroomItem({
        studentId,
        adminUserId,
        type: 'activity',
        title: activity.title,
        description: activity.subtitle,
        sourceTable: 'activity_assignments',
        sourceId: assignment.id,
        route,
      });
      const notify = await notifyStudentOfClassroomItem({
        adminUserId,
        studentId,
        title: activity.title,
        description: activity.subtitle ?? undefined,
        route,
        assignmentType: 'activity',
      });
      return { ok: true, route, classroomItemId, sourceAssignmentId: assignment.id, reusedExisting, notify };
    }
  }

  if (kind === 'guided_drill' || /guided|drill/i.test(`${resource.kind ?? ''} ${resource.title}`)) {
    const drill = await findGuidedDrill(resource);
    if (drill) {
      const { data, error } = await supabase
        .from('guided_drill_assignments')
        .insert({
          guided_drill_id: drill.id,
          student_id: studentId,
          class_id: studentId,
          assigned_by: adminUserId,
          status: 'assigned',
        })
        .select('id, student_id')
        .single();
      if (error) throw error;
      const assignmentId = (data as { id: string }).id;
      const route = `/guided/${assignmentId}?returnTo=${encodeURIComponent('/classroom')}`;
      const classroomItemId = await ensureClassroomItem({
        studentId,
        adminUserId,
        type: 'drill',
        title: drill.title,
        description: `New guided drill: ${drill.title}`,
        sourceTable: 'guided_drill_assignments',
        sourceId: assignmentId,
        route,
      });
      const notify = await notifyStudentOfClassroomItem({
        adminUserId,
        studentId,
        title: drill.title,
        description: `New guided drill: ${drill.title}`,
        route,
        assignmentType: 'guided drill',
      });
      return { ok: true, route, classroomItemId, sourceAssignmentId: assignmentId, notify };
    }
  }

  const route = toPath(resource.url);
  const type = route.startsWith('/bootcamp') ? 'bootcamp_module' : 'note';
  const classroomItemId = await ensureClassroomItem({
    studentId,
    adminUserId,
    type,
    title: resource.title,
    description: resource.description ?? resource.subtitle ?? 'Assigned resource',
    sourceTable: 'operator_assigned_link',
    sourceId: route,
    route,
  });
  const notify = await notifyStudentOfClassroomItem({
    adminUserId,
    studentId,
    title: resource.title,
    description: resource.description ?? resource.subtitle ?? undefined,
    route,
    assignmentType: 'assignment',
  });
  return { ok: true, route, classroomItemId, notify };
}