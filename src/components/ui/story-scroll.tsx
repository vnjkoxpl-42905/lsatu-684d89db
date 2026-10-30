import * as React from "react";

import { cn } from "@/lib/utils";

const getPrefersReducedMotion = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export interface StorySectionProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  /**
   * Injected by StoryScroll. Drives the stacking z-order and whether this panel
   * gets a card edge (every panel after the first slides over the one before it).
   */
  index?: number;
  /** Injected by StoryScroll. False under reduced-motion -> normal document flow. */
  stacked?: boolean;
}

/**
 * One panel in the story stack. When stacked, it sticks to the top of the
 * viewport and the next panel scrolls up and covers it. Panels are opaque
 * (bg-inherit over a solid container) so the cover-and-stack reads cleanly.
 */
export const StorySection = ({
  children,
  className,
  innerClassName,
  style,
  "aria-label": ariaLabel,
  index = 0,
  stacked = true,
}: StorySectionProps) => (
  <section
    data-story-section
    data-story-index={index}
    aria-label={ariaLabel}
    className={cn(
      "w-full bg-inherit",
      stacked
        ? "sticky top-0 flex min-h-screen flex-col items-center justify-center overflow-hidden"
        : "relative",
      // Every panel above the base gets a soft top edge so you can see it slide
      // up over the previous one. The base panel (the hero) stays flush.
      stacked && index > 0 && "rounded-t-[28px] shadow-[0_-26px_60px_-30px_rgba(20,18,12,0.30)]",
      className,
    )}
    style={stacked ? { zIndex: index + 1, ...style } : style}
  >
    <div data-story-inner className={cn("relative w-full", innerClassName)}>
      {children}
    </div>
  </section>
);

export interface StoryScrollProps {
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Pinned card-stack scroll. Each child <StorySection> sticks to the top of the
 * viewport and is progressively covered by the next, giving the 21st.dev
 * "story scroll" motion. Implemented with CSS position: sticky + z-index (no
 * scroll-position math, so nothing can go stale on layout shifts). Collapses to
 * a plain stacked document under prefers-reduced-motion.
 */
export const StoryScroll = ({
  children,
  className,
  "aria-label": ariaLabel = "Landing story",
}: StoryScrollProps) => {
  const [reducedMotion, setReducedMotion] = React.useState(getPrefersReducedMotion);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  const panels = React.Children.toArray(children).filter(React.isValidElement);

  return (
    <main data-story-scroll aria-label={ariaLabel} className={cn("relative w-full", className)}>
      {panels.map((panel, index) =>
        React.cloneElement(panel as React.ReactElement<StorySectionProps>, {
          index,
          stacked: !reducedMotion,
        }),
      )}
    </main>
  );
};

export default StoryScroll;
