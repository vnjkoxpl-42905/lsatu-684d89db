import { useState } from "react";
import d1Data from "./data/d1-stripdown.json";
import type { D1Question, SlotId } from "../types";
import { SLOT_IDS, SLOT_LABELS } from "../types";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";

const DATA = d1Data as { questions: D1Question[] };

export function D1StripDown() {
  const questions = DATA.questions;
  const drill = useAbstractDrill(questions, "d1");
  const q = questions[drill.questionIndex];
  const [labels, setLabels] = useState<Record<string, SlotId | "">>({});
  const [revealed, setRevealed] = useState(false);
  const [startedAt] = useState(() => Date.now());

  const setLabel = (clauseId: string, slot: SlotId | "") => {
    setLabels((prev) => ({ ...prev, [clauseId]: slot }));
  };

  const handleReveal = async () => {
    setRevealed(true);
    const allCorrect = q.clauses.every((c) => labels[c.id] === c.slot);
    await drill.recordAttempt({
      drillId: "d1",
      questionId: q.id,
      questionIndex: drill.questionIndex,
      correct: allCorrect,
      selectedAnswer: JSON.stringify(labels),
      timeMs: Date.now() - startedAt,
    });
  };

  const handleNext = () => {
    setLabels({});
    setRevealed(false);
    drill.next();
  };

  return (
    <DrillShell
      title="D1 · Strip-Down Warm-Up"
      subtitle="Label every clause with the slot it fills. No auto-grade. Reveal after you commit."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="01"
    >
      <article className="space-y-4">
        <blockquote className="italic border-l-2 border-border pl-4 leading-relaxed">
          {q.stimulus}
        </blockquote>
        <ol className="space-y-3">
          {q.clauses.map((c, i) => {
            const selected = labels[c.id] ?? "";
            const isCorrect = revealed && selected === c.slot;
            const isWrong = revealed && selected !== "" && selected !== c.slot;
            return (
              <li
                key={c.id}
                className={`rounded-md border p-3 ${
                  isCorrect
                    ? "border-emerald-500/70 bg-emerald-500/5"
                    : isWrong
                      ? "border-rose-500/70 bg-rose-500/5"
                      : "border-border"
                }`}
              >
                <p className="text-sm">
                  <span className="mr-2 text-xs text-muted-foreground">
                    Clause {i + 1}.
                  </span>
                  {c.text}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground" htmlFor={`label-${c.id}`}>
                    Slot:
                  </label>
                  <select
                    id={`label-${c.id}`}
                    value={selected}
                    onChange={(e) =>
                      setLabel(c.id, e.target.value as SlotId | "")
                    }
                    disabled={revealed}
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Pick a slot</option>
                    {SLOT_IDS.map((s) => (
                      <option key={s} value={s}>
                        {SLOT_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {revealed ? (
                    <span className="text-xs">
                      Canonical:{" "}
                      <strong>{SLOT_LABELS[c.slot]}</strong>
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        {revealed ? (
          <aside className="rounded-md border border-border bg-card/50 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Explanation
            </p>
            <p className="leading-relaxed">{q.explanation}</p>
          </aside>
        ) : null}
        <div className="flex justify-end gap-2">
          {!revealed ? (
            <button
              type="button"
              onClick={handleReveal}
              disabled={q.clauses.some((c) => !labels[c.id])}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Reveal
            </button>
          ) : drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Next question
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Drill complete. Sessions accuracy logged above.
            </p>
          )}
        </div>
      </article>
    </DrillShell>
  );
}
