// The prescribed week, as one model both sides read.
//
// A weekly plan is Joshua's prescription: which day each task belongs to and
// the order he put them in. The student's scan (My Work) and the teacher's
// review of a published plan (Weekly Plans) both build from this module, so
// the two can never disagree about order, status, counts or time.
//
// Rules this module holds:
// - Order is the teacher's: day first, then the sort_order he saved. Nothing
//   here re-ranks tasks by urgency, difficulty or any automated suggestion.
// - Status is the stored weekly_plan_items.status. Opening a task never
//   changes it; this module only reads. A stored value it does not recognise
//   is shown as unknown, never guessed as started or finished.
// - A time estimate exists only when the teacher entered a positive number.
//   Missing, zero or invalid estimates are counted as unknown and disclosed,
//   never filled with a guess.
// - Days are calendar dates (exactly YYYY-MM-DD, a real date), read in the
//   student's local timezone, the same way Home and the booking strip read
//   them. A task with a malformed day is listed as undated, not dropped.
// - Items are scoped to the plan AND the plan's student, so a read that ever
//   returned another student's rows still could not show them.

import type { WeeklyPlan, WeeklyPlanItem } from '@/hooks/useWeeklyPlan';
import { readTodoAction } from '@/lib/todoActions';
import { localDayISO, parseLocalDay } from '@/lib/localDate';

/** The hidden plan that hosts a student's own to-do items. Not a prescription. */
export const PERSONAL_PLAN_TITLE = '__personal__';

/** Longest span drawn for one plan, whatever its stored dates say. */
const MAX_PLAN_DAYS = 14;

export function isPersonalPlan(plan: Pick<WeeklyPlan, 'title' | 'student_id' | 'created_by'>): boolean {
  return plan.title === PERSONAL_PLAN_TITLE || plan.created_by === plan.student_id;
}

/** The value as a real local calendar date, or null. Rejects 2026-02-31 and suffixes. */
export function validDay(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = parseLocalDay(value);
  return parsed && localDayISO(parsed) === value ? value : null;
}

function addDaysISO(iso: string, days: number): string {
  const d = parseLocalDay(iso) as Date;
  d.setDate(d.getDate() + days);
  return localDayISO(d);
}

/**
 * The plan's last day. A missing, malformed or backwards end falls back to the
 * six days after the start (plans are built a week at a time), and a span
 * longer than MAX_PLAN_DAYS is cut there.
 */
function planEnd(start: string, rawEnd: unknown): string {
  const end = validDay(rawEnd);
  if (!end || end < start) return addDaysISO(start, 6);
  const cap = addDaysISO(start, MAX_PLAN_DAYS - 1);
  return end > cap ? cap : end;
}

export type PlanRelation = 'current' | 'upcoming' | 'past';

/**
 * Pick the one prescribed week a student should scan: the published plan whose
 * dates contain today, else the soonest upcoming one, else the most recent
 * past one. The student's personal to-do plan and plans with an invalid start
 * date are never candidates.
 */
export function pickPrescribedPlan<P extends WeeklyPlan>(
  plans: P[],
  todayISO: string,
): { plan: P; relation: PlanRelation } | null {
  const candidates = plans.filter(
    (p) => p.status === 'published' && !isPersonalPlan(p) && validDay(p.week_start) !== null,
  );
  if (candidates.length === 0) return null;

  const endOf = (p: P) => planEnd(p.week_start, p.week_end);

  const current = candidates
    .filter((p) => p.week_start <= todayISO && todayISO <= endOf(p))
    // Two published plans overlapping today: the later start is the newer
    // prescription.
    .sort((a, b) => b.week_start.localeCompare(a.week_start) || b.created_at.localeCompare(a.created_at))[0];
  if (current) return { plan: current, relation: 'current' };

  const upcoming = candidates
    .filter((p) => p.week_start > todayISO)
    .sort((a, b) => a.week_start.localeCompare(b.week_start))[0];
  if (upcoming) return { plan: upcoming, relation: 'upcoming' };

  const past = candidates
    .filter((p) => endOf(p) < todayISO)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
  return past ? { plan: past, relation: 'past' } : null;
}

export type PlanTaskStatus = WeeklyPlanItem['status'] | 'unknown';

export interface PrescribedTask {
  id: string;
  /** 1-based position in the teacher's order across the whole week. */
  step: number;
  title: string;
  instructions: string | null;
  status: PlanTaskStatus;
  statusLabel: string;
  /** Teacher-entered minutes, or null when none was given. */
  estimateMinutes: number | null;
  dueAt: string | null;
  /** True while unlock_at is still in the future. */
  locked: boolean;
  unlockAt: string | null;
  /** Where tapping the task goes. Null when there is no page to open. */
  href: string | null;
}

export interface PrescribedDay {
  iso: string;
  label: string;
  isToday: boolean;
  isPast: boolean;
  tasks: PrescribedTask[];
}

export interface PrescribedWeek {
  planId: string;
  title: string;
  weekStart: string | null;
  weekEnd: string | null;
  rangeLabel: string;
  days: PrescribedDay[];
  /** Tasks whose stored day falls outside the plan's days. */
  outsideWeek: PrescribedTask[];
  /** Tasks whose stored day is not a real date. */
  undated: PrescribedTask[];
  totals: {
    tasks: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    skipped: number;
    /** Tasks whose stored status is not one this app knows. */
    unknownStatus: number;
    /** Tasks that count toward finishing: everything not skipped. */
    required: number;
    /** Sum of known estimates for tasks that count. */
    knownMinutes: number;
    /** Required tasks with no estimate. */
    unknownEstimates: number;
    /** Known minutes left on required tasks that are not completed. */
    knownMinutesLeft: number;
  };
  finished: boolean;
  finishCriterion: string;
}

const STATUS_LABEL: Record<PlanTaskStatus, string> = {
  assigned: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  skipped: 'Skipped',
  unknown: 'Status unknown',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status as PlanTaskStatus] ?? STATUS_LABEL.unknown;
}

function normalizeStatus(status: unknown): PlanTaskStatus {
  return status === 'assigned' || status === 'in_progress' || status === 'completed' || status === 'skipped'
    ? status
    : 'unknown';
}

/** A positive estimate stays positive: 0.4 minutes reads as 1, never 0. */
export function knownEstimate(minutes: unknown): number | null {
  return typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0
    ? Math.max(1, Math.round(minutes))
    : null;
}

/**
 * The page a plan task opens. A linked guided drill opens its start page and
 * linked homework opens its assignment page; neither starts the work or
 * changes a status. Anything else opens the task's own classroom page.
 */
export function planTaskHref(item: Pick<WeeklyPlanItem, 'metadata_json' | 'classroom_item_id'>): string | null {
  const action = readTodoAction(item.metadata_json);
  if (action.kind === 'drill' && action.ref_id) return `/guided/${encodeURIComponent(action.ref_id)}`;
  if (action.kind === 'homework' && action.ref_id) return `/classroom/${encodeURIComponent(action.ref_id)}`;
  if (action.kind === 'bootcamp' && action.route?.startsWith('/bootcamp')) return action.route;
  if (item.classroom_item_id) return `/classroom/item/${encodeURIComponent(item.classroom_item_id)}`;
  return null;
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

const dayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function dayLabelFor(iso: string): string {
  const d = parseLocalDay(iso);
  return d ? dayFormat.format(d) : iso;
}

export function buildPrescribedWeek(
  plan: WeeklyPlan,
  items: WeeklyPlanItem[],
  now: Date,
  todayISO: string,
): PrescribedWeek {
  const weekStart = validDay(plan.week_start);
  const weekEnd = weekStart ? planEnd(weekStart, plan.week_end) : null;

  const ordered = items
    .filter((it) => it.weekly_plan_id === plan.id && it.student_id === plan.student_id)
    .map((it, index) => ({ it, index, day: validDay(it.day_date) }))
    .sort(
      (a, b) =>
        // Undated tasks sort after dated ones, still in the teacher's order.
        (a.day ?? '9999').localeCompare(b.day ?? '9999') ||
        (a.it.sort_order ?? 0) - (b.it.sort_order ?? 0) ||
        a.index - b.index,
    );

  const tasks = ordered.map<PrescribedTask & { day: string | null }>(({ it, day }, i) => {
    const status = normalizeStatus(it.status);
    return {
      id: it.id,
      step: i + 1,
      day,
      title: it.title?.trim() || 'Untitled task',
      instructions: it.instructions?.trim() || null,
      status,
      statusLabel: statusLabel(status),
      estimateMinutes: knownEstimate(it.estimated_minutes),
      dueAt: it.due_at,
      unlockAt: it.unlock_at,
      locked: !!it.unlock_at && new Date(it.unlock_at).getTime() > now.getTime(),
      href: planTaskHref(it),
    };
  });

  const span: string[] = [];
  if (weekStart && weekEnd) {
    for (let iso = weekStart; iso <= weekEnd && span.length < MAX_PLAN_DAYS; iso = addDaysISO(iso, 1)) span.push(iso);
  }
  const spanSet = new Set(span);

  const strip = ({ day: _day, ...task }: PrescribedTask & { day: string | null }): PrescribedTask => task;

  const days: PrescribedDay[] = span.map((iso) => ({
    iso,
    label: dayLabelFor(iso),
    isToday: iso === todayISO,
    isPast: iso < todayISO,
    tasks: tasks.filter((t) => t.day === iso).map(strip),
  }));
  const outsideWeek = tasks.filter((t) => t.day !== null && !spanSet.has(t.day)).map(strip);
  const undated = tasks.filter((t) => t.day === null).map(strip);

  const required = tasks.filter((t) => t.status !== 'skipped');
  const totals = {
    tasks: tasks.length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    notStarted: tasks.filter((t) => t.status === 'assigned').length,
    skipped: tasks.filter((t) => t.status === 'skipped').length,
    unknownStatus: tasks.filter((t) => t.status === 'unknown').length,
    required: required.length,
    knownMinutes: required.reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0),
    unknownEstimates: required.filter((t) => t.estimateMinutes === null).length,
    knownMinutesLeft: required
      .filter((t) => t.status !== 'completed')
      .reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0),
  };

  const finished = totals.required > 0 && totals.completed === totals.required;
  const finishCriterion =
    totals.required === 0
      ? 'There is nothing to finish in this plan.'
      : `This week is finished when all ${totals.required} task${totals.required === 1 ? '' : 's'} show Completed.` +
        (totals.skipped > 0 ? ' Skipped tasks do not count.' : '');

  return {
    planId: plan.id,
    title: plan.title?.trim() || 'Weekly plan',
    weekStart,
    weekEnd,
    rangeLabel: weekStart && weekEnd ? `${dayLabelFor(weekStart)} to ${dayLabelFor(weekEnd)}` : 'Dates not available',
    days,
    outsideWeek,
    undated,
    totals,
    finished,
    finishCriterion,
  };
}

/** One plain sentence on time, never claiming more than the teacher entered. */
export function estimateSummary(totals: PrescribedWeek['totals']): string | null {
  if (totals.required === 0) return null;
  if (totals.knownMinutes === 0) return 'No time estimates were given for this week.';
  const base = `About ${formatMinutes(totals.knownMinutes)} in total, ${formatMinutes(totals.knownMinutesLeft)} left`;
  if (totals.unknownEstimates === 0) return `${base}.`;
  return `${base}, not counting ${totals.unknownEstimates} task${totals.unknownEstimates === 1 ? '' : 's'} with no estimate.`;
}
