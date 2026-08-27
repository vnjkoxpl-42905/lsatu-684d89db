"use client";

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import PracticeInsightStage from "@/components/mainhub/PracticeInsightStage";
import RcPracticeStage from "@/components/mainhub/RcPracticeStage";
import AnalyticsStage from "@/components/mainhub/AnalyticsStage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import TodayFocusPanel from "@/components/mainhub/TodayFocusPanel";
import { SectionSelector } from "@/components/drill/SectionSelector";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import QuestionJump from "@/components/questionfinder/QuestionJump";
import { SectionToggle } from "@/components/drill/SectionToggle";
import { RcHubSurface } from "@/features/rc/components/RcHubSurface";
import {
  DRILL_SECTION_LABELS,
  DRILL_SECTION_PARAM,
  rememberSection,
  resolveDrillSection,
  type DrillSection,
} from "@/lib/drillSection";
import { cn } from "@/lib/utils";
import type { FullSectionConfig, TypeDrillConfig } from "@/types/drill";

/**
 * The greeting name, resolved once per mount: profiles.display_name, falling
 * back to metadata then email. Lifted out of the hero because the hero
 * remounts on every section flip, and re-querying profiles to redraw the same
 * name would be a database round trip per toggle.
 */
function useGreetingName() {
  const { user } = useAuth();
  const [profileDisplayName, setProfileDisplayName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("class_id", user.id)
        .maybeSingle();
      if (!cancelled) setProfileDisplayName(data?.display_name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return React.useMemo(() => {
    const raw =
      profileDisplayName ||
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "";
    const name = raw.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, "");
    return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
  }, [profileDisplayName, user]);
}

function MainhubHero({
  section,
  firstName,
  drillReturnTo,
  onOpenBuilder,
  onStartSmartRc,
}: {
  section: DrillSection;
  firstName: string;
  drillReturnTo: string;
  onOpenBuilder: () => void;
  onStartSmartRc: () => void;
}) {
  const navigate = useNavigate();

  const todayLabel = React.useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const startSmartDrill = React.useCallback(() => {
    navigate("/drill", { state: { mode: "adaptive", returnTo: drillReturnTo } });
  }, [drillReturnTo, navigate]);

  return (
    /* Surface, scrim and grid live in .drill-observatory-hero / -hero-grid: the
       horizon image needs image-set() and a two-layer scrim pseudo-element,
       neither of which belongs in a className. */
    <Card
      data-section={section}
      className="drill-observatory-hero drill-observatory-section-flip-face w-full border-0 bg-transparent p-0 shadow-none"
    >
      {/* Says which section you are in. Decoration — the switch that CHANGES
          it is the one in the tools row, which is a real control. */}
      <div className="drill-observatory-route-label" aria-hidden>
        <span>{DRILL_SECTION_LABELS[section].route}</span>
      </div>

      <div className="drill-observatory-hero-grid">
        <div className="drill-observatory-greeting flex flex-col justify-end">
          <div className="flex flex-col gap-[9px]">
            <p className="drill-observatory-label drill-observatory-ink-50">
              {todayLabel}
            </p>
            {/* Size, face and the italic on the name come from
                .drill-observatory-greeting h2 — the CSS rule outranks utilities
                here, so putting them in className would be dead code. */}
            <h2>
              {firstName ? (
                <>
                  Welcome back, <em>{firstName}</em>
                </>
              ) : (
                "Welcome back"
              )}
            </h2>
            <p className="drill-observatory-ink-62 text-sm leading-[1.55]">
              {section === "rc"
                ? "Pick up where you left off, or build a set of passages around exactly what you want to read."
                : "Pick up where you left off, or build a drill around exactly what you want to practice."}
            </p>
          </div>
          <Button
            onClick={section === "rc" ? onStartSmartRc : startSmartDrill}
            className="drill-observatory-cta mt-5 w-fit"
          >
            {section === "rc" ? "Start Smart Reading Drill" : "Start Smart Drill"}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </Button>
        </div>

        <div className="drill-observatory-console w-full">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-3">
              <h3 className="text-[clamp(1.35rem,3cqi,2rem)] font-semibold leading-tight tracking-[-0.025em] text-[#f4f1ea]">
                {section === "rc" ? "Build the reading set you need." : "Build the drill you need."}
              </h3>
              <p className="drill-observatory-ink-62 max-w-[48ch] text-sm leading-[1.6]">
                {section === "rc"
                  ? "Choose PrepTests, topics, formats, frameworks, and difficulty independently. Hand-pick the exact passages, or let the set fill itself."
                  : "Choose PrepTests, question types, reasoning, features, and levels independently. Preview the exact set before you start."}
              </p>
            </div>
            <Button
              type="button"
              onClick={onOpenBuilder}
              className="drill-observatory-console-start"
            >
              {section === "rc" ? "Set up an RC drill" : "Set up an LR drill"}
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Launcher stage — hosts the Full Section and Build a Set panels that used to
 * live on the now-removed /practice hub. Rendered in the drill hub's dark
 * surface so it reads as a sibling of the hero rather than a light overlay.
 */
function LauncherStage({
  kind,
  section,
  drillReturnTo,
  onCancel,
}: {
  kind: "full-section" | "type-drill";
  section: DrillSection;
  drillReturnTo: string;
  onCancel: () => void;
}) {
  const navigate = useNavigate();
  const { manifest, isLoading, error } = useQuestionBank();

  const start = React.useCallback(
    (mode: "full-section" | "type-drill", config: FullSectionConfig | TypeDrillConfig) => {
      navigate("/drill", { state: { mode, config, returnTo: drillReturnTo } });
    },
    [drillReturnTo, navigate],
  );

  /* RC's builder reads the passage index, not the LR question bank, so it
     returns before `useQuestionBank`'s loading gate — waiting on 5.5 MB of LR
     questions to draw a reading drill would be a spinner for nothing. RC's
     Full Section still goes through SectionSelector below, which needs the
     manifest for its shared shell. */
  if (section === "rc" && kind === "type-drill") {
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
      {/* No header here on purpose: SectionSelector and QuestionPicker each
          render their own title and Cancel control, so adding one would show
          the student two titles and two Cancel buttons. */}
      <div className="relative z-10">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <Loader2 className="h-5 w-5 animate-spin text-white/50" aria-hidden />
            <p className="drill-observatory-label drill-observatory-ink-45">
              Loading questions…
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="py-14 text-center text-sm font-medium text-white/60">{error}</div>
        )}

        {!isLoading && !error && manifest && (
          <div className="drill-observatory-launcher-panel">
            {kind === "full-section" ? (
              <SectionSelector
                manifest={manifest}
                initialKind={section}
                onStartSection={(config) => start("full-section", config)}
                // An RC section is the four published passages of one real
                // section, run by the RC player rather than the LR runner, so
                // it starts through the hub's own link contract instead of
                // /drill's router state.
                onStartRcSection={(href) => navigate(href)}
                onCancel={onCancel}
              />
            ) : (
              <QuestionPicker
                manifest={manifest}
                onStartDrill={(config) => start("type-drill", config)}
                onCancel={onCancel}
              />
            )}
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
  const { setActive: setOrbitalActive } = useOrbitalActive();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstName = useGreetingName();

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
      : stageParam === "full-section" || stageParam === "type-drill"
      ? stageParam
      : "default";
  const isLauncherStage = stage === "full-section" || stage === "type-drill";
  /* Only Build a Set needs the whole canvas. Its picker is a dense two-column
     panel that got its Set Summary column clipped inside the ~600px bay.
     Full Section is a single centred form capped at max-w-2xl — giving it the
     full width would only add dead space and push Today off-screen, so it
     stays beside Today where both are in sight. */
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
    (kind: "full-section" | "type-drill") => {
      setSearchParams({ [DRILL_SECTION_PARAM]: section, stage: kind }, { replace: false });
    },
    [section, setSearchParams],
  );

  const closeStage = React.useCallback(() => {
    setSearchParams({ [DRILL_SECTION_PARAM]: section }, { replace: true });
  }, [section, setSearchParams]);

  /* Smart Reading Drill: one passage, untimed, answers after each passage —
     RcHubSurface's own defaults, spelled in the URL so the builder mounts,
     applies them, and starts itself. The student sees the builder for the
     moment the passage index is loading and then lands in the drill; they
     never have to press Start a second time. */
  const startSmartRc = React.useCallback(() => {
    rememberSection("rc");
    setSearchParams(
      {
        [DRILL_SECTION_PARAM]: "rc",
        stage: "type-drill",
        count: "1",
        timing: "untimed",
        reveal: "per_passage",
        start: "1",
      },
      { replace: false },
    );
  }, [setSearchParams]);

  // The analytics stage takes over the below-hero area; suppress mainhub
  // overlays (chat widget) the same way an expanded orbital node used to.
  React.useEffect(() => {
    setOrbitalActive(stage !== "default");
    return () => setOrbitalActive(false);
  }, [setOrbitalActive, stage]);

  return (
    <div className="drill-observatory-root @container relative h-full w-full overflow-y-auto bg-transparent px-0 py-0 pb-12">
      {/* 1140px and a 20px gap: the design's column. The three cards each carry
          26-30px of internal padding, so the gap between them stays smaller than
          their padding by design — they read as three objects on one field, not
          as one split surface. */}
      <div className="drill-observatory-canvas relative mx-auto flex w-full max-w-[71.25rem] flex-col gap-5">
        {/* The address row rides above the hero rather than inside it: the
            route label row is decorative and aria-hidden, and the hero's two
            columns are already the page's two primary actions. It sits in the
            same place it occupies on Classroom Home — the band directly under
            the top of the surface — so it is one control in one position across
            both mounts. No access check here: the whole route is behind
            has_drill_access. */}
        <div className="drill-observatory-tools">
          <QuestionJump returnTo={drillReturnTo} tone="dark" />
          {/* The section switch. Top right of the same band, opposite the jump
              box — one control, one position, on both mounts of this page. */}
          <SectionToggle section={section} onChange={changeSection} />
        </div>

        {/* Keyed on the section so the flip animation replays on every throw of
            the switch. The hero is presentational now (see useGreetingName), so
            remounting it costs no query. */}
        <MainhubHero
          key={section}
          section={section}
          firstName={firstName}
          drillReturnTo={drillReturnTo}
          onOpenBuilder={() => openLauncher("type-drill")}
          onStartSmartRc={startSmartRc}
        />

        {stage === "analytics" ? (
          <section
            className="drill-observatory-analytics"
            aria-label="Analytics workspace"
            data-tour="mainhub-analytics"
          >
            <AnalyticsStage tab={analyticsTab} onTabChange={setAnalyticsTab} />
          </section>
        ) : (
          /* A launcher swaps out ONLY the practice bay. Today (assignments,
             notes, notification items) is live status and stays visible while
             the student sets a drill up — replacing the whole deck made it look
             like the card had been deleted.

             Build a Set is the exception: its picker is a dense two-column
             panel that got its Set Summary column clipped outright inside the
             ~600px bay. For that stage the deck stacks — the picker takes the
             full canvas width and Today drops beneath it, still in sight.

             `items-stretch` (the default), not `items-start`: the two cards are
             halves of one deck row and must share its height, or the shorter one
             stops short and the row's bottom edge reads as ragged.

             1.2:1, not the old 1.72:1. The wide column was holding the sparse
             content (two tools, two links, one insight row) while Today —
             headline, three assignment rows, status badges — was squeezed into
             382px and wrapping. The split was feeding space to the column that
             needed it least. */
          <section
            className={cn(
              "drill-observatory-deck grid grid-cols-1 items-stretch",
              !isWideLauncherStage &&
                "@[760px]:grid-cols-[minmax(0,1.2fr)_minmax(340px,1fr)]",
            )}
            data-stacked={isWideLauncherStage ? "true" : undefined}
          >
            {/* The bay flips with the hero; Today does not. That contrast is
                what makes the flip read as "this half changed" rather than as
                a page reload — and TodayFocusPanel is live status that belongs
                to the student, not to a section. It is a sibling here, so the
                key below cannot remount it. */}
            <section
              key={section}
              data-section={section}
              className="drill-observatory-practice-bay drill-observatory-section-flip-face"
              aria-label={
                stage === "default" ? "Practice and insight workspace" : "Drill launcher"
              }
              data-tour={stage === "default" ? "mainhub-practice" : "mainhub-launcher"}
            >
              {isLauncherStage ? (
                <LauncherStage
                  kind={stage}
                  section={section}
                  drillReturnTo={drillReturnTo}
                  onCancel={closeStage}
                />
              ) : section === "rc" ? (
                <RcPracticeStage
                  onOpenAnalytics={openAnalytics}
                  onOpenLauncher={openLauncher}
                  canOpenAnalytics={canOpenAnalytics}
                  canOpenJournal={canOpenJournal}
                />
              ) : (
                <PracticeInsightStage
                  onOpenAnalytics={openAnalytics}
                  onOpenLauncher={openLauncher}
                  onOpenRcSection={() => changeSection("rc")}
                  canOpenAnalytics={canOpenAnalytics}
                  canOpenJournal={canOpenJournal}
                />
              )}
            </section>

            <section className="drill-observatory-today-bay">
              <TodayFocusPanel drillReturnTo={drillReturnTo} />
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
