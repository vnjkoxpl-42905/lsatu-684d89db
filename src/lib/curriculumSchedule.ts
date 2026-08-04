import { supabase } from '@/integrations/supabase/client';
import { assignWorkBundle } from '@/lib/assignWork';
import {
  nextCurriculumEntries,
  resolveStudentCurriculum,
  type CurriculumEntry,
  type CurriculumTrackItem,
  type StudentCurriculumOverride,
} from '@/lib/curriculum';
import { addLocalDays, parseLocalDay } from '@/lib/localDate';
import type { StudentLevel } from '@/lib/studentLevel';

/**
 * Turn a student's curriculum into a week of dated work.
 *
 * Two steps, deliberately separate:
 *
 *   generateWeeklyPlan  -> a DRAFT plan and its items. Nothing is assigned and
 *                          the student is not notified. The plan is a proposal.
 *   publishWeeklyPlan   -> assigns every item as one bundle (so one
 *                          notification, not one per drill), links each item to
 *                          the classroom item it created, and publishes.
 *
 * Splitting it this way is what `weekly_plan_items.classroom_item_id` being
 * nullable is for. Assigning at generation time would put work in the student's
 * classroom and ping them about a plan Joshua has not agreed to yet.
 */

/** Days of the week to place work on. 0 = Sunday, matching Date#getDay. */
export const DEFAULT_STUDY_DAYS = [1, 2, 3, 4, 5] as const;

export interface PlannedDay {
  /** YYYY-MM-DD, local. */
  dayDate: string;
  entries: CurriculumEntry[];
  totalMinutes: number;
}

/**
 * Spread entries across the study days of a week, in curriculum order.
 *
 * Fills day by day up to a per-day minute budget rather than round-robining,
 * so a student works consecutive drills on one sitting instead of one drill on
 * each of five days. Order is never reshuffled: the curriculum decided it.
 *
 * Pure, so the interesting part is testable without a database or a clock.
 */
export function planWeekDays(
  entries: CurriculumEntry[],
  input: {
    /** YYYY-MM-DD for the Monday (or whichever day) the week starts. */
    weekStart: string;
    /** Local weekday numbers to place work on. Defaults to Mon-Fri. */
    studyDays?: readonly number[];
    /** Soft ceiling per day. The first entry of a day always fits. */
    minutesPerDay?: number;
  },
): PlannedDay[] {
  const start = parseLocalDay(input.weekStart);
  if (!start) throw new Error(`Not a calendar date: ${input.weekStart}`);

  const studyDays = new Set(input.studyDays ?? DEFAULT_STUDY_DAYS);
  const minutesPerDay = input.minutesPerDay ?? 60;

  const days: PlannedDay[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const dayDate = addLocalDays(offset, start);
    const weekday = parseLocalDay(dayDate)!.getDay();
    if (studyDays.has(weekday)) days.push({ dayDate, entries: [], totalMinutes: 0 });
  }
  if (days.length === 0) return [];

  let cursor = 0;
  for (const entry of entries) {
    const cost = entry.estimatedMinutes ?? 0;
    // Move on when this day is full, but never past the end of the week:
    // the last day absorbs the remainder rather than dropping work silently.
    while (
      cursor < days.length - 1 &&
      days[cursor].entries.length > 0 &&
      days[cursor].totalMinutes + cost > minutesPerDay
    ) {
      cursor++;
    }
    days[cursor].entries.push(entry);
    days[cursor].totalMinutes += cost;
  }

  return days.filter((day) => day.entries.length > 0);
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

/** The generated types do not know the curriculum tables yet. */
const loose = () => supabase as never as {
  from: (table: string) => any;
};

export interface GenerateWeeklyPlanInput {
  teacherId: string;
  studentId: string;
  /** YYYY-MM-DD. */
  weekStart: string;
  /** Defaults to the student's enrolled track, else the default track. */
  trackId?: string;
  minutesPerDay?: number;
  studyDays?: readonly number[];
  title?: string;
}

export interface GeneratedWeeklyPlan {
  planId: string;
  days: PlannedDay[];
  itemCount: number;
  /** Why nothing was generated, when itemCount is 0. */
  emptyReason?: 'no-track' | 'curriculum-complete';
}

/** One drill's worth of a planned week, ready to become a plan item. */
export interface CurriculumWeekSlot {
  /** YYYY-MM-DD, local. */
  day: string;
  guidedDrillId: string;
  title: string;
  estimatedMinutes: number | null;
  level: StudentLevel | null;
  trackItemId: string | null;
}

export interface CurriculumWeek {
  trackId: string;
  slots: CurriculumWeekSlot[];
  days: PlannedDay[];
  /** Set when there is nothing to schedule. */
  emptyReason?: 'no-track' | 'curriculum-complete';
}

/**
 * Work out a student's next week of drills without writing anything.
 *
 * Shared by the standalone generator and by the weekly-plan builder's "Fill
 * from curriculum" button, so both compute the same week from the same rules.
 */
export async function loadCurriculumWeek(input: {
  studentId: string;
  weekStart: string;
  trackId?: string;
  minutesPerDay?: number;
  studyDays?: readonly number[];
}): Promise<CurriculumWeek> {
  const db = loose();

  const { data: enrollment } = await db
    .from('student_curriculum_enrollments')
    .select('track_id, pace_multiplier')
    .eq('student_id', input.studentId)
    .maybeSingle();

  let trackId = input.trackId ?? enrollment?.track_id ?? null;
  if (!trackId) {
    const { data: fallback } = await db
      .from('curriculum_tracks')
      .select('id')
      .eq('is_default', true)
      .maybeSingle();
    trackId = fallback?.id ?? null;
  }
  if (!trackId) return { trackId: '', slots: [], days: [], emptyReason: 'no-track' };

  const [{ data: items }, { data: overrides }, { data: assigned }] = await Promise.all([
    db.from('curriculum_track_items').select('*').eq('track_id', trackId),
    db
      .from('student_curriculum_overrides')
      .select('*')
      .eq('student_id', input.studentId)
      .eq('track_id', trackId),
    db
      .from('guided_drill_assignments')
      .select('guided_drill_id')
      .eq('student_id', input.studentId),
  ]);

  const resolved = resolveStudentCurriculum(
    (items ?? []) as CurriculumTrackItem[],
    (overrides ?? []) as StudentCurriculumOverride[],
  );

  const studyDayCount = (input.studyDays ?? DEFAULT_STUDY_DAYS).length;
  const minutesPerDay = input.minutesPerDay ?? 60;

  const upcoming = nextCurriculumEntries(resolved, {
    assignedDrillIds: (assigned ?? []).map((r: { guided_drill_id: string }) => r.guided_drill_id),
    minutesBudget: minutesPerDay * studyDayCount,
    paceMultiplier: enrollment?.pace_multiplier ?? 1,
  });

  if (upcoming.length === 0) {
    return {
      trackId,
      slots: [],
      days: [],
      emptyReason: resolved.entries.length === 0 ? 'no-track' : 'curriculum-complete',
    };
  }

  const days = planWeekDays(upcoming, {
    weekStart: input.weekStart,
    studyDays: input.studyDays,
    minutesPerDay,
  });

  // Real drill titles, so the plan reads as a week of work rather than as a
  // list of uuids.
  const { data: drillRows } = await db
    .from('guided_drills')
    .select('id, title, estimated_minutes')
    .in('id', [...new Set(upcoming.map((e) => e.guidedDrillId))]);
  const drillById = new Map<string, { title: string; estimated_minutes: number | null }>(
    (drillRows ?? []).map((d: { id: string; title: string; estimated_minutes: number | null }) => [
      d.id,
      d,
    ]),
  );

  const slots = days.flatMap((day) =>
    day.entries.map((entry) => ({
      day: day.dayDate,
      guidedDrillId: entry.guidedDrillId,
      title: drillById.get(entry.guidedDrillId)?.title ?? 'Guided drill',
      estimatedMinutes:
        entry.estimatedMinutes ?? drillById.get(entry.guidedDrillId)?.estimated_minutes ?? null,
      level: entry.level,
      trackItemId: entry.trackItemId,
    })),
  );

  return { trackId, slots, days };
}

/**
 * Build a draft weekly plan from where the student is in their curriculum.
 *
 * "Where they are" is derived, not stored: it is whatever they do not yet have
 * a guided_drill_assignment for. A stored cursor would drift the moment a drill
 * was assigned or un-assigned by hand.
 */
export async function generateWeeklyPlan(
  input: GenerateWeeklyPlanInput,
): Promise<GeneratedWeeklyPlan> {
  const db = loose();

  const week = await loadCurriculumWeek(input);
  if (week.emptyReason === 'no-track' && !week.trackId) {
    throw new Error('No curriculum track to generate from. Create one, or set a default.');
  }

  const weekStartDate = parseLocalDay(input.weekStart);
  if (!weekStartDate) throw new Error(`Not a calendar date: ${input.weekStart}`);
  const weekEnd = addLocalDays(6, weekStartDate);

  const { data: plan, error: planError } = await db
    .from('weekly_plans')
    .insert({
      student_id: input.studentId,
      created_by: input.teacherId,
      title: input.title ?? `Week of ${input.weekStart}`,
      week_start: input.weekStart,
      week_end: weekEnd,
      status: 'draft',
      ai_generated: true,
      rationale: `Generated from curriculum track ${week.trackId}.`,
    })
    .select('id')
    .single();
  if (planError) throw planError;

  if (week.slots.length === 0) {
    return { planId: plan.id, days: [], itemCount: 0, emptyReason: week.emptyReason };
  }

  let sortOrder = 0;
  let currentDay = '';
  const rows = week.slots.map((slot) => {
    if (slot.day !== currentDay) {
      currentDay = slot.day;
      sortOrder = 0;
    }
    return {
      weekly_plan_id: plan.id,
      student_id: input.studentId,
      day_date: slot.day,
      title: slot.title,
      estimated_minutes: slot.estimatedMinutes,
      sort_order: sortOrder++,
      status: 'assigned',
      // The drill and its band ride in metadata until publish turns them into
      // a real assignment. classroom_item_id stays null until then.
      metadata_json: {
        guided_drill_id: slot.guidedDrillId,
        curriculum_track_id: week.trackId,
        curriculum_track_item_id: slot.trackItemId,
        level: slot.level,
      },
    };
  });

  const { error: itemsError } = await db.from('weekly_plan_items').insert(rows);
  if (itemsError) {
    // A plan with no items is a confusing empty shell in the builder.
    await db.from('weekly_plans').delete().eq('id', plan.id);
    throw itemsError;
  }

  return { planId: plan.id, days: week.days, itemCount: rows.length };
}

/**
 * Assign everything in a draft plan and publish it.
 *
 * One bundle, so the student gets a single "here is your week" notification
 * rather than one ping per drill. Levels ride through as per-entry overrides,
 * falling back to the student's profile level where the plan does not pin one.
 */
export async function publishWeeklyPlan(input: {
  teacherId: string;
  planId: string;
}): Promise<{ assigned: number; failed: number }> {
  const db = loose();

  const { data: plan, error: planError } = await db
    .from('weekly_plans')
    .select('id, student_id, status')
    .eq('id', input.planId)
    .single();
  if (planError) throw planError;
  if (plan.status === 'published') return { assigned: 0, failed: 0 };

  const { data: items, error: itemsError } = await db
    .from('weekly_plan_items')
    .select('id, day_date, metadata_json, classroom_item_id')
    .eq('weekly_plan_id', input.planId)
    .order('day_date', { ascending: true })
    .order('sort_order', { ascending: true });
  if (itemsError) throw itemsError;

  // Skip anything already assigned, so re-publishing cannot double-assign.
  const pending = (items ?? []).filter(
    (i: { classroom_item_id: string | null; metadata_json: { guided_drill_id?: string } }) =>
      !i.classroom_item_id && i.metadata_json?.guided_drill_id,
  );

  let assigned = 0;
  let failed = 0;

  // Grouped by day so each day's work unlocks on its own date, while each day
  // still sends exactly one notification.
  const byDay = new Map<string, typeof pending>();
  for (const item of pending) {
    const list = byDay.get(item.day_date) ?? [];
    list.push(item);
    byDay.set(item.day_date, list);
  }

  for (const [dayDate, dayItems] of byDay) {
    const levelOverrides: Record<string, StudentLevel | null> = {};
    // A plan-level pin applies to the whole day's bundle; entries without one
    // fall through to the student's profile level inside assignWork.
    const pinned = dayItems.find((i) => i.metadata_json?.level)?.metadata_json?.level;
    if (pinned) levelOverrides[plan.student_id] = pinned as StudentLevel;

    const result = await assignWorkBundle({
      teacherId: input.teacherId,
      studentIds: [plan.student_id],
      items: dayItems.map((i) => ({
        kind: 'guided_drill' as const,
        drillId: i.metadata_json.guided_drill_id as string,
      })),
      scheduledForLocalDate: dayDate,
      levelOverrides: Object.keys(levelOverrides).length ? levelOverrides : undefined,
    });

    if (result.ok.length === 0) {
      failed += dayItems.length;
      continue;
    }

    const classroomItemIds = result.ok[0].classroomItemIds ?? [];
    for (let i = 0; i < dayItems.length; i++) {
      const classroomItemId = classroomItemIds[i];
      if (!classroomItemId) {
        failed++;
        continue;
      }
      await db
        .from('weekly_plan_items')
        .update({ classroom_item_id: classroomItemId })
        .eq('id', dayItems[i].id);
      assigned++;
    }
  }

  // Publishing a plan whose every item failed to assign would show the student
  // an empty week, so leave it in draft for the teacher to retry.
  if (assigned > 0) {
    await db
      .from('weekly_plans')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', input.planId);
  }

  return { assigned, failed };
}
