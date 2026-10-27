import * as React from "react";
import { focusManager, onlineManager, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { studentAssignmentsQueryKey, studentTAAssignmentsQueryKey } from "@/hooks/useStudentAssignments";

/**
 * The actor's own assignment reads that Home draws from. Prefix keys, so the
 * activity-evidence key (which also carries the activity ids) is covered.
 */
export function homeAssignmentKeys(actorId: string): QueryKey[] {
  return [
    studentAssignmentsQueryKey(actorId),
    studentTAAssignmentsQueryKey(actorId),
    ["weekly-plan", "assigned-status", actorId],
    ["todo-feed:guided", actorId],
    ["todo-feed:activity", actorId],
    ["todo-feed:assignment-evidence", actorId],
    ["todo-feed:activity-evidence", actorId],
    ["classroom-items", actorId],
  ];
}

/**
 * Keeps an open Home current without realtime or polling.
 *
 * Assignment tables are not in the realtime publication, so a removal or a
 * new assignment made by Joshua cannot be pushed. What Home can do honestly is
 * re-read when the student comes back to the tab or the connection returns,
 * and offer a manual refresh. Only while Home is mounted: other screens keep
 * their own query defaults. Scoped to the signed-in actor's keys only.
 */
export function useHomeFreshness(actorId: string | undefined) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const inFlight = React.useRef<Promise<void> | null>(null);

  const refresh = React.useCallback(() => {
    if (!actorId) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    setRefreshing(true);
    const pending = Promise.all(
        homeAssignmentKeys(actorId).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ).then(() => undefined).finally(() => {
      inFlight.current = null;
      setRefreshing(false);
    });
    inFlight.current = pending;
    return pending;
  }, [actorId, queryClient]);

  React.useEffect(() => {
    if (!actorId) return;
    const offFocus = focusManager.subscribe((focused) => {
      if (focused) void refresh();
    });
    const offOnline = onlineManager.subscribe((online) => {
      if (online) void refresh();
    });
    return () => {
      offFocus();
      offOnline();
    };
  }, [actorId, refresh]);

  return { refresh, refreshing };
}
