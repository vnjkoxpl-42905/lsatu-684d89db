import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import { ActivityExitButton } from "./ActivityExitButton";
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

  // The worked example carries no "after" prose, so draft one short line from
  // the explanation for the chrome orb (Negation-Station-specific, not a field).
  const afterLine = "The weakest claim that contradicts 100% conformity: a single counterexample.";

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

  return (
    <motion.div className="act-edit" variants={container} initial="hidden" animate="show">
      {/* ---- HERO (pixel-match): crumb top-left, title top-right, orbs lower-left ---- */}
      <section className="act-hero">
        <motion.div variants={item} className="act-hero-top">
          <span className="act-edit-crumb" aria-hidden="true">
            <span className="act-edit-crumb-arrow">◀</span>
            <span>{title}</span>
            <span className="act-edit-crumb-arrow">▶</span>
          </span>
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
                <p className="act-orb-statement">{ex.statement}</p>
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

        <motion.div variants={item} className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" onClick={onStart} className="act-start">
            Start drilling
            <ArrowRight size={18} strokeWidth={2.25} />
          </button>
          {onExit && <ActivityExitButton onExit={onExit} tone="light" />}
        </motion.div>
      </section>
    </motion.div>
  );
}
