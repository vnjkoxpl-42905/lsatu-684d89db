"use client";

import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { listStandaloneDrillRuns } from "@/lib/drillRunLedger";
import { abandonSession, getSessionAttempts, listSessions } from "@/features/rc/api/rcProgress";
import { loadAllIndexPassages } from "@/features/rc/lib/rcBank";
import { buildStandaloneDrillHistory, RC_TAKE_LABELS, type StandaloneDrillHistoryItem } from "@/lib/standaloneDrillHistory";
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
import { RcSavedSetsPanel } from "@/features/rc/components/RcSavedSetsPanel";
import { RcPracticeLanding, RcPracticeResume } from "@/features/rc/components/RcPracticeLanding";
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

  return (
    <Card
      data-section={section}
      data-motion-enter data-motion-group className="drill-observatory-hero w-full border-0 bg-transparent p-0 shadow-none"
    >
      <div className="drill-observatory-hero-grid">
        <div className="drill-observatory-smart flex flex-col justify-center">
          <div className="flex flex-col gap-3">
            <h1 data-motion-item>Smart Drill</h1>
            <p data-motion-item className="drill-observatory-ink-70 max-w-[42ch] text-sm leading-[1.6]">
              Let Smart Drill choose what would be most useful to practice next.
            </p>
          </div>
          <Button data-motion-item
            onClick={startSmartDrill}
            className="drill-observatory-cta drill-observatory-smart-drill-pulse mt-5 w-fit"
          >
            Smart Drill
          </Button>
        </div>

        <div data-motion-item className="drill-observatory-console w-full">
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

  /* AcademyMainhub routes RC directly before mounting LauncherStage. This
     compatibility branch is retained for other callers. RC reads the passage
     index, not the LR question bank, so it
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
  const cleanedPractice = `${location.pathname}${lookupSearch ? `?${lookupSearch}` : ""}`;
  const sanitizeOrigin = (value: string | null) => {
    const safe = safeRcReturnTo(value);
    if (!safe) return cleanedPractice;
    const parsed = new URL(safe, window.location.origin);
    parsed.searchParams.delete("finder");
    parsed.searchParams.delete("finderReturnTo");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  };
  const [finderLaunch, setFinderLaunch] = React.useState<{ origin: string; seed: "LR" | "RC"; kind: "url"; actor: string | null } | null>(null);
  const acknowledgedFinder = React.useRef<string | null>(null);
  const lookupReturnTo = finderLaunch?.origin ?? cleanedPractice;
  const finderEnabled = !perms.loading && (perms.is_admin || !!perms.has_drill_access);
  const questionFinderRef = React.useRef<QuestionFinderHandle>(null);
  const navigate = useNavigate();
  const viewParam = searchParams.get("view");
  const view = viewParam === "in-progress" || viewParam === "completed" || viewParam === "saved" ? viewParam : "create";
  const [runs, setRuns] = React.useState<StandaloneDrillHistoryItem[]>([]);
  const [runsOwner, setRunsOwner] = React.useState<string | null>(null);
  const [runsLoadedKey, setRunsLoadedKey] = React.useState<string | null>(null);
  const [runsLoading, setRunsLoading] = React.useState(false);
  const [runsError, setRunsError] = React.useState<string | null>(null);
  const [runsRevision, refreshRuns] = React.useReducer((value) => value + 1, 0);
  const [rcTimingFilter, setRcTimingFilter] = React.useState<'any' | 'timed' | 'untimed' | 'unknown'>('any');
  const [rcTakeFilter, setRcTakeFilter] = React.useState<'any' | 'first-recorded' | 'repeat' | 'mixed' | 'unknown'>('any');
  const [discardingKey, setDiscardingKey] = React.useState<string | null>(null);
  const [discardBusy, setDiscardBusy] = React.useState(false);
  const [discardError, setDiscardError] = React.useState<string | null>(null);
  const discardRun = async (sessionId: string) => {
    if (discardBusy) return;
    setDiscardBusy(true);
    setDiscardError(null);
    try {
      await abandonSession(sessionId);
      setDiscardingKey(null);
      refreshRuns();
    } catch (error) {
      setDiscardError(error instanceof Error ? error.message : "The drill could not be discarded.");
    } finally {
      setDiscardBusy(false);
    }
  };

  const sectionParam = searchParams.get(DRILL_SECTION_PARAM);
  const section = React.useMemo(() => resolveDrillSection(sectionParam), [sectionParam]);
  React.useEffect(() => {
    if (searchParams.get("finder") !== "open" || !finderEnabled || acknowledgedFinder.current === location.key) return;
    const seed = section === "rc" ? "RC" : "LR";
    const origin = sanitizeOrigin(searchParams.get("finderReturnTo"));
    const launch = { origin, seed, kind: "url" as const, actor: user?.id ?? null };
    setFinderLaunch(launch);
    if (!questionFinderRef.current?.open({ bank: seed, returnTo: origin, replacePreview: true })) return;
    acknowledgedFinder.current = location.key;
    const next = new URLSearchParams(searchParams);
    next.delete("finder");
    next.delete("finderReturnTo");
    if (!next.get(DRILL_SECTION_PARAM)) next.set(DRILL_SECTION_PARAM, section);
    setSearchParams(next, { replace: true });
  }, [searchParams, finderEnabled, location.key, section, user?.id, setSearchParams]);
  React.useEffect(() => { setFinderLaunch(null); }, [user?.id]);
  const finishFinder = () => {
    const launch = finderLaunch;
    setFinderLaunch(null);
    if (launch?.kind === "url" && launch.actor === (user?.id ?? null)) navigate(launch.origin, { replace: true });
  };
  const rcBuilderRequested = searchParams.has('builder') || searchParams.get('stage') === 'type-drill'
    || ['saved', 'passages', 'count', 'timing', 'secondsPerPassage', 'reveal', 'start', 'assignment', 'assignmentId', 'ptRun', 'ptLeg', 'timedSection'].some(key => searchParams.has(key));
  const isRcLanding = section === 'rc' && view === 'create' && !rcBuilderRequested;
  const runsRequestKey = JSON.stringify([user?.id ?? null, section, view, runsRevision, rcBuilderRequested]);

  React.useEffect(() => {
    if (!user?.id || (view !== "in-progress" && view !== "completed" && !(section === "rc" && view === "create" && !rcBuilderRequested))) {
      setRuns([]);
      setRunsLoadedKey(null);
      return;
    }
    let active = true;
    setRunsLoading(true);
    setRunsError(null);
    if (isRcLanding) {
      // A resume row needs only the latest eligible RC sitting. LR history and
      // attempts from other sittings must not delay or block this entry point.
      void Promise.all([listSessions(), loadAllIndexPassages().catch(() => [])]).then(async ([allRc, indexPassages]) => {
        const recent = allRc.filter(session => session.userId === user.id && session.status === 'in_progress'
          && !session.config.practiceTestRunId && !session.config.timedSectionSittingId && session.config.source !== 'assignment')
          .sort((a, b) => (b.config.lastActiveAt ?? b.startedAt).localeCompare(a.config.lastActiveAt ?? a.startedAt))[0];
        if (!recent) return [];
        const attempts = await getSessionAttempts(recent.id).catch(() => null);
        const names = new Map(indexPassages.map(p => [p.passageId, { preptest: p.preptest, section: p.section, setNumber: p.setNumber, title: p.title }] as const));
        const loaded = buildStandaloneDrillHistory([], [recent], new Map(attempts ? [[recent.id, attempts]] : []), null, names);
        return attempts ? loaded : loaded.map(run => ({ ...run, detail: 'Saved answers could not be checked. Resume to continue.' }));
      }).then(
        loaded => { if (active) setRuns(loaded); },
        error => { if (active) setRunsError(error instanceof Error ? error.message : 'Your RC drill could not be loaded.'); },
      ).finally(() => { if (active) { setRunsLoading(false); setRunsOwner(user.id); setRunsLoadedKey(runsRequestKey); } });
      return () => { active = false; };
    }
    void Promise.all([
      listStandaloneDrillRuns(user.id),
      listSessions(),
      view === "in-progress" ? loadDrillResumeSession(user.id, "drill::adaptive") : Promise.resolve(null),
      // Titles are a nicety: if the index is unavailable the cards keep their generic names.
      loadAllIndexPassages().catch(() => []),
    ]).then(async ([lr, allRc, smartDrill, indexPassages]) => {
      const rc = allRc.filter((session) => session.userId === user.id && !session.config.practiceTestRunId && !session.config.timedSectionSittingId && session.config.source !== "assignment" &&
        (session.status === "completed" || session.status === "in_progress"));
      const ownedRc = allRc.filter(session => session.userId === user.id);
      const attempts = await Promise.all(ownedRc.map(async (session) => [session.id, await getSessionAttempts(session.id)] as const));
      const names = new Map(indexPassages.map((p) => [p.passageId, { preptest: p.preptest, section: p.section, setNumber: p.setNumber, title: p.title }] as const));
      return buildStandaloneDrillHistory(lr, rc, new Map(attempts), smartDrill, names, ownedRc);
    }).then(
      (loaded) => { if (active) setRuns(loaded); },
      (error: unknown) => { if (active) setRunsError(error instanceof Error ? error.message : "Drill runs could not be loaded."); },
    ).finally(() => { if (active) { setRunsLoading(false); setRunsOwner(user.id); } });
    return () => { active = false; };
  }, [user?.id, view, runsRevision, section, rcBuilderRequested, isRcLanding, runsRequestKey]);

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


  /* A bare URL states no section, so it resolves from what this browser
     remembers — and memory MOVES. Land on /classroom/drill in LR, throw the
     switch to RC, then press Back: the bare entry re-resolves against the
     now-RC memory and Back appears to do nothing.

     So the first thing the hub does is write the resolved section into the
     URL, replacing the entry rather than pushing one. Every history entry then
     states its own section and Back is deterministic. Runs once: the guard is
     false as soon as the param exists. */
  React.useEffect(() => {
    if (searchParams.get("finder") === "open" || (sectionParam != null && sectionParam.trim() !== "")) return;
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

  // Existing RC builder links resolve to the same Create destination. Preserve
  // passage/timing/return parameters while removing the obsolete launcher stage.
  React.useEffect(() => {
    if (section !== "rc" || view !== "create" || stageParam !== "type-drill") return;
    const next = new URLSearchParams(searchParams);
    next.delete("stage");
    if (!next.has("builder")) next.set("builder", next.has("passages") ? "manual" : "automatic");
    next.set("view", "create");
    setSearchParams(next, { replace: true });
  }, [section, view, stageParam, searchParams, setSearchParams]);

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
      setSearchParams({ [DRILL_SECTION_PARAM]: next, ...(view !== "create" ? { view } : {}) }, { replace: false });
    },
    [setSearchParams, view],
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

  const openRcBuilder = (mode: 'automatic' | 'manual') => {
    setSearchParams({ section: 'rc', view: 'create', builder: mode }, { replace: false, state: { fromRcLanding: true } });
  };

  const closeRcBuilder = () => {
    if (location.state?.fromRcLanding === true) navigate(-1);
    else setSearchParams({ section: 'rc', view: 'create' }, { replace: true });
  };


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
    <div data-section={section} className={cn("drill-observatory-root @container relative h-full w-full overflow-y-auto bg-transparent px-0 py-0 pb-12", section === "rc" && "rc-practice-workspace")}>
      {/* 1140px and a 20px gap: the design's column. The three cards each carry
          26-30px of internal padding, so the gap between them stays smaller than
          their padding by design — they read as three objects on one field, not
          as one split surface. */}
      <div className="drill-observatory-canvas relative mx-auto flex w-full max-w-[71.25rem] flex-col gap-5">
        <nav data-motion-skip aria-label="Drills" className="drill-view-tabs flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="drill-destination-tabs flex flex-wrap gap-2">
          {([ ["create", "Create"], ["in-progress", "In progress"], ["completed", "Completed"], ["saved", "Saved sets"] ] as const).map(([key, label]) => (
            <Button key={key} type="button" size="sm" variant={view === key ? "default" : "ghost"} aria-current={view === key ? "page" : undefined} onClick={() => changeView(key)}>{label}</Button>
          ))}
          </div>
          {!(section === "lr" && view === "create" && isLauncherStage) && <SectionToggle section={section} onChange={changeSection} />}
        </nav>
        <div data-motion-enter className="drill-observatory-tools">
          <QuestionJump key={user?.id ?? "guest"} ref={questionFinderRef} enabled={finderEnabled} actorId={user?.id} returnTo={lookupReturnTo} tone={theme === "dark" ? "dark" : "light"} bank={section} withSearch={false} triggerLabel="Find a question" onDismiss={finishFinder} onPreviewClose={finishFinder} />
          {searchParams.get("finder") === "open" && !perms.loading && !finderEnabled && <p role="alert">Question finder requires access to Drills.</p>}
        </div>
        {view === "saved" ? (section === "rc" ? (
          <section data-motion-enter className="rc-page rc-embedded rc-saved-workspace" aria-label="Saved RC drills">
            <h1>Saved RC drills</h1>
            <RcSavedSetsPanel />
          </section>
        ) : (
          <section data-motion-enter className="drill-history-workspace rounded-xl border border-border bg-card p-6" aria-label="Saved sets">
            <h1 className="text-xl font-semibold">Saved LR sets</h1>
            <p className="mt-2 text-sm text-muted-foreground">Reusable saved sets support Logical Reasoning. Find your RC drills in In progress or Completed.</p>
            <Button className="mt-5" onClick={() => navigate("/practice/drills/saved")}>Open saved LR sets <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
          </section>
        )) : view === "in-progress" || view === "completed" ? (
          <section data-motion-enter className="drill-history-workspace rounded-xl border border-border bg-card p-5 sm:p-7" aria-label={view === "completed" ? "Completed drills" : "Drills in progress"}>
            <div data-motion-item className="flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">{view === "completed" ? "Completed drills" : "Drills in progress"}</h1>
              <Button type="button" size="sm" variant="outline" onClick={refreshRuns}>Refresh</Button>
            </div>
            <p data-motion-item className="mt-2 text-sm text-muted-foreground">{section === "rc" ? "Your Reading Comprehension drills." : "Your Smart Drill and Logical Reasoning drills."}</p>
            {section === 'rc' && <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <label>Timing <select aria-label="Filter RC history by timing" className="ml-2 rounded border bg-background p-2" value={rcTimingFilter} onChange={event => setRcTimingFilter(event.target.value as typeof rcTimingFilter)}><option value="any">Any timing</option><option value="timed">Timed</option><option value="untimed">Untimed</option><option value="unknown">Timing unknown</option></select></label>
              <label>Take history <select aria-label="Filter RC history by exposure" className="ml-2 rounded border bg-background p-2" value={rcTakeFilter} onChange={event => setRcTakeFilter(event.target.value as typeof rcTakeFilter)}><option value="any">Any take history</option><option value="first-recorded">No recorded exposure at start</option><option value="repeat">Repeated passages</option><option value="mixed">Some passages repeated</option><option value="unknown">Exposure before take unknown</option></select></label>
              <p className="w-full text-muted-foreground">Earlier previews were not tracked. Missing exposure information stays Unknown; it does not mean fresh.</p>
            </div>}
            {discardError && <p className="mt-3 text-sm text-destructive" role="alert">{discardError}</p>}
            {runsLoading || runsOwner !== user?.id ? <p className="mt-6 text-sm text-muted-foreground" role="status">Loading your drills…</p> : runsError ? <p className="mt-6 text-sm text-destructive" role="alert">{runsError}</p> : (() => {
              const selected = runs.filter((run) => run.section === section && run.status === (view === "completed" ? "completed" : "in_progress")
                && (section !== 'rc' || (rcTimingFilter === 'any' || (run.rcTiming ?? 'unknown') === rcTimingFilter)
                  && (rcTakeFilter === 'any' || (run.rcTake ?? 'unknown') === rcTakeFilter)));
              return selected.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">{view === "completed" ? "No completed drills yet." : "No drills in progress. Start a drill to see it here."}</p> : (
                <ul data-motion-item data-motion-id="drill-history-results" className="mt-5 space-y-3">{selected.map((run) => (
                  <li key={run.key} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="min-w-0">
                      <p className="font-medium">{run.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{run.detail} · {new Date(run.date).toLocaleDateString()}</p>
                      {run.section === 'rc' && <p className="mt-1 text-sm text-muted-foreground">{run.rcTiming === 'timed' ? 'Timed' : run.rcTiming === 'untimed' ? 'Untimed' : 'Timing unknown'} · {RC_TAKE_LABELS[run.rcTake ?? 'unknown']}{run.rcExcluded ? ' · Excluded from analytics' : ''}</p>}
                    </div>
                    {view === "completed" ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate(run.resultsTo!)}>Results</Button><Button size="sm" onClick={() => navigate(run.reviewTo!)}>Review</Button></div> : <div className="flex flex-wrap items-center gap-2">{run.discardId && discardingKey === run.key ? <><span className="text-sm text-muted-foreground">Discard this drill?</span><Button size="sm" variant="destructive" disabled={discardBusy} onClick={() => void discardRun(run.discardId!)}>{discardBusy ? "Discarding…" : "Confirm discard"}</Button><Button size="sm" variant="outline" disabled={discardBusy} onClick={() => { setDiscardingKey(null); setDiscardError(null); }}>Keep it</Button></> : <>{run.discardId && <Button size="sm" variant="outline" onClick={() => { setDiscardError(null); setDiscardingKey(run.key); }}>Discard</Button>}<Button size="sm" onClick={() => navigate(run.continueTo!)}>Continue</Button></>}</div>}
                  </li>
                ))}</ul>
              );
            })()}
          </section>
        ) : section === "rc" && stage !== "analytics" ? <>
          {rcBuilderRequested ? <section data-motion-enter className="rc-create-workspace rounded-xl border border-border bg-card p-5 sm:p-7" aria-label="RC drill setup">
            <button type="button" className="rc-practice-back" onClick={closeRcBuilder}>Back to RC practice</button>
            <RcHubSurface embedded showHistory={false} openPickerOnEntry={searchParams.get('builder') === 'manual'} />
          </section> : <RcPracticeLanding
            onChooseAutomatic={() => openRcBuilder('automatic')}
            onChooseManual={() => openRcBuilder('manual')}
            practice={<>
              {!user ? <p className="rc-practice-note">Sign in to see your RC drills.</p>
                : runsLoading || runsOwner !== user.id || runsLoadedKey !== runsRequestKey ? <p className="rc-practice-note" role="status">Loading your RC drills…</p>
                : runsError ? <div role="alert"><p>{runsError}</p><button type="button" className="rc-practice-link" onClick={refreshRuns}>Retry RC drills</button></div>
                : (() => {
                  const recent = runs.find(run => run.section === 'rc' && run.status === 'in_progress');
                  return recent ? <RcPracticeResume title={recent.title} detail={recent.detail} onResume={() => recent.continueTo && navigate(recent.continueTo)} />
                    : <p className="rc-practice-note">No RC drill in progress. Build a drill above or view your completed drills.</p>;
                })()}
              <button type="button" className="rc-practice-link" onClick={() => changeView('completed')}>View completed RC drills <span aria-hidden="true">→</span></button>
            </>}
            assigned={<AssignedWorkPanel drillReturnTo={drillReturnTo} scope="rc" />}
          />}
        </> : <>
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
              data-motion-enter className="drill-observatory-practice-bay"
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
