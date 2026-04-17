"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VaporizeText } from "@/components/ui/vapour-text-effect";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface WelcomeLoadingProps {
  /** The user's display name / username — rendered as "WELCOME, {NAME}" */
  userName: string;
  /** Called after the overlay has fully faded to transparent and unmounts */
  onComplete: () => void;
  /** Optional React node rendered behind the particle canvas (z-ordered below) */
  backgroundSlot?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a responsive particle font size from the viewport width.
 * Avoids CSS clamp() which parseInt() can't parse in the canvas engine.
 */
function computeFontSize(): string {
  if (typeof window === "undefined") return "48px";
  const vw = window.innerWidth;
  const px = Math.round(Math.max(24, Math.min(62, vw * 0.042)));
  return `${px}px`;
}

/**
 * Insert Unicode thin spaces (\u2009) between each character to simulate
 * letter-spacing at the canvas rasterization level (~0.12em tracking).
 */
function addTracking(str: string): string {
  return str.split("").join("\u2009");
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WelcomeLoading
 *
 * A full-screen, pure-black (#000000) overlay that plays the vapour particle
 * animation for "WELCOME, {NAME}", then fades out and unmounts cleanly.
 *
 * Anti-flashbang guarantee: the overlay is always rendered on top of everything
 * at z-[9999] and its exit transition is a "Heavy Glass" fade — the dashboard
 * below is revealed gradually with a 30px Y-slide, never jarring.
 */
export default function WelcomeLoading({
  userName,
  onComplete,
  backgroundSlot,
}: WelcomeLoadingProps) {
  // Controls the AnimatePresence gate. Flipped to false → exit animation fires.
  const [visible, setVisible]       = useState(true);
  // Font size computed once on mount so the canvas engine always gets a raw px value.
  const [fontSize, setFontSize]     = useState("48px");
  // Ensures onComplete fires exactly once even if exit is called twice.
  const completedRef                = useRef(false);

  useEffect(() => {
    setFontSize(computeFontSize());
  }, []);

  // Called by VaporizeText once the vaporize phase finishes.
  // Memoized so VaporizeText's run callback (which depends on onComplete)
  // does not recreate on parent re-renders and restart the RAF animation.
  const handleParticlesDone = useCallback(() => {
    setVisible(false);
  }, []);

  // Called by AnimatePresence once the fade-out transition is finished
  const handleExitComplete = () => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  };

  const displayText = addTracking(`WELCOME, ${userName.toUpperCase()}`);

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          key="welcome-overlay"
          className="fixed inset-0 z-[9999] bg-[#000000] pointer-events-none"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 1.20, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ── Optional background layer — renders behind particles ── */}
          {backgroundSlot && (
            <div className="absolute inset-0 z-0">{backgroundSlot}</div>
          )}

          {/* ── Subtle top-edge light line for visual depth ── */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none z-20" />

          {/* ── LSAT U wordmark — ultra-faint brand anchor ── */}
          <div className="absolute top-8 inset-x-0 flex justify-center z-20">
            <span className="text-[9px] uppercase tracking-[0.4em] text-white/[0.12] font-medium select-none">
              LSAT U
            </span>
          </div>

          {/* ── Particle canvas — fills the viewport ── */}
          <div className="absolute inset-0 z-10">
            <VaporizeText
              text={displayText}
              font={{
                fontFamily: "Inter, sans-serif",
                fontSize,
                fontWeight: 900,
              }}
              color="rgb(255, 255, 255)"
              spread={5}
              density={7}
              animation={{
                fadeInDuration:   1.05,
                waitDuration:     2.00,
                vaporizeDuration: 1.96,
              }}
              direction="left-to-right"
              onComplete={handleParticlesDone}
            />
          </div>

          {/* ── Vignette: soft radial darkening toward corners ── */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background:
                "radial-gradient(ellipse 75% 65% at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 80%, rgba(0,0,0,0.7) 100%)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
