"use client";

import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  Grid3x3,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
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
import TodayFocusPanel from "@/components/mainhub/TodayFocusPanel";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";
import {
  filterSmartLRQuestionMatches,
  type SmartLRQuestionMatch,
} from "@/components/mainhub/smartLRQuestionSearch";
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from "@/types/drill";
import { findCatalogItem, type CatalogItem } from "@/lib/layoutCatalog";

const MAINHUB_ORBITAL_CATALOG: CatalogItem[] = [
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    requires: "has_analytics_access",
    description: "Performance trends and accuracy by question type.",
  },
  {
    id: "waj",
    label: "Journal",
    icon: BookOpen,
    requires: "has_journal_access",
    description: "Notes, databases, and missed-question review.",
  },
  {
    id: "full-section",
    label: "Full Section",
    icon: BookOpen,
    description: "Start the official timed-section workflow.",
  },
  {
    id: "type-drill",
    label: "Build a Set",
    icon: Grid3x3,
    description: "Filter the bank and assemble a precise question set.",
  },
];

const REQUIRED_ORBITAL_IDS = ["analytics", "waj", "full-section", "type-drill"] as const;
const QUESTION_PICKER_PLACEHOLDER = "";

interface OrbitalRenderInfo {
  date: string;
  content: string;
  category: string;
  status: TimelineItem["status"];
  energy: number;
}

const ORBITAL_RENDER: Record<string, OrbitalRenderInfo> = {
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
  "full-section": {
    date: "Timed section",
    content: "Start the official timed-section workflow.",
    category: "Practice",
    status: "pending",
    energy: 64,
  },
  "type-drill": {
    date: "Hand-picked",
    content: "Filter the bank and assemble a precise question set.",
    category: "Practice",
    status: "pending",
    energy: 66,
  },
};

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
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advancedQType, setAdvancedQType] = React.useState("");
  const [advancedDifficulty, setAdvancedDifficulty] = React.useState("");

  const allQuestions = React.useMemo(
    () => (manifest ? questionBank.getAllQuestions() : []),
    [manifest],
  );

  const pts = React.useMemo(
    () =>
      Array.from(new Set(allQuestions.map((q) => q.pt))).sort((a, b) => b - a),
    [allQuestions],
  );

  const qtypes = React.useMemo(
    () =>
      Array.from(new Set(allQuestions.map((q) => q.qtype).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [allQuestions],
  );

  const difficulties = React.useMemo(
    () =>
      Array.from(new Set(allQuestions.map((q) => q.difficulty)))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b),
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
          qtypes: advancedQType ? [advancedQType] : undefined,
          difficulties: advancedDifficulty ? [Number(advancedDifficulty)] : undefined,
        },
        6,
      ),
    [advancedDifficulty, advancedQType, allQuestions, pt, section, qnum, searchQuery],
  );

  const queryIsActive = searchQuery.trim().length > 0;
  const advancedFiltersActive = !!advancedQType || !!advancedDifficulty || (advancedOpen && (!!pt || !!section));
  const searchIsActive = queryIsActive || advancedFiltersActive;
  const showNoMatches = searchIsActive && !isLoading && searchMatches.length === 0;
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

  const clearAdvancedFilters = React.useCallback(() => {
    setAdvancedQType("");
    setAdvancedDifficulty("");
    setPt(QUESTION_PICKER_PLACEHOLDER);
    setSection(QUESTION_PICKER_PLACEHOLDER);
    setQnum(QUESTION_PICKER_PLACEHOLDER);
  }, []);

  return (
    <Card className="relative min-h-[460px] w-full overflow-hidden rounded-[20px] border-0 bg-zinc-950 shadow-[0_22px_70px_rgba(15,23,42,0.16)] md:min-h-[390px]">
      <Spotlight className="-top-48 left-[-120px] md:left-[26%] md:-top-24" fill="white" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_44%_38%,rgba(255,255,255,0.16),transparent_31%),radial-gradient(circle_at_82%_48%,rgba(14,165,233,0.1),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_34%,rgba(2,6,23,0.24)_76%,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:56px_56px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/30 to-transparent"
      />

      <div className="relative z-10 grid min-h-[460px] grid-cols-1 gap-6 p-5 sm:p-7 md:min-h-[390px] md:grid-cols-[minmax(140px,0.52fr)_minmax(340px,1.54fr)_minmax(280px,0.82fr)] md:items-center md:gap-4 lg:grid-cols-[minmax(170px,0.55fr)_minmax(430px,1.7fr)_minmax(300px,0.82fr)] lg:p-8">
        <div className="flex min-h-[92px] flex-col justify-center md:min-h-0 md:pl-1 lg:pl-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={startSmartDrill}
              size="sm"
              className="h-11 rounded-full border border-white/10 bg-white px-5 text-sm font-semibold text-black shadow-[0_16px_38px_rgba(255,255,255,0.1)] hover:bg-neutral-200"
            >
              Start Smart Drill
            </Button>
          </div>
        </div>

        <div className="relative flex h-[170px] items-center justify-center overflow-hidden md:h-[360px]">
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-[54%] -translate-y-1/2 rounded-full bg-cyan-300/10 blur-3xl md:h-80 md:w-80"
          />
          <SplineBoundary>
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="h-full w-full scale-[1.06]"
            />
          </SplineBoundary>
          {/* Vignette to mask the baked-in grid floor from the Spline scene */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 55% 70% at 50% 50%, transparent 0%, transparent 40%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.95) 100%)",
            }}
          />
        </div>

        <div className="rounded-[28px] border border-white/[0.075] bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_20px_54px_rgba(0,0,0,0.14)] backdrop-blur-xl sm:p-4 md:mr-0 lg:mr-3">
          <div
            className="mb-3 space-y-2.5"
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
                  "h-12 w-full rounded-[22px] border border-white/[0.08] bg-black/15 pl-9 pr-3 text-sm font-semibold text-white outline-none transition",
                  "shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] placeholder:text-white/35",
                  "focus:border-white/35 focus:ring-2 focus:ring-white/10 disabled:cursor-default disabled:text-white/30",
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-3 px-1">
              <button
                type="button"
                onClick={() => setAdvancedOpen((value) => !value)}
                className="inline-flex items-center gap-2 rounded-full px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55 transition hover:text-white"
                aria-expanded={advancedOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Advanced
              </button>
              {advancedFiltersActive && (
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="rounded-full px-1 py-1 text-[11px] font-semibold text-white/45 transition hover:text-white"
                >
                  Clear filters
                </button>
              )}
            </div>

            {advancedOpen && (
              <div className="grid grid-cols-1 gap-2 rounded-[22px] border border-white/[0.075] bg-black/10 p-2.5 2xl:grid-cols-2">
                <ConsoleSelect
                  label="Question type"
                  value={advancedQType}
                  disabled={isLoading || qtypes.length === 0}
                  onChange={setAdvancedQType}
                  options={qtypes.map((type) => ({ value: type, label: type }))}
                  compact
                />
                <ConsoleSelect
                  label="Difficulty"
                  value={advancedDifficulty}
                  disabled={isLoading || difficulties.length === 0}
                  onChange={setAdvancedDifficulty}
                  options={difficulties.map((n) => ({ value: String(n), label: `Difficulty ${n}` }))}
                  compact
                />
                <ConsoleSelect
                  label="PT filter"
                  value={pt}
                  disabled={isLoading || pts.length === 0}
                  onChange={(value) => {
                    setPt(value);
                    setSection(QUESTION_PICKER_PLACEHOLDER);
                    setQnum(QUESTION_PICKER_PLACEHOLDER);
                  }}
                  options={pts.map((n) => ({ value: String(n), label: `PrepTest ${n}` }))}
                  compact
                />
                <ConsoleSelect
                  label="Section filter"
                  value={section}
                  disabled={!pt}
                  onChange={(value) => {
                    setSection(value);
                    setQnum(QUESTION_PICKER_PLACEHOLDER);
                  }}
                  options={sections.map((n) => ({ value: String(n), label: `Section ${n}` }))}
                  compact
                />
              </div>
            )}

            {searchIsActive && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1" aria-live="polite">
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
            className="mt-3 h-11 w-full rounded-[22px] border border-white/12 bg-white text-sm font-semibold text-black shadow-[0_14px_28px_rgba(255,255,255,0.08)] hover:bg-neutral-200 disabled:bg-white/10 disabled:text-white/35 disabled:opacity-100"
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
        "block w-full rounded-2xl border border-white/[0.12] bg-slate-950/80 px-3 py-2 text-left transition",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(0,0,0,0.18)] hover:border-white/[0.22] hover:bg-slate-900/90",
      )}
    >
      <div className="mb-0.5 flex items-center gap-2 text-[11px] font-bold text-white/90">
        <span>
          PT {question.pt} · S{question.section} · Q{question.qnum}
        </span>
        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/65">
          {question.qtype}
        </span>
        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/65">
          D{question.difficulty}
        </span>
      </div>
      <p className="line-clamp-1 text-xs font-medium leading-5 text-slate-200/90">
        {snippet.before}
        {snippet.match ? (
          <mark className="rounded bg-white px-0.5 font-semibold text-slate-950 shadow-[0_0_14px_rgba(255,255,255,0.16)]">
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
  compact = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <Select
      key={`${label}-${value || "empty"}`}
      value={value || undefined}
      disabled={disabled}
      onValueChange={onChange}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          compact ? "h-10 rounded-[18px] text-xs" : "h-12 rounded-[22px] text-sm",
          "w-full border border-white/[0.08] bg-black/15 px-3 font-semibold text-white outline-none transition",
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
      const cat = findCatalogItem(MAINHUB_ORBITAL_CATALOG, id);
      return cat ? userHasAccess(cat) : false;
    });
    return visibleIds
      .map((id) => {
        const cat = findCatalogItem(MAINHUB_ORBITAL_CATALOG, id);
        const r = ORBITAL_RENDER[id];
        if (!cat || !r || !userHasAccess(cat)) return null;
        // Stable id: position in MAINHUB_ORBITAL_CATALOG. Survives permissions-driven
        // filter changes so React's key tracks the same DOM element.
        const stableId = MAINHUB_ORBITAL_CATALOG.findIndex((c) => c.id === id) + 1;
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
      // nodeId is MAINHUB_ORBITAL_CATALOG position + 1, so look up the catalog id directly.
      const itemId = MAINHUB_ORBITAL_CATALOG[nodeId - 1]?.id;
      if (itemId === "analytics") {
        navigate("/analytics");
      } else if (itemId === "waj") {
        navigate("/journal");
      } else if (itemId === "full-section" || itemId === "type-drill") {
        setSelectedPracticeAction(itemId);
      }
    },
    [navigate, setOrbitalActive],
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

          <section>
            {selectedPracticeAction ? (
              <PracticeActionPanel
                selectedAction={selectedPracticeAction}
                onClose={() => setSelectedPracticeAction(null)}
              />
            ) : (
              <TodayFocusPanel />
            )}
          </section>
        </section>
      </div>
    </div>
  );
}
