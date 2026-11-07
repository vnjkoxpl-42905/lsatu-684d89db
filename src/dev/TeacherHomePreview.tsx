import * as React from "react";
import TeacherHomeView from "@/components/classroom/home/teacher/TeacherHomeView";
import type { TeacherHomeModel } from "@/components/classroom/home/teacher/teacherHomeModel";
import type { TeachingDesk } from "@/components/classroom/home/teacher/teachingDeskModel";
import type { PostSessionTask } from "@/components/classroom/home/teacher/postSessionModel";
import "@/components/classroom/classroom.css";
import "@/components/classroom/home/home.css";

/* Dev-only fixture for the teacher Home. Mirrors the shape the live hooks
   return so the page can be inspected and screenshotted without signing in.
   ?state=empty shows the confirmed-empty desk; ?state=live puts a session
   in progress. */

const HOUR = 3600_000;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * HOUR).toISOString();

const STUDENTS = [
  { id: "s1", name: "Maya Ostrowski", activityLabel: "Active today", route: "/teacher/students/s1" },
  { id: "s2", name: "Nora Whitfield", activityLabel: "Active today", route: "/teacher/students/s2" },
  { id: "s3", name: "Theo Lindqvist", activityLabel: "Active yesterday", route: "/teacher/students/s3" },
  { id: "s4", name: "June Okafor", activityLabel: "Last active Oct 28", route: "/teacher/students/s4" },
];

function task(over: Partial<PostSessionTask>): PostSessionTask {
  return {
    id: "t",
    revision: 1,
    student_id: "s1",
    student_name: "Maya Ostrowski",
    source_title: "Maya Ostrowski session",
    starts_at: iso(-26),
    ends_at: iso(-25),
    source_state: "ended",
    match_state: "matched",
    transcript_doc_id: "fixture-transcript-doc",
    transcript_source: "auto",
    transcript_status: "linked",
    drive_folder_url: null,
    local_slug: null,
    recap_done: false,
    notes_done: false,
    work_assigned: false,
    handled_at: null,
    kind: "session",
    ...over,
  };
}

const TASKS: PostSessionTask[] = [
  task({ id: "t1" }),
  task({
    id: "t2",
    student_id: "s2",
    student_name: "Nora Whitfield",
    source_title: "Nora Whitfield session",
    starts_at: iso(-50),
    ends_at: iso(-49),
    recap_done: true,
  }),
  task({
    id: "t3",
    student_id: "s3",
    student_name: "Theo Lindqvist",
    source_title: "Theo Lindqvist session",
    starts_at: iso(-74),
    ends_at: iso(-73),
    transcript_doc_id: null,
    transcript_source: null,
    transcript_status: "waiting",
  }),
];

/* A realistic teaching week on local clock times: a dense Thursday-style day,
   an overlap, an all-day block, an open day, and (with ?state=live) a session
   already in progress. */
function at(day: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + day);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function agendaFixture(live: boolean) {
  const rows: Array<[Date, number, string, string | null, string | null]> = [];
  const now = new Date();
  const soon = new Date(Math.ceil(now.getTime() / (30 * 60_000)) * 30 * 60_000);
  const plus = (base: Date, h: number) => new Date(base.getTime() + h * HOUR);
  if (live) rows.push([new Date(now.getTime() - 20 * 60_000), 1, "Theo Lindqvist · 1:1 session", "s3", "Theo Lindqvist"]);
  rows.push([plus(soon, -3), 1, "Nora Whitfield · 1:1 session", "s2", "Nora Whitfield"]);
  rows.push([plus(soon, live ? 2 : 1.5), 1, "Theo Lindqvist · 1:1 session", "s3", "Theo Lindqvist"]);
  rows.push([plus(soon, 4), 0.5, "Consultation · Sam K.", null, null]);
  rows.push([at(1, 15), 1, "Maya Ostrowski · 1:1 session", "s1", "Maya Ostrowski"]);
  rows.push([at(1, 16, 30), 0.5, "Consultation · Ellis R.", null, null]);
  rows.push([at(1, 18), 1, "Nora Whitfield · 1:1 session", "s2", "Nora Whitfield"]);
  rows.push([at(1, 19, 30), 1, "June Okafor · 1:1 session", "s4", "June Okafor"]);
  rows.push([at(2, 17), 1.5, "Maya Ostrowski · 1:1 session", "s1", "Maya Ostrowski"]);
  rows.push([at(2, 18), 1, "Dentist", null, null]);
  rows.push([at(3, 19), 1, "June Okafor · 1:1 session", "s4", "June Okafor"]);
  for (const [i, [h, name, id]] of ([
    [13, "Maya Ostrowski", "s1"], [14, "Nora Whitfield", "s2"], [15, "Theo Lindqvist", "s3"],
    [16, "June Okafor", "s4"], [17, "Maya Ostrowski", "s1"], [18, "Nora Whitfield", "s2"],
    [19, "Theo Lindqvist", "s3"], [20, "June Okafor", "s4"],
  ] as const).entries())
    rows.push([at(4, h), 1, `${name} · ${i % 3 === 2 ? "Drill review" : "1:1 session"}`, id, name]);
  rows.push([at(6, 11), 1, "Nora Whitfield · 1:1 session", "s2", "Nora Whitfield"]);
  rows.push([at(6, 12, 30), 1, "Team planning", null, null]);
  const events = rows.map(([start, hours, title, student_id, student_name], i) => ({
    id: `e${i}`,
    title,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + hours * HOUR).toISOString(),
    status: "confirmed",
    calendar_url: `https://calendar.google.com/calendar/event?eid=${i}`,
    student_id,
    student_name,
  }));
  const allDay = at(3, 12);
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  events.push({
    id: "allday",
    title: "LSAC deadline",
    starts_at: ymd(allDay),
    ends_at: ymd(at(4, 12)),
    status: "confirmed",
    calendar_url: "https://calendar.google.com/calendar/event?eid=allday",
    student_id: null,
    student_name: null,
  });
  return events;
}

function model(empty: boolean, live = false): TeacherHomeModel {
  const desk: TeachingDesk = {
    actorId: "preview",
    manual: {
      state: "ready",
      data: {
        items: empty
          ? []
          : [
              {
                id: "m1",
                revision: 1,
                title: "Send June the LSAC accommodations form",
                student_id: "s4",
                student_name: "June Okafor",
                blocker: null,
                kind: "manual",
                handled_at: null,
                created_at: iso(-30),
              },
            ],
        total: empty ? 0 : 1,
        next_cursor: null,
      },
    },
    agenda: {
      state: "ready",
      data: {
        events: empty ? [] : agendaFixture(live),
        next_cursor: null,
        fetched_at: iso(0),
      },
    },
    email: {
      state: "ready",
      data: {
        threads: empty
          ? []
          : [
              { id: "g1", subject: "Question about the March LSAT", sender: "Sam K.", snippet: "Hi Joshua, I found your site and…", received_at: iso(-3), url: "https://mail.google.com/mail/u/0/#inbox/g1", kind: "enquiry" },
              { id: "g2", subject: "Re: Friday session", sender: "Nora Whitfield", snippet: "Can we move to 6?", received_at: iso(-5), url: "https://mail.google.com/mail/u/0/#inbox/g2", kind: "student" },
            ],
        count: empty ? 0 : 2,
        fetched_at: iso(0),
        enquiries_configured: true,
      },
    },
    payments: {
      state: "ready",
      data: {
        recent: empty
          ? []
          : [
              { id: "p1", student_id: "s1", payer_name: "Maya Ostrowski", email: null, amount_cents: 12000, currency: "cad", paid_at: iso(-20), status: "succeeded", grant_state: "granted", match_state: "matched", source: "stripe", granted_credits: 1 },
              { id: "p2", student_id: "s2", payer_name: "Nora Whitfield", email: null, amount_cents: 12000, currency: "cad", paid_at: iso(-90), status: "succeeded", grant_state: "granted", match_state: "matched", source: "stripe", granted_credits: 1 },
              { id: "p3", student_id: null, payer_name: null, email: "payer@example.com", amount_cents: 6000, currency: "cad", paid_at: iso(-140), status: "succeeded", grant_state: "pending", match_state: "unmatched", source: "stripe", granted_credits: null },
            ],
        attention: empty
          ? []
          : [{ id: "p3", student_id: null, payer_name: null, email: "payer@example.com", amount_cents: 6000, currency: "cad", paid_at: iso(-140), status: "succeeded", grant_state: "pending", match_state: "unmatched", source: "stripe", granted_credits: null }],
        total: empty ? 0 : 3,
        attention_total: empty ? 0 : 1,
      },
    },
    results: {
      state: "ready",
      data: empty
        ? []
        : [
            { id: "r1", student_id: "s1", student_name: "Maya Ostrowski", title: "Necessary Assumption - First Taste", score: "9 / 10", completed_at: iso(-60) },
            { id: "r2", student_id: "s2", student_name: "Nora Whitfield", title: "PT 105 Section 2", score: "21 / 26", completed_at: iso(-80) },
          ],
    },
    access: {
      state: "ready",
      data: empty
        ? []
        : ([
            { class_id: "a1", display_name: "Sam K.", email: "priya@example.com", role: "student", access_tier: null, archived_at: null },
            { class_id: "a2", display_name: "R. Alvarez", email: "payer@example.com", role: "student", access_tier: null, archived_at: null },
          ] as any),
    },
    classify: async () => {},
  };
  return {
    desk,
    postSession: {
      state: "ready",
      data: {
        settings: {
          enabled: true,
          activation_cutoff: iso(-500),
          last_success_at: iso(0),
          last_error: null,
          drive_root_url: null,
          catching_up: false,
        },
        tasks: empty ? [] : TASKS,
        handled: [],
        total: empty ? 0 : TASKS.length,
      },
      update: async () => {},
    },
    greeting: "Good evening",
    displayName: "Joshua",
    dateline: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date()),
    unread: {
      state: "ready",
      total: empty ? 0 : 2,
      rows: empty
        ? []
        : [
            { id: "c1", name: "Nora", initial: "C", snippet: "Can we move Friday?", timeLabel: "1:40 pm", receivedAt: iso(-4), hasAttachments: false, route: "/teacher/inbox/platform:c1" },
            { id: "c2", name: "June", initial: "I", snippet: "Here is the PDF", timeLabel: "Yesterday", receivedAt: iso(-28), hasAttachments: true, route: "/teacher/inbox/platform:c2" },
          ],
    },
    roster: { state: "ready", total: STUDENTS.length, recent: STUDENTS.slice(0, 3), all: STUDENTS },
    sessions: { state: "ready", rows: [] },
  };
}

export default function TeacherHomePreview() {
  const state = new URLSearchParams(window.location.search).get("state");
  const m = React.useMemo(() => model(state === "empty", state === "live"), [state]);
  return (
    <div className="classroom-root" style={{ minHeight: "100vh" }}>
      <main className="classroom-stage" style={{ minHeight: "100vh" }}>
        <TeacherHomeView model={m} onOpen={(route) => console.info("open", route)} />
      </main>
    </div>
  );
}
