// Reads for the prescribed week, with the subject explicit in every query.
//
// RLS limits a student to their own published plans, but an admin account can
// read every student's rows, and a teacher views a selected student. So every
// read names the student it is for, and the item read also checks that the
// plan it was handed belongs to that student. RLS is a backstop, not the scope.

import type { WeeklyPlan, WeeklyPlanItem } from '@/hooks/useWeeklyPlan';
import { PERSONAL_PLAN_TITLE, pickPrescribedPlan, type PlanRelation } from '@/lib/weeklyPlanWeek';

export const PLAN_PAGE_SIZE = 50;
/** A hard stop so a runaway table can never turn one read into an endless loop. */
export const MAX_PAGES = 40;

type Result<T> = { data: T[] | null; error: unknown };

// The slice of the supabase-js query builder these reads use. Typed loosely so
// tests can pass an in-memory stand-in.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type PlanDb = { from: (table: string) => any };
/* eslint-enable @typescript-eslint/no-explicit-any */

async function readAll<T>(page: (from: number, to: number) => PromiseLike<Result<T>>, stop?: (rows: T[]) => boolean): Promise<T[]> {
  const all: T[] = [];
  for (let n = 0; n < MAX_PAGES; n++) {
    const from = n * PLAN_PAGE_SIZE;
    const { data, error } = await page(from, from + PLAN_PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PLAN_PAGE_SIZE || stop?.(rows)) return all;
  }
  throw new Error('Too many weekly plans to read in one pass.');
}

/**
 * The one prescribed week for `studentId`. Plans that have not ended are read
 * earliest start first: every plan containing today starts on or before today,
 * so all of them arrive before any upcoming plan, and reading stops once a
 * page passes today. Distant future plans can therefore never crowd out this
 * week or the next one. Only if nothing current or upcoming exists is the
 * latest past plan read.
 */
export async function loadPrescribedPlan(
  db: PlanDb,
  studentId: string,
  todayISO: string,
): Promise<{ plan: WeeklyPlan | null; items: WeeklyPlanItem[]; relation: PlanRelation | null }> {
  const live = await readAll<WeeklyPlan>(
    (from, to) =>
      db
        .from('weekly_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'published')
        .neq('title', PERSONAL_PLAN_TITLE)
        .gte('week_end', todayISO)
        .order('week_start', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    (rows) => rows.some((r) => r.week_start > todayISO),
  );
  let picked = pickPrescribedPlan(live.filter((p) => p.student_id === studentId), todayISO);

  if (!picked) {
    const { data, error } = (await db
      .from('weekly_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'published')
      .neq('title', PERSONAL_PLAN_TITLE)
      .lt('week_end', todayISO)
      .order('week_start', { ascending: false })
      .order('id', { ascending: true })
      .limit(PLAN_PAGE_SIZE)) as Result<WeeklyPlan>;
    if (error) throw error;
    picked = pickPrescribedPlan((data ?? []).filter((p) => p.student_id === studentId), todayISO);
  }

  if (!picked) return { plan: null, items: [], relation: null };
  const items = await loadPlanItems(db, picked.plan, studentId);
  return { plan: picked.plan, items, relation: picked.relation };
}

/** Every item of `plan`, refusing a plan that is not `studentId`'s. */
export async function loadPlanItems(db: PlanDb, plan: Pick<WeeklyPlan, 'id' | 'student_id'>, studentId: string): Promise<WeeklyPlanItem[]> {
  if (plan.student_id !== studentId) {
    throw new Error('That plan belongs to a different student.');
  }
  const rows = await readAll<WeeklyPlanItem>((from, to) =>
    db
      .from('weekly_plan_items')
      .select('*')
      .eq('weekly_plan_id', plan.id)
      .eq('student_id', studentId)
      .order('day_date', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to),
  );
  return rows.filter((r) => r.weekly_plan_id === plan.id && r.student_id === studentId);
}
