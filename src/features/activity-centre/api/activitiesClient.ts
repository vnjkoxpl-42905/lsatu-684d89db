import { supabase } from "@/integrations/supabase/client";
import { librarySortIndex } from "../content";
import type {
  Activity,
  ActivityAssignment,
  ActivityInstructions,
  ActivityItem,
  ActivityItemResponse,
  ActivityStatus,
  Verdict,
} from "./types";

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

/** Student: list my activity assignments. RLS scopes to student_id = auth.uid(). */
export async function listStudentAssignments(studentId: string): Promise<ActivityAssignment[]> {
  const { data, error } = await supabase
    .from("activity_assignments")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrateAssignment);
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

/** Student: mark an assignment in_progress on first open (assigned -> in_progress only). */
export async function markAssignmentStarted(assignmentId: string): Promise<void> {
  const { error } = await supabase
    .from("activity_assignments")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("status", "assigned");
  if (error) throw error;
}

/** Student: write a verdict-bearing attempt to the append-only log. */
export async function recordItemResponse(input: {
  assignmentId: string;
  studentId: string;
  itemOrder: number;
  responseText: string;
  verdict: Verdict | null;
  attemptNo: number;
}): Promise<void> {
  const { error } = await supabase.from("activity_item_responses").insert({
    assignment_id: input.assignmentId,
    student_id: input.studentId,
    item_order: input.itemOrder,
    response_text: input.responseText,
    verdict: input.verdict,
    attempt_no: input.attemptNo,
  });
  if (error) throw error;
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
export async function completeAssignment(assignmentId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from("activity_assignments")
    .update({
      status: "completed" satisfies ActivityStatus,
      score,
      completed_at: new Date().toISOString(),
    })
    .eq("id", assignmentId);
  if (error) throw error;
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
