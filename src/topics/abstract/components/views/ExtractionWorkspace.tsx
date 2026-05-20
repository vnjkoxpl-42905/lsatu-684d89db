import { useState } from "react";
import { MATCHING_ITEMS } from "../../data/mockData";
import { cn } from "../../lib/utils";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useApp } from "../../store/AppContext";

type Verdict = "match" | "no-match" | "unsure";

const VERDICT_LABEL: Record<Verdict, string> = {
  match: "Match",
  "no-match": "No match",
  unsure: "Unsure",
};

export default function ExtractionWorkspace() {
  const { setCurrentView } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [selections, setSelections] = useState<Record<number, Verdict>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoveredPartIdx, setHoveredPartIdx] = useState<number | null>(null);

  const currentItem = MATCHING_ITEMS[currentItemIdx];

  const handleSelection = (partIdx: number, value: Verdict) => {
    if (isSubmitted) return;
    setSelections((prev) => ({ ...prev, [partIdx]: value }));
  };

  const renderStimulus = () => {
    if (!currentItem) return null;
    const text = currentItem.stimulus;
    if (hoveredPartIdx === null || !currentItem.parts[hoveredPartIdx]?.highlightText) {
      return text;
    }

    const highlight = currentItem.parts[hoveredPartIdx].highlightText!;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedHighlight})`, "gi"));

    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark
          key={i}
          className="bg-brutal-yellow text-brutal-ink border-2 border-brutal-ink px-1 mx-0.5 font-black"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const handleSubmit = () => setIsSubmitted(true);
  const handleNext = () => {
    if (currentItemIdx < MATCHING_ITEMS.length - 1) {
      setCurrentItemIdx(currentItemIdx + 1);
      setSelections({});
      setIsSubmitted(false);
    } else {
      setCurrentView("dashboard");
    }
  };

  if (!currentItem) {
    return (
      <div className="p-8 text-center text-brutal-ink-soft font-bold">
        No matching exercises found.
      </div>
    );
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-[1440px] mx-auto w-full pb-8"
    >
      <section
        aria-labelledby="step-1-heading"
        className="flex-1 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8"
      >
        <header className="mb-6 sm:mb-8 space-y-1.5">
          <span className="text-[10px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Step 1
          </span>
          <h2 id="step-1-heading" className="text-brutal-ink font-black text-2xl sm:text-3xl tracking-tight italic uppercase">
            Read stimulus
          </h2>
          <p className="text-brutal-ink-soft text-sm font-bold">Slow down. What actually happened?</p>
        </header>
        <p className="whitespace-pre-wrap text-base sm:text-lg leading-snug text-brutal-ink font-bold">
          {renderStimulus()}
        </p>
      </section>

      <section
        aria-labelledby="step-2-heading"
        className="flex-1 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8"
      >
        <header className="mb-6 sm:mb-8 space-y-1.5">
          <span className="text-[10px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Step 2
          </span>
          <h2 id="step-2-heading" className="text-brutal-ink font-black text-2xl sm:text-3xl tracking-tight italic uppercase">
            Extract keywords
          </h2>
          <p className="text-brutal-ink-soft text-sm font-bold">Break the choice into its controlling parts.</p>
        </header>

        <blockquote className="bg-brutal-pink/30 border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow mb-8">
          <p className="text-lg sm:text-xl leading-snug text-brutal-ink font-black italic">
            “{currentItem.answerChoice}”
          </p>
        </blockquote>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-brutal-ink uppercase tracking-[0.2em] bg-brutal-paper border-2 border-brutal-ink px-2 py-1 brutal-shadow-sm inline-block">
            Meaningful parts
          </h3>
          <ul className="flex flex-wrap gap-3 list-none m-0 p-0">
            {currentItem.parts.map((p, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredPartIdx(i)}
                  onMouseLeave={() => setHoveredPartIdx(null)}
                  onFocus={() => setHoveredPartIdx(i)}
                  onBlur={() => setHoveredPartIdx(null)}
                  aria-label={`Highlight stimulus phrase for: ${p.text}`}
                  className={cn(
                    "px-4 py-2 border-4 font-black text-sm uppercase tracking-tight transition-transform duration-150 min-h-[44px]",
                    hoveredPartIdx === i
                      ? "bg-brutal-ink text-brutal-paper border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none"
                      : "bg-brutal-paper border-brutal-ink text-brutal-ink brutal-shadow-sm",
                  )}
                >
                  {p.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="step-3-heading"
        className="flex-1 bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8 flex flex-col"
      >
        <header className="mb-6 sm:mb-8 space-y-1.5">
          <span className="text-[10px] font-black text-brutal-ink-soft uppercase tracking-[0.2em]">
            Step 3
          </span>
          <h2 id="step-3-heading" className="text-brutal-ink font-black text-2xl sm:text-3xl tracking-tight italic uppercase">
            Test the match
          </h2>
          <p className="text-brutal-ink-soft text-sm font-bold">Prove every part or kill the answer.</p>
        </header>

        <ol className="flex-1 space-y-6 list-none m-0 p-0" aria-label="Match verdicts">
          {currentItem.parts.map((part, i) => {
            const sel = selections[i];
            let containerClass = "bg-brutal-paper border-brutal-ink";
            let icon: React.ReactNode = null;

            if (isSubmitted) {
              const isCorrect =
                (sel === "match" && part.matches) || (sel === "no-match" && !part.matches);
              if (sel === "unsure") {
                containerClass = "bg-brutal-yellow/20 border-brutal-ink";
                icon = <HelpCircle className="w-6 h-6 text-brutal-ink shrink-0" aria-hidden="true" />;
              } else if (isCorrect) {
                containerClass = "bg-brutal-green/30 border-brutal-ink";
                icon = <CheckCircle2 className="w-6 h-6 text-brutal-ink shrink-0" aria-hidden="true" />;
              } else {
                containerClass = "bg-brutal-red/30 border-brutal-ink";
                icon = <XCircle className="w-6 h-6 text-brutal-ink shrink-0" aria-hidden="true" />;
              }
            }

            const groupId = `match-group-${i}`;
            return (
              <li
                key={i}
                onMouseEnter={() => setHoveredPartIdx(i)}
                onMouseLeave={() => setHoveredPartIdx(null)}
                className={cn(
                  "p-5 sm:p-6 border-4 flex flex-col gap-4 transition-shadow duration-150 brutal-shadow-sm",
                  containerClass,
                )}
              >
                <div className="flex items-start gap-3">
                  {icon}
                  <p id={groupId} className="text-base sm:text-lg font-bold leading-snug text-brutal-ink italic">
                    “{part.text}”
                  </p>
                </div>

                <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2">
                  {(["match", "no-match", "unsure"] as Verdict[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      role="radio"
                      aria-checked={sel === opt}
                      onClick={() => handleSelection(i, opt)}
                      disabled={isSubmitted}
                      className={cn(
                        "px-3 py-2 min-h-[40px] border-2 font-black text-xs uppercase tracking-[0.1em] transition-transform duration-100",
                        sel === opt
                          ? "bg-brutal-ink text-brutal-paper border-brutal-ink translate-x-[1px] translate-y-[1px] shadow-none"
                          : "bg-brutal-paper text-brutal-ink border-brutal-ink hover:bg-brutal-cyan/15 disabled:opacity-50 brutal-shadow-sm",
                      )}
                    >
                      {VERDICT_LABEL[opt]}
                    </button>
                  ))}
                </div>

                {isSubmitted ? (
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className="pt-4 border-t-2 border-brutal-ink"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-brutal-ink uppercase tracking-[0.15em] bg-brutal-paper border-2 border-brutal-ink px-2 py-0.5">
                        Actual
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 border-2 border-brutal-ink",
                          part.matches ? "bg-brutal-green text-brutal-ink" : "bg-brutal-red text-brutal-paper",
                        )}
                      >
                        {part.matches ? "Matches" : "Does not match"}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-brutal-ink leading-snug">
                      {part.explanation}
                    </p>
                  </motion.div>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 pt-6 border-t-4 border-brutal-ink">
          {!isSubmitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={Object.keys(selections).length !== currentItem.parts.length}
              className="w-full min-h-[56px] py-4 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black text-base sm:text-lg tracking-widest uppercase transition-transform brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0"
            >
              Submit matches
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="w-full min-h-[56px] py-4 bg-brutal-pink text-brutal-ink border-4 border-brutal-ink font-black text-base sm:text-lg tracking-widest uppercase transition-transform brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              {currentItemIdx < MATCHING_ITEMS.length - 1 ? "Next exercise" : "Finish workspace"}
            </button>
          )}
        </div>
      </section>
    </motion.div>
  );
}
