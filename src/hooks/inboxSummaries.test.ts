import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * A chainable Supabase fake. Each query records its table and filter calls,
 * and `respond` decides what it resolves to, so a test states the server's
 * answer for exactly the read or write it cares about.
 */
type Op = { method: string; args: unknown[] };
type Call = { table: string; ops: Op[] };
type Result = { data: unknown; error: unknown };

const fake = vi.hoisted(() => {
  const state = {
    calls: [] as Array<{ table: string; ops: Array<{ method: string; args: unknown[] }> }>,
    respond: (_call: { table: string; ops: Array<{ method: string; args: unknown[] }> }): { data: unknown; error: unknown } => ({ data: [], error: null }),
    rpc: (_name: string, _args: unknown): { data: unknown; error: unknown } => ({ data: [], error: null }),
    channels: [] as Array<{ name: string; handlers: Array<() => void>; filters: Array<Record<string, unknown>> }>,
    removed: 0,
  };
  const builder = (table: string) => {
    const call = { table, ops: [] as Array<{ method: string; args: unknown[] }> };
    state.calls.push(call);
    const proxy: Record<string, unknown> = {};
    for (const method of ["select", "update", "eq", "neq", "in", "gt", "or", "order", "maybeSingle", "delete", "limit", "gte"]) {
      proxy[method] = (...args: unknown[]) => {
        call.ops.push({ method, args });
        return proxy;
      };
    }
    proxy.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve().then(() => state.respond(call)).then(resolve, reject);
    return proxy;
  };
  const supabase = {
    from: (table: string) => builder(table),
    rpc: (name: string, args: unknown) => Promise.resolve(state.rpc(name, args)),
    channel: (name: string) => {
      const record = { name, handlers: [] as Array<() => void>, filters: [] as Array<Record<string, unknown>> };
      state.channels.push(record);
      const channel = {
        on: (_type: string, _filter: unknown, handler: () => void) => {
          record.handlers.push(handler);
          record.filters.push(_filter as Record<string, unknown>);
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: () => {
      state.removed++;
      return Promise.resolve();
    },
  };
  return { state, supabase };
});

vi.mock("@/integrations/supabase/client", () => ({ supabase: fake.supabase }));

import {
  __resetInboxStoreForTests,
  acknowledgeConversationRead,
  getInboxSnapshot,
  refreshInbox,
  subscribeInbox,
  timestampKey,
  fetchAllAscending,
} from "./inboxSummaries";

const has = (call: Call, method: string) => call.ops.some((op) => op.method === method);
const arg = (call: Call, method: string) => call.ops.find((op) => op.method === method)?.args;

/** A one-thread inbox for `userId` with the given receipt and messages. */
function serveInbox({
  userId,
  lastReadAt,
  incoming,
}: {
  userId: string;
  lastReadAt: string | null;
  incoming: string[];
}) {
  fake.state.respond = (call): Result => {
    if (call.table === "conversation_participants" && has(call, "eq") && !has(call, "in")) {
      return { data: [{ conversation_id: "c1", last_read_at: lastReadAt, home_cleared_at: null }], error: null };
    }
    if (call.table === "conversation_participants") {
      return { data: [{ id: "p1", conversation_id: "c1", user_id: userId, last_read_at: lastReadAt }], error: null };
    }
    if (call.table === "conversations") {
      return { data: [{ id: "c1", subject: null, created_by: "joshua", created_at: "2026-10-01T00:00:00Z", last_message_at: incoming.at(-1) }], error: null };
    }
    if (call.table === "messages") {
      return { data: has(call, "or") ? [] : incoming.map((created_at, i) => ({ id: `m${i}`, conversation_id: "c1", created_at, body: "incoming", sender_id: "joshua" })), error: null };
    }
    return { data: [], error: null };
  };
  fake.state.rpc = (name): Result =>
    name === "get_latest_messages"
      ? { data: [{ conversation_id: "c1", body: "hi", created_at: incoming.at(-1), sender_id: "joshua" }], error: null }
      : { data: [], error: null };
}

beforeEach(() => {
  __resetInboxStoreForTests();
  fake.state.calls = [];
  fake.state.channels = [];
  fake.state.removed = 0;
});

afterEach(() => {
  __resetInboxStoreForTests();
});

describe("timestampKey", () => {
  it("keeps microseconds, so a watermark covers the message it names", () => {
    const message = "2026-10-22T12:00:00.123456+00:00";
    expect(timestampKey(message)).toBeGreaterThan(timestampKey("2026-10-22T12:00:00.123Z"));
    expect(timestampKey(message)).toBe(timestampKey("2026-10-22T12:00:00.123456Z"));
    expect(timestampKey(null)).toBe(0);
  });
});

describe("inbox summaries store", () => {
  it("counts one conversation however many messages are unread in it", async () => {
    serveInbox({
      userId: "ada",
      lastReadAt: "2026-10-20T00:00:00Z",
      incoming: ["2026-10-21T10:00:00Z", "2026-10-21T11:00:00Z", "2026-10-21T12:00:00Z"],
    });
    const off = subscribeInbox("ada", () => {});
    await vi.waitFor(() => expect(getInboxSnapshot("ada").loaded).toBe(true));
    const conversations = getInboxSnapshot("ada").conversations;
    expect(conversations.filter((c) => c.unread)).toHaveLength(1);
    expect(conversations[0].latest_unread_at).toBe("2026-10-21T12:00:00Z");
    off();
  });

  it("reports a failed read as an error, never as an empty inbox", async () => {
    fake.state.respond = () => ({ data: null, error: { message: "boom" } });
    const off = subscribeInbox("ada", () => {});
    await vi.waitFor(() => expect(getInboxSnapshot("ada").error).toBe("Could not load your messages"));
    expect(getInboxSnapshot("ada").loaded).toBe(false);
    off();
  });

  it("opens one channel for many subscribers and closes it with the last", async () => {
    serveInbox({ userId: "ada", lastReadAt: null, incoming: ["2026-10-21T10:00:00Z"] });
    const offA = subscribeInbox("ada", () => {});
    const offB = subscribeInbox("ada", () => {});
    const offC = subscribeInbox("ada", () => {});
    expect(fake.state.channels).toHaveLength(1);
    offA();
    offB();
    expect(fake.state.removed).toBe(0);
    offC();
    expect(fake.state.removed).toBe(1);
  });

  it("never lets an older response overwrite a newer one", async () => {
    let release: (value: Result) => void = () => {};
    let first = true;
    fake.state.respond = (call) => {
      if (call.table === "conversation_participants" && !has(call, "in") && first) {
        first = false;
        // The first read stalls; it will come back saying "one conversation".
        return new Promise<Result>((resolve) => { release = resolve; }) as unknown as Result;
      }
      // The second read says the actor has no conversations.
      return { data: [], error: null };
    };
    const stale = refreshInbox("ada");
    const fresh = refreshInbox("ada");
    await fresh;
    expect(getInboxSnapshot("ada").loaded).toBe(true);
    release({ data: [{ conversation_id: "c1", last_read_at: null, home_cleared_at: null }], error: null });
    await stale;
    expect(getInboxSnapshot("ada").conversations).toEqual([]);
  });

  it("keeps each account's summaries apart and drops the old one on a switch", async () => {
    serveInbox({ userId: "ada", lastReadAt: null, incoming: ["2026-10-21T10:00:00Z"] });
    const offAda = subscribeInbox("ada", () => {});
    await vi.waitFor(() => expect(getInboxSnapshot("ada").loaded).toBe(true));
    offAda();
    fake.state.respond = () => ({ data: [], error: null });
    const offBea = subscribeInbox("bea", () => {});
    // A fresh account starts unknown, not with Ada's thread.
    expect(getInboxSnapshot("bea").conversations).toEqual([]);
    expect(getInboxSnapshot("bea").loaded).toBe(false);
    await vi.waitFor(() => expect(getInboxSnapshot("bea").loaded).toBe(true));
    expect(getInboxSnapshot("bea").conversations).toEqual([]);
    offBea();
  });
});

describe("acknowledgeConversationRead", () => {
  const watermark = "2026-10-21T12:00:00.654321+00:00";

  it("advances a null receipt with a conditional update, never the client clock", async () => {
    fake.state.respond = (call) =>
      has(call, "update") ? { data: [{ id: "p1", last_read_at: watermark }], error: null } : { data: [], error: null };
    await expect(acknowledgeConversationRead({ userId: "ada", conversationId: "c1", watermark })).resolves.toBe("acknowledged");
    const update = fake.state.calls.find((call) => has(call, "update"))!;
    expect(arg(update, "update")).toEqual([{ last_read_at: watermark }]);
    expect(arg(update, "or")).toEqual([`last_read_at.is.null,last_read_at.lt."${watermark}"`]);
  });

  it("treats a newer receipt as success and leaves it where it is", async () => {
    fake.state.respond = (call) => {
      if (has(call, "update")) return { data: [], error: null };
      if (has(call, "maybeSingle")) return { data: { id: "p1", last_read_at: "2026-10-22T09:00:00Z" }, error: null };
      return { data: [], error: null };
    };
    await expect(acknowledgeConversationRead({ userId: "ada", conversationId: "c1", watermark })).resolves.toBe("acknowledged");
    // Only the one conditional update was attempted; nothing wrote a smaller value.
    expect(fake.state.calls.filter((call) => has(call, "update"))).toHaveLength(1);
  });

  it("reports a deleted membership and removes its summary", async () => {
    serveInbox({ userId: "ada", lastReadAt: null, incoming: ["2026-10-21T10:00:00Z"] });
    const off = subscribeInbox("ada", () => {});
    await vi.waitFor(() => expect(getInboxSnapshot("ada").conversations).toHaveLength(1));
    fake.state.respond = (call) => {
      if (has(call, "update")) return { data: [], error: null };
      if (has(call, "maybeSingle")) return { data: null, error: null };
      return { data: [], error: null };
    };
    await expect(acknowledgeConversationRead({ userId: "ada", conversationId: "c1", watermark })).resolves.toBe("missing");
    expect(getInboxSnapshot("ada").conversations).toHaveLength(0);
    off();
  });

  it("throws on a denied write, so the thread stays unread", async () => {
    fake.state.respond = (call) =>
      has(call, "update") ? { data: null, error: { message: "permission denied" } } : { data: [], error: null };
    await expect(acknowledgeConversationRead({ userId: "ada", conversationId: "c1", watermark })).rejects.toBeTruthy();
  });

  it("throws when the receipt is still older after the write", async () => {
    fake.state.respond = (call) => {
      if (has(call, "update")) return { data: [], error: null };
      if (has(call, "maybeSingle")) return { data: { id: "p1", last_read_at: "2026-10-01T00:00:00Z" }, error: null };
      return { data: [], error: null };
    };
    await expect(acknowledgeConversationRead({ userId: "ada", conversationId: "c1", watermark })).rejects.toThrow(
      "The read receipt did not save.",
    );
  });

  it("leaves a message that arrived after the watermark unread", async () => {
    // Two incoming messages; the reader only saw the first.
    serveInbox({
      userId: "ada",
      lastReadAt: "2026-10-20T00:00:00Z",
      incoming: ["2026-10-21T10:00:00Z", "2026-10-21T13:00:00Z"],
    });
    const off = subscribeInbox("ada", () => {});
    await vi.waitFor(() => expect(getInboxSnapshot("ada").loaded).toBe(true));
    const serve = fake.state.respond;
    fake.state.respond = (call) =>
      has(call, "update") ? { data: [{ id: "p1", last_read_at: "2026-10-21T10:00:00Z" }], error: null } : serve(call);
    await acknowledgeConversationRead({ userId: "ada", conversationId: "c1", watermark: "2026-10-21T10:00:00Z" });
    expect(getInboxSnapshot("ada").conversations[0].unread).toBe(true);
    off();
  });
});


describe("keyset pagination", () => {
  it.each([1000, 250])("reads beyond 1000 including timestamp ties with a server cap of %i", async (cap) => {
    const rows = Array.from({ length: 1205 }, (_, i) => ({
      id: String(i).padStart(6, "0"),
      created_at: "2026-10-21T10:00:00.123456+00:00",
    }));
    fake.state.respond = (call) => {
      const cursor = String(arg(call, "or")?.[0] ?? "");
      const id = /id.gt.(\d+)/.exec(cursor)?.[1];
      return { data: rows.filter((row) => !id || row.id > id).slice(0, cap), error: null };
    };
    const result = await fetchAllAscending(() => (fake.supabase.from("messages").select as (columns: string) => unknown)("*"));
    expect(result).toEqual(rows);
    expect(new Set(result.map((row) => row.id)).size).toBe(1205);
    const calls = fake.state.calls.filter((call) => call.table === "messages");
    expect(calls).toHaveLength(Math.ceil(1205 / cap) + 1);
    expect(arg(calls[1], "or")?.[0]).toContain(`id.gt.${rows[cap - 1].id}`);
  });
});


describe("attention previews and participant receipts", () => {
  it("keeps the incoming unread preview separate from the viewer's newest outgoing line", async () => {
    serveInbox({ userId: "ada", lastReadAt: null, incoming: ["2026-10-21T10:00:00Z"] });
    fake.state.rpc = (name) => name === "get_latest_messages"
      ? { data: [{ conversation_id: "c1", body: "My reply", created_at: "2026-10-21T11:00:00Z", sender_id: "ada" }], error: null }
      : { data: [], error: null };
    await refreshInbox("ada");
    const conversation = getInboxSnapshot("ada").conversations[0];
    expect(conversation.unread).toBe(true);
    expect(conversation.last_message?.body).toBe("My reply");
    expect(conversation.latest_unread_message?.body).toBe("incoming");
    expect(conversation.latest_unread_message?.sender_id).toBe("joshua");
  });

  it("refreshes other-party read receipts from a participant event without a new message", async () => {
    serveInbox({ userId: "ada", lastReadAt: null, incoming: ["2026-10-21T10:00:00Z"] });
    const serve = fake.state.respond;
    let otherReceipt = "2026-10-20T00:00:00Z";
    fake.state.respond = (call) => call.table === "conversation_participants" && has(call, "in")
      ? { data: [{ id: "p2", conversation_id: "c1", user_id: "joshua", last_read_at: otherReceipt }], error: null }
      : serve(call);
    const off = subscribeInbox("ada", () => {});
    await vi.waitFor(() => expect(getInboxSnapshot("ada").loaded).toBe(true));
    const channel = fake.state.channels[0];
    const index = channel.filters.findIndex((filter) => filter.table === "conversation_participants");
    expect(index).toBeGreaterThanOrEqual(0);
    expect(channel.filters[index].filter).toBeUndefined();
    otherReceipt = "2026-10-22T00:00:00Z";
    channel.handlers[index]();
    await vi.waitFor(() => expect(getInboxSnapshot("ada").conversations[0].participants[0].last_read_at).toBe(otherReceipt));
    off();
  });
});
