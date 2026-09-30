import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  local: new Map<string, unknown>(),
  remote: [] as Array<{ table_name: string; record_id: string; data: unknown }>,
  remoteRead: null as Promise<{ data: unknown[]; error: null }> | null,
  upserts: [] as unknown[],
}));

vi.mock('./LocalStoragePersistence', () => ({ LocalStoragePersistence: class {} }));
vi.mock('./IndexedDBPersistence', () => ({ IndexedDBPersistence: class {} }));
vi.mock('./V1Persistence', () => ({
  V1Persistence: class {
    async get(_table: string, id: string) { return state.local.get(id) ?? null; }
    async set(_table: string, id: string, value: unknown) { state.local.set(id, value); }
    async transaction<T>(fn: (tx: { get: <U>(table: string, id: string) => Promise<U | null>; set: <U>(table: string, id: string, value: U) => Promise<void> }) => Promise<T>) {
      return fn({
        get: async <U>(_table: string, id: string) => (state.local.get(id) ?? null) as U | null,
        set: async <U>(_table: string, id: string, value: U) => { state.local.set(id, value); },
      });
    }
  },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => state.remoteRead ?? Promise.resolve({ data: state.remote, error: null }) }),
      upsert: async (rows: unknown) => {
        state.upserts.push(rows);
        return { error: null };
      },
    }),
  },
}));

import { SupabaseSyncedPersistence } from './SupabaseSyncedPersistence';
import { __setPersistenceForTests } from './factory';
import { loadDrillResumeSession, hasPendingSectionDeviceBackup } from '@/lib/drillResumeSession';
import { PRACTICE_SESSION_DATA_VERSION, practiceSessionIdFor } from '@/bootcamps/main-conclusion/lib/practiceSessionStore';

vi.mock('@/lib/practiceTestStore', () => ({ isActivePracticeTestDevice: vi.fn(async () => false) }));

describe('practice-session hydration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    state.local.clear();
    state.remote = [];
    state.remoteRead = null;
    state.upserts = [];
  });
  afterEach(() => {
    __setPersistenceForTests(null);
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('keeps a newer local answer and sends it to the account', async () => {
    const local = { updated_at: '2026-09-27T10:01:00Z', attempts: ['answer A'], elapsed_ms: 9000 };
    const cloud = { updated_at: '2026-09-27T10:00:00Z', attempts: [], elapsed_ms: 0 };
    state.local.set('section-1', local);
    state.remote = [{ table_name: 'practice_sessions', record_id: 'section-1', data: cloud }];

    const store = new SupabaseSyncedPersistence('student-1');
    await store.ready();
    expect(await store.get('practice_sessions', 'section-1')).toEqual(local);
    await store.flush();
    expect(state.upserts).toEqual([[{
      user_id: 'student-1', table_name: 'practice_sessions', record_id: 'section-1', data: local,
    }]]);
  });

  it('uses a newer account row when this device has an older copy', async () => {
    const local = { updated_at: '2026-09-27T10:00:00Z', attempts: [] };
    const cloud = { updated_at: '2026-09-27T10:01:00Z', attempts: ['answer B'] };
    state.local.set('section-2', local);
    state.remote = [{ table_name: 'practice_sessions', record_id: 'section-2', data: cloud }];

    const store = new SupabaseSyncedPersistence('student-1');
    await store.ready();
    expect(await store.get('practice_sessions', 'section-2')).toEqual(cloud);
  });

  it('does not replace an answer written while hydration is in flight', async () => {
    let release!: (value: { data: unknown[]; error: null }) => void;
    state.remoteRead = new Promise((resolve) => { release = resolve; });
    const store = new SupabaseSyncedPersistence('student-1');
    const answer = { updated_at: '2026-09-27T10:01:00Z', attempts: ['answer C'] };
    await store.set('practice_sessions', 'section-3', answer);
    release({ data: [{
      table_name: 'practice_sessions', record_id: 'section-3',
      data: { updated_at: '2026-09-27T10:00:00Z', attempts: [] },
    }], error: null });
    await store.ready();
    expect(await store.get('practice_sessions', 'section-3')).toEqual(answer);
  });

  it.each(['drill::section::pt101-s2', 'drill::practice-test::run-1::leg-0'])(
    'retains newer official device state without startup, set, or transaction background writes: %s',
    async (slug) => {
      const local = { pool_slug: slug, updated_at: '2026-09-27T10:01:00Z', elapsed_ms: 9000 };
      state.local.set('official-1', local);
      state.remote = [{ table_name: 'practice_sessions', record_id: 'official-1', data: { ...local, updated_at: '2026-09-27T10:00:00Z' } }];
      const store = new SupabaseSyncedPersistence('student-1');
      await store.ready();
      expect(await store.get('practice_sessions', 'official-1')).toEqual(local);
      await store.set('practice_sessions', 'official-1', { ...local, elapsed_ms: 10000 });
      await store.transaction(async (tx) => { await tx.set('practice_sessions', 'official-1', { ...local, elapsed_ms: 11000 }); });
      await vi.advanceTimersByTimeAsync(1600);
      await store.flush();
      expect(state.upserts).toEqual([]);
      expect(await store.get('practice_sessions', 'official-1')).toMatchObject({ elapsed_ms: 11000 });
    },
  );

  it('real resume loading on a revoked PT device retains the local clock and never auto-flushes', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const slug = 'drill::practice-test::44444444-4444-4444-8444-444444444444::leg-0';
    const id = practiceSessionIdFor(userId, slug);
    const local = {
      id, user_id: userId, pool_slug: slug, completion_id: slug,
      data_version: PRACTICE_SESSION_DATA_VERSION,
      question_queue: ['PT101-S2-Q1'], current_index: 0, attempts: [],
      status: 'in_progress', elapsed_ms: 9000, timer_mode: '35',
      started_at: '2026-09-27T10:00:00Z', updated_at: '2026-09-27T10:01:00Z',
    };
    state.local.set(id, local);
    state.remote = [{ table_name: 'practice_sessions', record_id: id, data: { ...local, elapsed_ms: 0, updated_at: '2026-09-27T10:00:00Z' } }];
    const store = new SupabaseSyncedPersistence(userId);
    __setPersistenceForTests(store);
    const restored = await loadDrillResumeSession(userId, slug);
    expect(restored).toMatchObject({ elapsed_ms: 9000, current_index: 0 });
    expect(hasPendingSectionDeviceBackup(userId, slug)).toBe(true);
    await vi.advanceTimersByTimeAsync(1600);
    await store.flush();
    expect(state.upserts).toEqual([]);
  });
});
