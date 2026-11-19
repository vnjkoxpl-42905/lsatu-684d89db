import * as React from "react";
import type { AgendaEvent } from "./teachingDeskModel";
import { safeGoogleLink } from "./teachingDeskModel";
import type { TeacherStudentRow, TeacherThreadRow } from "./teacherHomeModel";
import { filterStudents } from "./teacherHomeModel";
import { clockLabel, eventName, timedEvents } from "./observatoryModel";

type PanelKey = "search" | "msg" | "cal" | "stu" | "more";

const TITLES: Record<PanelKey, string> = {
  search: "Search",
  msg: "Messages",
  cal: "Calendar",
  stu: "Students",
  more: "More",
};

/**
 * The teacher dock (home-v2): a pill fixed to the bottom of Home with search,
 * Assign work (lit), Messages, Calendar and Students. Panels rise from it,
 * one at a time. Escape or Close returns focus to whatever opened the panel.
 * Under 820px the dock collapses to a search button, Assign work and More.
 * Every row is real: unread threads, calendar events, the roster.
 */
export function TeacherDock({
  students,
  rosterReady,
  unread,
  unreadTotal,
  events,
  onOpen,
}: {
  students: TeacherStudentRow[];
  rosterReady: boolean;
  unread: TeacherThreadRow[];
  unreadTotal: number | null;
  events: AgendaEvent[] | undefined;
  onOpen: (route: string) => void;
}) {
  const [open, setOpen] = React.useState<PanelKey | null>(null);
  const [query, setQuery] = React.useState("");
  const opener = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const headRef = React.useRef<HTMLHeadingElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const keepFocus = React.useRef(false);
  const panelId = React.useId();

  const close = React.useCallback((restore = true) => {
    setOpen(null);
    if (restore) {
      const target = opener.current;
      requestAnimationFrame(() => {
        if (target && document.contains(target) && target.offsetParent !== null) target.focus();
      });
    }
  }, []);

  const show = (key: PanelKey, from: HTMLElement | null, opts: { keepFocus?: boolean } = {}) => {
    if (open === key && opener.current === from && !opts.keepFocus) {
      close();
      return;
    }
    opener.current = from;
    keepFocus.current = !!opts.keepFocus;
    setOpen(key);
  };

  // Move focus into a panel opened by a button; the inline search keeps it.
  React.useEffect(() => {
    if (!open || keepFocus.current) return;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("input, button:not([data-close])");
    (first ?? headRef.current)?.focus();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if ((t as Element).closest?.(".obs-dock")) return;
      close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

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
      else if (open === "search") (inputRef.current ?? panelRef.current?.querySelector("input"))?.focus();
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
        {keepFocus.current ? null : (
          <>
            <label className="sr-only" htmlFor={`${panelId}-q2`}>
              Search students
            </label>
            <input
              id={`${panelId}-q2`}
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
          </>
        )}
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
  } else if (open === "more") {
    body = (
      <ul className="obs-plist">
        {(["msg", "cal", "stu"] as const).map((k) => (
          <li key={k}>
            <button
              className="obs-prow"
              onClick={() => {
                keepFocus.current = true;
                setOpen(k);
                requestAnimationFrame(() => headRef.current?.focus());
              }}
            >
              <span>{TITLES[k]}</span>
              {k === "msg" && unreadTotal ? <small>{unreadTotal} unread</small> : null}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const exp = (k: PanelKey) => open === k;

  return (
    <>
      <div
        ref={panelRef}
        id={panelId}
        className={open ? "obs-panel is-open" : "obs-panel"}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${panelId}-h`}
        hidden={!open}
        onKeyDown={navKeys}
      >
        <div className="obs-ph">
          <h2 id={`${panelId}-h`} ref={headRef} tabIndex={-1}>
            {open === "search" && keepFocus.current ? "Students" : open ? TITLES[open] : ""}
          </h2>
          <button className="obs-x" data-close onClick={() => close()}>
            Close
          </button>
        </div>
        {body}
      </div>
      <nav className="obs-dock" aria-label="Teacher dock">
        <label className="sr-only" htmlFor={`${panelId}-q`}>
          Search students
        </label>
        <input
          ref={inputRef}
          id={`${panelId}-q`}
          className="obs-d-only obs-dock-q"
          type="search"
          autoComplete="off"
          placeholder="Search students"
          aria-controls={panelId}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) {
              if (open === "search") close(false);
              return;
            }
            if (open !== "search") show("search", e.currentTarget, { keepFocus: true });
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && open === "search") {
              const b = panelRef.current?.querySelector<HTMLElement>(".obs-prow");
              if (b) {
                e.preventDefault();
                b.focus();
              }
            }
            if (e.key === "Enter" && matches[0]) go(matches[0].route);
          }}
        />
        <button
          className="obs-m-only"
          aria-label="Search"
          aria-expanded={exp("search")}
          aria-controls={panelId}
          onClick={(e) => show("search", e.currentTarget)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 3.5 3.5" />
          </svg>
        </button>
        <button className="obs-lit" onClick={() => go("/teacher/library/assignments")}>
          Assign work
        </button>
        <button className="obs-d-only" aria-expanded={exp("msg")} aria-controls={panelId} onClick={(e) => show("msg", e.currentTarget)}>
          Messages{unreadTotal ? <span className="obs-dock-n">{unreadTotal}</span> : null}
        </button>
        <button className="obs-d-only" aria-expanded={exp("cal")} aria-controls={panelId} onClick={(e) => show("cal", e.currentTarget)}>
          Calendar
        </button>
        <button className="obs-d-only" aria-expanded={exp("stu")} aria-controls={panelId} onClick={(e) => show("stu", e.currentTarget)}>
          Students
        </button>
        <button className="obs-m-only" aria-expanded={exp("more") || exp("msg") || exp("cal") || exp("stu")} aria-controls={panelId} onClick={(e) => show("more", e.currentTarget)}>
          More
        </button>
      </nav>
    </>
  );
}
