import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTeachingDesk, deskKey } from "./useTeachingDesk";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  clear: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    functions: { invoke: mocks.invoke },
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));
vi.mock("@/lib/teacherHomeActions", () => ({
  clearPendingHomeTopUps: mocks.clear,
}));
function fixture() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return {
    client,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  };
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  sessionStorage.clear();
  mocks.rpc.mockImplementation(async (name) => ({
    data:
      name === "teacher_home_results"
        ? []
        : name === "teacher_home_payments"
          ? { recent: [], attention: [], attention_count: 0 }
          : { items: [], total: 0, next_cursor: null },
    error: null,
  }));
  mocks.invoke.mockImplementation(async (name, options) => ({
    data:
      name === "admin-manage-users"
        ? []
        : options.body.action === "agenda"
          ? {
              ok: true,
              events: [],
              next_cursor: null,
              fetched_at: new Date().toISOString(),
            }
          : {
              ok: true,
              threads: [],
              count: 0,
              fetched_at: new Date().toISOString(),
            },
    error: null,
  }));
});
describe("Teacher desk data boundaries", () => {
  it("does not read private data before admin authorization resolves", () => {
    const { wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", false), {
      wrapper,
    });
    expect(result.current.manual.state).toBe("setup");
    expect(result.current.manual.data).toBeUndefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("keeps providers independent and retains the last good email through a failed refresh", async () => {
    const { client, wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.manual.state).toBe("ready"));
    await waitFor(() => expect(result.current.email.state).toBe("ready"));
    mocks.invoke.mockImplementation(async (name, options) => {
      if (options?.body?.action === "email")
        return { data: null, error: new Error("offline") };
      return { data: [], error: null };
    });
    await act(() =>
      client.refetchQueries({
        queryKey: deskKey("actor", "email"),
        exact: true,
      }),
    );
    expect(result.current.email.state).toBe("ready");
    await waitFor(() => expect(result.current.email.stale).toBe(true));
    expect(result.current.manual.state).toBe("ready");
  });
  it("never displays the old actor cache after an account switch", async () => {
    const { client, wrapper } = fixture();
    client.setQueryData(deskKey("first", "manual"), {
      items: [{ id: "private" }],
      total: 1,
      next_cursor: null,
    });
    const { result, rerender } = renderHook(
      ({ actor }) => useTeachingDesk(actor, true),
      { wrapper, initialProps: { actor: "first" } },
    );
    expect(result.current.manual.data?.items[0].id).toBe("private");
    rerender({ actor: "second" });
    expect(
      result.current.manual.data?.items.some((t) => t.id === "private"),
    ).not.toBe(true);
    expect(mocks.clear).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.manual.state).toBe("ready"));
    expect(client.getQueryData(deskKey("first", "manual"))).toBeUndefined();
  });
  it("reuses the manual draft operation on an unknown create outcome", async () => {
    const { wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.manual.state).toBe("ready"));
    let first = true;
    const operations: string[] = [];
    mocks.rpc.mockImplementation(async (name, args) => {
      if (name === "teacher_home_manual_update") {
        operations.push(args._operation_key);
        if (first) {
          first = false;
          return { data: null, error: new Error("unknown outcome") };
        }
        return { data: { id: "saved", revision: 1 }, error: null };
      }
      return { data: { items: [], total: 0, next_cursor: null }, error: null };
    });
    await expect(
      result.current.mutateManual!(null, {
        action: "create",
        title: "Draft recap",
      }),
    ).rejects.toThrow();
    await act(() =>
      result.current.mutateManual!(null, {
        action: "create",
        title: "Draft recap",
      }),
    );
    expect(operations).toHaveLength(2);
    expect(operations[0]).toBeTruthy();
    expect(operations[0]).toBe(operations[1]);
  });
  it("does not mint a second create key after an edited draft or a reload with an unknown outcome", async () => {
    const { wrapper } = fixture();
    let first = true;
    const requests: any[] = [];
    const original = {
      action: "create" as const,
      title: "Original recap",
      studentId: null,
    };
    const { result, unmount } = renderHook(
      () => useTeachingDesk("actor", true),
      { wrapper },
    );
    await waitFor(() => expect(result.current.manual.state).toBe("ready"));
    mocks.rpc.mockImplementation(async (name, args) => {
      if (name === "teacher_home_manual_update") {
        requests.push(args);
        if (first) {
          first = false;
          return { data: null, error: new Error("unknown outcome") };
        }
        return { data: { id: "saved", revision: 1 }, error: null };
      }
      return { data: { items: [], total: 0, next_cursor: null }, error: null };
    });
    await act(async () => {
      await expect(
        result.current.mutateManual!(null, original),
      ).rejects.toThrow();
    });
    await expect(
      result.current.mutateManual!(null, {
        ...original,
        title: "Edited recap",
      }),
    ).rejects.toThrow(/original request/);
    expect(requests).toHaveLength(1);
    const key = requests[0]._operation_key;
    unmount();
    const next = renderHook(() => useTeachingDesk("actor", true), {
      wrapper: fixture().wrapper,
    });
    await waitFor(() =>
      expect(next.result.current.pendingManual?.title).toBe("Original recap"),
    );
    await act(() => next.result.current.retryManualCreate!());
    expect(requests[1]._operation_key).toBe(key);
    expect(requests[1]._title).toBe("Original recap");
    await act(() =>
      next.result.current.mutateManual!(null, {
        ...original,
        title: "Edited recap",
      }),
    );
    expect(requests[2]._operation_key).not.toBe(key);
  });
  it("deduplicates provider focus attempts for 120 seconds and throttles explicit retry for 15 seconds", async () => {
    const { client, wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.email.state).toBe("ready"));
    const query = client
      .getQueryCache()
      .find({ queryKey: deskKey("actor", "email") })!;
    const providerOptions = query.options as typeof query.options & {
      staleTime: number;
      refetchOnWindowFocus: () => boolean;
    };
    expect(providerOptions.staleTime).toBe(120_000);
    const focus = providerOptions.refetchOnWindowFocus;
    expect(focus()).toBe(false);
    const emailCalls = () =>
      mocks.invoke.mock.calls.filter(
        ([, options]) => options?.body?.action === "email",
      ).length;
    act(() => result.current.email.retry!());
    await waitFor(() => expect(emailCalls()).toBe(2));
    await waitFor(() => expect(result.current.email.retryBlocked).toBe(true));
    act(() => result.current.email.retry!());
    expect(emailCalls()).toBe(2);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 15_001);
    act(() => result.current.email.retry!());
    await waitFor(() => expect(emailCalls()).toBe(3));
    expect(focus()).toBe(false);
    clock.mockReturnValue(now + 135_002);
    expect(focus()).toBe(true);
    clock.mockRestore();
  });
  it("allows correcting a fresh authoritative validation rejection without dropping an unknown earlier request", async () => {
    const { wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.manual.state).toBe("ready"));
    const requests: any[] = [];
    let rejected = true;
    mocks.rpc.mockImplementation(async (name, args) => {
      if (name === "teacher_home_manual_update") {
        requests.push(args);
        if (rejected) {
          rejected = false;
          return {
            data: null,
            error: { code: "P0001", message: "invalid_student" },
          };
        }
        return { data: { id: "saved", revision: 1 }, error: null };
      }
      return { data: { items: [], total: 0, next_cursor: null }, error: null };
    });
    await act(async () => {
      await expect(
        result.current.mutateManual!(null, {
          action: "create",
          title: "Original task",
          studentId: "archived",
        }),
      ).rejects.toEqual({ code: "P0001", message: "invalid_student" });
    });
    expect(result.current.pendingManual).toBeUndefined();
    await act(() =>
      result.current.mutateManual!(null, {
        action: "create",
        title: "Corrected task",
        studentId: null,
      }),
    );
    expect(requests[1]._operation_key).not.toBe(requests[0]._operation_key);
  });
  it("treats the live email setup envelope as setup rather than renderable data while other sections load", async () => {
    const body = {
      ok: false,
      setup_required: true,
      error: "student_email_setup_required",
      fetched_at: "2026-10-28T16:21:40.683Z",
    };
    mocks.invoke.mockImplementation(async (name, options) => ({
      data:
        name === "admin-manage-users"
          ? []
          : options.body.action === "email"
            ? body
            : {
                ok: true,
                events: [],
                next_cursor: null,
                fetched_at: "2026-10-28T16:21:40.683Z",
                time_zone: "America/New_York",
              },
      error: null,
    }));
    const { wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.email.state).toBe("setup"));
    expect(result.current.email.data).toBeUndefined();
    await waitFor(() => expect(result.current.agenda.state).toBe("ready"));
    expect(result.current.agenda.data?.events).toEqual([]);
    expect(result.current.manual.state).toBe("ready");
    expect(result.current.payments.state).toBe("ready");
  });
  it("isolates a malformed provider success response to that section instead of publishing undefined list data", async () => {
    mocks.invoke.mockImplementation(async (name, options) => ({
      data:
        name === "admin-manage-users"
          ? []
          : options.body.action === "email"
            ? { ok: true, synced: 0 }
            : {
                ok: true,
                events: [],
                next_cursor: null,
                fetched_at: new Date().toISOString(),
              },
      error: null,
    }));
    const { wrapper } = fixture();
    const { result } = renderHook(() => useTeachingDesk("actor", true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.email.state).toBe("error"));
    expect(result.current.email.data).toBeUndefined();
    expect(result.current.agenda.state).toBe("ready");
    expect(result.current.manual.state).toBe("ready");
  });
});
