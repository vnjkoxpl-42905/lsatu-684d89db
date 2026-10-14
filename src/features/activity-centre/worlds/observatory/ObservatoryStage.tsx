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

/**
 * One line of the statement as it actually set: where its letters start, and
 * how much clear space sits between it and the line above. Every mark drawn
 * for a word on this line has to fit inside that space, or it is drawn through
 * the words of the line above.
 */
interface Line {
  top: number;
  room: number;
}

interface Layout {
  /** The glyph box of each word, field-relative. */
  boxes: Map<number, Box>;
  /** Which line each word set on. */
  lineOf: Map<number, number>;
  lines: Line[];
}

/** Clear space assumed above the first line, which has the header above it. */
const FIRST_LINE_ROOM = 22;

/**
 * The box of the word's letters rather than of its span. The span's box
 * includes the line's half-leading and the star-point padding, so a figure
 * placed from it started inside the line above.
 */
function glyphRect(el: HTMLElement): DOMRect {
  const text = el.firstChild;
  if (text && text.nodeType === Node.TEXT_NODE && typeof document.createRange === "function") {
    const range = document.createRange();
    range.selectNodeContents(text);
    if (typeof range.getBoundingClientRect === "function") {
      const r = range.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }
  }
  return el.getBoundingClientRect();
}

export function layoutOf(boxes: Map<number, Box>): Layout {
  const lineOf = new Map<number, number>();
  const lines: { top: number; bottom: number }[] = [];
  const ordered = [...boxes.entries()].sort((a, b) => a[0] - b[0]);
  for (const [i, b] of ordered) {
    const last = lines[lines.length - 1];
    // Words on one line share a top to within a pixel or two; a new line
    // starts well below the last one's top.
    if (!last || b.top > last.top + b.height / 2) {
      lines.push({ top: b.top, bottom: b.top + b.height });
    } else {
      last.top = Math.min(last.top, b.top);
      last.bottom = Math.max(last.bottom, b.top + b.height);
    }
    lineOf.set(i, lines.length - 1);
  }
  return {
    boxes,
    lineOf,
    lines: lines.map((l, n) => ({
      top: l.top,
      room: n === 0 ? FIRST_LINE_ROOM : Math.max(0, l.top - lines[n - 1].bottom),
    })),
  };
}

const EMPTY_LAYOUT: Layout = { boxes: new Map(), lineOf: new Map(), lines: [] };

export function ObservatoryStage({ signal, phase, reading, seals }: ObservatoryStageProps) {
  const still = useReducedMotion() ?? false;
  const drawn = phase === "drawn";

  const fieldRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef(new Map<number, HTMLElement>());
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
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
      const r = glyphRect(el);
      next.set(i, {
        left: r.left - base.left,
        top: r.top - base.top,
        width: r.width,
        height: r.height,
      });
    }
    setLayout(layoutOf(next));
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
        {/* The leading is restated at md: Tailwind's text-2xl carries its own
            32px line height, which silently replaced leading-loose and left 6px
            between lines, too little for any figure to sit in. */}
        <p className="observatory-type text-xl leading-[2.4] md:text-2xl md:leading-[2.4]">
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
                  segments={segmentsFor(r.anchors, words, layout)}
                  still={still}
                />
              ))}
            {ghostKinds.map((kind) => (
              <Ghost key={kind} kind={kind} width={size.width} line={layout.lines[0]} />
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

/**
 * One stretch of a figure: the anchors of one relation that set on the same
 * line. A relation whose indicators wrap onto two lines gets one stretch per
 * line rather than a chord cut diagonally through the text between them.
 */
interface Segment {
  x1: number;
  x2: number;
  /** Where the letters of this line start. Marks sit above this. */
  top: number;
  /** Clear space above the line. Marks never rise further than this. */
  room: number;
  /** How many anchor words this stretch spans. */
  count: number;
}

export function segmentsFor(
  anchors: { start: number; end: number }[],
  words: ReturnType<typeof splitWords>,
  layout: Layout,
): Segment[] {
  const byLine = new Map<number, Segment>();
  const seen = new Set<number>();
  for (const a of anchors) {
    for (const w of words) {
      if (!(w.start < a.end && a.start < w.end) || seen.has(w.i)) continue;
      seen.add(w.i);
      const box = layout.boxes.get(w.i);
      const n = layout.lineOf.get(w.i);
      if (!box || n === undefined) continue;
      const line = layout.lines[n];
      const seg = byLine.get(n);
      if (!seg) {
        byLine.set(n, { x1: box.left, x2: box.left + box.width, top: line.top, room: line.room, count: 1 });
      } else {
        seg.x1 = Math.min(seg.x1, box.left);
        seg.x2 = Math.max(seg.x2, box.left + box.width);
        seg.count += 1;
      }
    }
  }
  return [...byLine.entries()].sort((a, b) => a[0] - b[0]).map(([, seg]) => seg);
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
  segments,
  still,
}: {
  kind: RelationKind;
  indicators: string[];
  segments: Segment[];
  still: boolean;
}) {
  if (!segments.length) return null;

  // Each stretch arcs over its own words, inside the clear space above its
  // line: the base sits just over the letters and the peak never rises past
  // the gap, so nothing is ever drawn through the line above.
  const shapes = segments.map((seg) => {
    const base = seg.top - 3;
    const lift = Math.max(3, Math.min(10, seg.room - 9));
    const d = `M ${seg.x1} ${base} Q ${(seg.x1 + seg.x2) / 2} ${base - 2 * lift} ${seg.x2} ${base}`;
    return { seg, base, d, len: Math.ceil(seg.x2 - seg.x1 + 4 * lift + 24) };
  });

  const direction = kind === "conditional" ? directionOf(indicators[0]) : null;
  const first = shapes[0];
  const last = shapes[shapes.length - 1];
  const head =
    direction === "necessary" ? { x: first.seg.x1, y: first.base } : { x: last.seg.x2, y: last.base };
  const showHead = kind === "causal" || (kind === "conditional" && direction !== null);

  return (
    <g data-testid={`ob-figure-${kind}`} data-kind={kind}>
      {shapes.map(({ d, len }, n) => (
        <path
          key={n}
          className="ob-figure"
          data-kind={kind}
          data-draw={still ? undefined : "true"}
          d={d}
          style={
            still
              ? undefined
              : ({ strokeDasharray: len, ["--ob-len" as string]: len } as React.CSSProperties)
          }
        />
      ))}
      {/* Causal is doubled: a second shaft just above the first, so the push is
          visible in the line's weight rather than in a colour. Above, not
          below: below is where the letters are. */}
      {kind === "causal"
        ? shapes.map(({ d }, n) => (
            <path
              key={`echo-${n}`}
              className="ob-figure"
              data-kind="causal"
              d={d}
              transform="translate(0,-3)"
              opacity={0.6}
            />
          ))
        : null}
      {/* Comparative gets a level beam under each stretch that spans two terms.
          Level, because the figure does not know which term is greater, and an
          "as strong as" has no greater term at all. */}
      {kind === "comparative"
        ? shapes
            .filter(({ seg }) => seg.count > 1)
            .map(({ seg, base }, n) => (
              <g key={`beam-${n}`} className="ob-beam" data-testid="ob-beam">
                <line className="ob-figure" data-kind="comparative" x1={seg.x1} y1={base} x2={seg.x2} y2={base} />
              </g>
            ))
        : null}
      {showHead ? (
        <polygon
          className="ob-arrowhead"
          data-testid={`ob-head-${kind}`}
          points={`${head.x},${head.y} ${head.x - 4},${head.y - 7} ${head.x + 4},${head.y - 7}`}
        />
      ) : null}
    </g>
  );
}

/** A relationship the student named that is not in the statement. */
function Ghost({ kind, width, line }: { kind: RelationKind; width: number; line?: Line }) {
  // Over the first line, inside the space above it, so the dissolving shape
  // never sits on the words the student is reading.
  const base = (line?.top ?? FIRST_LINE_ROOM) - 4;
  return (
    <path
      className="ob-figure"
      data-kind={kind}
      data-ghost="true"
      data-testid={`ob-ghost-${kind}`}
      d={`M ${width * 0.2} ${base} Q ${width * 0.5} ${base - 26} ${width * 0.8} ${base}`}
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
          aria-label={`${SEAL_LABEL[k]}: ${seals?.[k] ? "answered correctly" : "not yet answered correctly"}`}
          data-testid={`ob-seal-${k}`}
        >
          {SEAL_LABEL[k]}
        </span>
      ))}
    </div>
  );
}
