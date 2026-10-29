"use client";

import React, { useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Particle {
  /** Scatter origin — where the particle starts before materializing */
  ox: number;
  oy: number;
  /** Target — the exact text-pixel position */
  tx: number;
  ty: number;
  /** Vaporize drift vector */
  vx: number;
  vy: number;
  /**
   * Normalized per-particle start delay (0..1 of the materialize phase).
   * Used to create the left-to-right or right-to-left sweep.
   */
  delay: number;
  size: number;
}

export type VaporizeTextProps = {
  /** The string to render */
  text: string;
  font?: {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: number;
  };
  /** CSS color string — must be parseable as a fillStyle */
  color?: string;
  /**
   * Controls scatter radius and vaporize velocity magnitude.
   * Range 1–10, default 5.
   */
  spread?: number;
  /**
   * Pixel-sampling density. Higher = more particles, heavier GPU load.
   * Range 1–10, default 5.
   */
  density?: number;
  animation?: {
    /** Seconds for particles to coalesce into text. Default 0.8. */
    fadeInDuration?: number;
    /** Seconds the fully-formed text is held. Default 0.5. */
    waitDuration?: number;
    /** Seconds for the vaporize phase. Default 1.5. */
    vaporizeDuration?: number;
  };
  /** Direction of the materialization sweep */
  direction?: "left-to-right" | "right-to-left";
  /** Called once after the vaporize phase fully completes */
  onComplete?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// EASING
// ─────────────────────────────────────────────────────────────────────────────

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInQuad  = (t: number) => t * t;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * VaporizeText
 *
 * Renders a single string as a canvas-based particle animation:
 *   1. MATERIALIZE — particles scatter in from off-screen and coalesce into text
 *   2. HOLD        — fully-formed text is held at full opacity
 *   3. VAPORIZE    — particles drift upward and fade to nothing
 *
 * After the vaporize phase, `onComplete` is called exactly once.
 */
export const VaporizeText: React.FC<VaporizeTextProps> = ({
  text,
  font = {},
  color = "rgb(255, 255, 255)",
  spread = 5,
  density = 5,
  animation = {},
  direction = "left-to-right",
  onComplete,
}) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const completedRef = useRef(false);

  const {
    fadeInDuration  = 0.8,
    waitDuration    = 0.5,
    vaporizeDuration = 1.5,
  } = animation;

  const {
    fontFamily  = "Inter, sans-serif",
    fontSize    = "56px",
    fontWeight  = 700,
  } = font;

  // ── Main effect: build particles, start RAF loop ──────────────────────────
  const run = useCallback(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Size the canvas at device pixel ratio ──
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W   = container.clientWidth;
    const H   = container.clientHeight;

    canvas.width        = W * dpr;
    canvas.height       = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr);

    // ── Rasterize text → offscreen canvas so we can sample pixel positions ──
    const offscreen = document.createElement("canvas");
    const octx      = offscreen.getContext("2d");
    if (!octx) return;

    const fontStr   = `${fontWeight} ${fontSize} ${fontFamily}`;
    const fSizePx   = parseInt(fontSize, 10) || 56;

    octx.font = fontStr;
    const metrics = octx.measureText(text);
    const textW   = Math.ceil(metrics.width) + 40;
    const textH   = Math.ceil(fSizePx * 1.5) + 20;

    offscreen.width  = textW;
    offscreen.height = textH;

    octx.font         = fontStr;
    octx.fillStyle    = "white";
    octx.textBaseline = "alphabetic";
    octx.fillText(text, 20, Math.ceil(fSizePx * 1.1));

    const imageData = octx.getImageData(0, 0, textW, textH);
    const pixels    = imageData.data;

    // ── Sample pixel positions where alpha is solid enough ──
    // step: lower density → bigger step → fewer particles
    const step = Math.max(1, Math.round(10 / Math.max(1, density)));

    const particles: Particle[] = [];
    const textOffsetX = (W - textW) / 2;
    const textOffsetY = (H - textH) / 2;

    let minTX = Infinity;
    let maxTX = -Infinity;

    for (let py = 0; py < textH; py += step) {
      for (let px = 0; px < textW; px += step) {
        const idx = (py * textW + px) * 4;
        if (pixels[idx + 3] < 90) continue; // skip transparent/faint pixels

        const tx = px + textOffsetX;
        const ty = py + textOffsetY;

        if (tx < minTX) minTX = tx;
        if (tx > maxTX) maxTX = tx;

        // Scatter: random direction, distance proportional to spread
        const angle = Math.random() * Math.PI * 2;
        const dist  = (0.4 + Math.random() * 0.6) * spread * 90;
        const ox    = tx + Math.cos(angle) * dist;
        const oy    = ty + Math.sin(angle) * dist;

        // Vaporize drift: upward bias, horizontal drift
        const vx = (Math.random() - 0.5) * spread * 14;
        const vy = -(0.6 + Math.random() * 0.8) * spread * 20;

        particles.push({
          ox, oy, tx, ty, vx, vy,
          delay: 0,                             // assigned below
          size: 1.0 + Math.random() * 1.2,
        });
      }
    }

    // ── Assign per-particle directional delays (0..maxDelay) ──
    const textRangeX = maxTX - minTX || 1;
    const maxDelay   = 0.40; // fraction of fadeInDuration

    for (const p of particles) {
      const norm = (p.tx - minTX) / textRangeX;           // 0..1 left→right
      p.delay    = direction === "left-to-right"
        ? norm * maxDelay
        : (1 - norm) * maxDelay;
    }

    // ── RAF loop ──────────────────────────────────────────────────────────────
    const startTime = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000; // seconds

      ctx.clearRect(0, 0, W, H);

      if (elapsed < fadeInDuration) {
        // ───── PHASE 1: MATERIALIZE ─────
        const phaseT = elapsed / fadeInDuration; // 0..1

        for (const p of particles) {
          // Per-particle local time: particle waits until its delay is reached,
          // then races to its target over the remaining phase time.
          const localT = Math.max(0, Math.min(1, (phaseT - p.delay) / (1 - p.delay)));
          const t      = easeOutCubic(localT);

          const x = p.ox + (p.tx - p.ox) * t;
          const y = p.oy + (p.ty - p.oy) * t;

          ctx.globalAlpha = t;
          ctx.fillStyle   = color;
          ctx.beginPath();
          ctx.arc(x, y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (elapsed < fadeInDuration + waitDuration) {
        // ───── PHASE 2: HOLD ─────
        ctx.globalAlpha = 1;
        ctx.fillStyle   = color;

        for (const p of particles) {
          ctx.beginPath();
          ctx.arc(p.tx, p.ty, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // ───── PHASE 3: VAPORIZE ─────
        const rawT = (elapsed - fadeInDuration - waitDuration) / vaporizeDuration;
        const t    = Math.min(1, rawT);

        for (const p of particles) {
          const x = p.tx + p.vx * t;
          const y = p.ty + p.vy * t;
          const a = 1 - easeInQuad(t);

          if (a <= 0.01) continue;

          ctx.globalAlpha = a;
          ctx.fillStyle   = color;
          ctx.beginPath();
          ctx.arc(x, y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        if (t >= 1 && !completedRef.current) {
          completedRef.current = true;
          onComplete?.();
          return; // stop RAF
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }, [
    text, color, spread, density,
    fadeInDuration, waitDuration, vaporizeDuration,
    fontFamily, fontSize, fontWeight,
    direction, onComplete,
  ]);

  useEffect(() => {
    run();
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [run]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};
