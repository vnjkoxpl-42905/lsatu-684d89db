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
 * Activities homepage (intro). Fits the bootcamp's warm tactile workbook: a
 * calm warm-paper reading column with an emerald accent (the per-activity
 * signature). A simple header, numbered how-it-works steps, a before -> after
 * worked example as two paper cards, and the Start action. Sections fade up
 * gently on mount (collapsed under reduced-motion). See activities-home.css for
 * the scoped design tokens; the drill + completion screens are untouched.
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
    <motion.div className="act-body" variants={container} initial="hidden" animate="show">
      <motion.header variants={item} className="act-header">
        <span className="act-eyebrow">{itemCount} items</span>
        <h1 className="act-title">{title}</h1>
        {subtitle && <p className="act-subtitle">{subtitle}</p>}
      </motion.header>

      {instructions.tagline && (
        <motion.p variants={item} className="act-tagline act-prose">
          {instructions.tagline}
        </motion.p>
      )}

      {instructions.rules?.length ? (
        <motion.ol variants={item} className="act-steps">
          {instructions.rules.map((rule, i) => (
            <li key={i} className="act-step">
              <span className="act-step-num">{i + 1}</span>
              <span className="act-step-text">{rule}</span>
            </li>
          ))}
        </motion.ol>
      ) : null}

      {ex && (
        <motion.div variants={item}>
          <div className="act-example">
            <div className="act-card">
              <p className="act-card-label">Before</p>
              <p className="act-card-statement">{ex.statement}</p>
            </div>
            <div className="act-arrow" aria-hidden="true">
              <ArrowRight size={22} strokeWidth={2.25} />
            </div>
            <div className="act-card">
              <p className="act-card-label">After, any of these</p>
              <div className="act-chips">
                {ex.credited_answers.map((answer, i) => (
                  <span key={i} className="act-chip">
                    {answer}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {ex.explanation && <p className="act-why act-prose">{ex.explanation}</p>}
        </motion.div>
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
