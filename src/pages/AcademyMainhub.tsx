"use client";

import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import TodayFocusPanel from "@/components/mainhub/TodayFocusPanel";
import { questionBank } from "@/lib/questionLoader";
import { cn } from "@/lib/utils";
import {
  filterSmartLRQuestionMatches,
  type SmartLRQuestionMatch,
} from "@/components/mainhub/smartLRQuestionSearch";

const QUESTION_PICKER_PLACEHOLDER = "";

/**
 * The meridian instrument: a fine-line drafting-room astrolabe drawn in ink.
 * Pure decoration — aria-hidden, no pointer events, gentle rotation that
 * stops under prefers-reduced-motion.
 */
function MeridianInstrument() {
  // The graduation ring is ~100 decorative SVG nodes; skip it in jsdom so
  // every testing-library role query doesn't have to walk it.
  const ticks = React.useMemo(
    () =>
      import.meta.env.MODE === "test"
        ? []
        : Array.from({ length: 96 }, (_, i) => ({ deg: i * (360 / 96), major: i % 8 === 0 })),
    [],
  );
  return (
    <svg
      className="obs-instrument"
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden
      focusable="false"
    >
      <g className="obs-inst-rotor">
        <circle cx="300" cy="300" r="264" className="obs-inst-circle-faint" />
        {ticks.map(({ deg, major }) => (
          <line
            key={deg}
            x1="300"
            y1="36"
            x2="300"
            y2={major ? 54 : 45}
            transform={`rotate(${deg} 300 300)`}
            className={major ? "obs-inst-tick-major" : "obs-inst-tick"}
          />
        ))}
      </g>
      <g className="obs-inst-rotor-reverse">
        <circle cx="300" cy="300" r="226" className="obs-inst-circle-dashed" />
      </g>
      <circle cx="300" cy="300" r="192" className="obs-inst-circle" />
      <ellipse cx="300" cy="300" rx="236" ry="78" className="obs-inst-orbit" />
      <ellipse cx="300" cy="300" rx="148" ry="50" className="obs-inst-orbit obs-inst-orbit-inner" />
      <path
        id="obs-merid-a"
        d="M 64 300 A 236 78 0 1 1 536 300 A 236 78 0 1 1 64 300"
        fill="none"
      />
      <path
        id="obs-merid-b"
        d="M 152 300 A 148 50 0 1 1 448 300 A 148 50 0 1 1 152 300"
        fill="none"
      />
      <circle className="obs-inst-sat" r="4">
        <animateMotion dur="38s" repeatCount="indefinite">
          <mpath href="#obs-merid-a" />
        </animateMotion>
      </circle>
      <circle className="obs-inst-sat obs-inst-sat-small" r="2.6">
        <animateMotion dur="23s" begin="-7s" repeatCount="indefinite">
          <mpath href="#obs-merid-b" />
        </animateMotion>
      </circle>
      <line x1="300" y1="132" x2="300" y2="198" className="obs-inst-hair" />
      <line x1="300" y1="402" x2="300" y2="468" className="obs-inst-hair" />
      <line x1="132" y1="300" x2="198" y2="300" className="obs-inst-hair" />
      <line x1="402" y1="300" x2="468" y2="300" className="obs-inst-hair" />
      <circle cx="300" cy="300" r="58" className="obs-inst-core" />
      <text x="300" y="318" textAnchor="middle" className="obs-inst-core-text">
        lr
      </text>
      <circle cx="300" cy="300" r="3" className="obs-inst-dot" />
      <text x="300" y="394" textAnchor="middle" className="obs-inst-caption">
        MERIDIAN · 01
      </text>
    </svg>
  );
}

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

  const formatQtype = React.useCallback(
    (value: string) => value.replace(/[_-]+/g, " "),
    [],
  );

  const instrumentRef = React.useRef<HTMLDivElement | null>(null);
  const handleHeroPointer = React.useCallback((event: React.MouseEvent<HTMLElement>) => {
    const el = instrumentRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--obs-par-x", `${(x * 14).toFixed(1)}px`);
    el.style.setProperty("--obs-par-y", `${(y * 10).toFixed(1)}px`);
  }, []);
  const resetHeroPointer = React.useCallback(() => {
    const el = instrumentRef.current;
    if (!el) return;
    el.style.setProperty("--obs-par-x", "0px");
    el.style.setProperty("--obs-par-y", "0px");
  }, []);

  return (
    <section className="drill-observatory-hero" aria-label="Drill launch stage">
      <div className="drill-observatory-route-label" aria-hidden>
        <span className="obs-route-left">
          <span className="obs-route-tick" />
          OBS / DRILL / LOGICAL REASONING
        </span>
        <span className="obs-route-right">REASONING INSTRUMENT 01</span>
      </div>

      <div
        className="drill-observatory-hero-grid"
        onMouseMove={handleHeroPointer}
        onMouseLeave={resetHeroPointer}
      >
        <div className="obs-blueprint" aria-hidden />
        <div className="drill-observatory-greeting">
          <p className="obs-eyebrow">{todayLabel}</p>
          <h2 className="obs-headline">
            {firstName ? (
              <>
                <span className="obs-headline-soft">Welcome back,</span>
                <span className="obs-headline-name">
                  {firstName}
                  <span className="obs-headline-period">.</span>
                </span>
              </>
            ) : (
              <span className="obs-headline-name">
                Welcome back
                <span className="obs-headline-period">.</span>
              </span>
            )}
          </h2>
          <div className="obs-smart-row">
            <Button onClick={startSmartDrill} className="obs-smart-btn">
              Start Smart Drill
              <ArrowUpRight className="obs-smart-arrow" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="drill-observatory-instrument" ref={instrumentRef}>
          <MeridianInstrument />
          <div className="obs-dais" aria-hidden />
        </div>

        <div className="drill-observatory-console">
          <div className="obs-console-head" aria-hidden>
            <span className="obs-console-led" />
            <span className="obs-console-title">Targeting console</span>
            <span className="obs-console-readout">
              <span className={cn("obs-readout-cell", pt && "is-set")}>PT&thinsp;{pt || "--"}</span>
              <span className="obs-readout-sep">/</span>
              <span className={cn("obs-readout-cell", section && "is-set")}>S&thinsp;{section || "-"}</span>
              <span className="obs-readout-sep">/</span>
              <span className={cn("obs-readout-cell", qnum && "is-set")}>Q&thinsp;{qnum || "-"}</span>
            </span>
          </div>

          <div
            className="obs-console-search"
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
            <div className="obs-search-field">
              <Search className="obs-search-icon" aria-hidden />
              <input
                type="search"
                value={searchQuery}
                disabled={isLoading}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search question text..."
                aria-label="Search question text"
                className="obs-search-input"
              />
              <span className="obs-search-scan" aria-hidden />
            </div>

            <div className="obs-console-subrow">
              <button
                type="button"
                onClick={() => setAdvancedOpen((value) => !value)}
                className={cn("obs-advanced-toggle", advancedOpen && "is-open")}
                aria-expanded={advancedOpen}
              >
                <SlidersHorizontal className="obs-advanced-icon" aria-hidden />
                Advanced
              </button>
              {advancedFiltersActive && (
                <button
                  type="button"
                  onClick={clearAdvancedFilters}
                  className="obs-clear-filters"
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
              <div className="drill-observatory-search-results" aria-live="polite">
                {searchMatches.map((match) => (
                  <QuestionSearchResult
                    key={match.question.qid}
                    match={match}
                    onOpen={() => openQuestion(match.question.qid)}
                  />
                ))}

                {showNoMatches && (
                  <div className="obs-no-matches">No matching questions</div>
                )}
              </div>
            )}
          </div>

          <div className="obs-console-divider" aria-hidden>
            <span>Coordinates</span>
          </div>

          <div className="obs-console-selects" aria-label="Specific question launcher">
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
            className={cn("obs-start-btn", selectedQuestion && "is-armed")}
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

      <div className="drill-observatory-ticker">
        {qtypes.length > 0 && (
          <div className="obs-tick-marquee" aria-hidden>
            <div className="obs-tick-track">
              <span className="obs-tick-copy">
                {qtypes.map((type) => (
                  <span key={`a-${type}`} className="obs-tick-type">
                    {formatQtype(type)}
                  </span>
                ))}
              </span>
              <span className="obs-tick-copy">
                {qtypes.map((type) => (
                  <span key={`b-${type}`} className="obs-tick-type">
                    {formatQtype(type)}
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
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
    <button type="button" onClick={onOpen} className="obs-search-result">
      <div className="obs-result-meta">
        <span className="obs-result-coords">
          PT {question.pt} · S{question.section} · Q{question.qnum}
        </span>
        <span className="obs-result-chip">{question.qtype}</span>
        <span className="obs-result-chip">D{question.difficulty}</span>
      </div>
      <p className="obs-result-snippet">
        {snippet.before}
        {snippet.match ? <mark>{snippet.match}</mark> : null}
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
          "obs-select-trigger",
          compact && "obs-select-trigger-compact",
          "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:opacity-100",
          "[&>span]:line-clamp-1 [&>span]:text-left",
        )}
      >
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={8}
        className={cn(
          "obs-select-content z-[80] max-h-[min(320px,calc(100vh-160px))] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-[#ecdcc8] bg-[#fffdf9]/95 text-[#2f2c28] shadow-[0_24px_60px_rgba(84,60,20,0.18)] backdrop-blur-xl",
          "[&_[data-radix-select-viewport]]:max-h-[min(304px,calc(100vh-176px))]",
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={cn(
              "min-h-9 rounded-xl py-2 pl-8 pr-3 font-mono text-[13px] font-medium text-[#5d5850] outline-none",
              "focus:bg-[#f7ecdf] focus:text-[#2f2c28] data-[state=checked]:text-[#c96f04]",
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

  const stage = searchParams.get("stage") === "analytics" ? "analytics" : "default";
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

  // The analytics stage takes over the below-hero area; suppress mainhub
  // overlays (chat widget) the same way an expanded orbital node used to.
  React.useEffect(() => {
    setOrbitalActive(stage === "analytics");
    return () => setOrbitalActive(false);
  }, [setOrbitalActive, stage]);

  return (
    <div className="drill-observatory-root @container relative h-full w-full overflow-y-auto">
      <div className="drill-observatory-canvas relative mx-auto flex w-full flex-col">
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
          <section className="drill-observatory-deck">
            <section
              className="drill-observatory-practice-bay"
              aria-label="Practice and insight workspace"
              data-tour="mainhub-practice"
            >
              <PracticeInsightStage
                onOpenAnalytics={openAnalytics}
                canOpenAnalytics={canOpenAnalytics}
                canOpenJournal={canOpenJournal}
              />
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
