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
    // TODO: drop `as any` after next supabase type regen (homework_assignments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
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
      const rows = (data || []) as StudentAssignment[];
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: err } = await (supabase as any)
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
