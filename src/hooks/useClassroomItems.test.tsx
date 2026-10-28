import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { range, eq, order, auth, subscriptions, removeChannel } = vi.hoisted(() => ({ range: vi.fn(), eq: vi.fn(), order: vi.fn(), auth: { user: { id: "student-one" } }, subscriptions: [] as Array<{filter: {filter: string}; callback: () => void}>, removeChannel: vi.fn() }));
vi.mock('@/hooks/useStudentWorkState',()=>({useStudentWorkAccessReceipts:()=>({data:{access:[...Array.from({length:1000},(_,i)=>({source_table:'classroom_items',source_id:`note-${i}`,issuance:1,available:true})),{source_table:'classroom_items',source_id:'older-body-match',issuance:1,available:true}],receipts:[],practiceTests:[]},isLoading:false,isError:false,error:null,refetch:vi.fn()})}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { channel: () => {
  const channel = { on: (_event: string, filter: {filter: string}, callback: () => void) => { subscriptions.push({ filter, callback }); return channel; }, subscribe: () => channel };
  return channel;
}, removeChannel, from: () => {
  const builder = { select: () => builder, eq: (...args: unknown[]) => { eq(...args); return builder; }, order: (...args: unknown[]) => { order(...args); return builder; }, range };
  return builder;
} } }));
import { useClassroomItems } from "./useClassroomItems";
function wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => { vi.clearAllMocks(); subscriptions.length = 0; auth.user.id = "student-one"; });
afterEach(cleanup);
describe("exhaustive owned classroom items", () => {
  it("reads past a full page with stable ordering, identity scope and duplicate protection", async () => {
    const first = Array.from({ length: 1000 }, (_, i) => ({ id: `note-${i}` }));
    range.mockResolvedValueOnce({ data: first, error: null }).mockResolvedValueOnce({ data: [first[999], { id: "older-body-match" }], error: null });
    const { result } = renderHook(useClassroomItems, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1001);
    expect(result.current.data?.at(-1)?.id).toBe("older-body-match");
    expect(range.mock.calls).toEqual([[0, 999], [1000, 1999]]);
    expect(eq.mock.calls).toEqual([["student_id", "student-one"], ["student_id", "student-one"]]);
    expect(order.mock.calls.slice(0, 4)).toEqual([["priority", { ascending: false }], ["due_at", { ascending: true, nullsFirst: false }], ["created_at", { ascending: false }], ["id", { ascending: true }]]);
  });
  it("fails the complete query when a later page fails instead of returning false complete counts", async () => {
    range.mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: String(i) })), error: null }).mockResolvedValueOnce({ data: null, error: new Error("page two failed") });
    const { result } = renderHook(useClassroomItems, { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
  it('refreshes only the subscribed owner and replaces its channel after account switching', async () => {
    range.mockResolvedValue({ data: [], error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const view = renderHook(useClassroomItems, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(subscriptions[0].filter).toMatchObject({ filter: 'student_id=eq.student-one' });
    subscriptions[0].callback();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['classroom-items', 'student-one'] });
    auth.user.id = 'student-two'; view.rerender();
    await waitFor(() => expect(subscriptions).toHaveLength(2));
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(subscriptions[1].filter).toMatchObject({ filter: 'student_id=eq.student-two' });
    subscriptions[1].callback();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['classroom-items', 'student-two'] });
    view.unmount(); expect(removeChannel).toHaveBeenCalledTimes(2);
  });

});
