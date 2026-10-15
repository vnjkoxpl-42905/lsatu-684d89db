import { describe, expect, it, vi } from "vitest";
import { ReadingVisit, ReadingPageExposure, ReadingSessionOutbox } from "./session";
import type { ReadingSession } from './types';

describe("reading visit statistics", () => {
  it("counts the final chunk and active/paused intervals without including initial idle time", () => {
    const visit = new ReadingVisit();
    visit.play(10000);
    visit.read(5);
    visit.pause(13000);
    visit.play(17000);
    visit.read(3);
    expect(visit.finish(21000)).toMatchObject({ words_read: 8, active_ms: 7000, paused_ms: 4000, started_at: new Date(10000).toISOString() });
    expect(visit.finish(22000)).toBeNull();
  });
  it("keeps a single fully displayed chunk and discards short or unread visits", () => {
    const visit = new ReadingVisit();
    visit.play(0);
    visit.read(8);
    expect(visit.finish(6000)?.words_read).toBe(8);
    visit.play(7000);
    visit.read(1);
    expect(visit.finish(8000)).toBeNull();
    visit.play(9000);
    expect(visit.finish(16000)).toBeNull();
  });
  it("does not count a repeated play/pause notification twice", () => {
    const visit = new ReadingVisit();
    visit.play(0);
    visit.play(1000);
    visit.read(4);
    visit.pause(6000);
    visit.pause(7000);
    expect(visit.finish(9000)).toMatchObject({ active_ms: 6000, paused_ms: 3000 });
  });
});

describe('foreground eReader page exposure', () => {
  it('excludes background time and credits the final page exactly once', () => {
    const page = new ReadingPageExposure();
    page.show(20, 40, 0);
    page.setActive(true, 0);
    page.setActive(false, 3000);
    expect(page.capture(60000)).toBe(0);
    page.setActive(true, 60000);
    expect(page.capture(62000)).toBe(20);
    expect(page.capture(70000)).toBe(0);
  });
  it('counts qualified prior and final pages but not an instant finish or repeated layout', () => {
    const page = new ReadingPageExposure();
    page.show(0, 10, 0);
    page.setActive(true, 0);
    expect(page.capture(100)).toBe(0);
    expect(page.show(0, 10, 4000)).toBe(0);
    expect(page.show(10, 25, 5000)).toBe(10);
    expect(page.capture(10000)).toBe(15);
    expect(page.capture(11000)).toBe(0);
  });
});

function pendingSession(id = 'session-one'): ReadingSession {
  return { id, passage_id: 'passage-one', reading_mode: 'ereader', wpm: 300,
    words_read: 20, active_ms: 6000, paused_ms: 0,
    started_at: '2026-10-14T10:00:00.000Z', ended_at: '2026-10-14T10:00:06.000Z' };
}
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
describe('reading statistics retry outbox', () => {
  it('retains a failed session across reload and retries its original ID, scoped to its account', async () => {
    const storage = memoryStorage();
    const box = new ReadingSessionOutbox('student-one', storage);
    box.enqueue(pendingSession());
    await expect(box.flush(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    const reloaded = new ReadingSessionOutbox('student-one', storage);
    expect(reloaded.pending).toEqual([pendingSession()]);
    expect(new ReadingSessionOutbox('student-two', storage).pending).toEqual([]);
    const send = vi.fn().mockResolvedValue(undefined);
    await reloaded.flush(send);
    expect(send).toHaveBeenCalledWith(pendingSession());
    expect(reloaded.pending).toEqual([]);
    expect(new ReadingSessionOutbox('student-one', storage).pending).toEqual([]);
  });
  it('waits for acknowledgement, deduplicates overlapping retries, and drains later records', async () => {
    const box = new ReadingSessionOutbox('student', memoryStorage());
    box.enqueue(pendingSession());
    box.enqueue(pendingSession());
    let acknowledge!: () => void;
    const send = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve; })).mockResolvedValue(undefined);
    const first = box.flush(send);
    expect(box.flush(send)).toBe(first);
    box.enqueue(pendingSession('session-two'));
    expect(box.pending).toHaveLength(2);
    expect(send).toHaveBeenCalledTimes(1);
    acknowledge();
    await first;
    expect(send).toHaveBeenCalledTimes(2);
    expect(box.pending).toEqual([]);
  });
  it('keeps a memory retry when device storage is unavailable', async () => {
    const box = new ReadingSessionOutbox('student', { ...memoryStorage(), setItem: () => { throw new Error('Storage blocked'); } });
    box.enqueue(pendingSession());
    expect(box.retainedLocally).toBe(false);
    await expect(box.flush(async () => { throw new Error('offline'); })).rejects.toThrow('offline');
    expect(box.pending).toEqual([pendingSession()]);
  });
  it('retains both tabs records when their queues were loaded before either enqueue', async () => {
    const storage = memoryStorage();
    const firstTab = new ReadingSessionOutbox('student', storage);
    const secondTab = new ReadingSessionOutbox('student', storage);
    firstTab.enqueue(pendingSession('first'));
    secondTab.enqueue(pendingSession('second'));
    expect(new ReadingSessionOutbox('student', storage).pending.map((row) => row.id)).toEqual(['first', 'second']);
    let acknowledge!: () => void;
    const send = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { acknowledge = resolve; }))
      .mockRejectedValue(new Error('second remains offline'));
    const saving = firstTab.flush(send);
    acknowledge();
    await expect(saving).rejects.toThrow('second remains offline');
    expect(new ReadingSessionOutbox('student', storage).pending.map((row) => row.id)).toEqual(['second']);
  });
  it('does not remove a concurrently enqueued record when another tab acknowledges its own', async () => {
    const storage = memoryStorage();
    const firstTab = new ReadingSessionOutbox('student', storage);
    const secondTab = new ReadingSessionOutbox('student', storage);
    firstTab.enqueue(pendingSession('first'));
    let acknowledge!: () => void;
    const saving = firstTab.flush(() => new Promise<void>((resolve) => { acknowledge = resolve; }));
    secondTab.enqueue(pendingSession('second'));
    acknowledge();
    await saving;
    expect(new ReadingSessionOutbox('student', storage).pending).toEqual([pendingSession('second')]);
  });
  it('copies legacy records before clearing the old array and preserves them when migration writes fail', () => {
    const storage = memoryStorage();
    const legacyKey = 'reading-center:pending-sessions:v1:student';
    storage.setItem(legacyKey, JSON.stringify([pendingSession()]));
    const blocked = { ...storage, setItem: () => { throw new Error('Full storage'); } };
    expect(new ReadingSessionOutbox('student', blocked).pending).toEqual([pendingSession()]);
    expect(JSON.parse(storage.getItem(legacyKey)!)).toEqual([pendingSession()]);
    const migrated = new ReadingSessionOutbox('student', storage);
    expect(migrated.pending).toEqual([pendingSession()]);
    expect(storage.getItem(legacyKey)).toBe('[]');
    expect(new ReadingSessionOutbox('student', storage).pending).toEqual([pendingSession()]);
  });
});
