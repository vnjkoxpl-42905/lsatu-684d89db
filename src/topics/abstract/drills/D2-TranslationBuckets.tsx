import { useState } from "react";
import d2Data from "./data/d2-translation-buckets.json";
import type { TranslationBucket } from "../types";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import { CodexStamp } from "../components/CodexStamp";

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
      <article className="space-y-6">
        <figure className="codex-card text-center">
          <figcaption className="codex-eyebrow">Term</figcaption>
          <p className="codex-display mt-3 text-3xl md:text-4xl">
            {q.word_or_phrase}
          </p>
        </figure>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DATA.buckets.map((b) => {
            const isPicked = selected === b;
            const isCorrect = submitted && b === q.correct_bucket;
            const isWrongPick = submitted && isPicked && b !== q.correct_bucket;
            const stateClass = isCorrect
              ? "codex-answer-correct"
              : isWrongPick
                ? "codex-answer-incorrect"
                : isPicked
                  ? "border-primary"
                  : "border-border hover:border-primary/50";
            return (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => !submitted && setSelected(b)}
                  disabled={submitted}
                  aria-pressed={isPicked}
                  className={`min-h-11 w-full rounded-sm border bg-card/30 p-4 text-left transition-colors ${stateClass}`}
                >
                  <span className="codex-prose text-base">{BUCKET_LABEL[b]}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {submitted ? (
          <aside
            role="status"
            aria-live="polite"
            className="codex-card-soft p-5"
          >
            <CodexStamp variant={selected === q.correct_bucket ? "correct" : "incorrect"} />
            <p className="codex-prose mt-3">{q.explanation}</p>
          </aside>
        ) : null}
        <div className="flex justify-end gap-2">
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selected}
              className="codex-btn-primary min-h-11"
            >
              Submit
            </button>
          ) : drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="codex-btn-primary min-h-11"
            >
              Next
            </button>
          ) : (
            <p className="codex-eyebrow">Drill complete.</p>
          )}
        </div>
      </article>
    </DrillShell>
  );
}
