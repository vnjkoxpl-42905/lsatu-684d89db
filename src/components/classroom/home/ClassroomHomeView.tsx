import { HomeDockChat } from "./HomeDockChat";
import { useSearchParams } from "react-router-dom";
import { HomePrototypeSwitcher, StudentEclipse, StudentPreviewDock } from "./StudentHomePrototype";
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
  ReloadIcon,
} from "@radix-ui/react-icons";
import type {
  ClassroomHomeModel,
  HomeHero,
  HomeRow,
} from "./homeModel";
import type { SectionBriefing as SectionBriefingData } from "@/lib/sectionBriefing";
import { SectionBriefing } from "./SectionBriefing";
import { markReportCardSeen } from "./reportCardSeen";
import { pickContinueWork } from "./homeModel";
import { nextActionFor } from "./homeNextAction";
import { useHomeFeedback } from "./useHomeFeedback";
import { HomeWeekStrip } from "./HomeWeekStrip";
import { HomeOrbitRating, HomeRatingCard, type RatingResult } from "./HomeRatingCard";
import QuestionFinder, { type QuestionFinderHandle } from "@/components/questionfinder/QuestionFinder";

/** One small line drawing per kind of work, so the list scans by shape. */
function KindGlyph({ kind }: { kind: HomeRow["kind"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "guided":
    case "ta":
      // a target: a drill aims at one skill
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="6.25" />
          <circle cx="9" cy="9" r="2.75" />
        </svg>
      );
    case "homework":
    case "practice_test":
      // a clock face: timed sections and homework sets
      return (
        <svg {...common}>
          <circle cx="9" cy="9.5" r="6" />
          <path d="M9 6.5v3l2 1.5M7.5 2h3" />
        </svg>
      );
    case "recap":
    case "note":
    case "link":
      // a page of lines: something to read
      return (
        <svg {...common}>
          <path d="M4.5 2.75h6l3 3v9.5h-9z" />
          <path d="M7 9h4.5M7 11.75h4.5" />
        </svg>
      );
    case "bootcamp":
    case "plan":
      // stacked steps: a sequence of lessons
      return (
        <svg {...common}>
          <path d="M3 14.5h4v-4h4v-4h4" />
        </svg>
      );
    default:
      // an activity: a spoken, active exercise
      return (
        <svg {...common}>
          <path d="M2.5 9h2l2-4.5 3 9 2-4.5h4" />
        </svg>
      );
  }
}

function WorkRow({
  row,
  index,
  onOpen,
  onMarkDone,
  completing,
}: {
  row: HomeRow;
  index?: number;
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
  // The model's meta reads "Kind · detail · assigned Sep 2". The docket sets
  // the kind as a small label over the title and keeps the rest as quiet
  // metadata, so the eye lands on the title first.
  const metaParts = row.meta.split(" · ");
  const kindLabel = metaParts.length > 1 ? metaParts[0] : null;
  const metaRest = metaParts.length > 1 ? metaParts.slice(1) : metaParts;
  const statusTone = row.overdue || row.dueToday
    ? "urgent"
    : row.workStatus === "in_progress"
      ? "progress"
      : "new";
  return (
    <li className="classroom-home-row-wrap" data-kind={row.kind}>
      <button
        type="button"
        className="classroom-home-row"
        onClick={() => onOpen(row.route)}
      >
        {index !== undefined ? (
          <span className="classroom-home-row-index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
        ) : null}
        <span className={`classroom-home-row-glyph classroom-home-row-glyph-${row.tone}`} aria-hidden="true">
          <KindGlyph kind={row.kind} />
        </span>
        <span className="classroom-home-row-text">
          {kindLabel ? <span className="classroom-home-row-kind">{kindLabel}</span> : null}
          <span className="classroom-home-row-title">{row.title}</span>
          <span className="classroom-home-row-meta">{metaRest.join(" · ")}</span>
        </span>
        {status ? (
          <span
            className={`classroom-home-status classroom-home-status-${statusTone}${statusTone === "urgent" ? " classroom-home-status-urgent" : ""}`}
          >
            <span className="classroom-home-status-mark" aria-hidden="true" />
            {status}
          </span>
        ) : null}
        <span className="classroom-home-pill">
          <span className="classroom-home-pill-label">{row.actionLabel}</span>
          <ArrowRightIcon aria-hidden="true" />
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
    </li>
  );
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
  previewChat,
  completingKey,
  onRetryWork,
  onRefresh,
  refreshing,
  actorId,
  permissionsResolved = !loading,
  previewRating,
}: {
  model: ClassroomHomeModel;
  previewRating?: RatingResult;
  loading: boolean;
  actorId?: string | null;
  permissionsResolved?: boolean;
  onOpen: (route: string) => void;
  onMarkDone?: (key: string) => void;
  previewChat?: React.ReactNode;
  completingKey?: string | null;
  onRetryWork?: () => void;
  /** Re-read the student's own assignments; Home has no push for them. */
  onRefresh?: () => void;
  refreshing?: boolean;

  /** Kept for callers; the hero no longer duplicates the sidebar's Assigned work link. */
  onSeeAllWork?: () => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = import.meta.env.DEV ? searchParams.get("variant") : null;
  const variant = preview === "focus" || preview === "score" || preview === "agenda" ? preview : "focus";
  const rootRef = React.useRef<HTMLDivElement>(null);
  useHomeFeedback(rootRef);
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
  const remainingNew = Math.max(0, model.newCount - ((featuredContinue ?? featuredHero?.row)?.isNew ? 1 : 0));
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

  const nextAction = featuredContinue ? nextActionFor(featuredContinue) : null;
  const featuredRow = featuredContinue ?? featuredHero?.row ?? null;
  const featuredHeroData = heroForContinue ?? featuredHero;

  const questionFinder = (
    permissionsResolved && model.access.drill ? <div className="classroom-home-finderbar">
              <QuestionFinder key={actorId ?? "guest"} ref={finderRef} enabled={permissionsResolved && model.access.drill} actorId={actorId} returnTo="/classroom" />
            </div> : null
  );
  const weekStrip = (
    <HomeWeekStrip
        days={model.week}
        range={model.weekLabel}
        onDayOpen={model.access.schedule ? () => handleOpen("/schedule") : undefined}
        emptyLabel={loading ? "Loading…" : model.workFailed ? "Unavailable" : "No items shown"}
      />
  );

  return (
    <div ref={rootRef} data-motion-skip data-role-home="student" className="classroom-home classroom-home-student" data-student-variant={variant ?? undefined}>
      {briefing ? (
        <SectionBriefing
          briefing={briefing}
          onStart={() => onOpen(briefing.href)}
          onDismiss={() => setBriefing(null)}
        />
      ) : null}

      {questionFinder && <div className="student-home-toolbar">{questionFinder}</div>}

      <section className="classroom-home-top" aria-label="Today" data-home-reveal>
        <header className="classroom-home-masthead">
          <p className="classroom-home-dateline">
            <span>{model.dateline}</span>
          </p>
          <h1 className="classroom-home-title">
            {model.greeting}
            {model.displayName ? <>, <span>{model.displayName}.</span></> : "."}
          </h1>
          <p className="classroom-home-subtitle" role={model.workFailed ? "alert" : undefined}>{model.subtitle}</p>
          {model.workFailed && onRetryWork ? (
            <button type="button" className="classroom-home-quiet-button classroom-home-work-retry" onClick={onRetryWork}>
              <ReloadIcon aria-hidden="true" />
              Retry assigned work
            </button>
          ) : null}
        </header>
        <div className="student-home-scene">
          {permissionsResolved && model.access.drill ? (
            previewRating
              ? <HomeOrbitRating result={previewRating} onOpen={handleOpen}><StudentEclipse /></HomeOrbitRating>
              : <HomeRatingCard onOpen={handleOpen}><StudentEclipse /></HomeRatingCard>
          ) : <StudentEclipse />}
        </div>
      </section>


      {variant === "agenda" && weekStrip}

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
                          <span className="classroom-home-tag">{featuredHeroData.kindLabel.toLowerCase().replace(/^./, (letter) => letter.toUpperCase())}</span>
                          {featuredHeroData.meta}
                        </>
                      ) : (
                        featuredRow.meta
                      )}
                    </p>
                    {nextAction && !featuredHeroData?.prose && !featuredContinue?.dueToday && !featuredContinue?.overdue ? <p className="classroom-home-feature-reason">{nextAction.reason}</p> : null}
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
                  {!model.workFailed && remainingNew > 0 ? (
                    <span className="classroom-home-badge">{remainingNew} new</span>
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
                    {upNext.map((row, index) => (
                      <WorkRow
                        key={row.key}
                        row={row}
                        index={index}
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
                {model.assignedWorkRoute ? (
                  <footer className="classroom-home-region-foot">
                    <button type="button" className="classroom-home-more" onClick={() => onOpen(model.assignedWorkRoute!)}>
                      View all assigned work
                      <ArrowRightIcon aria-hidden="true" />
                    </button>
                  </footer>
                ) : null}
              </section>
            </>
          )}
          {!model.workFailed && model.workSummary?.open > 0 && (
            <p className="classroom-home-work-summary">
              {model.workSummary.open} open {model.workSummary.open === 1 ? "assignment" : "assignments"}
              {" · "}{model.workSummary.inProgress} with saved work
            </p>
          )}
        </section>
      </div>
      {variant !== "agenda" && weekStrip}
      {variant && (
        <StudentPreviewDock
          onOpen={handleOpen}
          drill={permissionsResolved && Boolean(model.access.drill)}
          schedule={Boolean(model.access.schedule)}
          booking={model.isAdmin ? undefined : model.homeBooking}
          messages={model.access.messages && (
            <HomeDockChat key={actorId ?? "guest"} actorId={actorId} unread={model.unreadMessages}
              onOpen={handleOpen} preview={import.meta.env.DEV ? previewChat : undefined} />
          )}
          onSearch={() => finderRef.current?.open()}
        />
      )}
      {import.meta.env.DEV && preview && <HomePrototypeSwitcher current={variant} onChange={(next) => {
        const params = new URLSearchParams(searchParams);
        params.set("variant", next);
        setSearchParams(params, { replace: true, preventScrollReset: true });
        window.scrollTo({ top: 0 });
      }} />}
    </div>
  );
}

export default ClassroomHomeView;
