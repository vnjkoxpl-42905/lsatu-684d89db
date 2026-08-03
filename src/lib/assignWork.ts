import { supabase } from '@/integrations/supabase/client';
import { BOOTCAMPS } from '@/lib/bootcamps';
import { createClassroomItem } from '@/lib/classroomItems';
import type { ClassroomItemType } from '@/hooks/useClassroomItems';
import { notifyStudentOfClassroomItem, type NotifyResult } from '@/lib/classroomNotify';
import { parseLocalDay } from '@/lib/localDate';

/**
 * The one thing a teacher can hand a student. Every assign surface in the
 * workspace narrows to this union, so there is exactly one place that knows
 * how work reaches a student.
 */
export type AssignableItem =
  | { kind: 'homework_set'; setId: string }
  | { kind: 'guided_drill'; drillId: string }
  | { kind: 'activity'; activityId: string }
  | { kind: 'bootcamp'; topicId: string };

export interface StudentResult {
  studentId: string;
  /** The assignment row. Absent for bootcamps, which have no row of their own. */
  assignmentId?: string;
  classroomItemId?: string;
  route?: string;
  /**
   * Per-channel notify outcome. A false channel means the work landed and the
   * student can see it, but one message did not go out.
   */
  notify?: NotifyResult;
  /** Set only on `failed`: why this student got nothing. */
  error?: string;
}

export interface AssignWorkResult {
  ok: StudentResult[];
  failed: StudentResult[];
}

/** What one kind of item needs, resolved once before the per-student loop. */
interface AssignPlan {
  type: ClassroomItemType;
  title: string;
  description?: string;
  /** Wording for the notification ("New guided drill", etc). */
  assignmentType?: string;
  sourceTable: string;
  /** Insert the assignment row. Returns null for kinds that have no row. */
  insertRow: (studentId: string) => Promise<string | null>;
  sourceId: (assignmentId: string | null) => string | undefined;
  route: (assignmentId: string | null) => string;
  unlockAt: string | null;
  dueAt: string | null;
  metadata: Record<string, unknown>;
}

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function planFor(
  item: AssignableItem,
  teacherId: string,
  scheduledForLocalDate?: string,
): Promise<AssignPlan> {
  // A scheduled date is a calendar day the teacher picked, so it has to be read
  // in their timezone. Parsed as UTC it would unlock the evening before.
  const scheduledDay = scheduledForLocalDate ? parseLocalDay(scheduledForLocalDate) : null;
  if (scheduledForLocalDate && !scheduledDay) {
    throw new Error(`Not a calendar date: ${scheduledForLocalDate}`);
  }
  const unlockAt = scheduledDay ? scheduledDay.toISOString() : null;

  switch (item.kind) {
    case 'homework_set': {
      const { data: set, error } = await supabase
        .from('homework_sets')
        .select('id, title, description, question_qids')
        .eq('id', item.setId)
        .single();
      if (error) throw error;

      return {
        type: 'homework',
        title: set.title,
        description: set.description ?? undefined,
        assignmentType: 'homework',
        sourceTable: 'homework_assignments',
        insertRow: async (studentId) => {
          const { data, error: insertError } = await supabase
            .from('homework_assignments')
            .insert({
              set_id: set.id,
              student_id: studentId,
              // The student owns the row, not the set's author. Pointing this
              // at the teacher hid assigned homework from the student.
              class_id: studentId,
              assigned_by: teacherId,
              set_title: set.title,
              set_description: set.description,
              question_qids: set.question_qids ?? [],
              status: 'assigned',
            })
            .select('id')
            .single();
          if (insertError) throw insertError;
          return data.id as string;
        },
        sourceId: (assignmentId) => assignmentId ?? undefined,
        route: (assignmentId) => (assignmentId ? `/classroom/${assignmentId}` : '/classroom'),
        unlockAt,
        dueAt: null,
        metadata: { set_id: set.id },
      };
    }

    case 'guided_drill': {
      const { data: drill, error } = await supabase
        .from('guided_drills')
        .select('id, title')
        .eq('id', item.drillId)
        .single();
      if (error) throw error;

      return {
        type: 'drill',
        title: drill.title,
        description: `New guided drill: ${drill.title}`,
        assignmentType: 'guided drill',
        sourceTable: 'guided_drill_assignments',
        insertRow: async (studentId) => {
          const { data, error: insertError } = await supabase
            .from('guided_drill_assignments')
            .insert({
              guided_drill_id: drill.id,
              student_id: studentId,
              class_id: studentId,
              assigned_by: teacherId,
              scheduled_for: scheduledForLocalDate ?? null,
              unlock_at: unlockAt,
              status: 'assigned',
            })
            .select('id')
            .single();
          if (insertError) throw insertError;
          return data.id as string;
        },
        sourceId: (assignmentId) => assignmentId ?? undefined,
        route: (assignmentId) =>
          assignmentId
            ? `/guided/${assignmentId}?returnTo=${encodeURIComponent('/classroom')}`
            : '/classroom',
        unlockAt,
        dueAt: null,
        metadata: { guided_drill_id: drill.id },
      };
    }

    case 'activity': {
      const { data: activity, error } = await supabase
        .from('activities')
        .select('*')
        .eq('id', item.activityId)
        .single();
      if (error) throw error;

      return {
        type: 'activity',
        title: activity.title,
        description: activity.subtitle ?? undefined,
        assignmentType: 'activity',
        sourceTable: 'activity_assignments',
        insertRow: async (studentId) => {
          // Content is snapshotted at assign time so editing the activity
          // later cannot change work a student has already started.
          const { data, error: insertError } = await supabase
            .from('activity_assignments')
            .insert({
              activity_id: activity.id,
              student_id: studentId,
              class_id: studentId,
              assigned_by: teacherId,
              title: activity.title,
              subtitle: activity.subtitle,
              instructions: activity.instructions as never,
              item_format: activity.item_format,
              items: activity.items as never,
              status: 'assigned',
            })
            .select('id')
            .single();
          if (insertError) throw insertError;
          return data.id as string;
        },
        sourceId: (assignmentId) => assignmentId ?? undefined,
        route: (assignmentId) => (assignmentId ? `/activities/${assignmentId}` : '/activities'),
        unlockAt,
        dueAt: null,
        metadata: { activity_id: activity.id },
      };
    }

    case 'bootcamp': {
      const bootcamp = BOOTCAMPS.find((b) => b.id === item.topicId);
      if (!bootcamp) throw new Error(`Unknown bootcamp: ${item.topicId}`);

      return {
        type: 'bootcamp_module',
        title: bootcamp.title,
        description: bootcamp.description,
        assignmentType: 'bootcamp',
        // A bootcamp has no per-student row: the classroom item IS the
        // assignment, and source_id is the bootcamp's own route.
        sourceTable: 'bootcamps',
        insertRow: async () => null,
        sourceId: () => bootcamp.route,
        route: () => bootcamp.route,
        unlockAt,
        dueAt: null,
        metadata: { bootcamp_id: bootcamp.id },
      };
    }
  }
}

/**
 * Assign one piece of work to one or more students.
 *
 * Per student, in sequence: insert the assignment row, create the classroom
 * item that makes it visible, then notify. Students are isolated from each
 * other, so one failure never costs the rest their assignment and never
 * re-inserts a row that already landed.
 *
 * If the classroom item or the notify call throws, the rows already written
 * for that student are deleted again: an assignment the student cannot see is
 * worse than no assignment, because it silently blocks a re-assign. A notify
 * call that returns with a channel `false` is NOT a failure — the work is
 * visible in the Classroom and only a message went missing, so it is reported
 * on the ok result rather than rolled back.
 */
export async function assignWork(input: {
  teacherId: string;
  studentIds: string[];
  item: AssignableItem;
  /** A local calendar day, YYYY-MM-DD. Unlocks the work that morning. */
  scheduledForLocalDate?: string;
  /**
   * Teacher-authored overrides for what the student sees. The assign builder
   * lets Joshua retitle a set or set a due date for one student without
   * editing the set itself.
   */
  overrides?: {
    title?: string;
    description?: string;
    dueAt?: string | null;
    metadata?: Record<string, unknown>;
  };
}): Promise<AssignWorkResult> {
  const { teacherId, studentIds, item, scheduledForLocalDate, overrides } = input;

  const ok: StudentResult[] = [];
  const failed: StudentResult[] = [];

  if (studentIds.length === 0) return { ok, failed };

  let plan: AssignPlan;
  try {
    const base = await planFor(item, teacherId, scheduledForLocalDate);
    plan = {
      ...base,
      title: overrides?.title?.trim() || base.title,
      description: overrides?.description?.trim() || base.description,
      dueAt: overrides?.dueAt !== undefined ? overrides.dueAt : base.dueAt,
      metadata: { ...base.metadata, ...(overrides?.metadata ?? {}) },
    };
  } catch (error) {
    // Nothing was written, so every student failed for the same reason.
    const reason = message(error, 'Could not load the item to assign');
    return { ok, failed: studentIds.map((studentId) => ({ studentId, error: reason })) };
  }

  for (const studentId of studentIds) {
    let assignmentId: string | null = null;
    let classroomItemId: string | null = null;

    try {
      assignmentId = await plan.insertRow(studentId);
      const route = plan.route(assignmentId);

      const classroomItem = await createClassroomItem({
        studentId,
        createdBy: teacherId,
        type: plan.type,
        title: plan.title,
        description: plan.description,
        sourceTable: plan.sourceTable,
        sourceId: plan.sourceId(assignmentId),
        unlockAt: plan.unlockAt,
        dueAt: plan.dueAt,
        visibleToStudent: true,
        status: 'assigned',
        metadata: { ...plan.metadata, assigned_route: route },
      });
      classroomItemId = classroomItem.id;

      const notify = await notifyStudentOfClassroomItem({
        adminUserId: teacherId,
        studentId,
        title: plan.title,
        description: plan.description,
        route,
        assignmentType: plan.assignmentType,
      });

      ok.push({
        studentId,
        assignmentId: assignmentId ?? undefined,
        classroomItemId,
        route,
        notify,
      });
    } catch (error) {
      console.error('[assignWork] student failed', {
        studentId,
        kind: item.kind,
        assignmentId,
        classroomItemId,
        error,
      });
      await rollback({ assignmentId, classroomItemId, table: plan.sourceTable, kind: item.kind });
      failed.push({ studentId, error: message(error, 'Assign failed') });
    }
  }

  return { ok, failed };
}

/**
 * One sentence for the teacher, in the order they care about: who missed out,
 * then which messages did not go, then plain success. Shared so every assign
 * surface reports the same outcome the same way.
 */
export function describeAssignResult(
  result: AssignWorkResult,
  title: string,
): { level: 'success' | 'warning' | 'error'; message: string } {
  const { ok, failed } = result;
  const students = (n: number) => `${n} student${n === 1 ? '' : 's'}`;

  if (ok.length === 0) {
    return {
      level: 'error',
      message: failed[0]?.error
        ? `Could not assign "${title}": ${failed[0].error}`
        : `Could not assign "${title}"`,
    };
  }

  if (failed.length > 0) {
    return {
      level: 'warning',
      message: `Assigned "${title}" to ${students(ok.length)}. ${students(failed.length)} failed: ${failed[0].error ?? 'unknown error'}`,
    };
  }

  const quiet = ok.filter((r) => r.notify && !(r.notify.inbox_ok && r.notify.bell_ok && r.notify.email_ok));
  if (quiet.length > 0) {
    return {
      level: 'warning',
      message: `Assigned "${title}" to ${students(ok.length)}, but ${students(quiet.length)} were not fully notified.`,
    };
  }

  return { level: 'success', message: `Assigned "${title}" to ${students(ok.length)}` };
}

/**
 * Undo a half-written assign. Best effort: if the cleanup itself fails there is
 * nothing further to try, so it is logged loudly and swallowed rather than
 * masking the original error that sent us here.
 */
async function rollback(input: {
  assignmentId: string | null;
  classroomItemId: string | null;
  table: string;
  kind: AssignableItem['kind'];
}) {
  const { assignmentId, classroomItemId, table, kind } = input;

  if (classroomItemId) {
    const { error } = await supabase.from('classroom_items').delete().eq('id', classroomItemId);
    if (error) console.error('[assignWork] rollback left a classroom item', { classroomItemId, error });
  }

  // Bootcamps write no assignment row, so there is nothing else to undo.
  if (!assignmentId || kind === 'bootcamp') return;

  const { error } = await supabase
    .from(table as 'homework_assignments' | 'guided_drill_assignments' | 'activity_assignments')
    .delete()
    .eq('id', assignmentId);
  if (error) console.error('[assignWork] rollback left an assignment row', { table, assignmentId, error });
}
