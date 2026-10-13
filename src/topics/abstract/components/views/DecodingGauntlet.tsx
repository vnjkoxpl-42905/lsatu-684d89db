import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle, Layers, Sparkles, X } from "lucide-react";
import { ABSTRACT_CHOICES } from "../../data/mockData";
import { cn } from "../../lib/utils";
import { useApp } from "../../store/AppContext";

// DecodingGauntlet: standalone top-level surface for the 15-item abstract
// keyword + translation drill. Promoted out of LessonReader's abstract_15
// case so students can re-enter the gauntlet without scrolling through the
// lesson again. Each submission writes through recordGauntletItem which
// owns the abstract_gauntlet_attempts insert and chapter_progress mirror.

export default function DecodingGauntlet() {
  const { setCurrentView, recordGauntletItem, bootcampState } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [selectedKeywords, setSelectedKeywords] = useState<Record<number, string[]>>({});
  const [translation, setTranslation] = useState<Record<number, string>>({});
  const [checkedRequirements, setCheckedRequirements] = useState<Record<number, number[]>>({});

  const item = ABSTRACT_CHOICES[currentIndex];
  const isApplied = !!submitted[currentIndex];

  const allKeywords = useMemo(
    () => [...item.correctKeywords, ...item.distractorKeywords].sort(),
    [item],
  );
  const allRequirements = useMemo(
    () => [...item.stimulusRequirements, ...item.trapRequirements].sort(),
    [item],
  );

  const attemptedIds = useMemo(
    () => new Set(bootcampState.gauntletAttempts.map((a) => a.choiceId)),
    [bootcampState.gauntletAttempts],
  );

  const handleKeywordToggle = (kw: string) => {
    if (isApplied) return;
    setSelectedKeywords((prev) => {
      const current = prev[currentIndex] || [];
      if (current.includes(kw)) return { ...prev, [currentIndex]: current.filter((k) => k !== kw) };
      return { ...prev, [currentIndex]: [...current, kw] };
    });
  };

  const handleRequirementToggle = (reqIndex: number) => {
    if (isApplied) return;
    setCheckedRequirements((prev) => {
      const current = prev[currentIndex] || [];
      if (current.includes(reqIndex)) return { ...prev, [currentIndex]: current.filter((i) => i !== reqIndex) };
      return { ...prev, [currentIndex]: [...current, reqIndex] };
    });
  };

  const handleSubmit = async () => {
    const picked = selectedKeywords[currentIndex] || [];
    const trans = translation[currentIndex] || "";
    const reqs = checkedRequirements[currentIndex] || [];
    // Score keyword accuracy: each correct keyword picked + each distractor avoided
    const correctlyPicked = picked.filter((k) => item.correctKeywords.includes(k)).length;
    setSubmitted((prev) => ({ ...prev, [currentIndex]: true }));
    await recordGauntletItem({
      choiceId: item.id,
      keywordsPicked: picked,
      translationText: trans,
      requirementsChecked: reqs,
      correctCount: correctlyPicked,
    });
  };

  const next = () => {
    if (currentIndex < ABSTRACT_CHOICES.length - 1) setCurrentIndex((i) => i + 1);
    else setCurrentView("dashboard");
  };

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  return (
    <div className="max-w-4xl mx-auto px-1 sm:px-6 py-8 sm:py-12 space-y-10">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="w-10 h-10 bg-brutal-pink text-brutal-ink border-2 border-brutal-ink flex items-center justify-center brutal-shadow-sm"
          >
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
            15-item decoder
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
          The Decoding Gauntlet
        </h1>
        <p className="text-sm sm:text-base font-bold text-brutal-ink-soft leading-snug max-w-prose">
          Pick the load-bearing keywords, translate the abstract choice, and check the requirements the stimulus must satisfy. Each item is logged and rolls up into your dashboard.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 justify-start pb-6 border-b-4 border-brutal-ink">
        {ABSTRACT_CHOICES.map((c, i) => {
          const alreadyAttempted = attemptedIds.has(c.id) || submitted[i];
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCurrentIndex(i)}
              aria-label={`Jump to item ${i + 1}`}
              aria-current={currentIndex === i ? "step" : undefined}
              className={cn(
                "w-10 h-10 border-2 border-brutal-ink flex items-center justify-center text-sm font-black transition-all brutal-shadow-sm",
                currentIndex === i
                  ? "bg-brutal-ink text-brutal-paper translate-x-[2px] translate-y-[2px] shadow-none"
                  : alreadyAttempted
                  ? "bg-brutal-green text-brutal-ink"
                  : "bg-brutal-paper text-brutal-ink hover:bg-brutal-cyan/20",
              )}
            >
              {alreadyAttempted ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : i + 1}
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <span className="text-[12px] font-black text-brutal-ink bg-brutal-cyan px-2 py-1 border-2 border-brutal-ink uppercase tracking-widest inline-block">
          Item {currentIndex + 1} of {ABSTRACT_CHOICES.length}
        </span>
        <div className="bg-brutal-paper p-8 sm:p-10 border-4 border-brutal-ink brutal-shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-8 h-8 bg-brutal-yellow border-l-4 border-b-4 border-brutal-ink" />
          <p className="text-xl sm:text-2xl leading-tight text-brutal-ink font-black uppercase italic tracking-tighter">
            "{item.original}"
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-brutal-paper border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">
          1. Pick the keywords doing the work
        </h2>
        <div className="flex flex-wrap gap-3">
          {allKeywords.map((kw) => {
            const selected = (selectedKeywords[currentIndex] || []).includes(kw);
            const correct = item.correctKeywords.includes(kw);
            return (
              <button
                key={kw}
                type="button"
                disabled={isApplied}
                onClick={() => handleKeywordToggle(kw)}
                aria-pressed={selected}
                className={cn(
                  "px-4 py-2 border-4 font-black transition-all brutal-shadow-sm uppercase tracking-tight text-sm",
                  isApplied
                    ? correct
                      ? "bg-brutal-green text-brutal-ink border-brutal-ink"
                      : selected
                      ? "bg-brutal-red text-brutal-paper border-brutal-ink"
                      : "bg-brutal-paper border-brutal-ink opacity-30"
                    : selected
                    ? "bg-brutal-ink text-brutal-paper border-brutal-ink translate-x-[1px] translate-y-[1px] shadow-none"
                    : "bg-brutal-paper border-brutal-ink text-brutal-ink hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_var(--brutal-ink)]",
                )}
              >
                {kw}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-brutal-paper border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">
          2. Translate into plain English
        </h2>
        <textarea
          disabled={isApplied}
          value={translation[currentIndex] || ""}
          onChange={(e) =>
            setTranslation((prev) => ({ ...prev, [currentIndex]: e.target.value }))
          }
          placeholder="Decode the choice."
          className="w-full bg-brutal-paper border-4 border-brutal-ink p-5 sm:p-6 text-lg sm:text-xl font-black text-brutal-ink placeholder:text-brutal-ink/30 focus:outline-none brutal-shadow-lg min-h-[140px] uppercase tracking-tighter italic"
        />
      </section>

      <section className="space-y-5">
        <h2 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-brutal-paper border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">
          3. Stimulus checklist
        </h2>
        <div className="grid gap-3">
          {allRequirements.map((req, i) => {
            const checked = (checkedRequirements[currentIndex] || []).includes(i);
            const isCorrect = item.stimulusRequirements.includes(req);
            return (
              <button
                key={i}
                type="button"
                disabled={isApplied}
                onClick={() => handleRequirementToggle(i)}
                aria-pressed={checked}
                className={cn(
                  "flex items-start gap-4 p-5 sm:p-6 border-4 transition-all text-left brutal-shadow-sm",
                  isApplied
                    ? isCorrect
                      ? "bg-brutal-green border-brutal-ink text-brutal-ink font-black"
                      : checked
                      ? "bg-brutal-red border-brutal-ink text-brutal-paper font-black"
                      : "bg-brutal-paper border-brutal-ink opacity-30"
                    : checked
                    ? "bg-brutal-cyan border-brutal-ink text-brutal-ink font-black"
                    : "bg-brutal-paper border-brutal-ink text-brutal-ink hover:bg-brutal-cyan/10",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 border-2 border-brutal-ink mt-0.5 flex-shrink-0 flex items-center justify-center",
                    checked ? "bg-brutal-ink text-brutal-paper" : "bg-brutal-paper",
                  )}
                >
                  {/*
                    Same fix as LessonReader: the tick used to render on a
                    wrongly-checked row, contradicting the red fill. See the note
                    there and docs/chart-palette.md §3.
                  */}
                  {isApplied
                    ? checked
                      ? isCorrect
                        ? <CheckCircle className="w-4 h-4" aria-label="Correctly selected" />
                        : <X className="w-4 h-4" strokeWidth={3} aria-label="Wrongly selected" />
                      : isCorrect
                        ? <CheckCircle className="w-4 h-4 opacity-60" aria-label="Missed — should have been selected" />
                        : null
                    : checked && <CheckCircle className="w-4 h-4" aria-label="Selected" />}
                </div>
                <span className="text-base sm:text-lg font-bold leading-tight uppercase tracking-tight">
                  {req}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="pt-8 border-t-4 border-brutal-ink">
        {!isApplied ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-5 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black text-lg sm:text-xl tracking-widest hover:bg-brutal-ink/90 transition-all uppercase brutal-shadow"
          >
            Confirm translation
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            <div className="bg-brutal-green border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow">
              <h3 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest mb-3 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                Official translation
              </h3>
              <p className="text-xl sm:text-2xl text-brutal-ink font-black italic uppercase leading-tight tracking-tighter">
                "{item.plainEnglish}"
              </p>
            </div>

            <div className="bg-brutal-paper border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow">
              <h3 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest mb-3">
                Coach note
              </h3>
              <p className="text-base sm:text-lg text-brutal-ink font-bold leading-snug">
                {item.coachNote}
              </p>
              {item.example && (
                <div className="mt-5 bg-brutal-yellow p-5 border-2 border-brutal-ink brutal-shadow-sm">
                  <span className="text-[10px] font-black text-brutal-ink uppercase tracking-widest block mb-2">
                    Concrete example
                  </span>
                  <p className="text-sm sm:text-base text-brutal-ink font-bold italic leading-snug">
                    {item.example}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={prev}
                disabled={currentIndex === 0}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-brutal-paper border-4 border-brutal-ink text-brutal-ink font-black text-sm hover:bg-brutal-ink hover:text-brutal-paper transition-all brutal-shadow disabled:opacity-30 disabled:cursor-not-allowed uppercase"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                onClick={next}
                className="flex-1 inline-flex items-center justify-center gap-2 py-4 bg-brutal-pink text-brutal-ink border-4 border-brutal-ink font-black text-sm tracking-widest hover:bg-brutal-pink/90 transition-all uppercase brutal-shadow"
              >
                {currentIndex === ABSTRACT_CHOICES.length - 1 ? "Finish gauntlet" : "Next item"}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
