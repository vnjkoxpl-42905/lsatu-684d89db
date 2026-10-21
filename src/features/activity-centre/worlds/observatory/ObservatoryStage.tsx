import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { directionOf, splitWords, type Reading, type RelationKind, type Signal } from "./observatory";
import "./observatory.css";

/**
 * The Signal Observatory: Spot the Relationship's world.
 *
 * The statement's words are stars on a dark field. On verdict the observatory
 * draws the relationship as a figure between the actual indicator words, so the
 * figure always points at text the student can read rather than at a position
 * chosen for it.
 *
 * The three geometries are the drill's visual alphabet, and they are different
 * shapes rather than different colours, because the discrimination this drill
 * trains is causal against conditional and that has to survive a monochrome
 * system.
 */

export type SkyPhase = "arrival" | "drawn";

/** One item's outcome, for the three seals. Real completions only. */
export interface SealState {
  conditional: boolean;
  causal: boolean;
  comparative: boolean;
}

interface ObservatoryStageProps {
  signal: Signal;
  phase: SkyPhase;
  /** The reading of the student's answer. Absent before they commit. */
  reading?: Reading | null;
  /** Which types the student has completed. Omit and no seal lights. */
  seals?: SealState;
}

const CAPTION: Record<RelationKind, string> = {
  conditional: "If this, then this. A rule.",
  causal: "This makes that happen.",
  comparative: "More of this than that.",
};

const SEAL_ORDER: RelationKind[] = ["conditional", "causal", "comparative"];
const SEAL_LABEL: Record<RelationKind, string> = {
  conditional: "Conditional",
  causal: "Causal",
  comparative: "Comparison",
};

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function ObservatoryStage({ signal, phase, reading, seals }: ObservatoryStageProps) {
  const still = useReducedMotion() ?? false;
  const drawn = phase === "drawn";

  const fieldRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef(new Map<number, HTMLElement>());
  const [boxes, setBoxes] = useState<Map<number, Box>>(new Map());
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Words are laid out by text flow, so the only way to draw between them is to
  // measure where they landed. Re-measured on resize, because a reflow moves
  // every anchor and a figure left at the old coordinates would point at the
  // wrong word.
  const measure = useCallback(() => {
    const field = fieldRef.current;
    if (!field) return;
    const base = field.getBoundingClientRect();
    const next = new Map<number, Box>();
    for (const [i, el] of wordRefs.current) {
      const r = el.getBoundingClientRect();
      next.set(i, {
        left: r.left - base.left,
        top: r.top - base.top,
        width: r.width,
        height: r.height,
      });
    }
    setBoxes(next);
    setSize({ width: base.width, height: base.height });
  }, []);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    if (fieldRef.current) ro.observe(fieldRef.current);
    return () => ro.disconnect();
  }, [measure, signal.order]);

  // Words, with the character offset of each so anchors can be matched to them.
  const words = splitWords(signal.statement);

  // Which word indices each relation anchors to.
  const anchorIndex = new Map<number, RelationKind>();
  for (const rel of signal.relations) {
    for (const a of rel.anchors) {
      for (const w of words) {
        if (w.start < a.end && a.start < w.end) anchorIndex.set(w.i, rel.kind);
      }
    }
  }

  const drawnKinds = new Set(drawn ? (reading?.drawn ?? signal.relations.map((r) => r.kind)) : []);
  const ghostKinds = drawn ? (reading?.invented ?? []) : [];

  return (
    <div
      className="observatory flex h-full min-h-[560px] w-full flex-col gap-6 px-5 py-8 md:px-12"
      data-phase={phase}
      data-testid="observatory"
    >
      {/* The dome itself: nebulae, fixed stars, gilt ribs, meridian, horizon.
          Pure scenery, aria-hidden, outside every tested container. */}
      <div className="ob-room" aria-hidden="true">
        <div className="ob-nebula" />
        <div className="ob-stars" />
        <div className="ob-dome" />
        <div className="ob-meridian" />
        <div className="ob-horizonline" />
      </div>

      <div className="flex items-center justify-between">
        <span className="observatory-display text-sm text-[hsl(var(--ob-ink))]">
          {drawn ? "The figure" : "The field"}
        </span>
        <span className="observatory-mono text-xs text-[hsl(var(--ob-ink-dim))]">
          Rung {signal.rung}
        </span>
      </div>

      <div
        ref={fieldRef}
        className="ob-field relative"
        data-arriving={!drawn ? "true" : "false"}
        data-testid="ob-field"
      >
        <p className="observatory-type text-xl leading-loose md:text-2xl">
          {words.map((w) => (
            <span
              key={w.i}
              ref={(el) => {
                if (el) wordRefs.current.set(w.i, el);
                else wordRefs.current.delete(w.i);
              }}
              className="ob-word"
              data-anchor={anchorIndex.has(w.i) ? "true" : undefined}
              data-drawn={
                anchorIndex.has(w.i) && drawnKinds.has(anchorIndex.get(w.i)!) ? "true" : undefined
              }
              data-testid={anchorIndex.has(w.i) ? "ob-anchor-word" : "ob-word"}
            >
              {w.text}{" "}
            </span>
          ))}
        </p>

        {/* The figures, over the field. Only drawn once there is something true
            to draw, and only between anchors that were actually measured. */}
        {drawn && size.width > 0 ? (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden="true"
            data-testid="ob-figures"
          >
            {signal.relations
              .filter((r) => drawnKinds.has(r.kind))
              .map((r, n) => (
                <Figure
                  key={`${r.kind}-${n}`}
                  kind={r.kind}
                  indicators={r.indicators}
                  points={anchorPoints(r.anchors, words, boxes)}
                  still={still}
                />
              ))}
            {ghostKinds.map((kind) => (
              <Ghost key={kind} kind={kind} width={size.width} height={size.height} />
            ))}
          </svg>
        ) : null}
      </div>

      {drawn ? (
        <div className="flex flex-col gap-1.5" data-testid="ob-captions">
          {signal.relations
            .filter((r) => drawnKinds.has(r.kind))
            .map((r, n) => (
              <p key={n} className="ob-caption observatory-mono text-xs" data-kind={r.kind}>
                {CAPTION[r.kind]} · {r.indicators.map((i) => `"${i}"`).join(" ")}
              </p>
            ))}
          {reading?.missed.length ? (
            <p className="ob-caption text-sm" data-testid="ob-missed">
              Still undrawn: {reading.missed.join(", ")}. The figure is there in the sentence.
            </p>
          ) : null}
        </div>
      ) : null}

      <Seals seals={seals} />
    </div>
  );
}

/** Screen points for a relation's anchors, in the order they appear. */
function anchorPoints(
  anchors: { start: number; end: number }[],
  words: ReturnType<typeof splitWords>,
  boxes: Map<number, Box>,
) {
  const points: { x: number; y: number }[] = [];
  for (const a of anchors) {
    const hit = words.filter((w) => w.start < a.end && a.start < w.end);
    const rects = hit.map((w) => boxes.get(w.i)).filter(Boolean) as Box[];
    if (!rects.length) continue;
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.left + r.width));
    const top = Math.min(...rects.map((r) => r.top));
    points.push({ x: (left + right) / 2, y: top });
  }
  return points;
}

/**
 * One relationship's geometry.
 *
 * Conditional is a single hard shaft, causal is doubled and heavier, and
 * comparative is a beam that tips. The arrowhead on a conditional appears only
 * when the indicator's direction is known: an arrow pointing the wrong way
 * teaches the reversal error.
 */
function Figure({
  kind,
  indicators,
  points,
  still,
}: {
  kind: RelationKind;
  indicators: string[];
  points: { x: number; y: number }[];
  still: boolean;
}) {
  if (!points.length) return null;

  // A relation anchored to one word arcs above it to the rest of the clause;
  // one anchored to two or more spans between its own ends.
  const from = points[0];
  const to = points[points.length - 1];
  const single = points.length < 2;

  const y = Math.min(from.y, to.y) - 14;
  const d = single
    ? `M ${from.x - 26} ${y} Q ${from.x} ${y - 12} ${from.x + 26} ${y}`
    : `M ${from.x} ${y} Q ${(from.x + to.x) / 2} ${y - 16} ${to.x} ${y}`;

  const direction = kind === "conditional" ? directionOf(indicators[0]) : null;
  const headAt = direction === "necessary" ? from : to;
  const showHead = kind === "causal" || (kind === "conditional" && direction !== null);
  const LEN = 260;

  return (
    <g data-testid={`ob-figure-${kind}`} data-kind={kind}>
      <path
        className="ob-figure"
        data-kind={kind}
        data-draw={still ? undefined : "true"}
        d={d}
        style={
          still
            ? undefined
            : ({ strokeDasharray: LEN, ["--ob-len" as string]: LEN } as React.CSSProperties)
        }
      />
      {/* Causal is doubled: a second shaft just under the first, so the push is
          visible in the line's weight rather than in a colour. */}
      {kind === "causal" ? (
        <path className="ob-figure" data-kind="causal" d={d} transform="translate(0,3)" opacity={0.6} />
      ) : null}
      {/* Comparative gets the beam under its two ends, tipped toward one side. */}
      {kind === "comparative" && !single ? (
        <g className="ob-beam" data-tipped="true" data-testid="ob-beam">
          <line className="ob-figure" data-kind="comparative" x1={from.x} y1={y + 6} x2={to.x} y2={y + 6} />
        </g>
      ) : null}
      {showHead ? (
        <polygon
          className="ob-arrowhead"
          data-testid={`ob-head-${kind}`}
          points={`${headAt.x},${y - 1} ${headAt.x - 4},${y - 8} ${headAt.x + 4},${y - 8}`}
        />
      ) : null}
    </g>
  );
}

/** A relationship the student named that is not in the statement. */
function Ghost({ kind, width, height }: { kind: RelationKind; width: number; height: number }) {
  return (
    <path
      className="ob-figure"
      data-kind={kind}
      data-ghost="true"
      data-testid={`ob-ghost-${kind}`}
      d={`M ${width * 0.2} ${height * 0.3} Q ${width * 0.5} ${height * 0.1} ${width * 0.8} ${height * 0.3}`}
    />
  );
}

/** The three instrument dials. Lit by real completions only. */
function Seals({ seals }: { seals?: SealState }) {
  return (
    <div className="mt-auto flex flex-wrap gap-2 pt-4" data-testid="ob-seals">
      {SEAL_ORDER.map((k) => (
        <span
          key={k}
          className="ob-seal observatory-mono rounded-sm px-3 py-1.5 text-xs"
          data-kind={k}
          data-lit={seals?.[k] ? "true" : undefined}
          data-testid={`ob-seal-${k}`}
        >
          {SEAL_LABEL[k]}
        </span>
      ))}
    </div>
  );
}
