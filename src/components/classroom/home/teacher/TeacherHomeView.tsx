import { createPortal } from "react-dom";
import { PanelRightOpen } from "lucide-react";
import * as React from "react";
import { useHomeFeedback } from "../useHomeFeedback";
import { postSessionLede, calendarCheckIsStale } from "./postSessionModel";
import type { TeacherHomeModel } from "./teacherHomeModel";
import { filterStudents } from "./teacherHomeModel";
import { PostSessionWork } from "./PostSessionWork";
import { MyList, AllTasksSheet, DeskStatus } from "./TeacherTasks";
import { TeacherScheduleSheet } from "./TeacherScheduleSheet";
import { EclipseStage } from "./EclipseStage";
import "./eclipse.css";
import "./observatory.css";
import { MessageFaces, SevenDayStrip } from "./ObservatoryWidgets";
import { StudentAccessTable } from "./StudentAccessTable";
import { TeacherDock } from "./TeacherDock";
import { TeacherStudentsFolder } from "./TeacherStudentsFolder";
import "./teacher-home-layout.css";
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
  const [accessRail, setAccessRail] = React.useState(false);
  const [railSection, setRailSection] = React.useState<"access" | "messages">("access");
  const accountTrigger = React.useRef<HTMLButtonElement | null>(null);
  const openBooking = (mode: "credits" | "link", trigger?: HTMLButtonElement) => {
    accountTrigger.current = trigger ?? null;
    setBookingMode(mode);
    setBooking(true);
  };
  const [access, setAccess] = React.useState<ManagedUser | null>(null);
  const railEditTrigger = React.useRef<HTMLButtonElement>(null);
  const railPullStart = React.useRef<number | null>(null);
  const railPullHandled = React.useRef(false);
  const openAccessRail = (trigger: HTMLButtonElement) => {
    accountTrigger.current = trigger;
    setAccess(null);
    railEditTrigger.current = null;
    setRailSection("access");
    setAccessRail(true);
    setAccessOpen(true);
  };
  const closeAccess = () => {
    setAccess(null);
    setAccessOpen(false);
    setAccessRail(false);
    const trigger = accountTrigger.current;
    requestAnimationFrame(() => {
      (trigger?.isConnected ? trigger : rootRef.current?.querySelector<HTMLElement>("#home-student-access"))?.focus();
    });
  };
  const [search, setSearch] = React.useState("");
  const [classifyError, setClassifyError] = React.useState("");
  const matches = search.trim()
    ? filterStudents(students, search).slice(0, 5)
    : [];
  const sessionTotal =
    model.postSession?.data?.total ??
    model.postSession?.data?.tasks?.length ??
    0;
  const sessionSummary = model.postSession?.refreshFailed
    ? postSessionLede(model.postSession)
    : null;
  const firstName = model.displayName?.trim().split(/\s+/)[0];
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
        <h2>Email</h2>
        <a href={EMAIL} target="_blank" rel="noopener noreferrer">Open email ↗</a>
      </header>
      <div className="home-desk-correspondence">
        <div>
          <DeskStatus region={desk.email} noun="student and enquiry email" setupLabel="Not connected." />
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

      </div>
    </section>
  );
  const [obsTick, setObsTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setObsTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const obsNow = React.useMemo(() => new Date(obsTick), [obsTick]);
  return (
    <div
      ref={rootRef}
      className="classroom-home classroom-home-teacher home-desk home-eclipse home-obs"
      data-motion-skip
      data-role-home="teacher"
      data-home-treatment="eclipse"
      data-work-state={quietWork ? "quiet" : "active"}
    >
      <header className="home-desk-masthead obs-greet">
        <div>
          <h1>
            {model.greeting}
            {firstName ? `, ${firstName}.` : "."}
          </h1>
          <p className="obs-date">{model.dateline}</p>
        </div>
        {sessionSummary ? <p className="home-desk-summary obs-sum" role="status">{sessionSummary}</p> : null}
        <div className="obs-acts">
          <details className="home-desk-more-menu obs-more">
            <summary>More</summary>
            <div>
              <button onClick={(event) => openBooking("link", event.currentTarget)}>
                Create session link
              </button>
            </div>
          </details>
        </div>
      </header>
      <div className="obs-top">
        <EclipseStage agenda={desk.agenda} onOpen={onOpen} />
        <StudentAccessTable region={desk.access} onOpenRail={openAccessRail} onEdit={(person, trigger) => {
          accountTrigger.current = trigger;
          setAccess(person);
          setAccessOpen(true);
        }} />
      </div>
      <SevenDayStrip agenda={desk.agenda} now={obsNow} onOpen={onOpen} />
      <MessageFaces unread={model.unread} onOpen={onOpen} onRetry={onRetryInbox} />

      <div className="eclipse-zone">
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
        <div className="eclipse-three">
          {correspondence}
          <MyList desk={desk} students={students} onAll={() => setAllTasks(true)} />
        </div>
      </div>

      <div className="eclipse-zone">
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
          <TeacherStudentsFolder
            roster={model.roster}
            results={desk.results}
            onOpen={onOpen}
            onRetryRoster={onRetryRoster}
          />
          <details className="home-desk-student-actions">
            <summary>Find or manage a student</summary>
            <div className="home-desk-student-columns">
              <div>
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
          </details>
        </section>
      </div>
      {createPortal(
        <button
          type="button"
          className="obs-access-edge-tab"
          aria-label="Open Teacher tools"
          aria-haspopup="dialog"
          title="Teacher tools"
          onClick={(event) => {
            if (event.detail !== 0 && railPullHandled.current) {
              railPullHandled.current = false;
              return;
            }
            openAccessRail(event.currentTarget);
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            railPullHandled.current = false;
            railPullStart.current = event.clientX;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (!event.isPrimary) return;
            const start = railPullStart.current;
            railPullStart.current = null;
            if (start !== null && start - event.clientX >= 32) {
              railPullHandled.current = true;
              openAccessRail(event.currentTarget);
            } else if (start !== null && Math.abs(start - event.clientX) >= 32) {
              railPullHandled.current = true;
            }
          }}
          onPointerCancel={() => { railPullStart.current = null; }}
        >
          <PanelRightOpen size={17} aria-hidden="true" />
        </button>,
        document.body,
      )}
      <TeacherDock
        students={students}
        rosterReady={model.roster.state === "ready"}
        unread={model.unread.rows}
        unreadTotal={model.unread.state === "ready" ? model.unread.total : null}
        events={desk.agenda.state === "ready" ? (desk.agenda.data?.events ?? []) : undefined}
        onOpen={onOpen}
      />
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
        browseEditTrigger={railEditTrigger}
        browse={accessRail ? (
          <div className="home-access-rail">
            <div className="teacher-rail-nav" role="group" aria-label="Teacher tools">
              <button type="button" aria-pressed={railSection === "access"} onClick={() => setRailSection("access")}>Student access</button>
              <button type="button" aria-label={model.unread.state === "ready" && model.unread.total > 0 ? `Messages, ${model.unread.total} unread` : "Messages"} aria-pressed={railSection === "messages"} onClick={() => setRailSection("messages")}>
                Messages{model.unread.state === "ready" && model.unread.total > 0 && <span>{model.unread.total}</span>}
              </button>
            </div>
            <div hidden={railSection !== "access"}>
              <StudentAccessTable inRail region={desk.access} onEdit={(person, trigger) => {
                railEditTrigger.current = trigger;
                setAccess(person);
              }} />
            </div>
            {railSection === "messages" && (
              <div className="teacher-rail-messages">
                <MessageFaces unread={model.unread} onRetry={onRetryInbox} onOpen={(route) => {
                  closeAccess();
                  onOpen(route);
                }} />
              </div>
            )}
          </div>
        ) : undefined}
        students={desk.access.data ?? []}
        rosterState={desk.access.state}
        onRetryRoster={desk.access.retry}
        onSelect={setAccess}
        save={desk.actions?.saveHomeAccess}
        person={access}
        onClose={closeAccess}
        onSaved={(person) => desk.refreshAccess?.(person)}
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
