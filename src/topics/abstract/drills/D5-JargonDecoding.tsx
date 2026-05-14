import { useState } from "react";
import d5Data from "./data/d5-jargon.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import {
  SelfRateAfterReveal,
  type SelfRateChoice,
} from "../components/SelfRateAfterReveal";
import { CodexStamp } from "../components/CodexStamp";

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
  const [rated, setRated] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const handleNext = () => {
    setSelected(null);
    setDraft("");
    setSubmitted(false);
    setRated(false);
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
      // Definition (reveal-after): defer recordAttempt to handleRate.
      setSubmitted(true);
    }
  };

  const handleRate = async (rating: SelfRateChoice) => {
    if (q.type !== "definition") return;
    setRated(true);
    await drill.recordAttempt({
      drillId: "d5",
      questionId: q.id,
      questionIndex: drill.questionIndex,
      correct: rating !== "again",
      selectedAnswer: draft,
      timeMs: Date.now() - startedAt,
    });
  };

  const mcDone = q.type === "mc" && submitted;
  const defDone = q.type === "definition" && rated;

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
        <figure className="codex-card">
          <figcaption className="codex-eyebrow">Prompt</figcaption>
          <p className="codex-prose mt-3">{q.prompt}</p>
        </figure>
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
                    className={`min-h-11 w-full rounded-sm border bg-card/30 p-4 text-left ${
                      isCorrect
                        ? "codex-answer-correct"
                        : isWrong
                          ? "codex-answer-incorrect"
                          : isPicked
                            ? "border-primary"
                            : "border-border hover:border-primary/50"
                    }`}
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
        ) : (
          <>
            <label
              className="codex-eyebrow block"
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
              className="codex-prose w-full rounded-sm border border-border bg-card/40 p-4 text-base"
            />
          </>
        )}
        {submitted ? (
          <aside
            role="status"
            aria-live="polite"
            className="codex-card-soft p-5"
          >
            {q.type === "mc" ? (
              <CodexStamp variant={selected === q.correct ? "correct" : "incorrect"} />
            ) : (
              <p className="codex-eyebrow">Model answer</p>
            )}
            <p className="codex-prose mt-3">
              {q.type === "mc" ? q.explanation : q.model_answer}
            </p>
          </aside>
        ) : null}
        {q.type === "definition" && submitted && !rated ? (
          <SelfRateAfterReveal
            onRate={handleRate}
            prompt="How did your translation land?"
          />
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
              className="codex-btn-primary min-h-11"
            >
              {q.type === "mc" ? "Submit" : "Reveal"}
            </button>
          ) : (mcDone || defDone) && drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="codex-btn-primary min-h-11"
            >
              Next
            </button>
          ) : mcDone || defDone ? (
            <p className="codex-eyebrow">Drill complete.</p>
          ) : null}
        </div>
      </article>
    </DrillShell>
  );
}
