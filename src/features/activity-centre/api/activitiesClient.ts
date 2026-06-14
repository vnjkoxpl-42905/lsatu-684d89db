import { supabase } from "@/integrations/supabase/client";
import type {
  Activity,
  ActivityAssignment,
  ActivityInstructions,
  ActivityItem,
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

/** Admin: list activity definitions I own. */
export async function listActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(hydrateActivity);
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

/**
 * Admin: assign an activity to a student by snapshotting its content into
 * activity_assignments. Mirrors the homework snapshot-at-assign pattern.
 */
export async function assignActivityToStudent(input: {
  activity: Activity;
  studentId: string;
  assignedBy: string;
  classId: string;
}): Promise<ActivityAssignment> {
  const { activity, studentId, assignedBy, classId } = input;
  const { data, error } = await supabase
    .from("activity_assignments")
    .insert({
      activity_id: activity.id,
      student_id: studentId,
      title: activity.title,
      subtitle: activity.subtitle,
      instructions: activity.instructions as never,
      item_format: activity.item_format,
      items: activity.items as never,
      status: "assigned" satisfies ActivityStatus,
      assigned_by: assignedBy,
      class_id: classId,
    })
    .select()
    .single();
  if (error) throw error;
  return hydrateAssignment(data);
}
