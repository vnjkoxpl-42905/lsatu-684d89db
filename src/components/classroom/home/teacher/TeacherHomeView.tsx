import * as React from "react";
import { ArrowRight } from "lucide-react";
import { useHomeFeedback } from "../useHomeFeedback";
import { postSessionLede, calendarCheckIsStale } from "./postSessionModel";
import type { TeacherHomeModel } from "./teacherHomeModel";
import { filterStudents } from "./teacherHomeModel";
import { PostSessionWork } from "./PostSessionWork";
import { MyList, AllTasksSheet, DeskStatus } from "./TeacherTasks";
import { TeacherScheduleSheet } from "./TeacherScheduleSheet";
import { AccessSheet, BookingSheet } from "./TeacherAccessBooking";
import {
  EMPTY_DESK,
  deskMoney,
  paymentLabel,
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
  const paymentActivity = (
    <section
      className="classroom-home-region home-desk-payments"
      id="home-payments"
    >
      <header className="classroom-home-region-head">
        <h2>Payment activity</h2>
        <span className="home-desk-period">Last 90 days</span>
        <button
          className="classroom-home-more"
          onClick={() => onOpen("/teacher/today")}
        >
          History ↗
        </button>
      </header>
      <DeskStatus region={desk.payments} noun="payment activity" />
      {desk.payments.state === "ready" ? (
        desk.payments.data?.recent?.length ? (
          <ul className="home-desk-payment-list">
            {desk.payments.data.recent.slice(0, 3).map((p) => (
              <li key={p.id}>
                <span>
                  <b>{p.payer_name || p.email || "Payer not linked"}</b>
                  <small>
                    {paymentLabel(p)} · {when(p.paid_at)}
                  </small>
                </span>
                <strong>{deskMoney(p)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-desk-empty">No payment activity recorded.</p>
        )
      ) : null}
    </section>
  );
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
  return (
    <div
      ref={rootRef}
      className="classroom-home classroom-home-teacher home-desk"
      data-motion-skip
      data-role-home="teacher"
      data-home-treatment="paper"
      data-work-state={quietWork ? "quiet" : "active"}
    >
      <header className="home-desk-masthead">
        <div className="home-desk-greeting">
          <p className="home-desk-dateline">
            {model.dateline} <span>Teaching desk</span>
          </p>
          <h1>
            {model.greeting}
            {model.displayName ? (
              <>
                , <span className="home-desk-name">{model.displayName}.</span>
              </>
            ) : (
              "."
            )}
          </h1>
          <p className="home-desk-summary">{sessionSummary}</p>
        </div>
        <div className="home-desk-action-stack">
          <button
            className="home-desk-launcher"
            aria-label="Assign work"
            data-home-feedback
            onClick={() => onOpen("/teacher/library/assignments")}
          >
            <span className="home-desk-launcher-copy">
              <span className="home-desk-launcher-title">Assign work</span>
              <span className="home-desk-launcher-description">
                Choose a student and their next task.
              </span>
            </span>
            <span className="home-desk-launcher-arrow" aria-hidden="true">
              <ArrowRight size={20} />
            </span>
          </button>
          <div className="home-desk-header-actions">
            <a
              data-home-feedback
              href={EMAIL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open email ↗
            </a>
            <button data-home-feedback onClick={() => onOpen("/teacher/inbox")}>
              Messages
              {model.unread.state === "ready" ? ` (${model.unread.total})` : ""}
            </button>
            <details className="home-desk-more-menu">
              <summary>More</summary>
              <div>
                <button onClick={(event) => openBooking("link", event.currentTarget)}>
                  Create session link
                </button>
                <button onClick={() => onOpen("/teacher/students")}>
                  All students
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <nav className="home-desk-attention" aria-label="Jump to work">
        <button onClick={() => jump("home-session-work")}>
          <span>After-session</span>
          <b>
            {count(
              model.postSession?.state ?? "setup",
              model.postSession?.data?.total ??
                model.postSession?.data?.tasks?.length,
            )}
          </b>
        </button>
        <button onClick={() => jump("home-decisions")}>
          <span>Payment decisions</span>
          <b>
            {count(desk.payments.state, desk.payments.data?.attention_total)}
          </b>
        </button>
        <button onClick={() => jump("home-decisions")}>
          <span>Access decisions</span>
          <b>{count(desk.access.state, pendingAccess.length)}</b>
        </button>
        <button onClick={() => jump("home-correspondence")}>
          <span>Email</span>
          <b>
            {count(desk.email.state, desk.email.data?.count)}
            {desk.email.state === "ready" &&
            desk.email.data?.count_is_lower_bound
              ? "+"
              : ""}
          </b>
        </button>
      </nav>
      <div className="home-desk-main">
        <div className="home-desk-work-column">
          <PostSessionWork
            work={model.postSession}
            students={students}
            onOpen={onOpen}
            onAll={() => setAllTasks(true)}
          />
          <MyList
            desk={desk}
            students={students}
            onAll={() => setAllTasks(true)}
          />
          {correspondence}
        </div>
        <aside
          className="home-desk-side-column"
          aria-label="Agenda and decisions"
        >
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
                                  setClassifyError(
                                    "Could not label this event.",
                                  ),
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
                                  setClassifyError(
                                    "Could not label this event.",
                                  ),
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
                <p className="home-desk-empty">
                  No events in the next seven days.
                </p>
              )
            ) : null}
            {classifyError ? <p role="alert">{classifyError}</p> : null}
            {desk.agenda.data?.fetched_at ? (
              <p className="home-desk-footnote">
                Checked {when(desk.agenda.data.fetched_at)} · Primary calendar
              </p>
            ) : null}
          </section>
          <section
            className="classroom-home-region home-desk-decisions"
            id="home-decisions"
            tabIndex={-1}
          >
            <header className="classroom-home-region-head">
              <h2>Needs a decision</h2>
            </header>
            <DeskStatus region={desk.payments} noun="payment decisions" />
            {desk.payments.state === "ready" ? (
              desk.payments.data?.attention?.length ? (
                <ul>
                  {desk.payments.data.attention.slice(0, 2).map((p) => (
                    <li key={p.id}>
                      <button onClick={() => onOpen("/teacher/today")}>
                        <span>
                          <b>{p.payer_name || p.email || "Unmatched payer"}</b>
                          <small>
                            {paymentLabel(p)} · {deskMoney(p)}
                          </small>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home-desk-empty">No payment decisions waiting.</p>
              )
            ) : null}
            <DeskStatus region={desk.access} noun="access decisions" />
            {desk.access.state === "ready" ? (
              pendingAccess.length ? (
                <ul>
                  {pendingAccess.slice(0, 2).map((person) => (
                    <li key={person.class_id}>
                      <button onClick={e => { accountTrigger.current = e.currentTarget; setAccessOpen(true); setAccess(person); }}>
                        <span>
                          <b>{person.display_name || person.email}</b>
                          <small>Choose student access</small>
                        </span>
                        <span aria-hidden="true">↗</span>
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
            <div className="home-desk-decision-actions">
              <button onClick={() => onOpen("/teacher/today")}>
                Payments and history ↗
              </button>
              <button onClick={() => onOpen("/teacher/students")}>
                Student access ↗
              </button>
            </div>
          </section>
          {paymentActivity}
        </aside>
      </div>
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
        <div className="home-desk-account-actions" data-account-controls="student-credits-scheduling-20261028" role="group" aria-label="Student accounts">
          <div><h3>Student accounts</h3><p>Manage sessions, access and private booking links.</p></div>
          <button ref={scheduleTrigger} onClick={() => setScheduleOpen(true)}>Schedule a session</button>
          <button onClick={e => openBooking("credits", e.currentTarget)}>Add session credits</button>
          <button onClick={e => { accountTrigger.current = e.currentTarget; setAccess(null); setAccessOpen(true); }}>Account access</button>
          <button onClick={e => openBooking("link", e.currentTarget)}>Individual booking links</button>
        </div>
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
            <p className="home-desk-footnote">
              Recent activity is based on the last recorded visit.
            </p>
          </div>
          <div>
            <h3>Recent results</h3>
            <DeskStatus region={desk.results} noun="test results" />
            {desk.results.state === "ready" ? (
              desk.results.data?.length ? (
                <ul>
                  {desk.results.data.slice(0, 3).map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() =>
                          onOpen(
                            `/teacher/students/${encodeURIComponent(r.student_id)}/work`,
                          )
                        }
                      >
                        <b>{r.student_name}</b>
                        <small>
                          {r.title} · {r.score ?? "Result available"}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="home-desk-empty">No recent results recorded.</p>
              )
            ) : null}
          </div>
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
                      <button onClick={() => onOpen(s.route)}>
                        {s.name} ↗
                      </button>
                      {desk.access.data?.find((p) => p.class_id === s.id) ? (
                        <button
                          onClick={(e) => {
                            accountTrigger.current = e.currentTarget;
                            setAccessOpen(true);
                            setAccess(
                              desk.access.data!.find(
                                (p) => p.class_id === s.id,
                              )!,
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
            ) : (
              <p className="home-desk-empty">
                Open notes, assignments and student details.
              </p>
            )}
          </div>
        </div>
      </section>
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
