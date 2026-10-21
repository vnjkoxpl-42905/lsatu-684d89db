"use client";

import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listStandaloneDrillRuns } from "@/lib/drillRunLedger";
import { getSessionAttempts, listSessions } from "@/features/rc/api/rcProgress";
import { buildStandaloneDrillHistory, type StandaloneDrillHistoryItem } from "@/lib/standaloneDrillHistory";
import { loadDrillResumeSession } from "@/lib/drillResumeSession";
import {
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useTheme } from "@/contexts/ThemeContext";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import PracticeInsightStage from "@/components/mainhub/PracticeInsightStage";
import AnalyticsStage from "@/components/mainhub/AnalyticsStage";
import AssignedWorkPanel from "@/components/mainhub/AssignedWorkPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import QuestionJump from "@/components/questionfinder/QuestionJump";
import type { QuestionFinderHandle } from "@/components/questionfinder/QuestionFinder";
import { SectionToggle } from "@/components/drill/SectionToggle";
import { RcHubSurface } from "@/features/rc/components/RcHubSurface";
import {
  DRILL_SECTION_PARAM,
  rememberSection,
  resolveDrillSection,
  type DrillSection,
} from "@/lib/drillSection";
import { launchDrill } from "@/lib/drillLaunch";
import { cn } from "@/lib/utils";
import type { TypeDrillConfig } from "@/types/drill";
import { safeRcReturnTo } from "@/features/rc/lib/rcReturnTo";

function MainhubHero({
  section,
  drillReturnTo,
  onOpenBuilder,
}: {
  section: DrillSection;
  drillReturnTo: string;
  onOpenBuilder: () => void;
}) {
  const navigate = useNavigate();

  const startSmartDrill = React.useCallback(() => {
    navigate(`/drill?${launchDrill({
      kind: "smart-drill",
      options: { returnTo: drillReturnTo },
    })}`);
  }, [drillReturnTo, navigate]);

  if (section === "rc") {
    return (
      <section className="rc-practice-create" aria-labelledby="rc-create-title">
        <div>
          <h2 id="rc-create-title">Create an RC drill</h2>
          <p>Choose passages, timing, and when to check your answers.</p>
        </div>
        <Button type="button" onClick={onOpenBuilder}>Create RC drill <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
      </section>
    );
  }

  return (
    <Card
      data-section={section}
      className="drill-observatory-hero w-full border-0 bg-transparent p-0 shadow-none"
    >
      <div className="drill-observatory-hero-grid">
        <div className="drill-observatory-smart flex flex-col justify-center">
          <div className="flex flex-col gap-3">
            <h1>Smart Drill</h1>
            <p className="drill-observatory-ink-70 max-w-[42ch] text-sm leading-[1.6]">
              Let Smart Drill choose what would be most useful to practice next.
            </p>
          </div>
          <Button
            onClick={startSmartDrill}
            className="drill-observatory-cta drill-observatory-smart-drill-pulse mt-5 w-fit"
          >
            Smart Drill
          </Button>
        </div>

        <div className="drill-observatory-console w-full">
          <div className="flex flex-col justify-center gap-5">
            <div className="space-y-3">
              <h2 className="drill-observatory-ink-full font-semibold leading-tight tracking-[-0.025em]">
                Build the drill you need.
              </h2>
              <p className="drill-observatory-ink-70 max-w-[48ch] text-sm leading-[1.6]">
                Pick PrepTests, question types, and difficulty. See the exact set before you start.
              </p>
            </div>
            <Button
              type="button"
              onClick={onOpenBuilder}
              className="drill-observatory-console-start"
            >
              Set up an LR drill
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Launcher stage — hosts the Build a Set panel. Sitting a real section is NOT
 * here: that is the Testing Centre's job, and having both doors made the drill
 * hub the second place to do the same thing.
 */
function LauncherStage({
  section,
  drillReturnTo,
  onCancel,
}: {
  section: DrillSection;
  drillReturnTo: string;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const { manifest, isLoading, error } = useQuestionBank();

  const start = React.useCallback(
    (mode: "type-drill", config: TypeDrillConfig) => {
      navigate("/drill", { state: { mode, config, returnTo: drillReturnTo } });
    },
    [drillReturnTo, navigate],
  );

  /* RC's builder reads the passage index, not the LR question bank, so it
     returns before `useQuestionBank`'s loading gate — waiting on 5.5 MB of LR
     questions to draw a reading drill would be a spinner for nothing. */
  if (section === "rc") {
    return (
      <div className="drill-observatory-launcher relative overflow-hidden">
        <div className="relative z-10">
          <RcHubSurface embedded showHistory={false} onCancel={onCancel} />
        </div>
      </div>
    );
  }

  return (
    <div className="drill-observatory-launcher relative overflow-hidden">
      {/* QuestionPicker renders its own title and return control. */}
      <div className="relative z-10">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-14" role="status">
            <Loader2 className="drill-observatory-ink-70 h-5 w-5 animate-spin" aria-hidden />
            <p className="drill-observatory-label drill-observatory-ink-60">
              Loading questions…
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-4 py-14 text-center" role="alert">
            <p className="drill-observatory-ink-85 text-sm font-medium">{error}</p>
            <Button
              type="button"
              onClick={() => window.location.reload()}
              className="drill-observatory-console-start !w-auto px-6"
            >
              Reload the question bank
            </Button>
          </div>
        )}

        {!isLoading && !error && manifest && (
          <div className="drill-observatory-launcher-panel">
            <QuestionPicker
              manifest={manifest}
              onStartDrill={(config) => start("type-drill", config)}
              onCancel={onCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Drill hub stage. Renders inside the persistent Classroom frame.
 */
export default function AcademyMainhub({
  drillReturnTo = "/classroom",
}: {
  drillReturnTo?: string;
}) {
  const perms = useUserPermissions();
  const { user } = useAuth();
  const { setActive: setOrbitalActive } = useOrbitalActive();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const lookupParams = new URLSearchParams(location.search);
  lookupParams.delete("finder");
  lookupParams.delete("finderReturnTo");
  const lookupSearch = lookupParams.toString();
  const lookupReturnTo = safeRcReturnTo(searchParams.get("finderReturnTo"))
    ?? `${location.pathname}${lookupSearch ? `?${lookupSearch}` : ""}`;
  const questionFinderRef = React.useRef<QuestionFinderHandle>(null);
  const navigate = useNavigate();
  const viewParam = searchParams.get("view");
  const view = viewParam === "in-progress" || viewParam === "completed" || viewParam === "saved" ? viewParam : "create";
  const [runs, setRuns] = React.useState<StandaloneDrillHistoryItem[]>([]);
  const [runsLoading, setRunsLoading] = React.useState(false);
  const [runsError, setRunsError] = React.useState<string | null>(null);
  const [runsRevision, refreshRuns] = React.useReducer((value) => value + 1, 0);

  React.useEffect(() => {
    if (searchParams.get("finder") !== "open") return;
    questionFinderRef.current?.open();
    const next = new URLSearchParams(searchParams);
    next.delete("finder");
    next.delete("finderReturnTo");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  React.useEffect(() => {
    if (!user?.id || (view !== "in-progress" && view !== "completed")) {
      setRuns([]);
      return;
    }
    let active = true;
    setRunsLoading(true);
    setRunsError(null);
    void Promise.all([
      listStandaloneDrillRuns(user.id),
      listSessions(),
      view === "in-progress" ? loadDrillResumeSession(user.id, "drill::adaptive") : Promise.resolve(null),
    ]).then(async ([lr, allRc, smartDrill]) => {
      const rc = allRc.filter((session) => session.userId === user.id && !session.config.practiceTestRunId && session.config.source !== "assignment" &&
        (session.status === "completed" || session.status === "in_progress"));
      const attempts = await Promise.all(rc.map(async (session) => [session.id, await getSessionAttempts(session.id)] as const));
      return buildStandaloneDrillHistory(lr, rc, new Map(attempts), smartDrill);
    }).then(
      (loaded) => { if (active) setRuns(loaded); },
      (error: unknown) => { if (active) setRunsError(error instanceof Error ? error.message : "Drill runs could not be loaded."); },
    ).finally(() => { if (active) setRunsLoading(false); });
    return () => { active = false; };
  }, [user?.id, view, runsRevision]);

  const changeView = React.useCallback((next: "create" | "in-progress" | "completed" | "saved") => {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    params.delete("stage");
    params.delete("tab");
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  /* Which section the hub is showing. URL first, then what this browser
     remembers, then LR — see `src/lib/drillSection.ts`. Reading it from the
     URL rather than from state is what makes a refresh, a Back press, and a
     shared link all land in the same place. */
  const sectionParam = searchParams.get(DRILL_SECTION_PARAM);
  const section = React.useMemo(() => resolveDrillSection(sectionParam), [sectionParam]);

  /* A bare URL states no section, so it resolves from what this browser
     remembers — and memory MOVES. Land on /classroom/drill in LR, throw the
     switch to RC, then press Back: the bare entry re-resolves against the
     now-RC memory and Back appears to do nothing.

     So the first thing the hub does is write the resolved section into the
     URL, replacing the entry rather than pushing one. Every history entry then
     states its own section and Back is deterministic. Runs once: the guard is
     false as soon as the param exists. */
  React.useEffect(() => {
    if (sectionParam != null && sectionParam.trim() !== "") return;
    const next = new URLSearchParams(searchParams);
    next.set(DRILL_SECTION_PARAM, section);
    setSearchParams(next, { replace: true });
  }, [section, sectionParam, searchParams, setSearchParams]);

  const stageParam = searchParams.get("stage");
  const stage =
    stageParam === "analytics"
      ? "analytics"
      : stageParam === "type-drill"
      ? stageParam
      : "default";
  const isLauncherStage = stage === "type-drill";

  /* Sitting a section moved to the Testing Centre. Old links, bookmarks and
     anything a student had open land there rather than silently falling back
     to the hub's default stage with no explanation. */
  React.useEffect(() => {
    if (stageParam === "full-section") navigate("/testing", { replace: true });
  }, [stageParam, navigate]);
  /* Build a Set needs the whole canvas: its picker is a dense two-column panel
     that got its Set Summary column clipped inside the ~600px bay. */
  const isWideLauncherStage = stage === "type-drill";
  const analyticsTab = searchParams.get("tab") ?? "overview";

  const can = React.useCallback(
    (flag: PermissionFlag) => perms.loading || perms.is_admin || !!perms[flag],
    [perms],
  );
  const canOpenAnalytics = can("has_analytics_access");
  const canOpenJournal = can("has_journal_access");

  /* Throwing the switch REPLACES the query rather than merging into it: an LR
     launcher stage has no RC counterpart at the same key, so carrying `stage`
     across would land a student on a panel that does not exist for the section
     they just chose. Pushed, not replaced, so Back returns to the section they
     came from.

     The switch is unconditional. A half-built LR set is discarded without a
     prompt — Joshua's call, 2026-08-26: a flip that stops to ask is not a
     flip. */
  const changeSection = React.useCallback(
    (next: DrillSection) => {
      rememberSection(next);
      setSearchParams({ [DRILL_SECTION_PARAM]: next }, { replace: false });
    },
    [setSearchParams],
  );

  const openAnalytics = React.useCallback(
    (tab: string = "overview") => {
      setSearchParams(
        { [DRILL_SECTION_PARAM]: section, stage: "analytics", tab },
        { replace: false },
      );
    },
    [section, setSearchParams],
  );

  const setAnalyticsTab = React.useCallback(
    (tab: string) => {
      setSearchParams(
        { [DRILL_SECTION_PARAM]: section, stage: "analytics", tab },
        { replace: true },
      );
    },
    [section, setSearchParams],
  );

  const openLauncher = React.useCallback(
    (kind: "type-drill") => {
      setSearchParams({ [DRILL_SECTION_PARAM]: section, stage: kind }, { replace: false });
    },
    [section, setSearchParams],
  );

  const closeStage = React.useCallback(() => {
    setSearchParams({ [DRILL_SECTION_PARAM]: section }, { replace: true });
  }, [section, setSearchParams]);

  /* Escape leaves a stage. The stage is a room the hub opened, and every other
     room in this app closes on Escape; the return control stays the visible way
     out. Deliberately narrow about when it fires:

     - only when a stage is actually open, so it never swallows Escape on the
       plain hub,
     - never when something modal is open (the search panel, a Radix popover or
       select). Those close themselves on Escape, and closing the stage out
       from under them would take two rooms away for one keypress,
     - never out of a field the student has typed into, where Escape is the
       browser's own revert. An empty field is fine to escape from. */
  React.useEffect(() => {
    if (stage === "default") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper]')) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable === true) {
        const value = (target as HTMLInputElement).value;
        if (value != null && value !== "") return;
      }
      closeStage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeStage, stage]);

  // The analytics stage takes over the below-hero area; suppress mainhub
  // overlays (chat widget) the same way an expanded orbital node used to.
  React.useEffect(() => {
    setOrbitalActive(stage !== "default");
    return () => setOrbitalActive(false);
  }, [setOrbitalActive, stage]);

  return (
    <div data-section={section} className="drill-observatory-root @container relative h-full w-full overflow-y-auto bg-transparent px-0 py-0 pb-12">
      {/* 1140px and a 20px gap: the design's column. The three cards each carry
          26-30px of internal padding, so the gap between them stays smaller than
          their padding by design — they read as three objects on one field, not
          as one split surface. */}
      <div className="drill-observatory-canvas relative mx-auto flex w-full max-w-[71.25rem] flex-col gap-5">
        <nav aria-label="Drills" className="drill-view-tabs flex flex-wrap gap-2 border-b border-border pb-3">
          {([ ["create", "Create"], ["in-progress", "In progress"], ["completed", "Completed"], ["saved", "Saved sets"] ] as const).map(([key, label]) => (
            <Button key={key} type="button" size="sm" variant={view === key ? "default" : "ghost"} aria-current={view === key ? "page" : undefined} onClick={() => changeView(key)}>{label}</Button>
          ))}
        </nav>
        {view === "saved" ? (
          <section className="rounded-xl border border-border bg-card p-6" aria-label="Saved sets">
            <h1 className="text-xl font-semibold">Saved sets</h1>
            <p className="mt-2 text-sm text-muted-foreground">Inspect, launch, rename, or duplicate a set you saved.</p>
            <Button className="mt-5" onClick={() => navigate("/practice/drills/saved")}>Open saved sets <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
          </section>
        ) : view === "in-progress" || view === "completed" ? (
          <section className="rounded-xl border border-border bg-card p-5 sm:p-7" aria-label={view === "completed" ? "Completed drills" : "Drills in progress"}>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">{view === "completed" ? "Completed drills" : "Drills in progress"}</h1>
              <Button type="button" size="sm" variant="outline" onClick={refreshRuns}>Refresh</Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{view === "in-progress" ? "Your saved Smart Drill, custom LR, and RC drills. Assigned work stays in My Work." : "Your completed Smart Drill, custom LR, and RC drills. Assigned work stays in My Work."}</p>
            {runsLoading ? <p className="mt-6 text-sm text-muted-foreground" role="status">Loading your drills…</p> : runsError ? <p className="mt-6 text-sm text-destructive" role="alert">{runsError}</p> : (() => {
              const selected = runs.filter((run) => run.status === (view === "completed" ? "completed" : "in_progress"));
              return selected.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{view === "completed" ? "No completed drills yet." : "No drills in progress. Start a drill and save an answer to see it here."}</p> : (
                <ul className="mt-5 space-y-3">{selected.map((run) => (
                  <li key={run.key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{run.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{run.detail} · {new Date(run.date).toLocaleDateString()}</p>
                    </div>
                    {view === "completed" ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate(run.resultsTo!)}>Results</Button><Button size="sm" onClick={() => navigate(run.reviewTo!)}>Review</Button></div> : <Button size="sm" onClick={() => navigate(run.continueTo!)}>Continue</Button>}
                  </li>
                ))}</ul>
              );
            })()}
          </section>
        ) : <>
        {/* The address row rides above the hero rather than inside it: the
            route label row is decorative and aria-hidden, and the hero's two
            columns are already the page's two primary actions. It sits in the
            same place it occupies on Classroom Home — the band directly under
            the top of the surface — so it is one control in one position across
            both mounts. No access check here: the whole route is behind
            has_drill_access.

            Tone follows the theme because the row sits on the STAGE, not on a
            card, and the stage is what the theme changes: cream in light,
            near-black in dark. A hard-coded light tone inked its labels
            dark-on-black in dark theme, the mirror of the 1.07:1 ivory-on-cream
            fail it was written to fix. The section switch beside it follows the
            same stage tokens; the finder's trigger is a dark pill either way. */}
        {!isLauncherStage && <div className="drill-observatory-tools">
          <QuestionJump
            ref={questionFinderRef}
            returnTo={lookupReturnTo}
            tone={theme === "dark" ? "dark" : "light"}
            bank={section}
            withSearch={false}
          />
          {/* Search and the section switch are one cluster hard right, on the
              same line. The search trigger used to ride at the end of the
              address row, which parked it directly above the LR/RC switch and
              read as a stack of two unrelated controls. Side by side they read
              as what they are: the two utilities of this band. */}
          <div className="drill-observatory-tools-aside">
            <SectionToggle section={section} onChange={changeSection} />
          </div>
        </div>}

        {/* The hero stays mounted across section changes (its content swaps in
            place so the LR/RC switch never shows an empty frame), and leaves
            the page entirely while a stage is open. The launcher carries its
            own title and return control; keeping a 400px hero above it put "Set up an
            LR drill" on screen twice, 500px apart, and pushed the builder's
            own title below the fold. */}
        {stage === "default" && (
          <MainhubHero
            section={section}
            drillReturnTo={drillReturnTo}
            onOpenBuilder={() => openLauncher("type-drill")}
          />
        )}

        {stage === "analytics" ? (
          <section
            className="drill-observatory-analytics"
            aria-label="Analytics workspace"
            data-tour="mainhub-analytics"
          >
            <AnalyticsStage
              tab={analyticsTab}
              section={section}
              onTabChange={setAnalyticsTab}
            />
          </section>
        ) : (
          /* Drill setup takes the full workspace. Assigned work returns with the hub. */
          <section
            className={cn(
              "drill-observatory-deck grid grid-cols-1 items-start",
              !isWideLauncherStage && section !== "rc" &&
                "@[760px]:grid-cols-[minmax(0,1.2fr)_minmax(340px,1fr)]",
            )}
            data-stacked={isWideLauncherStage ? "true" : undefined}
          >
            {/* The bay itself stays mounted and only its contents change. This
                makes LR/RC a true in-place toggle, while Today remains the
                unchanged live-status sibling beside it. */}
            <section
              data-section={section}
              className="drill-observatory-practice-bay"
              aria-label={
                stage === "default" ? "Practice and insight workspace" : "Drill launcher"
              }
              data-tour={stage === "default" ? "mainhub-practice" : "mainhub-launcher"}
            >
              {isLauncherStage ? (
                <LauncherStage
                  section={section}
                  drillReturnTo={drillReturnTo}
                  onCancel={closeStage}
                />
              ) : (
                <PracticeInsightStage
                  section={section}
                  drillReturnTo={drillReturnTo}
                  onOpenAnalytics={openAnalytics}
                  onOpenLauncher={openLauncher}
                  canOpenAnalytics={canOpenAnalytics}
                  canOpenJournal={canOpenJournal}
                />
              )}
            </section>

            {!isLauncherStage && (section === "rc" ? (
              <details className="rc-practice-assigned">
                <summary>Assigned work <span>View homework from My Work</span></summary>
                <AssignedWorkPanel drillReturnTo={drillReturnTo} />
              </details>
            ) : <section className="drill-observatory-today-bay">
              <AssignedWorkPanel drillReturnTo={drillReturnTo} />
            </section>)}
          </section>
        )}
        </>}
      </div>
    </div>
  );
}
