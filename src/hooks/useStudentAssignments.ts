import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Student-scoped view of homework_assignments.
 * RLS restricts to rows where student_id = auth.uid().
 */

export type AssignmentStatus = "assigned" | "in_progress" | "completed";

export interface StudentAssignment {
  id: string;
  set_id: string | null;
  student_id: string;
  question_qids: string[];
  set_title: string;
  set_description: string | null;
  status: AssignmentStatus;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  assigned_by: string;
  class_id: string;
  created_at: string;
}

const STATUS_ORDER: Record<AssignmentStatus, number> = {
  in_progress: 0,
  assigned: 1,
  completed: 2,
};

export interface UseStudentAssignmentsResult {
  assignments: StudentAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const studentAssignmentsQueryKey = (userId: string | undefined) =>
  ["student-assignments", userId] as const;

export async function loadStudentAssignments(userId: string): Promise<StudentAssignment[]> {
  const { data, error: err } = await supabase
    .from("homework_assignments")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });
  if (err) {
    console.error("[homework:assign:student:list] failed", { userId, error: err });
    throw new Error(err.message);
  }
  const rows = ((data || []) as unknown) as StudentAssignment[];
  rows.sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return rows;
}

const EMPTY_HOMEWORK: StudentAssignment[] = [];

/**
 * Cached under a stable key so the Classroom rail and the Today focus, which
 * both mount this on the drill hub, share one read instead of each firing
 * their own. The return shape is unchanged from the useState version.
 */
export function useStudentAssignments(): UseStudentAssignmentsResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery<StudentAssignment[], Error>({
    queryKey: studentAssignmentsQueryKey(userId),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: () => loadStudentAssignments(userId!),
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: studentAssignmentsQueryKey(userId) });
  }, [queryClient, userId]);

  return {
    assignments: query.data ?? EMPTY_HOMEWORK,
    loading: query.isPending,
    error: query.error?.message ?? null,
    refresh,
  };
}

export function useStudentAssignment(assignmentId: string | undefined): {
  assignment: StudentAssignment | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !assignmentId) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("homework_assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (err) {
      console.error("[homework:assign:student:get] failed", {
        userId: user.id,
        assignmentId,
        error: err,
      });
      setError(err.message);
      setAssignment(null);
    } else {
      setAssignment((data as StudentAssignment) || null);
      setError(null);
    }
    setLoading(false);
  }, [user, assignmentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignment, loading, error, refresh };
}

// --- TA assignments --------------------------------------------------------
// ta_assignments is populated by DraftCard's approve flow. RLS on the table
// restricts students to rows where student_id = auth.uid(); admins have full
// CRUD. Kept in this file per the Gap 1 brief so callers have one import.

export type TAAssignmentStatus = "assigned" | "viewed" | "completed";

export interface TAResponseField {
  id: string;
  label: string;
  kind?: "short" | "long";
  rows?: number;
  placeholder?: string;
  required?: boolean;
}

export interface TAResponseSection {
  id: string;
  title: string;
  instructions?: string;
  fields: TAResponseField[];
}

export interface TAResponseSchema {
  version: 1;
  sections: TAResponseSection[];
}

export interface StudentTAAssignment {
  id: string;
  student_id: string;
  interaction_id: string | null;
  title: string;
  content_html: string;
  asset_ids: string[];
  pdf_url: string | null;
  status: TAAssignmentStatus;
  assigned_by: string;
  assigned_at: string;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  response_schema?: TAResponseSchema;
  response_data?: Record<string, string>;
  response_saved_at?: string | null;
  answer_key_html?: string | null;
}

const TA_STATUS_ORDER: Record<TAAssignmentStatus, number> = {
  assigned: 0,
  viewed: 1,
  completed: 2,
};

export const studentTAAssignmentsQueryKey = (userId: string | undefined) =>
  ["student-ta-assignments", userId] as const;

export async function loadStudentTAAssignments(userId: string): Promise<StudentTAAssignment[]> {
  const { data, error: err } = await supabase
    .from("ta_assignments")
    .select("*")
    .eq("student_id", userId)
    .order("assigned_at", { ascending: false });
  if (err) {
    console.error("[ta:assign:student:list] failed", { userId, error: err });
    throw new Error(err.message);
  }
  const rows = ((data || []) as unknown) as StudentTAAssignment[];
  rows.sort((a, b) => {
    const s = TA_STATUS_ORDER[a.status] - TA_STATUS_ORDER[b.status];
    if (s !== 0) return s;
    return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
  });
  return rows;
}

const EMPTY_TA: StudentTAAssignment[] = [];

/** Same shape and sharing rule as useStudentAssignments; see there. */
export function useStudentTAAssignments(): {
  assignments: StudentTAAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const query = useQuery<StudentTAAssignment[], Error>({
    queryKey: studentTAAssignmentsQueryKey(userId),
    enabled: !!userId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: () => loadStudentTAAssignments(userId!),
  });

  const refresh = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: studentTAAssignmentsQueryKey(userId) });
  }, [queryClient, userId]);

  return {
    assignments: query.data ?? EMPTY_TA,
    loading: query.isPending,
    error: query.error?.message ?? null,
    refresh,
  };
}

/**
 * Admin-scoped list of a specific student's TA assignments.
 * RLS on `ta_assignments` grants admins full read; students only see their own.
 */
export function useAdminTAAssignmentsForStudent(studentId: string | null | undefined): {
  assignments: StudentTAAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const queryClient = useQueryClient();
  const query = useQuery<StudentTAAssignment[], Error>({
    queryKey: ["admin-ta-assignments", studentId],
    enabled: !!studentId,
    queryFn: async () => (await loadStudentTAAssignments(studentId!))
      .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()),
  });

  const refresh = useCallback(async () => {
    if (!studentId) {
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["admin-ta-assignments", studentId] });
  }, [queryClient, studentId]);

  return { assignments: query.data ?? EMPTY_TA, loading: query.isPending && !!studentId, error: query.error?.message ?? null, refresh };
}

export async function markTAAssignmentViewed(
  assignmentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Only transition assigned -> viewed; leave completed rows alone.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("ta_assignments")
      .update({ status: "viewed", viewed_at: new Date().toISOString() })
      .eq("id", assignmentId)
      .eq("status", "assigned");
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[ta:assign:student:mark-viewed] failed", { assignmentId, error: e });
    return { ok: false, error: e instanceof Error ? e.message : "mark-viewed failed" };
  }
}

export async function markTAAssignmentCompleted(
  assignmentId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from("ta_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assignmentId);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[ta:assign:student:mark-completed] failed", { assignmentId, error: e });
    return { ok: false, error: e instanceof Error ? e.message : "mark-completed failed" };
  }
}

function responsesMatch(
  left: Record<string, string>,
  right: Record<string, string>,
) {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every(
      (key, index) => key === rightKeys[index] && left[key] === right[key],
    );
}

export async function saveTAAssignmentResponses(
  assignmentId: string,
  responseData: Record<string, string>,
): Promise<{ ok: boolean; savedAt?: string; error?: string }> {
  try {
    const savedAt = new Date().toISOString();
    // These columns are introduced by the structured-homework migration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignmentTable = (supabase as any).from("ta_assignments");
    const { data, error } = await assignmentTable
      .update({ response_data: responseData, response_saved_at: savedAt })
      .eq("id", assignmentId)
      .neq("status", "completed")
      .select("id, response_data, response_saved_at")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        ok: false,
        error: "Your progress was not saved. Reload the page and try again.",
      };
    }

    const persisted = (data.response_data ?? {}) as Record<string, string>;
    if (!responsesMatch(persisted, responseData)) {
      return {
        ok: false,
        error: "Your saved work could not be verified. Please try saving again before leaving.",
      };
    }
    return { ok: true, savedAt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "save failed" };
  }
}

export async function submitTAAssignmentResponses(
  assignmentId: string,
  responseData: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    // These columns are introduced by the structured-homework migration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignmentTable = (supabase as any).from("ta_assignments");
    const { data, error } = await assignmentTable
      .update({
        response_data: responseData,
        response_saved_at: now,
        status: "completed",
        completed_at: now,
      })
      .eq("id", assignmentId)
      .neq("status", "completed")
      .select("id, status, response_data")
      .maybeSingle();
    if (error) throw error;
    const persisted = (data?.response_data ?? {}) as Record<string, string>;
    if (
      !data
      || data.status !== "completed"
      || !responsesMatch(persisted, responseData)
    ) {
      return {
        ok: false,
        error: "Your homework was not submitted. Your draft is still on this device.",
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "submit failed" };
  }
}

export function useStudentTAAssignment(assignmentId: string | undefined): {
  assignment: StudentTAAssignment | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<StudentTAAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !assignmentId) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await supabase
      .from("ta_assignments")
      .select("*")
      .eq("id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (err) {
      console.error("[ta:assign:student:get] failed", {
        userId: user.id,
        assignmentId,
        error: err,
      });
      setError(err.message);
      setAssignment(null);
    } else {
      setAssignment((data as unknown as StudentTAAssignment) || null);
      setError(null);
    }
    setLoading(false);
  }, [user, assignmentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignment, loading, error, refresh };
}
