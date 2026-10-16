import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  loadPracticeSession: vi.fn(),
  savePracticeSessionSnapshot: vi.fn(),
  completePracticeSession: vi.fn(),
  resetPracticeSession: vi.fn(),
}));

vi.mock('@/bootcamps/main-conclusion/lib/practiceSessionStore', () => ({ ...store }));

import { loadGuidedDrillSession } from './guidedDrillSession';

describe('loading a guided Run Record renamed from slug to drill id', () => {
  beforeEach(() => {
    store.loadPracticeSession.mockReset();
  });

  it('reads the slug key only when the drill-id key has no row', async () => {
    const legacyRecord = { pool_slug: 'guided::slug:parallel-flaw' };
    store.loadPracticeSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacyRecord);

    await expect(
      loadGuidedDrillSession(
        'user_1',
        'guided::drill:gd_7',
        'guided::slug:parallel-flaw',
      ),
    ).resolves.toBe(legacyRecord);
    expect(store.loadPracticeSession.mock.calls).toEqual([
      ['user_1', 'guided::drill:gd_7'],
      ['user_1', 'guided::slug:parallel-flaw'],
    ]);
  });

  it('never resurrects a slug-keyed run when the drill-id key already has a row', async () => {
    const currentRecord = {
      pool_slug: 'guided::drill:gd_7',
      status: 'completed',
    };
    store.loadPracticeSession.mockResolvedValueOnce(currentRecord);

    await expect(
      loadGuidedDrillSession(
        'user_1',
        'guided::drill:gd_7',
        'guided::slug:parallel-flaw',
      ),
    ).resolves.toBe(currentRecord);
    expect(store.loadPracticeSession).toHaveBeenCalledTimes(1);
  });
});
