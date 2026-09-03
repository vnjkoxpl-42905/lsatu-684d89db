import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  loadPracticeSession: vi.fn(),
  savePracticeSessionSnapshot: vi.fn(),
  completePracticeSession: vi.fn(),
}));

vi.mock('@/bootcamps/main-conclusion/lib/practiceSessionStore', () => ({
  ...store,
}));

import { loadDrillResumeSession } from './drillResumeSession';

describe('loading a renamed Run Record', () => {
  beforeEach(() => {
    store.loadPracticeSession.mockReset();
  });

  it('reads the legacy question-list key only when the identity key has no row', async () => {
    const legacyRecord = { pool_slug: 'drill::type-drill::set-old' };
    store.loadPracticeSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacyRecord);

    await expect(
      loadDrillResumeSession(
        'user_1',
        'drill::bootcamp-day::3::homework',
        'drill::type-drill::set-old',
      ),
    ).resolves.toBe(legacyRecord);
    expect(store.loadPracticeSession.mock.calls).toEqual([
      ['user_1', 'drill::bootcamp-day::3::homework'],
      ['user_1', 'drill::type-drill::set-old'],
    ]);
  });

  it('never resurrects an old run when the identity key already has a row', async () => {
    const currentRecord = {
      pool_slug: 'drill::bootcamp-day::3::homework',
      status: 'completed',
    };
    store.loadPracticeSession.mockResolvedValueOnce(currentRecord);

    await expect(
      loadDrillResumeSession(
        'user_1',
        'drill::bootcamp-day::3::homework',
        'drill::type-drill::set-old',
      ),
    ).resolves.toBe(currentRecord);
    expect(store.loadPracticeSession).toHaveBeenCalledTimes(1);
  });
});
