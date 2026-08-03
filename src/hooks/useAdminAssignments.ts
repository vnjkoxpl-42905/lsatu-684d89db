import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { assignWork } from "@/lib/assignWork";
import type { HomeworkSet } from "@/hooks/useHomeworkSets";

/**
 * Admin-scoped view of homework_assignments, typically filtered by set.
 * RLS requires has_role(..., 'admin').
 */

export type AssignmentStatus = "assigned" | "in_progress" | "completed";

export interface AdminAssignment {
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

export interface UseAdminAssignmentsOptions {
  setId?: string;
}

export interface UseAdminAssignmentsResult {
  assignments: AdminAssignment[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  assignToStudents: (
    set: Pick<HomeworkSet, "id" | "title" | "description" | "question_qids" | "class_id">,
    studentIds: string[],
  ) => Promise<{ inserted: number; duplicates: number; error: string | null }>;
}

export function useAdminAssignments(
  options: UseAdminAssignmentsOptions = {},
): UseAdminAssignmentsResult {
  const { user } = useAuth();
  const { setId } = options;
  const [assignments, setAssignments] = useState<AdminAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("homework_assignments")
      .select("*")
      .order("created_at", { ascending: false });
    if (setId) query = query.eq("set_id", setId);
    const { data, error: err } = await query;
    if (err) {
      console.error("[homework:assign:admin:list] failed", {
        userId: user.id,
        setId,
        error: err,
      });
      setError(err.message);
      setAssignments([]);
    } else {
      setAssignments((data || []) as AdminAssignment[]);
      setError(null);
    }
    setLoading(false);
  }, [user, setId]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const assignToStudents = useCallback<UseAdminAssignmentsResult["assignToStudents"]>(
    async (set, studentIds) => {
      if (!user || studentIds.length === 0) {
        return { inserted: 0, duplicates: 0, error: null };
      }

      const { ok, failed } = await assignWork({
        teacherId: user.id,
        studentIds,
        item: { kind: "homework_set", setId: set.id },
      });

      // A unique-violation means this student already has the set, which is a
      // no-op rather than something to report as an error.
      const duplicates = failed.filter((f) => /duplicate key|23505/i.test(f.error ?? "")).length;
      const firstOtherError =
        failed.find((f) => !/duplicate key|23505/i.test(f.error ?? ""))?.error ?? null;

      await refresh();
      return { inserted: ok.length, duplicates, error: firstOtherError };
    },
    [user, refresh],
  );

  return { assignments, loading, error, refresh, assignToStudents };
}
