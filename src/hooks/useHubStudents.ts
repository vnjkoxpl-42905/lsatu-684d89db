import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInbox } from "@/hooks/useInbox";

/**
 * Single source of truth for the Student Hub's left panel. Combines three
 * sources into one per-student row:
 *
 * 1. Profiles + email + role + feature flags — via `admin-manage-users`
 *    Edge Function, cached for 5 min so student switching is free. The
 *    Edge Function cross-joins profiles with auth.users to pull email.
 *
 * 2. Assignment counts (assigned/viewed/completed) — via the
 *    `get_assignment_counts_per_student` RPC, which aggregates server-side
 *    and returns one row per student. Previously we pulled the whole
 *    ta_assignments table and bucketed in JS.
 *
 * 3. Unread-from-student dot — derived from `useInbox()`, which computes
 *    a per-conversation `unread` flag for the logged-in admin. The
 *    "other participant" user_id is the student.
 *
 * Rows are keyed by `class_id` (canonical student identifier everywhere
 * else in the TA codebase).
 */

const HUB_STALE_MS = 5 * 60 * 1000; // 5 minutes

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

interface AssignmentCountsRow {
  student_id: string;
  assigned: number;
  viewed: number;
  completed: number;
  total: number;
}

export function useHubStudents() {
  const usersQuery = useQuery<ManagedUserRow[]>({
    queryKey: ["hub-managed-users"],
    staleTime: HUB_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "admin-manage-users",
        { method: "GET" }
      );
      if (error) throw error;
      return (data ?? []) as ManagedUserRow[];
    },
  });

  const countsQuery = useQuery<AssignmentCountsRow[]>({
    queryKey: ["hub-assignment-counts"],
    staleTime: HUB_STALE_MS,
    queryFn: async () => {
      // Cast until Lovable regenerates src/integrations/supabase/types.ts.
      const { data, error } = await (supabase as any).rpc(
        "get_assignment_counts_per_student"
      );
      if (error) throw error;
      return (data ?? []) as AssignmentCountsRow[];
    },
  });

  const { conversations } = useInbox();

  const rows = useMemo<HubStudentRow[]>(() => {
    const users = usersQuery.data ?? [];
    const counts = countsQuery.data ?? [];

    const countsByStudent = new Map<string, AssignmentCountsRow>();
    for (const c of counts) countsByStudent.set(c.student_id, c);

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
        const c = countsByStudent.get(u.class_id);
        return {
          ...u,
          assignments_total: c?.total ?? 0,
          assignments_assigned: c?.assigned ?? 0,
          assignments_viewed: c?.viewed ?? 0,
          assignments_completed: c?.completed ?? 0,
          has_unread_from_student: unreadStudents.has(u.class_id),
        };
      });
  }, [usersQuery.data, countsQuery.data, conversations]);

  return {
    rows,
    loading: usersQuery.isLoading || countsQuery.isLoading,
    error: usersQuery.error ?? countsQuery.error ?? null,
    refresh: () => {
      usersQuery.refetch();
      countsQuery.refetch();
    },
  };
}

/**
 * Memoized single-row lookup. Stable object reference as long as `rows`
 * and `studentId` are stable — avoids churn in downstream consumers.
 */
export function useSelectedHubStudent(
  studentId: string | null
): HubStudentRow | undefined {
  const { rows } = useHubStudents();
  return useMemo(() => {
    if (!studentId) return undefined;
    return rows.find((r) => r.class_id === studentId);
  }, [rows, studentId]);
}

/**
 * Narrow per-student email lookup via the `get_student_email` RPC.
 * Use this when the caller hasn't already loaded the full hub roster
 * (e.g. deep-linked Overview before the list query resolves). Falls
 * back to NULL if the caller is not an admin (RPC body enforces).
 */
export function useStudentEmail(studentId: string | null) {
  return useQuery<string | null>({
    queryKey: ["hub-student-email", studentId],
    enabled: !!studentId,
    staleTime: HUB_STALE_MS,
    queryFn: async () => {
      if (!studentId) return null;
      // Cast until Lovable regenerates src/integrations/supabase/types.ts.
      const { data, error } = await (supabase as any).rpc(
        "get_student_email",
        { _student_id: studentId }
      );
      if (error) throw error;
      return (data as string | null) ?? null;
    },
  });
}

/**
 * Legacy helper retained for any callers that already have `rows` in
 * scope. Prefer `useSelectedHubStudent` in new code.
 */
export function selectHubStudent(
  rows: HubStudentRow[],
  studentId: string | null
): HubStudentRow | undefined {
  if (!studentId) return undefined;
  return rows.find((r) => r.class_id === studentId);
}
