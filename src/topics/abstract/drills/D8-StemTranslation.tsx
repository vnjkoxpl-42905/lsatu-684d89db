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
          <p className="rounded-md border border-state-warn/40 bg-state-warn/5 px-3 py-2 text-xs font-medium text-state-warn">
            {stem.bonusLabel ?? "Bonus stretch"}
          </p>
        ) : null}
        <div className="rounded-xl border border-border bg-card/50 p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Stem {stem.number}
            {stem.bonus ? " (bonus)" : ""}
          </p>
          <p className="mt-2 italic leading-relaxed">{stem.stem}</p>
        </div>

        <label className="block space-y-2" htmlFor={`d8-draft-${stem.id}`}>
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your translation
          </span>
          <textarea
            id={`d8-draft-${stem.id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={revealed}
            rows={5}
            className="w-full rounded-md border border-border bg-background p-3 text-sm"
            placeholder="Translate the stem into plain English before revealing the walkthrough."
          />
        </label>

        {revealed ? (
          <aside
            role="status"
            aria-live="polite"
            className="rounded-md border border-border bg-card/50 p-3 text-sm"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Walkthrough
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">
              {stem.walkthrough}
            </p>
          </aside>
        ) : null}

        {revealed && !rated ? <SelfRateAfterReveal onRate={handleRate} /> : null}

        <div className="flex justify-end gap-2">
          {!revealed ? (
            <button
              type="button"
              onClick={handleReveal}
              disabled={draft.trim().length < 4}
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Reveal walkthrough
            </button>
          ) : rated && drill.questionIndex < drill.total - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Next stem
            </button>
          ) : rated ? (
            <p className="text-sm text-muted-foreground">Drill complete.</p>
          ) : null}
        </div>
      </article>
    </DrillShell>
  );
}
