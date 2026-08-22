import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import { ActivityExitButton } from "./ActivityExitButton";
import { worldForTitle } from "../worlds/registry";
import { renderInlineMarks } from "../prompt-format";
import "../activities-home.css";

interface ActivityIntroProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  onStart: () => void;
  /** Omitted when the runner is embedded (teacher preview), which has its own chrome. */
  onExit?: () => void;
}

/**
 * Editorial intro for an activity. Layout mirrors the "Problem & Solution"
 * reference: a pixel-match hero (breadcrumb-with-arrows top-left, mixed-weight
 * title top-right, two big overlapping circles dominant lower-left, each with a
 * large upper label and a single prose line), then a compact detail section
 * below (credited negations + lean rules + the Start action).
 */
export function ActivityIntro({ title, subtitle, instructions, onStart, onExit }: ActivityIntroProps) {
  const ex = instructions.worked_example;
  const reduce = useReducedMotion();

  // The "after" orb is the second half of the before/after pair, so it has to
  // be THIS Activity's answer. It used to be a hardcoded string: Negation
  // Station's gloss, rendered on every Activity's intro. Spot the Callback and
  // Find the Conclusion both showed a line about negating "100% conformity",
  // which belongs to neither, while the "before" orb beside it showed their own
  // real statement. The two halves of one example contradicted each other.
  // Credited answer first because it is short enough to sit in a circle; the
  // explanation is the fallback for an Activity authored without one.
  const afterLine = ex?.credited_answers?.[0] ?? ex?.explanation ?? "";

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.06,
        delayChildren: reduce ? 0 : 0.04,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] },
    },
  };

  // The intro is the world's own lobby: `data-world` re-bases every intro
  // token (canvas, cards, ink, accent, display face) onto the world's shell,
  // so each Activity's front door already stands inside its own place.
  const world = worldForTitle(title);

  return (
    <motion.div
      className="act-edit"
      data-world={world?.slug}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ---- HERO (pixel-match): crumb top-left, title top-right, orbs lower-left ---- */}
      <section className="act-hero">
        <motion.div variants={item} className="act-hero-top">
          <div className="flex flex-col items-start gap-2">
            {onExit && <ActivityExitButton onExit={onExit} tone="light" />}
            <span className="act-edit-crumb" aria-hidden="true">
              <span className="act-edit-crumb-arrow">◀</span>
              <span>{title}</span>
              <span className="act-edit-crumb-arrow">▶</span>
            </span>
          </div>
          <h1 className="act-edit-title">
            <span className="act-edit-title-bold">{title}.</span>{" "}
            {subtitle && <span className="act-edit-title-light">{subtitle}.</span>}
          </h1>
        </motion.div>

        {ex && (
          <motion.div variants={item} className="act-orbs" aria-label="Worked example">
            <div className="act-orb act-orb--before">
              <div className="act-orb-inner">
                <p className="act-orb-label">Before</p>
                {/* Statements carry the bank's own `*mark*` notation; render it
                    as emphasis rather than leaking asterisks at the door. */}
                <p className="act-orb-statement">{renderInlineMarks(ex.statement, "intro-before")}</p>
              </div>
            </div>
            <div className="act-orb act-orb--after">
              <div className="act-orb-inner">
                <p className="act-orb-label">After</p>
                <p className="act-orb-statement">{afterLine}</p>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* ---- DETAIL (compact): credited negations + lean rules + Start ---- */}
      <section className="act-detail">
        <motion.div variants={item} className="act-detail-grid">
          {instructions.rules?.length ? (
            <ol className="act-steps">
              {instructions.rules.map((rule, i) => (
                <li key={i} className="act-step">
                  <span className="act-step-num">{i + 1}</span>
                  <span className="act-step-text">{rule}</span>
                </li>
              ))}
            </ol>
          ) : <span />}

          {ex && (
            <div className="act-credited">
              <p className="act-credited-label">After, any of these</p>
              <ul className="act-orb-list">
                {ex.credited_answers.map((answer, i) => (
                  <li key={i}>{answer}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        <motion.div variants={item}>
          <button type="button" onClick={onStart} className="act-start">
            Start drilling
            <ArrowRight size={18} strokeWidth={2.25} />
          </button>
        </motion.div>
      </section>
    </motion.div>
  );
}
