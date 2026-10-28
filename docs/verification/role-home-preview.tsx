/**
 * Role Home preview. Local verification only, SAMPLE DATA.
 *
 * Mounts the EXACT production views (`ClassroomHomeView`, `TeacherHomeView`,
 * the role gate states) with their production CSS inside a `.classroom-root`
 * frame, driven by typed fixtures. Nothing here talks to Supabase and nothing
 * in src/ imports this file, so there is no fixture switch or role bypass in
 * the product. Reached at /docs/verification/role-home-preview.html on the dev
 * server; `vite build` only bundles index.html, so it never ships.
 *
 * Query string: ?role=teacher|student &state=full|empty|loading|error
 * &width=1440|980|768|390|320|fluid &theme=light|dark
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClassroomHomeView } from "@/components/classroom/home/ClassroomHomeView";
import { TeacherHomeView } from "@/components/classroom/home/teacher/TeacherHomeView";
import {
  HomeRoleError,
  HomeRoleSkeleton,
  HomeRefreshNotice,
} from "@/components/classroom/home/ClassroomHome";
import {
  buildWeek,
  weekDates,
  weekLabelFor,
  subtitleFor,
  type ClassroomHomeModel,
  type HomeRow,
} from "@/components/classroom/home/homeModel";
import type {
  PostSessionTask,
  PostSessionHomeState,
  PostSessionChange,
} from "@/components/classroom/home/teacher/postSessionModel";
import type { TeacherHomeModel } from "@/components/classroom/home/teacher/teacherHomeModel";
import { useSampleDesk } from "./teacher-desk-fixture";
import "@/index.css";
import "@/components/classroom/classroom.css";
import "@/components/classroom/home/home.css";

type Role = "teacher" | "student";
type PreviewState =
  | "full"
  | "empty"
  | "loading"
  | "error"
  | "role-pending"
  | "role-error"
  | "role-stale"
  | "setup"
  | "save-error"
  | "many"
  | "stale"
  | "offline"
  | "long-names";

const params = new URLSearchParams(location.search);
const NOW = new Date();
const DATES = weekDates(NOW);
const atLocal = (dayOffset: number, hour: number, minute = 0) => {
  const date = new Date(NOW);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

/* ── student fixtures ─────────────────────────────────────────────────── */

const STUDENT_ROWS: HomeRow[] = [
  {
    key: "activity:negation",
    title: "Negation Station",
    kind: "activity",
    tone: "activity",
    meta: "Activity · twelve prompts · due today",
    route: "/activities/negation",
    actionLabel: "Open",
    emphasis: true,
    isNew: false,
    dueToday: true,
    overdue: false,
    workStatus: "in_progress",
    dueAt: atLocal(0, 23, 59),
  },
  {
    key: "guided:flaw",
    title: "Flaw questions, guided set 3",
    kind: "guided",
    tone: "drill",
    meta: "Guided drill · due tomorrow",
    route: "/guided/flaw-3",
    actionLabel: "Open",
    emphasis: false,
    isNew: true,
    dueToday: false,
    overdue: false,
    workStatus: "assigned",
    dueAt: atLocal(1, 21),
  },
  {
    key: "ta:feedback",
    title: "Read Joshua's notes on PT105 S2",
    kind: "ta",
    tone: "activity",
    meta: "From Joshua · assigned yesterday",
    route: "/classroom/ta/feedback",
    actionLabel: "Open",
    emphasis: false,
    isNew: true,
    dueToday: false,
    overdue: false,
    workStatus: "assigned",
    canComplete: true,
  },
  {
    key: "item:recap",
    title: "Session recap: sufficient and necessary",
    kind: "recap",
    tone: "recap",
    meta: "Recap · posted Oct 20",
    route: "/classroom/item/recap",
    actionLabel: "Read",
    emphasis: false,
    isNew: true,
    dueToday: false,
    overdue: false,
  },
];

function studentModel(
  state: PreviewState,
  rows: HomeRow[],
  unread: number,
): ClassroomHomeModel {
  const work = rows.filter((row) => row.kind !== "recap");
  const dueToday = work.filter((row) => row.dueToday).length;
  const base: ClassroomHomeModel = {
    greeting:
      NOW.getHours() < 12
        ? "Good morning"
        : NOW.getHours() < 18
          ? "Good afternoon"
          : "Good evening",
    displayName: "Ada",
    isAdmin: false,
    assignedWorkRoute: "/my-work/to-do",
    access: { messages: true, schedule: true, activities: true, drill: true },
    dateline: new Intl.DateTimeFormat("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(NOW),
    subtitle: subtitleFor(dueToday, work.length, unread),
    daysToTest: 38,
    dueTodayCount: dueToday,
    workSummary: {
      open: work.length,
      inProgress: work.filter((row) => row.workStatus === "in_progress").length,
    },
    hero: rows.some((row) => row.key === STUDENT_ROWS[0].key)
      ? {
          row: STUDENT_ROWS[0],
          eyebrow: "PICK UP WHERE YOU LEFT OFF",
          kindLabel: "ACTIVITY",
          meta: "twelve prompts · due today",
          prose:
            "Negate each statement, then check whether it breaks the argument.",
          primaryLabel: "Pick it back up",
          progress: {
            completed: 5,
            total: 12,
            unit: "prompts",
            estimateMinutes: null,
          },
        }
      : null,
    rows,
    continueRow: rows.find((row) => row.kind !== "recap") ?? null,
    newCount: rows.filter((row) => row.isNew).length,
    message: unread
      ? {
          id: "c1",
          from: "Joshua",
          initial: "J",
          timeLabel: "9:12 a.m.",
          body: "Start with PT105 S2 before Thursday. Mark anything that felt like a guess.",
          unread: true,
          route: "/inbox/c1",
        }
      : null,
    messages: [],
    unreadMessages: unread,
    homeBooking: { state: "booked", startsAt: atLocal(2, 19, 15) },
    week: buildWeek(
      DATES,
      [
        { iso: DATES[0], label: "Negation Station" },
        { iso: DATES[1], label: "Flaw questions, guided set 3" },
        { iso: DATES[2], label: "Session, 7:15 pm" },
      ],
      NOW,
    ),
    weekLabel: weekLabelFor(DATES),
  };
  if (state === "empty") {
    return {
      ...base,
      subtitle: "Nothing is due today. Drill whatever you feel like.",
      daysToTest: null,
      dueTodayCount: 0,
      workSummary: null,
      hero: null,
      rows: [],
      continueRow: null,
      newCount: 0,
      message: null,
      unreadMessages: 0,
      homeBooking: { state: "credits", creditsRemaining: 3 },
      week: buildWeek(DATES, [], NOW),
    };
  }
  if (state === "loading")
    return {
      ...base,
      subtitle: "Loading your assigned work…",
      workSummary: null,
      hero: null,
      rows: [],
      continueRow: null,
    };
  if (state === "error") {
    return {
      ...base,
      subtitle: "Could not load all assigned work. Try again.",
      workFailed: true,
      workSummary: null,
      hero: null,
      rows: [],
      continueRow: null,
    };
  }
  return base;
}

/* ── teacher fixtures ─────────────────────────────────────────────────── */

const THREADS: TeacherHomeModel["unread"]["rows"] = [
  {
    id: "c1",
    name: "Celia Moreno",
    initial: "C",
    snippet: "Can we move Thursday to 7:30? I have a lab that runs late.",
    receivedAt: atLocal(0, 13, 40),
    timeLabel: "1:40 pm",
    hasAttachments: false,
    route: "/teacher/inbox/platform:c1",
  },
  {
    id: "c2",
    name: "Ivory Chen",
    initial: "I",
    snippet: "Here is my PT105 S2 answer sheet. I flagged 14 and 22.",
    receivedAt: atLocal(0, 11, 2),
    timeLabel: "11:02 am",
    hasAttachments: true,
    route: "/teacher/inbox/platform:c2",
  },
  {
    id: "c3",
    name: "Lydia Park",
    initial: "L",
    snippet: "Could we go over question 16 at our next session?",
    receivedAt: atLocal(-1, 16),
    timeLabel: "Yesterday",
    hasAttachments: false,
    route: "/teacher/inbox/platform:c3",
  },
];

function teacherModel(
  state: PreviewState,
  threads: TeacherHomeModel["unread"]["rows"],
): TeacherHomeModel {
  const base: TeacherHomeModel = {
    greeting:
      NOW.getHours() < 12
        ? "Good morning"
        : NOW.getHours() < 18
          ? "Good afternoon"
          : "Good evening",
    displayName: "Joshua",
    dateline: new Intl.DateTimeFormat("en-CA", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(NOW),
    unread: { state: "ready", total: threads.length, rows: threads },
    roster: {
      state: "ready",
      total: 5,
      recent: [
        {
          id: "s1",
          name: "Celia Moreno",
          activityLabel: "Active today",
          route: "/teacher/students/s1",
        },
        {
          id: "s2",
          name: "Ivory Chen",
          activityLabel: "Active today",
          route: "/teacher/students/s2",
        },
        {
          id: "s3",
          name: "Lydia Park",
          activityLabel: "Active yesterday",
          route: "/teacher/students/s3",
        },
        {
          id: "s4",
          name: "Dakota Reyes",
          activityLabel: "Last active Oct 17",
          route: "/teacher/students/s4",
        },
      ],
      all: [
        {
          id: "s1",
          name: "Celia Moreno",
          activityLabel: "Active today",
          route: "/teacher/students/s1",
        },
        {
          id: "s2",
          name: "Ivory Chen",
          activityLabel: "Active today",
          route: "/teacher/students/s2",
        },
        {
          id: "s3",
          name: "Lydia Park",
          activityLabel: "Active yesterday",
          route: "/teacher/students/s3",
        },
        {
          id: "s4",
          name: "Dakota Reyes",
          activityLabel: "Last active Oct 17",
          route: "/teacher/students/s4",
        },
        {
          id: "s5",
          name: "Sandra Bennett",
          activityLabel: "Last active Oct 10",
          route: "/teacher/students/s5",
        },
      ],
    },
    sessions: {
      state: "ready",
      rows: [
        {
          id: "x1",
          scheduledAt: atLocal(0, 18),
          name: "Dakota Reyes",
          dayLabel: "Today",
          timeLabel: "6:00 pm",
          durationLabel: "60 min",
          route: "/teacher/students/s4/schedule",
        },
        {
          id: "x2",
          scheduledAt: atLocal(1, 19, 15),
          name: "Celia Moreno",
          dayLabel: "Tomorrow",
          timeLabel: "7:15 pm",
          durationLabel: "90 min",
          route: "/teacher/students/s1/schedule",
        },
      ],
    },
  };
  if (state === "empty") {
    return {
      ...base,
      unread: { state: "ready", total: 0, rows: [] },
      roster: { state: "ready", total: 0, recent: [] },
      sessions: { state: "ready", rows: [] },
    };
  }
  if (state === "loading") {
    return {
      ...base,
      unread: { state: "loading", total: null, rows: [] },
      roster: { state: "loading", total: null, recent: [] },
      sessions: { state: "loading", rows: [] },
    };
  }
  if (state === "error") {
    return {
      ...base,
      unread: { state: "error", total: null, rows: [] },
      roster: { state: "error", total: null, recent: [] },
      sessions: { state: "error", rows: [] },
    };
  }
  return base;
}

/* ── harness ──────────────────────────────────────────────────────────── */

const SAMPLE_TASKS: PostSessionTask[] = [
  {
    id: "followup-1",
    revision: 1,
    student_id: "s1",
    student_name: "Celia Moreno",
    source_title: "Sample tutoring session",
    starts_at: atLocal(-1, 17),
    ends_at: atLocal(-1, 18),
    source_state: "ended",
    match_state: "matched",
    transcript_doc_id: "SAMPLE_TRANSCRIPT_NOT_A_REAL_FILE",
    transcript_source: "auto",
    transcript_status: "linked",
    drive_folder_url:
      "https://drive.google.com/drive/folders/SAMPLE_FOLDER_NOT_A_REAL_FILE",
    local_slug: null,
    recap_done: false,
    notes_done: true,
    work_assigned: false,
    handled_at: null,
  },
  {
    id: "followup-2",
    revision: 1,
    student_id: "s2",
    student_name: "Ivory Chen",
    source_title: "Sample tutoring session",
    starts_at: atLocal(-1, 15),
    ends_at: atLocal(-1, 16),
    source_state: "ended",
    match_state: "matched",
    transcript_doc_id: null,
    transcript_source: null,
    transcript_status: "waiting",
    drive_folder_url: null,
    local_slug: null,
    recap_done: false,
    notes_done: false,
    work_assigned: false,
    handled_at: null,
  },
];
const MANY_TASKS: PostSessionTask[] = Array.from(
  { length: 12 },
  (_, index) => ({
    ...SAMPLE_TASKS[index % SAMPLE_TASKS.length],
    id: `many-session-${index}`,
    student_name: ["Celia Moreno", "Ivory Chen", "Lydia Park", "Dakota Reyes"][
      index % 4
    ],
    starts_at: atLocal(-Math.ceil((index + 1) / 3), 14 + (index % 3)),
    ends_at: atLocal(-Math.ceil((index + 1) / 3), 15 + (index % 3)),
  }),
);
const WIDTHS = ["fluid", "1440", "980", "768", "390", "320"] as const;
const STATES: PreviewState[] = [
  "full",
  "empty",
  "loading",
  "error",
  "role-pending",
  "role-error",
  "role-stale",
  "setup",
  "save-error",
  "many",
  "stale",
  "offline",
  "long-names",
];

function Preview() {
  const [role, setRole] = React.useState<Role>(
    (params.get("role") as Role) || "teacher",
  );
  const [state, setState] = React.useState<PreviewState>(
    (params.get("state") as PreviewState) || "full",
  );
  const [width, setWidth] = React.useState<string>(
    params.get("width") || "fluid",
  );
  const [theme, setTheme] = React.useState(
    params.get("theme") === "dark" ? "dark" : "light",
  );
  const [rows, setRows] = React.useState(STUDENT_ROWS);
  const [threads, setThreads] = React.useState(THREADS);
  const [tasks, setTasks] = React.useState(
    state === "many" ? MANY_TASKS : SAMPLE_TASKS,
  );
  React.useEffect(() => {
    setTasks(state === "many" ? MANY_TASKS : SAMPLE_TASKS);
  }, [state]);
  const [taskError, setTaskError] = React.useState<string | undefined>();
  const [completing, setCompleting] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const note = (line: string) => setLog((prev) => [line, ...prev].slice(0, 6));

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    const next = new URLSearchParams({ role, state, width, theme });
    history.replaceState(null, "", `?${next}`);
  }, [role, state, width, theme]);

  const open = (route: string) => {
    note(`Would navigate to ${route}`);
    // Local read: opening a teacher thread clears it from the sample inbox.
    const thread = threads.find((t) => t.route === route);
    if (thread) setThreads((prev) => prev.filter((t) => t.id !== thread.id));
  };
  const retry = () => {
    note("Retry pressed");
    setState("full");
  };

  const sampleDesk = useSampleDesk(state, note, tasks);
  const contentState: PreviewState = state.startsWith("role-") ? "full" : state;
  const sampleUpdate = async (
    task: PostSessionTask,
    change: PostSessionChange,
  ) => {
    if (state === "save-error") {
      setTaskError("Sample save failed. Nothing changed.");
      return;
    }
    setTaskError(undefined);
    setTasks((previous) =>
      previous.map((row) =>
        row.id !== task.id
          ? row
          : {
              ...row,
              revision: row.revision + 1,
              ...(change.action === "checklist"
                ? { [change.field!]: change.value }
                : {}),
              ...(change.action === "recap_posted"
                ? { recap_posted: change.value }
                : {}),
              ...(change.action === "blocker"
                ? { blocker: change.field || null }
                : {}),
              ...(change.action === "handle"
                ? { handled_at: new Date().toISOString() }
                : {}),
              ...(change.action === "reopen" ? { handled_at: null } : {}),
              ...(change.action === "attach_transcript"
                ? {
                    transcript_doc_id: change.docId!,
                    transcript_status: "linked" as const,
                    transcript_source: "manual" as const,
                  }
                : {}),
              ...(change.action === "match_student"
                ? {
                    student_id: change.studentId!,
                    student_name:
                      teacherModel("full", threads).roster.all?.find(
                        (student) => student.id === change.studentId,
                      )?.name ?? "Sample student",
                    match_state: "matched" as const,
                  }
                : {}),
            },
      ),
    );
    note("Sample work list updated. No real record changed.");
  };
  const sampleWork: PostSessionHomeState = {
    state:
      contentState === "loading"
        ? "loading"
        : contentState === "error"
          ? "error"
          : contentState === "setup"
            ? "setup"
            : "ready",
    data: {
      settings: {
        enabled: true,
        activation_cutoff: atLocal(-7, 0),
        last_success_at: NOW.toISOString(),
        last_error: null,
        drive_root_url: null,
        catching_up: false,
      },
      total:
        contentState === "empty"
          ? 0
          : contentState === "many"
            ? 12
            : tasks.filter((task) => !task.handled_at).length,
      tasks:
        contentState === "empty"
          ? []
          : tasks
              .filter((task) => !task.handled_at)
              .map((t, i) =>
                contentState === "long-names"
                  ? {
                      ...t,
                      student_name:
                        "Alexandria Catherine Montgomery-Sutherland",
                    }
                  : t,
              ),
      handled:
        contentState === "empty"
          ? []
          : tasks.filter((task) => !!task.handled_at),
    },
    update: sampleUpdate,
    retry,
    error: taskError,
  };
  let body: React.ReactNode;
  if (state === "role-pending") body = <HomeRoleSkeleton />;
  else if (state === "role-error") body = <HomeRoleError onRetry={retry} />;
  else if (role === "teacher") {
    body = (
      <TeacherHomeView
        key={`teacher-${contentState}`}
        model={{
          ...teacherModel(contentState, threads),
          postSession: sampleWork,
          desk: sampleDesk,
        }}
        onOpen={open}
        onRetryInbox={retry}
        onRetryRoster={retry}
        onRetrySessions={retry}
      />
    );
  } else {
    const model = studentModel(contentState, rows, 1);
    body = (
      <ClassroomHomeView
        key={`student-${contentState}`}
        model={model}
        loading={contentState === "loading"}
        onOpen={open}
        onRetryWork={retry}
        onRefresh={() =>
          note("Refresh pressed (re-reads assignment keys in the app)")
        }
        completingKey={completing}
        onMarkDone={(key) => {
          setCompleting(key);
          note(`Mark done: ${key}`);
          window.setTimeout(() => {
            setRows((prev) => prev.filter((row) => row.key !== key));
            setCompleting(null);
          }, 500);
        }}
        onClearMessage={(id) =>
          note(`Clear from Home (not read, not deleted): ${id}`)
        }
      />
    );
  }

  const frameWidth = width === "fluid" ? "100%" : `${width}px`;

  return (
    <div style={{ fontFamily: "Outfit, sans-serif" }}>
      <div
        role="toolbar"
        aria-label="Preview controls"
        className="home-preview-toolbar"
        style={{
          alignItems: "center",
          background: "#252b26",
          color: "#efede6",
          display: "flex",
          flexWrap: "wrap",
          fontSize: 13,
          gap: 12,
          padding: "10px 16px",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <strong
          style={{
            fontWeight: 500,
            background: "#efede6",
            borderRadius: 4,
            color: "#252b26",
            padding: "2px 8px",
          }}
        >
          Sample data · links are examples
        </strong>
        <label>
          Role{" "}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="teacher">teacher</option>
            <option value="student">student</option>
          </select>
        </label>
        <label>
          State{" "}
          <select
            value={state}
            onChange={(e) => setState(e.target.value as PreviewState)}
          >
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Width{" "}
          <select value={width} onChange={(e) => setWidth(e.target.value)}>
            {WIDTHS.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          Theme{" "}
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option>light</option>
            <option>dark</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setRows(STUDENT_ROWS);
            setThreads(THREADS);
            setTasks(state === "many" ? MANY_TASKS : SAMPLE_TASKS);
            setTaskError(undefined);
            setLog([]);
          }}
        >
          Reset sample data
        </button>
        <span aria-live="polite" style={{ opacity: 0.8 }}>
          {log[0] ?? ""}
        </span>
      </div>
      <div
        style={{
          background: "#d9d6cd",
          minHeight: "100vh",
          overflowX: "auto",
          padding: width === "fluid" ? 0 : "24px 0",
        }}
      >
        <div
          className="classroom-root classroom-root-home"
          style={{
            margin: "0 auto",
            minHeight: "auto",
            width: frameWidth,
            display: "grid",
            gridTemplateColumns: "var(--preview-columns, 210px minmax(0, 1fr))",
          }}
        >
          <style>{`@media(max-width:767px){.preview-home-sidebar{display:none!important}.classroom-root-home{--preview-columns:minmax(0,1fr)}}`}</style>
          <aside
            className="preview-home-sidebar"
            style={{
              padding: "28px 20px",
              background: "#f3f1e9",
              minHeight: "100vh",
              fontSize: 14,
            }}
          >
            <b style={{ display: "block", marginBottom: 34 }}>LSAT U</b>
            {[
              "Home",
              "My Work",
              "Practice",
              "Review",
              "Progress",
              "Library",
              "Reading Center",
              "Messages",
              "Teacher Workspace",
              "Students",
            ].map((label, index) => (
              <div
                key={label}
                style={{
                  padding: "11px 12px",
                  background: index === 0 ? "#252b26" : "transparent",
                  color: index === 0 ? "#fffefa" : "#252b26",
                  borderRadius: 7,
                  marginBottom: 3,
                }}
              >
                {label}
              </div>
            ))}
            <p style={{ marginTop: 50, fontSize: 12 }}>Sample navigation</p>
          </aside>
          <main className="classroom-stage">
            <div className="classroom-column">
              {state === "role-stale" ? (
                <HomeRefreshNotice onRetry={retry} />
              ) : null}
              {body}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, enabled: false } },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <MemoryRouter>
      <Preview />
    </MemoryRouter>
  </QueryClientProvider>,
);
