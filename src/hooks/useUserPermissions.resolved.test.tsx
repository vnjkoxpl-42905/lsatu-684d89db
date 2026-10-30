import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { id: "joshua" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, authReady: true, signOut: vi.fn() }),
}));

/* The two reads the hook makes: a profile row and the admin role row. */
const server = vi.hoisted(() => ({
  fail: false,
  admins: new Set<string>(["joshua"]),
}));

vi.mock("@/integrations/supabase/client", () => {
  const query = (table: string) => {
    const filters: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        filters[column] = value;
        return chain;
      },
      maybeSingle: async () => {
        if (server.fail) return { data: null, error: { message: "network down", status: 503 } };
        if (table === "profiles") return { data: { has_chat_access: true, archived_at: null }, error: null };
        const userId = String(filters.user_id);
        return { data: server.admins.has(userId) ? { role: "admin" } : null, error: null };
      },
    };
    return chain;
  };
  return {
    supabase: {
      auth: { getSession: async () => ({ data: { session: { access_token: "t" } } }) },
      from: query,
      channel: () => {
        const channel = { on: () => channel, subscribe: () => channel };
        return channel;
      },
      removeChannel: async () => {},
    },
  };
});

import { useUserPermissions } from "./useUserPermissions";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, ...renderHook(() => useUserPermissions(), { wrapper }) };
}

beforeEach(() => {
  auth.user = { id: "joshua" };
  server.fail = false;
  server.admins = new Set(["joshua"]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useUserPermissions resolution", () => {
  it("is unresolved, not a student, after a cold failure", async () => {
    server.fail = true;
    const { result } = setup();
    // The hook retries transient failures twice before settling on an error.
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 8000 });
    expect(result.current.resolved).toBe(false);
    expect(result.current.resolvedFor).toBeNull();
    expect(result.current.is_admin).toBe(false);
  }, 10000);

  it("resolves the admin role for the current actor", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.is_admin).toBe(true);
    expect(result.current.resolvedFor).toBe("joshua");
    expect(result.current.isError).toBe(false);
  });

  it("keeps the cached admin role through a background failure, then recovers on retry", async () => {
    const { result, client } = setup();
    await waitFor(() => expect(result.current.resolved).toBe(true));
    server.fail = true;
    await act(async () => {
      await client.refetchQueries({ queryKey: ["user-permissions", "joshua"] }).catch(() => {});
    });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 8000 });
    expect(result.current.resolved).toBe(true);
    expect(result.current.is_admin).toBe(true);
    server.fail = false;
    act(() => result.current.retry?.());
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.is_admin).toBe(true);
  }, 12000);

  it("never carries one account's role to another", async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.is_admin).toBe(true));
    auth.user = { id: "ada" };
    rerender();
    // Ada's flags are unknown until her own read lands.
    expect(result.current.resolved).toBe(false);
    expect(result.current.is_admin).toBe(false);
    await waitFor(() => expect(result.current.resolvedFor).toBe("ada"));
    expect(result.current.is_admin).toBe(false);
  });
});
