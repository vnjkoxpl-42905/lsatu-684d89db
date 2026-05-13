import { useState } from "react";
import d4Data from "./data/d4-advanced-xy.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";

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
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const reset = () => {
    setSelected(null);
    setDraft("");
    setSubmitted(false);
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
      setSubmitted(true);
      // Reverse-engineer questions are reveal-after; counted attempted, not graded.
      await drill.recordAttempt({
        drillId: "d4",
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
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Abstract phrase
            </p>
            <p className="mt-2 italic leading-relaxed">{q.phrase}</p>
          </div>
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
                    className={`w-full rounded-md border p-3 text-left text-sm ${
                      isCorrect
                        ? "border-emerald-500/80 bg-emerald-500/10"
                        : isWrong
                          ? "border-rose-500/80 bg-rose-500/10"
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
            <aside className="rounded-md border border-border bg-card/50 p-3 text-sm">
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
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Submit
              </button>
            ) : drill.questionIndex < drill.total - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Next
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">Drill complete.</p>
            )}
          </div>
        </article>
      ) : (
        <article className="space-y-4">
          <div className="rounded-xl border border-border bg-card/50 p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Flaw to reverse-engineer
            </p>
            <p className="mt-2 italic leading-relaxed">{q.flaw_description}</p>
          </div>
          <label
            className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
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
            className="w-full rounded-md border border-border bg-background p-3 text-sm"
          />
          {submitted ? (
            <aside className="space-y-2 rounded-md border border-border bg-card/50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Model answer
              </p>
              <p className="leading-relaxed">
                <strong>Logic summary:</strong> {q.model_answer.logic_summary}
              </p>
              <p className="leading-relaxed italic">
                {q.model_answer.example}
              </p>
            </aside>
          ) : null}
          <div className="flex justify-end gap-2">
            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={draft.trim().length < 4}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Reveal model answer
              </button>
            ) : drill.questionIndex < drill.total - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Next
              </button>
            ) : (
              <p className="text-sm text-muted-foreground">Drill complete.</p>
            )}
          </div>
        </article>
      )}
    </DrillShell>
  );
}
