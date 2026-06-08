import * as React from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export interface StorySectionProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  pin?: boolean;
  settle?: boolean;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export const StorySection = ({
  children,
  className,
  innerClassName,
  pin = true,
  settle = true,
  style,
  "aria-label": ariaLabel,
}: StorySectionProps) => (
  <section
    data-story-section
    data-story-pin={pin ? "true" : "false"}
    data-story-settle={settle ? "true" : "false"}
    aria-label={ariaLabel}
    className={cn("relative min-h-[100svh] w-full overflow-hidden bg-inherit", className)}
    style={style}
  >
    <div
      data-story-inner
      className={cn("story-scroll-inner relative flex min-h-[100svh] w-full flex-col justify-center", innerClassName)}
      style={{ transformOrigin: "bottom left" }}
    >
      {children}
    </div>
  </section>
);

export interface StoryScrollProps {
  children: React.ReactNode;
  className?: string;
  pinSpacing?: boolean;
  "aria-label"?: string;
}

const countChildren = (children: React.ReactNode) => React.Children.count(children);

const getPrefersReducedMotion = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

export const StoryScroll = ({
  children,
  className,
  pinSpacing = false,
  "aria-label": ariaLabel = "Landing story",
}: StoryScrollProps) => {
  const containerRef = React.useRef<HTMLElement>(null);
  const [reducedMotion, setReducedMotion] = React.useState(getPrefersReducedMotion);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", updateReducedMotion);
    };
  }, []);

  useGSAP(
    () => {
      if (typeof window === "undefined" || reducedMotion || !containerRef.current) return;

      const sections = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>("[data-story-section]"),
      );

      if (sections.length < 2) return;

      const triggers: ScrollTrigger[] = [];

      sections.forEach((section, index) => {
        const inner = section.querySelector<HTMLElement>("[data-story-inner]");
        if (!inner) return;

        const shouldPin = section.dataset.storyPin !== "false";
        const shouldSettle = section.dataset.storySettle !== "false";

        gsap.set(section, { zIndex: index + 1 });

        if (index > 0 && shouldSettle) {
          gsap.set(inner, {
            rotation: 18,
            transformOrigin: "bottom left",
          });

          const settleTween = gsap.to(inner, {
            rotation: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top 25%",
              scrub: true,
            },
          });

          if (settleTween.scrollTrigger) triggers.push(settleTween.scrollTrigger);
        }

        if (index < sections.length - 1 && shouldPin) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "bottom bottom",
              end: "bottom top",
              pin: true,
              pinSpacing,
            }),
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((trigger) => trigger.kill());
      };
    },
    { scope: containerRef, dependencies: [countChildren(children), reducedMotion, pinSpacing] },
  );

  return (
    <main
      ref={containerRef}
      data-story-scroll
      aria-label={ariaLabel}
      className={cn("w-full overflow-x-hidden bg-inherit", className)}
    >
      {children}
    </main>
  );
};

export default StoryScroll;
