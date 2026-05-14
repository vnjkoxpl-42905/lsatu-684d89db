import { useApp } from "../../store/AppContext";
import { LESSONS } from "../../data/mockData";
import { CheckCircle2, ArrowRight, BookOpen, Target, Brain, Flag } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { CardReview, DrillAttempt, DrillType } from "../../types";

const TRAP_LABEL: Record<string, string> = {
  wrong_role: "Wrong role attribution",
  wrong_method: "Wrong method of reasoning",
  structural_mismatch: "Structural mismatch (necessary vs sufficient, scope shift)",
  attractive_language: "One-word trap (extreme language, scope creep)",
};

const TYPE_LABEL: Record<DrillType, string> = {
  role: "Role",
  method: "Method",
  flaw: "Flaw",
  one_word_trap: "One-word trap",
  keyword_extraction: "Keyword extraction",
  term_definition: "Term definition",
  translation: "Translation",
  matching: "Matching",
  mixed: "Mixed",
};

// Compute the most-fallen-into trap from the student's wrong drill attempts.
// Returns null when there isn't enough data to make an honest claim.
function pickWeakestTrap(attempts: DrillAttempt[]): { tag: string; count: number } | null {
  const wrong = attempts.filter((a) => !a.correct && a.trapTag);
  if (wrong.length < 2) return null;
  const counts = new Map<string, number>();
  for (const a of wrong) {
    if (!a.trapTag) continue;
    counts.set(a.trapTag, (counts.get(a.trapTag) ?? 0) + 1);
  }
  let top: { tag: string; count: number } | null = null;
  for (const [tag, count] of counts) {
    if (!top || count > top.count) top = { tag, count };
  }
  return top;
}

// Compute the drill type with the highest hit rate among ≥3 attempts.
function pickStrongestType(
  stats: Record<string, { correct: number; total: number } | undefined>,
): { type: DrillType; rate: number; total: number } | null {
  let best: { type: DrillType; rate: number; total: number } | null = null;
  for (const [type, s] of Object.entries(stats)) {
    if (!s || s.total < 3) continue;
    const rate = s.correct / s.total;
    if (!best || rate > best.rate) {
      best = { type: type as DrillType, rate, total: s.total };
    }
  }
  return best;
}

export default function CompletionReport() {
  const { bootcampState, setCurrentView } = useApp();
  const prefersReducedMotion = useReducedMotion();

  const lessonsCompleted = bootcampState.completedLessons.length;
  const drillsCompleted = bootcampState.completedDrills.length;
  const cardsReviewed = Object.values(bootcampState.cards as Record<string, CardReview>)
    .filter((c) => c.status !== "unseen").length;

  const totalCorrect = Object.values(bootcampState.drillsStats).reduce(
    (acc, curr) => acc + (curr?.correct ?? 0),
    0,
  );
  const totalAttempted = Object.values(bootcampState.drillsStats).reduce(
    (acc, curr) => acc + (curr?.total ?? 0),
    0,
  );
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  const weakest = pickWeakestTrap(bootcampState.drillAttempts);
  const strongest = pickStrongestType(bootcampState.drillsStats);
  const hasData = drillsCompleted > 0 || lessonsCompleted > 0 || cardsReviewed > 0;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto py-10 sm:py-16 z-10 relative space-y-12 sm:space-y-16"
    >
      <header className="space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brutal-green border-4 border-brutal-ink brutal-shadow rotate-[-3deg]" aria-hidden="true">
          <CheckCircle2 className="w-7 h-7 text-brutal-ink" />
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter text-brutal-ink uppercase italic leading-[0.95]">
          Bootcamp status report
        </h1>
        <p className="text-base sm:text-lg font-bold text-brutal-ink-soft max-w-2xl leading-snug">
          Where the work stands and what to push on next. Every number below is your own attempt history.
        </p>
      </header>

      {/* Editorial summary line replaces the three-card hero-metric template. */}
      <section aria-label="Headline numbers" className="space-y-4 border-t-4 border-brutal-ink pt-8">
        <p className="text-xl sm:text-2xl font-black text-brutal-ink leading-snug tracking-tight">
          <span className="bg-brutal-yellow px-2 py-0.5 border-2 border-brutal-ink">
            {lessonsCompleted} of {LESSONS.length}
          </span>{" "}
          lessons cleared.{" "}
          {drillsCompleted > 0 ? (
            <>
              {drillsCompleted} drills logged,{" "}
              <span className="text-brutal-green">{totalCorrect} correct</span>
              {accuracy !== null ? ` (${accuracy}%)` : ""}.
            </>
          ) : (
            "No drills logged yet."
          )}{" "}
          {cardsReviewed > 0
            ? `${cardsReviewed} flashcards in active rotation.`
            : "Flashcards still to start."}
        </p>
        <dl className="grid grid-cols-3 gap-x-6 text-sm font-bold text-brutal-ink-soft pt-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <dt className="sr-only">Lessons cleared</dt>
            <dd>{lessonsCompleted}/{LESSONS.length} lessons</dd>
          </div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" aria-hidden="true" />
            <dt className="sr-only">Drill accuracy</dt>
            <dd>{accuracy !== null ? `${accuracy}% accuracy` : "No drill data"}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4" aria-hidden="true" />
            <dt className="sr-only">Cards reviewed</dt>
            <dd>{cardsReviewed} cards seen</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="diagnosis-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <article
          className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-6 sm:p-8"
          aria-labelledby="diagnosis-strong-heading"
        >
          <h2 id="diagnosis-heading" className="sr-only">
            Diagnosis
          </h2>
          <span className="inline-block bg-brutal-green px-2 py-0.5 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            Strongest area
          </span>
          {strongest ? (
            <>
              <h3 id="diagnosis-strong-heading" className="text-xl sm:text-2xl font-black uppercase italic tracking-tight mb-3">
                {TYPE_LABEL[strongest.type]} drills
              </h3>
              <p className="text-base font-bold text-brutal-ink-soft leading-snug">
                You are clearing {TYPE_LABEL[strongest.type].toLowerCase()} drills at{" "}
                <span className="text-brutal-ink">
                  {Math.round(strongest.rate * 100)}%
                </span>{" "}
                across {strongest.total} attempts. Keep that pace, then push range on a weaker category.
              </p>
            </>
          ) : (
            <>
              <h3 id="diagnosis-strong-heading" className="text-xl font-black uppercase italic tracking-tight mb-3">
                Not enough data yet
              </h3>
              <p className="text-base font-bold text-brutal-ink-soft leading-snug">
                Log at least three drill attempts in any category to surface a strongest-area diagnosis.
              </p>
            </>
          )}
        </article>

        <article
          className="bg-brutal-pink border-4 border-brutal-ink brutal-shadow p-6 sm:p-8 text-brutal-ink"
          aria-labelledby="diagnosis-weak-heading"
        >
          <span className="inline-block bg-brutal-ink text-brutal-paper px-2 py-0.5 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            Weakest area
          </span>
          {weakest ? (
            <>
              <h3 id="diagnosis-weak-heading" className="text-xl sm:text-2xl font-black uppercase italic tracking-tight mb-3">
                {TRAP_LABEL[weakest.tag] ?? weakest.tag}
              </h3>
              <p className="text-base font-bold leading-snug">
                You fell for this trap on{" "}
                <span className="text-brutal-ink">{weakest.count} wrong attempts</span>. Re-read the trap-requirements column for any answer choice that triggers this pattern.
              </p>
            </>
          ) : (
            <>
              <h3 id="diagnosis-weak-heading" className="text-xl font-black uppercase italic tracking-tight mb-3">
                Trap diagnosis pending
              </h3>
              <p className="text-base font-bold leading-snug">
                Once you have a couple of wrong attempts with trap tags, the most-repeated trap will surface here.
              </p>
            </>
          )}
        </article>
      </section>

      <section
        aria-labelledby="next-step-heading"
        className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-10 flex flex-col gap-6"
      >
        <div>
          <span className="inline-block bg-brutal-yellow px-2 py-0.5 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            Recommended next step
          </span>
          <h2 id="next-step-heading" className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight leading-tight">
            {hasData
              ? weakest
                ? "Run a focused drill set on your weakest trap"
                : "Log a few more drills so the diagnosis sharpens"
              : "Start with a guided lesson, then come back here"}
          </h2>
        </div>
        <p className="text-base font-bold text-brutal-ink-soft leading-snug">
          {hasData
            ? "You have the keywords. Slow your matching step and check each structural verb in the choice against the actual moves of the argument."
            : "Open the first lesson and work the De-abstractify method end to end. The numbers in this report fill in as you go."}
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setCurrentView(hasData ? "drill" : "lesson")}
            className="inline-flex items-center gap-3 px-6 py-4 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-widest text-sm brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform min-h-[44px]"
          >
            {hasData ? "Target weakest trap" : "Open first lesson"}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
          {hasData && bootcampState.finalSetScore === undefined ? (
            <button
              type="button"
              onClick={() => setCurrentView("timed_set")}
              className="inline-flex items-center gap-3 px-6 py-4 bg-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-widest text-sm brutal-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)] transition-transform min-h-[44px]"
            >
              <Flag className="w-4 h-4" aria-hidden="true" />
              Take the final set
            </button>
          ) : null}
        </div>
      </section>
    </motion.div>
  );
}
