import * as React from "react";
import type {
  TeachingDesk,
  ManualTask,
} from "@/components/classroom/home/teacher/teachingDeskModel";
import {
  tierFlags,
  withDerivedAccess,
  CONFIGURABLE_FLAG_KEYS,
  ALL_FLAG_KEYS,
  type ManagedUser,
} from "@/lib/adminUsers";
const person = (
  id: string,
  name: string,
  tier: ManagedUser["access_tier"],
): ManagedUser =>
  ({
    ...Object.fromEntries(ALL_FLAG_KEYS.map((key) => [key, true])),
    class_id: id,
    email: `${name.split(" ")[0].toLowerCase()}@example.invalid`,
    display_name: name,
    role: "student",
    last_seen_at: new Date().toISOString(),
    archived_at: null,
    archived_reason: null,
    access_tier: tier,
  }) as ManagedUser;
export const SAMPLE_PEOPLE = [
  person("s1", "Celia Moreno", "tier_1"),
  person("s2", "Ivory Chen", "tier_2"),
  person("s3", "Lydia Park", null),
  person("s4", "Dakota Reyes", null),
];
const stamp = new Date().toISOString();
const MANUAL: ManualTask[] = [
  {
    id: "manual-1",
    revision: 1,
    title: "Choose a reading set for Ivory",
    student_id: "s2",
    student_name: "Ivory Chen",
    blocker: null,
    kind: "manual",
    handled_at: null,
    created_at: stamp,
  },
  {
    id: "manual-2",
    revision: 1,
    title: "Prepare Friday’s conditional lesson",
    student_id: null,
    student_name: null,
    blocker: null,
    kind: "manual",
    handled_at: null,
    created_at: stamp,
  },
];
export function useSampleDesk(
  state: string,
  onNote: (message: string) => void,
  tasks: any[],
): TeachingDesk {
  const [manual, setManual] = React.useState(MANUAL);
  React.useEffect(() => {
    const titles = [
      "Choose a reading set for Ivory",
      "Prepare Friday’s conditional lesson",
      "Draft Celia’s next practice plan",
      "Review the consultation notes",
      "Prepare a sufficient-assumption example",
      "Update the next-session agenda",
      "Choose Dakota’s timed section",
      "Check the new student context links",
    ];
    setManual(
      state === "many"
        ? titles.map((title, index) => ({
            ...MANUAL[index % MANUAL.length],
            id: `many-manual-${index}`,
            title,
          }))
        : MANUAL,
    );
  }, [state]);
  const [people, setPeople] = React.useState(SAMPLE_PEOPLE);
  const [passes, setPasses] = React.useState<Record<string, any>>({});
  const pending = React.useRef<any>(null);
  const [failure, setFailure] = React.useState("");
  const ready = (data: any) => ({
    state: (state === "loading"
      ? "loading"
      : state === "error"
        ? "error"
        : state === "setup"
          ? "setup"
          : "ready") as "ready",
    data:
      state === "empty"
        ? Array.isArray(data)
          ? []
          : {
              ...data,
              items: [],
              events: [],
              threads: [],
              recent: [],
              attention: [],
              total: 0,
              count: 0,
              attention_total: 0,
            }
        : data,
    stale: state === "stale" || state === "offline",
    retry: () => onNote("Sample retry. No provider contacted."),
  });
  const open = manual.filter((t) => !t.handled_at);
  const counts = SAMPLE_PEOPLE.map((p) => ({
    student_id: p.class_id,
    total: manual.filter((t) => t.student_id === p.class_id).length,
    handled: manual.filter((t) => t.student_id === p.class_id && t.handled_at)
      .length,
    blocked: manual.filter((t) => t.student_id === p.class_id && t.blocker)
      .length,
  }));
  return {
    actorId: "sample-owner",
    actions: {
      reactivateHomeBooking: async (studentId) => {
        const pass = {
          ...passes[studentId],
          expires_at: null,
          status: "active",
        };
        setPasses((rows) => ({ ...rows, [studentId]: pass }));
        return pass;
      },
      discardUnreadableHomeTopUp: async (actorId, studentId) =>
        passes[studentId] ?? null,
      resolvePendingHomeTopUp: async (request) => {
        pending.current = null;
        return { receipt: null, pass: passes[request.studentId] };
      },
      saveHomeAccess: async (person, tier, draft) => {
        if (state === "save-error") throw new Error("Sample failure");
        const row = {
          ...person,
          access_tier: tier,
          ...(tier === "tier_2" ? withDerivedAccess(draft!) : tierFlags(tier)),
        };
        setPeople((rows) =>
          rows.map((p) => (p.class_id === person.class_id ? row : p)),
        );
        return row;
      },
      loadHomeBooking: async (id) => passes[id] ?? null,
      getPendingHomeTopUp: () => pending.current,
      prepareHomeTopUp: (actorId, studentId, passId, amount) => {
        pending.current ??= {
          actorId,
          studentId,
          passId,
          amount,
          operationKey: crypto.randomUUID(),
        };
        return pending.current;
      },
      addHomeBookingCredits: async (request) => {
        if (state === "save-error") throw new Error("Sample failure");
        const pass = {
          ...passes[request.studentId],
          credits_remaining:
            passes[request.studentId].credits_remaining + request.amount,
          total_credits:
            passes[request.studentId].total_credits + request.amount,
        };
        setPasses((rows) => ({ ...rows, [request.studentId]: pass }));
        pending.current = null;
        return {
          pass,
          receipt: {
            operation_key: request.operationKey,
            owner_id: request.actorId,
            student_id: request.studentId,
            pass_id: request.passId,
            delta: request.amount,
            total_credits: pass.total_credits,
            used_credits: 0,
          },
        };
      },
      createHomeBooking: async (studentId, credits, options) => {
        if (state === "save-error") throw new Error("Sample failure");
        const pass = {
          id: crypto.randomUUID(),
          student_id: studentId,
          total_credits: credits,
          used_credits: 0,
          credits_remaining: credits,
          status: "active",
          booking_url: "https://lsatprep.study/book/SAMPLE_NOT_A_REAL_LINK",
          session_length_minutes: options?.sessionMinutes ?? 70,
          expires_at: options?.expiresAt ?? null,
        };
        setPasses((rows) => ({ ...rows, [studentId]: pass }));
        return pass;
      },
      revokeHomeBooking: async (studentId) => {
        const pass = { ...passes[studentId], status: "revoked" };
        setPasses((rows) => ({ ...rows, [studentId]: pass }));
        return pass;
      },
    },
    manual: ready({
      items: open,
      total: open.length,
      next_cursor: null,
      student_counts: counts,
    }),
    access: ready(people),
    agenda: ready({
      events: [
        {
          id: "a1",
          title: "Dakota Reyes · LSAT session",
          starts_at: stamp,
          ends_at: stamp,
          status: "confirmed",
          calendar_url: "https://calendar.google.com/calendar/u/0/r",
          student_id: "s4",
          student_name: "Dakota Reyes",
        },
        {
          id: "a2",
          title: "Consultation · Maya",
          starts_at: stamp,
          ends_at: stamp,
          status: "confirmed",
          calendar_url: "https://calendar.google.com/calendar/u/0/r",
          student_id: null,
          student_name: null,
        },
        {
          id: "a3",
          title: "Celia Moreno · LSAT session",
          starts_at: stamp,
          ends_at: stamp,
          status: "confirmed",
          calendar_url: "https://calendar.google.com/calendar/u/0/r",
          student_id: "s1",
          student_name: "Celia Moreno",
        },
      ],
      next_cursor: null,
      fetched_at: stamp,
    }),
    email: ready({
      threads: [
        {
          id: "email1",
          sender: "Celia Moreno",
          subject: "A question before our next session",
          snippet: "",
          received_at: stamp,
          url: "https://mail.google.com/mail/u/0/#inbox",
          kind: "student",
        },
      ],
      count: 1,
      fetched_at: stamp,
    }),
    payments: ready({
      recent: [
        {
          id: "p1",
          payer_name: "Ivory Chen",
          email: "ivory@example.invalid",
          student_id: "s2",
          amount_cents: 50000,
          currency: "usd",
          paid_at: stamp,
          status: "succeeded",
          grant_state: "granted",
          match_state: "matched",
          source: "webhook",
          granted_credits: 5,
        },
        {
          id: "p2",
          payer_name: "New package payment",
          email: "payer@example.invalid",
          student_id: null,
          amount_cents: 100000,
          currency: "usd",
          paid_at: stamp,
          status: "succeeded",
          grant_state: "none",
          match_state: "unmatched",
          source: "webhook",
          granted_credits: null,
        },
      ],
      attention: [
        {
          id: "p2",
          payer_name: "New package payment",
          email: "payer@example.invalid",
          student_id: null,
          amount_cents: 100000,
          currency: "usd",
          paid_at: stamp,
          status: "succeeded",
          grant_state: "none",
          match_state: "unmatched",
          source: "webhook",
          granted_credits: null,
        },
      ],
      total: 2,
      attention_total: 1,
    }),
    results: ready([
      {
        id: "r1",
        student_id: "s1",
        student_name: "Celia Moreno",
        title: "PT105 · Logical Reasoning",
        score: "21/25",
        completed_at: stamp,
      },
    ]),
    mutateManual: async (task, change) => {
      if (state === "save-error") throw new Error("Sample save failed");
      setManual((rows) =>
        change.action === "create"
          ? [
              {
                id: crypto.randomUUID(),
                revision: 1,
                title: change.title!,
                student_id: change.studentId ?? null,
                student_name:
                  SAMPLE_PEOPLE.find((p) => p.class_id === change.studentId)
                    ?.display_name ?? null,
                blocker: change.blocker ?? null,
                kind: "manual",
                handled_at: null,
                created_at: stamp,
              },
              ...rows,
            ]
          : rows.map((row) =>
              row.id !== task!.id
                ? row
                : {
                    ...row,
                    revision: row.revision + 1,
                    blocker: change.blocker ?? row.blocker,
                    handled_at:
                      change.action === "handle"
                        ? stamp
                        : change.action === "reopen"
                          ? null
                          : row.handled_at,
                  },
            ),
      );
      onNote("Sample private task saved. No real record changed.");
    },
    loadManual: async (handled, cursor, student, kind) => {
      const rows = (state === "empty" ? [] : manual).filter(
        (t) =>
          !!t.handled_at === handled &&
          (!student || t.student_id === student) &&
          (!kind || t.kind === kind),
      );
      return { items: rows, total: rows.length, next_cursor: null };
    },
    loadSessions: async (handled, cursor, student) => {
      const rows = (state === "empty" ? [] : tasks).filter(
        (t) =>
          !!t.handled_at === handled && (!student || t.student_id === student),
      );
      return { items: rows, total: rows.length, next_cursor: null };
    },
    classify: async () => {
      onNote("Sample calendar label saved. No real event changed.");
    },
    refreshAccess: () => onNote("Sample access refresh"),
  };
}
