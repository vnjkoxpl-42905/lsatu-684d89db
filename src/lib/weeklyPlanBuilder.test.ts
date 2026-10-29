import { describe, expect, it } from 'vitest';
import { moveWithinDay, prescribedSortOrder, replaceNeedsConfirm } from './weeklyPlanBuilder';

const d = (day: string, title: string) => ({ day, title });

describe('weekly plan builder order', () => {
  const items = [d('2026-10-07', 'wed-1'), d('2026-10-05', 'mon-1'), d('2026-10-07', 'wed-2'), d('2026-10-05', 'mon-2')];

  it('moves a task within its own day without touching other days', () => {
    const moved = moveWithinDay(items, 2, -1);
    expect(moved.map((i) => i.title)).toEqual(['wed-2', 'mon-1', 'wed-1', 'mon-2']);
    expect(moveWithinDay(items, 0, -1)).toBe(items);
    expect(moveWithinDay(items, 3, 1)).toBe(items);
  });

  it('publishes day by day, keeping the order shown inside each day', () => {
    const order = prescribedSortOrder(items);
    const published = items.map((it, i) => ({ ...it, sort: order[i] })).sort((a, b) => a.sort - b.sort);
    expect(published.map((p) => p.title)).toEqual(['mon-1', 'mon-2', 'wed-1', 'wed-2']);
  });

  it('asks before a stored schedule replaces tasks already in the builder', () => {
    expect(replaceNeedsConfirm(0)).toBe(false);
    expect(replaceNeedsConfirm(3)).toBe(true);
  });
});
