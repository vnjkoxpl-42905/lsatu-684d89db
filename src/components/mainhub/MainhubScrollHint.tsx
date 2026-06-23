// MainhubScrollHint — discoverability affordance for the story-scroll reveal.
//
// The Practice Hub panel slides up over the Main Hub via CSS sticky stacking
// (see story-scroll.tsx); there's no native cue that more exists. This pins a
// clickable "lip" + bouncing up-chevron to the bottom-center of the Main Hub
// panel. Clicking smooth-scrolls into Practice Hub. It hides itself once the
// user has scrolled past the hero or while an orbital node is expanded.

import * as React from "react";
import { ChevronUp } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useOrbitalActive } from "@/contexts/OrbitalActiveContext";

interface MainhubScrollHintProps {
  onClick: () => void;
}

export default function MainhubScrollHint({ onClick }: MainhubScrollHintProps) {
  const reducedMotion = useReducedMotion();
  const { active: orbitalActive } = useOrbitalActive();
  const [scrolledPast, setScrolledPast] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolledPast(window.scrollY > window.innerHeight * 0.4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hidden = orbitalActive || scrolledPast;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Scroll up to Practice Hub"
      className={cn(
        "absolute bottom-0 left-1/2 z-20 -translate-x-1/2",
        "pointer-events-auto flex flex-col items-center gap-1",
        "rounded-t-[20px] border border-b-0 border-border/50 bg-background/80 px-5 pb-2 pt-2.5",
        "shadow-[0_-18px_40px_-24px_rgba(20,18,12,0.45)] backdrop-blur",
        "text-muted-foreground transition-all duration-300 hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        hidden
          ? "translate-y-4 opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      )}
    >
      <ChevronUp
        className={cn("h-4 w-4", !reducedMotion && "animate-bounce")}
        strokeWidth={2}
        aria-hidden
      />
      <span className="text-[10px] font-medium uppercase tracking-[0.14em]">
        Practice Hub
      </span>
    </button>
  );
}
