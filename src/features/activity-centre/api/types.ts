// Domain types for the Activity Centre. These describe the shape of the jsonb
// columns (instructions, items) and the rows of the three Activity tables.
// They intentionally do not import the generated Supabase Row types for the
// jsonb internals, since Postgres types those as `Json`; the client casts the
// validated shape to these on read.

export type Verdict = "correct" | "partial" | "incorrect";

/**
 * Who decided an attempt's verdict.
 *
 * `fast-path` is the world's local match against an authored credited answer,
 * settled with no model call. `coach` is the edge function. `fallback` is a
 * Coach outage, where the credited answer is revealed and no verdict is earned.
 * Recorded so the share of attempts that never reach the model is a measured
 * number rather than a claim.
 */
export type JudgeSource = "fast-path" | "coach" | "fallback";

/**
 * What the answer column is showing about the last submission.
 *
 * "unchecked" is not a verdict and must never be scored as one. It is the state
 * an item is left in when the Coach could not be reached: the student answered,
 * nobody judged it, and stamping a red "Not yet" over it was a claim the app
 * had no basis for.
 */
export type FeedbackState = Verdict | "unchecked";
export type ActivityStatus = "assigned" | "in_progress" | "completed";
/**
 * How a student answers an Activity's items.
 *
 * `spoken-recall` is Read, Recall, Colour: she speaks rather than types, and
 * the unit she answers is a chunk of an item rather than the item itself. It is
 * listed here because the column is a plain string and every other format is,
 * not because the runner branches on it; the world does that.
 */
export type ItemFormat = "free-text" | "mcq" | "variation" | "spoken-recall";

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
 * One conceptual unit of a chunk, and the only thing completeness is measured
 * against.
 *
 * Written in plain analytic language, never in the stimulus's own wording. A
 * recall is REQUIRED to be in the student's own words, so a detail phrased as a
 * quotation could not be matched without failing the own-words criterion at the
 * same moment.
 */
export interface ChunkDetail {
  /** Authored position in the list, 1-based. */
  n: number;
  text: string;
}

/**
 * One step of a spoken-recall item: what the student reads, and what has to
 * survive when she says it back with the text hidden.
 *
 * Chunking rule, which is settled and not a per-item judgement call: default to
 * one sentence, allow smaller down to a comma or a third of a sentence, and
 * never combine sentences, because the first sentence's details are what get
 * lost when you do. Round down, not up. The one exception is a chunk that is
 * not yet a complete thought, which may take slightly more.
 */
export interface RecallChunk {
  n: number;
  /** Verbatim from the item's prompt. The chunks must reassemble it exactly. */
  text: string;
  details: ChunkDetail[];
}

/**
 * A Read, Recall, Colour item: one whole stimulus, cut into chunks.
 *
 * `prompt` is the entire stimulus and is never shown whole to the student; she
 * only ever sees one chunk at a time, and only until she taps past it. It is
 * stored whole because the chunks are checked against it and because the final
 * cumulative round is scored against everything in it.
 *
 * `credited_answers` holds one entry: a model retelling of the whole stimulus
 * in plain words with every detail intact. It is the reference for that final
 * cumulative round, and the clearest single statement of what "close enough"
 * means here. Per-chunk there is no credited answer, only `details`.
 */
export interface RecallItem extends ActivityItem {
  chunks: RecallChunk[];
  /**
   * The chunk numbers after which the student says back everything so far with
   * nothing on screen. The load grows every round, which is the point of the
   * drill and the part software can enforce that paper cannot.
   */
  cumulative_after: number[];
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
  /**
   * The label and placeholder above the student's answer box. Each Activity
   * asks for a different thing — a negation, a conditional rephrase, a plain
   * restatement — so this is authored per Activity. Absent on legacy
   * Activities, which fall back to neutral copy rather than to negation.
   */
  answer_label?: string;
  answer_placeholder?: string;
  /**
   * What to call the credited answers after the first. "Also accepted" is true
   * for an Activity whose extra answers are alternative phrasings and false for
   * one whose second answer is a different thing the task asked for -- the
   * contrapositive, in Conditional Rephrase. Absent leaves today's wording.
   */
  credited_secondary_label?: string;
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

/**
 * A list row: everything a card draws, and nothing else.
 *
 * The list used to select `*`, which carries each assignment's whole `items`
 * snapshot -- roughly 30KB for Conditional Rephrase alone -- so that a card
 * could render a title, a status, a score and a count. The count is the only
 * thing it ever needed from that payload, and the database can do the counting.
 *
 * The list and the runner deliberately stop sharing a shape here. They never
 * needed the same data, and the shared type is what made the waste invisible.
 */
export interface ActivityAssignmentSummary {
  id: string;
  activity_id: string | null;
  student_id: string;
  title: string;
  subtitle: string | null;
  status: ActivityStatus;
  score: number | null;
  score_numerator?: number | null;
  score_judged?: number | null;
  score_total?: number | null;
  scoring_version?: number | null;
  /**
   * Kept, unlike `items`. The Classroom hero draws its authored tagline from
   * here, and the whole object is a few hundred bytes against the snapshot's
   * thirty thousand.
   */
  instructions: ActivityInstructions;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  /** How many items the run holds. Counted in the database, not shipped. */
  item_count: number;
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
  /**
   * The score's parts, kept so the screen can name the denominator it used.
   * `score` alone cannot distinguish "88% of 59 checked" from "88% of 62", and
   * the Activity card renders a bare number.
   */
  score_numerator?: number | null;
  score_judged?: number | null;
  score_total?: number | null;
  /**
   * 1 = scored over every item, so an unjudged item counted as wrong. 2 = scored
   * over the judged items only. Old rows keep 1 and their original meaning;
   * nothing is backfilled into a version it was not computed under.
   */
  scoring_version?: number | null;
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
  /**
   * For drills that send a numbered checklist, which of those ideas the
   * response carried. Undefined means nobody judged coverage, which is not the
   * same as none surviving, and surfaces as an unticked checklist.
   */
  covered?: number[];
}

/** Max Coach attempts before the credited answer reveals. */
export const MAX_ATTEMPTS = 2;
