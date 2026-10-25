import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const owner = '11111111-1111-4111-8111-111111111111';
const state = vi.hoisted(() => ({ local: new Map<string, unknown>(), cloud: null as Record<string, unknown> | null,
  actor: '11111111-1111-4111-8111-111111111111', switchAfterWrite: false,
  reject: false, zeroRows: false, conflict: false, insertConflict: false, returnedWrongOwner: false, writes: [] as unknown[], background: vi.fn() }));
vi.mock('./LocalStoragePersistence', () => ({ LocalStoragePersistence: class {} }));
vi.mock('./IndexedDBPersistence', () => ({ IndexedDBPersistence: class {} }));
vi.mock('./V1Persistence', () => ({ V1Persistence: class {
  async get(_table: string, id: string) { return state.local.get(id) ?? null; }
  async set(_table: string, id: string, value: unknown) { state.local.set(id, value); }
} }));
vi.mock('@/contexts/AuthContext', () => { const user = { id: '11111111-1111-4111-8111-111111111111' }; return { useAuth: () => ({ user }) }; });
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: state.actor } }, error: null }) }, from: () => {
  let operation = 'read'; let payload: Record<string, unknown>; const filters = new Map<string, unknown>();
  const response = () => {
    if (operation === 'read') return { data: state.cloud ? { ...state.cloud } : null, error: null };
    state.writes.push(payload);
    if (state.reject) return { data: null, error: new Error('network unavailable') };
    if (operation === 'insert' && state.insertConflict) { state.insertConflict = false; state.cloud = { ...payload, data: { ...(payload.data as object), completed_drills: ['OTHER-DEVICE'] } }; return { data: null, error: { code: '23505' } }; }
    if (state.conflict) { state.conflict = false; state.cloud = { ...state.cloud!, data: { ...(state.cloud!.data as object), completed_drills: ['OTHER-DEVICE'] } }; return { data: null, error: null }; }
    if (state.zeroRows || operation === 'update' && JSON.stringify(state.cloud?.data) !== filters.get('data')) return { data: null, error: null };
    state.cloud = operation === 'insert' ? payload : { ...state.cloud, ...payload };
    if (state.switchAfterWrite) state.actor = 'admin-B';
    return { data: { ...state.cloud, ...(state.returnedWrongOwner ? { user_id: 'other' } : {}) }, error: null };
  };
  const builder = { select: vi.fn().mockReturnThis(), eq: vi.fn((key: string, value: unknown) => { filters.set(key, value); return builder; }),
    update: vi.fn((value: Record<string, unknown>) => { operation = 'update'; payload = value; return builder; }),
    insert: vi.fn((value: Record<string, unknown>) => { operation = 'insert'; payload = value; return builder; }),
    upsert: state.background,
    maybeSingle: vi.fn(async () => response()),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: state.cloud ? [state.cloud] : [], error: null }).then(resolve),
  }; return builder;
} } }));
import { SupabaseSyncedPersistence } from './SupabaseSyncedPersistence';
import { __setPersistenceForTests } from './factory';
import { progressIdFor, useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
const id = progressIdFor(owner);
const progress = () => ({ id, user_id: owner, unlocked_modules: ['M1'], unlocked_routes: [], completed_lessons: ['old-lesson'], completed_drills: [], completed_milestones: [], completed_hard_sections: [], completed_capstones: [], updated_at: '2026-09-30T12:00:00.000Z' });
beforeEach(() => {
  state.local.clear(); state.reject = false; state.zeroRows = false; state.conflict = false; state.insertConflict = false; state.returnedWrongOwner = false; state.writes = []; state.background.mockReset();
  state.actor = owner; state.switchAfterWrite = false;
  state.cloud = { user_id: owner, table_name: 'module_progress', record_id: id, data: progress() };
});
afterEach(() => { __setPersistenceForTests(null); });
it('real module hook rejects failed transport and retains earlier saved completion', async () => {
  const store = new SupabaseSyncedPersistence(owner); __setPersistenceForTests(store);
  const { result } = renderHook(() => useModuleProgress(owner)); await waitFor(() => expect(result.current.progress).not.toBeNull());
  state.reject = true;
  await act(async () => { await expect(result.current.markDrillComplete('MC-DRL-CT')).rejects.toThrow('network unavailable'); });
  expect(result.current.progress?.completed_drills).toEqual([]);
  expect((await store.get<{ completed_drills: string[] }>('module_progress', id))?.completed_drills).toEqual([]);
  expect(state.background).not.toHaveBeenCalled();
});
it('real module hook retries completion, preserves another device append, and reflects exact account result', async () => {
  const store = new SupabaseSyncedPersistence(owner); __setPersistenceForTests(store);
  const { result } = renderHook(() => useModuleProgress(owner)); await waitFor(() => expect(result.current.progress).not.toBeNull());
  state.conflict = true;
  await act(async () => { await result.current.markDrillComplete('MC-DRL-CT'); });
  expect(result.current.progress?.completed_drills).toEqual(['OTHER-DEVICE', 'MC-DRL-CT']);
  expect(result.current.progress?.completed_lessons).toEqual(['old-lesson']);
  expect(state.writes).toHaveLength(2); await store.flush(); expect(state.background).not.toHaveBeenCalled();
});
it('zero affected rows never acknowledge completion and bounded CAS retries retain local state', async () => {
  const store = new SupabaseSyncedPersistence(owner); await store.ready(); state.zeroRows = true;
  await expect(store.set('module_progress', id, { ...progress(), completed_drills: ['new'] })).rejects.toThrow('another session');
  expect(state.writes).toHaveLength(3);
  expect((await store.get<{ completed_drills: string[] }>('module_progress', id))?.completed_drills).toEqual([]);
});
it('does not acknowledge returned foreign ownership or publish it to local cache', async () => {
  const store = new SupabaseSyncedPersistence(owner); await store.ready(); state.returnedWrongOwner = true;
  await expect(store.set('module_progress', id, { ...progress(), completed_drills: ['new'] })).rejects.toThrow('did not acknowledge');
  expect((await store.get<{ completed_drills: string[] }>('module_progress', id))?.completed_drills).toEqual([]);
});
it('rereads and merges an insert conflict instead of replacing the other device initial row', async () => {
  state.cloud = null; const store = new SupabaseSyncedPersistence(owner); await store.ready(); state.insertConflict = true;
  await store.set('module_progress', id, { ...progress(), completed_drills: ['new'] });
  expect((await store.get<{ completed_drills: string[] }>('module_progress', id))?.completed_drills).toEqual(['OTHER-DEVICE', 'new']);
  expect(state.writes).toHaveLength(2);
});
it('surfaces initial module save failure and retries without publishing an unconfirmed local default', async () => {
  state.cloud = null; state.reject = true;
  const store = new SupabaseSyncedPersistence(owner); __setPersistenceForTests(store);
  const { result } = renderHook(() => useModuleProgress(owner));
  await waitFor(() => expect(result.current.loadError).toContain('could not be confirmed'));
  expect(result.current.progress).toBeNull(); expect(await store.get('module_progress', id)).toBeNull();
  state.reject = false; act(() => { result.current.retryLoad(); });
  await waitFor(() => expect(result.current.progress).not.toBeNull());
  expect(result.current.loadError).toBeNull(); expect(state.background).not.toHaveBeenCalled();
});
it('rejects an admin actor switch after response rather than acknowledging old-owner progress locally', async () => {
  const store = new SupabaseSyncedPersistence(owner); await store.ready(); state.switchAfterWrite = true;
  await expect(store.set('module_progress', id, { ...progress(), completed_drills: ['new'] })).rejects.toThrow('account changed');
  expect((await store.get<{ completed_drills: string[] }>('module_progress', id))?.completed_drills).toEqual([]);
});
it('denies a prior-owner store callback before transport even when new actor could be an admin', async () => {
  const store = new SupabaseSyncedPersistence(owner); await store.ready(); state.actor = 'admin-B';
  await expect(store.set('module_progress', id, { ...progress(), completed_drills: ['new'] })).rejects.toThrow('account changed');
  expect(state.writes).toHaveLength(0);
});
it('preserves and unions future completion and unlock fields using the server prefix contract', async () => {
  state.cloud!.data = { ...progress(), completed_future: ['saved'], unlocked_future: ['old'], extension: { keep: true } };
  const store = new SupabaseSyncedPersistence(owner); await store.ready();
  await store.set('module_progress', id, { ...progress(), completed_future: ['new'], unlocked_future: ['old', 'new-route'] });
  const saved = await store.get<Record<string, unknown>>('module_progress', id);
  expect(saved?.completed_future).toEqual(['saved', 'new']);
  expect(saved?.unlocked_future).toEqual(['old', 'new-route']);
  expect(saved?.extension).toEqual({ keep: true });
});
