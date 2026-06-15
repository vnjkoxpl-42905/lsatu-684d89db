import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import "../activities-home.css";

interface ActivityIntroProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  itemCount: number;
  onStart: () => void;
}

/**
 * Editorial intro for an activity. Layout mirrors the reference: small
 * breadcrumb-with-arrows label top-left, "NN ITEMS" counter top-right with an
 * accent underline, a large mixed-weight headline, numbered how-it-works list,
 * a worked example shown as two overlapping circles (Before = dark, After =
 * light silver), and the Start action.
 */
export function ActivityIntro({ title, subtitle, instructions, itemCount, onStart }: ActivityIntroProps) {
  const ex = instructions.worked_example;
  const reduce = useReducedMotion();

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
      {/* Top meta row: breadcrumb label + items counter */}
      <motion.div variants={item} className="act-edit-topbar">
        <span className="act-edit-crumb" aria-hidden="true">
          <span className="act-edit-crumb-arrow">◀</span>
          <span>{title}</span>
          <span className="act-edit-crumb-arrow">▶</span>
        </span>
        <span className="act-edit-counter" aria-label={`${itemCount} items`}>
          <span className="act-edit-counter-num">{String(itemCount).padStart(2, "0")}</span>
          <span className="act-edit-counter-rule" aria-hidden="true" />
          <span className="act-edit-counter-total">ITEMS</span>
        </span>
      </motion.div>

      {/* Headline block */}
      <motion.header variants={item} className="act-edit-header">
        <h1 className="act-edit-title">
          <span className="act-edit-title-bold">{title}.</span>{" "}
          {subtitle && <span className="act-edit-title-light">{subtitle}.</span>}
        </h1>
      </motion.header>

      {instructions.tagline && (
        <motion.p variants={item} className="act-edit-tagline act-prose">
          {instructions.tagline}
        </motion.p>
      )}

      {/* Two-column: rules left, circles right (stacks on mobile) */}
      <motion.div variants={item} className="act-edit-grid">
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
          <div className="act-orbs" aria-label="Worked example">
            <div className="act-orb act-orb--before">
              <div className="act-orb-inner">
                <p className="act-orb-label">Before</p>
                <p className="act-orb-statement">{ex.statement}</p>
              </div>
            </div>
            <div className="act-orb act-orb--after">
              <div className="act-orb-inner">
                <p className="act-orb-label">After, any of these</p>
                <ul className="act-orb-list">
                  {ex.credited_answers.map((answer, i) => (
                    <li key={i}>{answer}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {ex?.explanation && (
        <motion.p variants={item} className="act-why act-prose">
          {ex.explanation}
        </motion.p>
      )}

      {instructions.task && (
        <motion.p variants={item} className="act-task">
          {instructions.task}
        </motion.p>
      )}

      <motion.div variants={item}>
        <button type="button" onClick={onStart} className="act-start">
          Start drilling
          <ArrowRight size={18} strokeWidth={2.25} />
        </button>
      </motion.div>
    </motion.div>
  );
}
