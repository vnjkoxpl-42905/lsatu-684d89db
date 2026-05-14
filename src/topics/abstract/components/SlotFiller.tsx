import { useEffect, useMemo, useState } from "react";
import playgroundStimuli from "../content/stimuli/playground-stimuli.json";
import type { PlaygroundStimulus, SlotId } from "../types";
import { useSlotFillerSession } from "../hooks/useSlotFillerSession";
import { useDrillDarkMode } from "../hooks/useAbstractDrill";
import { SlotGrid } from "./SlotGrid";
import { IndicatorPanel } from "./IndicatorPanel";
import { SkeletonTree } from "./SkeletonTree";

const DATA = playgroundStimuli as { stimuli: PlaygroundStimulus[] };

function detectTouchPrimary(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

export function SlotFiller() {
  useDrillDarkMode();
  const session = useSlotFillerSession(DATA.stimuli);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(detectTouchPrimary());
  }, []);

  const stimulus = session.stimulus;
  const unplacedClauses = useMemo(
    () =>
      stimulus.clauses.filter(
        (c) => !session.placements[c.id],
      ),
    [stimulus.clauses, session.placements],
  );

  if (!stimulus) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No stimulus available. Try the drills while we restock the playground.{" "}
        <a className="underline" href="/topics/abstract/drills/d1">
          Go to Drill 1
        </a>
        .
      </div>
    );
  }

  const handleDragStart = (e: React.DragEvent<HTMLLIElement>, clauseId: string) => {
    e.dataTransfer.setData("text/clause-id", clauseId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleClauseTap = (clauseId: string) => {
    if (!isTouch) return;
    session.selectClause(
      session.selectedClauseId === clauseId ? null : clauseId,
    );
  };

  const renderPlacedClause = (clauseId: string, _slot: SlotId) => {
    const clause = stimulus.clauses.find((c) => c.id === clauseId);
    if (!clause) return null;
    return (
      <div className="flex items-start justify-between gap-2">
        <span>{clause.text}</span>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-base leading-none text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            session.place(clauseId, null);
          }}
          aria-label={`Remove ${clause.text} from slot`}
        >
          ×
        </button>
      </div>
    );
  };

  const acc = session.sessionAccuracy;
  const accPct =
    acc.total === 0 ? 0 : Math.round((acc.correct / acc.total) * 100);

  return (
    <div className="slot-filler space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Strip-Down Playground</h2>
          <p className="text-sm text-muted-foreground">
            Drag every clause into the slot it belongs to. Then hit Check.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full bg-secondary px-3 py-1 text-xs"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Session accuracy ${accPct} percent, ${acc.correct} of ${acc.total} correct`}
          >
            Session: {accPct}% ({acc.correct}/{acc.total})
          </span>
          <button
            type="button"
            onClick={session.toggleIndicators}
            className="min-h-11 rounded-md border border-border px-3 py-1 text-sm"
            aria-pressed={session.showIndicators}
          >
            {session.showIndicators ? "Hide" : "Show"} indicators
          </button>
          <button
            type="button"
            onClick={session.toggleTree}
            className="min-h-11 rounded-md border border-border px-3 py-1 text-sm"
            aria-pressed={session.showTree}
          >
            {session.showTree ? "Hide" : "Show"} tree
          </button>
        </div>
      </header>

      <blockquote className="italic border-l-2 border-border pl-4 text-base leading-relaxed">
        {stimulus.stimulus_text}
      </blockquote>

      <section
        aria-label="Clauses to place"
        className="rounded-xl border border-border bg-card/40 p-3"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Clauses ({unplacedClauses.length} remaining)
        </p>
        {unplacedClauses.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            All clauses placed. Hit Check.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {unplacedClauses.map((c) => {
              const selected = session.selectedClauseId === c.id;
              return (
                <li
                  key={c.id}
                  draggable={!isTouch}
                  onDragStart={(e) => handleDragStart(e, c.id)}
                  onClick={() => handleClauseTap(c.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selected}
                  aria-label={`Clause: ${c.text}${selected ? ", selected" : ""}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      session.selectClause(selected ? null : c.id);
                    }
                  }}
                  className={`min-h-11 cursor-pointer rounded-md border px-3 py-2 text-sm shadow-sm transition-[box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    selected
                      ? "border-primary border-2 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50 hover:shadow"
                  }`}
                >
                  {c.text}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SlotGrid
        placements={session.placements}
        results={session.results}
        selectedClauseId={session.selectedClauseId}
        onDropClause={(clauseId, slot) => {
          session.place(clauseId, slot);
          session.selectClause(null);
        }}
        renderPlacedClause={renderPlacedClause}
      />

      {session.showIndicators ? (
        <IndicatorPanel stimulus={stimulus} />
      ) : null}

      {session.showTree ? <SkeletonTree stimulus={stimulus} /> : null}

      <footer className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => session.check()}
          disabled={unplacedClauses.length > 0}
          className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Check
        </button>
        <button
          type="button"
          onClick={session.next}
          className="min-h-11 rounded-md border border-border px-4 py-2 text-sm"
        >
          Next stimulus
        </button>
        <button
          type="button"
          onClick={session.reset}
          className="min-h-11 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground"
        >
          Reset session
        </button>
      </footer>
    </div>
  );
}
