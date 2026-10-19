import { useId, useMemo, useState } from "react";
import { ChevronRight, Sparkles, BookOpen, ListChecks, FileText } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { TRANSLATOR_ITEMS } from "../../data/translatorItems";
import { useApp } from "../../store/AppContext";

// Word-level tokenizer for the stem text. Splits on whitespace while
// preserving the original tokens so the renderer can put trailing
// punctuation back. Each token gets a stable index used as its React key.
interface StemToken {
  raw: string;
  // Lowercased, alphanumeric-only form used for keyword matching.
  normalized: string;
  // True when the token contains at least one alphanumeric character. Pure
  // punctuation tokens (commas, colons) are rendered inline and not clickable.
  clickable: boolean;
}

function tokenize(stem: string): StemToken[] {
  const out: StemToken[] = [];
  // Match either a word-like chunk (letters/digits/apostrophes) or a single
  // non-space character (punctuation). Whitespace is dropped so we rebuild
  // it with CSS gaps.
  const re = /([A-Za-z0-9']+|[^\sA-Za-z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(stem)) !== null) {
    const raw = m[0];
    const normalized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    out.push({ raw, normalized, clickable: normalized.length > 0 });
  }
  return out;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function TranslatorWorkspace() {
  const { markTranslatorComplete, setCurrentView, bootcampState } = useApp();
  const prefersReducedMotion = useReducedMotion();
  const textareaId = useId();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pickedTokens, setPickedTokens] = useState<Record<number, boolean>>({});
  const [translation, setTranslation] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const item = TRANSLATOR_ITEMS[currentIndex];
  const tokens = useMemo(() => tokenize(item.stemText), [item.stemText]);
  const correctSet = useMemo(
    () => new Set(item.correctKeywords.map(normalize)),
    [item.correctKeywords],
  );

  const pickedWords = useMemo(
    () =>
      tokens
        .map((t, i) => (pickedTokens[i] ? t.normalized : null))
        .filter((w): w is string => Boolean(w)),
    [tokens, pickedTokens],
  );
  const pickedCount = pickedWords.length;
  const trimmedTranslation = translation.trim();
  const canSubmit = pickedCount >= 1 && trimmedTranslation.length >= 10 && !isSubmitted;

  // Bootcamp progress: a stem is "completed" if the student has submitted
  // an attempt for it. We dedupe by stemNumber against bootcampState.
  const completedStemNumbers = useMemo(() => {
    const set = new Set<number>();
    for (const a of bootcampState.translatorAttempts) set.add(a.stemNumber);
    return set;
  }, [bootcampState.translatorAttempts]);

  const handleTokenClick = (i: number) => {
    if (isSubmitted || !tokens[i].clickable) return;
    setPickedTokens((prev) => ({ ...prev, [i]: !prev[i] }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitted(true);
    const res = await markTranslatorComplete(item.stemNumber, pickedWords, trimmedTranslation);
    if (!res.ok) {
      // Toast already fires from AppContext; keep submitted state so the
      // reveal panel is visible. Student can read the walkthrough even
      // when persistence fails.
    }
  };

  const handleNext = () => {
    if (currentIndex < TRANSLATOR_ITEMS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPickedTokens({});
      setTranslation("");
      setIsSubmitted(false);
    } else {
      toast.success("Translator drill complete. All 14 stems decoded.");
      setCurrentView("dashboard");
    }
  };

  // Keyword accuracy diagnostics for the reveal panel.
  const matched = pickedWords.filter((w) => correctSet.has(w));
  const wrongPicks = pickedWords.filter((w) => !correctSet.has(w));
  const missed = item.correctKeywords.filter((kw) => !pickedWords.includes(normalize(kw)));

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 z-10 relative space-y-10 sm:space-y-14">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-block bg-brutal-yellow px-2 py-1 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em]">
            Translator drill
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
            Stem {item.stemNumber} of {TRANSLATOR_ITEMS.length}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brutal-ink-soft">
            {completedStemNumbers.size} completed
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-brutal-ink leading-tight uppercase italic">
          Question stem translator
        </h1>
        <p className="text-base sm:text-lg font-bold text-brutal-ink-soft leading-snug">
          Click the load-bearing keywords inside the stem, then write the plain-English version. Coach feedback compares against the verbatim walkthrough.
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TRANSLATOR_ITEMS.length}
          aria-valuenow={completedStemNumbers.size}
          aria-label={`Translator progress: ${completedStemNumbers.size} of ${TRANSLATOR_ITEMS.length} stems completed`}
          className="w-full h-3 bg-brutal-paper border-2 border-brutal-ink p-0.5"
        >
          <div
            className="h-full bg-brutal-cyan transition-[width] duration-300"
            style={{
              width: `${(completedStemNumbers.size / TRANSLATOR_ITEMS.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <section
        aria-labelledby="step-1-heading"
        className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-block bg-brutal-cyan px-2 py-1 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em]">
            Step 1
          </span>
          <h2 id="step-1-heading" className="text-lg sm:text-xl font-black uppercase italic tracking-tight">
            Pick the keywords doing the work
          </h2>
        </div>
        <p className="text-sm font-bold text-brutal-ink-soft leading-snug">
          Tap each word in the stem that controls its meaning. Skip filler verbs (used, is, makes). Keep nouns, action verbs, and qualifiers.
        </p>
        <p
          className="text-xl sm:text-2xl font-black text-brutal-ink leading-snug italic"
          aria-label={`Stem text: ${item.stemText}`}
        >
          {tokens.map((t, i) => {
            const picked = !!pickedTokens[i];
            if (!t.clickable) {
              return (
                <span key={i} aria-hidden="true">
                  {t.raw}
                </span>
              );
            }
            const isCorrect = isSubmitted && correctSet.has(t.normalized);
            const isWrongPick = isSubmitted && picked && !correctSet.has(t.normalized);
            const isMissed = isSubmitted && !picked && correctSet.has(t.normalized);
            return (
              <button
                key={i}
                type="button"
                disabled={isSubmitted}
                aria-pressed={picked}
                onClick={() => handleTokenClick(i)}
                className={cn(
                  "inline-block mx-0.5 px-1 leading-none align-baseline transition-colors",
                  !isSubmitted &&
                    "hover:bg-brutal-yellow/40 disabled:cursor-default",
                  picked && !isSubmitted && "bg-brutal-yellow",
                  isCorrect && "bg-brutal-green",
                  isWrongPick && "bg-brutal-red text-brutal-paper",
                  isMissed && "bg-brutal-yellow/60 underline decoration-brutal-red decoration-2",
                )}
              >
                {" "}
                {t.raw}
                {" "}
              </button>
            );
          })}
        </p>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-brutal-ink-soft">
          {pickedCount === 0
            ? "No keywords picked yet"
            : pickedCount === 1
              ? "1 keyword picked"
              : `${pickedCount} keywords picked`}
        </p>
      </section>

      <section className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-block bg-brutal-pink px-2 py-1 border-2 border-brutal-ink text-[10px] font-black uppercase tracking-[0.2em]">
            Step 2
          </span>
          <h2 className="text-lg sm:text-xl font-black uppercase italic tracking-tight">
            Translate the stem
          </h2>
        </div>
        <label
          htmlFor={textareaId}
          className="block text-sm font-bold text-brutal-ink-soft leading-snug"
        >
          What is this answer choice saying? What must be true in the stimulus?
        </label>
        <textarea
          id={textareaId}
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          disabled={isSubmitted || pickedCount === 0}
          placeholder={
            pickedCount === 0
              ? "Pick at least one keyword above to start typing."
              : "Write the same idea in everyday language. At least 10 characters."
          }
          className="w-full min-h-[10rem] px-5 py-4 bg-brutal-paper border-4 border-brutal-ink text-base sm:text-lg font-bold text-brutal-ink placeholder:text-brutal-ink-faint brutal-shadow-sm disabled:opacity-60 leading-snug"
        />
        {!isSubmitted ? (
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full min-h-[56px] bg-brutal-ink text-brutal-paper font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest hover:bg-brutal-ink/90 transition-colors brutal-shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Reveal walkthrough
          </button>
        ) : null}
      </section>

      {isSubmitted ? (
        <motion.section
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
          className="space-y-8 sm:space-y-12"
        >
          <article className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div
                aria-hidden="true"
                className="w-12 h-12 bg-brutal-yellow border-4 border-brutal-ink brutal-shadow flex items-center justify-center shrink-0"
              >
                <Sparkles className="w-6 h-6 text-brutal-ink" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
                  Keyword accuracy
                </h3>
                <p className="text-sm font-bold text-brutal-ink-soft leading-snug">
                  Green = matched a load-bearing keyword. Red = wrong pick. Striped yellow = a keyword you missed.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 sm:gap-5 text-sm font-bold text-brutal-ink">
              <div className="bg-brutal-green/20 border-2 border-brutal-ink p-3 sm:p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.15em]">Matched</dt>
                <dd className="text-2xl font-black">{matched.length}</dd>
              </div>
              <div className="bg-brutal-red/20 border-2 border-brutal-ink p-3 sm:p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.15em]">Wrong picks</dt>
                <dd className="text-2xl font-black">{wrongPicks.length}</dd>
              </div>
              <div className="bg-brutal-yellow/30 border-2 border-brutal-ink p-3 sm:p-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.15em]">Missed</dt>
                <dd className="text-2xl font-black">{missed.length}</dd>
              </div>
            </dl>

            {missed.length > 0 ? (
              <p className="text-sm font-bold text-brutal-ink-soft leading-snug">
                Keywords you missed:{" "}
                <span className="text-brutal-ink">
                  {missed.map((m, i) => (
                    <span key={m} className="inline-block bg-brutal-yellow/60 border-2 border-brutal-ink px-2 py-0.5 mx-1 font-black uppercase text-xs">
                      {m}
                      {i < missed.length - 1 ? "" : ""}
                    </span>
                  ))}
                </span>
              </p>
            ) : null}
          </article>

          <article className="bg-brutal-cyan/25 border-4 border-brutal-ink p-6 sm:p-8 brutal-shadow">
            <span className="inline-block bg-brutal-ink text-brutal-paper px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              Ideal translation
            </span>
            <p className="text-lg sm:text-xl font-bold text-brutal-ink italic leading-snug">
              {item.idealTranslation}
            </p>
          </article>

          <article className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow-lg p-6 sm:p-8 space-y-5">
            <header className="flex items-center gap-3">
              <BookOpen className="w-5 h-5" aria-hidden="true" />
              <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
                Walkthrough
              </h3>
            </header>
            <div className="space-y-4 text-base font-bold text-brutal-ink leading-snug">
              {item.walkthrough.reasoning.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </article>

          {item.walkthrough.vocab.length > 0 ? (
            <article aria-labelledby="vocab-heading" className="space-y-4">
              <h3
                id="vocab-heading"
                className="text-lg sm:text-xl font-black uppercase italic tracking-tight"
              >
                Words to know
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.walkthrough.vocab.map((v) => (
                  <div
                    key={v.term}
                    className="bg-brutal-yellow/20 border-4 border-brutal-ink brutal-shadow p-5 space-y-2"
                  >
                    <span className="inline-block bg-brutal-ink text-brutal-paper px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em]">
                      {v.term}
                    </span>
                    <p className="text-lg font-black uppercase italic tracking-tight leading-snug">
                      {v.meaning}
                    </p>
                    {v.note ? (
                      <p className="text-sm font-bold text-brutal-ink-soft leading-snug">
                        {v.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          <article aria-labelledby="reqs-heading" className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-6 sm:p-8 space-y-4">
            <header className="flex items-center gap-3">
              <ListChecks className="w-5 h-5" aria-hidden="true" />
              <h3 id="reqs-heading" className="text-lg sm:text-xl font-black uppercase italic tracking-tight">
                Stimulus requirements
              </h3>
            </header>
            <ul className="space-y-3 list-none m-0 p-0">
              {item.walkthrough.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="w-6 h-6 shrink-0 mt-0.5 bg-brutal-paper border-2 border-brutal-ink flex items-center justify-center text-[11px] font-black"
                  >
                    {i + 1}
                  </span>
                  <span className="text-base font-bold text-brutal-ink leading-snug">{req}</span>
                </li>
              ))}
            </ul>
          </article>

          <article aria-labelledby="example-heading" className="bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-6 sm:p-8 space-y-4">
            <header className="flex items-center gap-3">
              <FileText className="w-5 h-5" aria-hidden="true" />
              <h3 id="example-heading" className="text-lg sm:text-xl font-black uppercase italic tracking-tight">
                Worked example
              </h3>
            </header>
            <blockquote className="bg-brutal-ink/5 border-4 border-brutal-ink p-5 sm:p-6">
              <p className="text-base sm:text-lg font-bold text-brutal-ink italic leading-snug whitespace-pre-line">
                {item.walkthrough.example.stimulus}
              </p>
            </blockquote>
            <p className="text-sm sm:text-base font-bold text-brutal-ink-soft leading-snug">
              {item.walkthrough.example.explanation}
            </p>
          </article>

          <button
            type="button"
            onClick={handleNext}
            className="w-full min-h-[56px] bg-brutal-pink text-brutal-ink font-black py-4 border-4 border-brutal-ink text-base sm:text-lg uppercase tracking-widest brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-transform flex justify-center items-center gap-3"
          >
            {currentIndex < TRANSLATOR_ITEMS.length - 1 ? "Next stem" : "Finish translator"}
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </motion.section>
      ) : null}
    </div>
  );
}
