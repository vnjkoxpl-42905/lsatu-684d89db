import { useEffect, useState } from "react";
import type { RoundItem } from "./rounds";
import "../switchyard.css";
import "./wings.css";

/**
 * The Sorting Yard.
 *
 * The main yard asks a student to translate. This wing isolates the one
 * decision inside that translation where they actually go wrong: which clause
 * belongs on which track. No typing, ten statements a round, and a reversal is
 * corrected the moment it is committed rather than at the end of a set.
 *
 * Routing one card fixes the other, because a conditional has exactly two
 * condition-groups and two tracks. That is not a shortcut in the interface, it
 * is the fact the drill is teaching.
 */

type Slot = "if" | "then";
type Verdict = "clean" | "reversed";

export interface SortingYardProps {
  round: RoundItem[];
  /** Called with the real per-item results when the round finishes. */
  onComplete?: (results: { order: number; verdict: Verdict }[]) => void;
}

export function SortingYard({ round, onComplete }: SortingYardProps) {
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<Slot | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [results, setResults] = useState<{ order: number; verdict: Verdict }[]>([]);

  const item = round[index];
  const finished = index >= round.length;

  // The two cards, presented in the item's own alternating order so the
  // necessary clause is not always in the same place.
  const cards = item
    ? item.swapped
      ? [
          { slot: "then" as Slot, text: item.thenText },
          { slot: "if" as Slot, text: item.ifText },
        ]
      : [
          { slot: "if" as Slot, text: item.ifText },
          { slot: "then" as Slot, text: item.thenText },
        ]
    : [];

  useEffect(() => {
    if (finished) onComplete?.(results);
    // Firing once at the end of the round is the intent; results is captured
    // at that moment and does not change afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function commit(choice: Slot) {
    if (verdict) return;
    // `choice` is the track the student put the FIRST card on. The first card's
    // true home tells us whether that was the credited call.
    const truth = cards[0].slot;
    const v: Verdict = choice === truth ? "clean" : "reversed";
    setPlaced(choice);
    setVerdict(v);
    setResults((r) => [...r, { order: item.order, verdict: v }]);
  }

  function next() {
    setPlaced(null);
    setVerdict(null);
    setIndex((i) => i + 1);
  }

  if (finished) {
    const clean = results.filter((r) => r.verdict === "clean").length;
    return (
      <div className="switchyard sy-wing flex min-h-[560px] flex-col justify-center gap-4 px-5 py-8 md:px-12">
        <p className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">Round complete</p>
        <p className="ac-display text-2xl text-[hsl(var(--sy-ink))]">
          {clean} of {results.length} routed clean
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--sy-ink-dim))]">
          {clean === results.length
            ? "Every statement went onto the right track. That is the decision the whole skill turns on."
            : "Each reversal you just watched get corrected is the exact move that costs points on test day. Run the round again and see which ones stick."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="switchyard sy-wing flex min-h-[560px] flex-col gap-7 px-5 py-8 md:px-12"
      data-testid="sorting-yard"
      onKeyDown={(e) => {
        if (verdict) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            next();
          }
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          commit("if");
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          commit("then");
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">
          Sorting yard · {index + 1} of {round.length}
        </span>
        <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">
          ↑ if · ↓ then
        </span>
      </div>

      <div className="sy-board rounded-2xl px-6 py-5">
        <p className="ac-display text-lg leading-snug text-[hsl(var(--sy-ink))]">{item.statement}</p>
      </div>

      {/* The tracks. The first card is the one being routed; the second follows. */}
      <div className="space-y-5">
        {(["if", "then"] as Slot[]).map((slot) => {
          const occupant = verdict
            ? // After commit the yard shows the credited arrangement, so the
              // student's last sight of the item is the correct one.
              cards.find((c) => c.slot === slot)
            : placed
              ? placed === slot
                ? cards[0]
                : cards[1]
              : null;
          return (
            <div key={slot}>
              <div className="mb-2 flex items-center gap-3">
                <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">
                  {slot.toUpperCase()}
                </span>
                <div className="sy-rail flex-1" data-live={Boolean(verdict)} />
              </div>
              <div
                className="sy-slot rounded-[10px] px-4 py-3"
                data-filled={occupant ? "true" : "false"}
                data-testid={`sy-slot-${slot}`}
              >
                <span className="text-base leading-snug text-[hsl(var(--sy-ink))]">
                  {occupant?.text ?? " "}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {verdict ? (
        <div className="flex flex-wrap items-center gap-4" data-testid="sy-sorting-verdict">
          <span
            className="switchyard-mono text-xs text-[hsl(var(--sy-signal))]"
            data-verdict={verdict}
          >
            {verdict === "clean" ? "Routed clean" : "Derailment: reversed"}
          </span>
          <span className="min-w-0 flex-1 text-sm text-[hsl(var(--sy-ink-dim))]">
            {verdict === "clean"
              ? "That is the sufficient condition on IF and the necessary one on THEN."
              : `You put that on ${placed?.toUpperCase()}. It belongs on ${cards[0].slot.toUpperCase()}, and the yard has re-routed both.`}
          </span>
          <button
            type="button"
            onClick={next}
            autoFocus
            className="sy-ack switchyard-mono rounded-md px-3 py-1.5 text-xs"
            data-testid="sy-sorting-next"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3" data-testid="sy-sorting-controls">
          <span className="min-w-0 flex-1 text-sm text-[hsl(var(--sy-ink-dim))]">
            Which track does this go on?
            <span className="ml-2 text-[hsl(var(--sy-ink))]">{cards[0].text}</span>
          </span>
          <button
            type="button"
            onClick={() => commit("if")}
            autoFocus
            className="sy-ack switchyard-mono rounded-md px-4 py-2 text-xs"
            data-testid="sy-route-if"
          >
            If
          </button>
          <button
            type="button"
            onClick={() => commit("then")}
            className="sy-ack switchyard-mono rounded-md px-4 py-2 text-xs"
            data-testid="sy-route-then"
          >
            Then
          </button>
        </div>
      )}
    </div>
  );
}
