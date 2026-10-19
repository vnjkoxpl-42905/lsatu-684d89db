/**
 * Whether she has already opened a Report Card.
 *
 * A graded section needs to reach her home page, because grading finishes
 * minutes after she stops and nothing else on the site tells her the card
 * exists. Celia sat a section, saw a percentage, and asked where the graded
 * responses were (2026-09-08). But a prompt that stays after it has been acted
 * on is worse than no prompt: "Assigned to you" is a list of things still to
 * do, and a card she has read is not one of them.
 *
 * Kept in `localStorage` rather than on the row. `activity_assignments` has no
 * column for it, and production schema changes here go through their own path
 * rather than through a migration file in this repo, so a column is not
 * something this change can add and prove. The cost is honest and small: the
 * flag is per browser, so on a second device she is nudged once more and then
 * it settles. Nothing about her work depends on it, and the permanent record
 * is the Section Library, which lists every Attempt for as long as it exists.
 *
 * Two independent reasons a card leaves the home page, so a cleared browser
 * cannot make one linger for ever:
 *
 * - she opened it, or
 * - it went stale. A Report Card is worth interrupting her for on the night it
 *   lands and the morning after, not a fortnight later.
 */

const KEY = "lsatu:rrc:report-card-seen";

/** A card she should still be told about is fresh AND unopened. */
export const REPORT_CARD_FRESH_MS = 3 * 24 * 60 * 60 * 1000;

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    // Private windows, cleared site data, and browsers set to block storage all
    // land here. Behaving as though nothing was seen shows her one extra nudge,
    // which is the right way round to be wrong.
    return {};
  }
}

/** One card, identified the way she experiences it: this attempt at this run. */
export function reportCardKey(assignmentId: string, attemptNo: number): string {
  return `${assignmentId}:${attemptNo}`;
}

export function hasSeenReportCard(assignmentId: string, attemptNo: number): boolean {
  return reportCardKey(assignmentId, attemptNo) in read();
}

export function markReportCardSeen(assignmentId: string, attemptNo: number): void {
  try {
    const seen = read();
    seen[reportCardKey(assignmentId, attemptNo)] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    // Not being able to remember is survivable: she sees the row once more.
  }
}

/**
 * Worth putting on her home page.
 *
 * Exported so the rule lives in one place rather than being re-derived at the
 * call site, and so a test can state it without a browser.
 */
export function shouldPromptReportCard(
  gradedAt: string,
  assignmentId: string,
  attemptNo: number,
  now: number = Date.now(),
): boolean {
  if (hasSeenReportCard(assignmentId, attemptNo)) return false;
  const landed = new Date(gradedAt).getTime();
  if (!Number.isFinite(landed)) return false;
  return now - landed < REPORT_CARD_FRESH_MS;
}
