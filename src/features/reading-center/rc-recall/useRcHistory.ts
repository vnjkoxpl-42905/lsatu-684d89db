import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listAttempts, type AttemptPage } from "./lib/attempts";
import { clearCheckpoint, listCheckpoints } from "./lib/checkpoint";
import { buildEntries, type HistoryEntry } from "./lib/history";

export const rcHistoryKey = (studentId: string | undefined) => ["rc-recall-history", studentId] as const;

/**
 * The one source of RC Training history. The practice page, Reading Progress and
 * the Dashboard all read it, so they cannot disagree about an attempt's state.
 * Saved attempts come from the server a page at a time; unsaved local work is
 * merged in from this device only.
 */
export function useRcHistory(studentId: string | undefined) {
  const [localVersion, setLocalVersion] = useState(0);
  const query = useInfiniteQuery<AttemptPage, Error, { pages: AttemptPage[] }, ReturnType<typeof rcHistoryKey>, number>({
    queryKey: rcHistoryKey(studentId),
    enabled: !!studentId,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listAttempts(studentId!, pageParam),
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
  });
  useEffect(() => {
    if (!studentId) return;
    for (const page of query.data?.pages ?? []) {
      for (const attempt of page.attempts) {
        if (attempt.finished_at) clearCheckpoint(studentId, attempt.id);
      }
    }
  }, [studentId, query.data]);
  const entries: HistoryEntry[] = useMemo(() => {
    if (!studentId) return [];
    const local = listCheckpoints(studentId);
    const byId = new Map((query.data?.pages.flatMap((p) => p.attempts) ?? []).map((a) => [a.id, a]));
    // A successful server list is authoritative. An old local copy outside its
    // loaded pages must not resurrect work that finished on another device.
    if (!query.data || query.isError) {
      for (const checkpoint of local) {
        if (checkpoint.attempt && !byId.has(checkpoint.attemptId)) byId.set(checkpoint.attemptId, checkpoint.attempt);
      }
    }
    const attempts = [...byId.values()].sort((a, b) => b.started_at.localeCompare(a.started_at) || b.id.localeCompare(a.id));
    const recaps = [...new Map((query.data?.pages.flatMap((p) => p.recaps) ?? []).map((r) => [r.id, r])).values()];
    return buildEntries(attempts, recaps, local);
    // localVersion re-reads this device's checkpoints after a resume, retry or exit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, query.data, query.isError, localVersion]);
  const refreshLocal = useCallback(() => setLocalVersion((v) => v + 1), []);
  return { ...query, entries, refreshLocal };
}
