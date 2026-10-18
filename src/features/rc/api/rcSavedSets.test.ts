import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RcSavedPayload } from '../lib/rcSavedSetCodec';
const m = vi.hoisted(() => ({ actor: 'owner', data: null as unknown, error: null as { message: string } | null, insert: vi.fn(), ranges: [] as number[][], orders: [] as string[], pages: null as unknown[][] | null, filters: [] as unknown[][] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: m.actor } }, error: null }) }, from: () => {
  const chain = { select: () => chain, eq: (...args: unknown[]) => { m.filters.push(args); return chain; }, order: (column: string) => { m.orders.push(column); return chain; }, range: async (from: number, to: number) => { m.ranges.push([from, to]); return { data: m.pages ? m.pages[Math.floor(from / 1000)] ?? [] : m.data, error: m.error }; }, maybeSingle: async () => ({ data: m.data, error: m.error }), single: async () => ({ data: m.data, error: m.error }), insert: (value: unknown) => { m.insert(value); return chain; }, update: () => chain }; return chain;
} } }));
import { getRcSavedSet, listRcSavedSets, renameRcSet, saveRcSet } from './rcSavedSets';
const payload: RcSavedPayload = { kind: 'rc-builder', version: 1, mode: 'recipe', config: { reveal: 'end_of_set', timing: { mode: 'unlimited' } }, filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'fresh', preptestMin: 101, preptestMax: 148 }, count: 1, passageIds: [], questionIds: [] };
const id = '11111111-1111-4111-8111-111111111111';
const row = () => ({ id, user_id: 'owner', name: 'My recipe', filter_state: payload, question_ids: [], created_at: '2026-10-17T12:00:00Z' });
beforeEach(() => { m.actor = 'owner'; m.data = null; m.error = null; m.insert.mockReset(); m.filters = []; m.orders = []; m.ranges = []; m.pages = null; });
describe('RC saved definitions account persistence', () => {
  it('saves empty-ID recipes with an acknowledged stable identity', async () => {
    m.data = row();
    expect((await saveRcSet('owner', 'My recipe', payload, id)).payload).toEqual(payload);
    expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ id, user_id: 'owner', question_ids: [] }));
  });
  it('requires owner and discriminator for reads and preserves unknown versions', async () => {
    m.data = [{ ...row(), filter_state: { kind: 'rc-builder', version: 2 } }];
    const rows = await listRcSavedSets('owner');
    expect(rows[0].payload).toBeNull(); expect(rows[0].problem).toMatch(/newer version/);
    expect(m.filters).toContainEqual(['user_id', 'owner']); expect(m.filters).toContainEqual(['filter_state->>kind', 'rc-builder']);
    m.actor = 'other'; await expect(getRcSavedSet('owner', id)).rejects.toThrow('account changed');
  });
  it('does not claim success for missing or mismatched acknowledgements', async () => {
    await expect(renameRcSet('owner', id, 'New name')).rejects.toThrow('did not reach');
    m.data = { ...row(), name: 'Some other save' };
    await expect(saveRcSet('owner', 'My recipe', payload, id)).rejects.toThrow('did not match');
  });
  it('recovers an already-created identical command without making another identity', async () => {
    m.data = row(); m.error = { message: 'duplicate id' };
    // The follow-up lookup succeeds even if the original insert response was lost.
    m.insert.mockImplementation(() => { queueMicrotask(() => { m.error = null; }); });
    expect((await saveRcSet('owner', 'My recipe', payload, id)).id).toBe(id);
    expect(m.insert).toHaveBeenCalledTimes(1);
  });
  it('pages beyond one thousand with deterministic ordering and deduplicates overlaps', async () => {
    const first = Array.from({ length: 1000 }, (_, index) => ({ ...row(), id: `saved-${index}` }));
    m.pages = [first, [first[999], { ...row(), id: 'saved-1000' }]];
    const values = await listRcSavedSets('owner');
    expect(values).toHaveLength(1001); expect(new Set(values.map(value => value.id)).size).toBe(1001);
    expect(m.ranges).toEqual([[0, 999], [1000, 1999]]);
    expect(m.orders).toEqual(['created_at', 'id', 'created_at', 'id']);
  });

});
