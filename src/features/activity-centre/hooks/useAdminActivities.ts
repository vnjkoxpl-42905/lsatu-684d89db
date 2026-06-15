import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createClassroomItem } from "@/lib/classroomItems";
import { notifyStudentOfClassroomItem } from "@/lib/classroomNotify";
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
        // class_id mirrors the admin's id, matching the homework seed/assign convention.
        const assignment = await assignActivityToStudent({
          activity,
          studentId,
          assignedBy: user.id,
          classId: user.id,
        });

        if (!opts?.notify) return { ok: true, id: assignment.id };

        // Classroom feed + notification trifecta. Assignment is the source of
        // truth: any failure here is logged and surfaced but does not roll back.
        const route = `/activities/${assignment.id}`;
        try {
          await createClassroomItem({
            studentId,
            createdBy: user.id,
            type: "activity",
            title: activity.title,
            description: activity.subtitle ?? undefined,
            sourceTable: "activity_assignments",
            sourceId: assignment.id,
            visibleToStudent: true,
            status: "assigned",
          });
        } catch (e) {
          console.error("[activity:assign:classroom] failed", { studentId, error: e });
        }

        const notify = await notifyStudentOfClassroomItem({
          adminUserId: user.id,
          studentId,
          title: activity.title,
          description: activity.subtitle ?? undefined,
          route,
          assignmentType: "activity",
        });

        return {
          ok: true,
          id: assignment.id,
          emailOk: notify.email_ok,
          fullyNotified: notify.inbox_ok && notify.bell_ok && notify.email_ok,
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
