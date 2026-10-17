import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ user: 'owner', row: {} as any, saved: null as any, update: vi.fn(), filters: [] as unknown[][], error: null as any }));
vi.mock('./rcSupabase.types', () => ({
  RC_SESSIONS_TABLE: 'sessions', RC_ATTEMPTS_TABLE: 'attempts', RC_ANNOTATIONS_TABLE: 'annotations',
  rcDb: { auth: { getUser: async () => ({ data: { user: { id: mock.user } } }) }, from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mock.row, error: null }) }) }),
    update: (value: unknown) => { mock.update(value); const chain: any = { eq: (...args: unknown[]) => { mock.filters.push(args); return chain; }, select: () => chain, maybeSingle: async () => ({ data: mock.saved, error: mock.error }) }; return chain; },
  }) },
}));
vi.mock('@/lib/practiceTestStore', () => ({ isActivePracticeTestDevice: vi.fn() }));
import { revealSessionResults, setSessionExcluded } from './rcProgress';
const row = () => ({ id: 'done', user_id: 'owner', passage_ids: [7], status: 'completed', excluded_from_analytics: false, started_at: '2026-10-17T12:00:00Z', completed_at: '2026-10-17T12:01:00Z', config: { source: 'manual', reveal: 'end_of_set', timing: { mode: 'unlimited' } } });
beforeEach(() => { vi.clearAllMocks(); mock.row = row(); mock.saved = null; mock.filters = []; mock.error = null; mock.user = 'owner'; });
describe('RC reveal and exclusion persistence', () => {
  it('requires an acknowledged matching reveal and scopes the update to owner, status and prior config', async () => {
    const stamp = '2026-10-17T12:02:00Z'; mock.row.config.resultsRevealedAt = stamp;
    mock.saved = structuredClone(mock.row);
    const saved = await revealSessionResults('done', 'owner');
    expect(saved.config.resultsRevealedAt).toBe(stamp);
    expect(mock.filters).toEqual(expect.arrayContaining([['id', 'done'], ['user_id', 'owner'], ['status', 'completed'], ['config', expect.any(String)]]));
  });
  it('rejects a missing acknowledgement and protected or wrong-owner sessions', async () => {
    await expect(revealSessionResults('done', 'owner')).rejects.toThrow('did not reach');
    mock.row.config.timedSectionSittingId = 'sitting';
    await expect(revealSessionResults('done', 'owner')).rejects.toThrow('Protected');
    mock.row = row(); mock.row.user_id = 'other';
    await expect(revealSessionResults('done', 'owner')).rejects.toThrow('not ready');
  });
  it('rejects exclusion without a returned matching account value', async () => {
    await expect(setSessionExcluded('done', true)).rejects.toThrow('did not reach');
    mock.saved = { id: 'done', excluded_from_analytics: true };
    await expect(setSessionExcluded('done', true)).resolves.toBeUndefined();
    expect(mock.filters).toContainEqual(['user_id', 'owner']);
  });
});
