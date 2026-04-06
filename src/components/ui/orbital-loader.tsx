"use client";

/**
 * OrbitalLoader — adapted from "CoreSpin Loader" (21st.dev)
 *
 * Reskinned from emerald/cyan to stealth-elite silver/white:
 *  - All color tokens replaced with white/neutral opacity variants
 *  - Glow shadows use rgba(255,255,255,...) instead of colored variants
 *  - Optional `label` prop replaces cycling text states
 *  - Sized via `size` prop (default 48px diameter)
 */

import React from "react";
import { cn } from "@/lib/utils";

interface OrbitalLoaderProps {
  /** Diameter of the loader in px (default 48) */
  size?: number;
  /** Optional static label beneath the rings */
  label?: string;
  className?: string;
}

export function OrbitalLoader({ size = 48, label, className }: OrbitalLoaderProps) {
  const px = `${size}px`;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="relative flex items-center justify-center" style={{ width: px, height: px }}>

        {/* ── Base ambient glow ── */}
        <div
          className="absolute inset-0 rounded-full blur-xl animate-pulse"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />

        {/* ── Outer dashed ring — very slow orbit ── */}
        <div
          className="absolute inset-0 rounded-full border border-dashed border-white/[0.12] animate-[spin_12s_linear_infinite]"
        />

        {/* ── Main arc — fast, strong glow ── */}
        <div
          className="absolute rounded-full border-2 border-transparent border-t-white/60 animate-[spin_2s_linear_infinite]"
          style={{
            inset: "3px",
            boxShadow: "0 0 8px rgba(255,255,255,0.35)",
          }}
        />

        {/* ── Reverse counter-arc — slower, dimmer ── */}
        <div
          className="absolute rounded-full border-2 border-transparent border-b-white/25 animate-[spin_3.5s_linear_infinite_reverse]"
          style={{
            inset: "8px",
            boxShadow: "0 0 6px rgba(255,255,255,0.15)",
          }}
        />

        {/* ── Inner fast micro-ring ── */}
        <div
          className="absolute rounded-full border border-transparent border-l-white/20 animate-[spin_1s_ease-in-out_infinite]"
          style={{ inset: "13px" }}
        />

        {/* ── Orbital dot ── */}
        <div
          className="absolute inset-0 animate-[spin_4s_linear_infinite]"
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[3px] h-[3px] rounded-full bg-white/70"
            style={{ boxShadow: "0 0 5px rgba(255,255,255,0.9)" }}
          />
        </div>

        {/* ── Pulsing center core ── */}
        <div
          className="absolute w-[5px] h-[5px] rounded-full bg-white/80 animate-pulse"
          style={{ boxShadow: "0 0 8px rgba(255,255,255,0.7)" }}
        />
      </div>

      {/* ── Optional label ── */}
      {label && (
        <span className="text-[8px] uppercase tracking-[0.3em] text-white/[0.18] font-medium select-none">
          {label}
        </span>
      )}
    </div>
  );
}
