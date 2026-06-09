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
  pin?: boolean;
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
  pin = true,
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

      sections.forEach((section, index) => {
        const inner = section.querySelector<HTMLElement>("[data-story-inner]");
        if (!inner) return;

        gsap.set(section, { zIndex: sections.length + index });

        if (pin && index < sections.length - 1 && section.dataset.storyPin !== "false") {
          const nextSection = sections[index + 1];

          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              start: "top top",
              end: () => {
                if (!nextSection) return "+=0";

                const distance = nextSection.offsetTop - section.offsetTop;
                return `+=${Math.max(distance, window.innerHeight * 0.72)}`;
              },
              pin: inner,
              pinSpacing,
              anticipatePin: 1,
              fastScrollEnd: true,
              invalidateOnRefresh: true,
            }),
          );
        }
      });

      if (pin) ScrollTrigger.refresh();

      return () => {
        triggers.forEach((trigger) => trigger.kill());
      };
    },
    { scope: containerRef, dependencies: [countChildren(children), reducedMotion, pin, pinSpacing] },
  );

  // Settle is handled outside GSAP on purpose. useGSAP wraps its body in a
  // gsap.context() that reverts on cleanup, and the React StrictMode mount/unmount
  // churn was tearing down every rotation tween before it could land (leaving every
  // section frozen at its initial tilt). A plain IntersectionObserver + CSS
  // transition has no gsap context and no scroll-position math to go stale: each
  // section starts at settleRotation and rotates to 0deg once it enters the viewport.
  React.useEffect(() => {
    if (typeof window === "undefined" || reducedMotion || !containerRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const sections = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>("[data-story-section]"),
    );
    if (sections.length < 2) return;

    const observers: IntersectionObserver[] = [];
    const touched: HTMLElement[] = [];

    sections.forEach((section, index) => {
      if (index === 0 || section.dataset.storySettle === "false") return;

      const inner = section.querySelector<HTMLElement>("[data-story-inner]");
      if (!inner) return;

      // Apply the initial tilt with transitions off, force a reflow, then enable
      // the transition so the first paint does not animate into the tilt.
      inner.style.willChange = "transform";
      inner.style.transition = "none";
      inner.style.transform = `rotate(${settleRotation}deg)`;
      void inner.offsetWidth;
      inner.style.transition = "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
      touched.push(inner);

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            inner.style.transform = "rotate(0deg)";
            obs.disconnect();
          });
        },
        { rootMargin: "0px 0px -15% 0px", threshold: 0.01 },
      );

      observer.observe(section);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
      touched.forEach((inner) => {
        inner.style.transition = "";
        inner.style.transform = "";
        inner.style.willChange = "";
      });
    };
  }, [reducedMotion, settleRotation, countChildren(children)]);

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
