import { CalendarDays, ClipboardPlus, Grid2X2, MessageCircle, Search, Users, X } from "lucide-react";
import * as React from "react";
import type { AgendaEvent } from "./teachingDeskModel";
import { safeGoogleLink } from "./teachingDeskModel";
import type { TeacherStudentRow, TeacherThreadRow } from "./teacherHomeModel";
import { filterStudents } from "./teacherHomeModel";
import { clockLabel, eventName, timedEvents } from "./observatoryModel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import "./teacher-dock.css";

const AssignmentBuilder = React.lazy(() => import("@/components/teacher/AssignmentBuilder"));

type PanelKey = "search" | "msg" | "cal" | "stu";
type DockView = PanelKey | "quick" | null;

const TITLES: Record<PanelKey, string> = {
  search: "Search",
  msg: "Messages",
  cal: "Calendar",
  stu: "Students",
};

const QUICK_ACTIONS = [
  { key: "search", label: "Search", Icon: Search },
  { key: "assign", label: "Assign work", Icon: ClipboardPlus },
  { key: "msg", label: "Messages", Icon: MessageCircle },
  { key: "cal", label: "Calendar", Icon: CalendarDays },
  { key: "stu", label: "Students", Icon: Users },
] as const;

/** Teacher Home shortcuts and their data-backed panels. */
export function TeacherDock({
  students,
  rosterReady,
  unread,
  unreadTotal,
  events,
  actorId,
  onOpen,
}: {
  students: TeacherStudentRow[];
  rosterReady: boolean;
  unread: TeacherThreadRow[];
  unreadTotal: number | null;
  events: AgendaEvent[] | undefined;
  actorId?: string;
  onOpen: (route: string) => void;
}) {
  const [view, setView] = React.useState<DockView>(null);
  const [query, setQuery] = React.useState("");
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignStudentId, setAssignStudentId] = React.useState("");
  const assignStudent = students.find((student) => student.id === assignStudentId);
  const dockRef = React.useRef<HTMLElement>(null);
  const launcherRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headRef = React.useRef<HTMLHeadingElement>(null);
  const panelId = React.useId();
  const actionsId = `${panelId}-actions`;
  const unreadCountId = `${panelId}-unread`;
  const expanded = view === "quick";
  const open = expanded ? null : view;

  const close = React.useCallback((restoreFocus = true) => {
    setView(null);
    if (restoreFocus) launcherRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("input, button:not([data-close])");
    (first ?? headRef.current)?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!view) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    const onDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (dockRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [view, close]);

  const go = (route: string) => {
    close(false);
    onOpen(route);
  };

  const matches = query.trim() ? filterStudents(students, query).slice(0, 8) : [];
  const upcoming = timedEvents(events)
    .filter((e) => e.end.getTime() > Date.now())
    .slice(0, 8);
  const day = new Intl.DateTimeFormat("en-US", { weekday: "short" });

  const navKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(".obs-prow") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    if (e.key === "ArrowDown" && i < items.length - 1) {
      e.preventDefault();
      items[i + 1].focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (i > 0) items[i - 1].focus();
      else if (open === "search") panelRef.current?.querySelector("input")?.focus();
    }
  };

  const results = (
    <ul className="obs-plist" aria-label="Matching students">
      {!rosterReady ? (
        <li className="obs-ptext">Students are still loading.</li>
      ) : !query.trim() ? null : matches.length ? (
        matches.map((s) => (
          <li key={s.id}>
            <button className="obs-prow" onClick={() => go(s.route)}>
              <span>{s.name}</span>
              <small>{s.activityLabel}</small>
            </button>
          </li>
        ))
      ) : (
        <li className="obs-ptext">No match for “{query.trim()}”</li>
      )}
    </ul>
  );

  let body: React.ReactNode = null;
  if (open === "search") {
    body = (
      <>
        <label className="sr-only" htmlFor={`${panelId}-query`}>
          Search students
        </label>
        <input
          id={`${panelId}-query`}
          className="obs-pin"
          type="search"
          autoComplete="off"
          placeholder="Search students"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              const b = panelRef.current?.querySelector<HTMLElement>(".obs-prow");
              if (b) {
                e.preventDefault();
                b.focus();
              }
            }
            if (e.key === "Enter" && matches[0]) go(matches[0].route);
          }}
        />
        {results}
      </>
    );
  } else if (open === "msg") {
    body = (
      <>
        <ul className="obs-plist">
          {unread.length ? (
            unread.map((t) => (
              <li key={t.id}>
                <button className="obs-prow" onClick={() => go(t.route)}>
                  <span>{t.name}</span>
                  <small>{t.snippet}</small>
                </button>
              </li>
            ))
          ) : (
            <li className="obs-ptext">No unread conversations.</li>
          )}
        </ul>
        <button className="obs-plink" onClick={() => go("/teacher/inbox")}>
          Open inbox
        </button>
      </>
    );
  } else if (open === "cal") {
    body = (
      <ul className="obs-plist">
        {upcoming.length ? (
          upcoming.map(({ event, start }) => {
            const link = safeGoogleLink(event.calendar_url, "calendar");
            const label = (
              <>
                <span>
                  {day.format(start)} {clockLabel(start)} · {eventName(event)}
                </span>
                {event.student_id ? <small>Open prep</small> : link ? <small>Open event ↗</small> : null}
              </>
            );
            return (
              <li key={event.id}>
                {event.student_id ? (
                  <button
                    className="obs-prow"
                    onClick={() => go(`/teacher/students/${encodeURIComponent(event.student_id!)}`)}
                  >
                    {label}
                  </button>
                ) : link ? (
                  <a className="obs-prow" href={link} target="_blank" rel="noopener noreferrer">
                    {label}
                  </a>
                ) : (
                  <span className="obs-ptext">{label}</span>
                )}
              </li>
            );
          })
        ) : (
          <li className="obs-ptext">
            {events ? "No events in the next seven days." : "Calendar not loaded."}
          </li>
        )}
      </ul>
    );
  } else if (open === "stu") {
    body = (
      <>
        <ul className="obs-plist">
          {students.slice(0, 12).map((s) => (
            <li key={s.id}>
              <button className="obs-prow" onClick={() => go(s.route)}>
                <span>{s.name}</span>
                <small>{s.activityLabel}</small>
              </button>
            </li>
          ))}
          {!students.length ? (
            <li className="obs-ptext">{rosterReady ? "No students yet." : "Students are still loading."}</li>
          ) : null}
        </ul>
        <button className="obs-plink" onClick={() => go("/teacher/students")}>
          All students
        </button>
      </>
    );
  }

  return (
    <>
      <div
        ref={panelRef}
        id={panelId}
        className={open ? "obs-panel teacher-dock-panel is-open" : "obs-panel teacher-dock-panel"}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${panelId}-h`}
        hidden={!open}
        onKeyDown={navKeys}
      >
        <div className="obs-ph">
          <h2 id={`${panelId}-h`} ref={headRef} tabIndex={-1}>
              {open ? TITLES[open] : ""}
          </h2>
          <button className="obs-x" data-close onClick={() => close()}>
            Close
          </button>
        </div>
        {body}
      </div>
      <nav
        ref={dockRef}
        className="obs-dock teacher-quick-dock"
        aria-label="Teacher dock"
        data-expanded={expanded}
      >
        <button
          ref={launcherRef}
          className="teacher-dock-launcher"
          type="button"
          aria-label={expanded ? "Close quick actions" : "Open quick actions"}
          aria-controls={actionsId}
          aria-expanded={expanded}
          onClick={() => setView(expanded ? null : "quick")}
        >
          <Grid2X2 className="teacher-dock-grid-icon" aria-hidden="true" strokeWidth={1.75} />
          <X className="teacher-dock-close-icon" aria-hidden="true" strokeWidth={1.75} />
        </button>
        <div
          id={actionsId}
          className="teacher-dock-actions"
          role="group"
          aria-label="Quick actions"
          aria-hidden={!expanded}
        >
          {QUICK_ACTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              className="teacher-dock-action"
              type="button"
              data-primary={key === "assign" || undefined}
              aria-haspopup="dialog"
              aria-controls={key === "assign" ? undefined : panelId}
              aria-describedby={key === "msg" && unreadTotal ? unreadCountId : undefined}
              disabled={!expanded}
              onClick={() => {
                if (key !== "assign") {
                  setView(key);
                } else if (actorId) {
                  close(false);
                  setAssignStudentId("");
                  setAssignOpen(true);
                } else {
                  go("/teacher/library/assignments");
                }
              }}
            >
              <Icon aria-hidden="true" strokeWidth={1.75} />
              {label}
            </button>
          ))}
          {unreadTotal ? <span id={unreadCountId} className="sr-only">{unreadTotal} unread</span> : null}
        </div>
      </nav>
      <Sheet open={assignOpen} onOpenChange={setAssignOpen}>
        <SheetContent
          className="overflow-y-auto sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            launcherRef.current?.focus();
          }}
        >
          <SheetHeader>
            <SheetTitle>Assign work</SheetTitle>
            <SheetDescription>Choose a student and the work you want to assign.</SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-5">
            <label className="block space-y-2 text-sm">
              <span>Student</span>
              <select
                className="min-h-11 w-full rounded-md border bg-background px-3"
                value={assignStudentId}
                disabled={!rosterReady}
                onChange={(event) => setAssignStudentId(event.target.value)}
              >
                <option value="">{rosterReady ? "Choose a student" : "Loading students…"}</option>
                {students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}
              </select>
            </label>
            {assignStudent && actorId && actorId !== "preview" ? (
              <React.Suspense fallback={<p role="status">Loading assignment form…</p>}>
                <AssignmentBuilder
                  key={assignStudent.id}
                  studentId={assignStudent.id}
                  adminUserId={actorId}
                  onClose={() => setAssignOpen(false)}
                />
              </React.Suspense>
            ) : assignStudent && actorId === "preview" ? (
              <p role="status">Assignments for sample students are disabled in this preview.</p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
