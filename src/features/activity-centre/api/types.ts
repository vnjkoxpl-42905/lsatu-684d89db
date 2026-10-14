// Domain types for the Activity Centre. These describe the shape of the jsonb
// columns (instructions, items) and the rows of the three Activity tables.
// They intentionally do not import the generated Supabase Row types for the
// jsonb internals, since Postgres types those as `Json`; the client casts the
// validated shape to these on read.

export type Verdict = "correct" | "partial" | "incorrect";

/**
 * Who decided an attempt's verdict.
 *
 * `fast-path` is a world's deterministic local verdict, settled with no model
 * call. It covers exact authored matches and formal parsers such as the
 * Switchyard. `coach` is the edge function. `fallback` is a
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
/**
 * `abandoned` is a Read, Recall, Colour section she started again from the
 * library without finishing. Its rows are kept and it is never graded; it is
 * not `completed`, because completed with rows is exactly what gets graded.
 */
export type ActivityStatus = "assigned" | "in_progress" | "completed" | "abandoned";
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
  /**
   * Structured grading key (Spot the Relationship). Server-side grading input
   * only; never shown to the student. The explanation stays the student copy.
   */
  answer_key?: {
    relationships: { type: string; indicators: string[]; required_parts?: string[][]; connects: string; why: string }[];
    traps: string[];
    context_benchmark: string | null;
  };
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
 * How a spoken-recall Activity is run.
 *
 * `stimulus` is v1: one stimulus at a time, with cumulative rounds. `section`
 * is the captured drill, where the unit of work is a whole LR section run
 * unbroken against a clock, with no cumulative round and no coach in the loop.
 * Absent means `stimulus`, so every Activity authored before section mode keeps
 * behaving exactly as it did.
 */
/**
 * `section-library` is the door: an Activity whose content is the list of
 * sections a student picks from, rather than a section itself. It carries no
 * `source_section` and no clock, which is why the database exempts it from the
 * completeness check that a real section must satisfy.
 */
export type ActivityMode = "stimulus" | "section" | "section-library";

/**
 * The Read's type, as captured: Loophole, Implication, Contradiction, Rephrase.
 * Stored as the single captured letter rather than a spelled-out name, because
 * the key is ground truth and re-spelling it invites drift.
 */
export type TheReadType = "L" | "I" | "C" | "R";

/**
 * The minutes a section is meant to take, per accommodation. Time is a scored
 * criterion, so the goal cannot be one number: a student with 53% or 70% extra
 * time is not slow when she takes longer, and grading her against the standard
 * goal would score her accommodation as a failure.
 */
export interface TimeGoalMinutes {
  standard: number;
  accommodation_53: number;
  accommodation_70: number;
}

/** One captured LR question that hangs off a stimulus. */
export interface SectionQuestion {
  /** e.g. "PT105.S2.Q1". */
  citation: string;
  qnum: number;
  question_type: string;
  correct_answer: string;
}

/**
 * One stimulus of a section run.
 *
 * `credited_answers` and `cumulative_after` are both empty here, and that is
 * the design rather than missing content: the captured drill has no cumulative
 * round, so there is nothing for a reference retelling to be the reference for.
 * The Read is scored against `the_read`, which is captured ground truth and
 * strictly better than an authored retelling.
 *
 * Two questions can share one stimulus, which is why `questions` is a list and
 * why a 25-question section is 23 items. She recalls the stimulus once.
 */
export interface RecallSectionItem extends ActivityItem {
  /** e.g. "PT105_S2_Q1"; the recording and transcript are named from it. */
  slug: string;
  chunks: RecallChunk[];
  cumulative_after: number[];
  /** The captured Read for this stimulus, said at the end of it. */
  the_read: string;
  the_read_type: TheReadType;
  /** Path to Joshua's recording of the process done out loud. */
  model_recording: string;
  model_transcript: string;
  questions: SectionQuestion[];
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

/**
 * The long-form breakdown on an Activity's front door: what the drill actually
 * trains, why it is built the way it is, and what doing it properly looks like.
 *
 * The numbered `rules` are the procedure and answer "what do I press". They do
 * not answer "why am I doing this", and for a drill whose whole design is
 * counter-intuitive -- the text is taken away on purpose, a summary is a
 * failure, going slowly is correct -- a student who does not have the why will
 * quietly do the easier thing instead.
 */
/**
 * One beat of a worked demonstration: a line of the stimulus, then what the
 * student would say out loud about it.
 */
export interface BriefingBeat {
  /** "Read", "Tell it back", "Colour it", "The Recall". */
  kind: string;
  text: string;
}

export interface ActivityBriefing {
  /** The line under the section label, before the sections. */
  lede?: string;
  /**
   * A section is a heading plus prose, and optionally either a numbered
   * procedure or a worked demonstration.
   *
   * Both were added for the section drill, whose briefing is the first thing a
   * student ever reads about the method and therefore has to teach it rather
   * than remind her of it. Prose alone made the procedure something she had to
   * extract from a paragraph, and the one thing that makes an unfamiliar
   * process click is seeing somebody do it once. Both are optional, so every
   * Activity authored before this renders exactly as it did.
   */
  sections: {
    heading: string;
    body: string[];
    /**
     * A numbered procedure. Rendered as an ordered list, after the prose.
     *
     * `short` is the one-line definition of the step, for the surfaces that
     * cannot carry `body`: the walkthrough card mid-run, and anywhere else the
     * method has to be restated in a sentence. Authored here so a step can only
     * be redefined in one place. See `recall/method.ts`.
     */
    steps?: { label: string; body: string; short?: string }[];
    /** A worked run, beat by beat, of one real stimulus. */
    demo?: { caption?: string; beats: BriefingBeat[] };
  }[];
  /** The last beat before the Start action. */
  closer?: string;
}

/** The intro / rules block stored in `instructions`. */
export interface ActivityInstructions {
  tagline?: string;
  rules?: string[];
  /** Absent on the Activities whose procedure is self-explanatory. */
  briefing?: ActivityBriefing;
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
  /** Absent (null) on every Activity authored before section mode. */
  mode: ActivityMode | null;
  time_goal_minutes: TimeGoalMinutes | null;
  /** e.g. "PT105.S2". Null unless this Activity is one captured section. */
  source_section: string | null;
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
  /** Absent until source revocation is installed; independent of progress. */
  revoked_at?: string | null;
  revoked_by?: string | null;
  /** Section mode fields, so a list can tell an Attempt from other work. */
  mode?: ActivityMode | null;
  source_section?: string | null;
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
  revoked_at?: string | null;
  revoked_by?: string | null;
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
  /**
   * Snapshotted from the Activity at assign time, like `items`, and absent
   * (null) on every assignment made before section mode. The clock is what her
   * time is scored against, so reading it live from `activities` would let a
   * later edit rescore a run she has already finished.
   */
  mode?: ActivityMode | null;
  time_goal_minutes?: TimeGoalMinutes | null;
  source_section?: string | null;
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

/**
 * One stimulus on the Report Card.
 *
 * Mirrors what `grade-rrc-section` writes. `percent` is Coverage over that
 * stimulus's own Details; `band` is what the student is actually shown, because
 * a correct run is not 100% and a raw percentage against an implied maximum
 * misreports it (ADR 0018).
 */
export interface SectionStimulusGrade {
  slug: string;
  /** Authored position in the section. Absent on grades written before ADR 0021's missing-row amendment. */
  item_order?: number;
  carried: number;
  total: number;
  percent: number;
  band: "at-the-standard" | "nearly-there" | "thin" | "lost-it";
  /** The Details she did not carry, as authored. */
  missed: string[];
  /** Details from another stimulus the judge wrongly credited. Any at all makes this stimulus suspect. */
  decoysCarried: string[];
  /** Details the judge returned no verdict for. Counted as not carried. */
  unjudged: string[];
  reciting: boolean;
  listing: boolean;
  coloured: boolean;
  colourSpecific: boolean;
  dead_air_seconds: number;
  /** Did she give a Read at all, and was it the move the key names. */
  readGiven?: boolean;
  readMatches?: boolean;
  readReason?: string;
  /** L, I, C or R. Authored on the stimulus, not inferred from her run. */
  the_read_type?: string;
  /** The passage as authored, and the Read the key names. Absent on grades written before 2026-09-08. */
  stimulus_text?: string;
  the_read?: string;
  /** Words cut as read-aloud before judging, and which chunks she read. */
  read_aloud_words?: number;
  chunks_read_aloud?: number[];
  /** What the machine heard for this stimulus, after the reads were cut. */
  spoken?: string;
  /** Where this stimulus sits in the recording, for a Clip. */
  window_ms?: { start: number; end: number };
  recall_window_ms?: { start: number; end: number };
  /**
   * Her run cut into the lines she was rephrasing, in authored order.
   *
   * Feedback only -- `percent` above is the same number it always was, scored
   * over the whole stimulus. Absent on grades written before line attribution
   * existed, so every reader has to treat it as optional.
   */
  lines?: SectionLineGrade[];
  /** The whole-stimulus recall she gave once the text disappeared. */
  recall?: { verdict: SectionLineVerdict; note: string };
  /** At most three plain-words phrases naming what she dropped that mattered. */
  bigMisses?: string[];
  /**
   * What to do differently next time, in one or two sentences to her. Empty
   * when the judge found nothing to fix; absent on grades written before it
   * was asked for.
   */
  nextTime?: string;
  /** Why the judge returned nothing. Absent on every stimulus that was judged. */
  ungraded?: string;
}

export type SectionLineVerdict = "strong" | "partial" | "thin" | "skipped";

export interface SectionLineGrade {
  /** 1-based line number within the stimulus. */
  n: number;
  text: string;
  /** What she said for that line. Empty means she said nothing there. */
  spoken: string;
  startMs?: number;
  endMs?: number;
  verdict: SectionLineVerdict;
  note: string;
  carried: string[];
  dropped: string[];
}


export interface SectionGradeSummary {
  accommodation: string;
  /** Where the recording lives, so a Clip is a seek rather than a second query. */
  audio_bucket?: string | null;
  audio_path?: string | null;
  goal_minutes: number;
  total_seconds: number;
  /**
   * Seconds she was paused, which `total_seconds` does NOT include.
   *
   * A section can be stepped away from, and when it is, the clock stops with
   * the recorder. Absent on every run graded before pausing existed, which is
   * why it is optional rather than zero.
   */
  paused_seconds?: number;
  pause_count?: number;
  /** Inside the clock, ignoring the method's condition on it. */
  within_time?: boolean;
  /** Inside the clock AND with every stimulus coloured and given a Read. */
  within_goal: boolean;
  mean_coverage: number;
  stimuli_graded: number;
  /** Number of stimuli in the assignment snapshot, including any whose response row never arrived. */
  stimuli_in_section?: number;
  reciting_count: number;
  listing_count: number;
  uncoloured_count: number;
  read_given_count?: number;
  read_matched_count?: number;
  no_read_count?: number;
  read_aloud_words?: number;
  chunks_read_aloud?: number;
  ungraded_count?: number;
  complete?: boolean;
  worst_dead_air_seconds: number;
  dead_air_threshold_seconds: number;
  decoy_failures: number;
  clock: Record<string, number>;
}

/**
 * Just enough of a Report Card to list it.
 *
 * The Attempt list on the section library needs a date and one number per
 * sitting; the grade itself carries a full transcript and a judgement per
 * stimulus, and pulling every one of those to draw a line of grey text would
 * make opening the library the heaviest read in the product.
 */
export interface SectionGradeStub {
  assignment_id: string;
  attempt_no: number;
  source_section: string;
  section: SectionGradeSummary;
  graded_at: string;
}

export interface SectionGrade {
  assignment_id: string;
  /** Which sitting this is. Each Attempt keeps its own Report Card. */
  attempt_no: number;
  student_id: string;
  source_section: string;
  transcript_engine: string;
  transcript_text: string | null;
  grader_version: number;
  stimuli: SectionStimulusGrade[];
  section: SectionGradeSummary;
  graded_at: string;
}
