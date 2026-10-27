import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Argument, Build } from "./atelier";
import "./atelier.css";

/**
 * The Argument Atelier: Find the Conclusion's world.
 *
 * Before the build, the claims lie on the drafting table in reading order, one
 * pane each, and disclose nothing. After it, they leave prose order and
 * assemble: the conclusion rises and crowns, the rest slide beneath it, and a
 * strut is drawn from each support up to the crown.
 *
 * The one thing the room refuses to do is crown a pane it is not sure of. When
 * the conclusion was never in the argument, which is the whole of Level 5, an
 * empty drawn pane rises in its place. That absence is the lesson, not a gap.
 */

export type AtelierPhase = "table" | "built";

/** One item's outcome on the blueprint strip. Real verdicts only. */
export interface Plaque {
  order: number;
  outcome: "correct" | "partial" | "incorrect" | null;
}

interface AtelierStageProps {
  argument: Argument;
  phase: AtelierPhase;
  /** The reading of the student's answer. Absent before they commit. */
  build?: Build | null;
  /** Completed items. Omit and the strip renders nothing rather than a fake run. */
  plaques?: Plaque[];
}

const DEAL = { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const };

export function AtelierStage({ argument, phase, build, plaques }: AtelierStageProps) {
  const still = useReducedMotion() ?? false;
  const built = phase === "built";

  // The build order: crown first, then the supports beneath it. Before the
  // build the panes stay in reading order, because reordering them early would
  // disclose the structure the student is being asked to find.
  const order = useMemo(() => {
    if (!built) return argument.claims.map((c) => c.n);
    const crown = argument.crown;
    const rest = argument.claims.map((c) => c.n).filter((n) => n !== crown);
    return crown === null ? rest : [crown, ...rest];
  }, [built, argument]);

  // Training wheels: indicator small-caps at Levels 1-2, plain at 3+.
  const showIndicator = argument.level > 0 && argument.level <= 2 && !!argument.indicator;

  return (
    <div
      className="atelier atelier-table flex h-full min-h-[560px] w-full flex-col gap-6 px-5 py-8 md:px-12"
      data-phase={phase}
      data-testid="atelier"
    >
      {/* The workshop: lamp cone, dust, hanging glass, bench, grid. Pure
          scenery, aria-hidden, outside every tested container. */}
      <div className="at-room" aria-hidden="true">
        <div className="at-sheets" />
        <div className="at-bench" />
        <div className="at-gridlines" />
        <div className="at-cone" />
        <div className="at-dust" />
      </div>

      <div className="flex items-center justify-between">
        <span className="atelier-display text-base text-[hsl(var(--at-ink))]">
          {built ? "The structure" : "The argument"}
        </span>
        <span className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">
          Level {argument.level}
        </span>
      </div>

      <div className="relative flex flex-col gap-3" data-testid="atelier-stack">
        {/* The unstated crown, when the conclusion was never on the table. It
            rises in the crown's place so the structure still has a top. */}
        {built && argument.crown === null ? (
          <motion.div
            layout={!still}
            transition={still ? { duration: 0 } : DEAL}
            className="at-pane rounded-sm px-5 py-4"
            data-role="unstated"
            data-testid="at-pane-unstated"
          >
            <p className="atelier-mono mb-2 text-xs text-[hsl(var(--at-lamp))]">
              Not stated in the argument
            </p>
            <p className="atelier-type text-base leading-snug">{argument.conclusion}</p>
          </motion.div>
        ) : null}

        {order.map((n, position) => {
          const claim = argument.claims[n];
          const isCrown = built && n === argument.crown;
          const role = !built ? "claim" : isCrown ? "crown" : "support";
          return (
            <motion.div
              key={claim.n}
              layout={!still}
              transition={still ? { duration: 0 } : DEAL}
              className="at-pane rounded-sm px-5 py-4"
              // Depth offset: supports step back under the crown once built.
              style={
                built && !isCrown
                  ? { marginLeft: `${Math.min(position, 4) * 12}px` }
                  : undefined
              }
              data-role={role}
              data-liftable={!built ? "true" : "false"}
              data-wrong-turn={built && n === argument.wrongTurn ? "true" : undefined}
              data-picked={built && build?.pickedClaim === n ? "true" : undefined}
              data-testid={`at-pane-${claim.n}`}
            >
              <p className="atelier-type text-base leading-snug">
                {showIndicator ? withIndicator(claim.text, argument.indicator!) : claim.text}
              </p>

              {/* The strut. Drawn from each support up to the crown, and only
                  when there is a crown for it to reach. */}
              {built && !isCrown && argument.crown !== null ? (
                <Strut still={still} delay={position * 60} />
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {built && build ? <Placement build={build} argument={argument} /> : null}

      {plaques?.length ? <Strip plaques={plaques} current={argument.order} /> : null}
    </div>
  );
}

/**
 * Lift the conclusion indicator into small-caps inside the claim's own text.
 * Levels 1-2 only; the ladder takes the wheels off at 3.
 */
function withIndicator(text: string, indicator: string) {
  const at = text.toLowerCase().indexOf(indicator);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="at-indicator" data-testid="at-indicator">
        {text.slice(at, at + indicator.length)}
      </span>
      {text.slice(at + indicator.length)}
    </>
  );
}

/** The support strut, drawn upward to the crown over 400ms. */
function Strut({ still, delay }: { still: boolean; delay: number }) {
  const LEN = 26;
  return (
    <svg
      className="pointer-events-none absolute -top-3 left-6 h-3 w-4 overflow-visible"
      aria-hidden="true"
      data-testid="at-strut"
    >
      <path
        className="at-strut"
        d="M 2 12 L 2 2"
        style={
          still
            ? { strokeDashoffset: 0 }
            : ({ strokeDasharray: LEN, ["--at-len" as string]: LEN, animationDelay: `${delay}ms` } as React.CSSProperties)
        }
      />
      <path className="at-strut-head" d="M 2 0 L 5 5 L -1 5 Z" />
    </svg>
  );
}

/**
 * Where the student's answer landed.
 *
 * The spec makes the gap the diagnosis: the distance from crown to marker is
 * the feedback. When the answer matched no pane the room says that instead of
 * inventing a distance.
 */
function Placement({ build, argument }: { build: Build; argument: Argument }) {
  if (!build.placement) return null;

  const line =
    build.placement === "crown"
      ? "That is the claim everything else is holding up."
      : build.placement === "wrong-turn"
        ? "That claim works for the conclusion. It does not get supported, it supports."
        : build.placement === "support"
          ? "That claim is doing support work, so it sits under the one being proved."
          : "That answer did not match a claim on the table.";

  return (
    <div className="flex flex-col gap-1.5" data-testid="at-placement" data-placement={build.placement}>
      <p className="atelier-mono text-xs text-[hsl(var(--at-ink-dim))]">
        {build.distance === null
          ? "Your answer"
          : build.distance === 0
            ? "Your answer, at the crown"
            : `Your answer, ${build.distance} ${build.distance === 1 ? "pane" : "panes"} below the crown`}
      </p>
      <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--at-ink-dim))]">{line}</p>
      {argument.crown === null ? (
        <p className="max-w-prose text-sm leading-relaxed text-[hsl(var(--at-ink-dim))]">
          This argument never states its conclusion. You had to build it.
        </p>
      ) : null}
    </div>
  );
}

/** The blueprint strip: five level plaques filled by real verdicts. */
function Strip({ plaques, current }: { plaques: Plaque[]; current: number }) {
  return (
    <div className="mt-auto pt-4" data-testid="at-strip">
      <p className="atelier-mono mb-2 text-xs text-[hsl(var(--at-ink-dim))]">
        {plaques.filter((p) => p.outcome).length} of {plaques.length} drawn
      </p>
      <div className="flex flex-wrap gap-1.5">
        {plaques.map((p) => (
          <span
            key={p.order}
            className="at-plaque atelier-mono rounded-sm px-2 py-1 text-xs"
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
