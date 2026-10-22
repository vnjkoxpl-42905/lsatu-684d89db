import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Clause, DerivedRouting, Fault, Routing } from "./routing";
import { differs } from "./routing";
import "./switchyard.css";

/**
 * The yard's three states. The whole drill lives in the move between them:
 * arrival (nothing routed), the routing (clauses couple onto their tracks), and
 * the flip (the junction rotates and performs the contrapositive).
 */
export type YardPhase = "arrival" | "routed" | "flipped";

/**
 * One marker per item in the run. `outcome` is the verdict the student actually
 * earned, or null for items not yet reached: the yard never renders progress it
 * cannot trace to a real answer.
 */
export interface Milepost {
  order: number;
  outcome: "correct" | "partial" | "incorrect" | null;
}

interface SwitchyardStageProps {
  /** The original sentence, shown on the departures board. */
  statement: string;
  /** The credited routing, parsed from the credited answer. */
  routing: Routing;
  /** The authored contrapositive, shown on its plate once the junction turns. */
  contrapositive: string;
  /**
   * The contrapositive as structure the yard can perform, or null when this
   * item did not pass the derivability gate. Null means the junction never
   * turns on its own and the authored plate carries the contrapositive instead:
   * a plate is not a downgrade, it is the sentence the author wrote.
   */
  derived?: DerivedRouting | null;
  /**
   * The indicator word ("only if", "unless"). Lit on the board only once the
   * yard has routed, never before: no pre-commit hints.
   */
  indicator?: string;
  phase: YardPhase;
  /**
   * The student's own routing, when their answer parsed. Drives the comparison
   * panel and the fault choreography. Omitted on a clean run.
   */
  studentRouting?: Routing | null;
  /** The named partial, derived by `diagnose`. Null means the yard makes no claim. */
  fault?: Fault | null;
  /** The run's mileposts. Omit and the yard renders none rather than inventing a position. */
  mileposts?: Milepost[];
  /** Which milepost is the current item. */
  currentOrder?: number;
}

/** Heavy, mechanical. The flip should feel like plant, not like a UI toggle. */
const MECHANICAL = { duration: 0.9, ease: [0.7, 0, 0.18, 1] as const };
const COUPLE = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
/** The statement rolling onto the board: lighter than the plant, still weighted. */
const ROLL_ON = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };

/**
 * The reversal sequence, in milliseconds from the verdict. The student watches
 * their own arrangement stand, get stopped, back out, and re-form the credited
 * way. Seeing the correction happen to their own routing is the whole point;
 * jumping straight to the right answer teaches nothing about the error.
 */
const REVERSAL_TIMELINE = { gate: 700, backing: 1300, credited: 2000 };

/**
 * How long the routed arrangement is held before the junction turns. Long
 * enough to read the two rails, short enough that nobody waits for it -- and
 * interruptible by construction, since Next never waits on the yard.
 */
const FLIP_HOLD = 1200;

type ReversalStep = "student" | "gate" | "backing" | "credited";

function TrackLabel({ children }: { children: string }) {
  return (
    <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">{children}</span>
  );
}

function Capsule({
  clause,
  live,
  blinking,
  trimmed,
  readable,
}: {
  clause: Clause;
  live: boolean;
  /** The dropped-negation fault: the lamp blinks until the student acknowledges it. */
  blinking?: boolean;
  /** The trimmed-condition fault: the capsule arrives missing a coupling. */
  trimmed?: boolean;
  /**
   * Say the polarity in words as well as with the lamp. Set on a derived flip,
   * where the capsule is carrying a clause the student never wrote: the lamp
   * alone asked them to remember that an unlabelled ring means "negative" while
   * reading a sentence that no longer says so.
   */
  readable?: boolean;
}) {
  if (!live) return <div className="sy-capsule rounded-[10px] px-4 py-3" data-testid="sy-capsule">Diagram on paper first</div>;
  return (
    <div
      className="sy-capsule flex items-center gap-3 rounded-[10px] px-4 py-3"
      data-testid="sy-capsule"
      data-trimmed={trimmed ? "true" : undefined}
      data-veiled={live ? undefined : "true"}
    >
      <span
        className="sy-lamp"
        data-lit={clause.negated}
        data-blinking={blinking ? "true" : undefined}
        data-testid="sy-lamp"
        aria-hidden="true"
      />
      {/* The lamp is decoration; this is the fact. Read out on every capsule,
          shown on the ones carrying a derived clause. */}
      <span className={readable && clause.negated ? "sy-polarity" : "sr-only"} data-testid="sy-polarity">
        {clause.negated ? "NOT" : "positive"}
      </span>
      <span
        className={`text-base leading-snug ${
          live ? "text-[hsl(var(--sy-ink))]" : "text-[hsl(var(--sy-ink-dim))]"
        }`}
      >
        {clause.text}
      </span>
      {trimmed ? <span className="sy-coupling" aria-hidden="true" /> : null}
    </div>
  );
}

/**
 * The junction. One square plate on its corner with a second sunk behind it, so
 * a rotation about the vertical axis shows real thickness. It turns a half turn
 * on the flip, which is the same movement the capsules make when they swap
 * tracks: one mechanism, not two facts.
 */
function Junction({ turned, still }: { turned: boolean; still: boolean }) {
  return (
    <div className="sy-junction-scene relative h-[92px] w-[92px]" data-testid="sy-junction">
      <motion.div
        className="sy-junction absolute inset-0"
        animate={{ rotateY: turned ? 180 : 0, rotateX: turned ? 8 : 0 }}
        transition={still ? { duration: 0 } : MECHANICAL}
        data-turned={turned}
      >
        <div className="sy-junction-back" />
        <div className="sy-diamond" />
        <div className="sy-crossing" aria-hidden="true">
          <span />
          <span />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Run the reversal choreography once the verdict lands. Reduced motion skips
 * straight to the credited arrangement, where the comparison panel carries the
 * same information as a static before and after.
 */
function useReversalSequence(active: boolean, still: boolean): ReversalStep {
  const [step, setStep] = useState<ReversalStep>("credited");

  useEffect(() => {
    if (!active) {
      setStep("credited");
      return;
    }
    if (still) {
      setStep("credited");
      return;
    }
    setStep("student");
    const timers = [
      setTimeout(() => setStep("gate"), REVERSAL_TIMELINE.gate),
      setTimeout(() => setStep("backing"), REVERSAL_TIMELINE.backing),
      setTimeout(() => setStep("credited"), REVERSAL_TIMELINE.credited),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active, still]);

  return step;
}

export function SwitchyardStage({
  statement,
  routing,
  contrapositive,
  derived = null,
  indicator,
  phase,
  studentRouting = null,
  fault = null,
  mileposts,
  currentOrder,
}: SwitchyardStageProps) {
  const still = useReducedMotion() ?? false;
  const routed = phase !== "arrival";

  /**
   * The flip, at last performed. The world was built for this beat -- the half
   * turn, the capsule swap, the contrapositive plate -- and had never once run
   * it, because a flipped rail would have shown the ORIGINAL clause text under
   * an inverted lamp and contradicted the plate beneath it.
   *
   * It runs only for an item that passed the gate, only after the routing has
   * been read, and never over a fault: a student who made an error is watching
   * their own correction, and the junction turning through it would talk over
   * the thing they most need to see. The replay control offers it to them.
   *
   * The hold is a reward, never a gate. Next is live from the moment the item
   * resolves, and nothing here blocks it.
   */
  const [autoTurned, setAutoTurned] = useState(false);
  const canFlip = Boolean(derived);
  useEffect(() => {
    setAutoTurned(false);
    if (!canFlip || !routed || fault) return;
    if (still) {
      setAutoTurned(true); // reduced motion arrives at the flip, it just does not travel
      return;
    }
    const t = setTimeout(() => setAutoTurned(true), FLIP_HOLD);
    return () => clearTimeout(t);
  }, [canFlip, routed, fault, still, statement]);

  // An explicit `flipped` phase still drives the beat for the dev lab, but it
  // cannot conjure a derivation: an item that failed the gate has no flipped
  // arrangement to show, so the junction stays put and the plate does the work.
  const turned = (phase === "flipped" || autoTurned) && canFlip;

  // The fault only plays over the routing. Once the junction turns, the yard is
  // demonstrating the contrapositive and the error display would fight it.
  const faultLive = !turned ? fault : null;
  const reversal = useReversalSequence(faultLive?.kind === "reversal", still);
  const showingStudent = faultLive?.kind === "reversal" && reversal !== "credited";

  const [acknowledged, setAcknowledged] = useState(false);
  // A new item is a new fault; the lamp must start blinking again.
  useEffect(() => setAcknowledged(false), [statement]);

  const blinkSide =
    faultLive?.kind === "dropped-negation" && !acknowledged ? faultLive.side : null;
  const trimmedSide = faultLive?.kind === "trimmed-condition" ? faultLive.side : null;

  // A derived flip carries the clause stated positively with its polarity said
  // out loud beside it. `flip()` alone only swaps the tracks and inverts a lamp,
  // which is why it was never allowed on screen.
  const credited: Routing =
    turned && derived
      ? {
          ifClause: { text: derived.ifClause.core, negated: derived.ifClause.negated },
          thenClause: { text: derived.thenClause.core, negated: derived.thenClause.negated },
        }
      : routing;
  const shown = showingStudent && studentRouting ? studentRouting : credited;
  const readableRails = turned && Boolean(derived);

  // The board lights the indicator only after the yard has routed.
  const board = indicator && routed ? highlight(statement, indicator) : [statement];
  const showComparison = routed && differs(routing, studentRouting);

  return (
    <div className="switchyard flex h-full min-h-[560px] w-full flex-col justify-between overflow-hidden px-5 py-8 md:px-12">
      {/* The yard at night: track fan, sodium floods, fog. Pure scenery,
          aria-hidden, outside every tested container. */}
      <div className="sy-room" aria-hidden="true">
        <div className="sy-tracks" />
        <div className="sy-floods" />
        <div className="sy-lamphead" data-side="left" />
        <div className="sy-lamphead" data-side="right" />
        <div className="sy-fog" />
        <div className="sy-vignette" />
      </div>

      {/* Departures board. The statement rolls on rather than appearing. */}
      <motion.div
        key={statement}
        className="sy-board relative rounded-2xl px-6 py-5"
        initial={still ? false : { opacity: 0, y: -18, rotateX: -32 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={still ? { duration: 0 } : ROLL_ON}
        data-testid="sy-board"
      >
        <div className="mb-3 flex items-center justify-between">
          <TrackLabel>Statement</TrackLabel>
          <TrackLabel>{turned ? "Contrapositive" : routed ? "Routed" : "Awaiting"}</TrackLabel>
        </div>
        <p className="switchyard-board-type text-xl leading-snug text-[hsl(var(--sy-ink))] md:text-2xl">
          {board.map((part, i) =>
            typeof part === "string" ? (
              <span key={i}>{part}</span>
            ) : (
              <span key={i} className="sy-indicator">
                {part.lit}
              </span>
            ),
          )}
        </p>
      </motion.div>

      {/* The yard */}
      <div className="relative my-8 flex flex-col items-stretch gap-8 md:flex-row md:items-center md:gap-6">
        {/* The crossing gate. Drops across the yard when a reversal is stopped. */}
        <div
          className="sy-gate"
          data-dropped={reversal === "gate" || reversal === "backing" ? "true" : "false"}
          data-testid="sy-gate"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1 space-y-10">
          <Track label="IF" live={routed}>
            <motion.div
              key={`if-${turned}-${showingStudent}`}
              initial={still ? false : { opacity: 0, x: -28 }}
              animate={{
                opacity: routed ? 1 : 0.25,
                x: reversal === "backing" ? -40 : 0,
              }}
              transition={still ? { duration: 0 } : COUPLE}
            >
              <Capsule
                clause={shown.ifClause}
                live={routed}
                blinking={blinkSide === "if"}
                trimmed={trimmedSide === "if"}
                readable={readableRails}
              />
            </motion.div>
            {trimmedSide === "if" ? <FullForm clause={routing.ifClause} /> : null}
          </Track>

          <Track label="THEN" live={routed}>
            <motion.div
              key={`then-${turned}-${showingStudent}`}
              initial={still ? false : { opacity: 0, x: -28 }}
              animate={{
                opacity: routed ? 1 : 0.25,
                x: reversal === "backing" ? -40 : 0,
              }}
              transition={still ? { duration: 0 } : { ...COUPLE, delay: 0.12 }}
            >
              <Capsule
                clause={shown.thenClause}
                live={routed}
                blinking={blinkSide === "then"}
                trimmed={trimmedSide === "then"}
                readable={readableRails}
              />
            </motion.div>
            {trimmedSide === "then" ? <FullForm clause={routing.thenClause} /> : null}
          </Track>
        </div>

        <div className="flex flex-col items-center gap-2 md:block">
          <Junction turned={turned} still={still} />
          {/* The junction is a diamond on its corner, so it draws well outside
              its 92px box; the control clears the point rather than sitting
              across it. */}
          {canFlip && routed ? (
            <button
              type="button"
              className="switchyard-mono mt-6 text-xs text-[hsl(var(--sy-ink-dim))] underline underline-offset-4 transition-colors hover:text-[hsl(var(--sy-ink))] md:w-[92px] md:text-center"
              onClick={() => setAutoTurned((t) => !t)}
              data-testid="sy-replay"
            >
              {turned ? "Show the original" : "Show the flip"}
            </button>
          ) : null}
        </div>
      </div>

      {/* The lamp legend, and the reason it is only worth a line now. Before
          Stage 4 the lamp was the ONLY polarity signal, and a legend would have
          been a footnote asking the student to hold a colour code in their head
          while reading a sentence. Polarity is words on the rail now, so this is
          reinforcement for a signal they can already read, which is what a
          legend should be.

          Hidden from assistive technology on purpose. Every capsule announces
          its own polarity (`sy-polarity`, sr-only unless derived), so a screen
          reader already has the fact; a sentence describing the colour of a ring
          it cannot see would be noise on top of it.

          Only once routed, because an unrouted yard has veiled rails and the
          lamps are not saying anything yet. */}
      {routed ? (
        <p
          className="sy-legend switchyard-mono flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[hsl(var(--sy-ink-dim))]"
          data-testid="sy-legend"
          aria-hidden="true"
        >
          <span className="sy-lamp" data-lit="true" />
          <span>lit: the clause is negative</span>
          <span className="sy-legend-sep" />
          <span className="sy-lamp" data-lit="false" />
          <span>dark: the clause is positive</span>
        </p>
      ) : null}

      {faultLive ? (
        <FaultCaption
          fault={faultLive}
          acknowledged={acknowledged}
          onAcknowledge={() => setAcknowledged(true)}
        />
      ) : null}

      {/* Credited plates */}
      <div className="grid gap-3 md:grid-cols-2" data-testid="sy-plates">
        <Plate label="Perfect answer" active={routed}>
          {`If ${routing.ifClause.text}, then ${routing.thenClause.text}.`}
        </Plate>
        <Plate label="Contrapositive" active={turned}>
          {contrapositive}
        </Plate>
      </div>

      {showComparison && studentRouting ? (
        <YourRouting student={studentRouting} />
      ) : null}

      {mileposts?.length ? <Mileposts mileposts={mileposts} current={currentOrder} /> : null}
    </div>
  );
}

/** The docked full form for a trimmed capsule: what the clause should have carried. */
function FullForm({ clause }: { clause: Clause }) {
  return (
    <div className="sy-fullform mt-2 rounded-[10px] px-4 py-2.5" data-testid="sy-fullform">
      <p className="switchyard-mono mb-1 text-xs text-[hsl(var(--sy-ink-dim))]">Full form</p>
      <p className="text-sm leading-snug text-[hsl(var(--sy-ink))]">{clause.text}</p>
    </div>
  );
}

const FAULT_COPY: Record<Fault["kind"], { label: string; line: string }> = {
  reversal: {
    label: "Signal fault: reversal",
    line: "Those two were coupled the wrong way round. Watch the yard back them out and route them again.",
  },
  "dropped-negation": {
    label: "Signal fault: polarity",
    line: "One clause is stated negatively and the routing lost it. The lamp keeps blinking until you take it.",
  },
  "trimmed-condition": {
    label: "Signal fault: short coupling",
    line: "The clause arrived incomplete. The full form is docked alongside it.",
  },
};

function FaultCaption({
  fault,
  acknowledged,
  onAcknowledge,
}: {
  fault: Fault;
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  const copy = FAULT_COPY[fault.kind];
  return (
    <div
      className="sy-fault mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl px-4 py-3"
      data-testid="sy-fault"
      data-kind={fault.kind}
      role="status"
    >
      <span className="switchyard-mono text-xs text-[hsl(var(--sy-signal))]">{copy.label}</span>
      <span className="min-w-0 flex-1 text-sm leading-snug text-[hsl(var(--sy-ink))]">
        {copy.line}
      </span>
      {fault.kind === "dropped-negation" && !acknowledged ? (
        <button
          type="button"
          onClick={onAcknowledge}
          className="sy-ack switchyard-mono rounded-md px-3 py-1.5 text-xs"
          data-testid="sy-ack"
        >
          Got it
        </button>
      ) : null}
    </div>
  );
}

/** The student's own routing, kept alongside the credited one when they differed. */
function YourRouting({ student }: { student: Routing }) {
  return (
    <div className="sy-yours mt-3 rounded-xl px-4 py-3" data-testid="sy-your-routing">
      <p className="switchyard-mono mb-2 text-xs text-[hsl(var(--sy-ink-dim))]">
        How you routed it
      </p>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">If</dt>
        <dd className="mb-1 text-sm leading-snug text-[hsl(var(--sy-ink-dim))] sm:mb-0">
          {student.ifClause.text}
        </dd>
        <dt className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">Then</dt>
        <dd className="text-sm leading-snug text-[hsl(var(--sy-ink-dim))]">
          {student.thenClause.text}
        </dd>
      </dl>
    </div>
  );
}

/**
 * Mileposts down the yard's bottom edge. Each one is an item the student
 * actually reached; `outcome` is the verdict they actually earned. Items ahead
 * render unmarked rather than optimistic.
 */
function Mileposts({ mileposts, current }: { mileposts: Milepost[]; current?: number }) {
  const done = mileposts.filter((m) => m.outcome).length;
  return (
    <div className="mt-6" data-testid="sy-mileposts">
      <div className="flex items-end gap-[3px]">
        {mileposts.map((m) => (
          <span
            key={m.order}
            className="sy-milepost"
            data-outcome={m.outcome ?? "ahead"}
            data-current={m.order === current ? "true" : undefined}
            title={`Item ${m.order}${m.outcome ? `: ${m.outcome}` : ""}`}
          />
        ))}
      </div>
      <p className="switchyard-mono mt-2 text-xs text-[hsl(var(--sy-ink-dim))]">
        {done} of {mileposts.length} down the line
      </p>
    </div>
  );
}

function Track({
  label,
  live,
  children,
}: {
  label: string;
  live: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <TrackLabel>{label}</TrackLabel>
        <div className="sy-rail flex-1" data-live={live} data-testid={`sy-rail-${label}`} />
      </div>
      {children}
    </div>
  );
}

function Plate({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`sy-plate rounded-xl px-4 py-3 transition-opacity duration-500 ${
        active ? "opacity-100" : "opacity-30"
      }`}
      data-testid={`sy-plate-${label.toLowerCase().replace(/\s+/g, "-")}`}
      aria-hidden={active ? undefined : true}
    >
      <p className="switchyard-mono mb-1.5 text-xs text-[hsl(var(--sy-ink-dim))]">{label}</p>
      <p className="text-sm leading-snug text-[hsl(var(--sy-ink))]">{active ? children : "Shown after your answer"}</p>
    </div>
  );
}

/** Split the statement so the indicator word can be lit in place. */
function highlight(statement: string, indicator: string): (string | { lit: string })[] {
  const i = statement.toLowerCase().indexOf(indicator.toLowerCase());
  if (i < 0) return [statement];
  return [
    statement.slice(0, i),
    { lit: statement.slice(i, i + indicator.length) },
    statement.slice(i + indicator.length),
  ];
}
