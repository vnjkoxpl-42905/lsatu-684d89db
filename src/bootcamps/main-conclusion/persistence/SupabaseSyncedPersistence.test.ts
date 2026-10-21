import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('practice-session hydration', () => {
  beforeEach(() => {
    state.local.clear();
    state.remote = [];
    state.remoteRead = null;
    state.upserts = [];
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
});
