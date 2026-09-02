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
import type { SectionGrade } from "./types";

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
  "id,activity_id,student_id,title,subtitle,status,score,score_numerator,score_judged,score_total,scoring_version,instructions,created_at,started_at,completed_at";

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
  /*
   * `activity_section_grades` arrives with its own migration, and `types.ts` is
   * generated from the DEPLOYED schema, so the generated client does not know
   * the table until types are pulled against a database that has it. Same
   * situation, and the same remedy, as the `rrc` column in `RecallRunner`.
   *
   * Narrowed to the two calls actually used rather than cast to `any`, so a
   * typo in the column name is still a type error. Delete the shim once the
   * types are regenerated.
   */
  const table = supabase.from("activity_section_grades" as never) as unknown as {
    select: (columns: string) => {
      eq: (
        column: "assignment_id",
        value: string,
      ) => {
        maybeSingle: () => Promise<{
          data: unknown;
          error: { code?: string; message?: string } | null;
        }>;
      };
    };
  };

  const { data, error } = await table.select("*").eq("assignment_id", assignmentId).maybeSingle();
  // The table arrives with its own migration. A Report Card that cannot load is
  // not worth taking the finished-run screen down for.
  if (error) {
    if (isUnknownColumn(error) || error.code === "42P01") return null;
    throw error;
  }
  return (data as SectionGrade | null) ?? null;
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
  return sortForLibrary((data ?? []).map(hydrateActivity));
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
