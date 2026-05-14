import { useState } from "react";
import { FLASHCARDS } from "../../data/mockData";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, Brain, CheckCircle2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useApp } from "../../store/AppContext";

export const Flashcards: React.FC = () => {
  const { updateCardReview } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = FLASHCARDS[currentIndex];

  const advance = (delta: number) => {
    setIsFlipped(false);
    const step = () =>
      setCurrentIndex((prev) => (prev + delta + FLASHCARDS.length) % FLASHCARDS.length);
    if (prefersReducedMotion) step();
    else setTimeout(step, 150);
  };

  const handleMastered = () => {
    updateCardReview(currentCard.id, "mastered");
    advance(1);
  };

  return (
    <div className="max-w-4xl mx-auto px-1 sm:px-6 py-8 sm:py-12">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 sm:gap-8 mb-10 sm:mb-12">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="w-10 h-10 bg-brutal-ink text-brutal-paper border-2 border-brutal-ink flex items-center justify-center"
            >
              <Brain className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
              Active review
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
            LSAT Key Concepts
          </h1>
          <p className="text-sm sm:text-base font-bold text-brutal-ink-soft leading-snug max-w-prose">
            Self-test on essential terminology and logical structures.
          </p>
        </div>
        <div className="flex flex-col gap-3 min-w-[200px]">
          <div className="inline-flex items-center justify-between gap-3 px-4 py-2 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-sm self-start">
            <span className="text-xs font-black text-brutal-ink uppercase tracking-[0.15em]">
              Card{" "}
              <span className="bg-brutal-yellow px-2 border-2 border-brutal-ink mx-1">
                {currentIndex + 1}
              </span>{" "}
              of {FLASHCARDS.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={FLASHCARDS.length}
            aria-valuenow={currentIndex + 1}
            aria-label={`Card ${currentIndex + 1} of ${FLASHCARDS.length}`}
            className="w-full h-6 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-sm overflow-hidden p-1"
          >
            <div
              className="h-full bg-brutal-ink transition-[width] duration-300"
              style={{ width: `${((currentIndex + 1) / FLASHCARDS.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <section className="relative perspective-1000 min-h-[400px] sm:min-h-[450px]" aria-label="Flashcard">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
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

      <nav
        aria-label="Flashcard controls"
        className="flex items-center justify-center gap-4 sm:gap-8 mt-12"
      >
        <button
          type="button"
          onClick={() => advance(-1)}
          aria-label="Previous flashcard"
          className="w-14 h-14 sm:w-16 sm:h-16 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-sm flex items-center justify-center text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
        >
          <ChevronLeft className="w-7 h-7" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleMastered}
          className="inline-flex items-center gap-3 min-h-[56px] px-6 sm:px-10 py-4 bg-brutal-green text-brutal-ink border-4 border-brutal-ink font-black text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_var(--brutal-ink)] transition-transform"
        >
          <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
          Mark mastered
        </button>

        <button
          type="button"
          onClick={() => advance(1)}
          aria-label="Next flashcard"
          className="w-14 h-14 sm:w-16 sm:h-16 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-sm flex items-center justify-center text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
        >
          <ChevronRight className="w-7 h-7" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
};
