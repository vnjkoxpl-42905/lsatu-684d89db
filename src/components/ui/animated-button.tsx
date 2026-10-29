"use client";

/**
 * Animated Button — adapted from "Animated Vercel-like Button" (21st.dev)
 *
 * Changes from the original:
 *  - Removed @phosphor-icons/react dependency (icon prop stripped)
 *  - Spinner palette reskinned to stealth-elite (white/neutral-950 leaves)
 *  - Default variant tokens set to match LSAT U auth CTA (white bg, dark text)
 *  - Spinner size aligned with h-11 button height
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// SPINNER — 8-leaf Apple-style radial, staggered animation-delay
// ─────────────────────────────────────────────────────────────────────────────

interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md";
  /** Tailwind bg-* class for the leaf color — e.g. "bg-neutral-950" */
  leafColor?: string;
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size = "sm", leafColor = "bg-neutral-950", ...props }, ref) => {
    const dims = size === "md" ? "w-5 h-5" : "w-4 h-4";

    return (
      <span
        ref={ref}
        className={cn("relative block opacity-70", dims, className)}
        {...props}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 left-1/2 w-[12.5%] h-full animate-spinner-leaf-fade"
            style={{
              transform: `rotate(${i * 45}deg)`,
              animationDelay: `${-(7 - i) * 100}ms`,
            }}
          >
            <span className={cn("block w-full h-[30%] rounded-full", leafColor)} />
          </span>
        ))}
      </span>
    );
  }
);
Spinner.displayName = "Spinner";

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-semibold transition-all duration-200",
    "disabled:pointer-events-none disabled:opacity-60",
    "outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    "cursor-pointer select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        // ── LSAT U auth CTA ─────────────────────────────────────────────────
        cta: "bg-white text-neutral-950 hover:bg-neutral-100 shadow-[0_1px_12px_-2px_rgba(255,255,255,0.12)]",
        // ── Secondary (outlined) ─────────────────────────────────────────────
        ghost: "bg-transparent text-white border border-white/[0.08] hover:bg-white/[0.05]",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
      },
    },
    defaultVariants: {
      variant: "cta",
      size: "default",
    },
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON
// ─────────────────────────────────────────────────────────────────────────────

export interface AnimatedButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Spinner leaf color: white for ghost/dark variants, dark for cta (white bg)
    const leafColor = variant === "ghost" ? "bg-white" : "bg-neutral-950";

    return (
      <motion.div
        whileTap={loading || disabled ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full"
      >
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }), "w-full")}
          disabled={disabled || loading}
          {...props}
        >
          <div className="flex items-center justify-center gap-2">
            {/* ── Spinner / icon adornment — animated in/out ── */}
            <AnimatePresence initial={false} mode="wait">
              {loading && (
                <motion.div
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.6, width: 0, marginRight: 0 }}
                  animate={{ opacity: 1, scale: 1, width: 18, marginRight: 4 }}
                  exit={{ opacity: 0, scale: 0.6, width: 0, marginRight: 0 }}
                  transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="overflow-hidden flex items-center justify-center"
                >
                  <Spinner size="sm" leafColor={leafColor} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Label ── */}
            <span>{loading ? (loadingText ?? children) : children}</span>
          </div>
        </Comp>
      </motion.div>
    );
  }
);
AnimatedButton.displayName = "AnimatedButton";
