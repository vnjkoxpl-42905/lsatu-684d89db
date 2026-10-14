import { describe, expect, it } from 'vitest';
import { matchesPublishedBuilder, newPublishJob } from './weeklyPlanPublish';

describe('published builder acknowledgment', () => {
  it('clears only the unchanged published snapshot', () => {
    const saved = newPublishJob({ teacherId: 't', studentId: 's', title: 'Week', weekStart: '2026-10-05', drafts: [{ day: '2026-10-05', title: 'Read' }] });
    const current = { title: saved.title, weekStart: saved.weekStart, items: saved.drafts };
    expect(matchesPublishedBuilder(current, saved)).toBe(true);
    expect(matchesPublishedBuilder({ ...current, items: [...current.items, { day: '2026-10-06', title: 'New edit' }] }, saved)).toBe(false);
    expect(matchesPublishedBuilder({ ...current, title: 'New title' }, saved)).toBe(false);
    expect(matchesPublishedBuilder({ ...current, weekStart: '2026-10-12' }, saved)).toBe(false);
  });
});
