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
import { SectionSelector } from "@/components/drill/SectionSelector";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import { cn } from "@/lib/utils";
import type { FullSectionConfig, TypeDrillConfig } from "@/types/drill";

function MainhubHero({
  drillReturnTo,
  onOpenBuilder,
}: {
  drillReturnTo: string;
  onOpenBuilder: () => void;
}) {
  const navigate = useNavigate();
  const [profileDisplayName, setProfileDisplayName] = React.useState<string | null>(null);

  const { user } = useAuth();

  // Canonical greeting name: profiles.display_name, falling back to metadata/email.
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

  const firstName = React.useMemo(() => {
    const raw =
      profileDisplayName ||
      (user?.user_metadata?.display_name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "";
    const name = raw.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, "");
    return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";
  }, [profileDisplayName, user]);

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
    <Card className="drill-observatory-hero w-full border-0 bg-transparent p-0 shadow-none">
      <div className="drill-observatory-route-label" aria-hidden>
        <span>DRILL / LOGICAL REASONING</span>
        <span>REASONING INSTRUMENT 01</span>
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
              Pick up where you left off, or build a drill around exactly what you want to practice.
            </p>
          </div>
          <Button
            onClick={startSmartDrill}
            className="drill-observatory-cta mt-5 w-fit"
          >
            Start Smart Drill
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </Button>
        </div>

        <div className="drill-observatory-console w-full">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="space-y-3">
              <h3 className="text-[clamp(1.35rem,3cqi,2rem)] font-semibold leading-tight tracking-[-0.025em] text-[#f4f1ea]">
                Build the drill you need.
              </h3>
              <p className="drill-observatory-ink-62 max-w-[48ch] text-sm leading-[1.6]">
                Choose PrepTests, question types, reasoning, features, and levels independently.
                Preview the exact set before you start.
              </p>
            </div>
            <Button
              type="button"
              onClick={onOpenBuilder}
              className="drill-observatory-console-start"
            >
              Set up an LR drill
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
  drillReturnTo,
  onCancel,
}: {
  kind: "full-section" | "type-drill";
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
                onStartSection={(config) => start("full-section", config)}
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

  const openAnalytics = React.useCallback(
    (tab: string = "overview") => {
      setSearchParams({ stage: "analytics", tab }, { replace: false });
    },
    [setSearchParams],
  );

  const setAnalyticsTab = React.useCallback(
    (tab: string) => {
      setSearchParams({ stage: "analytics", tab }, { replace: true });
    },
    [setSearchParams],
  );

  const openLauncher = React.useCallback(
    (kind: "full-section" | "type-drill") => {
      setSearchParams({ stage: kind }, { replace: false });
    },
    [setSearchParams],
  );

  const closeStage = React.useCallback(() => {
    setSearchParams({}, { replace: true });
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
        <MainhubHero
          drillReturnTo={drillReturnTo}
          onOpenBuilder={() => openLauncher("type-drill")}
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
            <section
              className="drill-observatory-practice-bay"
              aria-label={
                stage === "default" ? "Practice and insight workspace" : "Drill launcher"
              }
              data-tour={stage === "default" ? "mainhub-practice" : "mainhub-launcher"}
            >
              {isLauncherStage ? (
                <LauncherStage kind={stage} drillReturnTo={drillReturnTo} onCancel={closeStage} />
              ) : (
                <PracticeInsightStage
                  onOpenAnalytics={openAnalytics}
                  onOpenLauncher={openLauncher}
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
