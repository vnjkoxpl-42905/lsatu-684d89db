import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getActivity, getAssignmentById, getStudentAssignment, listStudentAssignments } from "../api/activitiesClient";
import type { Activity, ActivityAssignment, ActivityAssignmentSummary, ActivityStatus } from "../api/types";

/**
 * Shape an activity DEFINITION into the assignment the runner expects, without
 * writing anything. This is what a teacher preview runs on. Previews used to
 * call the real assign path against the teacher's own account, which wrote a
 * genuine `activity_assignments` row plus a Classroom item, so every activity
 * he opened to look at turned up under "Assigned to you" on his own Classroom
 * and stayed there. A preview is a read; it gets no row.
 */
function previewAssignment(activity: Activity, userId: string): ActivityAssignment {
  return {
    id: `preview:${activity.id}`,
    activity_id: activity.id,
    student_id: userId,
    title: activity.title,
    subtitle: activity.subtitle,
    instructions: activity.instructions,
    item_format: activity.item_format,
    /*
     * Section mode is carried by three fields, and a preview that drops them
     * silently runs the WRONG PLAYER. `ActivityRunner` picks the section runner
     * on `mode === "section"`; without it the branch falls through to the v1
     * chunk-by-chunk runner, which judges live, accepts typing and walks a
     * cursor -- every one of which section mode forbids. The preview then shows
     * a drill that has not existed since ADR 0012, and looks like a design
     * failure rather than a missing field.
     */
    mode: activity.mode,
    time_goal_minutes: activity.time_goal_minutes,
    source_section: activity.source_section,
    items: activity.items,
    status: "assigned",
    score: null,
    started_at: null,
    completed_at: null,
    assigned_by: userId,
    class_id: userId,
    created_at: new Date().toISOString(),
  };
}

const STATUS_ORDER: Record<ActivityStatus, number> = {
  in_progress: 0,
  assigned: 1,
  completed: 2,
  abandoned: 3,
};

/** Student-side list of my activity assignments, sorted by status then recency. */
export function useStudentActivities() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ActivityAssignmentSummary[]>([]);
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
export function useStudentActivity(
  assignmentId: string | undefined,
  previewActivityId?: string,
) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<ActivityAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || (!assignmentId && !previewActivityId)) return;
    setLoading(true);
    try {
      if (previewActivityId) {
        const activity = await getActivity(previewActivityId);
        setAssignment(activity ? previewAssignment(activity, user.id) : null);
        setError(null);
        return;
      }
      // The student-scoped read comes back empty both for an id that is not
      // real and for one issued to somebody else. The second is the case where
      // an admin is opening a link they handed out, so ask again by id alone
      // and let RLS answer: an admin gets the row, a student gets the same
      // null they already had. No client-side role check is involved, and the
      // runner runs a foreign row read-only.
      const row = await getStudentAssignment(assignmentId, user.id);
      setAssignment(row ?? (await getAssignmentById(assignmentId)));
      setError(null);
    } catch (e) {
      console.error("[activity:assign:student:get] failed", { userId: user.id, assignmentId, error: e });
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setAssignment(null);
    } finally {
      setLoading(false);
    }
  }, [user, assignmentId, previewActivityId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { assignment, loading, error, refresh };
}
