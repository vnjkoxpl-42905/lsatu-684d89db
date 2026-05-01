import { describe, it, expect } from 'vitest';
import { blankSrs, review, isDue } from '@/bootcamps/main-conclusion/lib/srs';

describe('SM-2 SRS', () => {
  it('first correct review schedules 1 day out', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const next = review(blankSrs(start), 5, start);
    expect(next.interval_days).toBe(1);
    expect(next.reps).toBe(1);
    expect(new Date(next.due_at_iso).getTime() - start.getTime()).toBe(86400 * 1000);
  });

  it('second correct review schedules 6 days', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const a = review(blankSrs(start), 5, start);
    const b = review(a, 5, start);
    expect(b.interval_days).toBe(6);
  });

  it('third correct review uses ease multiplier', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    let s = review(blankSrs(start), 5, start);
    s = review(s, 5, start);
    s = review(s, 5, start);
    expect(s.interval_days).toBeGreaterThan(6);
  });

  it('failure resets interval and increments lapses', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const a = review(blankSrs(start), 5, start);
    const fail = review(a, 1, start);
    expect(fail.lapses).toBe(1);
    expect(fail.reps).toBe(0);
    expect(fail.interval_days).toBe(1);
  });

  it('ease floor is 1.3', () => {
    let s = blankSrs(new Date());
    for (let i = 0; i < 10; i++) s = review(s, 0, new Date());
    expect(s.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('isDue is true at exactly due time', () => {
    const t0 = new Date('2026-01-01T00:00:00Z');
    const s = review(blankSrs(t0), 5, t0);
    const due = new Date(s.due_at_iso);
    expect(isDue(s, due)).toBe(true);
  });
});
