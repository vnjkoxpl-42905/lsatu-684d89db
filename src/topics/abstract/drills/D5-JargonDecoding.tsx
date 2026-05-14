import { useState } from "react";
import d5Data from "./data/d5-jargon.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";

interface D5MC {
  id: string;
  type: "mc";
  prompt: string;
  options: { id: string; text: string }[];
  correct: string;
  explanation: string;
}
interface D5Def {
  id: string;
  type: "definition";
  prompt: string;
  model_answer: string;
}

type D5Q = D5MC | D5Def;
const DATA = d5Data as { questions: D5Q[] };

export function D5JargonDecoding() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d5");
  const q = questions[drill.questionIndex];
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const handleNext = () => {
    setSelected(null);
    setDraft("");
    setSubmitted(false);
    setStartedAt(Date.now());
    drill.next();
  };

  const handleSubmit = async () => {
    if (q.type === "mc") {
      if (!selected) return;
      setSubmitted(true);
      await drill.recordAttempt({
        drillId: "d5",
        questionId: q.id,
        questionIndex: drill.questionIndex,
        correct: selected === q.correct,
        selectedAnswer: selected,
        timeMs: Date.now() - startedAt,
      });
    } else {
      setSubmitted(true);
      await drill.recordAttempt({
        drillId: "d5",
        questionId: q.id,
        questionIndex: drill.questionIndex,
        correct: draft.trim().length >= 20,
        selectedAnswer: draft,
        timeMs: Date.now() - startedAt,
      });
    }
  };

  return (
    <DrillShell
      title="D5 · Jargon Decoding"
      subtitle="Decode LSAT-ese into plain English. MC + reveal-after definitions."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="07"
    >
      <article className="space-y-4">
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Prompt
          </p>
          <p className="mt-2 leading-relaxed">{q.prompt}</p>
        </div>
        {q.type === "mc" ? (
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
        ) : (
          <>
            <label
              className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              htmlFor="d5-draft"
            >
              Your answer
            </label>
            <textarea
              id="d5-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={submitted}
              rows={4}
              className="w-full rounded-md border border-border bg-background p-3 text-sm"
            />
          </>
        )}
        {submitted ? (
          <aside
            role="status"
            aria-live="polite"
            className="rounded-md border border-border bg-card/50 p-3 text-sm"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {q.type === "mc"
                ? selected === q.correct
                  ? "Correct"
                  : "Not quite"
                : "Model answer"}
            </p>
            <p className="leading-relaxed">
              {q.type === "mc" ? q.explanation : q.model_answer}
            </p>
          </aside>
        ) : null}
        <div className="flex justify-end gap-2">
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                q.type === "mc"
                  ? !selected
                  : draft.trim().length < 4
              }
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {q.type === "mc" ? "Submit" : "Reveal"}
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
