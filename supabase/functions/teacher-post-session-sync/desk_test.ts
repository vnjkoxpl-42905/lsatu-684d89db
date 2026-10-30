import {
  candidateEmails,
  classify,
  consultationSource,
  matchStudent,
} from "./model.ts";
const teacher = "owner@example.com";
const student = { id: "student", name: "A", email: "a@example.com" };
const event = {
  id: "instance1",
  summary: "Lesson",
  start: { dateTime: "2026-10-28T10:00:00Z" },
  end: { dateTime: "2026-10-28T11:00:00Z" },
  attendees: [{ email: teacher, organizer: true }, {
    email: student.email,
    organizer: true,
  }],
};
function equal(a: unknown, b: unknown) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(JSON.stringify({ actual: a, expected: b }));
  }
}
Deno.test("same exact matcher includes student organizer and excludes teacher resources and declined", () => {
  equal(candidateEmails(event, teacher), [student.email]);
  equal(matchStudent(event, [student], teacher)?.id, "student");
  for (
    const modifier of [{ responseStatus: "declined" }, { resource: true }, {
      self: true,
    }]
  ) {
    equal(
      matchStudent(
        { ...event, attendees: [{ email: student.email, ...modifier }] },
        [student],
        teacher,
      ),
      null,
    );
  }
  equal(
    matchStudent(
      { ...event, attendees: [...event.attendees, { email: "b@example.com" }] },
      [student, { id: "b", name: "B", email: "b@example.com" }],
      teacher,
    ),
    null,
  );
  equal(matchStudent(event, [{ ...student, archived: true }], teacher), null);
  equal(
    classify(
      event,
      [student],
      teacher,
      "2026-10-28T09:00:00Z",
      "2026-10-28T12:00:00Z",
    )?.student_id,
    "student",
  );
});
Deno.test("explicit session label establishes task type but never guesses student identity", () => {
  const unknown = { ...event, attendees: [{ email: "unknown@example.com" }] };
  equal(
    classify(
      unknown,
      [student],
      teacher,
      "2026-10-28T09:00:00Z",
      "2026-10-28T12:00:00Z",
    ),
    null,
  );
  equal(
    classify(
      unknown,
      [student],
      teacher,
      "2026-10-28T09:00:00Z",
      "2026-10-28T12:00:00Z",
      false,
      true,
    )?.match_state,
    "needs_match",
  );
});
Deno.test("consultation source requires guest and timed ended instance, cancellation preserved", () => {
  equal(
    consultationSource(event, teacher, "2026-10-28T12:00:00Z").source_state,
    "ended",
  );
  equal(
    consultationSource(
      { ...event, status: "cancelled" },
      teacher,
      "2026-10-28T12:00:00Z",
    ).source_state,
    "cancelled",
  );
  equal(
    consultationSource(
      { ...event, attendees: [{ email: teacher }] },
      teacher,
      "2026-10-28T12:00:00Z",
    ).eligible_guest,
    false,
  );
  equal(
    consultationSource(
      { ...event, start: {}, end: {} },
      teacher,
      "2026-10-28T12:00:00Z",
    ).source_state,
    "unavailable",
  );
  equal(
    consultationSource(event, teacher, "2026-10-28T10:30:00Z").source_state,
    "rescheduled",
  );
});
import { invalidateDeskRoster, readDesk, sevenCalendarDays } from "./desk.ts";
Deno.test("agenda only reads source, preserves owner health on success/failure, opaque pages pinned to owner", async () => {
  const original = globalThis.fetch;
  const oldSigningKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-only-signing-key");
  let mismatch = false, fail = false;
  const calls: string[] = [];
  let rosterReads = 0;
  const owner = "owner";
  const db = {
    rpc: (name: string) => {
      calls.push(name);
      if (name !== "teacher_home_roster") throw new Error("unexpected_write");
      rosterReads++;
      return Promise.resolve({ data: [student] });
    },
    from: (table: string) => {
      calls.push(table);
      const data = table === "profiles"
        ? [{ class_id: student.id, archived_at: null }]
        : [];
      const q: any = {
        select: () => q,
        eq: () => q,
        in: () => Promise.resolve({ data }),
        maybeSingle: () => Promise.resolve({ data: { calendar_id: teacher } }),
      };
      return q;
    },
  };
  globalThis.fetch = (async (input: any) => {
    const url = String(input);
    if (fail) throw new Error("provider_failure");
    if (url.includes("/events?")) {
      return Response.json({
        items: [{
          ...event,
          htmlLink: "https://calendar.google.com/calendar/event?eid=abc",
        }],
        nextPageToken: "opaque-google-page",
      });
    }
    return Response.json({
      id: mismatch ? "wrong@example.com" : teacher,
      timeZone: "America/Toronto",
    });
  }) as typeof fetch;
  try {
    invalidateDeskRoster(owner);
    const r: any = await readDesk(
      { action: "agenda" },
      owner,
      teacher,
      db,
      async () => "test",
    );
    equal(r.ok, true);
    equal(r.events[0].student_id, "student");
    equal(
      r.events[0].calendar_url,
      "https://calendar.google.com/calendar/event?eid=abc",
    );
    equal(typeof r.next_cursor, "string");
    invalidateDeskRoster(owner);
    const continuation: any = await readDesk(
      { action: "agenda", cursor: r.next_cursor },
      owner,
      teacher,
      db,
      async () => "test",
    );
    equal(continuation.ok, true);
    const tampered: any = await readDesk(
      { action: "agenda", cursor: r.next_cursor + "x" },
      owner,
      teacher,
      db,
      async () => "test",
    );
    equal(tampered.error, "agenda_cursor_expired");
    const stolen: any = await readDesk(
      { action: "agenda", cursor: r.next_cursor },
      "other",
      teacher,
      db,
      async () => "test",
    );
    equal(stolen.ok, false);
    mismatch = true;
    equal(
      (await readDesk(
        { action: "agenda" },
        owner,
        teacher,
        db,
        async () => "test",
      )).ok,
      false,
    );
    mismatch = false;
    fail = true;
    equal(
      (await readDesk(
        { action: "agenda" },
        owner,
        teacher,
        db,
        async () => "test",
      )).ok,
      false,
    );
    equal(calls.some((c) => /attempt|finish|claim|source/.test(c)), false);
    equal(rosterReads, 4);
  } finally {
    globalThis.fetch = original;
    if (oldSigningKey === undefined) {
      Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
    } else Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", oldSigningKey);
    invalidateDeskRoster(owner);
    invalidateDeskRoster("other");
  }
});
Deno.test("email verifies mailbox, rejects unknown senders and returns student mail with enquiry setup needed", async () => {
  const original = globalThis.fetch;
  const names = [
    "GMAIL_CLIENT_ID",
    "GMAIL_CLIENT_SECRET",
    "GMAIL_REFRESH_TOKEN",
  ];
  const old = names.map((n) => Deno.env.get(n));
  names.forEach((n) => Deno.env.set(n, "test-only"));
  let wrong = false;
  const calls: string[] = [];
  const db = {
    rpc: (name: string) => {
      calls.push(name);
      if (name !== "teacher_home_roster") throw new Error("unexpected_write");
      return Promise.resolve({ data: [student] });
    },
  };
  globalThis.fetch = (async (input: any, init: any) => {
    const url = String(input);
    if (init?.method && init.method !== "POST") {
      throw new Error("unexpected_write");
    }
    if (url.includes("oauth2")) return Response.json({ access_token: "test" });
    if (url.endsWith("/profile")) {
      return Response.json({
        emailAddress: wrong ? "wrong@example.com" : teacher,
      });
    }
    if (url.endsWith("/labels")) return Response.json({ labels: [] });
    if (url.includes("/messages?")) {
      return Response.json(
        url.includes("pageToken=next-email-page")
          ? { messages: [{ id: "known" }] }
          : { messages: [{ id: "unknown" }], nextPageToken: "next-email-page" },
      );
    }
    const known = url.includes("/known?");
    return Response.json({
      threadId: known ? "known-thread" : "unknown-thread",
      internalDate: "1793188800000",
      labelIds: ["UNREAD"],
      snippet: "snippet",
      payload: {
        headers: [{
          name: "From",
          value: known ? student.email : "someone@example.com",
        }, { name: "Subject", value: "Subject" }],
      },
    });
  }) as typeof fetch;
  try {
    const r: any = await readDesk(
      { action: "email" },
      "owner",
      teacher,
      db,
      async () => {
        throw new Error("calendar_must_not_be_read");
      },
    );
    equal(r.ok, true);
    equal(r.threads.map((t: any) => t.id), ["known-thread"]);
    equal(r.setup_required, true);
    equal(r.enquiries_configured, false);
    wrong = true;
    equal(
      (await readDesk({ action: "email" }, "owner", teacher, db)).ok,
      false,
    );
    equal(calls, ["teacher_home_roster", "teacher_home_roster"]);
  } finally {
    globalThis.fetch = original;
    names.forEach((n, i) =>
      old[i] === undefined ? Deno.env.delete(n) : Deno.env.set(n, old[i]!)
    );
  }
});

Deno.test("agenda seven calendar days preserves local time through DST", () => {
  equal(
    sevenCalendarDays("2026-10-28T14:00:00Z", "America/Toronto"),
    "2026-11-04T15:00:00.000Z",
  );
});
