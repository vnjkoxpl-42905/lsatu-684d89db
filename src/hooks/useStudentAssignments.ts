import { useCallback, useEffect, useState } from "react";
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

export function useStudentAssignments(): UseStudentAssignmentsResult {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("homework_assignments")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[homework:assign:student:list] failed", {
        userId: user.id,
        error: err,
      });
      setError(err.message);
      setAssignments([]);
    } else {
      const rows = ((data || []) as unknown) as StudentTAAssignment[];
      rows.sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAssignments(rows);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  return { assignments, loading, error, refresh };
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

export function useStudentTAAssignments(): {
  assignments: StudentTAAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StudentTAAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await supabase
      .from("ta_assignments")
      .select("*")
      .eq("student_id", user.id)
      .order("assigned_at", { ascending: false });
    if (err) {
      console.error("[ta:assign:student:list] failed", {
        userId: user.id,
        error: err,
      });
      setError(err.message);
      setAssignments([]);
    } else {
      const rows = (data || []) as unknown as StudentTAAssignment[]);
      rows.sort((a, b) => {
        const s = TA_STATUS_ORDER[a.status] - TA_STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime();
      });
      setAssignments(rows);
      setError(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  return { assignments, loading, error, refresh };
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
  const [assignments, setAssignments] = useState<StudentTAAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!studentId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await supabase
      .from("ta_assignments")
      .select("*")
      .eq("student_id", studentId)
      .order("assigned_at", { ascending: false });
    if (err) {
      console.error("[ta:assign:admin:list] failed", { studentId, error: err });
      setError(err.message);
      setAssignments([]);
    } else {
      setAssignments((data || []) as unknown as StudentTAAssignment[]));
      setError(null);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignments, loading, error, refresh };
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

export async function saveTAAssignmentResponses(
  assignmentId: string,
  responseData: Record<string, string>,
): Promise<{ ok: boolean; savedAt?: string; error?: string }> {
  try {
    const savedAt = new Date().toISOString();
    // These columns are introduced by the structured-homework migration.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignmentTable = (supabase as any).from("ta_assignments");
    const { error } = await assignmentTable
      .update({ response_data: responseData, response_saved_at: savedAt })
      .eq("id", assignmentId)
      .neq("status", "completed");
    if (error) throw error;
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
    const { error } = await assignmentTable
      .update({
        response_data: responseData,
        response_saved_at: now,
        status: "completed",
        completed_at: now,
      })
      .eq("id", assignmentId)
      .neq("status", "completed");
    if (error) throw error;
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
