import * as React from "react";
import { ArrowRight } from "lucide-react";
import { useHomeFeedback } from "../useHomeFeedback";
import { postSessionLede, calendarCheckIsStale } from "./postSessionModel";
import type { TeacherHomeModel } from "./teacherHomeModel";
import { filterStudents } from "./teacherHomeModel";
import { PostSessionWork } from "./PostSessionWork";
import { MyList, AllTasksSheet, DeskStatus } from "./TeacherTasks";
import { TeacherScheduleSheet } from "./TeacherScheduleSheet";
import { EclipseStage } from "./EclipseStage";
import "./eclipse.css";
import { AccessSheet, BookingSheet } from "./TeacherAccessBooking";
import {
  EMPTY_DESK,
  safeGoogleLink,
} from "./teachingDeskModel";
import type { ManagedUser } from "@/lib/adminUsers";
const CALENDAR = "https://calendar.google.com/calendar/u/0/r";
const EMAIL = "https://mail.google.com/mail/u/0/#inbox";
function when(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return (
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(`${value}T12:00:00`)) + " · All day"
    );
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}
function TeacherDeskContent({
  model,
  onOpen,
  onRetryInbox,
  onRetryRoster,
}: {
  model: TeacherHomeModel;
  onOpen: (route: string) => void;
  onRetryInbox?: () => void;
  onRetryRoster?: () => void;
  onRetrySessions?: () => void;
}) {
  const desk = model.desk ?? EMPTY_DESK;
  const rootRef = React.useRef<HTMLDivElement>(null);
  useHomeFeedback(rootRef);
  const students = model.roster.all ?? model.roster.recent;
  const [allTasks, setAllTasks] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const scheduleTrigger = React.useRef<HTMLButtonElement>(null);
  const [booking, setBooking] = React.useState(false);
  const [bookingMode, setBookingMode] = React.useState<"credits" | "link">("link");
  const [accessOpen, setAccessOpen] = React.useState(false);
  const accountTrigger = React.useRef<HTMLButtonElement | null>(null);
  const openBooking = (mode: "credits" | "link", trigger?: HTMLButtonElement) => {
    accountTrigger.current = trigger ?? null;
    setBookingMode(mode);
    setBooking(true);
  };
  const [access, setAccess] = React.useState<ManagedUser | null>(null);
  const [search, setSearch] = React.useState("");
  const [classifyError, setClassifyError] = React.useState("");
  const pendingAccess = desk.access.data?.filter((p) => !p.access_tier) ?? [];
  const matches = search.trim()
    ? filterStudents(students, search).slice(0, 5)
    : [];
  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    document.getElementById(id)?.focus({ preventScroll: true });
  };
  const count = (state: string, count: number | undefined) =>
    state === "ready" ? (count ?? 0) : "—";
  const sessionTotal =
    model.postSession?.data?.total ??
    model.postSession?.data?.tasks?.length ??
    0;
  const sessionSummary =
    postSessionLede(model.postSession) ??
    (model.postSession?.state === "ready"
      ? "Your saved follow-up work is below."
      : model.postSession?.state === "loading"
        ? "Checking your session follow-up…"
        : model.postSession?.state === "error"
          ? "Your session follow-up could not be checked."
          : "Connect session follow-up to see your next steps.");
  const settings = model.postSession?.data?.settings;
  const quietWork =
    model.postSession?.state === "ready" &&
    !model.postSession.refreshFailed &&
    settings?.enabled &&
    !settings.last_error &&
    !settings.catching_up &&
    !calendarCheckIsStale(settings) &&
    sessionTotal === 0 &&
    desk.manual.state === "ready" &&
    !desk.manual.stale &&
    desk.manual.data?.total === 0;
  const correspondence = (
    <section
      className="classroom-home-region home-desk-correspondence-region"
      id="home-correspondence"
      tabIndex={-1}
    >
      <header className="classroom-home-region-head">
        <h2>Correspondence</h2>
      </header>
      <div className="home-desk-correspondence">
        <div>
          <div className="home-desk-subhead">
            <h3>Email</h3>
            <a href={EMAIL} target="_blank" rel="noopener noreferrer">
              Open email ↗
            </a>
          </div>
          <DeskStatus region={desk.email} noun="student and enquiry email" />
          {desk.email.data?.enquiries_configured === false ? (
            <p role="status" className="home-desk-empty">
              Student email is shown. Add the Gmail label “LSAT U/Tutoring
              enquiries” to include enquiries.
            </p>
          ) : null}
          {desk.email.data?.threads?.length ? (
            <ul>
              {desk.email.data.threads.slice(0, 2).map((thread) => (
                <li key={thread.id}>
                  {safeGoogleLink(thread.url, "email") ? (
                    <a
                      href={safeGoogleLink(thread.url, "email")!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <b>{thread.sender}</b>
                      <small>{thread.subject}</small>
                    </a>
                  ) : (
                    <>
                      <b>{thread.sender}</b>
                      <small>{thread.subject}</small>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : desk.email.state === "ready" ? (
            <p className="home-desk-empty">
              {desk.email.data?.enquiries_configured === false
                ? "No unread student email."
                : "No unread student or enquiry email."}
            </p>
          ) : null}
        </div>
        <div>
          <div className="home-desk-subhead">
            <h3>
              Messages{" "}
              {model.unread.state === "ready" ? `(${model.unread.total})` : ""}
            </h3>
            <button onClick={() => onOpen("/teacher/inbox")}>Inbox ↗</button>
          </div>
          {model.unread.state === "loading" ? (
            <p className="home-desk-empty">Loading messages…</p>
          ) : model.unread.state === "error" ? (
            <p role="alert">
              Unread messages are unknown.{" "}
              <button onClick={onRetryInbox}>Retry</button>
            </p>
          ) : (
            <>
              {model.unread.refreshFailed ? (
                <p role="status" className="home-desk-empty">
                  Could not refresh messages. Showing the last loaded
                  conversations.
                </p>
              ) : null}
              <ul aria-label="Unread conversations">
                {model.unread.rows.slice(0, 2).map((t) => (
                  <li key={t.id}>
                    <button onClick={() => onOpen(t.route)}>
                      <b>{t.name}</b>
                      <small>{t.snippet}</small>
                    </button>
                  </li>
                ))}
              </ul>
              {!model.unread.rows.length ? (
                <p className="home-desk-empty">
                  {model.unread.refreshFailed
                    ? "No conversations were unread when the inbox last loaded."
                    : "No unread conversations."}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
  const recapNames = (model.postSession?.data?.tasks ?? [])
    .map((t) => t.student_name?.split(" ")[0])
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
  const newNames = pendingAccess
    .map((p) => (p.display_name || p.email).split(" ")[0])
    .slice(0, 2)
    .join(", ");
  const unreadNames = model.unread.rows
    .map((r) => r.name.split(" ")[0])
    .slice(0, 2)
    .join(", ");
  const tiles = [
    {
      key: "recaps",
      target: "home-session-work",
      label: "Recaps to finish",
      value: count(
        model.postSession?.state ?? "setup",
        model.postSession?.data?.total ?? model.postSession?.data?.tasks?.length,
      ),
      detail: recapNames || (sessionTotal ? "" : "All caught up"),
      icon: (
        <svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z" /><path d="m9 13 2 2 4-4" /></svg>
      ),
    },
    {
      key: "new",
      target: "home-new-students",
      label: "New students",
      value: count(desk.access.state, pendingAccess.length),
      detail: newNames || (desk.access.state === "ready" ? "No one waiting" : ""),
      icon: (
        <svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.6 3.4-5.5 6.5-5.5 1.4 0 2.7.4 3.8 1.1" /><path d="M18 14v6M15 17h6" /></svg>
      ),
    },
    {
      key: "unread",
      target: "home-correspondence",
      label: "Unread",
      value: model.unread.state === "ready" ? (model.unread.total ?? 0) : "—",
      detail: unreadNames || (model.unread.state === "ready" ? "Inbox clear" : ""),
      icon: (
        <svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z" /><path d="M8 10h8" /></svg>
      ),
    },
  ];
  const hotTile = tiles.find((t) => typeof t.value === "number" && t.value > 0)?.key;
  return (
    <div
      ref={rootRef}
      className="classroom-home classroom-home-teacher home-desk home-eclipse"
      data-motion-skip
      data-role-home="teacher"
      data-home-treatment="eclipse"
      data-work-state={quietWork ? "quiet" : "active"}
    >
      <section className="eclipse-hero">
        <header className="home-desk-masthead eclipse-card eclipse-greet">
          <p className="eclipse-date">{model.dateline}</p>
          <h1>
            {model.greeting}
            {model.displayName ? (
              <>
                ,{" "}<br />
                <em className="home-desk-name">{model.displayName}.</em>
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="home-desk-summary">{sessionSummary}</p>
          <div className="eclipse-acts">
            <button
              className="eclipse-btn-dark"
              aria-label="Assign work"
              data-home-feedback
              onClick={() => onOpen("/teacher/library/assignments")}
            >
              Assign work
              <span aria-hidden="true">
                <ArrowRight size={16} />
              </span>
            </button>
            <button
              className="eclipse-btn-line"
              data-home-feedback
              onClick={() => onOpen("/teacher/inbox")}
            >
              Messages
              {model.unread.state === "ready" ? ` (${model.unread.total})` : ""}
            </button>
            <details className="home-desk-more-menu eclipse-more">
              <summary>More</summary>
              <div>
                <a href={EMAIL} target="_blank" rel="noopener noreferrer">
                  Open email ↗
                </a>
                <button onClick={(event) => openBooking("link", event.currentTarget)}>
                  Create session link
                </button>
                <button onClick={() => onOpen("/teacher/students")}>
                  All students
                </button>
              </div>
            </details>
          </div>
        </header>
        <EclipseStage agenda={desk.agenda} onOpen={onOpen} />
      </section>
      <nav className="eclipse-brief" aria-label="Today at a glance">
        {tiles.map((t) => (
          <button
            key={t.key}
            className={t.key === hotTile ? "eclipse-tile is-hot" : "eclipse-tile"}
            onClick={() => jump(t.target)}
          >
            <span className="eclipse-ico" aria-hidden="true">{t.icon}</span>
            <span className="eclipse-num">{t.value}</span>
            <span className="eclipse-lab">
              <b>{t.label}</b>
              {t.detail ? <small>{t.detail}</small> : null}
            </span>
            <span className="eclipse-go" aria-hidden="true">→</span>
          </button>
        ))}
      </nav>

      <div className="eclipse-zone">
        <div className="eclipse-zl" aria-hidden="true">01 · Follow up</div>
        <div className="eclipse-grid">
          <div className="eclipse-col">
            <PostSessionWork
              work={model.postSession}
              students={students}
              onOpen={onOpen}
              onAll={() => setAllTasks(true)}
            />
          </div>
          <div className="eclipse-col">
            <section className="classroom-home-region home-desk-agenda">
              <header className="classroom-home-region-head">
                <h2>Next up</h2>
                <a href={CALENDAR} target="_blank" rel="noopener noreferrer">
                  Calendar ↗
                </a>
              </header>
              <DeskStatus region={desk.agenda} noun="primary calendar" />
              {desk.agenda.state === "ready" ? (
                desk.agenda.data?.events?.length ? (
                  <ul className="home-desk-agenda-list">
                    {desk.agenda.data.events.slice(0, 3).map((event) => (
                      <li key={event.id}>
                        <time dateTime={event.starts_at}>
                          {when(event.starts_at)}
                        </time>
                        {safeGoogleLink(event.calendar_url, "calendar") ? (
                          <a
                            href={safeGoogleLink(event.calendar_url, "calendar")!}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {event.title}
                          </a>
                        ) : (
                          <b>{event.title}</b>
                        )}
                        {event.student_id ? (
                          <button
                            onClick={() =>
                              onOpen(
                                `/teacher/students/${encodeURIComponent(event.student_id!)}`,
                              )
                            }
                          >
                            Prepare for {event.student_name || "student"} ↗
                          </button>
                        ) : (
                          <details>
                            <summary>Label event</summary>
                            <p>
                              Only student sessions and consultations create
                              follow-up work.
                            </p>
                            <button
                              disabled={!desk.classify}
                              onClick={() =>
                                void desk
                                  .classify?.(event.id, "session")
                                  .catch(() =>
                                    setClassifyError("Could not label this event."),
                                  )
                              }
                            >
                              Student session
                            </button>
                            <button
                              disabled={!desk.classify}
                              onClick={() =>
                                void desk
                                  .classify?.(event.id, "consultation")
                                  .catch(() =>
                                    setClassifyError("Could not label this event."),
                                  )
                              }
                            >
                              Consultation
                            </button>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="home-desk-empty">No events in the next seven days.</p>
                )
              ) : null}
              {classifyError ? <p role="alert">{classifyError}</p> : null}
              {desk.agenda.data?.fetched_at ? (
                <p className="home-desk-footnote">
                  Checked {when(desk.agenda.data.fetched_at)} · Primary calendar
                </p>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      <div className="eclipse-zone">
        <div className="eclipse-zl" aria-hidden="true">02 · Inbox and new students</div>
        <div className="eclipse-three">
          {correspondence}
          <section
            className="classroom-home-region eclipse-new-students"
            id="home-new-students"
            tabIndex={-1}
          >
            <header className="classroom-home-region-head">
              <h2>
                New students{" "}
                {desk.access.state === "ready" ? (
                  <span className="classroom-home-count">{pendingAccess.length}</span>
                ) : null}
              </h2>
              <button
                className="classroom-home-more"
                onClick={() => onOpen("/teacher/students")}
              >
                All students ↗
              </button>
            </header>
            <DeskStatus region={desk.access} noun="new students" />
            {desk.access.state === "ready" ? (
              pendingAccess.length ? (
                <ul aria-label="Students waiting for access">
                  {pendingAccess.slice(0, 4).map((person) => (
                    <li key={person.class_id} className="eclipse-li">
                      <span className="eclipse-who">
                        <span className="eclipse-av" aria-hidden="true">
                          {(person.display_name || person.email).charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <b>{person.display_name || person.email}</b>
                          <small>
                            {person.created_at
                              ? `Signed up ${when(person.created_at)}`
                              : "Waiting for access"}
                          </small>
                        </span>
                      </span>
                      <button
                        className="eclipse-letin"
                        aria-label={`Let in ${person.display_name || person.email}`}
                        onClick={(e) => {
                          accountTrigger.current = e.currentTarget;
                          setAccessOpen(true);
                          setAccess(person);
                        }}
                      >
                        Let in
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home-desk-empty">
                  Every active account has an access choice.
                </p>
              )
            ) : null}
          </section>
          <MyList desk={desk} students={students} onAll={() => setAllTasks(true)} />
        </div>
      </div>

      <div className="eclipse-zone">
        <div className="eclipse-zl" aria-hidden="true">03 · Students</div>
        <section className="classroom-home-region home-desk-students">
          <header className="classroom-home-region-head">
            <h2>Students at a glance</h2>
            <button
              className="classroom-home-more"
              onClick={() => onOpen("/teacher/students")}
            >
              All students ↗
            </button>
          </header>
          <div className="home-desk-student-columns">
            <div>
              <h3>Recent activity</h3>
              {model.roster.refreshFailed ? (
                <p role="status">Could not refresh student activity.</p>
              ) : null}
              {model.roster.state === "error" ? (
                <p role="alert">
                  Activity unavailable.{" "}
                  <button onClick={onRetryRoster}>Retry</button>
                </p>
              ) : model.roster.state === "loading" ? (
                <p>Loading activity…</p>
              ) : (
                <ul aria-label="Recently active students">
                  {model.roster.recent.slice(0, 3).map((s) => (
                    <li key={s.id}>
                      <button onClick={() => onOpen(s.route)}>
                        <b>{s.name}</b>
                        <small>{s.activityLabel}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="home-desk-label" htmlFor="home-student-search">
                Find a student
                <input
                  id="home-student-search"
                  type="search"
                  placeholder="Student name"
                  disabled={model.roster.state !== "ready"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && matches[0]) onOpen(matches[0].route);
                    if (e.key === "Escape") setSearch("");
                  }}
                />
              </label>
              {search.trim() ? (
                matches.length ? (
                  <ul aria-label="Matching students">
                    {matches.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => onOpen(s.route)}>{s.name} ↗</button>
                        {desk.access.data?.find((p) => p.class_id === s.id) ? (
                          <button
                            onClick={(e) => {
                              accountTrigger.current = e.currentTarget;
                              setAccessOpen(true);
                              setAccess(
                                desk.access.data!.find((p) => p.class_id === s.id)!,
                              );
                            }}
                          >
                            Edit access
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No matching students.</p>
                )
              ) : null}
            </div>
            <div className="eclipse-results">
              <h3>Recent results</h3>
              <DeskStatus region={desk.results} noun="test results" />
              {desk.results.state === "ready" ? (
                desk.results.data?.length ? (
                  <ul>
                    {desk.results.data.slice(0, 3).map((r) => {
                      const parsed =
                        typeof r.score === "string"
                          ? /^(\d+)\s*\/\s*(\d+)$/.exec(r.score.trim())
                          : null;
                      const got = parsed ? Number(parsed[1]) : null;
                      const of = parsed ? Number(parsed[2]) : null;
                      return (
                        <li key={r.id}>
                          <button
                            onClick={() =>
                              onOpen(
                                `/teacher/students/${encodeURIComponent(r.student_id)}/work`,
                              )
                            }
                          >
                            <span className="eclipse-res-head">
                              <b>
                                {r.student_name}
                                <small>{r.title}</small>
                              </b>
                              <span>{r.score ?? "Result available"}</span>
                            </span>
                            {got !== null && of && of <= 60 && got <= of ? (
                              <span className="eclipse-ticks" aria-hidden="true">
                                {Array.from({ length: of }, (_, i) => (
                                  <i key={i} className={i < got ? "on" : undefined} />
                                ))}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="home-desk-empty">No recent results recorded.</p>
                )
              ) : null}
            </div>
            <div
              className="home-desk-account-actions"
              data-account-controls="student-credits-scheduling-20261028"
              role="group"
              aria-label="Student accounts"
            >
              <h3>Student accounts</h3>
              <button ref={scheduleTrigger} onClick={() => setScheduleOpen(true)}>
                Schedule a session <span aria-hidden="true">↗</span>
              </button>
              <button onClick={(e) => openBooking("credits", e.currentTarget)}>
                Add session credits <span aria-hidden="true">↗</span>
              </button>
              <button
                onClick={(e) => {
                  accountTrigger.current = e.currentTarget;
                  setAccess(null);
                  setAccessOpen(true);
                }}
              >
                Account access <span aria-hidden="true">↗</span>
              </button>
              <button onClick={(e) => openBooking("link", e.currentTarget)}>
                Individual booking links <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
          <p className="home-desk-footnote">
            Recent activity is based on the last recorded visit.
          </p>
        </section>
      </div>
      <AllTasksSheet
        open={allTasks}
        onClose={() => setAllTasks(false)}
        desk={desk}
        work={model.postSession}
        students={students}
        onOpen={onOpen}
      />
      <AccessSheet
        open={accessOpen || !!access}
        students={desk.access.data ?? []}
        rosterState={desk.access.state}
        onRetryRoster={desk.access.retry}
        onSelect={setAccess}
        save={desk.actions?.saveHomeAccess}
        person={access}
        onClose={() => { setAccess(null); setAccessOpen(false); requestAnimationFrame(() => accountTrigger.current?.focus()); }}
        onSaved={() => desk.refreshAccess?.()}
      />
      <TeacherScheduleSheet open={scheduleOpen} actorId={desk.actorId} students={desk.access.data ?? []} rosterState={desk.access.state} onRetryRoster={desk.access.retry} load={desk.actions?.loadHomeBooking} services={desk.schedulingServices} onCommitted={() => { if (desk.refreshBooking) desk.refreshBooking(); else { desk.agenda.retry?.(); desk.refreshAccess?.(); desk.access.retry?.(); } }} onClose={() => { setScheduleOpen(false); requestAnimationFrame(() => scheduleTrigger.current?.focus()); }} />
      <BookingSheet
        key={bookingMode}
        mode={bookingMode}
        rosterState={desk.access.state}
        onRetryRoster={desk.access.retry}
        actions={desk.actions}
        open={booking}
        onClose={() => {
          setBooking(false);
          requestAnimationFrame(() => accountTrigger.current?.focus());
        }}
        actorId={desk.actorId}
        students={desk.access.data ?? []}
      />
    </div>
  );
}
export function TeacherHomeView(
  props: React.ComponentProps<typeof TeacherDeskContent>,
) {
  return (
    <TeacherDeskContent key={props.model.desk?.actorId ?? "home"} {...props} />
  );
}
export default TeacherHomeView;
