import { beforeEach, expect, it, vi } from 'vitest';
const store = vi.hoisted(() => ({ actor: 'actor', rows: [] as Record<string, unknown>[], insert: vi.fn(), unavailable: false, ranges: [] as number[] }));
vi.mock('./rcSupabase.types', () => ({ rcDb: {
  auth: { getUser: async () => ({ data: { user: { id: store.actor } }, error: null }) },
  from: () => {
    const filters = new Map<string, unknown>();
    const query = { select() { return query; }, eq(key: string, value: unknown) { filters.set(key, value); return query; },
      like() { return query; }, order() { return query; },
      async maybeSingle() { return { data: store.rows.find(row => [...filters].every(([key, value]) => row[key] === value)) ?? null, error: store.unavailable ? { code: '42P01' } : null }; },
      async range(from: number, to: number) { store.ranges.push(from); return { data: store.rows.slice(from, to + 1), error: store.unavailable ? { code: '42P01' } : null }; },
      insert(row: Record<string, unknown>) { store.insert(row); return { select: () => ({ single: async () => { store.rows.push(row); return { data: row, error: null }; } }) }; },
    }; return query;
  },
} }));
import { createRcExposureRequest, getRcExposureHistory, recordRcPassageExposure } from './rcExposure';
beforeEach(() => { store.actor = 'actor'; store.rows = []; store.unavailable = false; store.ranges = []; store.insert.mockClear(); });
it('retries the same event without a duplicate insert and records passage/source separately from answers', async () => {
  const request = createRcExposureRequest('actor', 7, 'preview');
  await recordRcPassageExposure(request); await recordRcPassageExposure(request);
  expect(store.insert).toHaveBeenCalledTimes(1);
  expect(store.rows[0]).toEqual({ id: request.id, user_id: 'actor', question_id: 'rc:v1:passage:7:preview' });
});
it('does not treat a missing exposure table as empty history or a successful reveal', async () => {
  store.unavailable = true;
  await expect(getRcExposureHistory('actor')).rejects.toThrow('unknown');
  await expect(recordRcPassageExposure(createRcExposureRequest('actor', 7, 'preview'))).rejects.toThrow('unavailable');
  expect(store.insert).not.toHaveBeenCalled();
});
it('paginates all exposures beyond one thousand and rejects an account mismatch', async () => {
  store.rows = Array.from({ length: 1001 }, (_, index) => ({ id: String(index), user_id: 'actor', question_id: `rc:v1:passage:${index + 1}:player` }));
  expect((await getRcExposureHistory('actor')).size).toBe(1001);
  expect(store.ranges).toEqual([0, 1000]);
  store.actor = 'other';
  await expect(getRcExposureHistory('actor')).rejects.toThrow('account changed');
});
it('rejects a replay UUID that identifies different passage work', async () => {
  const request = createRcExposureRequest('actor', 7, 'preview');
  store.rows = [{ id: request.id, user_id: 'actor', question_id: 'rc:v1:passage:9:preview' }];
  await expect(recordRcPassageExposure(request)).rejects.toThrow('did not match');
  expect(store.insert).not.toHaveBeenCalled();
});
