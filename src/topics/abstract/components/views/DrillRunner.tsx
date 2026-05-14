import { useState } from "react";
import { useApp } from "../../store/AppContext";
import { DRILLS } from "../../data/mockData";
import { ConfidenceLevel } from "../../types";
import { cn } from "../../lib/utils";
import { ChevronRight } from "lucide-react";
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

export default function DrillRunner() {
  const { markDrillComplete } = useApp();
  const prefersReducedMotion = useReducedMotion();

  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const currentDrill = DRILLS[currentDrillIndex];

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCorrect = selectedOption === currentDrill?.correctOptionIndex;

  const handleSubmit = () => {
    if (selectedOption === null || !confidence) return;
    setIsSubmitted(true);
    void markDrillComplete(
      currentDrill.id,
      currentDrill.type,
      isCorrect,
      selectedOption,
      confidence,
      isCorrect ? undefined : currentDrill.trapTag,
    );
  };

  const handleNext = () => {
    if (currentDrillIndex < DRILLS.length - 1) {
      setCurrentDrillIndex((prev) => prev + 1);
      setSelectedOption(null);
      setConfidence(null);
      setIsSubmitted(false);
    }
  };

  if (!currentDrill) return null;

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-4xl mx-auto py-6 sm:py-10 z-10 relative px-1 sm:px-2"
    >
      <header className="mb-8 sm:mb-12 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-black px-2 py-1 bg-brutal-cyan text-brutal-ink border-2 border-brutal-ink uppercase tracking-[0.2em]">
            {currentDrill.type.replace("_", " ")}
          </span>
          <span className="text-[11px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Drill {currentDrillIndex + 1} of {DRILLS.length}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
          Targeted drills
        </h1>
      </header>

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
                  btnClass =
                    "bg-brutal-green border-brutal-ink brutal-shadow-sm text-brutal-ink";
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
          className="bg-brutal-paper border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow-lg mb-10"
        >
          <h2
            className={cn(
              "text-3xl sm:text-4xl font-black mb-5 uppercase italic tracking-tight",
              isCorrect ? "text-brutal-green" : "text-brutal-red",
            )}
          >
            {isCorrect ? "Correct" : "Incorrect"}
          </h2>
          <p className="text-base sm:text-lg font-bold text-brutal-ink leading-snug mb-6">
            {currentDrill.explanation}
          </p>
          {!isCorrect && currentDrill.trapTag ? (
            <p className="inline-flex items-center px-3 py-2 bg-brutal-red text-brutal-paper border-2 border-brutal-ink text-xs font-black uppercase tracking-[0.15em]">
              Trap fallen for: {TRAP_LABEL[currentDrill.trapTag] ?? currentDrill.trapTag.replace("_", " ")}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleNext}
            disabled={currentDrillIndex === DRILLS.length - 1}
            className="mt-8 w-full min-h-[56px] bg-brutal-pink text-brutal-ink font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-3"
          >
            {currentDrillIndex === DRILLS.length - 1 ? "End of drills" : "Next drill"}
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </motion.section>
      )}
    </motion.div>
  );
}
