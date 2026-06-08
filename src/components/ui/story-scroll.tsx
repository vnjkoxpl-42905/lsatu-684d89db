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
    className={cn("relative w-full bg-inherit", className)}
    style={style}
  >
    <div
      data-story-inner
      className={cn("story-scroll-inner relative w-full", innerClassName)}
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
  settleRotation?: number;
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
  pinSpacing = true,
  settleRotation = 1.75,
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
      const sectionStates = sections.map((section) => {
        const inner = section.querySelector<HTMLElement>("[data-story-inner]");

        return {
          section,
          inner,
          shouldPin: section.dataset.storyPin !== "false",
          shouldSettle: section.dataset.storySettle !== "false",
        };
      });

      sectionStates.forEach(({ section, inner, shouldPin, shouldSettle }, index) => {
        if (!inner) return;

        gsap.set(section, { zIndex: sections.length + index });
        gsap.set(inner, {
          transformOrigin: "bottom left",
          force3D: true,
          willChange: "transform",
        });

        if (index > 0 && shouldSettle) {
          gsap.set(inner, {
            rotation: settleRotation,
          });

          const settleTween = gsap.to(inner, {
            rotation: 0,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom-=8%",
              end: "top 62%",
              scrub: 1.1,
              fastScrollEnd: true,
              invalidateOnRefresh: true,
            },
          });

          if (settleTween.scrollTrigger) triggers.push(settleTween.scrollTrigger);
        }

        if (index < sections.length - 1 && shouldPin) {
          const nextSection = sectionStates[index + 1]?.section;

          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "top top",
              end: () => {
                if (!nextSection) return "+=0";

                const distance = nextSection.offsetTop - section.offsetTop;
                return `+=${Math.max(distance, window.innerHeight * 0.72)}`;
              },
              pin: true,
              pinSpacing,
              scrub: false,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            }),
          );
        }
      });

      ScrollTrigger.refresh();

      return () => {
        triggers.forEach((trigger) => trigger.kill());
      };
    },
    { scope: containerRef, dependencies: [countChildren(children), reducedMotion, pinSpacing, settleRotation] },
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
