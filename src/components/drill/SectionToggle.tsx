"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DRILL_SECTION_LABELS, type DrillSection } from "@/lib/drillSection";

const ORDER: DrillSection[] = ["lr", "rc"];

/**
 * The drill hub's section switch: LR on the left, RC on the right, top-right of
 * the tools row.
 *
 * A flip switch, not a tab strip. Both labels stay visible and a single lit
 * indicator travels between them — `layoutId` so the browser moves one object
 * rather than cross-fading two, which is what makes it read as a switch being
 * thrown. The bands below flip with it (see `.drill-observatory-section-flip`).
 *
 * Switching is unconditional and silent: no confirm, even when the LR picker
 * holds a selection that the switch discards. A flip that stops to ask is not
 * a flip.
 */
export function SectionToggle({
  section,
  onChange,
  className,
}: {
  section: DrillSection;
  onChange: (next: DrillSection) => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const refs = React.useRef<Partial<Record<DrillSection, HTMLButtonElement | null>>>({});

  // Arrow keys move between the two options and activate as they go, the way a
  // radio group does — the switch has exactly two states, so "move focus, then
  // press" would be two actions for a control that exists to take one.
  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = ORDER.indexOf(section);
      const next = ORDER[(index + (event.key === "ArrowRight" ? 1 : ORDER.length - 1)) % ORDER.length];
      onChange(next);
      refs.current[next]?.focus();
    },
    [onChange, section],
  );

  return (
    <div
      role="group"
      aria-label="Drill section"
      onKeyDown={onKeyDown}
      className={cn("drill-observatory-section-toggle", className)}
    >
      {ORDER.map((id) => {
        const active = id === section;
        return (
          <button
            key={id}
            ref={(node) => {
              refs.current[id] = node;
            }}
            type="button"
            aria-pressed={active}
            aria-label={DRILL_SECTION_LABELS[id].full}
            title={DRILL_SECTION_LABELS[id].full}
            // Only the active option is in the tab order: one Tab stop lands on
            // the switch, and the arrows work it from there.
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            className={cn(
              "drill-observatory-section-toggle-option",
              active && "is-active",
            )}
          >
            {active && (
              <motion.span
                layoutId="drill-section-indicator"
                className="drill-observatory-section-toggle-indicator"
                aria-hidden
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
                }
              />
            )}
            <span className="relative z-[1]">{DRILL_SECTION_LABELS[id].short}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SectionToggle;
