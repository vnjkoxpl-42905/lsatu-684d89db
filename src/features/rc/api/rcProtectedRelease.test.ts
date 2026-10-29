import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcDrillSession } from '../lib/rcTypes';
const db = vi.hoisted(() => ({ read: vi.fn(), filters: [] as unknown[][] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  db.filters.push(['table', table]);
  const query = { select: () => query, eq: (key: string, value: string) => { db.filters.push([key, value]); return query; }, maybeSingle: db.read };
  return query;
} } }));
import { assertRcParentReleased } from './rcProtectedRelease';
const session = (parent = 'exam') => ({ userId: 'owner', config: { practiceTestRunId: parent } }) as RcDrillSession;
describe('protected RC parent release', () => {
  beforeEach(() => { db.read.mockReset(); db.filters = []; });
  it('requires an account-owned completed parent, read directly without local recovery fallback', async () => {
    db.read.mockResolvedValue({ data: { id: 'exam', user_id: 'owner', status: 'complete' }, error: null });
    await expect(assertRcParentReleased(session(), 'owner')).resolves.toBeUndefined();
    expect(db.filters).toEqual([['table', 'practice_test_runs'], ['id', 'exam'], ['user_id', 'owner']]);
  });
  it.each([null, { id: 'exam', user_id: 'owner', status: 'in-progress' }, { id: 'exam', user_id: 'owner', status: 'abandoned' }, { id: 'exam', user_id: 'other', status: 'complete' }, { id: 'other', user_id: 'owner', status: 'complete' }])('fails closed for unavailable, sealed or mismatched parent %j', async data => {
    db.read.mockResolvedValue({ data, error: null });
    await expect(assertRcParentReleased(session(), 'owner')).rejects.toThrow('sealed');
  });
  it('fails closed on a read error', async () => {
    db.read.mockResolvedValue({ data: null, error: { message: 'offline' } });
    await expect(assertRcParentReleased(session(), 'owner')).rejects.toThrow('could not be verified');
  });
  it('preserves standalone and ordinary release authority without querying a parent', async () => {
    await expect(assertRcParentReleased(session(''), 'owner')).resolves.toBeUndefined();
    expect(db.read).not.toHaveBeenCalled();
    await expect(assertRcParentReleased(session(), 'other')).rejects.toThrow('another account');
    expect(db.read).not.toHaveBeenCalled();
  });
});
