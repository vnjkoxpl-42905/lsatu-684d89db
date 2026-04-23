import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInbox } from "@/hooks/useInbox";

/**
 * Single source of truth for the Student Hub's left panel. Combines three
 * sources into one per-student row:
 *
 * 1. Profiles + email + role + feature flags — via the `admin-manage-users`
 *    Edge Function (same call the /admin dashboard makes). Service-role
 *    inside the function cross-joins profiles with auth.users to pull email.
 *
 * 2. Assignment counts (assigned/viewed/completed) — one bulk select on
 *    `ta_assignments` bucketed client-side. Cheaper than per-student
 *    queries and scales fine up to a few thousand assignments.
 *
 * 3. Unread-from-student dot — derived from `useInbox()` which already
 *    computes a per-conversation `unread` flag for the logged-in admin.
 *    A conversation's "other participant" user_id is the student.
 *
 * Returned rows are keyed by `class_id` (the canonical student identifier
 * everywhere else in the TA codebase).
 */

export interface HubStudentRow {
  class_id: string;
  display_name: string | null;
  email: string | null;
  last_seen_at: string | null;
  role: string;
  // Feature flags — copied off the profile row. Used by the Overview tab.
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
  has_practice_access: boolean;
  has_drill_access: boolean;
  has_waj_access: boolean;
  has_flagged_access: boolean;
  has_chat_access: boolean;
  has_export_access: boolean;
  has_ta_access: boolean;
  // Derived fields:
  assignments_total: number;
  assignments_assigned: number;
  assignments_viewed: number;
  assignments_completed: number;
  has_unread_from_student: boolean;
}

type AssignmentStatus = "assigned" | "viewed" | "completed";

interface ManagedUserRow {
  class_id: string;
  display_name: string | null;
  email: string | null;
  last_seen_at: string | null;
  role: string;
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
  has_practice_access: boolean;
  has_drill_access: boolean;
  has_waj_access: boolean;
  has_flagged_access: boolean;
  has_chat_access: boolean;
  has_export_access: boolean;
  has_ta_access: boolean;
}

export function useHubStudents() {
  const usersQuery = useQuery<ManagedUserRow[]>({
    queryKey: ["hub-managed-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "admin-manage-users",
        { method: "GET" }
      );
      if (error) throw error;
      return (data ?? []) as ManagedUserRow[];
    },
  });

  const assignmentsQuery = useQuery<
    Array<{ student_id: string; status: AssignmentStatus }>
  >({
    queryKey: ["hub-assignment-counts"],
    queryFn: async () => {
      // Cast until Lovable regenerates src/integrations/supabase/types.ts.
      const { data, error } = await (supabase as any)
        .from("ta_assignments")
        .select("student_id, status");
      if (error) throw error;
      return (data ?? []) as Array<{
        student_id: string;
        status: AssignmentStatus;
      }>;
    },
  });

  const { conversations } = useInbox();

  const rows = useMemo<HubStudentRow[]>(() => {
    const users = usersQuery.data ?? [];
    const assignments = assignmentsQuery.data ?? [];

    // Bucket assignment counts by student.
    const counts = new Map<
      string,
      { total: number; assigned: number; viewed: number; completed: number }
    >();
    for (const a of assignments) {
      const bucket = counts.get(a.student_id) ?? {
        total: 0,
        assigned: 0,
        viewed: 0,
        completed: 0,
      };
      bucket.total += 1;
      if (a.status === "assigned") bucket.assigned += 1;
      else if (a.status === "viewed") bucket.viewed += 1;
      else if (a.status === "completed") bucket.completed += 1;
      counts.set(a.student_id, bucket);
    }

    // Build a set of student user_ids that have unread messages waiting
    // for the admin. A conversation with unread=true means the last
    // message is from the non-admin participant — so the other
    // participant is the student.
    const unreadStudents = new Set<string>();
    for (const c of conversations) {
      if (!c.unread) continue;
      for (const p of c.participants) {
        if (!p.is_admin) unreadStudents.add(p.user_id);
      }
    }

    return users
      // The admin-manage-users payload includes admins themselves; hide
      // them from the Student Hub list.
      .filter((u) => u.role !== "admin")
      .map((u) => {
        const c = counts.get(u.class_id) ?? {
          total: 0,
          assigned: 0,
          viewed: 0,
          completed: 0,
        };
        return {
          ...u,
          assignments_total: c.total,
          assignments_assigned: c.assigned,
          assignments_viewed: c.viewed,
          assignments_completed: c.completed,
          has_unread_from_student: unreadStudents.has(u.class_id),
        };
      });
  }, [usersQuery.data, assignmentsQuery.data, conversations]);

  return {
    rows,
    loading: usersQuery.isLoading || assignmentsQuery.isLoading,
    error: usersQuery.error ?? assignmentsQuery.error ?? null,
    refresh: () => {
      usersQuery.refetch();
      assignmentsQuery.refetch();
    },
  };
}

/** Lookup helper: single row by class_id. Returns undefined if absent. */
export function selectHubStudent(
  rows: HubStudentRow[],
  studentId: string | null
): HubStudentRow | undefined {
  if (!studentId) return undefined;
  return rows.find((r) => r.class_id === studentId);
}
