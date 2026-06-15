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
 * Activities homepage (intro). The distinct "Activities" world: a full-bleed
 * two-tone emerald banner, numbered how-it-works steps, a before -> after
 * worked example as two cards, and the Start action. Sections stagger up on
 * mount (collapsed under reduced-motion). See activities-home.css for the
 * scoped design tokens; the drill + completion screens are untouched.
 */
export function ActivityIntro({ title, subtitle, instructions, itemCount, onStart }: ActivityIntroProps) {
  const ex = instructions.worked_example;
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.08,
        delayChildren: reduce ? 0 : 0.05,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Full-bleed two-tone banner: deep zone holds the title, light zone the count. */}
      <motion.div variants={item} className="act-banner">
        <div className="act-banner-deep">
          <h1 className="act-display text-4xl md:text-6xl">{title}</h1>
          {subtitle && <p className="text-base text-white/85 md:text-lg">{subtitle}</p>}
        </div>
        <div className="act-banner-light">
          <span className="act-eyebrow">{itemCount} items</span>
        </div>
      </motion.div>

      <div className="act-body">
        {instructions.tagline && (
          <motion.p variants={item} className="act-tagline">
            {instructions.tagline}
          </motion.p>
        )}

        {instructions.rules?.length ? (
          <motion.ol variants={item} className="act-steps mt-8">
            {instructions.rules.map((rule, i) => (
              <li key={i} className="act-step">
                <span className="act-step-num">{i + 1}</span>
                <span className="act-step-text">{rule}</span>
              </li>
            ))}
          </motion.ol>
        ) : null}

        {ex && (
          <motion.div variants={item} className="mt-8">
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
            {ex.explanation && <p className="act-why">{ex.explanation}</p>}
          </motion.div>
        )}

        {instructions.task && (
          <motion.p variants={item} className="act-task mt-8">
            {instructions.task}
          </motion.p>
        )}

        <motion.div variants={item} className="mt-6">
          <button type="button" onClick={onStart} className="act-start">
            Start drilling
            <ArrowRight size={18} strokeWidth={2.25} />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}
