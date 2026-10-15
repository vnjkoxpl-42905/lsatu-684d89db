import { supabase } from '@/integrations/supabase/client';

/**
 * The shape of a study week, as data.
 *
 * A curriculum decides WHICH drills a student gets and in what order. A
 * schedule decides what a week LOOKS like: which days are worked, what sits on
 * each, where the timed day falls, where rest falls. Independent axes, so
 * "same week, different drills" and "same drills, different week" are both
 * expressible.
 *
 * Weekdays are keyed the way `Date#getDay` numbers them: 0 = Sunday .. 6 =
 * Saturday. A weekday that is absent is a rest day. Absent rather than empty,
 * so a rest day cannot be misread as a day nobody has filled in yet.
 */

export interface TemplateTask {
  title: string;
  /** Null when the work is untimed, which most of it is. */
  minutes: number | null;
  /** The one position curriculum drills are allowed to fill. */
  drillSlot?: true;
}

export type WeekTemplate = Readonly<Record<number, readonly TemplateTask[]>>;

export interface ScheduleTemplate {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isDefault: boolean;
  days: WeekTemplate;
}

const SKILL_DAY: readonly TemplateTask[] = [
  { title: 'Priority question type drill (untimed)', minutes: null, drillSlot: true },
  { title: 'Wrong answer journal', minutes: null },
  { title: '1-2 RC passages (untimed)', minutes: null },
  { title: 'Wrong answer journal', minutes: null },
];

/**
 * The built-in week, and the fallback when no schedule is stored.
 *
 * Transcribed from the brain rather than invented: two independent captures
 * agree on it (a Mar 2025 screenshot and Joshua's 2026-07-23 manuscript), and
 * the week he built live for a student on 2025-10-10 is the same shape with the
 * test moved to Saturday.
 *
 * 4:1:1:1 -- four untimed skill days, one timed application day, one rest day,
 * one full test. Two things matter and are easy to lose: review is welded to
 * every task rather than being its own skippable line, and the drill is a
 * *priority* drill, chosen from the student's weaknesses. That is the hook the
 * curriculum fills.
 */
export const STANDARD_WEEK: WeekTemplate = {
  1: SKILL_DAY,
  2: SKILL_DAY,
  3: SKILL_DAY,
  4: SKILL_DAY,
  5: [
    { title: 'RC or LR supersection (5 passages / 35 questions), timed', minutes: 45 },
    { title: 'Blind review and wrong answer journal', minutes: null },
  ],
  // Saturday rests, and is absent rather than empty.
  0: [
    { title: 'Full practice test', minutes: null },
    { title: 'Blind review and wrong answer journal', minutes: null },
  ],
};

/** How many priority-drill positions a week offers, after day filtering. */
export function countDrillSlots(
  template: WeekTemplate = STANDARD_WEEK,
  studyDays?: readonly number[],
): number {
  const days = studyDays ?? Object.keys(template).map(Number);
  return days.filter((d) => template[d]?.some((t) => t.drillSlot)).length;
}

/** Every weekday the template works, ascending, Sunday first. */
export function templateStudyDays(template: WeekTemplate): number[] {
  return Object.keys(template)
    .map(Number)
    .filter((d) => (template[d]?.length ?? 0) > 0)
    .sort((a, b) => a - b);
}

/**
 * Read a stored `days_json` blob into a template.
 *
 * Tolerant on purpose: this is hand-editable data, and one malformed task
 * should cost that task, not the student's whole week. Anything unusable is
 * dropped rather than defaulted to something plausible-looking.
 */
export function parseWeekTemplate(raw: unknown): WeekTemplate {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const out: Record<number, TemplateTask[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const weekday = Number(key);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!Array.isArray(value)) continue;

    const tasks: TemplateTask[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const row = item as { title?: unknown; minutes?: unknown; drill_slot?: unknown };
      if (typeof row.title !== 'string' || row.title.trim() === '') continue;
      tasks.push({
        title: row.title,
        minutes: typeof row.minutes === 'number' ? row.minutes : null,
        ...(row.drill_slot === true ? { drillSlot: true as const } : {}),
      });
    }
    // A weekday whose every task was unusable is a rest day, not an empty one.
    if (tasks.length > 0) out[weekday] = tasks;
  }
  return out;
}

/** The generated types do not know the schedule tables yet. */
const loose = () => supabase as never as { from: (table: string) => any };

/** Postgres "relation does not exist". */
const UNDEPLOYED = '42P01';

interface ScheduleRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  is_default: boolean;
  days_json: unknown;
}

const toTemplate = (row: ScheduleRow): ScheduleTemplate => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  isDefault: row.is_default,
  days: parseWeekTemplate(row.days_json),
});

/** Every schedule Joshua can put a student on. Empty if not deployed yet. */
export async function fetchScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const { data, error } = await loose()
    .from('schedule_templates')
    .select('id, slug, title, description, is_default, days_json')
    .order('is_default', { ascending: false })
    .order('title', { ascending: true });

  if (error) {
    if (error.code === UNDEPLOYED) return [];
    throw error;
  }
  return (data ?? []).map(toTemplate);
}

/**
 * The week a given student is on.
 *
 * Falls back through: the student's own schedule -> the default schedule ->
 * the built-in week. Code and migrations do not land together, so an
 * undeployed table degrades to the built-in week rather than taking down plan
 * generation for everybody.
 */
export async function fetchStudentSchedule(studentId: string): Promise<{
  template: WeekTemplate;
  schedule: ScheduleTemplate | null;
}> {
  const db = loose();

  const { data: assigned, error: assignedError } = await db
    .from('student_schedules')
    .select('schedule_templates(id, slug, title, description, is_default, days_json)')
    .eq('student_id', studentId)
    .maybeSingle();

  if (assignedError && assignedError.code !== UNDEPLOYED) throw assignedError;

  const joined = (assigned as { schedule_templates?: ScheduleRow } | null)?.schedule_templates;
  if (joined) {
    const schedule = toTemplate(joined);
    // A stored schedule with no usable day is a data problem, not a week.
    if (templateStudyDays(schedule.days).length > 0) return { template: schedule.days, schedule };
  }

  if (assignedError?.code === UNDEPLOYED) return { template: STANDARD_WEEK, schedule: null };

  const { data: fallback, error: fallbackError } = await db
    .from('schedule_templates')
    .select('id, slug, title, description, is_default, days_json')
    .eq('is_default', true)
    .maybeSingle();

  if (fallbackError && fallbackError.code !== UNDEPLOYED) throw fallbackError;

  if (fallback) {
    const schedule = toTemplate(fallback as ScheduleRow);
    if (templateStudyDays(schedule.days).length > 0) return { template: schedule.days, schedule };
  }

  return { template: STANDARD_WEEK, schedule: null };
}

/** Put a student on a schedule, or take them off one. */
export async function setStudentSchedule(
  studentId: string,
  scheduleTemplateId: string | null,
): Promise<void> {
  const db = loose();

  if (!scheduleTemplateId) {
    const { error } = await db.from('student_schedules').delete().eq('student_id', studentId);
    if (error && error.code !== UNDEPLOYED) throw error;
    return;
  }

  const { error } = await db.from('student_schedules').upsert(
    {
      student_id: studentId,
      schedule_template_id: scheduleTemplateId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id' },
  );
  if (error) throw error;
}
