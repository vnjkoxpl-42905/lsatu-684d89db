"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FOYER_NODES } from "./OrbitalHub";

// ─────────────────────────────────────────────────────────────────────────────
// TOUR STEPS
// ─────────────────────────────────────────────────────────────────────────────

interface TourStep {
  nodeId: string | null; // null = no spotlight (welcome step)
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    nodeId: null,
    title: "Welcome to LSAT U",
    description: "This is your hub — everything starts here. Let me walk you through it.",
  },
  {
    nodeId: "practice",
    title: "Practice",
    description: "Start here. Timed sections, full PTs, and adaptive drills from PT 1–90.",
  },
  {
    nodeId: "bootcamps",
    title: "Bootcamps",
    description: "Guided skill-building modules for advanced question types.",
  },
  {
    nodeId: "classroom",
    title: "Classroom",
    description: "Video lessons and past coaching sessions.",
  },
  {
    nodeId: "analytics",
    title: "Analytics",
    description: "Track your accuracy, trends, and weak areas over time.",
  },
  {
    nodeId: "schedule",
    title: "Schedule",
    description: "Your daily study calendar and milestones.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Get the center position of a node relative to the hub container */
function getNodeCenter(nodeId: string, containerRect: DOMRect): { x: number; y: number } | null {
  const node = FOYER_NODES.find((n) => n.id === nodeId);
  if (!node) return null;

  const CX = 200, CY = 200, RADIUS = 190;
  const rad = (node.angleDeg * Math.PI) / 180;
  const svgX = CX + RADIUS * Math.cos(rad);
  const svgY = CY + RADIUS * Math.sin(rad);

  // Convert from 400x400 SVG space to screen space
  const scaleX = containerRect.width / 400;
  const scaleY = containerRect.height / 400;

  return {
    x: containerRect.left + svgX * scaleX,
    y: containerRect.top + svgY * scaleY,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface FoyerTourProps {
  hubContainerRef: React.RefObject<HTMLDivElement>;
  onComplete: () => void;
}

export default function FoyerTour({ hubContainerRef, onComplete }: FoyerTourProps) {
  const [step, setStep] = useState(0);
  const [spotlightPos, setSpotlightPos] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  // Calculate spotlight position whenever step changes or window resizes
  const updateSpotlight = useCallback(() => {
    if (!currentStep.nodeId || !hubContainerRef.current) {
      setSpotlightPos(null);
      return;
    }
    const rect = hubContainerRef.current.getBoundingClientRect();
    const pos = getNodeCenter(currentStep.nodeId, rect);
    setSpotlightPos(pos);
  }, [currentStep.nodeId, hubContainerRef]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    return () => window.removeEventListener("resize", updateSpotlight);
  }, [updateSpotlight]);

  // Escape key dismisses
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onComplete]);

  const advance = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const SPOTLIGHT_R = 54;

  // Tooltip positioning: near the spotlight or centered
  const tooltipStyle: React.CSSProperties = spotlightPos
    ? {
        position: "fixed",
        left: Math.min(Math.max(spotlightPos.x - 160, 16), window.innerWidth - 336),
        top: spotlightPos.y + SPOTLIGHT_R + 24,
        // If tooltip would go off bottom, place it above
        ...(spotlightPos.y + SPOTLIGHT_R + 240 > window.innerHeight
          ? { top: undefined, bottom: window.innerHeight - spotlightPos.y + SPOTLIGHT_R + 24 }
          : {}),
      }
    : {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100]">
      {/* SVG overlay with spotlight cutout */}
      <svg className="fixed inset-0 w-full h-full" style={{ zIndex: 100 }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightPos && (
              <motion.circle
                initial={{ cx: spotlightPos.x, cy: spotlightPos.y, r: 0 }}
                animate={{ cx: spotlightPos.x, cy: spotlightPos.y, r: SPOTLIGHT_R }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="black"
          fillOpacity="0.75"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{ ...tooltipStyle, zIndex: 101 }}
          className="w-[320px] bg-zinc-950/95 backdrop-blur-sm border border-zinc-800 rounded-xl p-5"
        >
          {/* Title */}
          <h3 className="text-sm font-semibold text-zinc-100 tracking-wide mb-1.5">
            {currentStep.title}
          </h3>

          {/* Description */}
          <p className="text-[13px] leading-relaxed text-zinc-400 mb-5">
            {currentStep.description}
          </p>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === step ? "bg-zinc-100" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={onComplete}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors uppercase tracking-wider"
            >
              Skip Tour
            </button>
            <button
              onClick={advance}
              className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
            >
              {isLastStep ? "Get Started" : "Next"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
