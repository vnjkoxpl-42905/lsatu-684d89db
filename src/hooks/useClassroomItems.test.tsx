import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { range, eq, order, auth } = vi.hoisted(() => ({ range: vi.fn(), eq: vi.fn(), order: vi.fn(), auth: { user: { id: "student-one" } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => {
  const builder = { select: () => builder, eq: (...args: unknown[]) => { eq(...args); return builder; }, order: (...args: unknown[]) => { order(...args); return builder; }, range };
  return builder;
} } }));
import { useClassroomItems } from "./useClassroomItems";
function wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
beforeEach(() => { vi.clearAllMocks(); });
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
});
