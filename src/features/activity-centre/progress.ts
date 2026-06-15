// Resume reconstruction for the Activity runner.
//
// The runner advances strictly forward: a student cannot resolve item N+1
// before item N, so the append-only attempt log always describes a resolved
// PREFIX [1..k] followed by unresolved items. We replay the per-item state
// machine (correct | attempt cap | coach-failure null verdict) to find where
// the student actually stopped, what their resolving verdict was, and the text
// they last wrote. This drives "resume where you left off" and lets the final
// score count attempts across sessions.

import { MAX_ATTEMPTS } from "./api/types";
import type { ActivityItem, ActivityItemResponse, Verdict } from "./api/types";

export interface ReconstructedProgress {
  /** Resolving verdict per item order (correct, or the last attempt's verdict). */
  verdicts: Record<number, Verdict | null>;
  /** The text the student last submitted per item order, for the summary. */
  responses: Record<number, string>;
  /** Count of resolved items at the front; also the index to resume at. */
  resolvedCount: number;
}

/**
 * Replay an attempt log against the ordered item list. `items` must be sorted
 * by `order`; `responses` may be in any order (we group by item_order and read
 * the last attempt by attempt_no).
 */
export function reconstructProgress(
  items: ActivityItem[],
  responses: ActivityItemResponse[],
): ReconstructedProgress {
  const byItem = new Map<number, ActivityItemResponse[]>();
  for (const r of responses) {
    const list = byItem.get(r.item_order);
    if (list) list.push(r);
    else byItem.set(r.item_order, [r]);
  }
  for (const list of byItem.values()) {
    list.sort((a, b) => a.attempt_no - b.attempt_no);
  }

  const verdicts: Record<number, Verdict | null> = {};
  const text: Record<number, string> = {};
  let resolvedCount = 0;

  for (const item of items) {
    const rows = byItem.get(item.order);
    if (!rows || rows.length === 0) break; // first untouched item: stop here

    const correct = rows.find((r) => r.verdict === "correct");
    const last = rows[rows.length - 1];
    const hitCap = last.attempt_no >= MAX_ATTEMPTS;
    const coachFailed = rows.some((r) => r.verdict === null);
    const resolved = Boolean(correct) || hitCap || coachFailed;

    // One sub-cap, non-correct attempt means they were mid-retry (or bailed via
    // Show answer, which we don't log) — treat as unresolved so they resume on
    // this item with a fresh shot.
    if (!resolved) break;

    const resolver = correct ?? last;
    verdicts[item.order] = correct ? "correct" : last.verdict;
    text[item.order] = resolver.response_text;
    resolvedCount += 1;
  }

  return { verdicts, responses: text, resolvedCount };
}
