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
// onClick when a clauseId is currently selected.

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

// Sanity check: every slot must appear in exactly one lane.
const flatLaneSlots = LANES.flatMap((l) => l.slots);
if (
  flatLaneSlots.length !== SLOT_IDS.length ||
  new Set(flatLaneSlots).size !== SLOT_IDS.length
) {
  // Dev-only diagnostic; lane partition is a static invariant.
  console.warn("[SlotGrid] lane partition does not cover SLOT_IDS exactly");
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
            return (
              <div
                key={slot}
                role="region"
                aria-label={`${SLOT_LABELS[slot]} drop zone`}
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
                className={`slot-zone rounded-lg border-2 border-dashed border-border bg-background/40 p-3 transition-colors ${
                  isTapActive
                    ? "border-primary/70 animate-pulse"
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
                            ? "border-emerald-500/70 bg-emerald-500/5"
                            : "border-rose-500/70 bg-rose-500/5";
                      return (
                        <li
                          key={clauseId}
                          className={`rounded-md border ${stateClass} p-2 text-sm`}
                        >
                          {renderPlacedClause(clauseId, slot)}
                          {r && !r.correct && r.tip ? (
                            <p className="mt-2 text-xs text-rose-500">
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
