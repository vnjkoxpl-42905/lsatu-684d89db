import { useState } from "react";
import d1Data from "./data/d1-abstract-language.json";
import type { D1Question } from "../types";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import { CodexStamp } from "../components/CodexStamp";

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
      <article className="space-y-6">
        <figure className="codex-card text-center">
          <figcaption className="codex-eyebrow">Abstract phrase</figcaption>
          <p className="codex-display mt-3 text-3xl italic md:text-4xl">
            {q.phrase}
          </p>
        </figure>

        <p className="codex-marginalia" style={{ fontStyle: "normal" }}>
          Which plain-English translation matches?
        </p>

        <ul className="grid gap-2">
          {q.options.map((opt) => {
            const isPicked = selected === opt.id;
            const isCorrect = submitted && opt.id === q.correct;
            const isWrong = submitted && isPicked && opt.id !== q.correct;
            const stateClass = isCorrect
              ? "codex-answer-correct"
              : isWrong
                ? "codex-answer-incorrect"
                : isPicked
                  ? "border-primary"
                  : "border-border hover:border-primary/50";
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => !submitted && setSelected(opt.id)}
                  disabled={submitted}
                  aria-pressed={isPicked}
                  className={`min-h-11 w-full rounded-sm border bg-card/30 p-4 text-left ${stateClass}`}
                >
                  <span className="codex-mono mr-2 text-xs text-muted-foreground">
                    ({opt.id.toUpperCase()})
                  </span>
                  <span className="codex-prose">{opt.text}</span>
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
            <CodexStamp variant={selected === q.correct ? "correct" : "incorrect"} />
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
