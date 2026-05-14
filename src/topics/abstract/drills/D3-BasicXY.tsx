import { useState } from "react";
import d3Data from "./data/d3-basic-xy.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import { CodexStamp } from "../components/CodexStamp";

interface D3Q {
  id: string;
  phrase: string;
  options: { id: string; text: string }[];
  correct: string;
  explanation: string;
}

const DATA = d3Data as { questions: D3Q[] };

export function D3BasicXY() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d3");
  const q = questions[drill.questionIndex];
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitted(true);
    await drill.recordAttempt({
      drillId: "d3",
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
      title="D3 · Basic X/Y Parsing"
      subtitle="Find the directional word. Then map X and Y."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="05"
    >
      <article className="space-y-6">
        <figure className="codex-card text-center">
          <figcaption className="codex-eyebrow">Abstract phrase</figcaption>
          <p className="codex-display mt-3 text-2xl italic md:text-3xl">
            {q.phrase}
          </p>
        </figure>
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
