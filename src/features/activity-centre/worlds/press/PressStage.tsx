import { motion, useReducedMotion } from "framer-motion";
import type { Press, Stroke, TrapKind } from "./press";
import { gaugeState } from "./press";
import "./press.css";

/**
 * The Press: Dumb it Down's world.
 *
 * The paragraph stands on the bed as a monolith of set type, deliberately
 * heavy. The student's one sentence is the press stroke. On a good stroke the
 * platen comes down and the mass becomes a single line of type, which is the
 * drill's promise made physical: this wall of words wants to be one sentence.
 *
 * The refusal matters as much as the stroke. On a wrong answer the platen dips
 * and returns, and the monolith stands. The world's "no" is the paragraph
 * remaining un-conquered.
 */

export type PressPhase = "arrival" | "struck" | "refused";

/** One finished item's slug, kept on the spike file. Real work only. */
export interface SpikeSlug {
  order: number;
  slug: string;
}

interface PressStageProps {
  press: Press;
  phase: PressPhase;
  /** What the student wrote. Printed on its own slug beside the credited one. */
  response?: string;
  /** The reading of that sentence. Coverage inside it comes from the Coach. */
  stroke?: Stroke | null;
  /** Finished slugs. Omit and the spike renders nothing rather than a fake run. */
  spike?: SpikeSlug[];
}

/** Heavy. The platen is plant, and it should land like plant. */
const STROKE = { duration: 0.9, ease: [0.7, 0, 0.18, 1] as const };
/** The refusal: down a little, and back. */
const REFUSAL = { duration: 0.42, ease: [0.4, 0, 0.2, 1] as const };

const TRAP_CAPTION: Record<TrapKind, string> = {
  narrow: "True, but too small.",
  topic: "The topic, not the point.",
  sprawl: "One sentence.",
};

const GAUGE_LABEL = {
  short: "Short",
  "in-range": "In range",
  long: "Getting long",
} as const;

export function PressStage({ press, phase, response, stroke, spike }: PressStageProps) {
  const still = useReducedMotion() ?? false;
  const struck = phase === "struck";
  const refused = phase === "refused";

  return (
    <div
      className="press flex h-full min-h-[560px] w-full flex-col gap-6 px-5 py-8 md:px-12"
      data-phase={phase}
    >
      {/* The shop: iron frame, ink rollers, work lamp, spatter. Pure scenery,
          aria-hidden, outside every tested container. */}
      <div className="pr-room" aria-hidden="true">
        <div className="pr-glow" />
        <div className="pr-frame" />
        <div className="pr-rollers" />
        <div className="pr-spatter" />
        <div className="pr-vignette" />
      </div>

      {/* The platen: a wide machined bar that waits above the bed. */}
      <motion.div
        className="press-platen"
        animate={{ y: struck ? 30 : refused ? 8 : 0 }}
        transition={still ? { duration: 0 } : refused ? REFUSAL : STROKE}
        data-testid="press-platen"
        data-down={struck ? "true" : "false"}
        aria-hidden="true"
      />

      {/* The monolith. It compresses from its base so the type collapses down
          onto the bed rather than shrinking towards its own middle — and the
          bed itself closes behind the stroke: the machine's whole thesis is
          compression, so the height the paragraph occupied is given up rather
          than left as an empty shaft. (Deliberate exception to the no-layout-
          animation rule: this collapse IS the content, and it runs once per
          strike, not per frame of idle UI.) */}
      <motion.div
        className="press-monolith rounded-sm px-6 py-5"
        animate={{
          scaleY: struck && !still ? 0.06 : 1,
          opacity: struck ? 0.22 : 1,
          height: struck && !still ? 42 : "auto",
        }}
        transition={still ? { duration: 0 } : STROKE}
        data-testid="press-monolith"
        data-ghosted={struck ? "true" : "false"}
        style={{ overflow: "hidden" }}
      >
        <p className="press-type text-base leading-relaxed md:text-lg">{press.monolith}</p>
      </motion.div>

      {struck ? (
        <div className="flex flex-col gap-4" data-testid="press-slugs">
          <Slug label="The line it makes" tone="credited" text={press.slug} />

          {response ? (
            <Slug
              label="Your line"
              tone={stroke?.trap ?? "student"}
              text={response}
              caption={stroke?.trap ? TRAP_CAPTION[stroke.trap] : undefined}
            />
          ) : null}

          <Checklist ideas={press.ideas} covered={stroke?.covered} />
        </div>
      ) : null}

      {refused ? (
        <p className="press-refusal text-sm" data-testid="press-refusal">
          The platen would not come down. Try again with everything that has to survive.
        </p>
      ) : null}

      {response && !struck ? (
        <Gauge words={stroke?.wordCount ?? 0} target={press.targetWords} />
      ) : null}

      {spike?.length ? <Spike slugs={spike} current={press.order} /> : null}
    </div>
  );
}

/**
 * A slug of set type. The trap tones are the spec's staging: the too-narrow
 * slug prints short and thin, and the topic-only slug prints full width but
 * hollow, so the shape of the error is visible before the caption is read.
 */
function Slug({
  label,
  tone,
  text,
  caption,
}: {
  label: string;
  tone: TrapKind | "credited" | "student";
  text: string;
  caption?: string;
}) {
  return (
    <div>
      <p className="press-mono mb-1.5 text-xs text-[hsl(var(--pr-ink-dim))]">{label}</p>
      <div
        className="press-slug rounded-sm px-4 py-3"
        data-tone={tone}
        data-testid={`press-slug-${tone}`}
      >
        <p className="press-type text-base leading-snug">{text}</p>
      </div>
      {caption ? (
        <p className="press-mono mt-1.5 text-xs text-[hsl(var(--pr-signal))]" data-testid="press-caption">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/**
 * What had to survive the crush.
 *
 * When the Coach has judged coverage, each idea carries a tick or a gap. When
 * it has not, the list still renders, unticked: naming what mattered is worth
 * showing on its own, and claiming a tick nobody judged would be a lie about
 * the student's own answer.
 */
function Checklist({
  ideas,
  covered,
}: {
  ideas: Press["ideas"];
  covered?: number[];
}) {
  const judged = Array.isArray(covered);
  return (
    <div data-testid="press-checklist" data-judged={judged ? "true" : "false"}>
      <p className="press-mono mb-2 text-xs text-[hsl(var(--pr-ink-dim))]">
        {judged ? "What survived" : "What had to survive"}
      </p>
      <ul className="flex flex-col gap-1.5">
        {ideas.map((idea) => {
          const state = !judged ? "unjudged" : covered!.includes(idea.n) ? "kept" : "lost";
          return (
            <li
              key={idea.n}
              className="press-idea flex items-start gap-3 text-sm"
              data-state={state}
              data-testid="press-idea"
            >
              <span className="press-idea-mark" aria-hidden="true" />
              <span className="text-[hsl(var(--pr-ink))]">{idea.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The compression gauge, read against the credited slug's own length. */
function Gauge({ words, target }: { words: number; target: number }) {
  const state = gaugeState(words, target);
  // Full width at 1.5x the target, which is where the label turns.
  const fill = Math.min(100, Math.round((words / (target * 1.5)) * 100));
  return (
    <div data-testid="press-gauge" data-state={state}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">Compression</span>
        <span className="press-mono text-xs text-[hsl(var(--pr-ink-dim))]">
          {GAUGE_LABEL[state]}
        </span>
      </div>
      <div className="press-gauge-track">
        <div className="press-gauge-fill" style={{ transform: `scaleX(${fill / 100})` }} />
      </div>
    </div>
  );
}

/** The spike file: one line of type per finished item. */
function Spike({ slugs, current }: { slugs: SpikeSlug[]; current: number }) {
  return (
    <div className="mt-auto pt-4" data-testid="press-spike">
      <p className="press-mono mb-2 text-xs text-[hsl(var(--pr-ink-dim))]">
        Spike file · {slugs.length} {slugs.length === 1 ? "line" : "lines"}
      </p>
      <ul className="flex flex-col gap-1">
        {slugs.slice(-4).map((s) => (
          <li
            key={s.order}
            className="press-spike-line truncate text-xs"
            data-current={s.order === current ? "true" : undefined}
          >
            {s.slug}
          </li>
        ))}
      </ul>
    </div>
  );
}
