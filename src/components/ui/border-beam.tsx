"use client"
import React, { CSSProperties } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BorderBeamProps {
  /** Duration of one full perimeter loop in seconds */
  duration?: number
  /** CSS color of the traveling highlight */
  color?: string
  /** Width of the border strip in pixels */
  borderWidth?: number
  /** Angular size of the highlight arc (0–1, fraction of perimeter) */
  arcSize?: number
  className?: string
}

/**
 * Conic-gradient border beam.
 *
 * Renders an absolutely-positioned overlay that shows a single bright arc
 * rotating continuously around the parent's border. Uses CSS mask to isolate
 * the border strip — no dimension measurement needed, so it works perfectly
 * inside animated modals.
 *
 * Parent must be `position: relative` and `overflow: hidden` with a border-radius.
 */
export function BorderBeam({
  duration = 6,
  color = "rgba(255,255,255,0.45)",
  borderWidth = 1,
  arcSize = 0.12,
  className,
}: BorderBeamProps) {
  // Build conic gradient: transparent → transparent → highlight arc → transparent
  // arcSize 0.12 = ~12% of the circle is lit
  const leadIn = Math.max(0, 1 - arcSize)       // e.g., 0.88
  const peak   = Math.max(0, 1 - arcSize * 0.4) // e.g., 0.952 — bright center
  const conic = `conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent ${(leadIn * 100).toFixed(1)}%, ${color} ${(peak * 100).toFixed(1)}%, transparent 100%)`

  return (
    <div
      className={cn(
        "absolute inset-0 rounded-[inherit] pointer-events-none z-0",
        className
      )}
      style={{
        padding: borderWidth,
        // Mask trick: show content-box + border-box, then XOR/exclude
        // to isolate ONLY the border (padding) strip
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      } as CSSProperties}
    >
      <motion.div
        style={{
          position: "absolute",
          // Oversized so the conic center stays at the element center
          // and the gradient covers the full border strip
          inset: "-200%",
          background: conic,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  )
}
