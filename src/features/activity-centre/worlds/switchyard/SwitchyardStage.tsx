import { motion, useReducedMotion } from "framer-motion";
import type { Clause, Routing } from "./routing";
import { flip } from "./routing";
import "./switchyard.css";

/**
 * The yard's three states. The whole drill lives in the move between them:
 * arrival (nothing routed), the routing (clauses couple onto their tracks), and
 * the flip (the junction rotates and performs the contrapositive).
 */
export type YardPhase = "arrival" | "routed" | "flipped";

interface SwitchyardStageProps {
  /** The original sentence, shown on the departures board. */
  statement: string;
  /** The credited routing, parsed from the credited answer. */
  routing: Routing;
  /** The authored contrapositive, shown on its plate once the junction turns. */
  contrapositive: string;
  /**
   * The indicator word ("only if", "unless"). Lit on the board only once the
   * yard has routed, never before: no pre-commit hints.
   */
  indicator?: string;
  phase: YardPhase;
}

/** Heavy, mechanical. The flip should feel like plant, not like a UI toggle. */
const MECHANICAL = { duration: 0.9, ease: [0.7, 0, 0.18, 1] as const };
const COUPLE = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };

function TrackLabel({ children }: { children: string }) {
  return (
    <span className="switchyard-mono text-xs text-[hsl(var(--sy-ink-dim))]">{children}</span>
  );
}

function Capsule({ clause, live }: { clause: Clause; live: boolean }) {
  return (
    <div
      className="sy-capsule flex items-center gap-3 rounded-[10px] px-4 py-3"
      data-testid="sy-capsule"
    >
      <span
        className="sy-lamp"
        data-lit={clause.negated}
        data-testid="sy-lamp"
        aria-hidden="true"
      />
      <span
        className={`text-base leading-snug ${
          live ? "text-[hsl(var(--sy-ink))]" : "text-[hsl(var(--sy-ink-dim))]"
        }`}
      >
        {clause.text}
      </span>
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

export function SwitchyardStage({
  statement,
  routing,
  contrapositive,
  indicator,
  phase,
}: SwitchyardStageProps) {
  const still = useReducedMotion() ?? false;
  const routed = phase !== "arrival";
  const turned = phase === "flipped";
  const shown = turned ? flip(routing) : routing;

  // The board lights the indicator only after the yard has routed.
  const board = indicator && routed ? highlight(statement, indicator) : [statement];

  return (
    <div className="switchyard flex h-full min-h-[560px] w-full flex-col justify-between overflow-hidden px-5 py-8 md:px-12">
      {/* Departures board */}
      <div className="sy-board relative rounded-2xl px-6 py-5">
        <div className="mb-3 flex items-center justify-between">
          <TrackLabel>Statement</TrackLabel>
          <TrackLabel>{turned ? "Contrapositive" : routed ? "Routed" : "Awaiting"}</TrackLabel>
        </div>
        <p className="ac-display text-lg leading-snug text-[hsl(var(--sy-ink))] md:text-xl">
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
      </div>

      {/* The yard */}
      <div className="relative my-8 flex flex-col items-stretch gap-8 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 flex-1 space-y-10">
          <Track label="IF" live={routed}>
            <motion.div
              key={`if-${turned}`}
              initial={still ? false : { opacity: 0, x: -28 }}
              animate={{ opacity: routed ? 1 : 0.25, x: 0 }}
              transition={still ? { duration: 0 } : COUPLE}
            >
              <Capsule clause={shown.ifClause} live={routed} />
            </motion.div>
          </Track>

          <Track label="THEN" live={routed}>
            <motion.div
              key={`then-${turned}`}
              initial={still ? false : { opacity: 0, x: -28 }}
              animate={{ opacity: routed ? 1 : 0.25, x: 0 }}
              transition={still ? { duration: 0, delay: 0 } : { ...COUPLE, delay: still ? 0 : 0.12 }}
            >
              <Capsule clause={shown.thenClause} live={routed} />
            </motion.div>
          </Track>
        </div>

        <div className="flex justify-center md:block">
          <Junction turned={turned} still={still} />
        </div>
      </div>

      {/* Credited plates */}
      <div className="grid gap-3 md:grid-cols-2">
        <Plate label="Perfect answer" active={routed}>
          {`If ${routing.ifClause.text}, then ${routing.thenClause.text}.`}
        </Plate>
        <Plate label="Contrapositive" active={turned}>
          {contrapositive}
        </Plate>
      </div>
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
      <p className="text-sm leading-snug text-[hsl(var(--sy-ink))]">{children}</p>
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
