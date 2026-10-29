import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ owner: 'a', invoke: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: fixture.owner } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: { id: fixture.owner } }, error: null }) }, functions: { invoke: (...args: unknown[]) => fixture.invoke(...args) } } }));
import { useActivityCoach } from './useActivityCoach';
const args = { item: { order: 1, prompt: 'untrusted prompt', credited_answers: ['untrusted key'], explanation: 'untrusted explanation' }, studentResponse: 'my response', attemptNo: 1, source: { sourceKind: 'assignment' as const, sourceId: '12345678-1234-4123-8123-123456789012' } };
beforeEach(() => { fixture.owner = 'a'; fixture.invoke.mockReset(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('makes no paid invoke when durable request persistence fails', async () => {
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const { result } = renderHook(useActivityCoach);
  let reply;
  await act(async () => { reply = await result.current.judge(args); });
  expect(reply).toMatchObject({ ok: false, error: expect.stringContaining('No Coach call') });
  expect(fixture.invoke).not.toHaveBeenCalled();
});
it('reuses exact pending request after ambiguous failure and hook remount', async () => {
  fixture.invoke.mockRejectedValueOnce(new Error('reply lost')).mockResolvedValue({ data: { verdict: 'correct', feedback: 'Verified.' }, error: null });
  const first = renderHook(useActivityCoach);
  await act(async () => { await first.result.current.judge(args); });
  first.unmount();
  const second = renderHook(useActivityCoach);
  await act(async () => { await second.result.current.judge(args); });
  expect(fixture.invoke.mock.calls[1][1].body).toEqual(fixture.invoke.mock.calls[0][1].body);
  expect(fixture.invoke.mock.calls[0][1].body).not.toHaveProperty('creditedAnswers');
});
it('discards a prior-owner response and frees new-owner controls', async () => {
  let resolve!: (value: unknown) => void;
  fixture.invoke.mockImplementation(() => new Promise(r => { resolve = r; }));
  const hook = renderHook(useActivityCoach);
  let pending!: ReturnType<typeof hook.result.current.judge>;
  await act(async () => { pending = hook.result.current.judge(args); await Promise.resolve(); });
  fixture.owner = 'b'; hook.rerender();
  expect(hook.result.current.judging).toBe(false);
  let reply;
  await act(async () => { resolve({ data: { verdict: 'correct', feedback: 'Saved.' }, error: null }); reply = await pending; });
  expect(reply).toMatchObject({ ok: false, discarded: true });
});
it.each([{ verdict: 'unexpected', feedback: 'No.' }, { verdict: 'incorrect', feedback: ' ' }, { error: 'disabled', code: 'disabled' }])('never accepts an invented or incomplete model verdict', async data => {
  fixture.invoke.mockResolvedValue({ data, error: null });
  const hook = renderHook(useActivityCoach);
  let reply;
  await act(async () => { reply = await hook.result.current.judge(args); });
  expect(reply).toMatchObject({ ok: false });
  expect(reply).not.toHaveProperty('verdict');
});

it('uses explicit authored preview identity and never sends teacher rubric or answer keys', async () => {
  fixture.invoke.mockResolvedValue({ data: { verdict: 'correct', feedback: 'Verified.' }, error: null });
  const hook = renderHook(useActivityCoach);
  await act(async () => { await hook.result.current.judge({ ...args, source: { ...args.source, sourceKind: 'preview' } }); });
  expect(fixture.invoke.mock.calls[0][1].body).toMatchObject({ sourceKind: 'preview', sourceId: args.source.sourceId, itemOrder: 1 });
  expect(Object.keys(fixture.invoke.mock.calls[0][1].body).sort()).toEqual(['contractVersion', 'requestId', 'sourceKind', 'sourceId', 'itemOrder', 'studentResponse', 'attemptNo'].sort());
});
it('does not infer preview when no real source identity is supplied', async () => {
  const hook = renderHook(useActivityCoach);
  let reply;
  await act(async () => { reply = await hook.result.current.judge({ ...args, source: undefined }); });
  expect(reply).toMatchObject({ ok: false });
  expect(fixture.invoke).not.toHaveBeenCalled();
});

it('discards late judgment after the item unmounts', async () => {
  let resolve!: (value: unknown) => void;
  fixture.invoke.mockImplementation(() => new Promise(r => { resolve = r; }));
  const hook = renderHook(useActivityCoach);
  let pending!: ReturnType<typeof hook.result.current.judge>;
  await act(async () => { pending = hook.result.current.judge(args); await Promise.resolve(); });
  hook.unmount();
  resolve({ data: { verdict: 'correct', feedback: 'Verified.' }, error: null });
  expect(await pending).toMatchObject({ ok: false, discarded: true });
});

const revisionError = () => ({ context: new Response(JSON.stringify({ code: 'grader_revision_changed' }), { status: 409 }) });
it('recovers a confirmed terminal revision conflict once with a durable new identity', async () => {
  fixture.invoke.mockResolvedValueOnce({ data: null, error: revisionError() })
    .mockResolvedValue({ data: { verdict: 'partial', feedback: 'Check your indicator.' }, error: null });
  const hook = renderHook(useActivityCoach);
  let reply;
  await act(async () => { reply = await hook.result.current.judge({ ...args, attemptNo: 2 }); });
  expect(reply).toMatchObject({ ok: true, verdict: { verdict: 'partial' } });
  const [old, updated] = fixture.invoke.mock.calls.map(call => call[1].body);
  expect(updated).toEqual({ ...old, requestId: expect.any(String) });
  expect(updated.requestId).not.toBe(old.requestId);
  hook.unmount();
  const reloaded = renderHook(useActivityCoach);
  await act(async () => { await reloaded.result.current.judge({ ...args, attemptNo: 2 }); });
  expect(fixture.invoke.mock.calls[2][1].body).toEqual(updated);
});
it('retains the replacement after a lost reply and does not rotate it on retry', async () => {
  fixture.invoke.mockResolvedValueOnce({ data: null, error: revisionError() })
    .mockRejectedValueOnce(new Error('reply lost'))
    .mockResolvedValue({ data: { verdict: 'correct', feedback: 'Verified.' }, error: null });
  const hook = renderHook(useActivityCoach);
  await act(async () => { await hook.result.current.judge(args); });
  await act(async () => { await hook.result.current.judge(args); });
  expect(fixture.invoke.mock.calls[2][1].body).toEqual(fixture.invoke.mock.calls[1][1].body);
});
it('bounds revision recovery to one retry per submission', async () => {
  fixture.invoke.mockImplementation(async () => ({ data: null, error: revisionError() }));
  const hook = renderHook(useActivityCoach);
  let reply;
  await act(async () => { reply = await hook.result.current.judge(args); });
  expect(reply).toMatchObject({ ok: false });
  expect(fixture.invoke).toHaveBeenCalledTimes(2);
});
it.each([
  { context: new Response(JSON.stringify({ code: 'request_conflict' }), { status: 409 }) },
  { context: new Response(JSON.stringify({ code: 'grader_revision_changed' }), { status: 500 }) },
  { message: 'grader_revision_changed' },
])('keeps the existing identity for uncertain or unrelated failures', async error => {
  fixture.invoke.mockResolvedValue({ data: null, error });
  const hook = renderHook(useActivityCoach);
  await act(async () => { await hook.result.current.judge(args); });
  expect(fixture.invoke).toHaveBeenCalledTimes(1);
  await act(async () => { await hook.result.current.judge(args); });
  expect(fixture.invoke.mock.calls[1][1].body).toEqual(fixture.invoke.mock.calls[0][1].body);
});
it('does not send the replacement if persistence fails', async () => {
  fixture.invoke.mockImplementationOnce(async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    return { data: null, error: revisionError() };
  });
  const hook = renderHook(useActivityCoach);
  let reply;
  await act(async () => { reply = await hook.result.current.judge(args); });
  expect(reply).toMatchObject({ ok: false, error: expect.stringContaining('No retry') });
  expect(fixture.invoke).toHaveBeenCalledTimes(1);
});
