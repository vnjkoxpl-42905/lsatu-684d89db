import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  assignActivityToStudent,
  listActivities,
  listAssignmentsForStudent,
} from "../api/activitiesClient";
import type { Activity, ActivityAssignment } from "../api/types";

/** Admin-side list of activity definitions. */
export function useAdminActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setActivities(await listActivities());
      setError(null);
    } catch (e) {
      console.error("[activity:admin:list] failed", e);
      setError(e instanceof Error ? e.message : "Failed to load activities");
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activities, loading, error, refresh };
}

/** Admin-side: assignments already issued to a given student. */
export function useAdminActivityAssignments(studentId: string | null | undefined) {
  const [assignments, setAssignments] = useState<ActivityAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!studentId) {
      setAssignments([]);
      return;
    }
    setLoading(true);
    try {
      setAssignments(await listAssignmentsForStudent(studentId));
      setError(null);
    } catch (e) {
      console.error("[activity:admin:assign:list] failed", { studentId, error: e });
      setError(e instanceof Error ? e.message : "Failed to load assignments");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignments, loading, error, refresh };
}

/** Admin action: snapshot-assign an activity to a student. */
export function useAssignActivity() {
  const { user } = useAuth();
  const [assigning, setAssigning] = useState(false);

  const assign = useCallback(
    async (activity: Activity, studentId: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Not signed in" };
      setAssigning(true);
      try {
        // class_id mirrors the admin's id, matching the homework seed/assign convention.
        await assignActivityToStudent({
          activity,
          studentId,
          assignedBy: user.id,
          classId: user.id,
        });
        return { ok: true };
      } catch (e) {
        console.error("[activity:admin:assign] failed", { studentId, activityId: activity.id, error: e });
        return { ok: false, error: e instanceof Error ? e.message : "Assign failed" };
      } finally {
        setAssigning(false);
      }
    },
    [user],
  );

  return { assign, assigning };
}
