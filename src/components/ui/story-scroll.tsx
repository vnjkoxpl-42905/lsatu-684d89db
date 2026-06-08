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
  style?: React.CSSProperties;
  "aria-label"?: string;
}

export const StorySection = ({
  children,
  className,
  innerClassName,
  style,
  "aria-label": ariaLabel,
}: StorySectionProps) => (
  <section
    data-story-section
    aria-label={ariaLabel}
    className={cn("relative min-h-[92svh] w-full overflow-hidden md:min-h-screen", className)}
    style={style}
  >
    <div
      data-story-inner
      className={cn("story-scroll-inner relative min-h-[92svh] w-full md:min-h-screen", innerClassName)}
      style={{ transformOrigin: "bottom left" }}
    >
      {children}
    </div>
  </section>
);

export interface StoryScrollProps {
  children: React.ReactNode;
  className?: string;
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

        gsap.set(section, { zIndex: sections.length - index });

        if (index > 0) {
          gsap.set(inner, {
            autoAlpha: 0.92,
            rotation: 3.5,
            scale: 0.985,
            y: 28,
            transformOrigin: "bottom left",
          });

          const settleTween = gsap.to(inner, {
            autoAlpha: 1,
            rotation: 0,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "top 38%",
              scrub: true,
            },
          });

          if (settleTween.scrollTrigger) triggers.push(settleTween.scrollTrigger);
        }

        if (index < sections.length - 1) {
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "bottom bottom",
              end: "bottom top",
              pin: true,
              pinSpacing: false,
            }),
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((trigger) => trigger.kill());
      };
    },
    { scope: containerRef, dependencies: [countChildren(children), reducedMotion] },
  );

  return (
    <main ref={containerRef} aria-label={ariaLabel} className={cn("w-full overflow-x-hidden", className)}>
      {children}
    </main>
  );
};

export default StoryScroll;
