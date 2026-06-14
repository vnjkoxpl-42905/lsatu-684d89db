import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentAssignment, listStudentAssignments } from "../api/activitiesClient";
import type { ActivityAssignment, ActivityStatus } from "../api/types";

const STATUS_ORDER: Record<ActivityStatus, number> = {
  in_progress: 0,
  assigned: 1,
  completed: 2,
};

/** Student-side list of my activity assignments, sorted by status then recency. */
export function useStudentActivities() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ActivityAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await listStudentAssignments(user.id);
      rows.sort((a, b) => {
        const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (s !== 0) return s;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setAssignments(rows);
      setError(null);
    } catch (e) {
      console.error("[activity:assign:student:list] failed", { userId: user.id, error: e });
      setError(e instanceof Error ? e.message : "Failed to load activities");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  return { assignments, loading, error, refresh };
}

/** Student-side single activity assignment. */
export function useStudentActivity(assignmentId: string | undefined) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<ActivityAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !assignmentId) return;
    setLoading(true);
    try {
      const row = await getStudentAssignment(assignmentId, user.id);
      setAssignment(row);
      setError(null);
    } catch (e) {
      console.error("[activity:assign:student:get] failed", { userId: user.id, assignmentId, error: e });
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [user, assignmentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignment, loading, error, refresh };
}
