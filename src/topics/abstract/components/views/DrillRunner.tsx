import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../store/AppContext";
import { DRILLS } from "../../data/mockData";
import type { ConfidenceLevel, DrillType, DrillItem } from "../../types";
import { cn } from "../../lib/utils";
import { AlertTriangle, ChevronRight, BookOpen, Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  "Guessing",
  "Unsure",
  "Pretty sure",
  "Confident",
];

const TRAP_LABEL: Record<string, string> = {
  wrong_role: "Wrong role attribution",
  wrong_method: "Wrong method of reasoning",
  structural_mismatch: "Structural mismatch",
  attractive_language: "One-word trap",
};

type TypeFilter = "all" | DrillType;
type ReviewMode = "all" | "wrong" | "unseen";

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "role", label: "Role" },
  { id: "method", label: "Method" },
  { id: "flaw", label: "Flaw" },
  { id: "one_word_trap", label: "One-word trap" },
];

const REVIEW_FILTERS: { id: ReviewMode; label: string }[] = [
  { id: "all", label: "All drills" },
  { id: "wrong", label: "My wrong" },
  { id: "unseen", label: "Unseen" },
];

const DIAGNOSTIC_THRESHOLD = 0.6;
const DIAGNOSTIC_MIN_ATTEMPTS = 5;

export default function DrillRunner() {
  const { markDrillComplete, setCurrentView, bootcampState } = useApp();
  const prefersReducedMotion = useReducedMotion();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("all");
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  const attemptStats = useMemo(() => {
    const seenIds = new Set<string>();
    const wrongIds = new Set<string>();
    let correctCount = 0;
    for (const a of bootcampState.drillAttempts) {
      seenIds.add(a.drillId);
      if (!a.correct) wrongIds.add(a.drillId);
      if (a.correct) correctCount += 1;
    }
    return {
      seenIds,
      wrongIds,
      total: bootcampState.drillAttempts.length,
      correctCount,
    };
  }, [bootcampState.drillAttempts]);

  const queue: DrillItem[] = useMemo(() => {
    let filtered = DRILLS as DrillItem[];
    if (typeFilter !== "all") filtered = filtered.filter((d) => d.type === typeFilter);
    if (reviewMode === "wrong") filtered = filtered.filter((d) => attemptStats.wrongIds.has(d.id));
    else if (reviewMode === "unseen") filtered = filtered.filter((d) => !attemptStats.seenIds.has(d.id));
    return filtered;
  }, [typeFilter, reviewMode, attemptStats]);

  const safeIndex = Math.min(currentDrillIndex, Math.max(queue.length - 1, 0));
  const currentDrill = queue[safeIndex];

  // Reset the timer + answer state any time the active drill changes.
  useEffect(() => {
    setStartedAt(Date.now());
    setSelectedOption(null);
    setConfidence(null);
    setIsSubmitted(false);
    setElapsedMs(null);
  }, [currentDrill?.id]);

  const isCorrect = currentDrill && selectedOption === currentDrill.correctOptionIndex;

  const accuracy =
    attemptStats.total > 0 ? attemptStats.correctCount / attemptStats.total : null;
  const showDiagnostic =
    accuracy !== null &&
    attemptStats.total >= DIAGNOSTIC_MIN_ATTEMPTS &&
    accuracy < DIAGNOSTIC_THRESHOLD;

  const handleSubmit = () => {
    if (selectedOption === null || !confidence || !currentDrill) return;
    const timeMs = Date.now() - startedAt;
    setElapsedMs(timeMs);
    setIsSubmitted(true);
    void markDrillComplete(
      currentDrill.id,
      currentDrill.type,
      !!isCorrect,
      selectedOption,
      confidence,
      isCorrect ? undefined : currentDrill.trapTag,
      timeMs,
    );
  };

  const handleNext = () => {
    if (safeIndex < queue.length - 1) {
      setCurrentDrillIndex((prev) => prev + 1);
    }
  };

  const changeTypeFilter = (id: TypeFilter) => {
    setTypeFilter(id);
    setCurrentDrillIndex(0);
  };

  const changeReviewMode = (id: ReviewMode) => {
    setReviewMode(id);
    setCurrentDrillIndex(0);
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto py-6 sm:py-10 z-10 relative px-1 sm:px-2"
    >
      <header className="mb-6 sm:mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-black px-2 py-1 bg-brutal-cyan text-brutal-ink border-2 border-brutal-ink uppercase tracking-[0.2em]">
            {currentDrill ? currentDrill.type.replace("_", " ") : "Targeted"}
          </span>
          <span className="text-[11px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            {queue.length > 0
              ? `Drill ${safeIndex + 1} of ${queue.length}`
              : "No drills in view"}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
          Targeted drills
        </h1>
      </header>

      {showDiagnostic && (
        <div
          role="alert"
          className="mb-6 bg-brutal-red border-4 border-brutal-ink brutal-shadow p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-brutal-paper shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 text-brutal-paper">
              <p className="text-sm sm:text-base font-black uppercase tracking-tight">
                Diagnostic flag: accuracy {(accuracy! * 100).toFixed(0)}%
              </p>
              <p className="text-xs sm:text-sm font-bold leading-snug opacity-90">
                Below 60% after {attemptStats.total} drills. Revisit the Methods Library before pushing on.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView("methods_library")}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-brutal-paper text-brutal-ink border-4 border-brutal-ink font-black uppercase tracking-widest text-xs hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform shrink-0"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            Open library
          </button>
        </div>
      )}

      <section aria-label="Filter drills" className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => {
            const active = typeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => changeTypeFilter(f.id)}
                aria-pressed={active}
                className={cn(
                  "px-3 py-1.5 border-4 border-brutal-ink font-black text-[11px] uppercase tracking-[0.18em] transition-transform",
                  active
                    ? "bg-brutal-ink text-brutal-paper brutal-shadow-sm"
                    : "bg-brutal-paper text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {REVIEW_FILTERS.map((f) => {
            const active = reviewMode === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => changeReviewMode(f.id)}
                aria-pressed={active}
                className={cn(
                  "px-3 py-1.5 border-2 border-brutal-ink font-black text-[10px] uppercase tracking-[0.18em] transition-transform",
                  active
                    ? "bg-brutal-yellow text-brutal-ink brutal-shadow-sm"
                    : "bg-brutal-paper text-brutal-ink hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_var(--brutal-ink)]",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      {!currentDrill ? (
        <div className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-10 flex flex-col items-center text-center gap-4">
          <Target className="w-10 h-10 text-brutal-ink" aria-hidden="true" />
          <p className="text-lg font-black uppercase tracking-tight text-brutal-ink">
            No drills match the current filters.
          </p>
          <p className="text-sm font-bold text-brutal-ink-soft max-w-md">
            Switch the type or review filter to surface a new set.
          </p>
        </div>
      ) : (
        <>
          <article className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg mb-10 overflow-hidden">
            <section
              aria-label="Stimulus"
              className="p-6 sm:p-8 md:p-10 border-b-4 border-brutal-ink"
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft block mb-3">
                Stimulus
              </span>
              <p className="text-lg sm:text-xl font-bold text-brutal-ink leading-snug whitespace-pre-line">
                {currentDrill.stimulus}
              </p>
            </section>

            <section className="p-6 sm:p-8 md:p-10" aria-label="Question and choices">
              <h2 className="text-xl sm:text-2xl font-black text-brutal-ink mb-8 leading-snug tracking-tight italic">
                {currentDrill.question}
              </h2>

              <ul className="space-y-4 list-none m-0 p-0" role="radiogroup" aria-label="Answer choices">
                {currentDrill.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  let btnClass =
                    "border-brutal-ink bg-brutal-paper text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]";

                  if (isSelected && !isSubmitted) {
                    btnClass =
                      "bg-brutal-ink text-brutal-paper border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none";
                  } else if (isSubmitted) {
                    if (idx === currentDrill.correctOptionIndex) {
                      btnClass = "bg-brutal-green border-brutal-ink brutal-shadow-sm text-brutal-ink";
                    } else if (isSelected) {
                      btnClass =
                        "bg-brutal-red text-brutal-paper border-brutal-ink brutal-shadow-sm";
                    } else {
                      btnClass = "border-brutal-ink opacity-60 bg-brutal-paper text-brutal-ink-soft";
                    }
                  }

                  return (
                    <li key={idx}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isSubmitted}
                        onClick={() => setSelectedOption(idx)}
                        className={cn(
                          "w-full text-left p-5 sm:p-6 border-4 transition-transform duration-150 flex items-start gap-4 sm:gap-5 min-h-[44px]",
                          btnClass,
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "w-10 h-10 flex items-center justify-center border-2 font-black text-base shrink-0",
                            isSelected && !isSubmitted
                              ? "bg-brutal-paper text-brutal-ink border-brutal-paper"
                              : "bg-brutal-ink text-brutal-paper border-brutal-ink",
                          )}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="block font-bold text-base sm:text-lg leading-snug py-1.5">
                          <span className="sr-only">Choice {String.fromCharCode(65 + idx)}: </span>
                          {option.text}
                        </span>
                      </button>
                      {isSubmitted ? (
                        <motion.p
                          initial={prefersReducedMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "text-sm sm:text-base mt-3 pl-14 pr-2 font-bold leading-snug",
                            idx === currentDrill.correctOptionIndex
                              ? "text-brutal-ink"
                              : "text-brutal-ink-soft",
                          )}
                        >
                          {option.explanation}
                        </motion.p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          </article>

          {!isSubmitted ? (
            <section
              aria-labelledby="confidence-heading"
              className="bg-brutal-paper border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow-lg mb-10"
            >
              <h2
                id="confidence-heading"
                className="text-[11px] font-black text-brutal-ink uppercase tracking-[0.2em] mb-5"
              >
                How confident are you?
              </h2>
              <div
                role="radiogroup"
                aria-labelledby="confidence-heading"
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7"
              >
                {CONFIDENCE_LEVELS.map((level) => {
                  const selected = confidence === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setConfidence(level)}
                      className={cn(
                        "min-h-[48px] py-3 px-3 text-xs sm:text-sm font-black border-4 uppercase tracking-tight transition-transform",
                        selected
                          ? "bg-brutal-ink border-brutal-ink text-brutal-paper brutal-shadow-sm"
                          : "bg-brutal-paper border-brutal-ink text-brutal-ink hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]",
                      )}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={selectedOption === null || !confidence}
                onClick={handleSubmit}
                className="w-full min-h-[56px] bg-brutal-ink text-brutal-paper font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest hover:bg-brutal-ink/90 transition-colors brutal-shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit answer
              </button>
            </section>
          ) : (
            <motion.section
              aria-live="polite"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="bg-brutal-paper border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow-lg mb-10 space-y-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2
                  className={cn(
                    "text-3xl sm:text-4xl font-black uppercase italic tracking-tight",
                    isCorrect ? "text-brutal-green" : "text-brutal-red",
                  )}
                >
                  {isCorrect ? "Correct" : "Incorrect"}
                </h2>
                {elapsedMs !== null && (
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft bg-brutal-paper border-2 border-brutal-ink-soft px-2 py-1">
                    Response time: {(elapsedMs / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
              <p className="text-base sm:text-lg font-bold text-brutal-ink leading-snug">
                {currentDrill.explanation}
              </p>
              {!isCorrect && currentDrill.trapTag ? (
                <p className="inline-flex items-center px-3 py-2 bg-brutal-red text-brutal-paper border-2 border-brutal-ink text-xs font-black uppercase tracking-[0.15em]">
                  Trap fallen for: {TRAP_LABEL[currentDrill.trapTag] ?? currentDrill.trapTag.replace("_", " ")}
                </p>
              ) : null}

              {!isCorrect && currentDrill.type === "method" && (
                <button
                  type="button"
                  onClick={() => setCurrentView("methods_library")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brutal-cyan text-brutal-ink border-4 border-brutal-ink font-black uppercase tracking-widest text-xs hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  Review methods library
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={safeIndex === queue.length - 1}
                className="w-full min-h-[56px] bg-brutal-pink text-brutal-ink font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-3"
              >
                {safeIndex === queue.length - 1 ? "End of queue" : "Next drill"}
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </motion.section>
          )}
        </>
      )}
    </motion.div>
  );
}
