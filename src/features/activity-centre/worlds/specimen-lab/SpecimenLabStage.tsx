import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { renderInlineMarks } from "../../prompt-format";
import type { Charge, Instrument, Reading, Specimen } from "./specimen";
import { INSTRUMENTS } from "./specimen";
import "./specimen-lab.css";

/**
 * The Specimen Lab's bench.
 *
 * The word sits in a vitrine with a blank plate. The paragraph it was collected
 * from lies beneath as a field note. Above them, three instruments that stay
 * dark until the student's own reasoning activates them.
 *
 * The unlit instruments are the feedback. This drill grades the why, so a bench
 * that lit everything on a correct answer would be telling the student nothing
 * about their process; one that lights only what they used shows the growth
 * edge without a word of scolding.
 */

export type BenchPhase = "collection" | "read";

/** One filed specimen. `outcome` is a verdict the student actually earned. */
export interface Slide {
  order: number;
  word: string;
  outcome: "correct" | "partial" | "incorrect" | null;
}

interface SpecimenLabStageProps {
  specimen: Specimen;
  phase: BenchPhase;
  /** The bench's reading of the student's examination. Absent before they submit. */
  reading?: Reading | null;
  /** Filed specimens. Omit and the drawer renders nothing rather than a fake run. */
  drawer?: Slide[];
}

/** Slow enough to read as examination rather than decoration. An oscillation
 * rather than a full turn: at 90° the jar goes edge-on and past it the word
 * reads mirrored, so the case rocks the way a hand would turn it and the
 * specimen stays legible the whole time. */
const VITRINE_SPIN = {
  duration: 9,
  ease: "easeInOut" as const,
  repeat: Infinity,
  repeatType: "mirror" as const,
};
const SETTLE = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const };

const CHARGE_POSITIONS: Charge[] = ["neg", "neutral", "pos"];
const CHARGE_LABEL: Record<Charge, string> = { neg: "neg", neutral: "neutral", pos: "pos" };

const INSTRUMENT_NAME: Record<Instrument, string> = {
  charge: "Charge gauge",
  contrast: "Contrast detector",
  relation: "Relation lens",
};

const INSTRUMENT_READS: Record<Instrument, string> = {
  charge: "You called which way the word leans.",
  contrast: "You read the word off something it was set against.",
  relation: "You read the word off what the sentence does with it.",
};

const INSTRUMENT_DARK: Record<Instrument, string> = {
  charge: "No call on whether it leans positive or negative.",
  contrast: "No opposition cited.",
  relation: "Nothing cited about what the sentence does with the word.",
};

export function SpecimenLabStage({ specimen, phase, reading, drawer }: SpecimenLabStageProps) {
  const still = useReducedMotion() ?? false;
  const read = phase === "read";
  const lit = new Set(read ? (reading?.lit ?? []) : []);
  const cited = new Set((read ? (reading?.spans ?? []) : []).map((s) => s.text.toLowerCase()));

  return (
    <div
      className="specimen-lab flex h-full min-h-[560px] w-full flex-col gap-7 px-5 py-8 md:px-12"
      data-phase={phase}
    >
      {/* The study itself: green wall, lamp pool, bench grain, fern shadow.
          Pure scenery, aria-hidden, outside every tested container. */}
      <div className="sl-room" aria-hidden="true">
        <div className="sl-wall" />
        <div className="sl-fern" />
        <div className="sl-grain" />
        <div className="sl-lamplight" />
      </div>

      {/* The instrument rail sits above the field note, per the bench layout. */}
      <div className="grid gap-3 sm:grid-cols-3" data-testid="sl-rail">
        {INSTRUMENTS.map((key) => (
          <InstrumentPanel
            key={key}
            kind={key}
            lit={lit.has(key)}
            read={read}
            charge={key === "charge" ? (reading?.charge ?? null) : null}
            verdict={key === "charge" ? (reading?.chargeVerdict ?? null) : null}
          />
        ))}
      </div>

      <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:gap-10">
        {/* The vitrine */}
        <div className="flex flex-col items-center gap-4 lg:w-[38%]">
          <div className="sl-vitrine-scene" data-testid="sl-vitrine">
            <motion.div
              className="sl-vitrine"
              initial={still ? undefined : { rotateY: -14 }}
              animate={still ? undefined : { rotateY: 14 }}
              transition={still ? undefined : VITRINE_SPIN}
            >
              <span className="sl-specimen text-3xl leading-tight">
                {specimen.word}
              </span>
            </motion.div>
            <div className="sl-plinth" aria-hidden="true" />
          </div>

          <motion.div
            className="sl-plate w-full rounded-lg px-4 py-3 text-center"
            initial={false}
            animate={{ opacity: 1 }}
            transition={still ? { duration: 0 } : SETTLE}
            data-engraved={read ? "true" : "false"}
            data-testid="sl-plate"
          >
            {read ? (
              <>
                <p className="specimen-mono mb-1.5 text-xs text-[hsl(var(--sl-ink-dim))]">
                  Identified
                </p>
                <p className="text-sm leading-snug text-[hsl(var(--sl-ink))]">
                  {specimen.candidates.join(" · ")}
                </p>
              </>
            ) : (
              <p className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
                Specimen, unidentified
              </p>
            )}
          </motion.div>

          {read && specimen.trap ? <Boundary trap={specimen.trap} /> : null}
        </div>

        {/* The field note */}
        <div className="min-w-0 flex-1">
          <p className="specimen-mono mb-2 text-xs text-[hsl(var(--sl-ink-dim))]">Field note</p>
          <div className="sl-fieldnote rounded-xl px-6 py-5" data-testid="sl-fieldnote">
            <FieldNote text={specimen.fieldNote} cited={cited} revealed={read} />
          </div>

          {read && specimen.clue ? (
            <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--sl-ink-dim))]">
              <span className="specimen-mono mr-2 text-xs">Clue</span>
              {/* Clue lines carry their own authored marks (`prefix *a-* = not`),
                  so they go through the same parser the prompts do. */}
              {renderInlineMarks(specimen.clue, "clue")}
            </p>
          ) : null}
        </div>
      </div>

      {drawer?.length ? <Drawer slides={drawer} current={specimen.order} /> : null}
    </div>
  );
}

/**
 * The paragraph, with the target word marked as the bank authored it and the
 * wording the student actually cited picked out once the bench has read.
 * Before that, nothing is highlighted: the note gives away no evidence.
 */
function FieldNote({
  text,
  cited,
  revealed,
}: {
  text: string;
  cited: Set<string>;
  revealed: boolean;
}) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <p className="text-base leading-relaxed text-[hsl(var(--sl-ink))] md:text-lg">
      {parts.map((part, i) => {
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return (
            <em key={i} className="sl-target" data-testid="sl-target">
              {part.slice(1, -1)}
            </em>
          );
        }
        if (!revealed || cited.size === 0) return <Fragment key={i}>{part}</Fragment>;
        return (
          <Fragment key={i}>
            {part.split(/(\s+)/).map((token, j) => {
              const bare = token.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
              return bare && cited.has(bare) ? (
                <mark key={j} className="sl-cited" data-testid="sl-cited">
                  {token}
                </mark>
              ) : (
                <Fragment key={j}>{token}</Fragment>
              );
            })}
          </Fragment>
        );
      })}
    </p>
  );
}

function InstrumentPanel({
  kind,
  lit,
  read,
  charge,
  verdict,
}: {
  kind: Instrument;
  lit: boolean;
  read: boolean;
  charge: Charge | null;
  verdict: Reading["chargeVerdict"];
}) {
  return (
    <div
      className="sl-instrument rounded-xl px-4 py-3"
      data-instrument={kind}
      data-lit={lit ? "true" : "false"}
      data-testid={`sl-instrument-${kind}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="specimen-mono text-xs text-[hsl(var(--sl-ink-dim))]">
          {INSTRUMENT_NAME[kind]}
        </span>
        {kind === "charge" && lit && charge ? (
          <span className="specimen-mono text-xs text-[hsl(var(--sl-ink))]">
            {CHARGE_LABEL[charge]}
          </span>
        ) : null}
      </div>

      {kind === "charge" ? (
        <div className="sl-gauge" aria-hidden="true">
          {CHARGE_POSITIONS.map((p) => (
            <span key={p} className="sl-gauge-notch" data-active={lit && charge === p} />
          ))}
        </div>
      ) : kind === "contrast" ? (
        <div className="sl-brackets" aria-hidden="true">
          <span />
          <span />
        </div>
      ) : (
        <div className="sl-lens" aria-hidden="true" />
      )}

      {read ? (
        <p className="mt-2 text-xs leading-snug text-[hsl(var(--sl-ink-dim))]">
          {lit ? INSTRUMENT_READS[kind] : INSTRUMENT_DARK[kind]}
          {kind === "charge" && lit && verdict === "unscored" ? (
            <span className="block opacity-80">
              This item does not fix a charge, so the call stands as your reading.
            </span>
          ) : null}
          {kind === "charge" && lit && verdict === "differs" ? (
            <span className="block opacity-80">The paragraph points the other way.</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The precision boundary: the near-miss the item polices, placed outside an
 * etched line so the student can see how far off it sits. Only the five items
 * that authored a trap get one.
 */
function Boundary({ trap }: { trap: string }) {
  return (
    <div className="sl-boundary w-full rounded-lg px-4 py-3" data-testid="sl-boundary">
      <p className="specimen-mono mb-2 text-xs text-[hsl(var(--sl-ink-dim))]">Outside the line</p>
      <p className="sl-trap text-sm text-[hsl(var(--sl-ink-dim))]">{trap}</p>
    </div>
  );
}

/** Filed specimens along the bench's edge. Real verdicts only. */
function Drawer({ slides, current }: { slides: Slide[]; current: number }) {
  const filed = slides.filter((s) => s.outcome).length;
  return (
    <div className="mt-auto pt-4" data-testid="sl-drawer">
      <div className="flex flex-wrap gap-1.5">
        {slides.map((s) => (
          <span
            key={s.order}
            className="sl-slide"
            data-outcome={s.outcome ?? "empty"}
            data-current={s.order === current ? "true" : undefined}
            title={`${s.word}${s.outcome ? `: ${s.outcome}` : ""}`}
          />
        ))}
      </div>
      <p className="specimen-mono mt-2 text-xs text-[hsl(var(--sl-ink-dim))]">
        {filed} of {slides.length} filed
      </p>
    </div>
  );
}
