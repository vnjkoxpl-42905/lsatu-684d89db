/**
 * Classroom Home for a student, presentational half.
 *
 * Takes a finished model and renders it. Split from the live hook so the whole
 * page can be driven with fixtures in a test, and so the only thing that can
 * put a number on this screen is the model.
 *
 * Reading order is the priority order, in the DOM and therefore for keyboard
 * and screen-reader users, at every width: a short greeting, then the ONE
 * featured next action on the ink surface and what comes after it, then the
 * practice tools and supporting context (next session, test day, a message,
 * the week). On a wide screen the second half sits in a quieter right rail;
 * on a phone it simply follows. The "Up next" list never repeats the featured
 * row. Class names are all `classroom-home-*`; the values live in `home.css`.
 */

import * as React from "react";
import {
  ArrowRightIcon,
  BellIcon,
  CalendarIcon,
  LightningBoltIcon,
  ReloadIcon,
  TimerIcon,
} from "@radix-ui/react-icons";
import { SwipeableDeleteRow } from "@/components/inbox/SwipeableDeleteRow";
import type {
  ClassroomHomeModel,
  HomeHero,
  HomeMessage,
  HomeRow,
} from "./homeModel";
import type { SectionBriefing as SectionBriefingData } from "@/lib/sectionBriefing";
import { SectionBriefing } from "./SectionBriefing";
import { markReportCardSeen } from "./reportCardSeen";
import { launchDrill } from "@/lib/drillLaunch";
import { pickContinueWork } from "./homeModel";
import { nextActionFor } from "./homeNextAction";
import { useHomeEntrance } from "./useHomeEntrance";
import { HomeWeekStrip } from "./HomeWeekStrip";
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
  // The row is one button, so the "Mark done" control sits beside it rather
  // than inside it. Clearing work is a real write, so it never rides along
  // with a navigation click.
  const status = row.overdue
    ? "Overdue"
    : row.dueToday
      ? "Due today"
      : row.workStatus === "in_progress"
        ? "In progress"
        : row.isNew
          ? "New"
          : null;
  return (
    <li className="classroom-home-row-wrap">
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
        {status ? (
          <span className={`classroom-home-status${row.overdue || row.dueToday ? " classroom-home-status-urgent" : ""}`}>
            {status}
          </span>
        ) : null}
        <span className="classroom-home-pill">{row.actionLabel}</span>
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
    </li>
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
      <span className="classroom-home-avatar" aria-hidden="true">
        {message.initial}
      </span>
      <span className="classroom-home-message-body">
        <span className="classroom-home-message-head">
          <b>{message.from}</b>
          <time>{message.timeLabel}</time>
        </span>
        <span className="classroom-home-message-text">{message.body}</span>
      </span>
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

function HeroProgress({ progress }: { progress: NonNullable<HomeHero["progress"]> }) {
  return (
    <aside className="classroom-home-progress" aria-label="Progress">
      <span className="classroom-home-progress-count">
        <b>{progress.completed ?? progress.total}</b>
        <span>
          {progress.completed === null
            ? progress.unit
            : `of ${progress.total} ${progress.unit}`}
        </span>
      </span>
      {progress.completed !== null ? (
        <div
          className="classroom-home-ticks"
          role="progressbar"
          aria-label={`${progress.completed} of ${progress.total} ${progress.unit} answered`}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.completed}
        >
          {Array.from({ length: progress.total }, (_, index) => (
            <span
              key={index}
              className={
                index < (progress.completed ?? 0)
                  ? "classroom-home-tick classroom-home-tick-done"
                  : "classroom-home-tick"
              }
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function WorkSkeleton() {
  return (
    <div className="classroom-home-skeleton" aria-busy="true" aria-label="Loading your work">
      <span className="classroom-home-skeleton-feature" aria-hidden="true" />
      {[0, 1, 2].map((index) => (
        <span key={index} className="classroom-home-skeleton-row" aria-hidden="true">
          <i />
          <span>
            <i />
            <i />
          </span>
        </span>
      ))}
    </div>
  );
}

export function ClassroomHomeView({
  model,
  loading,
  onOpen,
  onMarkDone,
  onClearMessage,
  completingKey,
  onRetryWork,
  onRefresh,
  refreshing,
}: {
  model: ClassroomHomeModel;
  loading: boolean;
  onOpen: (route: string) => void;
  onMarkDone?: (key: string) => void;
  onClearMessage?: (conversationId: string) => void;
  completingKey?: string | null;
  onRetryWork?: () => void;
  /** Re-read the student's own assignments; Home has no push for them. */
  onRefresh?: () => void;
  refreshing?: boolean;

  /** Kept for callers; the hero no longer duplicates the sidebar's Assigned work link. */
  onSeeAllWork?: () => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  useHomeEntrance(rootRef, !loading);
  const finderRef = React.useRef<QuestionFinderHandle>(null);
  const continueRow = pickContinueWork(
    model.continueRow !== undefined ? (model.continueRow ? [model.continueRow] : []) : model.rows,
    model.access,
    model.isAdmin,
  );
  const showWork = !loading && !model.workFailed;
  /*
   * One featured item. Continue (the earliest real deadline) wins; the hero is
   * shown only when there is no Continue, or when it names the same row and
   * can add its prose and progress to it. Either way the featured key is left
   * out of the list below, so no assignment is offered twice.
   */
  const featuredContinue = showWork ? continueRow : null;
  const heroForContinue =
    featuredContinue && model.hero && model.hero.row.key === featuredContinue.key ? model.hero : null;
  const featuredHero = showWork && !featuredContinue ? model.hero : null;
  const featuredKey = featuredContinue?.key ?? featuredHero?.row.key ?? null;
  const upNext = model.rows.filter((row) => row.key !== featuredKey);
  const [briefing, setBriefing] = React.useState<SectionBriefingData | null>(null);

  /**
   * A timed section is the one kind of assigned work whose page was only ever
   * instructions. Opening it raises those instructions over Home instead of
   * navigating: the student is one Escape from where they were, and Enter is
   * the only thing that starts a clock.
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

  /* Opening a Report Card is what closes it; there is nothing to tick off. */
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
  const nextAction = featuredContinue ? nextActionFor(featuredContinue) : null;
  const featuredRow = featuredContinue ?? featuredHero?.row ?? null;
  const featuredHeroData = heroForContinue ?? featuredHero;
  const booked = !model.isAdmin && model.homeBooking.state === "booked" ? model.homeBooking : null;
  const showSummary = !model.workFailed && !!model.workSummary && model.workSummary.open > 0;
  const hasContext = showSummary || !!booked || testDate !== null;

  return (
    <div ref={rootRef} data-motion-skip data-role-home="student" className="classroom-home classroom-home-student">
      {briefing ? (
        <SectionBriefing
          briefing={briefing}
          onStart={() => onOpen(briefing.href)}
          onDismiss={() => setBriefing(null)}
        />
      ) : null}

      <section className="classroom-home-top" aria-label="Today" data-home-reveal>
        <header className="classroom-home-masthead">
          <p className="classroom-home-dateline">
            <span>{model.dateline}</span>
          </p>
          <h1 className="classroom-home-title">
            {model.greeting}
            {model.displayName ? <>, <em>{model.displayName}</em>.</> : "."}
          </h1>
          <p className="classroom-home-subtitle" role={model.workFailed ? "alert" : undefined}>{model.subtitle}</p>
          {model.workFailed && onRetryWork ? (
            <button type="button" className="classroom-home-quiet-button classroom-home-work-retry" onClick={onRetryWork}>
              <ReloadIcon aria-hidden="true" />
              Retry assigned work
            </button>
          ) : null}
        </header>
      </section>

      <div className="classroom-home-grid">
        <section className="classroom-home-work" aria-label="Assigned to you" data-home-reveal>
          {loading ? (
            <WorkSkeleton />
          ) : (
            <>
              {featuredRow ? (
                <section
                  className="classroom-home-focus classroom-home-feature"
                  aria-label={featuredContinue ? "Next assignment" : "Pick up where you left off"}
                >
                  <div className="classroom-home-feature-main">
                    <span className="classroom-home-feature-eyebrow">
                      {featuredContinue
                        ? featuredContinue.overdue
                          ? "Overdue"
                          : featuredContinue.dueToday
                            ? "Due today"
                            : featuredContinue.workStatus === "in_progress"
                              ? "In progress"
                              : "Next assignment"
                        : featuredHero!.eyebrow}
                    </span>
                    <h2>{featuredRow.title}</h2>
                    <p className="classroom-home-feature-meta">
                      {featuredHeroData ? (
                        <>
                          <span className="classroom-home-tag">{featuredHeroData.kindLabel}</span>
                          {featuredHeroData.meta}
                        </>
                      ) : (
                        featuredRow.meta
                      )}
                    </p>
                    {nextAction ? <p className="classroom-home-feature-reason">{nextAction.reason}</p> : null}
                    {featuredHeroData?.prose ? (
                      <p className="classroom-home-feature-prose">{featuredHeroData.prose}</p>
                    ) : null}
                    <div className="classroom-home-focus-actions">
                      {featuredContinue ? (
                        <button
                          type="button"
                          className="classroom-home-cta"
                          aria-label={`${nextAction?.label ?? "Open"} assigned work`}
                          onClick={() => handleOpenRow(featuredContinue)}
                        >
                          {nextAction?.label ?? "Open"}
                          <ArrowRightIcon aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="classroom-home-cta"
                          onClick={() => handleOpenRow(featuredHero!.row)}
                        >
                          {featuredHero!.primaryLabel}
                          <ArrowRightIcon aria-hidden="true" />
                        </button>
                      )}
                      {featuredRow.canComplete && onMarkDone ? (
                        <button
                          type="button"
                          className="classroom-home-focus-link"
                          disabled={completingKey === featuredRow.key}
                          aria-label={`Mark ${featuredRow.title} as done`}
                          onClick={() => onMarkDone(featuredRow.key)}
                        >
                          {completingKey === featuredRow.key ? "Saving…" : "Mark done"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {featuredHeroData?.progress ? <HeroProgress progress={featuredHeroData.progress} /> : null}
                </section>
              ) : null}

              <section className="classroom-home-region classroom-home-upnext" aria-labelledby="classroom-home-upnext-title">
                <header className="classroom-home-region-head">
                  <h2 id="classroom-home-upnext-title">{featuredRow ? "Up next" : "Assigned to you"}</h2>
                  {!model.workFailed && model.newCount > 0 ? (
                    <span className="classroom-home-badge">{model.newCount} new</span>
                  ) : null}
                  {onRefresh ? (
                    <button
                      type="button"
                      className="classroom-home-quiet-button classroom-home-region-action"
                      onClick={onRefresh}
                      disabled={refreshing}
                    >
                      <ReloadIcon aria-hidden="true" />
                      {refreshing ? "Refreshing" : "Refresh"}
                    </button>
                  ) : null}
                </header>
                {upNext.length ? (
                  <ul className="classroom-home-rows">
                    {upNext.map((row) => (
                      <WorkRow
                        key={row.key}
                        row={row}
                        onOpen={() => handleOpenRow(row)}
                        onMarkDone={onMarkDone}
                        completing={completingKey === row.key}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="classroom-home-empty">
                    <p>
                      {model.workFailed
                        ? "Some assigned work could not load. Retry above."
                        : featuredRow
                          ? "Nothing else is assigned right now."
                          : "Nothing assigned right now."}
                    </p>
                    {!model.workFailed && !featuredRow && model.access.drill ? (
                      <p className="classroom-home-empty-hint">Smart Drill builds practice from your recent answers.</p>
                    ) : null}
                  </div>
                )}
              </section>
            </>
          )}
        </section>

        <aside className="classroom-home-rail" aria-label="Practice and your week">
          <section className="classroom-home-tools" aria-label="Practice tools" data-home-reveal>
            <div className="classroom-home-finderbar">
              <QuestionFinder ref={finderRef} returnTo="/classroom" />
            </div>
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
                    <LightningBoltIcon aria-hidden="true" />
                    Smart Drill
                  </button>
                  <button
                    type="button"
                    className="classroom-home-action"
                    aria-label="Timed section"
                    onClick={() => handleOpen("/testing")}
                  >
                    <TimerIcon aria-hidden="true" />
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
                  <BellIcon aria-hidden="true" />
                  Inbox
                  {model.unreadMessages > 0 ? <span className="classroom-home-count">{model.unreadMessages}</span> : null}
                </button>
              ) : null}
              {!model.isAdmin && model.homeBooking.state === "credits" ? (
                <button
                  type="button"
                  className="classroom-home-action"
                  onClick={() => handleOpen("/booking")}
                >
                  <CalendarIcon aria-hidden="true" />
                  Book · {model.homeBooking.creditsRemaining} left
                </button>
              ) : null}
              {!model.isAdmin && model.homeBooking.state === "payPerSession" ? (
                <button
                  type="button"
                  className="classroom-home-action"
                  onClick={() => {
                    if (model.homeBooking.state !== "payPerSession") return;
                    if (model.homeBooking.external) {
                      window.open(model.homeBooking.href, "_blank", "noopener,noreferrer");
                    } else {
                      handleOpen(model.homeBooking.href);
                    }
                  }}
                >
                  <CalendarIcon aria-hidden="true" />
                  Book a session
                </button>
              ) : null}
            </nav>
          </section>

          {hasContext ? (
            <ul className="classroom-home-context" aria-label="Where you stand" data-home-reveal>
              {showSummary ? (
                <li className="classroom-home-work-summary">
                  {model.workSummary!.open} open {model.workSummary!.open === 1 ? 'assignment' : 'assignments'}
                  {' · '}{model.workSummary!.inProgress} with saved work
                </li>
              ) : null}
              {booked ? (
                <li>
                  <button
                    type="button"
                    className="classroom-home-next-session-line"
                    onClick={() => handleOpen("/booking")}
                  >
                    <CalendarIcon aria-hidden="true" />
                    Next session: {nextSessionLabel(booked.startsAt)}
                  </button>
                </li>
              ) : null}
              {testDate !== null ? (
                <li className="classroom-home-test-days" aria-label={`${testDate} ${testDateLabel}`}>
                  <strong>{testDate}</strong>
                  <span>{testDateLabel}</span>
                </li>
              ) : null}
            </ul>
          ) : null}

          {model.access.messages && model.message ? (
            <section className="classroom-home-region classroom-home-message-card" aria-label="From Joshua" data-home-reveal>
              <header className="classroom-home-region-head">
                <h2>{`From ${model.message.from}`}</h2>
                {model.unreadMessages > 0 ? (
                  <span className="classroom-home-badge">{model.unreadMessages} unread</span>
                ) : null}
              </header>
              {onClearMessage ? (
                <SwipeableDeleteRow
                  key={model.message.id}
                  label={`message from ${model.message.from}`}
                  rounded="rounded-lg"
                  actionLabel="Clear"
                  actionGerund="clearing"
                  onDelete={() => onClearMessage(model.message!.id)}
                >
                  <MessagePreviewButton message={model.message} onOpen={handleOpen} />
                </SwipeableDeleteRow>
              ) : (
                <MessagePreviewButton message={model.message} onOpen={handleOpen} />
              )}
            </section>
          ) : null}


        </aside>
      </div>
      <HomeWeekStrip
        days={model.week}
        range={model.weekLabel}
        onDayOpen={model.access.schedule ? () => handleOpen("/schedule") : undefined}
        emptyLabel={loading ? "Loading…" : model.workFailed ? "Unavailable" : "No items shown"}
      />
    </div>
  );
}

export default ClassroomHomeView;
