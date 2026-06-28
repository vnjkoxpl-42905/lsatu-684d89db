"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Grid3x3,
  X,
} from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import { useLastActivity } from "@/hooks/useLastActivity";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Button } from "@/components/ui/button";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { SectionSelector } from "@/components/drill/SectionSelector";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { resolveResumeTarget } from "@/lib/lastActivity";
import { nextActionFor, resolveItemRoute } from "@/lib/classroomItems";
import { cn } from "@/lib/utils";
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from "@/types/drill";
import {
  ORBITAL_CATALOG,
  findCatalogItem,
  type CatalogItem,
} from "@/lib/layoutCatalog";

const REQUIRED_ORBITAL_IDS = ["resume", "analytics", "waj"] as const;

interface OrbitalRenderInfo {
  date: string;
  content: string;
  category: string;
  status: TimelineItem["status"];
  energy: number;
}

const ORBITAL_RENDER: Record<string, OrbitalRenderInfo> = {
  resume: {
    date: "Last assignment",
    content: "Open the next thing on your plate.",
    category: "Classroom",
    status: "pending",
    energy: 60,
  },
  analytics: {
    date: "Trends",
    content: "Review your performance trends and accuracy by question type.",
    category: "Progress",
    status: "in-progress",
    energy: 72,
  },
  waj: {
    date: "Notes",
    content: "Open your Journal — notes, databases, and missed-question review.",
    category: "Journal",
    status: "pending",
    energy: 68,
  },
};

const PRACTICE_ACTIONS: Array<{
  id: Extract<DrillMode, "full-section" | "type-drill">;
  label: string;
  eyebrow: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "full-section",
    label: "Full Section",
    eyebrow: "Timed section",
    description: "Start the official timed-section workflow.",
    icon: BookOpen,
  },
  {
    id: "type-drill",
    label: "Build a Set",
    eyebrow: "Hand-picked",
    description: "Filter the bank and assemble a precise question set.",
    icon: Grid3x3,
  },
];

function SplineBoundary({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-white/15 bg-white/[0.03] shadow-[0_0_80px_rgba(255,255,255,0.08)]" />
        </div>
      }
    >
      {children}
    </React.Suspense>
  );
}

function PracticeActionPanel({
  selectedAction,
  onClose,
}: {
  selectedAction: Extract<DrillMode, "full-section" | "type-drill">;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { manifest, isLoading, error } = useQuestionBank();

  const handleStartSection = React.useCallback(
    (config: FullSectionConfig) => {
      navigate("/drill", { state: { mode: "full-section", config } });
    },
    [navigate],
  );

  const handleStartTypeDrill = React.useCallback(
    (config: TypeDrillConfig) => {
      navigate("/drill", { state: { mode: "type-drill", config } });
    },
    [navigate],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[24px] border border-slate-200 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border border-slate-200 border-t-slate-900" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Loading questions...
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    );
  }

  if (error || !manifest) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-[24px] border border-slate-200 bg-white px-6 text-center">
        <p className="text-sm font-medium text-slate-600">
          {error ?? "Question bank is not ready yet."}
        </p>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Practice Setup
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-normal text-slate-950">
            {selectedAction === "full-section" ? "Full Section" : "Build a Set"}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close practice setup">
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {selectedAction === "full-section" ? (
        <SectionSelector
          manifest={manifest}
          onStartSection={handleStartSection}
          onCancel={onClose}
        />
      ) : (
        <QuestionPicker
          manifest={manifest}
          onStartDrill={handleStartTypeDrill}
          onCancel={onClose}
        />
      )}
    </div>
  );
}

function MainhubHero() {
  const navigate = useNavigate();

  const startSmartDrill = React.useCallback(() => {
    navigate("/drill", { state: { mode: "adaptive" } });
  }, [navigate]);

  return (
    <Card className="w-full h-[280px] bg-zinc-950 relative overflow-hidden rounded-xl border-black/20">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
      <div className="flex h-full">
        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-100">
            LR Smart Drill
          </h1>
          <p className="mt-3 text-sm text-neutral-400 max-w-md leading-relaxed">
            Take it one question at a time with your tutor.
          </p>
          <div className="mt-5">
            <Button
              onClick={startSmartDrill}
              size="sm"
              className="bg-white text-black hover:bg-neutral-200 font-medium"
            >
              Start Smart Drill
            </Button>
          </div>
        </div>
        <div className="flex-1 relative hidden md:block">
          <SplineBoundary>
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </SplineBoundary>
        </div>
      </div>
    </Card>
  );
}

/**
 * Mainhub home stage. Renders inside StudentShell's center <Outlet/>. The
 * persistent sidebar, study sidecar, and support chat are owned by the shell.
 */
export default function AcademyMainhub() {
  const navigate = useNavigate();
  const [selectedPracticeAction, setSelectedPracticeAction] = React.useState<Extract<
    DrillMode,
    "full-section" | "type-drill"
  > | null>(null);
  const perms = useUserPermissions();
  const { data: classroomItems = [] } = useClassroomItems();
  const { data: lastActivity } = useLastActivity();
  const { setActive: setOrbitalActive } = useOrbitalActive();

  const userHasAccess = React.useCallback(
    (item: CatalogItem) => {
      // Optimistic during perm load: useUserPermissions refetches per mount,
      // taking 1-3s. The orbital is a nav surface; ProtectedRoute gates the
      // actual route. Optimism here keeps the mainhub from staying blank.
      if (perms.loading) return true;
      if (item.adminOnly) return perms.is_admin;
      if (item.requires) return perms.is_admin || !!perms[item.requires as PermissionFlag];
      return true;
    },
    [perms],
  );

  const mainhubNodes: TimelineItem[] = React.useMemo(() => {
    const visibleIds = REQUIRED_ORBITAL_IDS.filter((id) => {
      const cat = findCatalogItem(ORBITAL_CATALOG, id);
      return cat ? userHasAccess(cat) : false;
    });
    return visibleIds
      .map((id) => {
        const cat = findCatalogItem(ORBITAL_CATALOG, id);
        const r = ORBITAL_RENDER[id];
        if (!cat || !r || !userHasAccess(cat)) return null;
        // Stable id: position in ORBITAL_CATALOG. Survives permissions-driven
        // filter changes so React's key tracks the same DOM element.
        const stableId = ORBITAL_CATALOG.findIndex((c) => c.id === id) + 1;
        const node: TimelineItem = {
          id: stableId,
          title: cat.label,
          date: r.date,
          content: r.content,
          category: r.category,
          icon: cat.icon,
          relatedIds: [],
          status: r.status,
          energy: r.energy,
        };
        return node;
      })
      .filter((n): n is TimelineItem => n !== null);
  }, [userHasAccess]);

  const onOrbitalActivate = React.useCallback(
    (nodeId: number | null) => {
      // Push orbital-active state for shared mainhub overlay gates.
      setOrbitalActive(nodeId !== null);
      if (nodeId === null) return;
      // nodeId is ORBITAL_CATALOG position + 1, so look up the catalog id directly.
      const itemId = ORBITAL_CATALOG[nodeId - 1]?.id;
      if (itemId === "resume") {
        // Primary source: user_last_activity (true "where I left off").
        // Fallbacks: next assigned classroom item → Smart Drill.
        if (lastActivity) {
          const { path, state } = resolveResumeTarget(lastActivity.state_snapshot);
          navigate(path, { state });
        } else {
          const next = nextActionFor(classroomItems);
          const route = next ? resolveItemRoute(next) : null;
          navigate(route ?? "/drill", route ? undefined : { state: { mode: "adaptive" } });
        }
      } else if (itemId === "analytics") {
        navigate("/analytics");
      } else if (itemId === "waj") {
        navigate("/journal");
      }
    },
    [navigate, classroomItems, setOrbitalActive, lastActivity],
  );

  React.useEffect(() => {
    // If user navigates away while a node is expanded, clear orbital-active
    // so the chat widget reappears on the next route.
    return () => setOrbitalActive(false);
  }, [setOrbitalActive]);

  return (
    <div className="relative h-full w-full overflow-y-auto rounded-xl border border-slate-200/70 bg-[#f7f8fb] px-4 py-4 pb-24 shadow-sm shadow-black/5 md:px-6 md:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.82))]"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5">
        <MainhubHero />

        <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(520px,0.95fr)_minmax(360px,0.72fr)]">
          <div className="relative overflow-visible py-8 sm:py-12 xl:min-h-[640px]">
            <section
              aria-label="Mainhub orbital workspace"
              className="relative flex shrink-0 items-center justify-center overflow-visible"
            >
              <div data-tour="mainhub-orbital" className="relative h-[560px] w-[560px] max-w-full">
                <RadialOrbitalTimeline timelineData={mainhubNodes} onActivate={onOrbitalActivate} />
              </div>
            </section>
          </div>

          <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.07)] sm:p-6">
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Practice
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">
                Launch a Drill
              </h2>
            </div>

            {selectedPracticeAction ? (
              <PracticeActionPanel
                selectedAction={selectedPracticeAction}
                onClose={() => setSelectedPracticeAction(null)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {PRACTICE_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setSelectedPracticeAction(action.id)}
                      className={cn(
                        "group relative min-h-[154px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-left",
                        "transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_18px_48px_rgba(15,23,42,0.1)]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <ArrowRight className="mt-2 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-700" aria-hidden />
                      </div>
                      <div className="mt-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {action.eyebrow}
                        </p>
                        <h3 className="mt-2 text-[17px] font-semibold tracking-normal text-slate-950">
                          {action.label}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
