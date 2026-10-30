import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ single: vi.fn(), eq: vi.fn(), is: vi.fn(), not: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  const query = { select: () => query, eq: (...args: unknown[]) => { mock.eq(...args); return query; }, is: (...args: unknown[]) => { mock.is(...args); return query; }, not: (...args: unknown[]) => { mock.not(...args); return query; }, maybeSingle: mock.single };
  return query;
} } }));
import { fetchOwnedSectionHistoryItem } from './sectionHistory';
const row = { id: 'history', user_id: 'owner', mode: 'full-section', practice_test_run_id: null, completed_at: '2026-10-28T12:00:00Z', created_at: '2026-10-28T11:00:00Z', questions_json: [] };
beforeEach(() => { vi.clearAllMocks(); mock.single.mockResolvedValue({ data: row, error: null }); });
describe('exact section detail release boundary', () => {
  it('reads only the exact owned completed standalone full-section row', async () => {
    expect(await fetchOwnedSectionHistoryItem('owner', 'history')).toMatchObject({ id: 'history', completedAt: row.completed_at });
    expect(mock.eq.mock.calls).toEqual([['id', 'history'], ['user_id', 'owner'], ['mode', 'full-section']]);
    expect(mock.is).toHaveBeenCalledWith('practice_test_run_id', null);
    expect(mock.not).toHaveBeenCalledWith('completed_at', 'is', null);
  });
  it.each([
    null, { ...row, id: 'other' }, { ...row, user_id: 'other' }, { ...row, mode: 'adaptive' },
    { ...row, practice_test_run_id: 'pt' }, { ...row, completed_at: null },
    { ...row, completed_at: undefined }, { ...row, completed_at: 'invalid' },
  ])('does not substitute created_at or current time for unavailable persisted release %j', async (data) => {
    mock.single.mockResolvedValue({ data, error: null });
    expect(await fetchOwnedSectionHistoryItem('owner', 'history')).toBeNull();
  });
  it('surfaces read failures without rendering saved answers', async () => {
    mock.single.mockResolvedValue({ data: null, error: new Error('offline') });
    await expect(fetchOwnedSectionHistoryItem('owner', 'history')).rejects.toThrow('offline');
  });
});
