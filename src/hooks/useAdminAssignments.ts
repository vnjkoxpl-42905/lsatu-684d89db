import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
    // TODO: drop `as any` after next supabase type regen (homework_assignments)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any)
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

      const rows = studentIds.map((sid) => ({
        set_id: set.id,
        student_id: sid,
        question_qids: set.question_qids,
        set_title: set.title,
        set_description: set.description,
        status: "assigned" as AssignmentStatus,
        assigned_by: user.id,
        class_id: set.class_id,
      }));

      // Try bulk insert first; if the partial-unique index rejects any rows,
      // fall back to per-row insert so we can count duplicates cleanly.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: bulkErr } = await (supabase as any)
        .from("homework_assignments")
        .insert(rows);

      if (!bulkErr) {
        await refresh();
        return { inserted: rows.length, duplicates: 0, error: null };
      }

      // Fall back: per-row. Count duplicate-index violations separately.
      let inserted = 0;
      let duplicates = 0;
      let firstOtherError: string | null = null;
      for (const row of rows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rowErr } = await (supabase as any)
          .from("homework_assignments")
          .insert(row);
        if (!rowErr) {
          inserted++;
        } else if (rowErr.code === "23505") {
          duplicates++;
        } else {
          console.error("[homework:assign:admin:insert] row failed", {
            userId: user.id,
            setId: set.id,
            studentId: row.student_id,
            error: rowErr,
          });
          if (!firstOtherError) firstOtherError = rowErr.message;
        }
      }
      await refresh();
      return { inserted, duplicates, error: firstOtherError };
    },
    [user, refresh],
  );

  return { assignments, loading, error, refresh, assignToStudents };
}
