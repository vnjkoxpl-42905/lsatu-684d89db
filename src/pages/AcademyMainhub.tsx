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
import AnalyticsStage from "@/components/mainhub/AnalyticsStage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import TodayFocusPanel from "@/components/mainhub/TodayFocusPanel";
import { actionText, useTodayFocus, type TodayFocus } from "@/components/mainhub/useTodayFocus";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import QuestionJump from "@/components/questionfinder/QuestionJump";
import QuestionFinder from "@/components/questionfinder/QuestionFinder";
import { SectionToggle } from "@/components/drill/SectionToggle";
import { RcHubSurface } from "@/features/rc/components/RcHubSurface";
import {
  DRILL_SECTION_PARAM,
  rememberSection,
  resolveDrillSection,
  type DrillSection,
} from "@/lib/drillSection";
import { cn } from "@/lib/utils";
import type { TypeDrillConfig } from "@/types/drill";

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

/* The hub puts assigned work above the student's own practice and never said
   so. One line, the first three times an assignment leads; after that it has
   done its job and a permanent caption would just be furniture. Storage is
   wrapped for the same reason the section memory is: a remembered count is
   never worth a thrown error. */
const ASSIGNED_HINT_KEY = "lsatu.drillHub.assignedHintSeen";
const ASSIGNED_HINT_LIMIT = 3;

function useAssignedHint(assignmentLeads: boolean) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    if (!assignmentLeads) return;
    try {
      const raw = Number.parseInt(window.localStorage.getItem(ASSIGNED_HINT_KEY) ?? "0", 10);
      const seen = Number.isFinite(raw) ? raw : 0;
      if (seen >= ASSIGNED_HINT_LIMIT) return;
      setShow(true);
      window.localStorage.setItem(ASSIGNED_HINT_KEY, String(seen + 1));
    } catch {
      /* no-op: see rememberSection in src/lib/drillSection.ts */
    }
  }, [assignmentLeads]);

  return show;
}

function MainhubHero({
  section,
  firstName,
  drillReturnTo,
  focus,
  onOpenBuilder,
  onStartSmartRc,
}: {
  section: DrillSection;
  firstName: string;
  drillReturnTo: string;
  focus: TodayFocus;
  onOpenBuilder: () => void;
  onStartSmartRc: () => void;
}) {
  const navigate = useNavigate();

  /* Same shape as Classroom Home's dateline ("TUESDAY · SEPTEMBER 8 · 2026"),
     so the two mounts one click apart do not print the date two ways. */
  const todayLabel = React.useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const monthDay = d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    return `${weekday} · ${monthDay} · ${d.getFullYear()}`;
  }, []);

  /* Between 900 and 1099 the greeting column is about 356px, which wraps the
     long date onto a second line. The short month keeps it on one. Both are
     rendered and CSS picks; swapping the string at a JS breakpoint would need
     a resize listener and would not match on the first paint. */
  const todayLabelShort = React.useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    const monthDay = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${weekday} · ${monthDay} · ${d.getFullYear()}`;
  }, []);

  const startSmartDrill = React.useCallback(() => {
    navigate("/drill", { state: { mode: "adaptive", returnTo: drillReturnTo } });
  }, [drillReturnTo, navigate]);

  const startFallback = section === "rc" ? onStartSmartRc : startSmartDrill;
  /* Say what the button does, not what the feature is called. "Smart Drill" is
     the product's name for the adaptive set; a student meeting it on a button
     has to guess. The sentence above the button still names it. */
  const fallbackLabel = section === "rc" ? "Read one passage" : "Practice your weakest types";

  /* The hero leads with the computed next step when there is one. Assigned
     work is section-agnostic (Joshua assigns it, the student does not choose
     a bank first), so it leads on RC too. Smart Drill / One Passage become
     the quiet second option; with nothing assigned they are the first. */
  const primary = !focus.loading && !focus.hasError ? focus.primary : null;
  const NextIcon = primary?.Icon;
  const showAssignedHint = useAssignedHint(primary != null);

  return (
    /* Surface, scrim and grid live in .drill-observatory-hero / -hero-grid: the
       horizon image needs image-set() and a two-layer scrim pseudo-element,
       neither of which belongs in a className. */
    <Card
      data-section={section}
      className="drill-observatory-hero w-full border-0 bg-transparent p-0 shadow-none"
    >
      <div className="drill-observatory-hero-grid">
        {/* data-next: with an assignment leading, the greeting steps down one
            size. The assignment is the headline and the greeting its caption;
            at full size the two wrapped into four lines in a narrow window. */}
        <div className="drill-observatory-greeting flex flex-col justify-end" data-next={primary ? "true" : undefined}>
          <div className="flex flex-col gap-[9px]">
            <p className="drill-observatory-label drill-observatory-ink-60">
              <span className="drill-observatory-date-long">{todayLabel}</span>
              <span className="drill-observatory-date-short">{todayLabelShort}</span>
            </p>
            {/* Size, face and the italic on the name come from
                .drill-observatory-greeting h1 — the CSS rule outranks utilities
                here, so putting them in className would be dead code. */}
            <h1>
              {firstName ? (
                <>
                  Welcome back, <em>{firstName}</em>
                </>
              ) : (
                "Welcome back"
              )}
            </h1>

            {focus.loading ? (
              /* Same height as the next-up block so the CTA does not jump when
                 Today resolves. */
              <div className="drill-observatory-next animate-pulse" aria-label="Loading today">
                <div className="drill-observatory-skeleton-bar h-2.5 w-28" />
                <div className="drill-observatory-skeleton-bar mt-2 h-5 w-64 max-w-full" />
                <div className="drill-observatory-skeleton-bar mt-1 h-3 w-20" />
              </div>
            ) : primary ? (
              <div className="drill-observatory-next">
                {/* One line of facts, not a label above and an orphaned chip
                    word below. */}
                <p className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-60 flex items-center gap-2">
                  {NextIcon && <NextIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
                  {["Next up", primary.sourceLine, primary.status, primary.actionCue].filter(Boolean).join(" · ")}
                </p>
                <p className="drill-observatory-next-title">{primary.title}</p>
                {showAssignedHint && (
                  <p className="drill-observatory-ink-60 mt-2 text-[13px] leading-[1.5]">
                    Assigned work shows here first. Your own practice is below.
                  </p>
                )}
              </div>
            ) : (
              /* An empty hero and a failed hero are not the same thing. When
                 the load fails, primary is null, and without this branch the
                 page would quietly tell a student with assigned work that she
                 has none. Say what failed, then still offer the practice. */
              <div className="drill-observatory-next">
                {focus.hasError && (
                  <p className="drill-observatory-ink-70 mb-2 text-sm leading-[1.55]">
                    Your assigned work did not load, so this is your own
                    practice rather than today's list.{" "}
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="drill-observatory-quiet-link"
                    >
                      Try again
                    </button>
                  </p>
                )}
                <p className="drill-observatory-ink-70 text-sm leading-[1.55]">
                  {section === "rc"
                    ? "Read one passage now, untimed, with the answers after it. Or build a set of passages around what you want to read."
                    : "Start with the question types you miss most, or build a drill around exactly what you want to practice."}
                </p>
                {section === "lr" && (
                  /* Nothing on this page said what "adaptive" means. A student
                     with nothing assigned is the one being asked to trust it,
                     so the explanation sits here and nowhere else. No set size:
                     adaptive mode draws from the whole bank and serves one at a
                     time, so there is no fixed count to quote. */
                  <details className="drill-observatory-explainer">
                    <summary>How the adaptive drill picks questions</summary>
                    <p>
                      It looks at the question types you miss most often and pulls from
                      those first. Your answers feed what it serves next.
                    </p>
                  </details>
                )}
              </div>
            )}
          </div>

          <div className="drill-observatory-cta-row">
            {primary ? (
              <>
                <Button
                  onClick={() => void focus.open(primary)}
                  disabled={!primary.route && !primary.onOpen}
                  className="drill-observatory-cta w-fit"
                >
                  {actionText(primary)}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </Button>
                <button
                  type="button"
                  onClick={startFallback}
                  className="drill-observatory-quiet-link"
                >
                  {/* Not "instead": the student has not rejected the assigned
                      work by reading past it. "Or" offers, it does not correct. */}
                  {section === "rc" ? "Or read one passage now" : "Or practice your weakest types"}
                </button>
              </>
            ) : (
              <Button onClick={startFallback} className="drill-observatory-cta w-fit">
                {/* RC's "smart" is one untimed passage, not the adaptive engine
                    LR's button opens. Same word, two promises — so it says what
                    it starts. */}
                {fallbackLabel}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </Button>
            )}
          </div>
        </div>

        <div className="drill-observatory-console w-full">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-3">
              <h2 className="drill-observatory-ink-full text-[clamp(1.35rem,3cqi,2rem)] font-semibold leading-tight tracking-[-0.025em]">
                {section === "rc" ? "Build the reading set you need." : "Build the drill you need."}
              </h2>
              <p className="drill-observatory-ink-70 max-w-[48ch] text-sm leading-[1.6]">
                {section === "rc"
                  ? "Pick PrepTests, topics, and difficulty. Choose the passages or let the set fill itself."
                  : "Pick PrepTests, question types, and difficulty. See the exact set before you start."}
              </p>
            </div>
            <Button
              type="button"
              onClick={onOpenBuilder}
              className="drill-observatory-console-start"
            >
              {section === "rc" ? "Set up an RC drill" : "Set up an LR drill"}
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
  kind,
  section,
  drillReturnTo,
  onCancel,
}: {
  kind: "type-drill";
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
      {/* No header here on purpose: QuestionPicker renders its own title and
          Cancel control, so adding one would show two titles and two Cancels. */}
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
  const { setActive: setOrbitalActive } = useOrbitalActive();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstName = useGreetingName();
  const navigate = useNavigate();
  /* Computed once, read by the hero and by Today. See useTodayFocus. */
  const focus = useTodayFocus(drillReturnTo);

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

  /* Escape leaves a stage. The stage is a room the hub opened, and every other
     room in this app closes on Escape; the Cancel button stays the visible way
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
            has_drill_access.

            Light tone, not dark: the row sits on the cream STAGE, not on a
            card. Dark tone inked its labels ivory-on-cream at 1.07:1, which is
            invisible. The section switch beside it made the same correction
            earlier; the finder's trigger is a dark pill either way. */}
        <div className="drill-observatory-tools">
          <QuestionJump
            returnTo={drillReturnTo}
            tone="light"
            bank={section}
            withSearch={false}
          />
          {/* Search and the section switch are one cluster hard right, on the
              same line. The search trigger used to ride at the end of the
              address row, which parked it directly above the LR/RC switch and
              read as a stack of two unrelated controls. Side by side they read
              as what they are: the two utilities of this band. */}
          <div className="drill-observatory-tools-aside">
            <QuestionFinder returnTo={drillReturnTo} tone="dark" bank={section} />
            <SectionToggle section={section} onChange={changeSection} />
          </div>
        </div>

        {/* The hero stays mounted across section changes (its content swaps in
            place so the LR/RC switch never shows an empty frame), and leaves
            the page entirely while a stage is open. The launcher carries its
            own title and Cancel; keeping a 400px hero above it put "Set up an
            LR drill" on screen twice, 500px apart, and pushed the builder's
            own title below the fold. */}
        {stage === "default" && (
          <MainhubHero
            section={section}
            firstName={firstName}
            drillReturnTo={drillReturnTo}
            focus={focus}
            onOpenBuilder={() => openLauncher("type-drill")}
            onStartSmartRc={startSmartRc}
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
            /* With the hero carrying the next step, Today is a short queue and
               no longer needs to match the practice card's height. */
            data-queue={stage === "default" && focus.primary ? "true" : undefined}
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
                  kind={stage}
                  section={section}
                  drillReturnTo={drillReturnTo}
                  onCancel={closeStage}
                />
              ) : (
                <PracticeInsightStage
                  section={section}
                  onOpenAnalytics={openAnalytics}
                  onOpenLauncher={openLauncher}
                  canOpenAnalytics={canOpenAnalytics}
                  canOpenJournal={canOpenJournal}
                />
              )}
            </section>

            {/* The hero owns the primary item only while it is on the page.
                With a stage open the hero is gone, so Today says the next step
                itself again. */}
            <section className="drill-observatory-today-bay">
              <TodayFocusPanel
                drillReturnTo={drillReturnTo}
                focus={focus}
                heroOwnsPrimary={stage === "default"}
              />
            </section>
          </section>
        )}
      </div>
    </div>
  );
}
