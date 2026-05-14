import { useState } from "react";
import d1Data from "./data/d1-abstract-language.json";
import type { D1Question } from "../types";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";

const DATA = d1Data as { questions: D1Question[] };

export function D1AbstractLanguage() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d1");
  const q = questions[drill.questionIndex];
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitted(true);
    await drill.recordAttempt({
      drillId: "d1",
      questionId: q.id,
      questionIndex: drill.questionIndex,
      correct: selected === q.correct,
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
      title="D1 · Abstract Language Warm-Up"
      subtitle="Translate abstract LSAT phrases into plain English."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="07"
    >
      <article className="space-y-4">
        <div className="rounded-xl border border-border bg-card/50 p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Abstract phrase
          </p>
          <p className="mt-2 text-2xl font-semibold italic">{q.phrase}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Which plain-English translation matches?
        </p>
        <ul className="grid gap-2">
          {q.options.map((opt) => {
            const isPicked = selected === opt.id;
            const isCorrect = submitted && opt.id === q.correct;
            const isWrong = submitted && isPicked && opt.id !== q.correct;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => !submitted && setSelected(opt.id)}
                  disabled={submitted}
                  aria-pressed={isPicked}
                  className={`min-h-11 w-full rounded-md border p-3 text-left text-sm ${
                    isCorrect
                      ? "border-state-correct/80 bg-state-correct/10"
                      : isWrong
                        ? "border-state-incorrect/80 bg-state-incorrect/10"
                        : isPicked
                          ? "border-primary"
                          : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="mr-2 font-mono text-xs">
                    ({opt.id.toUpperCase()})
                  </span>
                  {opt.text}
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
              {selected === q.correct ? "Correct" : "Not quite"}
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
