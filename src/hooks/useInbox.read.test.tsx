import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({ user: { id: "ada" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: auth.user }) }));

const fake = vi.hoisted(() => {
  type Op = { method: string; args: unknown[] };
  type Call = { table: string; ops: Op[] };
  const state = {
    calls: [] as Call[],
    respond: (_call: Call): { data: unknown; error: unknown } => ({ data: [], error: null }),
    rpc: (_name: string): { data: unknown; error: unknown } => ({ data: [], error: null }),
    channels: [] as Array<{ name: string; handlers: Array<() => void> }>,
  };
  const builder = (table: string) => {
    const call: Call = { table, ops: [] };
    state.calls.push(call);
    const proxy: Record<string, unknown> = {};
    for (const method of ["select", "update", "eq", "neq", "in", "gt", "or", "order", "maybeSingle", "delete", "limit"]) {
      proxy[method] = (...args: unknown[]) => {
        call.ops.push({ method, args });
        return proxy;
      };
    }
    proxy.then = (resolve: (v: unknown) => unknown, reject: (r: unknown) => unknown) =>
      Promise.resolve().then(() => state.respond(call)).then(resolve, reject);
    return proxy;
  };
  const supabase = {
    from: builder,
    rpc: (name: string) => Promise.resolve(state.rpc(name)),
    channel: (name: string) => {
      const record = { name, handlers: [] as Array<() => void> };
      state.channels.push(record);
      const channel = {
        on: (_t: string, _f: unknown, handler: () => void) => {
          record.handlers.push(handler);
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: () => Promise.resolve(),
  };
  return { state, supabase };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: fake.supabase }));

import { useConversationMessages, useInbox } from "./useInbox";
import { useUnreadMessageCount } from "./useUnreadMessageCount";
import { __resetInboxStoreForTests } from "./inboxSummaries";

type Call = (typeof fake.state.calls)[number];
const has = (call: Call, method: string) => call.ops.some((op) => op.method === method);
const updates = () => fake.state.calls.filter((call) => call.table === "conversation_participants" && has(call, "update"));

const THREAD = [
  { id: "m1", conversation_id: "c1", sender_id: "joshua", body: "Start with PT105.S2", created_at: "2026-10-21T10:00:00.111111+00:00" },
  { id: "m2", conversation_id: "c1", sender_id: "joshua", body: "Then the review", created_at: "2026-10-21T10:05:00.222222+00:00" },
  { id: "m3", conversation_id: "c1", sender_id: "ada", body: "Will do", created_at: "2026-10-21T10:06:00.333333+00:00" },
];

let threadMessages = THREAD;
let threadError: unknown = null;
let writeError: unknown = null;
let receipt: string | null = null;

function serve() {
  fake.state.respond = (call) => {
    if (call.table === "messages" && call.ops.some((op) => op.method === "select" && op.args[0] === "*")) {
      return threadError ? { data: null, error: threadError } : { data: has(call, "or") ? [] : threadMessages, error: null };
    }
    if (call.table === "message_attachments") return { data: [], error: null };
    if (call.table === "conversation_participants" && has(call, "update")) {
      if (writeError) return { data: null, error: writeError };
      const value = (call.ops.find((op) => op.method === "update")!.args[0] as { last_read_at: string }).last_read_at;
      receipt = value;
      return { data: [{ id: "p1", last_read_at: value }], error: null };
    }
    if (call.table === "conversation_participants" && has(call, "maybeSingle")) {
      return { data: { id: "p1", last_read_at: receipt }, error: null };
    }
    // Inbox summary reads: one thread, unread while the receipt is behind m2.
    if (call.table === "conversation_participants" && !has(call, "in")) {
      return { data: [{ conversation_id: "c1", last_read_at: receipt, home_cleared_at: null }], error: null };
    }
    if (call.table === "conversation_participants") {
      return { data: [{ id: "p1", conversation_id: "c1", user_id: "ada", last_read_at: receipt }], error: null };
    }
    if (call.table === "conversations") {
      return { data: [{ id: "c1", subject: null, created_by: "joshua", created_at: "2026-10-01T00:00:00Z", last_message_at: THREAD[2].created_at }], error: null };
    }
    if (call.table === "messages") {
      const incoming = threadMessages.filter((m) => m.sender_id !== "ada");
      const unread = receipt ? incoming.filter((m) => m.created_at > receipt!) : incoming;
      return { data: has(call, "or") ? [] : unread, error: null };
    }
    return { data: [], error: null };
  };
  fake.state.rpc = (name) =>
    name === "get_latest_messages"
      ? { data: [{ conversation_id: "c1", body: "Will do", created_at: THREAD[2].created_at, sender_id: "ada" }], error: null }
      : { data: [], error: null };
}

beforeEach(() => {
  __resetInboxStoreForTests();
  auth.user = { id: "ada" };
  fake.state.calls = [];
  fake.state.channels = [];
  threadMessages = THREAD;
  threadError = null;
  writeError = null;
  receipt = null;
  serve();
});

afterEach(() => {
  __resetInboxStoreForTests();
});

describe("useConversationMessages read receipts", () => {
  it("acknowledges through the newest INCOMING message it rendered", async () => {
    const { result } = renderHook(() => useConversationMessages("c1", { active: true }));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    await waitFor(() => expect(updates()).toHaveLength(1));
    // m2 is the newest message from Joshua; m3 is Ada's own reply.
    expect(updates()[0].ops.find((op) => op.method === "update")!.args[0]).toEqual({ last_read_at: THREAD[1].created_at });
  });

  it("never acknowledges from a closed panel, even when messages arrive", async () => {
    const { result } = renderHook(() => useConversationMessages("c1", { active: false }));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    threadMessages = [...THREAD, { id: "m4", conversation_id: "c1", sender_id: "joshua", body: "New", created_at: "2026-10-21T11:00:00Z" }];
    // A realtime INSERT re-reads the thread.
    await act(async () => {
      fake.state.channels.at(-1)!.handlers.forEach((handler) => handler());
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    expect(updates()).toHaveLength(0);
  });

  it("does not acknowledge a thread that failed to load", async () => {
    threadError = { message: "network" };
    const { result } = renderHook(() => useConversationMessages("c1", { active: true }));
    await waitFor(() => expect(result.current.error).toBe("Could not load this conversation"));
    expect(updates()).toHaveLength(0);
  });

  it("keeps the thread unread on a failed write and retries on request", async () => {
    writeError = { message: "permission denied" };
    const { result } = renderHook(() => useConversationMessages("c1", { active: true }));
    await waitFor(() => expect(result.current.readError).toBe("Could not mark this conversation as read."));
    expect(receipt).toBeNull();
    writeError = null;
    act(() => result.current.retryRead());
    await waitFor(() => expect(result.current.readError).toBeNull());
    expect(receipt).toBe(THREAD[1].created_at);
  });

  it("acknowledges a message that arrives later only once it has been shown", async () => {
    const { result } = renderHook(() => useConversationMessages("c1", { active: true }));
    await waitFor(() => expect(updates()).toHaveLength(1));
    const later = { id: "m4", conversation_id: "c1", sender_id: "joshua", body: "One more", created_at: "2026-10-21T11:00:00.000001+00:00" };
    threadMessages = [...THREAD, later];
    await act(async () => {
      fake.state.channels.at(-1)!.handlers.forEach((handler) => handler());
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(4));
    await waitFor(() => expect(updates()).toHaveLength(2));
    expect(receipt).toBe(later.created_at);
  });
});

describe("one unread count everywhere", () => {
  it("the rail, Home and a mainhub consumer share one fetch and agree, then clear together", async () => {
    // Rail (useUnreadMessageCount), Home and MainhubChatButton (useInbox().unreadCount).
    const rail = renderHook(() => useUnreadMessageCount());
    const home = renderHook(() => useInbox());
    const mainhub = renderHook(() => useInbox());
    await waitFor(() => expect(home.result.current.loaded).toBe(true));
    // Two unread messages from Joshua in one thread: one unread conversation.
    expect(rail.result.current).toBe(1);
    expect(home.result.current.unreadCount).toBe(1);
    expect(mainhub.result.current.unreadCount).toBe(1);
    expect(fake.state.channels.filter((c) => c.name.startsWith("inbox-summaries-"))).toHaveLength(1);

    const thread = renderHook(() => useConversationMessages("c1", { active: true }));
    await waitFor(() => expect(thread.result.current.messages).toHaveLength(3));
    await waitFor(() => expect(rail.result.current).toBe(0));
    expect(home.result.current.unreadCount).toBe(0);
    expect(mainhub.result.current.unreadCount).toBe(0);
  });

  it("does not show the previous account's count after a switch", async () => {
    const { result, rerender } = renderHook(() => useUnreadMessageCount());
    await waitFor(() => expect(result.current).toBe(1));
    auth.user = { id: "bea" };
    fake.state.respond = () => ({ data: [], error: null });
    rerender();
    expect(result.current).toBe(0);
    await act(async () => { await Promise.resolve(); });
  });
});


describe("actor ownership in a mounted thread", () => {
  it("clears the previous payload immediately and independently acknowledges the same thread for the next actor", async () => {
    const { result, rerender } = renderHook(() => useConversationMessages("c1", { active: true }));
    await waitFor(() => expect(updates()).toHaveLength(1));
    auth.user = { id: "bea" };
    let release: (value: { data: unknown; error: unknown }) => void = () => {};
    const previous = fake.state.respond;
    let deferred = false;
    fake.state.respond = (call) => {
      if (call.table === "messages" && call.ops.some((op) => op.method === "select" && op.args[0] === "*") && !has(call, "or") && !deferred) {
        deferred = true;
        return new Promise((resolve) => { release = resolve; }) as never;
      }
      return previous(call);
    };
    rerender();
    expect(result.current.messages).toEqual([]);
    await waitFor(() => expect(deferred).toBe(true));
    await act(async () => { release({ data: THREAD, error: null }); });
    await waitFor(() => expect(result.current.messages).toHaveLength(3));
    await waitFor(() => expect(updates()).toHaveLength(2));
    expect(updates()[1].ops).toContainEqual({ method: "eq", args: ["user_id", "bea"] });
    expect(updates()[1].ops.find((op) => op.method === "update")!.args[0]).toEqual({ last_read_at: THREAD[2].created_at });
  });
});


it("ignores a failed receipt write from the previous actor while the same thread is open", async () => {
  const serveOriginal = fake.state.respond;
  let releaseWrite: (value: { data: unknown; error: unknown }) => void = () => {};
  let pendingWrite = false;
  fake.state.respond = (call) => {
    if (call.table === "conversation_participants" && has(call, "update") &&
      call.ops.some((op) => op.method === "eq" && op.args[0] === "user_id" && op.args[1] === "ada")) {
      pendingWrite = true;
      return new Promise((resolve) => { releaseWrite = resolve; }) as never;
    }
    return serveOriginal(call);
  };
  const { result, rerender } = renderHook(() => useConversationMessages("c1", { active: true }));
  await waitFor(() => expect(pendingWrite).toBe(true));
  auth.user = { id: "bea" };
  rerender();
  await waitFor(() => expect(updates().some((call) => call.ops.some((op) => op.method === "eq" && op.args[0] === "user_id" && op.args[1] === "bea"))).toBe(true));
  await act(async () => { releaseWrite({ data: null, error: { message: "old actor denied" } }); });
  expect(result.current.readError).toBeNull();
  expect(result.current.messages).toHaveLength(3);
  expect(receipt).toBe(THREAD[2].created_at);
});
