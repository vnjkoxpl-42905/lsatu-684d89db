import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  classify,
  coverage,
  docId,
  isSyncAction,
  matchStudent,
  recordSyncAttempt,
  runWorker,
  type WorkerIO,
} from "./model.ts";
const roster = [{ id: "s", email: "a+study@gmail.com", name: "A" }];
const event = {
  id: "instance-1",
  summary: "LSAT session",
  start: { dateTime: "2026-10-27T10:00:00Z" },
  end: { dateTime: "2026-10-27T11:00:00Z" },
  attendees: [{ email: " A+study@gmail.com " }],
};
const cutoff = "2026-10-26T00:00:00Z", now = "2026-10-27T12:00:00Z";
Deno.test("exact normalized email; no Gmail alias guessing; ambiguity and archive hold", () => {
  assertEquals(
    classify(event, roster, "teacher@x.com", cutoff, now)?.student_id,
    "s",
  );
  assertEquals(
    classify(
      { ...event, attendees: [{ email: "a@gmail.com" }] },
      roster,
      "teacher@x.com",
      cutoff,
      now,
    )?.match_state,
    "needs_match",
  );
  assertEquals(
    classify(
      event,
      [...roster, { ...roster[0], id: "b" }],
      "teacher@x.com",
      cutoff,
      now,
    )?.match_state,
    "needs_match",
  );
  assertEquals(
    classify(
      event,
      [{ ...roster[0], archived: true }],
      "teacher@x.com",
      cutoff,
      now,
    )?.match_state,
    "needs_match",
  );
});
Deno.test("cutoff, future reschedule, cancellations and all day", () => {
  assertEquals(classify(event, roster, "t", now, now), null);
  assertEquals(
    classify(
      { ...event, end: { dateTime: "2026-10-28T11:00:00Z" } },
      roster,
      "t",
      cutoff,
      now,
    ),
    null,
  );
  assertEquals(
    classify(
      { ...event, end: { dateTime: "2026-10-28T11:00:00Z" } },
      roster,
      "t",
      cutoff,
      now,
      true,
    )?.source_state,
    "rescheduled",
  );
  assertEquals(
    classify({ ...event, status: "cancelled" }, roster, "t", cutoff, now),
    null,
  );
  assertEquals(
    classify({ ...event, status: "cancelled" }, roster, "t", cutoff, now, true)
      ?.source_state,
    "cancelled",
  );
  assertEquals(
    classify({ ...event, start: {}, end: {} }, roster, "t", cutoff, now),
    null,
  );
});
Deno.test("native unique transcript only and strict URL", () => {
  const attachment = (id: string) => ({
    mimeType: "application/vnd.google-apps.document",
    title: "Notes by Gemini",
    fileUrl: `https://docs.google.com/document/d/${id}/edit`,
  });
  assertEquals(
    classify(
      { ...event, attachments: [attachment("abcdefghijk")] },
      roster,
      "t",
      cutoff,
      now,
    )?.transcript_status,
    "linked",
  );
  assertEquals(
    classify(
      {
        ...event,
        attachments: [attachment("abcdefghijk"), attachment("bcdefghijkl")],
      },
      roster,
      "t",
      cutoff,
      now,
    )?.transcript_status,
    "needs_review",
  );
  assertEquals(docId("javascript:alert(1)"), null);
  assertEquals(docId("https://evil.com/document/d/abcdefghijk"), null);
});
Deno.test("outage chunks move forward and overlap", () => {
  assertEquals(coverage("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z", now), {
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-01-09T00:00:00.000Z",
    catchingUp: true,
  });
});
function io(fail = false) {
  const calls: any[] = [];
  let pages = 0;
  const deps: WorkerIO = {
    renew: async () => {
      calls.push("renew");
    },
    list: async (p) => {
      calls.push(p);
      if (fail) throw Error("network");
      pages++;
      return {
        items: [{ ...event, id: String(pages) }],
        nextPageToken: pages === 1 ? "next" : undefined,
      };
    },
    save: async (e) => {
      calls.push(e.id);
    },
    revisits: async () => [{ event_id: "old" }],
    get: async () => {
      throw Object.assign(Error("gone"), { status: 404 });
    },
    unavailable: async (id) => {
      calls.push(`unavailable:${id}`);
    },
    finish: async (...args) => {
      calls.push(["finish", ...args]);
    },
  };
  return { deps, calls };
}
Deno.test("all pages, both passes, checkpoints only after complete writes, 404 retained", async () => {
  const { deps, calls } = io();
  await runWorker(deps, {
    activation_cutoff: cutoff,
    covered_through: null,
    updated_checkpoint: null,
  }, now);
  assertEquals(
    calls.filter((c) => typeof c === "object" && !Array.isArray(c)).length,
    3,
  );
  assertEquals(calls.some((c) => c.pageToken === "next"), true);
  assertEquals(calls.includes("unavailable:old"), true);
  assertEquals(calls.at(-1)[0], "finish");
});
Deno.test("failed page does not advance cursor; expired lease blocks writes", async () => {
  const { deps, calls } = io(true);
  await assertRejects(() =>
    runWorker(deps, {
      activation_cutoff: cutoff,
      covered_through: null,
      updated_checkpoint: null,
    }, now)
  );
  assertEquals(calls.some((c) => Array.isArray(c) && c[0] === "finish"), false);
  const second = io();
  second.deps.renew = async () => {
    throw Error("lease_lost");
  };
  await assertRejects(() =>
    runWorker(second.deps, {
      activation_cutoff: cutoff,
      covered_through: null,
      updated_checkpoint: null,
    }, now)
  );
  assertEquals(second.calls.length, 0);
});

Deno.test("verified student identity takes precedence over loose title exclusions", () => {
  for (
    const summary of [
      "Personal statement session",
      "Holiday LSAT session",
      "Consultation follow-up session",
    ]
  ) {
    assertEquals(
      classify(
        { ...event, summary },
        roster,
        "teacher@example.com",
        cutoff,
        now,
      )?.student_id,
      "s",
    );
  }
  assertEquals(
    classify(
      {
        ...event,
        summary: "Personal planning session",
        attendees: [{ email: "unknown@example.com" }],
      },
      roster,
      "teacher@example.com",
      cutoff,
      now,
    ),
    null,
  );
});
Deno.test("unmatched teaching tasks require a real non-declined guest", () => {
  for (
    const attendees of [[], [{ email: "teacher@example.com" }], [{
      email: "unknown@example.com",
      responseStatus: "declined",
    }], [{ email: "room@example.com", resource: true }]]
  ) {
    assertEquals(
      classify(
        { ...event, attendees },
        roster,
        "teacher@example.com",
        cutoff,
        now,
      ),
      null,
    );
  }
  assertEquals(
    classify(
      { ...event, attendees: [{ email: "unknown@example.com" }] },
      roster,
      "teacher@example.com",
      cutoff,
      now,
    )?.match_state,
    "needs_match",
  );
});
Deno.test("only sync actions own sync attempt and failure reporting", () => {
  assertEquals(isSyncAction(), true);
  assertEquals(isSyncAction("sync"), true);
  for (
    const action of ["status", "folder_links", "import_folders", "unknown"]
  ) assertEquals(isSyncAction(action), false);
});
Deno.test("an unnamed native Google Doc is held for review rather than silently waiting", () => {
  const attachment = {
    mimeType: "application/vnd.google-apps.document",
    title: "Session document",
    fileUrl: "https://docs.google.com/document/d/abcdefghijk/edit",
  };
  const source = classify(
    { ...event, attachments: [attachment] },
    roster,
    "teacher@example.com",
    cutoff,
    now,
  );
  assertEquals(source?.transcript_status, "needs_review");
  assertEquals(source?.transcript_doc_id, null);
});

Deno.test("read, status and import actions cannot write sync attempt or failure state", async () => {
  let writes = 0;
  const write = async () => {
    writes++;
  };
  for (
    const action of ["status", "folder_links", "import_folders", "invalid"]
  ) {
    await recordSyncAttempt(action, write);
    await recordSyncAttempt(action, write);
  }
  assertEquals(writes, 0);
  await recordSyncAttempt("sync", write);
  await recordSyncAttempt(undefined, write);
  assertEquals(writes, 2);
});

Deno.test("worker classify and agenda matcher agree on identical organizer/resource/ambiguous inputs", () => {
  const teacher = "teacher@x.com";
  const students = [{ id: "a", email: "a@example.com", name: "A" }, {
    id: "b",
    email: "b@example.com",
    name: "B",
  }];
  const inputs = [
    [{ email: teacher, organizer: true }, { email: "a@example.com" }],
    [{ email: "a@example.com", organizer: true }],
    [{ email: "a@example.com", organizer: true, responseStatus: "declined" }],
    [{ email: "a@example.com", resource: true }],
    [{ email: "a@example.com" }, { email: "b@example.com" }],
  ];
  for (const attendees of inputs) {
    const input = { ...event, attendees };
    assertEquals(
      classify(input, students, teacher, cutoff, now)?.student_id ?? null,
      matchStudent(input, students, teacher)?.id ?? null,
    );
  }
  assertEquals(
    classify(
      { ...event, attendees: [{ email: "a@example.com", organizer: true }] },
      students,
      teacher,
      cutoff,
      now,
    )?.student_id,
    "a",
  );
});
