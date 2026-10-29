import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const state = {
  parts: [] as Array<{ conversation_id: string; last_read_at: string | null }>,
  latest: [] as Array<{ conversation_id: string; id: string; body: string; created_at: string; sender_id: string }>,
  names: [] as Array<{ user_id: string; is_admin: boolean }>,
  convs: [] as Array<{ id: string; subject: string | null }>,
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      calls.push(`from:${table}`);
      const result =
        table === "conversation_participants"
          ? { data: state.parts, error: null }
          : { data: state.convs, error: null };
      const chain = {
        select: () => chain,
        eq: () => Promise.resolve(result),
        in: () => Promise.resolve(result),
      };
      return chain;
    },
    rpc: (name: string) => {
      calls.push(`rpc:${name}`);
      if (name === "get_latest_messages") return Promise.resolve({ data: state.latest, error: null });
      if (name === "get_conversation_participant_names") return Promise.resolve({ data: state.names, error: null });
      return Promise.resolve({ data: null, error: { message: `unexpected rpc ${name}` } });
    },
  },
}));

const { loadInstructorMessages } = await import("./useInstructorMessages");

const ME = "student-1";
const JOSHUA = "admin-1";

beforeEach(() => {
  calls.length = 0;
  state.parts = [];
  state.latest = [];
  state.names = [];
  state.convs = [];
});

describe("loadInstructorMessages", () => {
  it("stops after one read when the student has no threads", async () => {
    expect(await loadInstructorMessages(ME)).toEqual([]);
    expect(calls).toEqual(["from:conversation_participants"]);
  });

  it("stops after two reads when nothing is unread", async () => {
    state.parts = [{ conversation_id: "c1", last_read_at: "2026-09-09T12:00:00.000Z" }];
    state.latest = [
      { conversation_id: "c1", id: "m1", body: "Seen already", created_at: "2026-09-09T11:00:00.000Z", sender_id: JOSHUA },
    ];
    expect(await loadInstructorMessages(ME)).toEqual([]);
    expect(calls).toEqual(["from:conversation_participants", "rpc:get_latest_messages"]);
  });

  it("ignores the student's own newest message", async () => {
    state.parts = [{ conversation_id: "c1", last_read_at: "2026-09-09T11:00:00.000Z" }];
    state.latest = [
      { conversation_id: "c1", id: "m1", body: "My reply", created_at: "2026-09-09T12:00:00.000Z", sender_id: ME },
    ];
    expect(await loadInstructorMessages(ME)).toEqual([]);
    expect(calls).not.toContain("rpc:get_conversation_participant_names");
  });

  it("drops an unread message from a non-instructor", async () => {
    state.parts = [{ conversation_id: "c1", last_read_at: "2026-09-09T11:00:00.000Z" }];
    state.latest = [
      { conversation_id: "c1", id: "m1", body: "Can you send notes?", created_at: "2026-09-09T12:00:00.000Z", sender_id: "student-2" },
    ];
    state.names = [{ user_id: "student-2", is_admin: false }];
    expect(await loadInstructorMessages(ME)).toEqual([]);
    expect(calls).not.toContain("from:conversations");
  });

  it("returns an unread instructor message with its subject, newest first", async () => {
    state.parts = [
      { conversation_id: "c1", last_read_at: "2026-09-09T11:00:00.000Z" },
      { conversation_id: "c2", last_read_at: null },
    ];
    state.latest = [
      { conversation_id: "c1", id: "m1", body: "Review question 14.", created_at: "2026-09-09T12:00:00.000Z", sender_id: JOSHUA },
      { conversation_id: "c2", id: "m2", body: "Welcome aboard.", created_at: "2026-09-09T13:00:00.000Z", sender_id: JOSHUA },
    ];
    state.names = [{ user_id: JOSHUA, is_admin: true }];
    state.convs = [
      { id: "c1", subject: "Question 14" },
      { id: "c2", subject: null },
    ];

    expect(await loadInstructorMessages(ME)).toEqual([
      { conversationId: "c2", subject: null, body: "Welcome aboard.", createdAt: "2026-09-09T13:00:00.000Z" },
      { conversationId: "c1", subject: "Question 14", body: "Review question 14.", createdAt: "2026-09-09T12:00:00.000Z" },
    ]);
    expect(calls).toEqual([
      "from:conversation_participants",
      "rpc:get_latest_messages",
      "rpc:get_conversation_participant_names",
      "from:conversations",
    ]);
  });
});
