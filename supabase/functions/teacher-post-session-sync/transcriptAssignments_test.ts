import { explicitSection } from "./transcriptAssignments.ts";

Deno.test("prepares a single explicit teacher commitment and ignores other speakers", () => {
  const excerpt = "Example Teacher: I'll assign you PT110, section 3.";
  const result = explicitSection(
    ["Example Student: I will assign you PT110, section 2.", excerpt, excerpt]
      .join("\n"),
    "Example Teacher",
  );
  if (
    result?.pt !== 110 || result.section !== 3 || result.excerpt !== excerpt
  ) {
    throw new Error(
      "Expected the teacher's exact section and transcript excerpt",
    );
  }
});

Deno.test("tentative, unsupported, or competing commitments cannot become an approval preview", () => {
  for (
    const body of [
      "Example Teacher: I might assign you PT110, section 3.",
      "Example Student: I will assign PT110, section 3.",
      "Example Teacher: I will assign you PT110, section 3 by Friday.",
      "Example Teacher: I will assign PT110, section 3.\nExample Teacher: I will assign PT110, section 2.",
    ]
  ) {
    if (explicitSection(body, "Example Teacher")) {
      throw new Error("Expected no exact proposal");
    }
  }
});

Deno.test("linked session uses the authenticated export and prepares a preview without accepting it", async () => {
  const { prepareTranscript } = await import("./transcriptAssignments.ts");
  const names = [
    "LOVABLE_API_KEY",
    "GOOGLE_DRIVE_API_KEY",
    "TEACHER_HOME_TRANSCRIPT_SPEAKER",
  ];
  const previous = names.map((name) => Deno.env.get(name));
  const originalFetch = globalThis.fetch;
  const googleEmail = "teacher@example.test";
  const studentEmail = "student@example.test";
  const documentId = "synthetic-document";
  const session = {
    id: crypto.randomUUID(),
    owner_id: crypto.randomUUID(),
    student_id: crypto.randomUUID(),
    student_name: "Example Student",
    event_id: "synthetic-event",
    calendar_id: googleEmail,
    revision: 1,
    starts_at: "2026-11-26T17:00:00Z",
    ends_at: "2026-11-26T18:00:00Z",
    source_state: "ended",
    match_state: "matched",
    transcript_status: "linked",
    transcript_source: "auto",
    transcript_doc_id: documentId,
  };
  const event = {
    id: session.event_id,
    start: { dateTime: session.starts_at },
    end: { dateTime: session.ends_at },
    attendees: [{ email: studentEmail }],
    attachments: [{
      title: "Session transcript",
      mimeType: "application/vnd.google-apps.document",
      fileUrl: "https://docs.google.com/document/d/" + documentId + "/edit",
    }],
  };
  const rpcCalls: Record<string, unknown>[] = [];
  const query = {
    select: () => query,
    eq: () => query,
    is: () => query,
    maybeSingle: () => ({ data: null }),
  };
  const db = {
    from: () => query,
    auth: {
      admin: {
        getUserById: (id: string) => {
          if (id !== session.student_id) throw new Error("Wrong student");
          return { data: { user: { email: studentEmail } } };
        },
      },
    },
    rpc: (name: string, args: Record<string, unknown>) => {
      if (name !== "teacher_transcript_assignment") {
        throw new Error("Unexpected write");
      }
      rpcCalls.push(args);
      return { data: { id: "synthetic-preview" } };
    },
  } as unknown as Parameters<typeof prepareTranscript>[0];

  try {
    Deno.env.set(names[0], "synthetic-gateway-key");
    Deno.env.set(names[1], "synthetic-drive-key");
    Deno.env.set(names[2], "Example Teacher");
    globalThis.fetch = (input, init) => {
      const url = new URL(String(input));
      const headers = new Headers(init?.headers);
      if (
        url.hostname !== "connector-gateway.lovable.dev" ||
        headers.get("Authorization") !== "Bearer synthetic-gateway-key" ||
        headers.get("X-Connection-Api-Key") !== "synthetic-drive-key" ||
        !url.pathname.includes(documentId)
      ) throw new Error("Unexpected export request");
      return Promise.resolve(
        url.pathname.endsWith("/export")
          ? new Response(
            "Example Teacher: I will assign Example Student PT110.S3.",
          )
          : Response.json({
            mimeType: "application/vnd.google-apps.document",
            owners: [{ emailAddress: googleEmail }],
          }),
      );
    };
    const result = await prepareTranscript(db, session, googleEmail, { event });
    const args = rpcCalls[0];
    if (
      result?.id !== "synthetic-preview" || rpcCalls.length !== 1 ||
      args.p_student !== session.student_id ||
      args.p_document !== documentId || args.p_pt !== 110 ||
      args.p_section !== 3 || args.p_accept !== null ||
      !/^[a-f0-9]{64}$/.test(String(args.p_hash))
    ) throw new Error("Wrong authenticated preparation request");

    for (
      const revisedEvent of [{
        ...event,
        attendees: [{ email: "wrong@example.test" }],
      }, { ...event, attachments: [] }]
    ) {
      let rejected = false;
      try {
        await prepareTranscript(db, session, googleEmail, {
          event: revisedEvent,
        });
      } catch {
        rejected = true;
      }
      if (!rejected || rpcCalls.length !== 1) {
        throw new Error("Mismatched session reached the writer");
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    });
  }
});

Deno.test("an explicit commitment to an unspecified section asks the teacher to choose", () => {
  const result = explicitSection(
    "Example Teacher: I will assign to her a section.",
    "Example Teacher",
  );
  if (
    !result || result.pt !== null || result.section !== null ||
    result.excerpt !== "Example Teacher: I will assign to her a section."
  ) {
    throw new Error("Expected a pending section choice");
  }
});

Deno.test("Teacher Home lists LR and RC section addresses in order", async () => {
  const { transcriptActions } = await import("./transcriptAssignments.ts");
  const db = {
    from: (name: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        order: () => query,
        limit: () => query,
        then: (resolve: (result: { data: unknown }) => unknown) =>
          Promise.resolve(
            resolve({
              data: name === "lr_sections"
                ? [{ preptest: 110, section: 3 }]
                : [],
            }),
          ),
      };
      return query;
    },
    rpc: (name: string) => {
      if (name !== "teacher_transcript_rc_catalog") {
        throw new Error("Unexpected RPC");
      }
      return { data: [{ preptest: 110, section: 2, kind: "rc" }] };
    },
  } as unknown as Parameters<typeof transcriptActions>[0];

  const result = await transcriptActions(
    db,
    "teacher-id",
    "teacher@example.test",
    {
      action: "transcript_assignments",
    },
  );
  if (
    !("sections" in result) ||
    result.sections?.map(({ kind, section }) => kind + section).join() !==
      "rc2,lr3"
  ) {
    throw new Error("Expected the active LR and RC section addresses");
  }
});
