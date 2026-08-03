// Domain types for the Activity Centre. These describe the shape of the jsonb
// columns (instructions, items) and the rows of the three Activity tables.
// They intentionally do not import the generated Supabase Row types for the
// jsonb internals, since Postgres types those as `Json`; the client casts the
// validated shape to these on read.

export type Verdict = "correct" | "partial" | "incorrect";
export type ActivityStatus = "assigned" | "in_progress" | "completed";
export type ItemFormat = "free-text" | "mcq" | "variation";

/** One authored prompt within an Activity. */
export interface ActivityItem {
  order: number;
  /** The statement the student must respond to. */
  prompt: string;
  /** Author-supplied accepted answer(s); ground truth for the Coach. */
  credited_answers: string[];
  /** Why the credited answer is correct; revealed after the attempt cap. */
  explanation: string;
  /** Optional grouping label (e.g. "Universal Statement"). */
  category?: string;
}

/**
 * Per-Activity judging brief for the Coach. Each Activity trains a different
 * skill and therefore needs a different rubric: what counts as `correct` in
 * Conditional Rephrase is not what counts in Dumb it Down. Without this the
 * edge function falls back to the Negation Station rubric it shipped with,
 * which would misjudge every other Activity.
 */
export interface ActivityCoach {
  /** One line naming the drill and the skill, e.g. "a conditional-translation drill". */
  drill: string;
  /** The judging rules, most important first. Sent verbatim to the model. */
  rubric: string[];
  /** What separates `partial` from `incorrect` in THIS Activity. */
  partial_rule: string;
}

/** The intro / rules block stored in `instructions`. */
export interface ActivityInstructions {
  tagline?: string;
  rules?: string[];
  worked_example?: {
    statement: string;
    credited_answers: string[];
    explanation: string;
  };
  task?: string;
  /** Absent on legacy Activities; the Coach then uses its negation default. */
  coach?: ActivityCoach;
}

/** A row of `activities` (admin-owned definition library). */
export interface Activity {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  item_format: ItemFormat;
  items: ActivityItem[];
  created_by: string;
  class_id: string;
  created_at: string;
  updated_at: string;
}

/** A row of `activity_assignments` (per-student snapshot). */
export interface ActivityAssignment {
  id: string;
  activity_id: string | null;
  student_id: string;
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  item_format: ItemFormat;
  items: ActivityItem[];
  status: ActivityStatus;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_by: string;
  class_id: string;
  created_at: string;
}

/** A row of `activity_item_responses` (append-only attempt log). */
export interface ActivityItemResponse {
  id: string;
  assignment_id: string;
  student_id: string;
  item_order: number;
  response_text: string;
  verdict: Verdict | null;
  attempt_no: number;
  created_at: string;
}

/** Structured result returned by the activity-coach edge function. */
export interface CoachVerdict {
  verdict: Verdict;
  feedback: string;
}

/** Max Coach attempts before the credited answer reveals. */
export const MAX_ATTEMPTS = 2;
