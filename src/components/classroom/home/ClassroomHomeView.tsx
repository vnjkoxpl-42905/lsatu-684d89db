/**
 * Classroom Home, presentational half.
 *
 * Takes a finished model and renders it. Split from the live hook so the whole
 * page can be driven with fixtures in a test, and so the only thing that can
 * put a number on this screen is the model.
 *
 * Layout follows the design handoff: masthead, hero, a two-column bento of
 * assigned work against the coach, then the week band. Class names are all
 * `classroom-home-*`; the values live in `home.css`.
 */

import * as React from "react";
import { ArrowRight, CalendarClock } from "lucide-react";
import { SwipeableDeleteRow } from "@/components/inbox/SwipeableDeleteRow";
import type {
  ClassroomHomeModel,
  HomeMessage,
  HomeRow,
} from "./homeModel";
import type { SectionBriefing as SectionBriefingData } from "@/lib/sectionBriefing";
import { SectionBriefing } from "./SectionBriefing";
import { markReportCardSeen } from "./reportCardSeen";
import QuestionFinder from "@/components/questionfinder/QuestionFinder";

function Pill({
  children,
  emphasis,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  emphasis?: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`classroom-home-pill${emphasis ? " classroom-home-pill-accent" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WorkRow({
  row,
  onOpen,
  onMarkDone,
  completing,
}: {
  row: HomeRow;
  onOpen: (route: string) => void;
  onMarkDone?: (key: string) => void;
  completing?: boolean;
}) {
  // The row is one button, so the "Done" control has to sit beside it rather
  // than inside it. Clearing work is a real write, so it never rides along with
  // a navigation click.
  return (
    <div className="classroom-home-row-wrap">
      <button
        type="button"
        className="classroom-home-row"
        onClick={() => onOpen(row.route)}
      >
        <span
          className={`classroom-home-dot classroom-home-dot-${row.tone}`}
          aria-hidden="true"
        />
        <span className="classroom-home-row-text">
          <span className="classroom-home-row-title">{row.title}</span>
          <span className="classroom-home-row-meta">{row.meta}</span>
        </span>
        <span
          className={`classroom-home-pill${row.emphasis ? " classroom-home-pill-accent" : ""}`}
        >
          {row.actionLabel}
        </span>
      </button>
      {row.canComplete && onMarkDone ? (
        <button
          type="button"
          className="classroom-home-done"
          disabled={completing}
          aria-label={`Mark ${row.title} as done`}
          onClick={() => onMarkDone(row.key)}
        >
          {completing ? "Saving…" : "Mark done"}
        </button>
      ) : null}
    </div>
  );
}

function MessagePreviewBody({ message }: { message: HomeMessage }) {
  return (
    <span className="classroom-home-message-body">
      <span className="classroom-home-message-head">
        <b>{message.from}</b>
        <time>{message.timeLabel}</time>
      </span>
      <span className="classroom-home-message-text">{`“${message.body}”`}</span>
    </span>
  );
}


function MessagePreviewButton({
  message,
  onOpen,
}: {
  message: HomeMessage;
  onOpen: (route: string) => void;
}) {
  return (
    <button
      type="button"
      className="classroom-home-message"
      onClick={() => onOpen(message.route)}
    >
      <i className="classroom-home-shine" aria-hidden="true" />
      <span className="classroom-home-avatar">
        {message.initial}
        {message.unread ? (
          <i className="classroom-home-avatar-dot" aria-hidden="true" />
        ) : null}
      </span>
      <MessagePreviewBody message={message} />
    </button>
  );
}


export function ClassroomHomeView({
  model,
  loading,
  onOpen,
  onSeeAllWork,
  onMarkDone,
  onClearMessage,
  completingKey,
}: {
  model: ClassroomHomeModel;
  loading: boolean;
  onOpen: (route: string) => void;
  onMarkDone?: (key: string) => void;
  onClearMessage?: (conversationId: string) => void;
  completingKey?: string | null;

  onSeeAllWork: () => void;
}) {
  const { hero } = model;
  const [briefing, setBriefing] = React.useState<SectionBriefingData | null>(null);

  /**
   * A timed section is the one kind of assigned work whose page was only ever
   * instructions. Opening it raises those instructions over Home instead of
   * navigating: the student is one Escape from where they were, and Enter is
   * the only thing that starts a clock.
   *
   * Keyed by route so the hero, the work rows, and anything else that opens by
   * route all behave the same without a second callback threaded through.
   */
  const briefingByRoute = React.useMemo(() => {
    const map = new Map<string, SectionBriefingData>();
    const add = (row?: HomeRow | null) => {
      if (row?.briefing) map.set(row.route, row.briefing);
    };
    add(model.hero?.row);
    model.rows.forEach(add);
    return map;
  }, [model.hero, model.rows]);

  const handleOpen = React.useCallback(
    (route: string) => {
      const found = briefingByRoute.get(route);
      if (found) setBriefing(found);
      else onOpen(route);
    },
    [briefingByRoute, onOpen],
  );

  /*
   * Opening a Report Card is what closes it.
   *
   * "Assigned to you" is a list of work outstanding, and a card she has read is
   * not outstanding. There is nothing for her to tick off, so the row has no
   * Done control: pressing through to the card is the whole signal, and the
   * Section Library keeps the Attempt afterwards.
   */
  const handleOpenRow = React.useCallback(
    (row: { key: string; route: string }) => {
      const report = /^report:(.+):(\d+)$/.exec(row.key);
      if (report) markReportCardSeen(report[1], Number(report[2]));
      handleOpen(row.route);
    },
    [handleOpen],
  );

  return (
    <div className="classroom-home">
      <div className="classroom-home-glow classroom-home-glow-a" aria-hidden="true" />
      <div className="classroom-home-glow classroom-home-glow-b" aria-hidden="true" />

      {briefing ? (
        <SectionBriefing
          briefing={briefing}
          onStart={() => onOpen(briefing.href)}
          onDismiss={() => setBriefing(null)}
        />
      ) : null}

      {/* ── finder bar ───────────────────────────────────────────────
          The first thing above the fold, the way LSAT Lab puts Find A Question
          at the top of its home. A student who arrives holding one question
          should not have to read a dashboard to get to it. Its own band rather
          than a masthead utility, because the masthead's right edge is status
          and this is the page's fastest route out. */}
      <div className="classroom-home-finderbar">
        <QuestionFinder returnTo="/classroom" />
      </div>

      {/* ── masthead ─────────────────────────────────────────────────── */}
      <header className="classroom-home-masthead">
        <div className="classroom-home-masthead-text">
          <span className="classroom-home-eyebrow">
            <i className="classroom-home-eyebrow-dot" aria-hidden="true" />
            {model.dateline}
          </span>
          <h1 className="classroom-home-title">
            {model.displayName
              ? `${model.greeting}, ${model.displayName}`
              : model.greeting}
          </h1>
          <p className="classroom-home-subtitle">{model.subtitle}</p>
        </div>

        {/* The masthead's right edge is where Home's utilities live. The due
            pill is status, not navigation, so it is all that belongs up here —
            the address controls moved to their own band below, where three
            dropdowns fit at full width instead of being squeezed against the
            masthead's right edge. */}
        <div className="classroom-home-masthead-tools">
          {model.dueTodayCount > 0 ? (
            <span className="classroom-home-duepill">
              <i aria-hidden="true" />
              {model.dueTodayCount === 1
                ? "1 DUE TODAY"
                : `${model.dueTodayCount} DUE TODAY`}
            </span>
          ) : null}
        </div>
      </header>

      {/* ── hero ─────────────────────────────────────────────────────── */}
      {hero ? (
        <section className="classroom-home-hero" aria-label="Pick up where you left off">
          <i className="classroom-home-sheet classroom-home-sheet-back" aria-hidden="true" />
          <i className="classroom-home-sheet classroom-home-sheet-front" aria-hidden="true" />
          <div className="classroom-home-hero-panel">
            <i className="classroom-home-hero-glow" aria-hidden="true" />
            <div className="classroom-home-hero-body">
              <div className="classroom-home-hero-main">
                <span className="classroom-home-hero-eyebrow">
                  <i aria-hidden="true" />
                  {hero.eyebrow}
                </span>
                <div className="classroom-home-hero-heading">
                  <h2>{hero.row.title}</h2>
                  <span className="classroom-home-hero-meta">
                    <span className="classroom-home-tag">{hero.kindLabel}</span>
                    {hero.meta}
                  </span>
                </div>
                {hero.prose ? (
                  <p className="classroom-home-hero-prose">{hero.prose}</p>
                ) : null}
                <div className="classroom-home-hero-actions">
                  <button
                    type="button"
                    className="classroom-home-cta"
                    onClick={() => handleOpen(hero.row.route)}
                  >
                    {hero.primaryLabel}
                    <ArrowRight size={15} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="classroom-home-ghost"
                    onClick={onSeeAllWork}
                  >
                    Open assigned work
                  </button>
                  {hero.row.canComplete && onMarkDone ? (
                    <button
                      type="button"
                      className="classroom-home-ghost"
                      disabled={completingKey === hero.row.key}
                      onClick={() => onMarkDone(hero.row.key)}
                    >
                      {completingKey === hero.row.key ? "Saving…" : "Mark done"}
                    </button>
                  ) : null}

                </div>
              </div>

              {hero.progress ? (
                <aside className="classroom-home-progress" aria-label="Progress">
                  <span className="classroom-home-progress-label">PROGRESS</span>
                  <span className="classroom-home-progress-count">
                    <b>{hero.progress.completed ?? hero.progress.total}</b>
                    <span>
                      {hero.progress.completed === null
                        ? hero.progress.unit
                        : `of ${hero.progress.total} ${hero.progress.unit}`}
                    </span>
                  </span>
                  {hero.progress.completed !== null ? (
                    <div
                      className="classroom-home-ticks"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={hero.progress.total}
                      aria-valuenow={hero.progress.completed}
                    >
                      {Array.from({ length: hero.progress.total }, (_, index) => (
                        <span
                          key={index}
                          className={
                            index < (hero.progress!.completed ?? 0)
                              ? "classroom-home-tick classroom-home-tick-done"
                              : "classroom-home-tick"
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                  {hero.progress.estimateMinutes ? (
                    <span className="classroom-home-progress-note">
                      About {hero.progress.estimateMinutes} minutes.
                    </span>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── bento ────────────────────────────────────────────────────── */}
      <div className="classroom-home-bento">
        {/*
          A teacher has no assigned work by definition, so the card is dropped
          rather than shown empty — an "assigned to you" panel on the admin
          account only ever held verification leftovers.
        */}
        {model.isAdmin && !model.rows.length ? null : (
        <section className="classroom-home-card" aria-label="Assigned to you">
          <header className="classroom-home-card-head">
            <span className="classroom-home-card-label">ASSIGNED TO YOU</span>
            {model.newCount > 0 ? (
              <span className="classroom-home-badge">
                {model.newCount} NEW
              </span>
            ) : null}
          </header>
          {model.rows.length ? (
            <div className="classroom-home-rows">
              {model.rows.map((row) => (
                <WorkRow
                  key={row.key}
                  row={row}
                  onOpen={() => handleOpenRow(row)}
                  onMarkDone={onMarkDone}
                  completing={completingKey === row.key}
                />

              ))}
            </div>
          ) : (
            <p className="classroom-home-empty">
              {loading ? "Loading your work…" : "Nothing assigned right now."}
            </p>
          )}
        </section>
        )}


        <div className="classroom-home-side">
          {model.access.messages ? (
          <section className="classroom-home-thread" aria-label="From your coach">
            <header className="classroom-home-rule">
              <span className="classroom-home-card-label classroom-home-card-label-muted">
                {model.message
                  ? `FROM ${model.message.from.toUpperCase()}`
                  : // Naming the coach is right for a student; staff reading
                    // their own classroom would be told a message is from
                    // themselves, so they get the neutral heading.
                    model.isAdmin
                    ? "MESSAGES"
                    : "FROM JOSHUA"}
              </span>
              <i aria-hidden="true" />
              {model.unreadMessages > 0 ? (
                <span className="classroom-home-badge">
                  {model.unreadMessages} NEW
                </span>
              ) : null}
            </header>

            {model.message ? (
              <div className="classroom-home-stack">
                <i className="classroom-home-note classroom-home-note-back" aria-hidden="true" />
                <i className="classroom-home-note classroom-home-note-front" aria-hidden="true" />
                {onClearMessage ? (
                  // Keyed by the message: clearing one animates the row off
                  // the page, and the next message has to arrive in a fresh
                  // row rather than inheriting that swiped-away transform.
                  <SwipeableDeleteRow
                    key={model.message.id}
                    label={`message from ${model.message.from}`}
                    rounded="rounded-xl"
                    actionLabel="Clear"
                    actionGerund="clearing"
                    onDelete={() => onClearMessage(model.message!.id)}
                  >
                    <MessagePreviewButton message={model.message} onOpen={handleOpen} />
                  </SwipeableDeleteRow>
                ) : (
                  <MessagePreviewButton message={model.message} onOpen={handleOpen} />
                )}
              </div>
            ) : (
              <p className="classroom-home-empty classroom-home-empty-boxed">
                No messages yet.
              </p>
            )}
          </section>
          ) : null}

          {model.access.activities ? (
            <section
              className="classroom-home-card classroom-home-session"
              aria-label="Read, Recall, Colour"
            >
              <span className="classroom-home-session-icon" aria-hidden="true">
                <ArrowRight size={17} strokeWidth={1.8} />
              </span>
              <span className="classroom-home-session-text">
                <span className="classroom-home-card-label classroom-home-card-label-muted">
                  READ, RECALL, COLOUR
                </span>
                <span className="classroom-home-session-value">Start a section</span>
                <span className="classroom-home-session-meta">
                  Read a full section aloud, then get it graded.
                </span>
              </span>
              <span className="classroom-home-session-actions">
                <Pill emphasis onClick={() => handleOpen("/activities/sections")}>
                  Choose a section
                </Pill>
              </span>
            </section>
          ) : null}


          <section className="classroom-home-card classroom-home-session" aria-label="Next session">
            <span className="classroom-home-session-icon" aria-hidden="true">
              <CalendarClock size={17} strokeWidth={1.8} />
            </span>
            <span className="classroom-home-session-text">
              <span className="classroom-home-card-label classroom-home-card-label-muted">
                NEXT SESSION
              </span>
              <span className="classroom-home-session-value">
                {model.session ? model.session.label : "Nothing booked"}
              </span>
              {model.session?.meta ? (
                <span className="classroom-home-session-meta">{model.session.meta}</span>
              ) : null}
              {model.booking?.detail ? (
                <span className="classroom-home-session-meta">{model.booking.detail}</span>
              ) : null}
            </span>
            <span className="classroom-home-session-actions">
              {/* No Reschedule pill: neither student-booking nor public-booking
                  exposes a reschedule action. The booking pill itself follows
                  the student's plan — credits go to the in-app picker, a
                  pay-per-session student gets their own link. */}
              <Pill
                emphasis
                onClick={() => {
                  const target = model.booking?.href ?? "/booking";
                  if (model.booking?.external) window.open(target, "_blank", "noopener,noreferrer");
                  else handleOpen(target);
                }}
              >
                {model.booking?.label ?? (model.session ? "Book another" : "Book one")}
              </Pill>
            </span>
          </section>
        </div>
      </div>

      {/* ── this week ────────────────────────────────────────────────── */}
      <section className="classroom-home-week" aria-label="Next seven days">
        <header className="classroom-home-rule">
          <span className="classroom-home-card-label">NEXT SEVEN DAYS</span>
          <i className="classroom-home-rule-draw" aria-hidden="true" />
          <span className="classroom-home-week-range">{model.weekLabel}</span>
        </header>
        <div className="classroom-home-days">
          {model.week.map((day) => {
            const tone = day.isToday
              ? " classroom-home-day-today"
              : day.label
                ? " classroom-home-day-item"
                : day.isWeekend
                  ? " classroom-home-day-rest"
                  : " classroom-home-day-open";
            const body = (
              <>
                <span className="classroom-home-day-head">
                  <span className="classroom-home-day-abbr">{day.abbr}</span>
                  <span className="classroom-home-day-num">{day.dayNum}</span>
                </span>
                <span className="classroom-home-day-label">
                  {day.label ? (
                    <>
                      <i aria-hidden="true" />
                      {day.label}
                    </>
                  ) : day.isWeekend ? (
                    "Rest"
                  ) : (
                    "Open"
                  )}
                </span>
              </>
            );

            // A day that names a piece of work opens that work. Only an empty
            // day falls back to the schedule, and only for someone who can
            // reach it — the band still reads without schedule access, it just
            // stops being a control rather than becoming a button onto a
            // locked route.
            const target = day.route ?? (model.access.schedule ? "/schedule" : null);
            return target ? (
              <button
                key={day.iso}
                type="button"
                className={`classroom-home-day${tone}`}
                aria-label={day.label ? `${day.abbr} ${day.dayNum}, open ${day.label}` : undefined}
                onClick={() => handleOpen(target)}
              >
                {body}
              </button>
            ) : (
              <div key={day.iso} className={`classroom-home-day${tone}`}>
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default ClassroomHomeView;
