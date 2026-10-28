import { conditionalFullCourseAssignmentsReleased } from '@/lib/conditionalCourseEdition';
import { snapshotConditionalRequirements } from '@/bootcamps/conditionals/courseRequirements';
import { supabase } from '@/integrations/supabase/client';
import { BOOTCAMPS } from '@/lib/bootcamps';
import { createClassroomItem } from '@/lib/classroomItems';
import type { ClassroomItemType } from '@/hooks/useClassroomItems';
import { notifyStudentOfClassroomItem, type NotifyResult } from '@/lib/classroomNotify';
import { parseLocalDay } from '@/lib/localDate';
import { coerceStudentLevel, type StudentLevel } from '@/lib/studentLevel';
import { conditionalProtectedGrantRoute, resolveConditionalAssignment, type ConditionalAssignmentTarget } from '@/lib/conditionalBootcampAssignment';
import { assignReadingCenter, READING_CENTER_PATH } from '@/lib/readingCenterAccess';

/**
 * The one thing a teacher can hand a student. Every assign surface in the
 * workspace narrows to this union, so there is exactly one place that knows
 * how work reaches a student.
 */
export type AssignableItem =
  | { kind: 'homework_set'; setId: string }
  | { kind: 'guided_drill'; drillId: string }
  | { kind: 'activity'; activityId: string }
  | { kind: 'reading_center' }
  | { kind: 'bootcamp'; topicId: string; conditionalTarget?: ConditionalAssignmentTarget };

export interface StudentResult {
  studentId: string;
  /**
   * The assignment row. Absent for bootcamps, which have no row of their own.
   * On a bundle this is the first item's row; see `assignmentIds` for all of them.
   */
  assignmentId?: string;
  classroomItemId?: string;
  route?: string;
  /** Every assignment row written for this student, in bundle order. */
  assignmentIds?: string[];
  /** Every classroom item created for this student, in bundle order. */
  classroomItemIds?: string[];
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

/** Per-student proficiency, resolved once for the whole assign. */
export type StudentLevelMap = ReadonlyMap<string, StudentLevel | null>;

/**
 * Postgres 42703 (undefined_column), which PostgREST also surfaces in the
 * message. Means the migration has not been applied to this database yet.
 */
function isMissingColumnError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42703') return true;
  return /proficiency_level/.test(e.message ?? '') && /does not exist|column/i.test(e.message ?? '');
}

/**
 * Every student's band in one query.
 *
 * Seeded with null for each requested id, so a student with no profile row is a
 * defined "no level" rather than an undefined lookup. A student Joshua has not
 * levelled gets null and therefore the drill's own range -- the behaviour that
 * predates levels. Inventing a default here would be the system overruling him.
 */
async function fetchStudentLevels(studentIds: string[]): Promise<StudentLevelMap> {
  const levels = new Map<string, StudentLevel | null>(
    studentIds.map((id) => [id, null]),
  );
  if (studentIds.length === 0) return levels;

  // proficiency_level is newer than the auto-generated Supabase types, which
  // are not hand-editable, so the select is cast at the call site -- the same
  // pattern savedSets.ts and questionExposure.ts use for new columns.
  const { data, error } = await (supabase.from('profiles') as never as {
    select: (cols: string) => {
      in: (
        col: string,
        vals: string[],
      ) => Promise<{ data: Array<Record<string, unknown>> | null; error: unknown }>;
    };
  })
    .select('class_id, proficiency_level')
    .in('class_id', studentIds);

  // The code and the migration do not land atomically. If the app is live
  // before the column exists, treat it as "nobody has a level yet" and assign
  // exactly as we did before levels existed, rather than breaking every guided
  // drill assign until the migration catches up. Any other error is real and
  // fails the assign cleanly, because silently unlevelling work Joshua asked to
  // be levelled would be worse than not assigning it.
  if (error) {
    if (isMissingColumnError(error)) {
      console.warn('[assignWork] profiles.proficiency_level is not deployed yet; assigning unlevelled');
      return levels;
    }
    throw error;
  }

  for (const row of data ?? []) {
    const id = row.class_id as string;
    if (!levels.has(id)) continue;
    levels.set(id, coerceStudentLevel(row.proficiency_level, null));
  }
  return levels;
}

async function planFor(
  item: AssignableItem,
  teacherId: string,
  scheduledForLocalDate: string | undefined,
  levels: StudentLevelMap,
  levelOverrides: Record<string, StudentLevel | null> | undefined,
  questionCountOverride: number | null | undefined,
  frozenQidsByStudent: Record<string, string[]> | undefined,
): Promise<AssignPlan> {
  /**
   * `studentId in overrides` rather than `??`, so an explicit null ("assign
   * this one unlevelled") is honoured instead of falling through to the profile.
   */
  const levelFor = (studentId: string): StudentLevel | null =>
    levelOverrides && studentId in levelOverrides
      ? levelOverrides[studentId]
      : (levels.get(studentId) ?? null);

  // A scheduled date is a calendar day the teacher picked, so it has to be read
  // in their timezone. Parsed as UTC it would unlock the evening before.
  const scheduledDay = scheduledForLocalDate ? parseLocalDay(scheduledForLocalDate) : null;
  if (scheduledForLocalDate && !scheduledDay) {
    throw new Error(`Not a calendar date: ${scheduledForLocalDate}`);
  }
  const unlockAt = scheduledDay ? scheduledDay.toISOString() : null;

  switch (item.kind) {
    case 'reading_center':
      throw new Error('Assign Reading Center separately so its access grant can be verified.');
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
        .select('id, title, question_count')
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
          // Normally the level is recorded, not resolved: the question draw
          // happens when the student opens the drill, so a re-attempt gets a
          // fresh set. That is the whole point of the pool model.
          //
          // Freezing is correct in exactly one case — an offline artifact was
          // generated from a specific list and emailed. Then the set has
          // already left the building, and a drill that re-draws would serve
          // different questions from the file in the student's inbox. Pinning
          // here is what makes the two provably the same.
          //
          // The cost is real and deliberate: a pinned assignment stops
          // re-drawing, and resolveLeveledDrillQids returns a pin in full,
          // unfiltered by band, so a later level edit on this row is inert.
          const frozen = frozenQidsByStudent?.[studentId];
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
              level: levelFor(studentId),
              question_count: questionCountOverride ?? null,
              // Spread rather than `question_qids: frozen ?? null`, so the
              // default path sends a payload with no such key at all. That is
              // what makes "unchanged when not freezing" checkable in a spec
              // rather than merely asserted here.
              ...(frozen && frozen.length > 0 ? { question_qids: frozen } : {}),
            } as never)
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
        metadata: {
          guided_drill_id: drill.id,
          // The only durable record of WHY this one row is pinned. Six weeks
          // later, "why did this drill not re-draw?" has an answer.
          ...(frozenQidsByStudent ? { frozen_reason: 'artifact_attached' } : {}),
        },
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
              // Snapshotted for the same reason `items` is. The clock is what
              // her time is scored against, so a later edit to the Activity
              // must not be able to rescore a run she has already finished.
              mode: activity.mode,
              time_goal_minutes: activity.time_goal_minutes as never,
              source_section: activity.source_section,
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
      if (item.conditionalTarget && item.topicId !== 'conditionals') throw new Error('Conditional targets apply only to Conditional Logic Bootcamp.');
      const conditional = item.topicId === 'conditionals' ? await resolveConditionalAssignment(item.conditionalTarget) : null;
      if (conditional?.target.courseEdition && !conditionalFullCourseAssignmentsReleased()) throw new Error('Full conditional course assignments are not released yet.');
      const assignedRoute = conditional?.route ?? bootcamp.route;

      return {
        type: 'bootcamp_module',
        title: conditional?.title ?? bootcamp.title,
        description: conditional?.description ?? bootcamp.description,
        assignmentType: 'bootcamp',
        // A bootcamp has no per-student row: the classroom item IS the
        // assignment, and source_id is the bootcamp's own route.
        sourceTable: 'bootcamps',
        insertRow: async () => null,
        sourceId: () => assignedRoute,
        route: () => assignedRoute,
        unlockAt,
        dueAt: null,
        metadata: { bootcamp_id: bootcamp.id, ...(conditional ? { conditional_target: conditional.target, conditional_target_key: conditional.key,
          ...(conditional.target.courseEdition && conditional.target.scope !== 'activity' ? { conditional_requirements: snapshotConditionalRequirements(conditional.target) } : {}) } : {}) },
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
  /**
   * Per-student band, overriding their profile level. An explicit null assigns
   * that student unlevelled. Guided drills only.
   */
  levelOverrides?: Record<string, StudentLevel | null>;
  /** Shorten the drill for everyone in this assign. Guided drills only. */
  questionCountOverride?: number | null;
  /** See assignWorkBundle. Guided drills only. */
  frozenQidsByStudent?: Record<string, string[]>;
  /**
   * Send the student a notification. Default true. Set false only when the
   * caller sends its own message covering this work.
   */
  notify?: boolean;
}): Promise<AssignWorkResult> {
  if (input.item.kind === 'reading_center') {
    const ok: StudentResult[] = [];
    const failed: StudentResult[] = [];
    for (const studentId of [...new Set(input.studentIds)]) {
      try {
        const { item, reused } = await assignReadingCenter({
          studentId, scheduledForLocalDate: input.scheduledForLocalDate,
          title: input.overrides?.title, description: input.overrides?.description,
        });
        // Repeating a successful assignment returns its existing launcher and
        // does not send the same notification again.
        let notify: NotifyResult | undefined;
        if (input.notify !== false && !reused) {
          try {
            notify = await notifyStudentOfClassroomItem({ adminUserId: input.teacherId, studentId,
              title: item.title, description: item.description ?? undefined,
              route: READING_CENTER_PATH, assignmentType: 'reading practice' });
          } catch (error) {
            console.error('[assignWork] Reading Center notification failed after verified assignment', error);
            notify = { inbox_ok: false, bell_ok: false, email_ok: false };
          }
        }
        ok.push({ studentId, assignmentId: item.id, classroomItemId: item.id,
          route: READING_CENTER_PATH, classroomItemIds: [item.id], notify });
      } catch (error) {
        failed.push({ studentId, error: message(error, 'Could not assign Reading Center') });
      }
    }
    return { ok, failed };
  }
  return runAssign({ ...input, items: [input.item] });
}

/**
 * Assign several pieces of work — of mixed kinds — as ONE event (spec D4).
 *
 * A drill and a homework set for the same topic ship together: the student gets
 * a classroom card for each (they are separate work), but a single notification,
 * because two pings for one handoff reads as two assignments. Per student the
 * bundle is all-or-nothing: if the third item fails, the first two are rolled
 * back, so the teacher never has to reason about a half-delivered bundle.
 *
 * Per-item overrides are deliberately not offered here — retitling one item
 * inside a bundle belongs to the single-item path.
 */
export async function assignWorkBundle(input: {
  teacherId: string;
  studentIds: string[];
  items: AssignableItem[];
  scheduledForLocalDate?: string;
  /** Per-student band. Applies to every guided drill in the bundle. */
  levelOverrides?: Record<string, StudentLevel | null>;
  questionCountOverride?: number | null;
  /**
   * Pin an exact question list on the guided-drill row instead of drawing at
   * open time. Keyed by studentId, because two students at different bands
   * freeze different sets from the same drill.
   *
   * Set this ONLY when an offline artifact is produced from the same list.
   * A pinned assignment stops re-drawing on re-attempt, and a later level
   * change on that row has no effect. Guided drills only.
   */
  frozenQidsByStudent?: Record<string, string[]>;
  /** See assignWork. Default true. */
  notify?: boolean;
}): Promise<AssignWorkResult> {
  return runAssign(input);
}

/** What one student ended up with, so a failure can be undone precisely. */
interface Written {
  assignmentId: string | null;
  classroomItemId: string | null;
  table: string;
  kind: AssignableItem['kind'];
}

async function runAssign(input: {
  teacherId: string;
  studentIds: string[];
  items: AssignableItem[];
  scheduledForLocalDate?: string;
  overrides?: {
    title?: string;
    description?: string;
    dueAt?: string | null;
    metadata?: Record<string, unknown>;
  };
  levelOverrides?: Record<string, StudentLevel | null>;
  questionCountOverride?: number | null;
  frozenQidsByStudent?: Record<string, string[]>;
  notify?: boolean;
}): Promise<AssignWorkResult> {
  const {
    teacherId,
    studentIds,
    items,
    scheduledForLocalDate,
    overrides,
    levelOverrides,
    questionCountOverride,
    frozenQidsByStudent,
    notify: shouldNotify = true,
  } = input;

  const ok: StudentResult[] = [];
  const failed: StudentResult[] = [];

  if (studentIds.length === 0 || items.length === 0) return { ok, failed };

  /*
   * Freezing is validated before any write, and it throws rather than
   * degrading. A silent no-op here is the exact failure this feature exists to
   * prevent: an artifact would be emailed carrying questions the assignment
   * row does not hold, and nothing downstream could tell.
   */
  if (frozenQidsByStudent) {
    if (!items.some((item) => item.kind === 'guided_drill')) {
      throw new Error('frozenQidsByStudent was supplied but no guided drill is being assigned');
    }
    for (const [studentId, qids] of Object.entries(frozenQidsByStudent)) {
      if (!studentIds.includes(studentId)) {
        throw new Error(`frozenQidsByStudent names ${studentId}, who is not in this assign`);
      }
      if (!Array.isArray(qids) || qids.length === 0) {
        throw new Error(`frozenQidsByStudent[${studentId}] is empty; omit the student instead`);
      }
    }
  }

  // Every item is resolved before anyone is written to, so an unreadable item
  // fails the whole assign cleanly instead of half-delivering the bundle. An
  // unreadable student level belongs in the same block for the same reason: the
  // catch below reports every student as failed and nothing has been written.
  let plans: AssignPlan[];
  try {
    // Only guided drills carry a level, so nothing else pays for the lookup.
    const needsLevels = items.some((item) => item.kind === 'guided_drill');
    const levels: StudentLevelMap = needsLevels
      ? await fetchStudentLevels(studentIds)
      : new Map();

    plans = await Promise.all(
      items.map(async (item, index) => {
        const base = await planFor(
          item,
          teacherId,
          scheduledForLocalDate,
          levels,
          levelOverrides,
          questionCountOverride,
          frozenQidsByStudent,
        );
        // Overrides only ever accompany a single item (see assignWork).
        if (index > 0 || !overrides) return base;
        return {
          ...base,
          title: overrides.title?.trim() || base.title,
          description: overrides.description?.trim() || base.description,
          dueAt: overrides.dueAt !== undefined ? overrides.dueAt : base.dueAt,
          metadata: { ...base.metadata, ...(overrides.metadata ?? {}) },
        };
      }),
    );
  } catch (error) {
    // Nothing was written, so every student failed for the same reason.
    const reason = message(error, 'Could not load the item to assign');
    return { ok, failed: studentIds.map((studentId) => ({ studentId, error: reason })) };
  }

  for (const studentId of studentIds) {
    const written: Written[] = [];

    try {
      const routes: string[] = [];

      for (let i = 0; i < plans.length; i++) {
        const plan = plans[i];
        const record: Written = {
          assignmentId: null,
          classroomItemId: null,
          table: plan.sourceTable,
          kind: items[i].kind,
        };
        // Recorded before each write so a throw mid-item still rolls back what
        // the previous items wrote.
        written.push(record);

        record.assignmentId = await plan.insertRow(studentId);
        const expandedTarget = plan.metadata.conditional_target as ConditionalAssignmentTarget | undefined;
        const classroomIdentity = expandedTarget?.courseEdition === 'full-conditionals-v3' ? crypto.randomUUID() : undefined;
        if (classroomIdentity) record.classroomItemId = classroomIdentity;
        const route = classroomIdentity ? conditionalProtectedGrantRoute(expandedTarget!, classroomIdentity) : plan.route(record.assignmentId);
        routes.push(route);

        const classroomItem = await createClassroomItem({
          ...(classroomIdentity ? { id: classroomIdentity } : {}),
          studentId,
          createdBy: teacherId,
          type: plan.type,
          title: plan.title,
          description: plan.description,
          sourceTable: plan.sourceTable,
          sourceId: classroomIdentity ? route : plan.sourceId(record.assignmentId),
          unlockAt: plan.unlockAt,
          dueAt: plan.dueAt,
          visibleToStudent: true,
          status: 'assigned',
          metadata: { ...plan.metadata, assigned_route: route },
        });
        if (classroomIdentity && classroomItem.id !== classroomIdentity) throw new Error('The assigned course identity did not match its saved row. No notification was sent.');
        record.classroomItemId = classroomItem.id;
      }

      // A caller that owns its own messaging opts out. The weekly-plan builder
      // does: it sends one summary for the whole week, and seven bell entries
      // for one plan is the exact UX it already avoids.
      const summary = notificationFor(plans, routes);
      const notify = shouldNotify
        ? await notifyStudentOfClassroomItem({
            adminUserId: teacherId,
            studentId,
            title: summary.title,
            description: summary.description,
            route: summary.route,
            assignmentType: summary.assignmentType,
          })
        : undefined;

      ok.push({
        studentId,
        assignmentId: written[0]?.assignmentId ?? undefined,
        classroomItemId: written[0]?.classroomItemId ?? undefined,
        route: routes[0],
        assignmentIds: written.map((w) => w.assignmentId).filter((id): id is string => !!id),
        classroomItemIds: written
          .map((w) => w.classroomItemId)
          .filter((id): id is string => !!id),
        notify,
      });
    } catch (error) {
      console.error('[assignWork] student failed', {
        studentId,
        kinds: items.map((i) => i.kind),
        written,
        error,
      });
      // Newest first, so the half-written item goes before the ones that landed.
      for (const record of [...written].reverse()) {
        await rollback(record);
      }
      failed.push({ studentId, error: message(error, 'Assign failed') });
    }
  }

  return { ok, failed };
}

/**
 * One handoff, one message. A single item keeps its own wording; a bundle is
 * announced as a list pointing at the Classroom, since no one route covers it.
 */
function notificationFor(
  plans: AssignPlan[],
  routes: string[],
): { title: string; description?: string; route: string; assignmentType?: string } {
  if (plans.length === 1) {
    return {
      title: plans[0].title,
      description: plans[0].description,
      route: routes[0],
      assignmentType: plans[0].assignmentType,
    };
  }
  return {
    title: `${plans.length} new pieces of work`,
    description: plans.map((p) => `• ${p.title}`).join('\n'),
    route: '/classroom',
    assignmentType: 'assignment',
  };
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
