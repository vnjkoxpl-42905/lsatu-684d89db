"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Grid3x3,
  Loader2,
  Play,
  Search,
  X,
} from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useClassroomItems } from "@/hooks/useClassroomItems";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import { useLastActivity } from "@/hooks/useLastActivity";
import RadialOrbitalTimeline, { type TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { SectionSelector } from "@/components/drill/SectionSelector";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { questionBank } from "@/lib/questionLoader";
import { resolveResumeTarget } from "@/lib/lastActivity";
import { nextActionFor, resolveItemRoute } from "@/lib/classroomItems";
import { cn } from "@/lib/utils";
import {
  filterSmartLRQuestionMatches,
  type SmartLRQuestionMatch,
} from "@/components/mainhub/smartLRQuestionSearch";
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from "@/types/drill";
import {
  ORBITAL_CATALOG,
  findCatalogItem,
  type CatalogItem,
} from "@/lib/layoutCatalog";

const REQUIRED_ORBITAL_IDS = ["resume", "analytics", "waj"] as const;
const QUESTION_PICKER_PLACEHOLDER = "";

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
  const { manifest, isLoading } = useQuestionBank();
  const [pt, setPt] = React.useState(QUESTION_PICKER_PLACEHOLDER);
  const [section, setSection] = React.useState(QUESTION_PICKER_PLACEHOLDER);
  const [qnum, setQnum] = React.useState(QUESTION_PICKER_PLACEHOLDER);
  const [searchQuery, setSearchQuery] = React.useState("");

  const allQuestions = React.useMemo(
    () => (manifest ? questionBank.getAllQuestions() : []),
    [manifest],
  );

  const pts = React.useMemo(
    () =>
      Array.from(new Set(allQuestions.map((q) => q.pt))).sort((a, b) => b - a),
    [allQuestions],
  );

  const sections = React.useMemo(() => {
    if (!pt) return [] as number[];
    return Array.from(
      new Set(
        allQuestions
          .filter((q) => String(q.pt) === pt)
          .map((q) => q.section),
      ),
    ).sort((a, b) => a - b);
  }, [allQuestions, pt]);

  const qnums = React.useMemo(() => {
    if (!pt || !section) return [] as number[];
    return Array.from(
      new Set(
        allQuestions
          .filter((q) => String(q.pt) === pt && String(q.section) === section)
          .map((q) => q.qnum),
      ),
    ).sort((a, b) => a - b);
  }, [allQuestions, pt, section]);

  const selectedQuestion = React.useMemo(() => {
    if (!pt || !section || !qnum) return null;
    return (
      allQuestions.find(
        (q) =>
          String(q.pt) === pt &&
          String(q.section) === section &&
          String(q.qnum) === qnum,
      ) ?? null
    );
  }, [allQuestions, pt, section, qnum]);

  const searchMatches = React.useMemo(
    () =>
      filterSmartLRQuestionMatches(
        allQuestions,
        searchQuery,
        {
          pt: pt ? Number(pt) : undefined,
          section: section ? Number(section) : undefined,
          qnum: qnum ? Number(qnum) : undefined,
        },
        6,
      ),
    [allQuestions, pt, section, qnum, searchQuery],
  );

  const queryIsActive = searchQuery.trim().length > 0;
  const showNoMatches = queryIsActive && !isLoading && searchMatches.length === 0;
  const searchTargetQuestion = searchMatches[0] ?? null;

  const startSmartDrill = React.useCallback(() => {
    navigate("/drill", { state: { mode: "adaptive" } });
  }, [navigate]);

  const openQuestion = React.useCallback(
    (qid: string) => {
      navigate(`/drill?mode=type-drill&qids=${encodeURIComponent(qid)}&present=smart`);
    },
    [navigate],
  );

  const startSpecificQuestion = React.useCallback(() => {
    if (!selectedQuestion) return;
    openQuestion(selectedQuestion.qid);
  }, [openQuestion, selectedQuestion]);

  return (
    <Card className="relative min-h-[430px] w-full overflow-hidden rounded-xl border border-black/20 bg-zinc-950 shadow-[0_24px_80px_rgba(15,23,42,0.22)] md:min-h-[360px]">
      <Spotlight className="-top-48 left-[-120px] md:left-[26%] md:-top-24" fill="white" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_44%_40%,rgba(255,255,255,0.14),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%,rgba(14,165,233,0.08)_74%,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:44px_44px]"
      />

      <div className="relative z-10 grid min-h-[430px] grid-cols-1 gap-5 p-5 sm:p-6 md:min-h-[360px] md:grid-cols-[0.78fr_1.34fr_0.9fr] md:items-center md:gap-2 lg:grid-cols-[0.7fr_1.42fr_0.88fr]">
        <div className="flex min-h-[92px] flex-col justify-center md:min-h-0 md:pl-2">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <Play className="h-3.5 w-3.5 fill-white/20" aria-hidden />
            </span>
            <Button
              onClick={startSmartDrill}
              size="sm"
              className="h-10 rounded-full border border-white/15 bg-white text-sm font-semibold text-black shadow-[0_14px_30px_rgba(255,255,255,0.08)] hover:bg-neutral-200"
            >
              Start Smart Drill
            </Button>
          </div>
        </div>

        <div className="relative flex h-[150px] items-center justify-center md:h-[330px]">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-[58%] -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl md:h-72 md:w-72"
          />
          <SplineBoundary>
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="h-full w-full"
            />
          </SplineBoundary>
        </div>

        <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-4 md:mr-1">
          <div
            className="mb-2.5 space-y-2"
            onKeyDown={(event) => {
              if (event.key === "Escape" && searchQuery) {
                event.preventDefault();
                setSearchQuery("");
              }
              if (event.key === "Enter" && searchTargetQuestion) {
                event.preventDefault();
                openQuestion(searchTargetQuestion.question.qid);
              }
            }}
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                disabled={isLoading}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search question text..."
                aria-label="Search question text"
                className={cn(
                  "h-11 w-full rounded-2xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm font-semibold text-white outline-none transition",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] placeholder:text-white/35",
                  "focus:border-white/35 focus:ring-2 focus:ring-white/10 disabled:cursor-default disabled:text-white/30",
                )}
              />
            </div>

            {queryIsActive && (
              <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1" aria-live="polite">
                {searchMatches.map((match) => (
                  <QuestionSearchResult
                    key={match.question.qid}
                    match={match}
                    onOpen={() => openQuestion(match.question.qid)}
                  />
                ))}

                {showNoMatches && (
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white/50">
                    No matching questions
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5" aria-label="Specific question launcher">
            <ConsoleSelect
              label="PrepTest"
              value={pt}
              disabled={isLoading || pts.length === 0}
              onChange={(value) => {
                setPt(value);
                setSection(QUESTION_PICKER_PLACEHOLDER);
                setQnum(QUESTION_PICKER_PLACEHOLDER);
              }}
              options={pts.map((n) => ({ value: String(n), label: `PrepTest ${n}` }))}
            />
            <ConsoleSelect
              label="Section"
              value={section}
              disabled={!pt}
              onChange={(value) => {
                setSection(value);
                setQnum(QUESTION_PICKER_PLACEHOLDER);
              }}
              options={sections.map((n) => ({ value: String(n), label: `Section ${n}` }))}
            />
            <ConsoleSelect
              label="Question"
              value={qnum}
              disabled={!section}
              onChange={setQnum}
              options={qnums.map((n) => ({ value: String(n), label: `Question ${n}` }))}
            />
          </div>

          <Button
            type="button"
            onClick={startSpecificQuestion}
            disabled={!selectedQuestion}
            className="mt-3 h-11 w-full rounded-2xl border border-white/15 bg-white text-sm font-semibold text-black shadow-[0_14px_28px_rgba(255,255,255,0.08)] hover:bg-neutral-200 disabled:bg-white/10 disabled:text-white/35 disabled:opacity-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Start
              </>
            ) : (
              "Start"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function QuestionSearchResult({
  match,
  onOpen,
}: {
  match: SmartLRQuestionMatch;
  onOpen: () => void;
}) {
  const { question, snippet } = match;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "block w-full rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-left transition",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20 hover:bg-white/[0.08]",
      )}
    >
      <div className="mb-0.5 flex items-center gap-2 text-[11px] font-bold text-white/90">
        <span>
          PT {question.pt} · S{question.section} · Q{question.qnum}
        </span>
        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/65">
          LR
        </span>
      </div>
      <p className="line-clamp-1 text-xs leading-5 text-white/58">
        {snippet.before}
        {snippet.match ? (
          <mark className="rounded bg-white/18 px-0.5 text-white">
            {snippet.match}
          </mark>
        ) : null}
        {snippet.after}
      </p>
    </button>
  );
}

function ConsoleSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || undefined}
      disabled={disabled}
      onValueChange={onChange}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          "h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm font-semibold text-white outline-none transition",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus:border-white/35 focus:ring-2 focus:ring-white/10 focus:ring-offset-0",
          "disabled:cursor-default disabled:text-white/30 disabled:opacity-100",
          "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-white/40 [&>svg]:opacity-100",
          "[&>span]:line-clamp-1 [&>span]:text-left",
        )}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={8}
        className={cn(
          "z-[80] max-h-[min(320px,calc(100vh-160px))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-white/15 bg-zinc-950/95 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl",
          "[&_[data-radix-select-viewport]]:max-h-[min(304px,calc(100vh-176px))]",
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              "min-h-9 rounded-xl py-2 pl-8 pr-3 text-sm font-semibold text-white/78 outline-none",
              "focus:bg-white/10 focus:text-white data-[state=checked]:text-white",
            )}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
