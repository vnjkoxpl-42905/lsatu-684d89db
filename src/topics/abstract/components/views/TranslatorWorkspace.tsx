import { useId, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getTranslationFeedback } from "../../lib/coach";

const TRANSLATION_EXERCISES = [
  {
    abstract: "It is used to illustrate the general principle that the argument presupposes.",
    target: "This statement is an example of a broad rule that the argument needs in order to work.",
    keywords: ["illustrate", "general principle", "presupposes"],
  },
  {
    abstract: "It describes a phenomenon for which the argument's conclusion is offered as an explanation.",
    target: "This statement gives the observed result, and the author's conclusion gives the proposed cause.",
    keywords: ["describes", "phenomenon", "conclusion", "explanation"],
  },
];

export default function TranslatorWorkspace() {
  const prefersReducedMotion = useReducedMotion();
  const textareaId = useId();
  const [currentIndex, setCurrentIndex] = useState(0);
  const exercise = TRANSLATION_EXERCISES[currentIndex];

  const [translation, setTranslation] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedback = isSubmitted
    ? getTranslationFeedback(translation, exercise.target, exercise.keywords)
    : null;

  const handleSubmit = () => setIsSubmitted(true);
  const handleNext = () => {
    if (currentIndex < TRANSLATION_EXERCISES.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setTranslation("");
      setIsSubmitted(false);
    }
  };

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-3xl mx-auto py-6 sm:py-10 z-10 relative space-y-10 sm:space-y-14"
    >
      <header className="space-y-3">
        <span className="inline-block bg-brutal-yellow px-2 py-1 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em]">
          Translator
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
          Abstract translator
        </h1>
        <p className="text-base sm:text-lg font-bold text-brutal-ink-soft leading-snug">
          Translate the abstract answer choice into plain English. Coach feedback compares against the load-bearing keywords.
        </p>
      </header>

      <section
        aria-labelledby="abstract-source-heading"
        className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8"
      >
        <h2
          id="abstract-source-heading"
          className="text-[10px] font-black text-brutal-ink uppercase tracking-[0.2em] mb-5 bg-brutal-cyan px-2 py-1 border-2 border-brutal-ink inline-block"
        >
          The abstract
        </h2>
        <blockquote className="text-xl sm:text-2xl font-black text-brutal-ink leading-snug italic">
          “{exercise.abstract}”
        </blockquote>
        <ul className="mt-5 flex flex-wrap gap-2 list-none m-0 p-0" aria-label="Load-bearing keywords">
          {exercise.keywords.map((kw) => (
            <li
              key={kw}
              className="px-3 py-1 bg-brutal-paper text-brutal-ink border-2 border-brutal-ink font-black uppercase text-xs tracking-[0.1em] brutal-shadow-sm"
            >
              {kw}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8 space-y-6">
        <label
          htmlFor={textareaId}
          className="text-[10px] font-black text-brutal-ink uppercase tracking-[0.2em] bg-brutal-pink px-2 py-1 border-2 border-brutal-ink inline-block"
        >
          Your plain-English translation
        </label>
        <textarea
          id={textareaId}
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          disabled={isSubmitted}
          placeholder="Write the same idea using everyday language."
          className="w-full min-h-[12rem] px-5 py-4 bg-brutal-paper border-4 border-brutal-ink text-lg font-bold text-brutal-ink placeholder:text-brutal-ink-faint brutal-shadow-sm disabled:opacity-60 leading-snug"
        />

        {!isSubmitted ? (
          <button
            type="button"
            disabled={translation.trim().length === 0}
            onClick={handleSubmit}
            className="w-full min-h-[56px] bg-brutal-ink text-brutal-paper font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest hover:bg-brutal-ink/90 transition-colors brutal-shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check translation
          </button>
        ) : (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-6 pt-6 border-t-4 border-brutal-ink"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 bg-brutal-yellow border-4 border-brutal-ink brutal-shadow flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Sparkles className="w-6 h-6 text-brutal-ink" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl sm:text-2xl font-black text-brutal-ink uppercase italic tracking-tight">
                  Coach feedback
                </h3>
                <p className="text-base font-bold text-brutal-ink leading-snug">
                  {feedback?.message}
                </p>
              </div>
            </div>

            <div className="bg-brutal-cyan/25 border-4 border-brutal-ink p-5 sm:p-6 brutal-shadow-sm">
              <span className="inline-block bg-brutal-ink text-brutal-paper px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                Ideal translation
              </span>
              <p className="text-lg font-bold text-brutal-ink italic leading-snug">
                “{exercise.target}”
              </p>
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === TRANSLATION_EXERCISES.length - 1}
              className="w-full min-h-[56px] bg-brutal-pink text-brutal-ink font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-3"
            >
              {currentIndex === TRANSLATION_EXERCISES.length - 1 ? "End of exercise" : "Next translation"}
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
