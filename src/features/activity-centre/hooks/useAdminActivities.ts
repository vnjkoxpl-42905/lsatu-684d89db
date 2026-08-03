import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { assignWork } from "@/lib/assignWork";
import { listActivities, listAssignmentsForStudent } from "../api/activitiesClient";
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

export interface AssignResult {
  ok: boolean;
  id?: string;
  error?: string;
  /** Whether the email leg succeeded (only meaningful when notify was requested). */
  emailOk?: boolean;
  /** Whether every notification channel landed (classroom item + inbox + bell + email). */
  fullyNotified?: boolean;
}

/**
 * Admin action: snapshot-assign an activity to a student. When `notify` is set
 * (the real assign, not a self-preview), it also drops the activity into the
 * student's Classroom and fires the inbox + bell + email notification, mirroring
 * the homework assign flow. Notification failure never fails the assignment.
 */
export function useAssignActivity() {
  const { user } = useAuth();
  const [assigning, setAssigning] = useState(false);

  const assign = useCallback(
    async (
      activity: Activity,
      studentId: string,
      opts?: { notify?: boolean },
    ): Promise<AssignResult> => {
      if (!user) return { ok: false, error: "Not signed in" };
      setAssigning(true);
      try {
        const { ok, failed } = await assignWork({
          teacherId: user.id,
          studentIds: [studentId],
          item: { kind: "activity", activityId: activity.id },
        });

        const result = ok[0];
        if (!result) {
          return { ok: false, error: failed[0]?.error ?? "Assign failed" };
        }

        // `notify: false` still writes the classroom item, which is what makes
        // the activity reachable at all; it only suppresses reporting on the
        // messages. assignWork always notifies, so the flag now just decides
        // how much detail comes back.
        if (!opts?.notify) return { ok: true, id: result.assignmentId };

        return {
          ok: true,
          id: result.assignmentId,
          emailOk: result.notify?.email_ok,
          fullyNotified: Boolean(
            result.notify && result.notify.inbox_ok && result.notify.bell_ok && result.notify.email_ok,
          ),
        };
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
