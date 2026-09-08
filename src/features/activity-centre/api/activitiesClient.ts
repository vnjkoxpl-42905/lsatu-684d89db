import { supabase } from "@/integrations/supabase/client";
import { librarySortIndex } from "../content";
import type {
  Activity,
  ActivityAssignment,
  ActivityAssignmentSummary,
  ActivityInstructions,
  ActivityItem,
  ActivityItemResponse,
  ActivityStatus,
  JudgeSource,
  Verdict,
} from "./types";
import type { RunScore } from "../progress";
import type { SectionGrade, SectionGradeStub } from "./types";
import type { Accommodation } from "../recall/section";

// Thin data layer for the Activity Centre. The jsonb columns (instructions,
// items) come back from PostgREST as `Json`; we cast them to the domain shapes
// declared in ./types on read. Errors are always thrown, never swallowed.

function hydrateAssignment(row: Record<string, unknown>): ActivityAssignment {
  return {
    ...(row as unknown as ActivityAssignment),
    instructions: (row.instructions ?? {}) as ActivityInstructions,
    items: (row.items ?? []) as ActivityItem[],
  };
}

function hydrateActivity(row: Record<string, unknown>): Activity {
  return {
    ...(row as unknown as Activity),
    instructions: (row.instructions ?? {}) as ActivityInstructions,
    items: (row.items ?? []) as ActivityItem[],
  };
}

/**
 * The columns a card actually draws. `items` is deliberately absent: it is the
 * whole per-student snapshot, ~30KB for Conditional Rephrase, shipped once per
 * row so a card could print a number the database can count.
 */
const SUMMARY_COLUMNS =
  "id,activity_id,student_id,title,subtitle,status,score,score_numerator,score_judged,score_total,scoring_version,instructions,created_at,started_at,completed_at,mode,source_section";

/** Student: list my activity assignments. RLS scopes to student_id = auth.uid(). */
export async function listStudentAssignments(
  studentId: string,
): Promise<ActivityAssignmentSummary[]> {
  const { data, error } = await supabase
    .from("activity_assignments")
    .select(`${SUMMARY_COLUMNS},item_count`)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (!error) return ((data ?? []) as unknown as Record<string, unknown>[]).map(toSummary);

  // `item_count` arrives with its own migration. Until it is applied the
  // narrowed select is rejected for naming a column that does not exist, and a
  // list that renders is worth more than the bytes this saves.
  if (!isUnknownColumn(error)) throw error;
  const fallback = await supabase
    .from("activity_assignments")
    .select(`${SUMMARY_COLUMNS},items`)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (fallback.error) throw fallback.error;
  return ((fallback.data ?? []) as unknown as Record<string, unknown>[]).map(toSummary);
}

/**
 * A list row. `item_count` is a generated column, so the count arrives without
 * the questions; the fallback path counts a carried array instead, for a
 * database that has not been given the column yet.
 */
function toSummary(row: Record<string, unknown>): ActivityAssignmentSummary {
  const summary = {
    ...(row as unknown as ActivityAssignmentSummary),
    instructions: (row.instructions ?? {}) as ActivityInstructions,
  };
  if (typeof summary.item_count === "number") return summary;
  const items = row.items;
  return { ...summary, item_count: Array.isArray(items) ? items.length : 0 };
}

/** Student: fetch one assignment I own. */
export async function getStudentAssignment(
  assignmentId: string,
  studentId: string,
): Promise<ActivityAssignment | null> {
  const { data, error } = await supabase
    .from("activity_assignments")
    .select("*")
    .eq("id", assignmentId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateAssignment(data) : null;
}

/**
 * Admin: read any assignment by id alone, whoever it was issued to.
 *
 * `getStudentAssignment` filters on `student_id`, which is right for a student
 * and wrong for Joshua: opening a link he just handed out told him the activity
 * belonged to a different account, when the whole reason he has the link is to
 * look at it. RLS is the gate here, not this filter -- "Admins read all
 * activity assignments" already exists, and a non-admin calling this gets the
 * same `null` the student-scoped read would have given them.
 *
 * The caller is responsible for running what comes back read-only when it is
 * somebody else's row. Nothing here writes.
 */
export async function getAssignmentById(assignmentId: string): Promise<ActivityAssignment | null> {
  const { data, error } = await supabase
    .from("activity_assignments")
    .select("*")
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateAssignment(data) : null;
}

/**
 * Does this assignment exist, but belong to somebody else?
 *
 * `getStudentAssignment` filters on `student_id` as well as `id`, so an
 * assignment issued to a DIFFERENT account comes back as `null` and is
 * indistinguishable from an id that was never real. The runner rendered both as
 * "Activity not found.", which sent a reader hunting for a broken route or an
 * RLS bug when the actual answer was "you are signed in as the wrong account".
 * That happens constantly to anyone holding both an admin and a student login.
 *
 * This probes by id alone and lets RLS answer. An admin can read every
 * assignment, so a `true` here means the row is real and owned by someone else.
 * A student reads only their own, so they get `false` and keep the plain
 * not-found wording, which for them is the truth. It never returns the row or
 * anything in it, only whether one exists.
 */
export async function assignmentBelongsToAnotherAccount(assignmentId: string): Promise<boolean> {
  // Every failure resolves to false rather than rejecting. This only ever
  // upgrades an error message, so a probe that cannot answer must leave the
  // plain wording alone instead of taking the screen down with it, or telling
  // a student to go hunting for an account that does not exist.
  try {
    const { data, error } = await supabase
      .from("activity_assignments")
      .select("id")
      .eq("id", assignmentId)
      .maybeSingle();
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/** Student: mark an assignment in_progress on first open (assigned -> in_progress only). */
export async function markAssignmentStarted(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("activity_assignments")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("status", "assigned");
  if (error) throw error;
}

/**
 * PostgREST's two ways of saying "you named a column I do not have": the schema
 * cache miss on insert, and Postgres's own undefined_column. Either means the
 * telemetry migration has not been applied to this database yet.
 */
function isUnknownColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST204" || error.code === "42703";
}

/**
 * Student: write a verdict-bearing attempt to the append-only log.
 *
 * The telemetry fields ride along on the same row: which judge decided the
 * verdict, what the world's structural classifier would have said, and how long
 * it took. They are measurement, never score, and they are strictly less
 * valuable than the attempt itself — so if the database has not been given
 * their columns yet, the attempt is written without them rather than lost.
 */
export async function recordItemResponse(input: {
  assignmentId: string;
  studentId: string;
  itemOrder: number;
  responseText: string;
  verdict: Verdict | null;
  attemptNo: number;
  judgeSource?: JudgeSource;
  shadowFault?: string | null;
  latencyMs?: number;
  parserVersion?: string;
}): Promise<void> {
  const attempt = {
    assignment_id: input.assignmentId,
    student_id: input.studentId,
    item_order: input.itemOrder,
    response_text: input.responseText,
    verdict: input.verdict,
    attempt_no: input.attemptNo,
  };
  const telemetry = {
    judge_source: input.judgeSource ?? null,
    shadow_fault: input.shadowFault ?? null,
    latency_ms: input.latencyMs ?? null,
    // Only meaningful alongside a shadow reading, so it is null when there is none.
    parser_version: input.shadowFault === undefined ? null : input.parserVersion ?? null,
  };

  const { error } = await supabase
    .from("activity_item_responses")
    .insert({ ...attempt, ...telemetry });
  if (!error) return;
  if (isDuplicateAttempt(error)) return; // already on record; a retry is not a second attempt
  if (!isUnknownColumn(error)) throw error;

  const { error: retryError } = await supabase.from("activity_item_responses").insert(attempt);
  if (retryError && !isDuplicateAttempt(retryError)) throw retryError;
}

/**
 * The row is already there.
 *
 * The log is append-only with no natural key, so a retry -- from the outbox, or
 * from a student's second tap on a flaky connection -- used to write a SECOND
 * row for the same attempt. The replay counts rows, so a duplicate reads as an
 * extra attempt and can push an item past the cap it never reached. A unique
 * index makes the retry safe, and hitting it is success, not failure: the thing
 * we were trying to record is recorded.
 */
function isDuplicateAttempt(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/**
 * Student: read my full append-only attempt log for one assignment, ordered so
 * reconstruction can walk items in order and attempts oldest-first. Drives
 * resume-where-I-left-off. RLS scopes to student_id = auth.uid().
 */
export async function listItemResponses(
  assignmentId: string,
  studentId: string,
): Promise<ActivityItemResponse[]> {
  const { data, error } = await supabase
    .from("activity_item_responses")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_id", studentId)
    .order("item_order", { ascending: true })
    .order("attempt_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActivityItemResponse[];
}

/** Student: complete an assignment, writing the final score. */
export async function completeAssignment(assignmentId: string, score: RunScore): Promise<void> {
  const completion = {
    status: "completed" satisfies ActivityStatus,
    // Null when nothing was judged. The card then shows "not scored" rather
    // than a 0% nobody earned.
    score: score.percent,
    completed_at: new Date().toISOString(),
  };
  const breakdown = {
    score_numerator: score.numerator,
    score_judged: score.judged,
    score_total: score.total,
    scoring_version: 2,
  };

  const { error } = await supabase
    .from("activity_assignments")
    .update({ ...completion, ...breakdown })
    .eq("id", assignmentId);
  if (!error) return;
  if (!isUnknownColumn(error)) throw error;

  // The breakdown columns arrive with their own migration. Closing the run is
  // what the student is waiting on; the audit trail for the denominator is not
  // worth failing the completion over.
  const { error: retryError } = await supabase
    .from("activity_assignments")
    .update(completion)
    .eq("id", assignmentId);
  if (retryError) throw retryError;
}

/**
 * Student: close a Read, Recall, Colour section run.
 *
 * Deliberately not `completeAssignment`. That one writes `score`,
 * `scoring_version` and the judged/total breakdown, and a section knows none of
 * them: Coverage is produced afterwards by the grader and lives in its own
 * table (ADR 0019). Passing a null score through the scoring columns would not
 * be silence, it would be a claim -- "the v2 scorer ran over N items and
 * reached no verdict" -- when the truth is that nothing has graded it yet.
 *
 * So this writes the two columns that mean "she finished" and touches nothing
 * that means "and here is how she did". Until the grader exists a finished
 * section is a completed assignment with no grade, which is exactly what it is.
 *
 * `status` is the Classroom's view of whether the work was done and nothing may
 * derive trust from it: she holds UPDATE on her own row, so it is hers to set
 * either way (ADR 0019). It is written here rather than being left behind.
 */
export async function completeSectionRun(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("activity_assignments")
    .update({
      status: "completed" satisfies ActivityStatus,
      completed_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);
  if (error) throw error;
}

/**
 * Which time accommodation this student runs under.
 *
 * Scales the section goal: 25 minutes standard, 38 at a 53-minute
 * accommodation, 50 at a 70-minute one (ADR 0014). Read here so the clock on
 * screen shows her own goal; the GRADE reads the same column server-side
 * rather than trusting what this sends, because the accommodation picks the
 * goal and a goal she can set is a passing time she can set.
 *
 * `standard` on any failure. Scoring an accommodated student against the
 * standard goal is the known harm, but a failed read is not evidence that she
 * has an accommodation either, and the grader is the one that decides.
 */
export async function getAccommodation(studentId: string): Promise<Accommodation> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("lsat_accommodation")
      .eq("class_id", studentId)
      .maybeSingle();
    if (error) throw error;
    const value = (data as { lsat_accommodation?: string } | null)?.lsat_accommodation;
    return value === "accommodation_53" || value === "accommodation_70" ? value : "standard";
  } catch (err) {
    // The column arrives with its own migration, so an older database answers
    // with an unknown-column error rather than a value. Standard is the safe
    // read and the grader corrects it.
    console.error("[rrc] could not read the accommodation", err);
    return "standard";
  }
}

/**
 * Ask the server to grade a finished section.
 *
 * Fire and forget, deliberately. The grade is produced by an edge function that
 * transcribes the recording and judges every stimulus, which takes far longer
 * than the student should be made to wait on a promise, and a closed tab must
 * never cost a Report Card. This call is the fast path; the sweeper is the
 * guarantee. A failure here is logged and swallowed for the same reason.
 */
export async function requestSectionGrading(assignmentId: string): Promise<void> {
  try {
    await supabase.functions.invoke("grade-rrc-section", { body: { assignmentId } });
  } catch (err) {
    console.error("[rrc] could not ask for grading", err);
  }
}

/**
 * Student: read my Report Card for a finished section.
 *
 * Null means ungraded, and ungraded is a real state rather than an error: the
 * grader runs after she stops, so between finishing and the row appearing there
 * is a legitimate window where the answer is "not yet". The absence of a row IS
 * the pending signal -- there is no status column to trust, and none that she
 * could set herself (ADR 0019).
 */
export async function getSectionGrade(assignmentId: string): Promise<SectionGrade | null> {
  const rows = await readSectionGrades(assignmentId);
  return rows[0] ?? null;
}

/**
 * Student: every Report Card this assignment has produced, newest Attempt
 * first.
 *
 * There can be more than one. A section is judged whole and each sitting keeps
 * its own grade, "because the point of running a section twice is seeing what
 * changed" -- so the read that answers "how did I do" is the first row, and the
 * read that answers "am I getting better at this one" is the list.
 */
export async function listSectionGrades(assignmentId: string): Promise<SectionGrade[]> {
  return readSectionGrades(assignmentId);
}

/**
 * Student: the Coverage of every section she has ever been graded on.
 *
 * Deliberately not the whole grade. This feeds the Attempt list on the section
 * library, which needs a number and a date per Attempt and would otherwise pull
 * every transcript she has ever produced across every section to draw a line of
 * small grey text. RLS scopes it to her own rows.
 */
export async function listMySectionGrades(): Promise<SectionGradeStub[]> {
  const table = supabase.from("activity_section_grades" as never) as unknown as {
    select: (columns: string) => {
      order: (
        column: string,
        opts: { ascending: boolean },
      ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
    };
  };
  const { data, error } = await table
    .select("assignment_id, attempt_no, source_section, section, graded_at")
    .order("graded_at", { ascending: false });
  if (error) {
    if (isUnknownColumn(error) || error.code === "42P01") return [];
    throw error;
  }
  return (data as SectionGradeStub[] | null) ?? [];
}

/**
 * The one read both of the above are made of.
 *
 * Ordered by Attempt rather than by `graded_at`, because a re-grade of Attempt 1
 * -- which the sweeper does, and `force` does -- gives it a newer timestamp than
 * Attempt 2 and would otherwise make the older sitting look like the latest.
 */
async function readSectionGrades(assignmentId: string): Promise<SectionGrade[]> {
  /*
   * `activity_section_grades` arrives with its own migration, and `types.ts` is
   * generated from the DEPLOYED schema, so the generated client does not know
   * the table until types are pulled against a database that has it. Same
   * situation, and the same remedy, as the `rrc` column in `RecallRunner`.
   *
   * Narrowed to the calls actually used rather than cast to `any`, so a typo in
   * a column name is still a type error. Delete the shim once the types are
   * regenerated.
   */
  const table = supabase.from("activity_section_grades" as never) as unknown as {
    select: (columns: string) => {
      eq: (
        column: "assignment_id",
        value: string,
      ) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
      };
    };
  };

  const { data, error } = await table
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("attempt_no", { ascending: false });
  // The table arrives with its own migration. A Report Card that cannot load is
  // not worth taking the finished-run screen down for.
  if (error) {
    if (isUnknownColumn(error) || error.code === "42P01") return [];
    throw error;
  }
  return (data as SectionGrade[] | null) ?? [];
}

/**
 * A temporary link to a section's recording.
 *
 * The bucket is private and the policy lets exactly two people near a file, so
 * a Clip is a signed URL rather than a public one. Short-lived on purpose: the
 * link is for the page that is open, not something to keep.
 *
 * Null rather than throwing. A Report Card whose Clips do not load is still the
 * Report Card, and this is the one part of it that depends on a file having
 * survived an upload.
 */
export async function signSectionRecording(
  bucket: string,
  path: string,
  seconds = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds);
  if (error) {
    console.error("[rrc] could not sign the recording", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Student: the drill done properly, for a section she has already been graded
 * on.
 *
 * `model_runs` holds 714 recordings across 109 sections, one per stimulus, and
 * until now every one of them was admin-only. RLS is what makes this safe to
 * ask for at all: the policy returns rows only for a section she has a Report
 * Card for, so the recording becomes reachable at the moment it stops being
 * able to help her and starts being able to teach her.
 *
 * Keyed by stimulus slug, because that is what the grade carries. An empty map
 * is the ordinary answer for a section nobody has finished, and the Report Card
 * simply does not offer the button.
 */
export type ModelRun = {
  /** The run as a readable document. Present for every stimulus in a built section. */
  walkthrough: string | null;
  /** The recording, when there is one. Nine of the built stimuli were never recorded. */
  audio: { bucket: string; path: string } | null;
};

/**
 * The model runs for a section, keyed by stimulus slug.
 *
 * Written-first. This used to return `{bucket, path}` and drop any row without
 * both, which encoded "a model run is a recording" one layer above the schema
 * that said the same thing. It meant the nine authored references were silently
 * invisible, and that a student on a slow connection got nothing rather than the
 * text of the same run.
 *
 * A row survives here if it can offer her either one.
 */
export async function listModelRuns(
  sourceSection: string,
): Promise<Record<string, ModelRun>> {
  const table = supabase.from("model_runs" as never) as unknown as {
    select: (columns: string) => {
      eq: (
        column: "source_section",
        value: string,
      ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
    };
  };
  const { data, error } = await table
    .select("slug, audio_bucket, audio_path, walkthrough_md")
    .eq("source_section", sourceSection);
  if (error) {
    // A table that is not there yet, or a policy that says no. Neither is worth
    // failing a Report Card over. `walkthrough_md` is covered by the same
    // unknown-column branch, so a deploy that runs ahead of the migration
    // degrades to no model runs rather than to a broken card.
    if (isUnknownColumn(error) || error.code === "42P01") return {};
    console.error("[rrc] could not load the model runs", error);
    return {};
  }
  const rows =
    (data as
      | {
          slug: string;
          audio_bucket: string | null;
          audio_path: string | null;
          walkthrough_md: string | null;
        }[]
      | null) ?? [];
  return Object.fromEntries(
    rows
      .map((r) => {
        const audio =
          r.audio_bucket && r.audio_path ? { bucket: r.audio_bucket, path: r.audio_path } : null;
        const walkthrough = r.walkthrough_md?.trim() ? r.walkthrough_md : null;
        return [r.slug, { walkthrough, audio }] as const;
      })
      .filter(([, run]) => run.walkthrough || run.audio),
  );
}

/**
 * One run as this read returns it.
 *
 * `SectionGradeStub` is the light shape, and this read is deliberately heavier:
 * it carries `stimuli` so a caller can say something per stimulus rather than
 * per run, and `created_at` because `graded_at` is not stable.
 *
 * A regrade rewrites `graded_at`. Order or date a list by it and a regraded run
 * from a fortnight ago climbs above this morning's, becomes "your last run", and
 * takes the trend with it. `created_at` is written once and never touched.
 */
export type RecentSectionRun = SectionGradeStub &
  Partial<Pick<SectionGrade, "stimuli">> & { created_at?: string };

/**
 * What the read returns, with failure distinguishable from emptiness.
 *
 * These are different facts and a surface has to be able to tell them apart. A
 * student who has never run this section should be told that; a student whose
 * history we could not load must not be told the same thing, because it reads
 * as her work having been thrown away.
 */
export interface RecentSectionRunsResult {
  runs: RecentSectionRun[];
  /** The read failed. `runs` is empty because we could not look, not because there is nothing. */
  failed: boolean;
}

/**
 * Student: her recent runs, with the per-stimulus misses attached.
 *
 * The heavier read, and deliberately bounded. `listMySectionGrades` is the
 * light one and covers every run she has ever done; this adds `stimuli`, which
 * carries a transcript per stimulus, and is only needed to answer "what do I
 * keep dropping". Ten runs is a fortnight at the drill's own rhythm and is
 * plenty of evidence for a share.
 *
 * Both filters are applied to the QUERY, before the order and the limit, and
 * that placement is the whole point of them:
 *
 * - `sourceSection`, because the bound is global otherwise. Ask for ten runs and
 *   filter to PT105.S2 afterwards and a student who has been working four
 *   sections gets an empty history for this one while her real runs sit just
 *   outside the window.
 * - `studentId`, because the admin SELECT policy on this table returns every
 *   student's rows. No flag on the calling component can undo that; only the
 *   query can. Passing the assignment's own `student_id` makes a cross-student
 *   read impossible regardless of who is looking.
 */
export async function readMyRecentSectionGrades(
  limit = 10,
  opts: { sourceSection?: string; studentId?: string } = {},
): Promise<RecentSectionRunsResult> {
  type Filterable = {
    eq: (column: string, value: string) => Filterable;
    order: (column: string, opts: { ascending: boolean }) => Filterable;
    limit: (n: number) => Promise<{
      data: unknown;
      error: { code?: string; message?: string } | null;
    }>;
  };
  const table = supabase.from("activity_section_grades" as never) as unknown as {
    select: (columns: string) => Filterable;
  };

  let query = table
    // Everything but `transcript_text`, which is the whole run's words again and
    // is never read outside the grader.
    .select(
      "assignment_id, attempt_no, source_section, section, graded_at, created_at, stimuli",
    );
  if (opts.sourceSection) query = query.eq("source_section", opts.sourceSection);
  if (opts.studentId) query = query.eq("student_id", opts.studentId);

  const { data, error } = await query
    // Immutable, unlike `graded_at`. Attempt number breaks a tie inside one
    // assignment, where two rows can share a creation instant.
    .order("created_at", { ascending: false })
    .order("attempt_no", { ascending: false })
    .limit(limit);

  if (error) {
    // A brain that has not had the migration applied, or a column this build
    // expects and the database does not have, is not the same as a student with
    // no history -- but it is equally unreadable, so both say `failed`.
    if (isUnknownColumn(error) || error.code === "42P01") {
      console.error("[rrc] section grades unreadable in this environment", error);
      return { runs: [], failed: true };
    }
    console.error("[rrc] could not load recent runs", error);
    return { runs: [], failed: true };
  }
  return { runs: (data as RecentSectionRun[] | null) ?? [], failed: false };
}

/**
 * Admin: every Report Card a student has, newest first.
 *
 * No teacher surface has ever read `activity_section_grades`. A student
 * finishes twenty-five minutes of recorded work, it is transcribed and judged
 * stimulus by stimulus, and Joshua learns nothing about it unless he asks her.
 * The admin SELECT policy has been on the table since it was created.
 */
export async function listStudentSectionGrades(studentId: string): Promise<SectionGrade[]> {
  const table = supabase.from("activity_section_grades" as never) as unknown as {
    select: (columns: string) => {
      eq: (
        column: "student_id",
        value: string,
      ) => {
        order: (
          column: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
      };
    };
  };
  const { data, error } = await table
    .select("*")
    .eq("student_id", studentId)
    .order("graded_at", { ascending: false });
  if (error) {
    if (isUnknownColumn(error) || error.code === "42P01") return [];
    throw error;
  }
  return (data as SectionGrade[] | null) ?? [];
}

// --- Admin -----------------------------------------------------------------

/**
 * Admin: list activity definitions I own, in teaching order.
 *
 * The sort is done here rather than in the query because the order is a
 * pedagogical sequence, not a column: a word up to a passage. `created_at` gets
 * it wrong twice over, listing the newest-seeded Activity first and tying every
 * Activity that one migration inserted in the same transaction. It stays as the
 * tiebreak for anything not in the sequence.
 */
export async function listActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return sortForLibrary((data ?? []).map(hydrateActivity).filter(isRunnable));
}

/**
 * Can this Activity still be run?
 *
 * Read, Recall, Colour is a whole section and only that. The one-stimulus
 * runner it used to fall back to is gone, so a `spoken-recall` Activity without
 * `mode: "section"` has nothing to run it.
 *
 * It is filtered out of the library rather than deleted. The row is content
 * that predates the decision, it costs nothing to keep, and deleting a row to
 * fix a listing is a trade nobody should make. Assigning something unrunnable
 * is the actual harm, and this is where that is prevented.
 */
export function isRunnable(activity: Activity): boolean {
  if (activity.item_format !== "spoken-recall") return true;
  // A `section` row is content now, not something to assign: it is one of the
  // sections she picks from inside the library. The library is the door, and
  // the door is the only Read, Recall, Colour card in the list.
  return activity.mode === "section-library";
}

/** One row of the section list a student chooses from. */
export interface SectionChoice {
  id: string;
  title: string;
  source_section: string;
  stimulus_count: number;
  goal_minutes: Record<string, number>;
}

/**
 * The sections she may run.
 *
 * Read through a definer function rather than a select, because only admins may
 * read `activities` and the fix must not be a read policy: `items` carries the
 * Details her Coverage is scored against and the captured answer key, and a
 * policy cannot hand back some columns while withholding others.
 */
export async function listSectionChoices(): Promise<SectionChoice[]> {
  // Cast until `types.ts` is regenerated against the deployed schema. Both
  // functions arrived with 20260902200000 and the generated union predates it;
  // delete the casts the next time types are pulled.
  const { data, error } = await supabase.rpc("list_section_activities" as never);
  if (error) throw error;
  return (data ?? []) as unknown as SectionChoice[];
}

/**
 * Start an Attempt on one section, and return the assignment id to run.
 *
 * The row is built server-side. She chooses which section; she never supplies
 * what is in it. An abandoned Attempt on the same section is discarded first,
 * because the drill is one unbroken recording and half a run has no valid audio
 * to resume into.
 */
export async function startSectionAttempt(activityId: string): Promise<string> {
  const { data, error } = await supabase.rpc("start_section_attempt" as never, {
    p_activity_id: activityId,
  } as never);
  if (error) throw error;
  if (typeof data !== "string") throw new Error("start_section_attempt returned no id");
  return data;
}

/**
 * Start a focus set: the weakest stimuli of a finished run, as their own
 * Attempt.
 *
 * The row is built server-side from the run she already owns; the slugs only
 * narrow her own snapshot and can never widen it.
 */
export async function startSectionFocusAttempt(
  assignmentId: string,
  slugs: string[],
): Promise<string> {
  const { data, error } = await supabase.rpc("start_section_focus_attempt" as never, {
    p_assignment_id: assignmentId,
    p_slugs: slugs,
  } as never);
  if (error) throw error;
  if (typeof data !== "string") throw new Error("start_section_focus_attempt returned no id");
  return data;
}

/** Teaching order, with anything unlisted kept in the query's own order. */
export function sortForLibrary<T extends { slug?: string | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => librarySortIndex(a.slug) - librarySortIndex(b.slug));
}

/** Admin: list a given student's activity assignments. */
export async function listAssignmentsForStudent(studentId: string): Promise<ActivityAssignment[]> {
  const { data, error } = await supabase
    .from("activity_assignments")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrateAssignment);
}

/** Admin: list every assignment issued for one activity, across all students. */
export async function listAssignmentsForActivity(activityId: string): Promise<ActivityAssignment[]> {
  const { data, error } = await supabase
    .from("activity_assignments")
    .select("*")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrateAssignment);
}

/** Admin: read every attempt for one assignment (any student). RLS allows admin read. */
export async function listResponsesForAssignment(
  assignmentId: string,
): Promise<ActivityItemResponse[]> {
  const { data, error } = await supabase
    .from("activity_item_responses")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("item_order", { ascending: true })
    .order("attempt_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActivityItemResponse[];
}


/**
 * Admin: every attempt across several assignments, in one round trip.
 *
 * The per-assignment reader above is right for the runner, which only ever has
 * one. The dossier has as many as the student has been given, and calling it in
 * a loop is an N+1 on a page that already runs several queries. An empty id list
 * asks nothing rather than asking for everything.
 */
export async function listResponsesForAssignments(
  assignmentIds: string[],
): Promise<ActivityItemResponse[]> {
  if (assignmentIds.length === 0) return [];
  const { data, error } = await supabase
    .from("activity_item_responses")
    .select("*")
    .in("assignment_id", assignmentIds)
    .order("item_order", { ascending: true })
    .order("attempt_no", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActivityItemResponse[];
}

/** Admin: fetch one activity definition. Used by the row-free teacher preview. */
export async function getActivity(activityId: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", activityId)
    .maybeSingle();
  if (error) throw error;
  return data ? hydrateActivity(data) : null;
}
