import type { ReadingSession } from './types';

/** One visit records displayed words and the foreground intervals supplied by the reader. */
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

/** Counts a displayed e-Reader page once after five foreground seconds.
 * This records display exposure, not whether the reader understood the words. */
export class ReadingPageExposure {
  private start = 0;
  private end = 0;
  private visibleSince: number | null = null;
  private visibleMs = 0;
  private credited = false;

  get hasPage(): boolean { return this.end > this.start; }

  setActive(active: boolean, now = Date.now()): void {
    if (this.visibleSince != null) this.visibleMs += Math.max(0, now - this.visibleSince);
    this.visibleSince = active && this.hasPage ? now : null;
  }

  show(start: number, end: number, now = Date.now()): number {
    if (start === this.start && end === this.end) return 0;
    const read = this.capture(now);
    const active = this.visibleSince != null;
    this.start = Math.max(0, start);
    this.end = Math.max(this.start, end);
    this.visibleMs = 0;
    this.credited = false;
    this.visibleSince = active && this.hasPage ? now : null;
    return read;
  }

  capture(now = Date.now()): number {
    const elapsed = this.visibleMs + (this.visibleSince != null ? Math.max(0, now - this.visibleSince) : 0);
    if (this.credited || !this.hasPage || elapsed < 5000) return 0;
    this.credited = true;
    return this.end - this.start;
  }

  reset(): void {
    this.start = this.end = this.visibleMs = 0;
    this.visibleSince = null;
    this.credited = false;
  }
}

type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const legacyStoragePrefix = 'reading-center:pending-sessions:v1:';
const storagePrefix = 'reading-center:pending-session:v2:';

function validSession(value: unknown): value is ReadingSession {
  if (!value || typeof value !== 'object') return false;
  const row = value as ReadingSession;
  return typeof row.id === 'string' && typeof row.passage_id === 'string'
    && ['serial', 'flow', 'highlight', 'scroll', 'ereader'].includes(row.reading_mode)
    && [row.wpm, row.words_read, row.active_ms, row.paused_ms].every((n) => Number.isSafeInteger(n) && n >= 0)
    && Number.isFinite(Date.parse(row.started_at)) && Number.isFinite(Date.parse(row.ended_at));
}

/** Acknowledged cloud writes alone remove records. UUIDs make retries idempotent. */
export class ReadingSessionOutbox {
  private records: ReadingSession[] = [];
  private inFlight: Promise<void> | null = null;
  retainedLocally = true;
  private readonly prefix: string;
  private readonly legacyKey: string;

  constructor(userId: string, private readonly storage?: SessionStorage) {
    this.prefix = `${storagePrefix}${encodeURIComponent(userId)}:`;
    this.legacyKey = `${legacyStoragePrefix}${userId}`;
    this.restore();
  }

  get pending(): readonly ReadingSession[] { return this.records; }

  enqueue(record: ReadingSession): void {
    if (!this.records.some((row) => row.id === record.id)) this.records.push(record);
    this.persist();
  }

  flush(send: (record: ReadingSession) => Promise<unknown>): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.drain(send).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async drain(send: (record: ReadingSession) => Promise<unknown>): Promise<void> {
    this.restore();
    this.persist();
    while (this.records.length) {
      const record = this.records[0];
      await send(record);
      // Never rewrite another tab's pending records when acknowledging this one.
      try { this.storage?.removeItem(`${this.prefix}${record.id}`); } catch { /* A later retry is safe with the same UUID. */ }
      this.records = this.records.filter((row) => row.id !== record.id);
    }
  }

  private restore(): void {
    try {
      if (!this.storage) throw new Error('Local storage unavailable');
      const merge = (record: ReadingSession) => {
        if (!this.records.some((row) => row.id === record.id)) this.records.push(record);
      };
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (!key?.startsWith(this.prefix)) continue;
        const raw = this.storage.getItem(key);
        if (!raw) continue;
        const record: unknown = JSON.parse(raw);
        if (!validSession(record) || key !== `${this.prefix}${record.id}`) throw new Error('Invalid pending reading session');
        merge(record);
      }
      const legacyRaw = this.storage.getItem(this.legacyKey);
      if (legacyRaw) {
        const legacy: unknown = JSON.parse(legacyRaw);
        if (!Array.isArray(legacy) || !legacy.every(validSession)) throw new Error('Invalid pending reading sessions');
        legacy.forEach(merge);
        // Copy every legacy record before emptying the shared array. Failed copies
        // leave the original intact, and duplicate copies retain the same UUID.
        for (const record of legacy) this.storage.setItem(`${this.prefix}${record.id}`, JSON.stringify(record));
        if (legacy.length) this.storage.setItem(this.legacyKey, '[]');
      }
      this.retainedLocally = true;
    } catch { this.retainedLocally = false; }
  }

  private persist(): void {
    try {
      if (!this.storage) throw new Error('Local storage unavailable');
      for (const record of this.records) this.storage.setItem(`${this.prefix}${record.id}`, JSON.stringify(record));
      this.retainedLocally = true;
    } catch { this.retainedLocally = false; }
  }
}

const outboxes = new Map<string, ReadingSessionOutbox>();
export function readingSessionOutbox(userId: string): ReadingSessionOutbox {
  let outbox = outboxes.get(userId);
  if (!outbox) {
    let storage: SessionStorage | undefined;
    try { storage = window.localStorage; } catch { /* The visible retry warning explains unavailable persistence. */ }
    outbox = new ReadingSessionOutbox(userId, storage);
    outboxes.set(userId, outbox);
  }
  return outbox;
}
