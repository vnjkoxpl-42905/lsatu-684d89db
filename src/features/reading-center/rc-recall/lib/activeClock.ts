/**
 * Active practice time for one RC Training section.
 *
 * Time counts only while the practice screen is open and running. It stops when
 * the student leaves the practice route or the page is hidden for good (pagehide),
 * and a restored clock starts from the saved totals, so time away is never added.
 * Slow silent thinking is not inactivity: nothing here pauses on idle.
 *
 * The clock never reads the time itself. Callers pass `now`, which keeps it
 * deterministic to test.
 */
export interface ClockTotals { sectionMs: number; passageMs: number }

const clean = (ms: unknown): number => (typeof ms === "number" && Number.isFinite(ms) && ms > 0 ? ms : 0);

export class ActiveClock {
  private sectionBase: number;
  private passageBase: number;
  private since: number | null = null;

  constructor(initial: Partial<ClockTotals> = {}) {
    this.sectionBase = clean(initial.sectionMs);
    this.passageBase = clean(initial.passageMs);
  }

  get running(): boolean { return this.since !== null; }

  start(now: number): void { if (this.since === null) this.since = now; }

  /** Bank the time since the last start. Idempotent. */
  pause(now: number): void {
    if (this.since === null) return;
    const delta = Math.max(0, now - this.since);
    this.sectionBase += delta;
    this.passageBase += delta;
    this.since = null;
  }

  /** A new passage starts its own count; the section keeps running. */
  resetPassage(now: number): void {
    const wasRunning = this.running;
    this.pause(now);
    this.passageBase = 0;
    if (wasRunning) this.start(now);
  }

  snapshot(now: number): ClockTotals {
    const live = this.since === null ? 0 : Math.max(0, now - this.since);
    return { sectionMs: this.sectionBase + live, passageMs: this.passageBase + live };
  }
}

export const toSeconds = (ms: number): number => Math.floor(Math.max(0, ms) / 1000);
