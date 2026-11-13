import * as React from "react";
import type { AgendaEvent, DeskRegion } from "./teachingDeskModel";
import { safeGoogleLink } from "./teachingDeskModel";

const CALENDAR = "https://calendar.google.com/calendar/u/0/r";

function clock(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function shortClock(date: Date) {
  return clock(date).replace(/\s?(AM|PM)$/, "");
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function who(event: AgendaEvent) {
  return event.student_name || event.title;
}

/**
 * The day orbit: a black planet with a white corona, and the real agenda
 * pinned around it. Everything shown comes from the primary calendar; an
 * unloaded or empty calendar says so instead of drawing invented sessions.
 */
export function EclipseStage({
  agenda,
  onOpen,
}: {
  agenda: DeskRegion<{ events?: AgendaEvent[] }>;
  onOpen: (route: string) => void;
}) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const upcoming = (agenda.data?.events ?? [])
    .filter((e) => /T/.test(e.starts_at))
    .map((e) => ({ event: e, at: new Date(e.starts_at) }))
    .filter(({ at }) => !Number.isNaN(at.getTime()) && at.getTime() >= now.getTime() - 5 * 60_000)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const next = upcoming[0];
  const then = upcoming[1];
  const todayLater = upcoming.filter(({ at }) => sameDay(at, now));

  const minutes = next ? Math.max(0, Math.round((next.at.getTime() - now.getTime()) / 60_000)) : 0;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const nextIsToday = next ? sameDay(next.at, now) : false;
  const nextDay = next
    ? new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(next.at)
    : "";

  return (
    <section className="eclipse-stage" aria-labelledby="eclipse-stage-title">
      <div className="eclipse-stars" aria-hidden="true" />
      <div className="eclipse-sky" aria-hidden="true">
        <div className="eclipse-orb eclipse-orb-1" />
        <div className="eclipse-orb eclipse-orb-2" />
        <div className="eclipse-orb eclipse-orb-arc" />
      </div>
      <div className="eclipse-planet" aria-hidden="true" />
      <div className="eclipse-stage-top">
        <h2 className="eclipse-eyebrow" id="eclipse-stage-title">
          Today
        </h2>
        <a className="eclipse-ghost-btn" href={CALENDAR} target="_blank" rel="noopener noreferrer">
          Calendar ↗
        </a>
      </div>
      <span className="eclipse-chip" aria-hidden="true">
        NOW {shortClock(now)}
      </span>
      {todayLater.slice(0, 2).map(({ event, at }, i) => (
        <span
          key={event.id}
          className={i === 0 ? "eclipse-pin" : "eclipse-pin eclipse-pin-ghost"}
          aria-hidden="true"
        >
          <b>{shortClock(at)}</b>
          {who(event)}
        </span>
      ))}
      <div className="eclipse-next">
        {agenda.state === "ready" ? (
          next ? (
            <>
              <span className="eclipse-eyebrow">
                {nextIsToday && minutes === 0
                  ? "Starting"
                  : nextIsToday
                    ? "Next session in"
                    : `Next on ${nextDay}`}
              </span>
              {nextIsToday && minutes === 0 ? (
                <div className="eclipse-count eclipse-count-now">Now</div>
              ) : nextIsToday ? (
                <div className="eclipse-count">
                  {hours}
                  <sub>HR</sub>
                  {mins}
                  <sub>MIN</sub>
                </div>
              ) : (
                <div className="eclipse-count">{shortClock(next.at)}</div>
              )}
              <p>
                {next.event.student_name ? "with " : ""}
                <em>{who(next.event)}</em> at {clock(next.at)}
              </p>
              {then ? (
                <small>
                  Then {who(then.event)} at {clock(then.at)}
                  {sameDay(then.at, now) ? "" : ` on ${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(then.at)}`}.
                </small>
              ) : null}
            </>
          ) : (
            <>
              <span className="eclipse-eyebrow">Calendar</span>
              <p>No events in the next seven days.</p>
            </>
          )
        ) : agenda.state === "loading" ? (
          <p>Checking your calendar…</p>
        ) : agenda.state === "setup" ? (
          <p>Connect your calendar to see the day here.</p>
        ) : (
          <p role="alert">
            Your calendar could not be checked.{" "}
            {agenda.retry ? (
              <button className="eclipse-inline" onClick={agenda.retry}>
                Retry
              </button>
            ) : null}
          </p>
        )}
      </div>
      {next?.event.student_id ? (
        <button
          className="eclipse-prep"
          onClick={() =>
            onOpen(`/teacher/students/${encodeURIComponent(next.event.student_id!)}`)
          }
        >
          Prepare for {next.event.student_name?.split(" ")[0] || "student"}
          <span aria-hidden="true">→</span>
        </button>
      ) : next && safeGoogleLink(next.event.calendar_url, "calendar") ? (
        <a
          className="eclipse-prep"
          href={safeGoogleLink(next.event.calendar_url, "calendar")!}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open event <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </section>
  );
}
