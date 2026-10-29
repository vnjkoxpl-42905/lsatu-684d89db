import React from 'react';
import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ actor: 'student-one', ack: vi.fn(), group: vi.fn(), load: vi.fn(),channel:vi.fn(),remove:vi.fn(),subscriptions:[] as {filter:{table:string;filter:string};callback:()=>void}[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.actor } }) }));
vi.mock('@/lib/studentWorkState', () => ({ acknowledgeStudentWork: mocks.ack, acknowledgeAssignmentGroup: mocks.group, loadStudentWorkState: mocks.load }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: (...args:unknown[]) => {mocks.channel(...args); const channel = { on: (_event:string,filter:{table:string;filter:string},callback:()=>void) => {mocks.subscriptions.push({filter,callback});return channel;}, subscribe: () => channel }; return channel; }, removeChannel: mocks.remove } }));
import { useStudentWorkAcknowledgment, useLoadedStudentWorkAcknowledgment, useAssignmentGroupAcknowledgment,useStudentWorkAccessReceipts } from './useStudentWorkState';
const identity = { sourceTable: 'homework_assignments', sourceId: '00000000-0000-4000-8000-000000000001', issuance: 2 };
const receipt = { source_table: identity.sourceTable, source_id: identity.sourceId, issuance: 2, first_opened_at: '2026-10-28T12:00:00Z', last_opened_at: '2026-10-28T12:00:00Z', read_at: '2026-10-28T12:00:00Z' };
function setup(route = '/classroom/work') { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); const wrapper = ({ children }: {
    children: React.ReactNode;
}) => <QueryClientProvider client={client}><MemoryRouter initialEntries={[route]}>{children}</MemoryRouter></QueryClientProvider>; return { client, wrapper }; }
beforeEach(() => { vi.clearAllMocks(); mocks.actor = 'student-one'; vi.spyOn(document, 'hasFocus').mockReturnValue(true); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); mocks.ack.mockResolvedValue(receipt); mocks.group.mockResolvedValue(true); mocks.load.mockResolvedValue({ access: [{ ...receipt, available: true }], receipts: [], practiceTests: [] }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('successful foreground work acknowledgement', () => {
    it('shares one actor subscription across consumers and removes it after the last consumer leaves',async()=>{
        mocks.subscriptions.length=0;
        const {wrapper,client}=setup();const invalidate=vi.spyOn(client,'invalidateQueries');
        const first=renderHook(useStudentWorkAccessReceipts,{wrapper});const second=renderHook(useStudentWorkAccessReceipts,{wrapper});
        await waitFor(()=>expect(first.result.current.isSuccess).toBe(true));
        expect(mocks.channel).toHaveBeenCalledTimes(1);expect(mocks.subscriptions).toHaveLength(7);
        act(()=>mocks.subscriptions[0].callback());expect(invalidate).toHaveBeenCalledTimes(8);
        first.unmount();expect(mocks.remove).not.toHaveBeenCalled();
        mocks.actor='student-two';second.rerender();
        await waitFor(()=>expect(mocks.channel).toHaveBeenCalledTimes(2));expect(mocks.remove).toHaveBeenCalledTimes(1);
        expect(mocks.subscriptions[7].filter.filter).toBe('student_id=eq.student-two');
        second.unmount();expect(mocks.remove).toHaveBeenCalledTimes(2);
    });
    it('waits for successful content readiness and preserves work status', async () => { const { wrapper, client } = setup(); const { rerender } = renderHook(({ ready }) => useStudentWorkAcknowledgment({ identity, ready, studentId: 'student-one' }), { wrapper, initialProps: { ready: false } }); expect(mocks.ack).not.toHaveBeenCalled(); client.setQueryData(['student-work-state', 'student-one'], { access: [{ ...receipt, available: true }], receipts: [], practiceTests: [] }); rerender({ ready: true }); await waitFor(() => expect(mocks.ack).toHaveBeenCalledOnce()); await waitFor(() => expect((client.getQueryData(['student-work-state', 'student-one']) as any).receipts).toHaveLength(1)); expect((client.getQueryData(['student-work-state', 'student-one']) as any).status).toBeUndefined(); });
    it('cannot acknowledge another owner or hidden background content', () => { const { wrapper } = setup(); const { rerender } = renderHook(({ owner }) => useStudentWorkAcknowledgment({ identity, ready: true, studentId: owner }), { wrapper, initialProps: { owner: 'another-student' } }); expect(mocks.ack).not.toHaveBeenCalled(); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); act(() => document.dispatchEvent(new Event('visibilitychange'))); rerender({ owner: 'student-one' }); expect(mocks.ack).not.toHaveBeenCalled(); });
    it('keeps receipts and notification caches unchanged on denied acknowledgement', async () => { mocks.ack.mockRejectedValue(new Error('denied')); vi.spyOn(console, 'warn').mockImplementation(() => { }); const { wrapper, client } = setup(); const invalidate = vi.spyOn(client, 'invalidateQueries'); renderHook(() => useStudentWorkAcknowledgment({ identity, ready: true }), { wrapper }); await waitFor(() => expect(mocks.ack).toHaveBeenCalled()); await act(async () => { }); expect(invalidate).not.toHaveBeenCalled(); });
    it('does not update a later actors cache when an old request completes', async () => { let finish!: (value: typeof receipt) => void; mocks.ack.mockReturnValue(new Promise(resolve => { finish = resolve; })); const { wrapper, client } = setup(); const invalidate = vi.spyOn(client, 'invalidateQueries'); const { rerender } = renderHook(() => useStudentWorkAcknowledgment({ identity, ready: true, studentId: 'student-one' }), { wrapper }); await waitFor(() => expect(mocks.ack).toHaveBeenCalledOnce()); mocks.actor = 'student-two'; rerender(); await act(async () => { finish(receipt); }); expect(invalidate).not.toHaveBeenCalled(); });
    it('does not acknowledge pending or unavailable source access', async () => { mocks.load.mockResolvedValue({ access: [{ ...receipt, available: false }], receipts: [], practiceTests: [] }); const { wrapper } = setup(); renderHook(() => useLoadedStudentWorkAcknowledgment({ sourceTable: identity.sourceTable, sourceId: identity.sourceId, ready: true, studentId: 'student-one' }), { wrapper }); await waitFor(() => expect(mocks.load).toHaveBeenCalled()); expect(mocks.ack).not.toHaveBeenCalled(); });
    it('clears an explicit loaded collection alert without individual receipt writes', async () => { const { wrapper } = setup('/my-work?workGroup=00000000-0000-4000-8000-000000000002'); const { rerender } = renderHook(({ ready }) => useAssignmentGroupAcknowledgment({ ready }), { wrapper, initialProps: { ready: false } }); expect(mocks.group).not.toHaveBeenCalled(); rerender({ ready: true }); await waitFor(() => expect(mocks.group).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000002', 'student-one')); expect(mocks.ack).not.toHaveBeenCalled(); });
});
