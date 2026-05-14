import { useState } from "react";
import d8Data from "./data/d8-stems.json";
import { useAbstractDrill } from "../hooks/useAbstractDrill";
import { DrillShell } from "./DrillShell";
import {
  SelfRateAfterReveal,
  type SelfRateChoice,
} from "../components/SelfRateAfterReveal";

interface D8Stem {
  id: string;
  number: number;
  bonus: boolean;
  bonusLabel?: string;
  stem: string;
  walkthrough: string;
}

const DATA = d8Data as { stems: D8Stem[] };

export function D8StemTranslation() {
  const stems = DATA.stems;
  const drill = useAbstractDrill(stems, "d8");
  const stem = stems[drill.questionIndex];
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleRate = async (rating: SelfRateChoice) => {
    setRated(true);
    await drill.recordAttempt({
      drillId: "d8",
      questionId: stem.id,
      questionIndex: drill.questionIndex,
      correct: rating !== "again",
      selectedAnswer: draft,
      timeMs: Date.now() - startedAt,
    });
  };

  const handleNext = () => {
    setDraft("");
    setRevealed(false);
    setRated(false);
    setStartedAt(Date.now());
    drill.next();
  };

  return (
    <DrillShell
      title="D8 · Question Stem Translation"
      subtitle="Translate each abstract LSAT question stem into plain English. Write your own first, then reveal the walkthrough and rate yourself."
      questionIndex={drill.questionIndex}
      total={drill.total}
      correct={drill.correctCount}
      attempted={drill.attemptedCount}
      referenceCardId="07"
    >
      <article className="space-y-4">
        {stem.bonus ? (
          <p className="codex-chip" style={{ borderColor: "hsl(var(--state-warn) / 0.4)", color: "hsl(var(--state-warn))" }}>
            {stem.bonusLabel ?? "Bonus stretch"}
          </p>
        ) : null}
        <figure className="codex-card">
          <figcaption className="codex-eyebrow">
            Stem {stem.number}
            {stem.bonus ? " (bonus)" : ""}
          </figcaption>
          <p className="codex-prose mt-3 italic">{stem.stem}</p>
        </figure>

        <div className="space-y-2">
          <label className="codex-eyebrow block" htmlFor={`d8-draft-${stem.id}`}>
            Your translation
          </label>
          <textarea
            id={`d8-draft-${stem.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={revealed}
            rows={5}
            className="codex-prose w-full rounded-sm border border-border bg-card/40 p-4 text-base"
            placeholder="Translate the stem into plain English before revealing the walkthrough."
          />
        </div>

        {revealed ? (
          <aside
            role="status"
            aria-live="polite"
            className="codex-card-soft p-5"
          >
            <p className="codex-eyebrow">Walkthrough</p>
            <p className="codex-prose mt-3 whitespace-pre-wrap">
              {stem.walkthrough}
            </p>
          </aside>
        ) : null}

        {revealed && !rated ? (
          <SelfRateAfterReveal
            onRate={handleRate}
            prompt="How did your translation land?"
          />
        ) : null}

        <div className="flex justify-end gap-2">
          {!revealed ? (
            <button
              type="button"
              onClick={handleReveal}
              disabled={draft.trim().length < 4}
              className="codex-btn-primary min-h-11"
            >
              Reveal walkthrough
            </button>
          ) : rated && drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="codex-btn-primary min-h-11"
            >
              Next stem
            </button>
          ) : rated ? (
            <p className="codex-eyebrow">Drill complete.</p>
          ) : null}
        </div>
      </article>
    </DrillShell>
  );
}
