import { motion, useReducedMotion } from "framer-motion";
import {
  ARC,
  ARC_LABEL,
  rejectionOf,
  type Rebuttal,
  type Resolution,
  type Strength,
} from "./chamber";
import "./chamber.css";

/**
 * The Debate Chamber: Rebuttal Rephrase's world.
 *
 * Two plinths. Theirs carries the attributed claim. The author's stands empty
 * with a referential rejection hovering over it, shimmering on the words that
 * point at something and say nothing. The student's job is to put the author's
 * actual claim on the author's plinth, at the right strength.
 *
 * The Certainty Arc is the second machine, and it is deliberately dark more
 * often than it is lit: it measures one claim's strength, so it says nothing
 * about a compound rebuttal, and nothing about a claim whose words fix no
 * position. A needle is a measurement, not decoration.
 */

export type ChamberPhase = "unresolved" | "resolved";

/** One item's outcome on the chamber rail. Real verdicts only. */
export interface Nameplate {
  order: number;
  outcome: "correct" | "partial" | "incorrect" | null;
}

interface ChamberStageProps {
  rebuttal: Rebuttal;
  phase: ChamberPhase;
  /** What the student wrote. */
  response?: string;
  /** The reading of it. Absent before they commit. */
  resolution?: Resolution | null;
  /** Completed items. Omit and the rail renders nothing rather than a fake run. */
  rail?: Nameplate[];
}

const SETTLE = { duration: 0.52, ease: [0.22, 1, 0.36, 1] as const };

/**
 * Referential words that leave a rejection contentless. No `g` flag: this is
 * only ever used with split(), which ignores it, and a stateful lastIndex on a
 * shared regex is a bug waiting for the next caller.
 */
const REFERENTIAL = /\b(this|that|these|those|they|it)\b/i;

export function ChamberStage({
  rebuttal,
  phase,
  response,
  resolution,
  rail,
}: ChamberStageProps) {
  const still = useReducedMotion() ?? false;
  const resolved = phase === "resolved";

  return (
    <div
      className="chamber flex h-full min-h-[560px] w-full flex-col gap-6 px-5 py-8 md:px-12"
      data-phase={phase}
      data-testid="chamber"
    >
      {/* The rotunda: torch flames, pilasters, floor veins. Pure scenery,
          aria-hidden, outside every tested container. */}
      <div className="ch-room" aria-hidden="true">
        <div className="ch-columns" />
        <div className="ch-floorveins" />
        <div className="ch-torchlight" />
        <div className="ch-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <span className="chamber-display text-sm text-[hsl(var(--ch-ink))]">
          {resolved ? "Two positions" : "One position, and a rejection"}
        </span>
        <span className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
          Level {rebuttal.level}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2" data-testid="ch-plinths">
        {/* Their plinth. */}
        <div>
          <p className="chamber-mono mb-2 text-xs text-[hsl(var(--ch-ink-dim))]">
            {rebuttal.attributed ? "Their claim" : "The argument"}
          </p>
          <div className="ch-plinth rounded-sm px-5 py-5" data-state="attributed" data-testid="ch-plinth-theirs">
            <p className="chamber-type text-base leading-snug">
              {rebuttal.attributed ?? rebuttal.argument}
            </p>
          </div>
        </div>

        {/* The author's plinth: empty until the claim is resolved onto it. */}
        <div>
          <p className="chamber-mono mb-2 text-xs text-[hsl(var(--ch-ink-dim))]">
            The author's claim
          </p>
          <motion.div
            className="ch-plinth rounded-sm px-5 py-5"
            animate={{ opacity: 1 }}
            transition={still ? { duration: 0 } : SETTLE}
            data-state={resolved ? "resolved" : "empty"}
            data-testid="ch-plinth-authors"
          >
            {resolved ? (
              <p className="chamber-type text-base leading-snug" data-testid="ch-credited">
                <Carved text={rebuttal.credited} dropped={resolution?.dropped ?? []} />
              </p>
            ) : (
              <Ghost rejection={rejectionOf(rebuttal.argument)} />
            )}
          </motion.div>

          {/* A premise answer holds the claim up rather than being it, so it
              renders as a block at the plinth's base. */}
          {resolved && resolution?.trap === "premise" && response ? (
            <div className="ch-base-block rounded-b-sm px-5 py-3" data-testid="ch-base-block">
              <p className="chamber-type text-sm leading-snug">{response}</p>
              <p className="chamber-mono mt-2 text-xs">
                Evidence. It holds the claim up, it is not the claim.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <CertaintyArc
        rebuttal={rebuttal}
        resolution={resolved ? resolution : null}
        still={still}
      />

      {resolved && resolution ? (
        <Reading resolution={resolution} rebuttal={rebuttal} />
      ) : null}

      {rail?.length ? <Rail plates={rail} current={rebuttal.order} /> : null}
    </div>
  );
}

/**
 * The referential rejection, hovering unresolved.
 *
 * The shimmer runs on the referential words only, because those are the ones
 * doing the pointing. When the argument carries no separable rejection (its
 * Level 3 items reject inside the framing verb) the plinth says that instead of
 * inventing a phrase to ghost.
 */
function Ghost({ rejection }: { rejection: string | null }) {
  if (!rejection) {
    return (
      <p className="ch-ghost text-sm leading-snug" data-testid="ch-ghost">
        The author rejects the claim without ever stating their own.
      </p>
    );
  }

  // split() on a regex with a capture group already interleaves the matches
  // into the result, so the odd indices ARE the referential words. Pulling them
  // separately and re-inserting them prints each one twice.
  const parts = rejection.split(REFERENTIAL);

  return (
    <p className="ch-ghost text-base leading-snug" data-testid="ch-ghost">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span className="ch-ghost-ref" key={i} data-testid="ch-ghost-ref">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  );
}

/** The dropped scope word, carved oversized on the credited claim. */
function Carved({ text, dropped }: { text: string; dropped: string[] }) {
  if (!dropped.length) return <>{text}</>;

  // Carve the first dropped qualifier where it sits in the credited claim.
  const word = dropped[0];
  const at = text.toLowerCase().indexOf(word.toLowerCase());
  if (at < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, at)}
      <span className="ch-carved" data-testid="ch-carved">
        {text.slice(at, at + word.length)}
      </span>
      {text.slice(at + word.length)}
    </>
  );
}

/**
 * The Certainty Arc.
 *
 * Dark until there is something true to show. Both needles come from the
 * claims' own words; the student's needle appears only when their answer's
 * words fix a position too.
 */
function CertaintyArc({
  rebuttal,
  resolution,
  still,
}: {
  rebuttal: Rebuttal;
  resolution?: Resolution | null;
  still: boolean;
}) {
  const lit = rebuttal.creditedStrength !== null || rebuttal.attributedStrength !== null;

  if (!lit) {
    return (
      <div data-testid="ch-arc" data-lit="false">
        <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">Certainty arc</p>
        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[hsl(var(--ch-ink-dim))]">
          {rebuttal.level >= 4
            ? "This rebuttal makes more than one move, so a single position on the arc would misstate it."
            : "These claims do not fix a strength, so the arc stays dark."}
        </p>
      </div>
    );
  }

  const W = 460;
  const H = 96;
  const cx = W / 2;
  const cy = H - 4;
  const R = 78;

  // Positions run left (none) to right (always) across a half circle.
  const angleFor = (s: Strength) => Math.PI - (ARC.indexOf(s) / (ARC.length - 1)) * Math.PI;
  const point = (s: Strength, r: number) => {
    const a = angleFor(s);
    return [cx + Math.cos(a) * r, cy - Math.sin(a) * r] as const;
  };

  const needle = (s: Strength | null, who: string) => {
    if (s === null) return null;
    const [x, y] = point(s, R - 8);
    return (
      <line
        key={who}
        className="ch-needle"
        data-who={who}
        data-position={s}
        data-testid={`ch-needle-${who}`}
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        style={still ? { transition: "none" } : undefined}
      />
    );
  };

  return (
    <div className="ch-arc" data-testid="ch-arc" data-lit="true">
      <p className="chamber-mono mb-1 text-xs text-[hsl(var(--ch-ink-dim))]">Certainty arc</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[460px]" role="img"
        aria-label="Certainty arc showing the strength of each claim">
        <path
          className="ch-arc-track"
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        />
        {ARC.map((s) => {
          const [x1, y1] = point(s, R);
          const [x2, y2] = point(s, R - 6);
          return <line key={s} className="ch-arc-tick" x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        {needle(rebuttal.attributedStrength, "attributed")}
        {needle(rebuttal.creditedStrength, "credited")}
        {resolution ? needle(resolution.strength, "student") : null}
      </svg>

      {/* Labels as HTML, on the document's own type ramp. */}
      <div className="ch-arc-labels mt-1 flex justify-between" style={{ maxWidth: 460 }}>
        {ARC.map((s) => (
          <span
            key={s}
            className="ch-arc-label chamber-mono text-xs"
            data-lit={
              s === rebuttal.creditedStrength || s === rebuttal.attributedStrength
                ? "true"
                : undefined
            }
            data-testid={`ch-arc-label-${s}`}
          >
            {ARC_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

/** What the chamber found in the answer. */
function Reading({
  resolution,
  rebuttal,
}: {
  resolution: Resolution;
  rebuttal: Rebuttal;
}) {
  const line =
    resolution.trap === "vague-referential"
      ? "That still points at their claim instead of stating the author's."
      : resolution.trap === "overshoot"
        ? "More than the author claims. The flip stops at the smallest claim that contradicts theirs."
        : resolution.trap === "scope-drop"
          ? `The claim is right, but it dropped ${resolution.dropped.join(", ")}.`
          : resolution.trap === "premise"
            ? "That is the evidence, not the claim it supports."
            : resolution.resolved
              ? "Resolved, at the author's own strength."
              : "That did not match the author's claim.";

  return (
    <div className="flex flex-col gap-1.5" data-testid="ch-reading" data-trap={resolution.trap ?? "none"}>
      <p className="chamber-mono text-xs text-[hsl(var(--ch-ink-dim))]">
        {resolution.trap ? resolution.trap.replace(/-/g, " ") : "Your answer"}
      </p>
      <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ch-ink-dim))]">{line}</p>
      {rebuttal.overshoot && resolution.trap === "overshoot" ? (
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--ch-ink-dim))]">
          The author has not said: {rebuttal.overshoot}
        </p>
      ) : null}
    </div>
  );
}

/** The chamber rail: one nameplate per item, filled by real verdicts. */
function Rail({ plates, current }: { plates: Nameplate[]; current: number }) {
  return (
    <div className="mt-auto pt-4" data-testid="ch-rail">
      <p className="chamber-mono mb-2 text-xs text-[hsl(var(--ch-ink-dim))]">
        {plates.filter((p) => p.outcome).length} of {plates.length} argued
      </p>
      <div className="flex flex-wrap gap-1.5">
        {plates.map((p) => (
          <span
            key={p.order}
            className="ch-nameplate chamber-mono rounded-sm px-2 py-1 text-xs"
            data-state={p.outcome ?? "open"}
            data-current={p.order === current ? "true" : undefined}
          >
            {p.order}
          </span>
        ))}
      </div>
    </div>
  );
}
