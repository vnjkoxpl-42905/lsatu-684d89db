import * as React from "react";
import type { AgendaEvent, DeskRegion } from "./teachingDeskModel";
import type { PostSessionHomeState } from "./postSessionModel";
import type { TeacherHomeModel } from "./teacherHomeModel";
import {
  clockLabel,
  dayFraction,
  followUps,
  stripDays,
  timedEvents,
  weekLoad,
} from "./observatoryModel";

const DOW = new Intl.DateTimeFormat("en-US", { weekday: "short" });

/** Follow-up gauge: post-session work handled out of all raised. */
export function FollowUpGauge({
  work,
  onJump,
}: {
  work?: PostSessionHomeState;
  onJump: () => void;
}) {
  const f = work?.state === "ready" ? followUps(work.data) : null;
  const cx = 66;
  const cy = 80;
  const r = 56;
  const ang = (x: number) => Math.PI * (1 - x);
  const p = (x: number) => [cx + r * Math.cos(ang(x)), cy - r * Math.sin(ang(x))];
  const arc = (a: number, b: number) => {
    const [x0, y0] = p(a);
    const [x1, y1] = p(b);
    return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
  };
  const share = f && f.total ? f.handled / f.total : 0;
  const ticks = f ? Math.min(f.total, 12) : 0;
  const names = (work?.data?.tasks ?? [])
    .map((t) => t.student_name?.split(" ")[0])
    .filter(Boolean)
    .slice(0, 3);
  return (
    <section className="obs-card obs-dark" aria-labelledby="obs-fu">
      <div className="obs-lbl">
        <h2 id="obs-fu">Follow-ups</h2>
        <span>After sessions</span>
      </div>
      {f ? (
        <button className="obs-gauge-wrap" onClick={onJump}>
          <svg className="obs-gauge" viewBox="-8 -4 148 96" role="img" aria-label={`${f.handled} of ${f.total} follow-ups done`}>
            <path d={arc(0, 1)} fill="none" stroke="#2c3336" strokeWidth={9} strokeLinecap="round" />
            {share > 0 ? (
              <path d={arc(0, share)} fill="none" stroke="#f4efe4" strokeWidth={9} strokeLinecap="round" />
            ) : null}
            {Array.from({ length: ticks + 1 }, (_, i) => {
              const x = ticks ? i / ticks : 0;
              return (
                <line
                  key={i}
                  x1={cx + (r + 9) * Math.cos(ang(x))}
                  y1={cy - (r + 9) * Math.sin(ang(x))}
                  x2={cx + (r + 14) * Math.cos(ang(x))}
                  y2={cy - (r + 14) * Math.sin(ang(x))}
                  stroke="rgba(255,255,255,.3)"
                  strokeWidth={1}
                />
              );
            })}
            <text x={cx - 6} y={cy - 6} textAnchor="middle" className="obs-gnum">{f.handled}</text>
            <text x={cx + 18} y={cy - 6} textAnchor="start" className="obs-gof">of {f.total}</text>
          </svg>
          <p>
            <b>{f.waiting ? `${f.waiting} left to finish` : "All caught up"}</b>
            {names.length ? names.join(", ") : null}
          </p>
        </button>
      ) : (
        <p className="obs-muted">
          {work?.state === "loading"
            ? "Checking follow-ups…"
            : work?.state === "error"
              ? "Follow-ups could not be checked."
              : "Follow-ups are not connected."}
        </p>
      )}
    </section>
  );
}

/** Sessions per day over the next seven days, today marked by treatment, not height. */
export function WeekLoad({
  agenda,
  now,
}: {
  agenda: DeskRegion<{ events?: AgendaEvent[] }>;
  now: Date;
}) {
  const days = weekLoad(timedEvents(agenda.data?.events), now);
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((a, d) => a + d.count, 0);
  return (
    <section className="obs-card obs-dark" aria-labelledby="obs-wl">
      <div className="obs-lbl">
        <h2 id="obs-wl">Week load</h2>
        <span>{agenda.state === "ready" ? `${total} event${total === 1 ? "" : "s"}` : ""}</span>
      </div>
      {agenda.state === "ready" ? (
        <>
          <div className="obs-load">
            {days.map((d) => (
              <div
                key={d.day.toISOString()}
                className={d.isToday ? "obs-bar is-today" : "obs-bar"}
                role="img"
                aria-label={`${DOW.format(d.day)}${d.isToday ? ", today" : ""}: ${d.count} event${d.count === 1 ? "" : "s"}`}
              >
                <span className="obs-v">{d.count}</span>
                <span className="obs-b" style={{ height: `${d.count ? Math.max(8, (d.count / max) * 100) : 3}%` }} />
              </div>
            ))}
          </div>
          <div className="obs-days" aria-hidden="true">
            {days.map((d) => (
              <span key={d.day.toISOString()} className={d.isToday ? "t" : undefined}>
                {d.isToday ? "Today" : DOW.format(d.day).slice(0, 1)}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="obs-muted">Calendar not loaded.</p>
      )}
    </section>
  );
}

/** Strip A, the studio ledger: each student's next session this week. */
export function SevenDayStrip({
  agenda,
  now,
  onOpen,
}: {
  agenda: DeskRegion<{ events?: AgendaEvent[] }>;
  now: Date;
  onOpen: (route: string) => void;
}) {
  const days = stripDays(timedEvents(agenda.data?.events), now);
  const students = days.reduce((a, d) => a + d.sessions.length, 0);
  const range = `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(days[0].day)} to ${days[6].day.getDate()}`;
  return (
    <section className="obs-card obs-strip" aria-labelledby="obs-strip-h">
      <header className="obs-sh">
        <h2 id="obs-strip-h" tabIndex={-1}>Next seven days</h2>
        <span>
          {range}
          {agenda.state === "ready" ? ` · ${students} student${students === 1 ? "" : "s"}` : ""}
        </span>
      </header>
      {agenda.state === "ready" ? (
        <ol className="obs-cols">
          {days.map((d) => {
            const dow = DOW.format(d.day);
            return (
              <li key={d.day.toISOString()} className={d.isToday ? "obs-col is-today" : "obs-col"}>
                <span className="obs-dn">{dow}{d.isToday ? " · Today" : ""}</span>
                <span className="obs-dd">{d.day.getDate()}</span>
                {d.sessions.length ? (
                  d.sessions.map((s) => (
                    <button
                      key={s.event.id}
                      className="obs-sess"
                      aria-label={`${dow} ${d.day.getDate()}${d.isToday ? ", today" : ""}: ${s.event.student_name ?? s.event.title}, ${clockLabel(s.start)}`}
                      onClick={() => onOpen(`/teacher/students/${encodeURIComponent(s.event.student_id!)}`)}
                    >
                      <span className="obs-nm">{(s.event.student_name ?? s.event.title).split(" ")[0]}</span>
                      <span className="obs-tm">{clockLabel(s.start)}</span>
                      <span className="obs-tick" aria-hidden="true">
                        <i style={{ left: `${dayFraction(s.start) * 100}%` }} />
                      </span>
                    </button>
                  ))
                ) : (
                  <span className="obs-free" aria-label="No sessions">·</span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="obs-muted">
          {agenda.state === "loading" ? "Checking your calendar…" : "Calendar not loaded."}
        </p>
      )}
    </section>
  );
}

/**
 * Message faces (home-v2): each unread conversation as a face with its
 * initial, the newest waiting message as a one-line preview, and the time.
 * Built from the same unread rows the inbox badge counts.
 */
export function MessageFaces({
  unread,
  onOpen,
  onRetry,
}: {
  unread: TeacherHomeModel["unread"];
  onOpen: (route: string) => void;
  onRetry?: () => void;
}) {
  return (
    <section className="obs-card obs-msgs" aria-labelledby="obs-msgs-h">
      <div className="obs-lbl obs-lbl-paper">
        <h2 id="obs-msgs-h">Messages</h2>
        <span>
          {unread.state === "ready" ? `${unread.total ?? 0} unread` : ""}
        </span>
      </div>
      {unread.state === "loading" ? (
        <p className="obs-note">Checking messages…</p>
      ) : unread.state === "error" ? (
        <p className="obs-note" role="alert">
          Messages could not be checked.{" "}
          {onRetry ? <button className="obs-textbtn" onClick={onRetry}>Retry</button> : null}
        </p>
      ) : unread.rows.length ? (
        <ul className="obs-mlist" aria-label="Unread message previews">
          {unread.rows.slice(0, 4).map((t) => (
            <li key={t.id}>
              <button className="obs-mrow" onClick={() => onOpen(t.route)}>
                <span className="obs-face" aria-hidden="true">
                  {t.initial}
                </span>
                <span className="obs-mtext">
                  <b>{t.name}</b>
                  <span className="obs-mprev">
                    {t.hasAttachments ? "Attachment · " : ""}
                    {t.snippet}
                  </span>
                </span>
                <span className="obs-mtime">{t.timeLabel}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="obs-note">
          {unread.refreshFailed ? "Nothing was unread at the last check." : "No unread conversations."}
        </p>
      )}
      {unread.refreshFailed && unread.rows.length ? (
        <p className="obs-note">Could not refresh. These are the last loaded messages.</p>
      ) : null}
      <button className="obs-textbtn" onClick={() => onOpen("/teacher/inbox")}>
        Open inbox
      </button>
    </section>
  );
}
