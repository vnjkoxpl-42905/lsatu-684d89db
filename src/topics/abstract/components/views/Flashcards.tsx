import { useMemo, useState } from "react";
import { FLASHCARDS } from "../../data/mockData";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Brain, RotateCcw, Sparkles, AlertCircle, ArrowRight, CheckCheck } from "lucide-react";
import { cn } from "../../lib/utils";
import { useApp } from "../../store/AppContext";
import { isDueNow } from "../../lib/srs";
import type { Flashcard, CardReview } from "../../types";

type FilterMode = "due" | "all" | "mastered";

const FILTER_LABELS: Record<FilterMode, string> = {
  due: "Due now",
  all: "All cards",
  mastered: "Mastered",
};

interface RatingButton {
  rating: "again" | "hard" | "good" | "easy";
  label: string;
  bg: string;
  text: string;
  hint: string;
}

const RATING_BUTTONS: RatingButton[] = [
  { rating: "again", label: "Again", bg: "bg-brutal-red", text: "text-brutal-paper", hint: "Reset to 1 day" },
  { rating: "hard", label: "Hard", bg: "bg-brutal-pink", text: "text-brutal-ink", hint: "Slightly longer" },
  { rating: "good", label: "Good", bg: "bg-brutal-yellow", text: "text-brutal-ink", hint: "Standard step" },
  { rating: "easy", label: "Easy", bg: "bg-brutal-green", text: "text-brutal-ink", hint: "Long jump" },
];

function filterCards(cards: Flashcard[], reviews: Record<string, CardReview>, mode: FilterMode): Flashcard[] {
  if (mode === "all") return cards;
  if (mode === "mastered") {
    return cards.filter((c) => reviews[c.id]?.status === "mastered");
  }
  // due: unseen cards + cards whose dueAtIso has passed + cards that lack SRS bookkeeping
  return cards.filter((c) => {
    const r = reviews[c.id];
    if (!r) return true;
    if (r.status === "mastered") return false;
    return isDueNow(r.dueAtIso);
  });
}

export const Flashcards: React.FC = () => {
  const { bootcampState, rateCard } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [filter, setFilter] = useState<FilterMode>("due");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const queue = useMemo(
    () => filterCards(FLASHCARDS, bootcampState.cards, filter),
    [bootcampState.cards, filter],
  );

  const masteredCount = useMemo(
    () => Object.values(bootcampState.cards).filter((c) => c.status === "mastered").length,
    [bootcampState.cards],
  );
  const dueCount = useMemo(
    () => filterCards(FLASHCARDS, bootcampState.cards, "due").length,
    [bootcampState.cards],
  );

  const safeIndex = Math.min(currentIndex, Math.max(queue.length - 1, 0));
  const currentCard = queue[safeIndex];

  const advance = () => {
    setIsFlipped(false);
    const step = () => setCurrentIndex((prev) => Math.min(prev + 1, Math.max(queue.length - 1, 0)));
    if (prefersReducedMotion) step();
    else setTimeout(step, 150);
  };

  const handleRate = async (rating: RatingButton["rating"]) => {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      await rateCard(currentCard.id, rating);
    } finally {
      setSubmitting(false);
      advance();
    }
  };

  const changeFilter = (next: FilterMode) => {
    setFilter(next);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-1 sm:px-6 py-8 sm:py-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 sm:gap-8 mb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-10 h-10 bg-brutal-ink text-brutal-paper border-2 border-brutal-ink flex items-center justify-center"
            >
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Spaced review
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
            LSAT Key Concepts
          </h1>
          <p className="text-sm sm:text-base font-bold text-brutal-ink-soft leading-snug max-w-prose">
            Rate each card to schedule its next appearance. Again, Hard, Good, or Easy.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 min-w-[280px]">
          <div className="bg-brutal-paper border-4 border-brutal-ink px-3 py-2 brutal-shadow-sm">
            <dt className="text-[9px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft">Due</dt>
            <dd className="text-2xl font-black text-brutal-ink">{dueCount}</dd>
          </div>
          <div className="bg-brutal-paper border-4 border-brutal-ink px-3 py-2 brutal-shadow-sm">
            <dt className="text-[9px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft">Mastered</dt>
            <dd className="text-2xl font-black text-brutal-ink">{masteredCount}</dd>
          </div>
          <div className="bg-brutal-paper border-4 border-brutal-ink px-3 py-2 brutal-shadow-sm">
            <dt className="text-[9px] font-black uppercase tracking-[0.18em] text-brutal-ink-soft">Total</dt>
            <dd className="text-2xl font-black text-brutal-ink">{FLASHCARDS.length}</dd>
          </div>
        </dl>
      </header>

      <nav
        aria-label="Filter flashcards"
        className="flex flex-wrap gap-2 mb-8"
      >
        {(Object.keys(FILTER_LABELS) as FilterMode[]).map((mode) => {
          const active = mode === filter;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => changeFilter(mode)}
              aria-pressed={active}
              className={cn(
                "px-4 py-2 border-4 border-brutal-ink font-black text-xs uppercase tracking-[0.18em] transition-transform",
                active
                  ? "bg-brutal-ink text-brutal-paper brutal-shadow"
                  : "bg-brutal-paper text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)]",
              )}
            >
              {FILTER_LABELS[mode]}
            </button>
          );
        })}
      </nav>

      {queue.length === 0 || !currentCard ? (
        <div className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-10 sm:p-14 flex flex-col items-center text-center gap-4">
          <CheckCheck className="w-12 h-12 text-brutal-ink" aria-hidden="true" />
          <p className="text-xl font-black uppercase tracking-tight text-brutal-ink">
            {filter === "due"
              ? "No cards due right now."
              : filter === "mastered"
              ? "No mastered cards yet."
              : "No cards in this view."}
          </p>
          <p className="text-sm font-bold text-brutal-ink-soft max-w-md">
            {filter === "due"
              ? "Switch to All Cards to keep reviewing, or come back tomorrow."
              : filter === "mastered"
              ? "Rate cards Easy two times in a row to move them here."
              : "Add cards to the deck or pick a different filter."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="text-xs font-black text-brutal-ink uppercase tracking-[0.18em]">
              Card{" "}
              <span className="bg-brutal-yellow px-2 border-2 border-brutal-ink mx-1">
                {safeIndex + 1}
              </span>{" "}
              of {queue.length}
            </span>
            <div
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={queue.length}
              aria-valuenow={safeIndex + 1}
              aria-label={`Card ${safeIndex + 1} of ${queue.length}`}
              className="flex-1 max-w-[260px] h-5 bg-brutal-paper border-4 border-brutal-ink overflow-hidden p-0.5"
            >
              <div
                className="h-full bg-brutal-ink transition-[width] duration-300"
                style={{ width: `${((safeIndex + 1) / queue.length) * 100}%` }}
              />
            </div>
          </div>

          <section className="relative perspective-1000 min-h-[400px] sm:min-h-[450px]" aria-label="Flashcard">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full"
              >
                <button
                  type="button"
                  onClick={() => setIsFlipped(!isFlipped)}
                  aria-pressed={isFlipped}
                  aria-label={
                    isFlipped ? "Hide answer" : `Reveal answer for ${currentCard.question}`
                  }
                  className={cn(
                    "w-full h-[400px] sm:h-[450px] cursor-pointer transition-transform duration-500 preserve-3d relative",
                    isFlipped ? "[transform:rotateY(180deg)]" : "",
                  )}
                >
                  <div className="absolute inset-0 backface-hidden bg-brutal-paper border-4 sm:border-[6px] border-brutal-ink brutal-shadow-lg p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                    <span className="absolute top-6 left-6 sm:top-8 sm:left-10 text-[10px] font-black uppercase tracking-[0.2em] text-brutal-paper bg-brutal-ink px-3 py-1">
                      {currentCard.category ?? "Card"}
                    </span>
                    <p className="text-2xl sm:text-3xl font-black leading-snug text-brutal-ink max-w-2xl tracking-tight italic">
                      {currentCard.question}
                    </p>
                    <span className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-brutal-ink-soft uppercase tracking-[0.2em] inline-flex items-center gap-2 px-4 py-1.5 border-2 border-brutal-ink-soft border-dashed">
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      Click to reveal
                    </span>
                  </div>

                  <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-brutal-cyan border-4 sm:border-[6px] border-brutal-ink brutal-shadow-lg p-8 sm:p-12 flex flex-col items-center justify-center text-center">
                    <span className="absolute top-6 left-6 sm:top-8 sm:left-10 text-[10px] font-black uppercase tracking-[0.2em] text-brutal-paper bg-brutal-ink px-3 py-1">
                      Answer
                    </span>
                    <div className="text-lg sm:text-xl font-bold leading-snug text-brutal-ink max-w-2xl whitespace-pre-wrap bg-brutal-paper p-6 sm:p-8 border-4 border-brutal-ink brutal-shadow">
                      {currentCard.answer}
                    </div>
                  </div>
                </button>
              </motion.div>
            </AnimatePresence>
          </section>

          {isFlipped ? (
            <section
              aria-label="Rate this card"
              className="mt-8 grid grid-cols-2 gap-3"
            >
              <button
                type="button"
                onClick={() => handleRate("again")}
                disabled={submitting}
                className={cn(
                  "px-4 py-4 border-4 border-brutal-ink font-black uppercase tracking-[0.15em] text-left brutal-shadow",
                  "bg-brutal-pink text-brutal-ink",
                  "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_var(--brutal-ink)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                <span className="text-base">Need review</span>
              </button>
              <button
                type="button"
                onClick={() => handleRate("good")}
                disabled={submitting}
                className={cn(
                  "px-4 py-4 border-4 border-brutal-ink font-black uppercase tracking-[0.15em] text-left brutal-shadow",
                  "bg-brutal-green text-brutal-ink",
                  "hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_var(--brutal-ink)]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                )}
              >
                <span className="text-base">Got it</span>
              </button>
            </section>
          ) : (
            <section
              aria-label="Card actions"
              className="mt-8 flex items-center justify-between gap-3"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brutal-ink-soft inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Flip the card to rate
              </p>
              <button
                type="button"
                onClick={advance}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-[0.15em] text-xs text-brutal-ink brutal-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
              >
                Skip
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </section>
          )}

          {safeIndex === queue.length - 1 && isFlipped && (
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-brutal-ink-soft inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              Last card in this view. Switch filters or rate to wrap up.
            </p>
          )}
        </>
      )}
    </div>
  );
};
