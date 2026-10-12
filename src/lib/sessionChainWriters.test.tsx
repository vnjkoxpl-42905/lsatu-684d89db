import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeClassroomDb } from '@/test/fakeClassroomItemsDb';
import { BOOKING_B, STUDENT, item, link } from '@/test/sessionChainFixtures';

/**
 * The real writers (markNoteRead, useBootcampProgress) against a fake table
 * that enforces filters and bumps updated_at like the database trigger.
 */
const env = vi.hoisted(() => ({ db: null as null | ReturnType<typeof import('@/test/fakeClassroomItemsDb').createFakeClassroomDb> }));

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (name: string) => env.db!.table(name) } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'aaaaaaaa-0000-4000-8000-000000000001' } }) }));

import { markNoteRead } from '@/lib/markNoteRead';
import { useBootcampProgress } from '@/hooks/useBootcampProgress';
import { ClassroomItemMergeError } from '@/lib/classroomItems';

describe('markNoteRead preserves session links', () => {
  const note = () => item({ id: 'note-1', type: 'session_recap', metadata_json: { kind: 'recap' } });

  beforeEach(() => { env.db = createFakeClassroomDb([note()]); });

  it('keeps a link the teacher added after the student cached the note', async () => {
    const cached = structuredClone(env.db!.rows.get('note-1')!);
    env.db!.externalWrite('note-1', (r) => { r.metadata_json = { ...r.metadata_json, session_chain: link({ phase: 'recap' }) }; });
    await markNoteRead(cached);
    const stored = env.db!.rows.get('note-1')!.metadata_json;
    expect(stored.session_chain).toEqual(link({ phase: 'recap' }));
    expect(stored.kind).toBe('recap');
    expect(typeof stored.read_at).toBe('string');
  });

  it('does not restore a link the teacher removed after the student cached the note', async () => {
    env.db!.externalWrite('note-1', (r) => { r.metadata_json = { ...r.metadata_json, session_chain: link({ phase: 'recap' }) }; });
    const cached = structuredClone(env.db!.rows.get('note-1')!);
    env.db!.externalWrite('note-1', (r) => { const { session_chain: _drop, ...rest } = r.metadata_json; r.metadata_json = rest; });
    await markNoteRead(cached);
    const stored = env.db!.rows.get('note-1')!.metadata_json;
    expect('session_chain' in stored).toBe(false);
    expect(typeof stored.read_at).toBe('string');
  });

  it('keeps both changes when another write lands between its read and its write', async () => {
    let once = true;
    env.db!.hooks.beforeUpdate = (id) => {
      if (!once) return;
      once = false;
      env.db!.externalWrite(id, (r) => { r.metadata_json = { ...r.metadata_json, session_chain: link({ booking_id: BOOKING_B, phase: 'recap' }) }; });
    };
    await markNoteRead(structuredClone(env.db!.rows.get('note-1')!));
    const stored = env.db!.rows.get('note-1')!.metadata_json;
    expect(stored.session_chain).toEqual(link({ booking_id: BOOKING_B, phase: 'recap' }));
    expect(typeof stored.read_at).toBe('string');
    expect(env.db!.updates).toHaveLength(1);
  });

  it('fails without overwriting when the row keeps changing', async () => {
    env.db!.hooks.beforeUpdate = (id) => env.db!.externalWrite(id, (r) => { r.metadata_json = { ...r.metadata_json, other: Math.random() }; });
    await expect(markNoteRead(structuredClone(env.db!.rows.get('note-1')!))).rejects.toBeInstanceOf(ClassroomItemMergeError);
    expect(env.db!.updates).toHaveLength(0);
    expect('read_at' in env.db!.rows.get('note-1')!.metadata_json).toBe(false);
  });

  it('skips the write when the stored row is already read', async () => {
    env.db!.externalWrite('note-1', (r) => { r.metadata_json = { ...r.metadata_json, read_at: 'earlier' }; });
    const cached = { ...structuredClone(env.db!.rows.get('note-1')!), metadata_json: { kind: 'recap' } };
    await markNoteRead(cached);
    expect(env.db!.updates).toHaveLength(0);
  });
});

describe('useBootcampProgress preserves session links', () => {
  function wrapper({ children }: { children: React.ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  it('keeps a session link when progress autosaves', async () => {
    env.db = createFakeClassroomDb([
      item({ id: 'boot-1', student_id: STUDENT, type: 'bootcamp_module', source_id: '/bootcamp/main-conclusion', metadata_json: { bootcamp_id: 'main-conclusion', session_chain: link(), note: 'keep' } }),
    ]);
    renderHook(() => useBootcampProgress({ bootcampId: 'main-conclusion', completedDays: [1, 2], totalDays: 5 }), { wrapper });
    await vi.waitFor(() => expect(env.db!.updates).toHaveLength(1), { timeout: 4000 });
    const row = env.db!.rows.get('boot-1')!;
    expect(row.metadata_json.session_chain).toEqual(link());
    expect(row.metadata_json.note).toBe('keep');
    expect(row.metadata_json.progress).toMatchObject({ completedDays: [1, 2], totalDays: 5, percent: 40 });
    expect(row.status).toBe('in_progress');
  });

  it('does not overwrite a link added between its read and its write', async () => {
    env.db = createFakeClassroomDb([
      item({ id: 'boot-1', student_id: STUDENT, type: 'bootcamp_module', source_id: '/bootcamp/main-conclusion', metadata_json: { bootcamp_id: 'main-conclusion' } }),
    ]);
    let once = true;
    env.db.hooks.beforeUpdate = (id) => {
      if (!once) return;
      once = false;
      env.db!.externalWrite(id, (r) => { r.metadata_json = { ...r.metadata_json, session_chain: link({ phase: 'follow_up' }) }; });
    };
    renderHook(() => useBootcampProgress({ bootcampId: 'main-conclusion', completedDays: [1], totalDays: 5 }), { wrapper });
    await vi.waitFor(() => expect(env.db!.updates).toHaveLength(1), { timeout: 4000 });
    const row = env.db!.rows.get('boot-1')!;
    expect(row.metadata_json.session_chain).toEqual(link({ phase: 'follow_up' }));
    expect(row.metadata_json.progress).toMatchObject({ completedDays: [1] });
  });
});
