import type { DrillAttempt } from "../types";

/** Saved successful attempts are authoritative until a completed module is retaken. */
export function restoreDrillPosition(ids: string[], attempts: DrillAttempt[], completed: boolean) {
  if (completed) return { index: 0, picked: null as number | null };
  const answered = new Map(attempts.filter((a) => ids.includes(a.drillId) && a.selectedIndex >= 0).map((a) => [a.drillId, a]));
  const missing = ids.findIndex((id) => !answered.has(id));
  if (missing >= 0) return { index: missing, picked: null as number | null };
  const index = Math.max(0, ids.length - 1);
  return { index, picked: answered.get(ids[index])?.selectedIndex ?? null };
}
