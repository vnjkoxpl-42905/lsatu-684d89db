import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createClassroomItem, resolveItemRoute } from "@/lib/classroomItems";
import { notifyStudentOfClassroomItem } from "@/lib/classroomNotify";
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

      // Per student, in sequence: insert the assignment, create the classroom
      // item that makes it visible, then notify. Bulk insert is not usable here
      // because each classroom item needs its own assignment row id. `class_id`
      // is the STUDENT's id (matching AssignmentBuilder); the set's class_id
      // pointed the row at the wrong owner and hid it from the student.
      let inserted = 0;
      let duplicates = 0;
      let firstOtherError: string | null = null;

      for (const studentId of studentIds) {
        const { data: assignment, error: rowErr } = await supabase
          .from("homework_assignments")
          .insert({
            set_id: set.id,
            student_id: studentId,
            question_qids: set.question_qids,
            set_title: set.title,
            set_description: set.description,
            status: "assigned" as AssignmentStatus,
            assigned_by: user.id,
            class_id: studentId,
          })
          .select("id")
          .single();

        if (rowErr) {
          if (rowErr.code === "23505") {
            duplicates++;
          } else {
            console.error("[homework:assign:admin:insert] row failed", {
              userId: user.id,
              setId: set.id,
              studentId,
              error: rowErr,
            });
            if (!firstOtherError) firstOtherError = rowErr.message;
          }
          continue;
        }

        inserted++;

        // The assignment row is the source of truth. A classroom-item or
        // notify failure is reported per student and never aborts the batch or
        // re-inserts an assignment that already landed.
        try {
          const item = await createClassroomItem({
            studentId,
            createdBy: user.id,
            type: "homework",
            title: set.title,
            description: set.description ?? undefined,
            sourceId: assignment.id,
            sourceTable: "homework_assignments",
            visibleToStudent: true,
            status: "assigned",
            metadata: { set_id: set.id },
          });

          await notifyStudentOfClassroomItem({
            adminUserId: user.id,
            studentId,
            title: set.title,
            description: set.description ?? undefined,
            route: resolveItemRoute(item) ?? `/classroom/item/${item.id}`,
          });
        } catch (err) {
          console.error("[homework:assign:admin:notify] failed", {
            userId: user.id,
            setId: set.id,
            studentId,
            error: err,
          });
          if (!firstOtherError) {
            firstOtherError =
              err instanceof Error
                ? err.message
                : "Assigned, but the student was not notified";
          }
        }
      }

      await refresh();
      return { inserted, duplicates, error: firstOtherError };
    },
    [user, refresh],
  );

  return { assignments, loading, error, refresh, assignToStudents };
}
