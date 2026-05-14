import { useState } from "react";
import d7Data from "./data/d7-worksheet.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import {
  SelfRateAfterReveal,
  type SelfRateChoice,
} from "../components/SelfRateAfterReveal";
import { CodexStamp } from "../components/CodexStamp";

interface D7FreeText {
  id: string;
  number: number;
  type: "free-text";
  prompt: string;
  walkthrough: string;
}

interface D7XYOption {
  id: "x" | "y";
  label: string;
}

interface D7XYMap {
  id: string;
  number: number;
  type: "xy-map";
  prompt: string;
  phrase: string;
  options: D7XYOption[];
  correct: "x" | "y";
  explanation: string;
}

type D7Q = D7FreeText | D7XYMap;

const DATA = d7Data as { questions: D7Q[] };

export function D7KeywordDecoding() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d7");
  const q = questions[drill.questionIndex];
  const [textAnswer, setTextAnswer] = useState("");
  const [xyChoice, setXYChoice] = useState<"x" | "y" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [rated, setRated] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const reset = () => {
    setTextAnswer("");
    setXYChoice(null);
    setSubmitted(false);
    setRated(false);
    setStartedAt(Date.now());
  };

  const handleNext = () => {
    reset();
    drill.next();
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (q.type === "xy-map") {
      await drill.recordAttempt({
        drillId: "d7",
        questionId: q.id,
        questionIndex: drill.questionIndex,
        correct: xyChoice === q.correct,
        selectedAnswer: xyChoice,
        timeMs: Date.now() - startedAt,
      });
    }
    // Free-text: defer recordAttempt to handleRate (self-rate after reveal).
  };

  const handleRate = async (rating: SelfRateChoice) => {
    if (q.type !== "free-text") return;
    setRated(true);
    await drill.recordAttempt({
      drillId: "d7",
      questionId: q.id,
      questionIndex: drill.questionIndex,
      correct: rating !== "again",
      selectedAnswer: textAnswer,
      timeMs: Date.now() - startedAt,
    });
  };

  const xyDone = q.type === "xy-map" && submitted;
  const freeDone = q.type === "free-text" && rated;

  return (
    <DrillShell
      title="D7 · Keyword Decoding Worksheet"
      subtitle="Decode abstract answer-choice wording into plain English."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="05"
    >
      <article className="space-y-4">
        <figure className="codex-card">
          <figcaption className="codex-eyebrow">Question {q.number}</figcaption>
          <p className="codex-prose mt-3 whitespace-pre-line">{q.prompt}</p>
          {q.type === "xy-map" ? (
            <p className="codex-mono mt-4 rounded-sm border border-primary/30 bg-paper-deep/30 p-3 text-sm">
              (A) {q.phrase}
            </p>
          ) : null}
        </figure>

        {q.type === "xy-map" ? (
          <fieldset className="space-y-2">
            <legend className="text-xs uppercase tracking-wide text-muted-foreground">
              How do X and Y line up?
            </legend>
            {q.options.map((opt) => {
              const isPicked = xyChoice === opt.id;
              const isCorrect = submitted && opt.id === q.correct;
              const isWrong = submitted && isPicked && opt.id !== q.correct;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !submitted && setXYChoice(opt.id)}
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
                  {opt.label}
                </button>
              );
            })}
          </fieldset>
        ) : (
          <div className="space-y-2">
            <label
              className="codex-eyebrow block"
              htmlFor={`d7-text-${q.id}`}
            >
              Your answer
            </label>
            <textarea
              id={`d7-text-${q.id}`}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              disabled={submitted}
              rows={4}
              className="codex-prose w-full rounded-sm border border-border bg-card/40 p-4 text-base"
              placeholder="Take your best shot before revealing the walkthrough."
            />
          </div>
        )}

        {submitted ? (
          <aside
            role="status"
            aria-live="polite"
            className="codex-card-soft p-5"
          >
            {q.type === "xy-map" ? (
              <CodexStamp variant={xyChoice === q.correct ? "correct" : "incorrect"} />
            ) : (
              <p className="codex-eyebrow">Walkthrough</p>
            )}
            <p className="codex-prose mt-3 whitespace-pre-line">
              {q.type === "xy-map" ? q.explanation : q.walkthrough}
            </p>
          </aside>
        ) : null}

        {q.type === "free-text" && submitted && !rated ? (
          <SelfRateAfterReveal
            onRate={handleRate}
            prompt="How did your answer land?"
          />
        ) : null}

        <div className="flex justify-end gap-2">
          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                q.type === "xy-map"
                  ? !xyChoice
                  : textAnswer.trim().length < 4
              }
              className="codex-btn-primary min-h-11"
            >
              {q.type === "xy-map" ? "Submit" : "Reveal walkthrough"}
            </button>
          ) : (xyDone || freeDone) && drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="codex-btn-primary min-h-11"
            >
              Next
            </button>
          ) : xyDone || freeDone ? (
            <p className="codex-eyebrow">Drill complete.</p>
          ) : null}
        </div>
      </article>
    </DrillShell>
  );
}
