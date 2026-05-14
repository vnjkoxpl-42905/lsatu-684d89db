import { type ReactNode } from "react";
import { SLOT_IDS, SLOT_LABELS, type SlotId } from "../types";

export interface SlotGridProps {
  placements: Record<string, SlotId | null>;
  results?: {
    clauseId: string;
    correct: boolean;
    expectedSlot: SlotId;
    placedSlot: SlotId | null;
    tip?: string;
  }[] | null;
  selectedClauseId: string | null;
  onDropClause: (clauseId: string, slot: SlotId) => void;
  renderPlacedClause: (clauseId: string, slot: SlotId) => ReactNode;
}

// SlotGrid: 7 drop zones split into Author / Opposing / Background lanes.
// Reads placements (clauseId -> slot) and groups clauses under their slot.
// Each zone accepts drops via the HTML5 drag-drop API and tap-to-place via
// onClick when a clauseId is currently selected. Keyboard users tab into a
// drop zone and press Enter/Space to land the currently-selected clause.

const LANES: Array<{ title: string; slots: SlotId[] }> = [
  {
    title: "Author's side",
    slots: [
      "authors-conclusion",
      "intermediate-conclusion",
      "authors-evidence",
      "concession",
    ],
  },
  {
    title: "Opposing side",
    slots: ["opposing-conclusion", "opposing-evidence"],
  },
  {
    title: "Background",
    slots: ["background"],
  },
];

if (import.meta.env?.DEV) {
  const flatLaneSlots = LANES.flatMap((l) => l.slots);
  if (
    flatLaneSlots.length !== SLOT_IDS.length ||
    new Set(flatLaneSlots).size !== SLOT_IDS.length
  ) {
    console.warn("[SlotGrid] lane partition does not cover SLOT_IDS exactly");
  }
}

export function SlotGrid({
  placements,
  results,
  selectedClauseId,
  onDropClause,
  renderPlacedClause,
}: SlotGridProps) {
  const resultByClauseId: Record<
    string,
    { correct: boolean; tip?: string }
  > = {};
  if (results) {
    for (const r of results) {
      resultByClauseId[r.clauseId] = { correct: r.correct, tip: r.tip };
    }
  }

  const clausesInSlot = (slot: SlotId): string[] =>
    Object.entries(placements)
      .filter(([, s]) => s === slot)
      .map(([id]) => id);

  return (
    <div className="slot-grid grid gap-4 md:grid-cols-3">
      {LANES.map((lane) => (
        <div key={lane.title} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {lane.title}
          </h3>
          {lane.slots.map((slot) => {
            const placed = clausesInSlot(slot);
            const isTapActive = Boolean(selectedClauseId);
            const placementLabel =
              placed.length === 0
                ? "empty"
                : `${placed.length} clause${placed.length === 1 ? "" : "s"} placed`;
            const dropZoneLabel = isTapActive
              ? `Drop selected clause into ${SLOT_LABELS[slot]} (${placementLabel})`
              : `${SLOT_LABELS[slot]} drop zone (${placementLabel})`;
            return (
              <div
                key={slot}
                role="button"
                tabIndex={0}
                aria-label={dropZoneLabel}
                aria-disabled={isTapActive ? undefined : true}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const clauseId = e.dataTransfer.getData("text/clause-id");
                  if (clauseId) onDropClause(clauseId, slot);
                }}
                onClick={() => {
                  if (selectedClauseId) onDropClause(selectedClauseId, slot);
                }}
                onKeyDown={(e) => {
                  if (
                    selectedClauseId &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    onDropClause(selectedClauseId, slot);
                  }
                }}
                className={`slot-zone rounded-lg border-2 border-dashed border-border bg-background/40 p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isTapActive
                    ? "border-primary/70 motion-safe:animate-pulse cursor-pointer"
                    : "hover:border-primary/40"
                }`}
                data-slot={slot}
              >
                <p className="mb-2 text-xs font-semibold text-foreground/80">
                  {SLOT_LABELS[slot]}
                </p>
                {placed.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground">
                    Drop a clause here.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {placed.map((clauseId) => {
                      const r = resultByClauseId[clauseId];
                      const stateClass =
                        r === undefined
                          ? "border-border"
                          : r.correct
                            ? "border-state-correct/70 bg-state-correct/5"
                            : "border-state-incorrect/70 bg-state-incorrect/5";
                      return (
                        <li
                          key={clauseId}
                          className={`rounded-md border ${stateClass} p-2 text-sm`}
                        >
                          {renderPlacedClause(clauseId, slot)}
                          {r && !r.correct && r.tip ? (
                            <p className="mt-2 text-xs text-state-incorrect">
                              {r.tip}
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
