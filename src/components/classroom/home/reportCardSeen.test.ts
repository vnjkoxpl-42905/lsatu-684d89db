import { beforeEach, describe, expect, it } from "vitest";
import {
  REPORT_CARD_FRESH_MS,
  hasSeenReportCard,
  markReportCardSeen,
  shouldPromptReportCard,
} from "./reportCardSeen";

/**
 * A graded section has to reach her home page, and then stop.
 *
 * Celia sat a section, saw a percentage, and asked where the graded responses
 * were: grading finishes minutes after she stops, by which point the run has
 * left "Assigned to you" because it is completed. So the card announces itself
 * there. The other half matters just as much: "Assigned to you" is work still
 * outstanding, and a card she has read is not outstanding.
 */
describe("when a Report Card is worth her home page", () => {
  const iso = (ms: number) => new Date(ms).toISOString();
  const NOW = Date.parse("2026-09-08T09:00:00Z");

  beforeEach(() => localStorage.clear());

  it("prompts for a card she has not opened", () => {
    expect(shouldPromptReportCard(iso(NOW - 60_000), "a1", 1, NOW)).toBe(true);
  });

  it("stops the moment she opens it, so it does not linger as work to do", () => {
    markReportCardSeen("a1", 1);
    expect(shouldPromptReportCard(iso(NOW - 60_000), "a1", 1, NOW)).toBe(false);
  });

  it("keeps each Attempt separate, because a second run earns a second card", () => {
    markReportCardSeen("a1", 1);
    expect(hasSeenReportCard("a1", 1)).toBe(true);
    expect(hasSeenReportCard("a1", 2)).toBe(false);
    expect(shouldPromptReportCard(iso(NOW - 60_000), "a1", 2, NOW)).toBe(true);
  });

  it("goes quiet on its own once the card is old, even if she never opened it", () => {
    // The flag lives in this browser, so a cleared one would otherwise nag for
    // ever. A Report Card is news on the night it lands, not a fortnight later.
    const stale = NOW - REPORT_CARD_FRESH_MS - 1;
    expect(shouldPromptReportCard(iso(stale), "a1", 1, NOW)).toBe(false);
  });

  it("says no rather than throwing when the date is unusable", () => {
    expect(shouldPromptReportCard("not a date", "a1", 1, NOW)).toBe(false);
  });

  it("treats unreadable storage as nothing seen, which errs toward showing her", () => {
    localStorage.setItem("lsatu:rrc:report-card-seen", "{ not json");
    expect(hasSeenReportCard("a1", 1)).toBe(false);
    expect(shouldPromptReportCard(iso(NOW - 60_000), "a1", 1, NOW)).toBe(true);
  });
});
