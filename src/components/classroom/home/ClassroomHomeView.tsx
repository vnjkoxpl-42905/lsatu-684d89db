/**
 * Classroom Home, presentational half.
 *
 * Takes a finished model and renders it. Split from the live hook so the whole
 * page can be driven with fixtures in a test, and so the only thing that can
 * put a number on this screen is the model.
 *
 * Layout follows the design handoff: the top panel, assigned work, an optional
 * message from Joshua, then the week band. Class names are all `classroom-home-*`;
 * the values live in `home.css`.
 */

import * as React from "react";
import { ArrowRight, Bell, CalendarPlus, Timer, Zap } from "lucide-react";
import { SwipeableDeleteRow } from "@/components/inbox/SwipeableDeleteRow";
import type {
  ClassroomHomeModel,
  HomeMessage,
  HomeRow,
} from "./homeModel";
import type { SectionBriefing as SectionBriefingData } from "@/lib/sectionBriefing";
import { SectionBriefing } from "./SectionBriefing";
import { markReportCardSeen } from "./reportCardSeen";
import { launchDrill } from "@/lib/drillLaunch";
import { pickContinueWork } from "./homeModel";
import { nextActionFor } from "./homeNextAction";
import QuestionFinder, { type QuestionFinderHandle } from "@/components/questionfinder/QuestionFinder";

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

/** "Thursday 7:15 pm" inside the coming week, "Thursday, Oct 9, 7:15 pm" after it. */
function nextSessionLabel(iso: string) {
  const start = new Date(iso);
  const withinWeek = start.getTime() - Date.now() < 6 * 86_400_000;
  const day = new Intl.DateTimeFormat("en-US", withinWeek
    ? { weekday: "long" }
    : { weekday: "long", month: "short", day: "numeric" }).format(start);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(start)
    .replace(/\s?AM$/, " am")
    .replace(/\s?PM$/, " pm");
  return withinWeek ? `${day} ${time}` : `${day}, ${time}`;
}

function DailyCount({ value }: { value: number }) {
  const [shown, setShown] = React.useState(value);
  React.useEffect(() => {
    const day = new Intl.DateTimeFormat("en-CA").format(new Date());
    const key = `classroom-home:test-days-animated:${day}`;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    try {
      if (reduced || window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      if (reduced) return;
    }
    let frame = 0;
    let start: number | null = null;
    setShown(0);
    const tick = (time: number) => {
      start ??= time;
      const progress = Math.min(1, (time - start) / 650);
      setShown(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong aria-label={String(value)}>{shown}</strong>;
}


export function ClassroomHomeView({
  model,
  loading,
  onOpen,
  onMarkDone,
  onClearMessage,
  completingKey,
  onRetryWork,
}: {
  model: ClassroomHomeModel;
  loading: boolean;
  onOpen: (route: string) => void;
  onMarkDone?: (key: string) => void;
  onClearMessage?: (conversationId: string) => void;
  completingKey?: string | null;
  onRetryWork?: () => void;

  /** Kept for callers; the hero no longer duplicates the sidebar's Assigned work link. */
  onSeeAllWork?: () => void;
}) {
  const finderRef = React.useRef<QuestionFinderHandle>(null);
  const continueRow = pickContinueWork(
    model.continueRow !== undefined ? (model.continueRow ? [model.continueRow] : []) : model.rows,
    model.access,
    model.isAdmin,
  );
  // The Continue card already offers this work at the top of the page; a hero
  // for the same item would list it a second time above its own row.
  const hero =
    !loading && !model.workFailed && model.hero && !(continueRow && model.hero.row.route === continueRow.route)
      ? model.hero
      : null;
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
    add(continueRow);
    model.rows.forEach(add);
    return map;
  }, [model.hero, model.rows, continueRow]);

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

  const testDate = model.daysToTest;
  const testDateLabel = testDate === 1 ? "day to test day" : "days to test day";
  const nextAction = continueRow ? nextActionFor(continueRow) : null;

  return (
    <div data-motion-group data-motion-ready={loading ? "false" : "true"} className="classroom-home">
      <div className="classroom-home-glow classroom-home-glow-a" aria-hidden="true" />
      <div className="classroom-home-glow classroom-home-glow-b" aria-hidden="true" />

      {briefing ? (
        <SectionBriefing
          briefing={briefing}
          onStart={() => onOpen(briefing.href)}
          onDismiss={() => setBriefing(null)}
        />
      ) : null}

      <section data-motion-enter data-motion-group className="classroom-home-top" aria-label="Today">
        <header className="classroom-home-masthead">
          <div className="classroom-home-masthead-text">
            <span className="classroom-home-eyebrow">
              <i className="classroom-home-eyebrow-dot" aria-hidden="true" />
              {model.dateline}
            </span>
            <h1 data-motion-item className="classroom-home-title">
              {model.greeting}
              {model.displayName ? <>, <em>{model.displayName}</em>.</> : "."}
            </h1>
            <p data-motion-item className="classroom-home-subtitle" role={model.workFailed ? "alert" : undefined}>{model.subtitle}</p>
            {model.workFailed && onRetryWork ? (
              <button type="button" className="classroom-home-work-retry" onClick={onRetryWork}>Retry assigned work</button>
            ) : model.workSummary && model.workSummary.open > 0 ? (
              <p className="classroom-home-work-summary">
                {model.workSummary.open} open {model.workSummary.open === 1 ? 'assignment' : 'assignments'}
                {' · '}{model.workSummary.inProgress} with saved work
              </p>
            ) : null}
            {!model.isAdmin && model.homeBooking.state === "booked" ? (
              <button
                type="button"
                className="classroom-home-next-session-line"
                onClick={() => handleOpen("/booking")}
              >
                Next session: {nextSessionLabel(model.homeBooking.startsAt)}
              </button>
            ) : null}
            {testDate !== null ? (
              <div className="classroom-home-stat-row">
                <div
                  className="classroom-home-stat classroom-home-test-days"
                  aria-label={`${testDate} ${testDateLabel}`}
                >
                  <DailyCount value={testDate} />
                  <span>{testDateLabel}</span>
                </div>
              </div>
            ) : null}
          </div>
          <div data-motion-item className="classroom-home-top-tools">
            <div className="classroom-home-finderbar">
              <QuestionFinder ref={finderRef} returnTo="/classroom" />
            </div>
            {continueRow && !loading && !model.workFailed ? (
              <button
                type="button"
                className="classroom-home-action classroom-home-action-continue"
                aria-label={`${nextAction?.label ?? 'Open'} assigned work`}
                onClick={() => handleOpenRow(continueRow)}
              >
                <span className="classroom-home-continue-copy">
                  <span className="classroom-home-action-top">
                    {continueRow.overdue
                      ? "OVERDUE"
                      : continueRow.dueToday
                        ? "DUE TODAY"
                        : "ASSIGNED TO YOU"}
                  </span>
                  <strong>{continueRow.title}</strong>
                  <small>{continueRow.meta}</small>
                  {nextAction ? <small>{nextAction.reason}</small> : null}
                </span>
                <span className="classroom-home-continue-label">{nextAction?.label}</span>
                <span className="classroom-home-continue-arrow">
                  <ArrowRight size={21} aria-hidden="true" />
                </span>
              </button>
            ) : null}
            <nav className="classroom-home-actions" aria-label="Practice actions">
              {model.access.drill ? (
                <>
                  <button
                    type="button"
                    className="classroom-home-action"
                    aria-label="Smart Drill"
                    onClick={() =>
                      handleOpen(
                        `/drill?${launchDrill({
                          kind: "smart-drill",
                          options: { returnTo: "/classroom" },
                        })}`,
                      )
                    }
                  >
                    <Zap size={16} aria-hidden="true" />
                    Smart Drill
                  </button>
                  <button
                    type="button"
                    className="classroom-home-action"
                    aria-label="Timed section"
                    onClick={() => handleOpen("/testing")}
                  >
                    <Timer size={16} aria-hidden="true" />
                    Timed section
                  </button>
                </>
              ) : null}
              {model.access.messages ? (
                <button
                  type="button"
                  className="classroom-home-action classroom-home-inbox-pill"
                  aria-label={`Inbox, ${model.unreadMessages} unread`}
                  onClick={() => handleOpen("/inbox")}
                >
                  <Bell size={16} aria-hidden="true" />
                  Inbox
                  {model.unreadMessages > 0 ? <span>{model.unreadMessages}</span> : null}
                </button>
              ) : null}
              {!model.isAdmin && model.homeBooking.state === "credits" ? (
                <button
                  type="button"
                  className="classroom-home-action classroom-home-booking-action"
                  onClick={() => handleOpen("/booking")}
                >
                  <CalendarPlus size={16} aria-hidden="true" />
                  Book · {model.homeBooking.creditsRemaining} left
                </button>
              ) : null}
              {!model.isAdmin && model.homeBooking.state === "payPerSession" ? (
                <button
                  type="button"
                  className="classroom-home-action classroom-home-booking-action"
                  onClick={() => {
                    if (model.homeBooking.state !== "payPerSession") return;
                    if (model.homeBooking.external) {
                      window.open(model.homeBooking.href, "_blank", "noopener,noreferrer");
                    } else {
                      handleOpen(model.homeBooking.href);
                    }
                  }}
                >
                  <CalendarPlus size={16} aria-hidden="true" />
                  Book a session
                </button>
              ) : null}
            </nav>
          </div>
        </header>
      </section>

      {hero || !(model.isAdmin && !model.rows.length) ? (
        <section data-motion-reveal className="classroom-home-card classroom-home-main-card" aria-label="Assigned work">
          <div className="classroom-home-main-content">
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
                        onClick={() => handleOpenRow(hero.row)}
                      >
                        {hero.primaryLabel}
                        <ArrowRight size={15} strokeWidth={2.2} />
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

            {/*
              A teacher has no assigned work by definition, so the card is dropped
              rather than shown empty — an "assigned to you" panel on the admin
              account only ever held verification leftovers.
            */}
            {model.isAdmin && !model.rows.length ? null : (
            <section className="classroom-home-assigned" aria-label="Assigned to you">
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
                  {model.workFailed ? "Some assigned work could not load. Retry above." : loading ? "Loading your work…" : "Nothing assigned right now."}
                </p>
              )}
            </section>
            )}
          </div>
        </section>
      ) : null}

      {model.access.messages && model.message ? (
        <section data-motion-reveal className="classroom-home-thread classroom-home-message-card" aria-label="From Joshua">
          <header className="classroom-home-rule">
            <span className="classroom-home-card-label classroom-home-card-label-muted">
              {`FROM ${model.message.from.toUpperCase()}`}
            </span>
            <i aria-hidden="true" />
            {model.unreadMessages > 0 ? (
              <span className="classroom-home-badge">{model.unreadMessages} NEW</span>
            ) : null}
          </header>
          <div className="classroom-home-stack">
            <i className="classroom-home-note classroom-home-note-back" aria-hidden="true" />
            <i className="classroom-home-note classroom-home-note-front" aria-hidden="true" />
            {onClearMessage ? (
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
        </section>
      ) : null}

      {/* ── this week ────────────────────────────────────────────────── */}
      <section data-motion-reveal className="classroom-home-week" aria-label="Next seven days">
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

            // The band still reads without schedule access; it just stops being
            // a control, rather than becoming a button onto a locked route.
            return model.access.schedule ? (
              <button
                key={day.iso}
                type="button"
                className={`classroom-home-day${tone}`}
                onClick={() => handleOpen("/schedule")}
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
