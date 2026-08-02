"use client";

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";
import PracticeInsightStage from "@/components/mainhub/PracticeInsightStage";
import AnalyticsStage from "@/components/mainhub/AnalyticsStage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import TodayFocusPanel from "@/components/mainhub/TodayFocusPanel";
import { SectionSelector } from "@/components/drill/SectionSelector";
import { QuestionPicker } from "@/components/drill/QuestionPicker";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";
import type { FullSectionConfig, TypeDrillConfig } from "@/types/drill";
import {
  filterSmartLRQuestionMatches,
  type SmartLRQuestionMatch,
} from "@/components/mainhub/smartLRQuestionSearch";

const QUESTION_PICKER_PLACEHOLDER = "";

function MainhubHero({ drillReturnTo }: { drillReturnTo: string }) {
  const navigate = useNavigate();
  const { manifest, isLoading } = useQuestionBank();
  const [pt, setPt] = React.useState(QUESTION_PICKER_PLACEHOLDER);
  const [section, setSection] = React.useState(QUESTION_PICKER_PLACEHOLDER);
  const [qnum, setQnum] = React.useState(QUESTION_PICKER_PLACEHOLDER);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [advancedQType, setAdvancedQType] = React.useState("");
  const [advancedDifficulty, setAdvancedDifficulty] = React.useState("");
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

  const openQuestion = React.useCallback(
    (qid: string) => {
      const params = new URLSearchParams({
        mode: "type-drill",
        qids: qid,
        present: "smart",
        returnTo: drillReturnTo,
      });
      navigate(`/drill?${params.toString()}`);
    },
    [drillReturnTo, navigate],
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
              Pick up where you left off, or aim the drill at one question.
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
          <div
            className="flex flex-col gap-3.5"
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
                className="drill-observatory-ink-45 pointer-events-none absolute left-[14px] top-1/2 h-[15px] w-[15px] -translate-y-1/2"
                strokeWidth={1.8}
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                disabled={isLoading}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search question text…"
                aria-label="Search question text"
                className="w-full pl-[38px] pr-4 outline-none transition disabled:cursor-default"
              />
            </div>

            {searchIsActive && (
              <div
                className="drill-observatory-search-results space-y-1.5"
                aria-live="polite"
              >
                {searchMatches.map((match) => (
                  <QuestionSearchResult
                    key={match.question.qid}
                    match={match}
                    onOpen={() => openQuestion(match.question.qid)}
                  />
                ))}

                {showNoMatches && (
                  <p className="drill-observatory-ink-45 px-1 py-1 text-xs font-medium">
                    No matching questions
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2.5" aria-label="Specific question launcher">
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

            <div className="flex items-center justify-between gap-3 px-0.5">
              <button
                type="button"
                onClick={() => setAdvancedOpen((value) => !value)}
                className="drill-observatory-disclosure drill-observatory-label"
                aria-expanded={advancedOpen}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                Advanced
              </button>
              {advancedFiltersActive && (
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="drill-observatory-disclosure drill-observatory-label"
                >
                  Clear filters
                </button>
              )}
            </div>

            {advancedOpen && (
              <div className="drill-observatory-advanced">
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
              </div>
            )}

            <Button
              type="button"
              onClick={startSpecificQuestion}
              disabled={!selectedQuestion}
              className="drill-observatory-console-start"
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
        "drill-observatory-result block w-full rounded-[12px] px-3 py-2 text-left",
        "bg-[rgba(0,0,0,0.32)] shadow-[0_0_0_1px_var(--observatory-ring-quiet)]",
      )}
    >
      <div className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55 mb-1 flex items-center gap-2">
        <span>
          PT {question.pt} · S{question.section} · Q{question.qnum}
        </span>
        <span className="drill-observatory-ink-45 truncate normal-case tracking-normal">
          {question.qtype} · D{question.difficulty}
        </span>
      </div>
      <p className="drill-observatory-ink-70 line-clamp-1 text-xs font-normal leading-5">
        {snippet.before}
        {snippet.match ? (
          <mark className="rounded bg-[#f4f1ea] px-0.5 font-semibold text-[#0c0c0e]">
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
        /* Height, fill, ring and type come from .drill-observatory-console
           button[role="combobox"]; only layout details live here. */
        className={cn(
          "w-full outline-none transition disabled:cursor-default",
          compact && "text-xs",
          "[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-100",
          "[&>span]:line-clamp-1 [&>span]:text-left",
        )}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={8}
        className={cn(
          "z-[80] max-h-[min(320px,calc(100vh-160px))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[14px] border-0 bg-[rgba(6,6,9,0.92)] text-[#f4f1ea] shadow-[0_0_0_1px_rgba(244,241,234,0.12),0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl",
          "[&_[data-radix-select-viewport]]:max-h-[min(304px,calc(100vh-176px))]",
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              "min-h-9 rounded-[10px] py-2 pl-8 pr-3 text-[13.5px] font-medium text-[rgba(244,241,234,0.75)] outline-none",
              "focus:bg-[rgba(244,241,234,0.08)] focus:text-[#f4f1ea] data-[state=checked]:text-[#f4f1ea]",
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
        <MainhubHero drillReturnTo={drillReturnTo} />

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
