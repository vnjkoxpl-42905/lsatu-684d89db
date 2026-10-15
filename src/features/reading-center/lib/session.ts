/** One reading visit: completed chunks contribute words; pauses contribute focus time. */
export class ReadingVisit {
  private startedAt: number | null = null;
  private activeSince: number | null = null;
  private pausedSince: number | null = null;
  private activeMs = 0;
  private pausedMs = 0;
  private wordsRead = 0;

  play(now = Date.now()): void {
    if (this.activeSince != null) return;
    if (this.startedAt == null) this.startedAt = now;
    if (this.pausedSince != null) this.pausedMs += Math.max(0, now - this.pausedSince);
    this.pausedSince = null;
    this.activeSince = now;
  }

  pause(now = Date.now()): void {
    if (this.activeSince == null) return;
    this.activeMs += Math.max(0, now - this.activeSince);
    this.activeSince = null;
    this.pausedSince = now;
  }

  read(words: number): void {
    this.wordsRead += Math.max(0, words);
  }

  finish(now = Date.now()): { words_read: number; active_ms: number; paused_ms: number; started_at: string; ended_at: string } | null {
    const activeMs = this.activeMs + (this.activeSince != null ? Math.max(0, now - this.activeSince) : 0);
    const pausedMs = this.pausedMs + (this.pausedSince != null ? Math.max(0, now - this.pausedSince) : 0);
    const result = this.startedAt != null && activeMs >= 5000 && this.wordsRead > 0 ? {
      words_read: this.wordsRead,
      active_ms: activeMs,
      paused_ms: pausedMs,
      started_at: new Date(this.startedAt).toISOString(),
      ended_at: new Date(now).toISOString(),
    } : null;
    this.startedAt = this.activeSince = this.pausedSince = null;
    this.activeMs = this.pausedMs = this.wordsRead = 0;
    return result;
  }
}
