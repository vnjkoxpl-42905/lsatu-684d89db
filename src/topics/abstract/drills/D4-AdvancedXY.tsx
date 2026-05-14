import { useState } from "react";
import d4Data from "./data/d4-advanced-xy.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import {
  SelfRateAfterReveal,
  type SelfRateChoice,
} from "../components/SelfRateAfterReveal";
import { CodexStamp } from "../components/CodexStamp";

interface D4MC {
  id: string;
  type: "mc";
  phrase: string;
  options: { id: string; text: string }[];
  correct: string;
  explanation: string;
}
interface D4RE {
  id: string;
  type: "reverse-engineer";
  flaw_description: string;
  model_answer: { logic_summary: string; example: string };
}

type D4Q = D4MC | D4RE;
const DATA = d4Data as { questions: D4Q[] };

export function D4AdvancedXY() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d4");
  const q = questions[drill.questionIndex];
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [rated, setRated] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const reset = () => {
    setSelected(null);
    setDraft("");
    setSubmitted(false);
    setRated(false);
    setStartedAt(Date.now());
  };

  const handleNext = () => {
    reset();
    drill.next();
  };

  const handleSubmit = async () => {
    if (q.type === "mc") {
      if (!selected) return;
      setSubmitted(true);
      await drill.recordAttempt({
        drillId: "d4",
        questionId: q.id,
        questionIndex: drill.questionIndex,
        correct: selected === q.correct,
        selectedAnswer: selected,
        timeMs: Date.now() - startedAt,
      });
    } else {
      // Reverse-engineer: defer recordAttempt to handleRate (self-rate after reveal).
      setSubmitted(true);
    }
  };

  const handleRate = async (rating: SelfRateChoice) => {
    if (q.type !== "reverse-engineer") return;
    setRated(true);
    await drill.recordAttempt({
      drillId: "d4",
      questionId: q.id,
      questionIndex: drill.questionIndex,
      correct: rating !== "again",
      selectedAnswer: draft,
      timeMs: Date.now() - startedAt,
    });
  };

  return (
    <DrillShell
      title="D4 · Advanced X/Y + Reverse Engineering"
      subtitle="Harder X/Y phrases, plus name-the-flaw exercises."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="06"
    >
      {q.type === "mc" ? (
        <article className="space-y-4">
          <figure className="codex-card">
            <figcaption className="codex-eyebrow">Abstract phrase</figcaption>
            <p className="codex-display mt-3 text-xl italic md:text-2xl">{q.phrase}</p>
          </figure>
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
      ) : (
        <article className="space-y-4">
          <figure className="codex-card">
            <figcaption className="codex-eyebrow">Flaw to reverse-engineer</figcaption>
            <p className="codex-prose mt-3 italic">{q.flaw_description}</p>
          </figure>
          <label
            className="codex-eyebrow block"
            htmlFor="d4-draft"
          >
            Your concrete example
          </label>
          <textarea
            id="d4-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={submitted}
            rows={5}
            placeholder="Write a one- or two-sentence everyday example that commits this flaw."
            className="codex-prose w-full rounded-sm border border-border bg-card/40 p-4 text-base"
          />
          {submitted ? (
            <aside
              role="status"
              aria-live="polite"
              className="codex-card-soft space-y-3 p-5"
            >
              <p className="codex-eyebrow">Model answer</p>
              <p className="codex-prose">
                <strong>Logic summary:</strong> {q.model_answer.logic_summary}
              </p>
              <p className="codex-prose italic">{q.model_answer.example}</p>
            </aside>
          ) : null}
          {submitted && !rated ? (
            <SelfRateAfterReveal
              onRate={handleRate}
              prompt="How did your example land?"
            />
          ) : null}
          <div className="flex justify-end gap-2">
            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={draft.trim().length < 4}
                className="codex-btn-primary min-h-11"
              >
                Reveal model answer
              </button>
            ) : rated && drill.questionIndex < drill.total - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="codex-btn-primary min-h-11"
              >
                Next
              </button>
            ) : rated ? (
              <p className="codex-eyebrow">Drill complete.</p>
            ) : null}
          </div>
        </article>
      )}
    </DrillShell>
  );
}
