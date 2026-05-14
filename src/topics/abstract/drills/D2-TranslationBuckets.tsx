import { useState } from "react";
import d2Data from "./data/d2-translation-buckets.json";
import type { TranslationBucket } from "../types";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";

interface D2Q {
  id: string;
  word_or_phrase: string;
  correct_bucket: TranslationBucket;
  explanation: string;
}

const DATA = d2Data as {
  buckets: TranslationBucket[];
  questions: D2Q[];
};

const BUCKET_LABEL: Record<TranslationBucket, string> = {
  assumption: "Assumption",
  causal: "Causal",
  comparison: "Comparison",
  evidence: "Evidence / Relevance",
  evaluation: "Evaluation",
  neutral: "Neutral",
};

export function D2TranslationBuckets() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d2");
  const q = questions[drill.questionIndex];
  const [selected, setSelected] = useState<TranslationBucket | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitted(true);
    await drill.recordAttempt({
      drillId: "d2",
      questionId: q.id,
      questionIndex: drill.questionIndex,
      correct: selected === q.correct_bucket,
      selectedAnswer: selected,
      timeMs: Date.now() - startedAt,
    });
  };

  const handleNext = () => {
    setSelected(null);
    setSubmitted(false);
    setStartedAt(Date.now());
    drill.next();
  };

  return (
    <DrillShell
      title="D2 · Translation Buckets"
      subtitle="Which kind of LSAT-ese language is this?"
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="02"
    >
      <article className="space-y-4">
        <div className="rounded-xl border border-border bg-card/50 p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Term
          </p>
          <p className="mt-2 text-2xl font-semibold">{q.word_or_phrase}</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DATA.buckets.map((b) => {
            const isPicked = selected === b;
            const isCorrect = submitted && b === q.correct_bucket;
            const isWrongPick = submitted && isPicked && b !== q.correct_bucket;
            return (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => !submitted && setSelected(b)}
                  disabled={submitted}
                  aria-pressed={isPicked}
                  className={`min-h-11 w-full rounded-md border p-3 text-left text-sm transition-colors ${
                    isCorrect
                      ? "border-state-correct/80 bg-state-correct/10"
                      : isWrongPick
                        ? "border-state-incorrect/80 bg-state-incorrect/10"
                        : isPicked
                          ? "border-primary"
                          : "border-border hover:border-primary/50"
                  }`}
                >
                  {BUCKET_LABEL[b]}
                </button>
              </li>
            );
          })}
        </ul>
        {submitted ? (
          <aside
            role="status"
            aria-live="polite"
            className="rounded-md border border-border bg-card/50 p-3 text-sm"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {selected === q.correct_bucket ? "Correct" : "Not quite"}
            </p>
            <p className="leading-relaxed">{q.explanation}</p>
          </aside>
        ) : null}
        <div className="flex justify-end gap-2">
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selected}
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Submit
            </button>
          ) : drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Next
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">Drill complete.</p>
          )}
        </div>
      </article>
    </DrillShell>
  );
}
