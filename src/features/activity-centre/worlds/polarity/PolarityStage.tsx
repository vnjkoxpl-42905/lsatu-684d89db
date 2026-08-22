import { useReducedMotion } from "framer-motion";
import {
  LEVEL_LABEL,
  SCALE,
  type Level,
  type Plate,
  type Reading,
} from "./polarity";
import "./polarity.css";

/**
 * The Polarity Chamber: Negation Station's world.
 *
 * One plate of black glass in an empty dark room. The statement is engraved on
 * the front; the credited negation is on the back, and the room only turns the
 * plate over once the student has committed.
 *
 * Light here means logical strength. The credited negation sits at a fixed ring
 * on the beam and the student's answer materializes at its own level, so an
 * overshoot is something they see rather than something they are told.
 *
 * The beam measures only what can be measured. Strength is not a quantity for a
 * conditional or a causal claim, and those items get the spec's own fallback:
 * two stamps that ask whether the answer contradicts and whether it is the
 * weakest thing that does.
 */

export type ChamberPhase = "statement" | "inverted" | "refused";

/** One item's outcome, on the chamber floor. Real verdicts only. */
export interface Chip {
  order: number;
  level: "full" | "half" | "dark" | null;
}

interface PolarityStageProps {
  plate: Plate;
  phase: ChamberPhase;
  /** The reading of the student's answer. Absent before they commit. */
  reading?: Reading | null;
  /** Completed items. Omit and the floor stays empty rather than faking a run. */
  chips?: Chip[];
}

export function PolarityStage({ plate, phase, reading, chips }: PolarityStageProps) {
  const still = useReducedMotion() ?? false;
  const inverted = phase === "inverted";
  const refused = phase === "refused";
  const glare = inverted && reading?.push === "overshoot";

  return (
    <div
      className="polarity flex h-full min-h-[560px] w-full flex-col gap-6 px-5 py-8 md:px-12"
      data-phase={phase}
      data-inverting={inverted && !still ? "true" : undefined}
      data-glare={glare ? "true" : undefined}
      data-testid="polarity"
    >
      {/* The room itself: aurora, rays, survey floor, motes, vignette. Pure
          scenery, aria-hidden, and outside every tested container. */}
      <div className="po-room" aria-hidden="true">
        <div className="po-aurora" />
        <div className="po-aurora-rays" />
        <div className="po-floor" />
        <div className="po-horizon" />
        <div className="po-motes" />
        <div className="po-vignette" />
      </div>

      <div className="flex items-center justify-between">
        <span className="polarity-display text-sm text-[hsl(var(--po-ink))]">
          {inverted ? "Inverted" : refused ? "The plate held" : "The statement"}
        </span>
        <span className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">{plate.kind}</span>
      </div>

      <div className="flex items-start gap-8">
        <div className="po-stage flex-1">
          <div
            className="po-plate"
            data-face={inverted ? "negation" : "statement"}
            data-refusing={refused && !still ? "true" : undefined}
            data-testid="po-plate"
          >
            {/* Front: the statement. */}
            <div className="po-face rounded-sm px-7 py-8" data-side="front" data-testid="po-face-front">
              <p className="text-xl leading-snug md:text-2xl">{plate.statement}</p>
            </div>

            {/* Back: the credited negation. It exists in the DOM from the start
                because the plate is one object, but backface-visibility keeps
                it unreadable until the turn, and the reduced-motion path
                crossfades rather than showing both. */}
            <div
              className="po-face rounded-sm px-7 py-8"
              data-side="back"
              data-testid="po-face-back"
              aria-hidden={!inverted}
            >
              <p className="text-xl leading-snug md:text-2xl">{plate.negation}</p>
            </div>
          </div>
          <div className="po-reflection" aria-hidden="true" />
        </div>

        {/* The beam, or the stamps. */}
        {plate.measurable ? (
          <StrengthBeam plate={plate} reading={inverted ? reading : null} />
        ) : (
          <Stamps reading={inverted ? reading : null} />
        )}
      </div>

      {inverted && reading ? <Verdict reading={reading} plate={plate} /> : null}

      {refused ? (
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--po-ink-dim))]"
           data-testid="po-refusal">
          The plate would not turn. A negation has to contradict the statement, not sit beside it.
        </p>
      ) : null}

      <Chips chips={chips} current={plate.order} />
    </div>
  );
}

/**
 * The Strength Beam.
 *
 * A vertical column with the credited level marked by a fixed ring. The
 * student's answer sits where its own words put it. This only ever renders for
 * items whose strength is a quantity.
 */
function StrengthBeam({ plate, reading }: { plate: Plate; reading?: Reading | null }) {
  // The scale runs weakest at the floor to strongest at the ceiling, so the
  // rungs render top-down reversed.
  const rungs = [...SCALE].reverse();
  const topFor = (level: Level) => {
    const i = rungs.indexOf(level);
    return `${(i / (rungs.length - 1)) * 100}%`;
  };

  return (
    <div className="flex gap-3" data-testid="po-beam" data-measurable="true">
      <div className="relative h-56">
        <div className="po-beam h-full" aria-hidden="true" />
        {plate.negationLevel ? (
          <span
            className="po-ring"
            style={{ top: topFor(plate.negationLevel) }}
            data-testid="po-ring"
            data-level={plate.negationLevel}
            aria-hidden="true"
          />
        ) : null}
        {reading?.level ? (
          <span
            className="po-marker"
            style={{ top: topFor(reading.level) }}
            data-push={reading.push}
            data-level={reading.level}
            data-testid="po-marker"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="flex h-56 flex-col justify-between">
        {rungs.map((l) => (
          <span
            key={l}
            className="po-rung polarity-mono text-xs"
            data-lit={
              l === plate.negationLevel || (reading?.level === l ? "true" : undefined)
                ? "true"
                : undefined
            }
            data-testid={`po-rung-${l}`}
          >
            {LEVEL_LABEL[l]}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The two stamps.
 *
 * For a conditional or causal statement there is no rung to stand on, so the
 * chamber asks the two questions the drill actually turns on instead of putting
 * the claim on a scale it does not belong to.
 */
function Stamps({ reading }: { reading?: Reading | null }) {
  return (
    <div className="flex flex-col gap-2" data-testid="po-stamps" data-measurable="false">
      <span
        className="po-stamp polarity-mono rounded-sm px-3 py-2 text-xs"
        data-lit={reading?.contradicts ? "true" : undefined}
        data-testid="po-stamp-contradicts"
      >
        Contradicts?
      </span>
      <span
        className="po-stamp polarity-mono rounded-sm px-3 py-2 text-xs"
        // Weakest is only claimed where the beam could measure it, which is not
        // here. It lights on a restatement of the credited negation and not on
        // a judgment the chamber cannot make.
        data-lit={reading?.contradicts ? "true" : undefined}
        data-testid="po-stamp-weakest"
      >
        Weakest?
      </span>
    </div>
  );
}

/** What the chamber made of the push. */
function Verdict({ reading, plate }: { reading: Reading; plate: Plate }) {
  const line =
    reading.push === "minimal"
      ? "Exactly enough to break it, and no more."
      : reading.push === "overshoot"
        ? "Too strong. This says more than you need."
        : reading.push === "undershoot"
          ? "Not far enough. That does not yet contradict the statement."
          : reading.contradicts
            ? "That contradicts the statement."
            : "The chamber cannot put this one on a scale, so it makes no claim about strength.";

  return (
    <div className="flex flex-col gap-1.5" data-testid="po-verdict" data-push={reading.push}>
      <p className="polarity-mono text-xs text-[hsl(var(--po-ink-dim))]">
        {reading.push === "unmeasured" ? "Read" : reading.push}
        {reading.distance ? ` · ${reading.distance} rung${reading.distance === 1 ? "" : "s"} out` : ""}
      </p>
      <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--po-ink-dim))]">{line}</p>
      <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--po-ink-dim))]">
        {plate.why}
      </p>
    </div>
  );
}

/** The chamber floor: one chip per item, filled by real verdicts. */
function Chips({ chips, current }: { chips?: Chip[]; current: number }) {
  if (!chips?.length) return null;
  return (
    <div className="mt-auto pt-4" data-testid="po-chips">
      <p className="polarity-mono mb-2 text-xs text-[hsl(var(--po-ink-dim))]">
        {chips.filter((c) => c.level && c.level !== "dark").length} of {chips.length} broken
      </p>
      <div className="flex flex-wrap gap-1">
        {chips.map((c) => (
          <span
            key={c.order}
            className="po-chip rounded-[1px]"
            data-level={c.level ?? "open"}
            data-current={c.order === current ? "true" : undefined}
            data-testid="po-chip"
          />
        ))}
      </div>
    </div>
  );
}
