/**
 * Dev-only preview of the teacher Home v2 ("observatory") with sample data.
 * Events are placed relative to the real clock, so the orrery and countdown
 * behave as they will live.
 */
import { TeacherHomeView } from "@/components/classroom/home/teacher/TeacherHomeView";
import type { TeacherHomeModel } from "@/components/classroom/home/teacher/teacherHomeModel";
import { EMPTY_DESK, type AgendaEvent } from "@/components/classroom/home/teacher/teachingDeskModel";
import "@/components/classroom/home/home.css";
import "@/components/classroom/classroom.css";

function at(dayOffset: number, hm: string) {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}
function ev(id: string, day: number, start: string, mins: number, name: string | null): AgendaEvent {
  const s = at(day, start);
  return {
    id,
    title: name ? `LSAT session: ${name}` : "Consultation",
    starts_at: s.toISOString(),
    ends_at: new Date(s.getTime() + mins * 60_000).toISOString(),
    status: "confirmed",
    calendar_url: "https://calendar.google.com/calendar/u/0/r",
    student_id: name ? `sample-${name.split(" ")[0].toLowerCase()}` : null,
    student_name: name,
    kind: name ? "session" : "consultation",
  };
}
const EVENTS = [
  ev("s-lydia", 0, "15:00", 60, "Lydia Park"),
  ev("c-today", 0, "19:00", 45, null),
  ev("s-celia", 1, "13:00", 60, "Celia Moreno"),
  ev("s-hana", 1, "16:00", 60, "Hana Ito"),
  ev("s-zoe", 2, "17:00", 60, "Zoë Adams"),
  ev("s-marcus", 3, "10:00", 60, "Marcus Lee"),
];

const task = (id: string, name: string, notes: boolean) => ({
  id, revision: 1, student_id: `sample-${id}`, student_name: name, source_title: `LSAT session: ${name}`,
  starts_at: at(-1, "13:00").toISOString(), ends_at: at(-1, "14:00").toISOString(),
  source_state: "ended" as const, match_state: "matched" as const, transcript_doc_id: "doc", transcript_source: "auto" as const,
  transcript_status: "linked" as const, drive_folder_url: null, local_slug: null,
  recap_done: false, notes_done: notes, work_assigned: false, handled_at: null, kind: "session" as const,
});

const MODEL: TeacherHomeModel = {
  greeting: "Good morning",
  displayName: "Joshua",
  dateline: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date()),
  unread: {
    state: "ready", total: 3,
    rows: [
      { id: "m1", name: "Celia Moreno", initial: "C", snippet: "Can we move Friday to 5?", timeLabel: "9:12 am", receivedAt: new Date().toISOString(), hasAttachments: false, route: "/teacher/inbox" },
      { id: "m2", name: "Ivory Chen", initial: "I", snippet: "Here is my PT 156 review sheet", timeLabel: "Yesterday", receivedAt: new Date().toISOString(), hasAttachments: true, route: "/teacher/inbox" },
    ],
  },
  roster: { state: "ready", total: 3, recent: [
    { id: "sample-lydia", name: "Lydia Park", activityLabel: "Active today", route: "/teacher/students" },
  ] },
  sessions: { state: "ready", rows: [] },
  postSession: {
    state: "ready",
    data: {
      settings: { enabled: true, activation_cutoff: "2026-10-01", last_success_at: new Date().toISOString(), last_error: null, drive_root_url: null, catching_up: false },
      tasks: [task("celia", "Celia Moreno", true), task("marcus", "Marcus Lee", false), task("hana", "Hana Ito", false)],
      handled: [], total: 3, handled_total: 3,
    },
  } as TeacherHomeModel["postSession"],
  desk: { ...EMPTY_DESK, actorId: "preview", agenda: { state: "ready", data: { events: EVENTS } } } as TeacherHomeModel["desk"],
};

export default function TeacherHomePreview() {
  return (
    <div className="classroom-root classroom-root-home">
      <main className="classroom-stage">
        <div className="classroom-column">
          <TeacherHomeView model={MODEL} onOpen={(r) => console.info("open", r)} />
        </div>
      </main>
    </div>
  );
}
