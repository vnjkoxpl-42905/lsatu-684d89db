import { useMemo, useState } from "react";
import { METHOD_PATTERNS } from "../../data/mockData";
import { cn } from "../../lib/utils";
import { CheckCircle, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import type { MethodPattern } from "../../types";

// 10-question identification drill: given a method pattern's `name`, pick
// the matching plain-English translation from 4 options. Reveals after each
// pick and rolls a final score at the end. Lightweight client-only drill,
// not persisted; the audit fix brief explicitly scopes this as practice
// reps inside the library, not a graded surface.

const TOTAL_QUESTIONS = 10;
const CHOICES_PER_QUESTION = 4;

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface DrillItem {
  pattern: MethodPattern;
  options: MethodPattern[];
  correctIndex: number;
}

function buildItems(): DrillItem[] {
  const shuffled = shuffle(METHOD_PATTERNS);
  const subset = shuffled.slice(0, TOTAL_QUESTIONS);
  return subset.map((pattern) => {
    const distractors = shuffle(METHOD_PATTERNS.filter((p) => p.id !== pattern.id)).slice(
      0,
      CHOICES_PER_QUESTION - 1,
    );
    const choices = shuffle([pattern, ...distractors]);
    return {
      pattern,
      options: choices,
      correctIndex: choices.findIndex((c) => c.id === pattern.id),
    };
  });
}

export default function MethodsDrill() {
  const [items, setItems] = useState<DrillItem[]>(() => buildItems());
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = items[index];
  const accuracy = useMemo(() => (items.length > 0 ? Math.round((score / items.length) * 100) : 0), [score, items.length]);

  const handlePick = (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === current.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (index === items.length - 1) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const handleReset = () => {
    setItems(buildItems());
    setIndex(0);
    setPicked(null);
    setScore(0);
    setDone(false);
  };

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 border-2 border-brutal-ink bg-brutal-yellow text-[11px] font-black uppercase tracking-[0.2em]">
          <Trophy className="w-4 h-4" aria-hidden="true" />
          Drill complete
        </div>
        <h2 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-brutal-ink">
          {score}/{items.length}
        </h2>
        <p className="text-base font-bold text-brutal-ink-soft">
          {accuracy}% accuracy across {items.length} method patterns.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-2 px-5 py-3 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-widest text-sm brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Run another set
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
            Identify the method
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
            {index + 1} / {items.length} · Score {score}
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-brutal-ink uppercase italic tracking-tighter leading-tight">
          {current.pattern.name}
        </h2>
        <p className="text-sm font-bold text-brutal-ink-soft">
          Pick the plain-English translation that matches the pattern above.
        </p>
      </header>

      <ul className="space-y-3 list-none m-0 p-0" role="radiogroup">
        {current.options.map((opt, idx) => {
          const isPicked = picked === idx;
          const isCorrect = idx === current.correctIndex;
          let cls = "bg-brutal-paper border-brutal-ink text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_var(--brutal-ink)]";
          if (picked !== null) {
            if (isCorrect) cls = "bg-brutal-green border-brutal-ink text-brutal-ink";
            else if (isPicked) cls = "bg-brutal-red border-brutal-ink text-brutal-paper";
            else cls = "bg-brutal-paper border-brutal-ink text-brutal-ink-soft opacity-70";
          }
          return (
            <li key={opt.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={picked !== null}
                onClick={() => handlePick(idx)}
                className={cn(
                  "w-full text-left p-4 sm:p-5 border-4 transition-transform duration-150 flex items-start gap-3 brutal-shadow-sm",
                  cls,
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center border-2 border-brutal-ink font-black text-xs sm:text-sm shrink-0",
                    isPicked ? "bg-brutal-ink text-brutal-paper" : "bg-brutal-paper text-brutal-ink",
                  )}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm sm:text-base font-bold leading-snug">{opt.plainEnglish}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {picked !== null && (
        <div className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-5 sm:p-6 space-y-3">
          <p
            className={cn(
              "text-lg sm:text-xl font-black uppercase italic tracking-tight inline-flex items-center gap-2",
              picked === current.correctIndex ? "text-brutal-green" : "text-brutal-red",
            )}
          >
            {picked === current.correctIndex ? (
              <>
                <CheckCircle className="w-5 h-5" aria-hidden="true" />
                Correct
              </>
            ) : (
              "Not quite"
            )}
          </p>
          <p className="text-sm sm:text-base font-bold text-brutal-ink leading-snug">
            <span className="font-black uppercase text-xs tracking-[0.15em] mr-2">Must happen:</span>
            {current.pattern.mustHappen}
          </p>
          <button
            type="button"
            onClick={handleNext}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-brutal-ink text-brutal-paper border-4 border-brutal-ink font-black uppercase tracking-widest text-sm brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_var(--brutal-ink)] transition-transform"
          >
            {index === items.length - 1 ? "Finish" : "Next"}
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
