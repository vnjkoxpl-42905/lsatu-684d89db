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
  /**
   * Attempts already spent on the item they stopped ON (the first unresolved
   * one). Zero when that item was never touched. Resuming has to carry this:
   * restarting the counter at zero both hands back an attempt the student
   * already used and writes a second `attempt_no = 1` row, which makes the log
   * ambiguous for every later replay.
   */
  pendingAttempts: number;
  /** What they last wrote on that item, so a half-finished answer survives a reload. */
  pendingText: string;
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
  let pendingAttempts = 0;
  let pendingText = "";

  for (const item of items) {
    const rows = byItem.get(item.order);
    if (!rows || rows.length === 0) break; // first untouched item: stop here

    const correct = rows.find((r) => r.verdict === "correct");
    const last = rows[rows.length - 1];
    const hitCap = last.attempt_no >= MAX_ATTEMPTS;
    const coachFailed = rows.some((r) => r.verdict === null);
    const resolved = Boolean(correct) || hitCap || coachFailed;

    // One sub-cap, non-correct attempt means they were mid-retry. The item is
    // NOT resolved, so the run resumes here, but the attempt they already spent
    // and the words they already wrote come back with it.
    if (!resolved) {
      pendingAttempts = last.attempt_no;
      pendingText = last.response_text;
      break;
    }

    const resolver = correct ?? last;
    verdicts[item.order] = correct ? "correct" : last.verdict;
    text[item.order] = resolver.response_text;
    resolvedCount += 1;
  }

  return { verdicts, responses: text, resolvedCount, pendingAttempts, pendingText };
}

/* ------------------------------------------------------------------ *
 * Scoring
 *
 * A null verdict means the Coach could not be reached. It is not a wrong
 * answer, and it used to be scored as one: the weighted sum divided by the item
 * COUNT, so an item nobody judged was arithmetically identical to an item the
 * student got wrong. A student whose network dropped on question nine was
 * marked down for it, permanently.
 *
 * The denominator is now the number of items that actually got a verdict, and
 * the parts are carried separately so the screen can say which denominator it
 * used rather than presenting a percentage and hoping.
 * ------------------------------------------------------------------ */

const VERDICT_WEIGHT: Record<Verdict, number> = { correct: 1, partial: 0.5, incorrect: 0 };

export interface RunScore {
  /** Weighted sum over the judged items. */
  numerator: number;
  /** How many items reached a verdict, right or wrong. */
  judged: number;
  /** How many items the run contained. */
  total: number;
  /**
   * Percentage over the judged items, or null when nothing was judged at all.
   * Null is the honest answer there: returning 0 would repeat the false
   * judgement this function exists to remove, and it renders as "not scored".
   */
  percent: number | null;
}

/** The run's score, with the denominator it was computed over kept in view. */
export function scoreFor(verdicts: Record<number, Verdict | null>, total: number): RunScore {
  let numerator = 0;
  let judged = 0;
  for (const verdict of Object.values(verdicts)) {
    if (!verdict) continue; // the Coach never answered: not a zero, not counted
    numerator += VERDICT_WEIGHT[verdict] ?? 0;
    judged += 1;
  }
  return {
    numerator,
    judged,
    total,
    percent: judged === 0 ? null : Math.round((numerator / judged) * 100),
  };
}
