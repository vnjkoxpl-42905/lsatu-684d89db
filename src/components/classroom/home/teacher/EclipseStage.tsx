import * as React from "react";
import type { AgendaEvent, DeskRegion } from "./teachingDeskModel";
import { safeGoogleLink } from "./teachingDeskModel";
import {
  clockLabel,
  dayState,
  eventName,
  orbitAngle,
  sameDay,
  timedEvents,
  todayPlanets,
} from "./observatoryModel";

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const CX = 200;
const CY = 200;
const R = 128;

function pt(angle: number, r: number): [number, number] {
  return [CX + r * Math.cos(angle), CY - r * Math.sin(angle)];
}

function at(hour: number) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

/**
 * The observatory hero: the eclipse is the page's light source, and today's
 * real calendar events orbit it as planets placed by time (9 am lower left,
 * 9 pm lower right). Past events are hollow, the current or next one is lit.
 * An unloaded or empty calendar says so instead of drawing invented sessions.
 */
export function EclipseStage({
  agenda,
  onOpen,
  now: nowProp,
}: {
  agenda: DeskRegion<{ events?: AgendaEvent[] }>;
  onOpen: (route: string) => void;
  /** Fixed clock for tests. */
  now?: Date;
}) {
  const [tick, setTick] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (nowProp) return;
    const id = window.setInterval(() => setTick(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [nowProp]);
  const now = nowProp ?? new Date(tick);

  const events = timedEvents(agenda.data?.events);
  const { current, next } = dayState(events, now);
  const target = current ?? next;
  const planets = todayPlanets(events, now);

  const a0 = orbitAngle(at(9));
  const a1 = orbitAngle(at(21));
  const [x0, y0] = pt(a0, R);
  const [x1, y1] = pt(a1, R);
  const an = orbitAngle(now);
  const [ix, iy] = pt(an, R - 10);
  const [ox, oy] = pt(an, R + 10);

  let stateLabel = "Next session";
  let timeLabel = "";
  let countdown: React.ReactNode = null;
  let countdownLabel = "";

  if (current) {
    const minutes = Math.ceil((current.end.getTime() - now.getTime()) / 60_000);
    stateLabel = "In session";
    timeLabel = `until ${clockLabel(current.end)}`;
    countdown = <>{minutes}<small>min</small> left</>;
    countdownLabel = `${minutes} ${minutes === 1 ? "minute" : "minutes"} left`;
  } else if (next && sameDay(next.start, now)) {
    const minutes = Math.ceil((next.start.getTime() - now.getTime()) / 60_000);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    timeLabel = `at ${clockLabel(next.start)}`;
    countdown = <>In {hours ? <>{hours}<small>h</small>{" "}</> : null}{remainder}<small>min</small></>;
    const hoursLabel = hours ? `${hours} ${hours === 1 ? "hour" : "hours"} ` : "";
    countdownLabel = `In ${hoursLabel}${remainder} ${remainder === 1 ? "minute" : "minutes"}`;
  } else if (next) {
    stateLabel = "No more sessions today";
    timeLabel = `${SHORT_DATE.format(next.start)} at ${clockLabel(next.start)}`;
  }

  const studentId = target?.event.student_id;
  const firstName = target?.event.student_name?.split(" ")[0];
  const link = target ? safeGoogleLink(target.event.calendar_url, "calendar") : null;

  return (
    <section className="obs-hero" aria-labelledby="obs-hero-state">
      <div className="obs-hero-text">
        <h2 className="obs-state" id="obs-hero-state">
          <i aria-hidden="true" />
          {agenda.state === "ready" ? (target ? stateLabel : "Calendar") : "Today"}
        </h2>
        {agenda.state === "ready" ? (
          target ? (
            <>
              <p className="obs-who obs-appointment">
                {eventName(target.event)}{" "}<span>{timeLabel}</span>
              </p>
              {countdown && (
                <p className="obs-count">
                  <span aria-hidden="true">{countdown}</span>
                  <span className="sr-only">{countdownLabel}</span>
                </p>
              )}
            </>
          ) : (
            <p className="obs-who">No events in the next seven days.</p>
          )
        ) : agenda.state === "loading" ? (
          <p className="obs-who">Checking your calendar…</p>
        ) : agenda.state === "setup" ? (
          <p className="obs-who">Connect your calendar to see the day here.</p>
        ) : (
          <p className="obs-who" role="alert">
            Your calendar could not be checked.{" "}
            {agenda.retry ? (
              <button type="button" className="obs-inline" onClick={agenda.retry}>
                Retry
              </button>
            ) : null}
          </p>
        )}
        {agenda.state === "ready" && agenda.stale && (
          <p className="obs-calendar-status" role="status">
            Showing the last loaded calendar.{" "}
            {agenda.retry ? <button type="button" className="obs-inline" onClick={agenda.retry}>Retry</button> : null}
          </p>
        )}
        {agenda.state === "ready" && (studentId || link) ? (
          <div className="obs-hero-acts">
            {studentId ? (
              <button
                type="button"
                className="obs-btn-light"
                onClick={() => onOpen(`/teacher/students/${encodeURIComponent(studentId)}`)}
              >
                Open {firstName || "student"}'s prep
              </button>
            ) : (
              <a className="obs-btn-light" href={link ?? undefined} target="_blank" rel="noopener noreferrer">
                {target?.event.kind === "consultation" ? "Open consultation" : "Open event"}{" "}
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        ) : null}
      </div>
      <div className="obs-orrery" aria-hidden="true">
        <svg viewBox="0 0 400 400">
          <defs>
            <radialGradient id="obs-cor" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity=".55" />
              <stop offset="38%" stopColor="#fff" stopOpacity=".18" />
              <stop offset="62%" stopColor="#e9e3d4" stopOpacity=".06" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="obs-disc" cx="42%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#16191b" />
              <stop offset="100%" stopColor="#050607" />
            </radialGradient>
          </defs>
          <circle className="obs-corona" cx={CX} cy={CY} r={104} fill="url(#obs-cor)" />
          {[90, R, 160].map((r, i) => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke={`rgba(255,255,255,${[0.08, 0.16, 0.06][i]})`} strokeWidth={1} />
          ))}
          <path
            d={`M${x0} ${y0} A${R} ${R} 0 1 1 ${x1} ${y1}`}
            fill="none"
            stroke="rgba(244,239,228,.28)"
            strokeWidth={1.5}
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r={58} fill="url(#obs-disc)" />
          <circle cx={CX} cy={CY} r={58} fill="none" stroke="rgba(255,255,255,.92)" strokeWidth={1.4} />
          <path d={`M${CX - 40} ${CY - 42} A58 58 0 0 1 ${CX + 26} ${CY - 52}`} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" opacity=".9" />
          <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="rgba(244,239,228,.7)" strokeWidth={1.5} strokeLinecap="round" />
          {planets.map((p) => {
            const [x, y] = pt(p.angle, R);
            const lit = p.state === "current" || p.state === "next";
            return (
              <g key={p.event.id} data-planet={p.state}>
                {p.state === "current" ? <circle cx={x} cy={y} r={16} fill="rgba(244,239,228,.16)" /> : null}
                {p.state === "past" ? (
                  <circle cx={x} cy={y} r={6} fill="#15191b" stroke="rgba(255,255,255,.55)" strokeWidth={1.4} />
                ) : (
                  <circle cx={x} cy={y} r={lit ? 8 : 6} fill={p.state === "current" ? "#f4efe4" : "#fff"} opacity={lit ? 1 : 0.6} />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
