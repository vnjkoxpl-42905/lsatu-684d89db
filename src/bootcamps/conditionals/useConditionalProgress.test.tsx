import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyDraft, emptyProgress, markConditionalLessonRead, newRun, reviewedConditionalLessonCount, type ConditionalProgress } from './progress';
import { conditionalOpeningEditionKey, needsExpandedConditionalLessonReview } from './openingRevision';

type Response = { data: unknown; error: unknown };
const state = vi.hoisted(() => ({
  rows: new Map<string, { data: unknown; updated_at: string }>(),
  writes: [] as { operation: string; actor: string; filters: Map<string, unknown>; payload: Record<string, unknown> }[],
  failRead: false, failWrite: false,
  holdRead: null as null | ((actor: string) => Promise<Response> | undefined),
  holdWrite: null as null | ((actor: string) => Promise<Response> | undefined),
  sequence: 0,
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let operation = 'read';
  let payload: Record<string, unknown> = {};
  const filters = new Map<string, unknown>();
  const builder = {
    select: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    eq: vi.fn((key: string, value: unknown) => { filters.set(key, value); return builder; }),
    update: vi.fn((value: Record<string, unknown>) => { operation = 'update'; payload = value; return builder; }),
    insert: vi.fn((value: Record<string, unknown>) => { operation = 'insert'; payload = value; return builder; }),
    maybeSingle: vi.fn(async (): Promise<Response> => {
      const actor = String(filters.get('user_id') ?? payload.user_id);
      if (operation === 'read') {
        const held = state.holdRead?.(actor);
        if (held) return held;
        return { data: state.rows.get(actor) ?? null, error: state.failRead ? new Error('Cannot reach account') : null };
      }
      state.writes.push({ operation, actor, filters, payload });
      const held = state.holdWrite?.(actor);
      if (held) return held;
      if (state.failWrite) return { data: null, error: new Error('Connection lost') };
      const row = state.rows.get(actor);
      if (operation === 'insert' && row) return { data: null, error: { code: '23505' } };
      if (operation === 'update' && row?.updated_at !== filters.get('updated_at')) return { data: null, error: null };
      const updated_at = `2026-10-01T12:00:${String(++state.sequence).padStart(2, '0')}.000Z`;
      state.rows.set(actor, { data: payload.data, updated_at });
      return { data: { record_id: 'conditionals-v1', updated_at }, error: null };
    }),
  };
  return builder;
} } }));
import { useConditionalProgress } from './useConditionalProgress';

const record = (journal = ''): ConditionalProgress => ({ ...emptyProgress(), journal, updated_at: '2026-10-01T10:00:00.000Z' });
const cloud = (actor: string, journal = '') => state.rows.set(actor, { data: record(journal), updated_at: '2026-10-01T11:00:00.000Z' });
beforeEach(() => {
  localStorage.clear();
  state.rows.clear(); state.writes = []; state.failRead = false; state.failWrite = false; state.holdRead = null; state.holdWrite = null; state.sequence = 0;
});
afterEach(() => cleanup());

it('blocks failed hydration instead of manufacturing empty account progress', async () => {
  state.failRead = true;
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.status).toBe('error'));
  expect(result.current.progress).toBeNull();
  expect(result.current.savedProgress).toBeNull();
  expect(state.writes).toEqual([]);
});

it('rejects malformed account records and preserves their contents', async () => {
  state.rows.set('A', { data: { id: 'other-course' }, updated_at: 'revision-one' });
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.error).toContain('unsupported format'));
  expect(result.current.progress).toBeNull();
  expect(state.rows.get('A')?.data).toEqual({ id: 'other-course' });
});

it('keeps failed changes visibly dirty and retries the same work with exact account acknowledgement', async () => {
  cloud('A', 'saved note');
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.progress?.journal).toBe('saved note'));
  state.failWrite = true;
  act(() => result.current.update(previous => ({ ...previous, journal: 'unsaved correction' })));
  await act(async () => { await result.current.retry(); });
  expect(result.current.status).toBe('error');
  expect(result.current.progress?.journal).toBe('unsaved correction');
  expect(result.current.savedProgress?.journal).toBe('saved note');
  expect(JSON.parse(localStorage.getItem('student:A:conditional_draft_state:conditionals-v1')!).journal).toBe('unsaved correction');
  state.failWrite = false;
  await act(async () => { await result.current.retry(); });
  expect(result.current.status).toBe('saved');
  expect(result.current.savedProgress?.journal).toBe('unsaved correction');
  expect(state.writes.every(write => write.operation === 'update')).toBe(true);
});

it('preserves the opening edition and unknown lesson keys through acknowledged saves and reload without an automatic write', async () => {
  const original = record('preserved journal');
  original.lessons = { 'group-1': '2026-12-01T12:00:00.000Z', 'historical-unit': '2026-10-01T12:00:00.000Z' };
  original.runs.run = newRun(['group-1-b1']);
  state.rows.set('A', { data: original, updated_at: '2026-10-01T11:00:00.000Z' });
  const first = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(first.result.current.status).toBe('saved'));
  expect(first.result.current.progress!.lessons).toEqual(original.lessons);
  expect(needsExpandedConditionalLessonReview(first.result.current.progress!.lessons, 'group-1')).toBe(true);
  expect(state.writes).toEqual([]);

  const readAt = '2026-12-02T12:00:00.000Z';
  const editionKey = conditionalOpeningEditionKey('group-1')!;
  state.failWrite = true;
  act(() => first.result.current.update(previous => markConditionalLessonRead(previous, 'group-1', readAt)));
  await act(async () => { await first.result.current.retry(); });
  expect(first.result.current.status).toBe('error');
  expect(first.result.current.savedProgress!.lessons).toEqual(original.lessons);
  expect(first.result.current.progress!.lessons[editionKey]).toBe(readAt);
  expect(JSON.parse(localStorage.getItem('student:A:conditional_draft_state:conditionals-v1')!).lessons[editionKey]).toBe(readAt);

  state.failWrite = false;
  await act(async () => { await first.result.current.retry(); });
  const acknowledged = first.result.current.savedProgress!;
  expect(first.result.current.status).toBe('saved');
  expect(acknowledged.lessons).toEqual({ ...original.lessons, 'group-1': readAt, [editionKey]: readAt });
  expect(acknowledged.runs).toEqual(original.runs);
  expect(acknowledged.attempts).toEqual(original.attempts);
  expect(acknowledged.journal).toBe(original.journal);
  expect(Object.keys(acknowledged)).toEqual(Object.keys(original));
  expect(reviewedConditionalLessonCount(acknowledged.lessons)).toBe(2);
  expect((state.rows.get('A')!.data as ConditionalProgress).lessons).toEqual(acknowledged.lessons);
  expect(JSON.parse(localStorage.getItem('student:A:conditional_course_state:conditionals-v1')!).lessons).toEqual(acknowledged.lessons);
  first.unmount();

  state.rows.get('A')!.data = JSON.parse(JSON.stringify(state.rows.get('A')!.data));
  const writesBeforeReload = state.writes.length;
  const resumed = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(resumed.result.current.status).toBe('saved'));
  expect(resumed.result.current.savedProgress!.lessons).toEqual(acknowledged.lessons);
  expect(needsExpandedConditionalLessonReview(resumed.result.current.progress!.lessons, 'group-1')).toBe(false);
  expect(reviewedConditionalLessonCount(resumed.result.current.savedProgress!.lessons)).toBe(2);
  expect(state.writes).toHaveLength(writesBeforeReload);
});

it('detects a concurrent cloud revision, preserves both versions, and refuses blind overwrite', async () => {
  cloud('A', 'original');
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.progress).not.toBeNull());
  state.rows.set('A', { data: record('other window'), updated_at: '2026-10-01T11:30:00.000Z' });
  act(() => result.current.update(previous => ({ ...previous, journal: 'this window' })));
  await act(async () => { await result.current.retry(); });
  expect(result.current.status).toBe('error');
  expect(result.current.error).toContain('another window');
  expect((state.rows.get('A')!.data as ConditionalProgress).journal).toBe('other window');
  expect(result.current.progress?.journal).toBe('this window');
  expect(result.current.savedProgress?.journal).toBe('original');
  expect(state.writes[0].filters.get('updated_at')).toBe('2026-10-01T11:00:00.000Z');
});

it('uses insert for a first account row and treats a simultaneous first save as a conflict', async () => {
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.progress).not.toBeNull());
  cloud('A', 'another window created it');
  act(() => result.current.update(previous => ({ ...previous, journal: 'my new draft' })));
  await act(async () => { await result.current.retry(); });
  expect(result.current.error).toContain('Another window saved');
  expect(state.writes[0].operation).toBe('insert');
  expect((state.rows.get('A')!.data as ConditionalProgress).journal).toBe('another window created it');
});

it('never exposes owner A progress in the first owner B render or after a late A hydrate', async () => {
  let finishA!: (response: Response) => void;
  state.holdRead = actor => actor === 'A' ? new Promise(resolve => { finishA = resolve; }) : undefined;
  cloud('B', 'B only');
  const observed: { owner: string; journal?: string }[] = [];
  const { result, rerender } = renderHook(({ owner }) => { const value = useConditionalProgress(owner); observed.push({ owner, journal: value.progress?.journal }); return value; }, { initialProps: { owner: 'A' } });
  await waitFor(() => expect(finishA).toBeDefined());
  rerender({ owner: 'B' });
  expect(observed.find(item => item.owner === 'B')?.journal).toBeUndefined();
  await waitFor(() => expect(result.current.progress?.journal).toBe('B only'));
  await act(async () => finishA({ data: { data: record('A private'), updated_at: '2026-10-01T11:00:00.000Z' }, error: null }));
  expect(result.current.progress?.journal).toBe('B only');
  expect(observed.filter(item => item.owner === 'B').some(item => item.journal === 'A private')).toBe(false);
});

it('hides an already-loaded A record during the first B render, before the B hydrate effect', async () => {
  cloud('A', 'A private'); cloud('B', 'B private');
  const observed: { owner: string; journal?: string }[] = [];
  const { result, rerender } = renderHook(({ owner }) => {
    const value = useConditionalProgress(owner);
    observed.push({ owner, journal: value.progress?.journal });
    return value;
  }, { initialProps: { owner: 'A' } });
  await waitFor(() => expect(result.current.progress?.journal).toBe('A private'));
  rerender({ owner: 'B' });
  expect(observed.find(item => item.owner === 'B')?.journal).toBeUndefined();
  await waitFor(() => expect(result.current.progress?.journal).toBe('B private'));
  expect(observed.filter(item => item.owner === 'B').some(item => item.journal === 'A private')).toBe(false);
});

it('resumes unfinished working, assistance, choice, and timer from a same-base dirty draft', async () => {
  cloud('A');
  const draft = record('unfinished note');
  draft.updated_at = '2026-10-01T11:20:00.000Z';
  draft.runs.run = { ...newRun(['Q']), elapsed: 5, timerEnabled: true, timerStartedAt: '2026-10-01T11:19:00.000Z', drafts: { Q: { ...emptyDraft(), working: 'A → B', hint: true, revealed: true, choice: 2 } } };
  localStorage.setItem('student:A:conditional_draft_state:conditionals-v1', JSON.stringify(draft));
  localStorage.setItem('student:A:conditional_draft_base:conditionals-v1', JSON.stringify({ revision: '2026-10-01T11:00:00.000Z' }));
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.progress?.journal).toBe('unfinished note'));
  expect(result.current.progress?.runs.run).toEqual(draft.runs.run);
  expect(result.current.progress?.attempts).toEqual([]);
  expect(result.current.savedProgress?.journal).toBe('');
});

it('refuses to auto-save a dirty local draft based on an older account revision after reload', async () => {
  cloud('A', 'other window revision');
  const draft = { ...record('preserved draft'), updated_at: '2026-10-01T11:20:00.000Z' };
  const original = JSON.stringify(draft);
  localStorage.setItem('student:A:conditional_draft_state:conditionals-v1', original);
  localStorage.setItem('student:A:conditional_draft_base:conditionals-v1', JSON.stringify({ revision: '2026-10-01T10:30:00.000Z' }));
  const { result } = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(result.current.error).toContain('Both versions are preserved'));
  expect(result.current.progress).toBeNull();
  expect(state.writes).toEqual([]);
  expect(localStorage.getItem('student:A:conditional_draft_state:conditionals-v1')).toBe(original);
});

it('rebases a newer queued draft after its own earlier acknowledgement, then resumes it after the next save fails', async () => {
  cloud('A', 'original');
  let finishFirst!: (response: Response) => void;
  state.holdWrite = () => {
    state.holdWrite = null;
    return new Promise(resolve => { finishFirst = resolve; });
  };
  const first = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(first.result.current.progress?.journal).toBe('original'));
  act(() => first.result.current.update(previous => ({ ...previous, journal: 'first edit' })));
  let saving!: Promise<void>;
  act(() => { saving = first.result.current.retry(); });
  await waitFor(() => expect(finishFirst).toBeDefined());
  act(() => first.result.current.update(previous => ({ ...previous, journal: 'newer edit while saving' })));
  state.failWrite = true;
  const acknowledgedRevision = '2026-10-01T11:10:00.000Z';
  state.rows.set('A', { data: state.writes[0].payload.data, updated_at: acknowledgedRevision });
  await act(async () => {
    finishFirst({ data: { record_id: 'conditionals-v1', updated_at: acknowledgedRevision }, error: null });
    await saving;
  });
  expect(first.result.current.status).toBe('error');
  expect(first.result.current.savedProgress?.journal).toBe('first edit');
  expect(first.result.current.progress?.journal).toBe('newer edit while saving');
  const draftKey = 'student:A:conditional_draft_state:conditionals-v1';
  expect(JSON.parse(localStorage.getItem(draftKey)!).journal).toBe('newer edit while saving');
  expect(JSON.parse(localStorage.getItem('student:A:conditional_draft_base:conditionals-v1')!).revision).toBe(acknowledgedRevision);
  first.unmount();
  const resumed = renderHook(() => useConditionalProgress('A'));
  await waitFor(() => expect(resumed.result.current.progress?.journal).toBe('newer edit while saving'));
  expect(resumed.result.current.error).not.toContain('older account version');
  expect(resumed.result.current.savedProgress?.journal).toBe('first edit');
});

it('ignores late owner A write acknowledgement after switching to B', async () => {
  cloud('A', 'A saved'); cloud('B', 'B saved');
  let finishA!: (response: Response) => void;
  state.holdWrite = actor => actor === 'A' ? new Promise(resolve => { finishA = resolve; }) : undefined;
  const { result, rerender } = renderHook(({ owner }) => useConditionalProgress(owner), { initialProps: { owner: 'A' } });
  await waitFor(() => expect(result.current.progress?.journal).toBe('A saved'));
  act(() => result.current.update(previous => ({ ...previous, journal: 'A dirty' })));
  let saving!: Promise<void>;
  act(() => { saving = result.current.retry(); });
  await waitFor(() => expect(finishA).toBeDefined());
  rerender({ owner: 'B' });
  await waitFor(() => expect(result.current.progress?.journal).toBe('B saved'));
  await act(async () => { finishA({ data: { record_id: 'conditionals-v1', updated_at: '2026-10-01T11:01:00.000Z' }, error: null }); await saving; });
  expect(result.current.savedProgress?.journal).toBe('B saved');
  expect(localStorage.getItem('student:A:conditional_course_state:conditionals-v1')).toBeNull();
});
