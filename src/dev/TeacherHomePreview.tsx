import * as React from "react";
import TeacherHomeView from "@/components/classroom/home/teacher/TeacherHomeView";
import type { TeacherHomeModel } from "@/components/classroom/home/teacher/teacherHomeModel";
import type { TeachingDesk } from "@/components/classroom/home/teacher/teachingDeskModel";
import type { PostSessionTask } from "@/components/classroom/home/teacher/postSessionModel";
import "@/components/classroom/classroom.css";
import "@/components/classroom/home/home.css";

/* Dev-only fixture for the teacher Home. Mirrors the shape the live hooks
   return so the page can be inspected and screenshotted without signing in.
   ?state=empty shows the confirmed-empty desk. */

const HOUR = 3600_000;
const iso = (offsetHours: number) => new Date(Date.now() + offsetHours * HOUR).toISOString();

const STUDENTS = [
  { id: "s1", name: "Sofia Minassian", activityLabel: "Active today", route: "/teacher/students/s1" },
  { id: "s2", name: "Celia Moreno", activityLabel: "Active today", route: "/teacher/students/s2" },
  { id: "s3", name: "Dakota Reyes", activityLabel: "Active yesterday", route: "/teacher/students/s3" },
  { id: "s4", name: "Ivory Chen", activityLabel: "Last active Oct 28", route: "/teacher/students/s4" },
];

function task(over: Partial<PostSessionTask>): PostSessionTask {
  return {
    id: "t",
    revision: 1,
    student_id: "s1",
    student_name: "Sofia Minassian",
    source_title: "Sofia Minassian session",
    starts_at: iso(-26),
    ends_at: iso(-25),
    source_state: "ended",
    match_state: "matched",
    transcript_doc_id: "1Ec9oPvlHjgxzoGH-ZxHy5pWIO4UoT9vKbxNd9cP8H9Q",
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
    student_name: "Celia Moreno",
    source_title: "Celia Moreno session",
    starts_at: iso(-50),
    ends_at: iso(-49),
    recap_done: true,
  }),
  task({
    id: "t3",
    student_id: "s3",
    student_name: "Dakota Reyes",
    source_title: "Dakota Reyes session",
    starts_at: iso(-74),
    ends_at: iso(-73),
    transcript_doc_id: null,
    transcript_source: null,
    transcript_status: "waiting",
  }),
];

function model(empty: boolean): TeacherHomeModel {
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
                title: "Send Ivory the LSAC accommodations form",
                student_id: "s4",
                student_name: "Ivory Chen",
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
        events: empty
          ? []
          : [
              { id: "e1", title: "Dakota Reyes · 1:1 session", starts_at: iso(5), ends_at: iso(6), status: "confirmed", calendar_url: "https://calendar.google.com/calendar/event?eid=a", student_id: "s3", student_name: "Dakota Reyes" },
              { id: "e2", title: "Consultation · Priya N.", starts_at: iso(22), ends_at: iso(23), status: "confirmed", calendar_url: "https://calendar.google.com/calendar/event?eid=b", student_id: null, student_name: null },
              { id: "e3", title: "Sofia Minassian · 1:1 session", starts_at: iso(46), ends_at: iso(47), status: "confirmed", calendar_url: "https://calendar.google.com/calendar/event?eid=c", student_id: "s1", student_name: "Sofia Minassian" },
              { id: "e4", title: "Celia Moreno · 1:1 session", starts_at: iso(70), ends_at: iso(71), status: "confirmed", calendar_url: "https://calendar.google.com/calendar/event?eid=d", student_id: "s2", student_name: "Celia Moreno" },
            ],
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
              { id: "g1", subject: "Question about the March LSAT", sender: "Priya N.", snippet: "Hi Joshua, I found your site and…", received_at: iso(-3), url: "https://mail.google.com/mail/u/0/#inbox/g1", kind: "enquiry" },
              { id: "g2", subject: "Re: Friday session", sender: "Celia Moreno", snippet: "Can we move to 6?", received_at: iso(-5), url: "https://mail.google.com/mail/u/0/#inbox/g2", kind: "student" },
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
              { id: "p1", student_id: "s1", payer_name: "Sofia Minassian", email: null, amount_cents: 12000, currency: "cad", paid_at: iso(-20), status: "succeeded", grant_state: "granted", match_state: "matched", source: "stripe", granted_credits: 1 },
              { id: "p2", student_id: "s2", payer_name: "Celia Moreno", email: null, amount_cents: 12000, currency: "cad", paid_at: iso(-90), status: "succeeded", grant_state: "granted", match_state: "matched", source: "stripe", granted_credits: 1 },
              { id: "p3", student_id: null, payer_name: null, email: "r.alvarez@example.com", amount_cents: 6000, currency: "cad", paid_at: iso(-140), status: "succeeded", grant_state: "pending", match_state: "unmatched", source: "stripe", granted_credits: null },
            ],
        attention: empty
          ? []
          : [{ id: "p3", student_id: null, payer_name: null, email: "r.alvarez@example.com", amount_cents: 6000, currency: "cad", paid_at: iso(-140), status: "succeeded", grant_state: "pending", match_state: "unmatched", source: "stripe", granted_credits: null }],
        total: empty ? 0 : 3,
        attention_total: empty ? 0 : 1,
      },
    },
    results: {
      state: "ready",
      data: empty
        ? []
        : [
            { id: "r1", student_id: "s1", student_name: "Sofia Minassian", title: "Necessary Assumption - First Taste", score: "9 / 10", completed_at: iso(-60) },
            { id: "r2", student_id: "s2", student_name: "Celia Moreno", title: "PT 105 Section 2", score: "21 / 26", completed_at: iso(-80) },
          ],
    },
    access: {
      state: "ready",
      data: empty
        ? []
        : ([
            { class_id: "a1", display_name: "Priya N.", email: "priya@example.com", role: "student", access_tier: null, archived_at: null },
            { class_id: "a2", display_name: "R. Alvarez", email: "r.alvarez@example.com", role: "student", access_tier: null, archived_at: null },
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
            { id: "c1", name: "Celia", initial: "C", snippet: "Can we move Friday?", timeLabel: "1:40 pm", receivedAt: iso(-4), hasAttachments: false, route: "/teacher/inbox/platform:c1" },
            { id: "c2", name: "Ivory", initial: "I", snippet: "Here is the PDF", timeLabel: "Yesterday", receivedAt: iso(-28), hasAttachments: true, route: "/teacher/inbox/platform:c2" },
          ],
    },
    roster: { state: "ready", total: STUDENTS.length, recent: STUDENTS.slice(0, 3), all: STUDENTS },
    sessions: { state: "ready", rows: [] },
  };
}

export default function TeacherHomePreview() {
  const empty = new URLSearchParams(window.location.search).get("state") === "empty";
  const m = React.useMemo(() => model(empty), [empty]);
  return (
    <div className="classroom-root" style={{ minHeight: "100vh" }}>
      <main className="classroom-stage" style={{ minHeight: "100vh" }}>
        <TeacherHomeView model={m} onOpen={(route) => console.info("open", route)} />
      </main>
    </div>
  );
}
