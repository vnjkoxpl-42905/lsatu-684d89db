"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// LSAT U Arc tokens — mirrored from src/pages/Auth.tsx so the footer reads
// as part of the same warm-cream landing surface.
const ARC = {
  bg: "#FBF8F1",
  bgTinted: "#F5EFE2",
  ink: "#15171D",
  inkSecondary: "#6F7480",
  hairline: "rgba(21,23,29,0.08)",
  accent: "#1F3FE3",
  accentDeep: "#15224A",
  accentSoft: "#DCE2FA",
  serif: '"Fraunces", "Iowan Old Style", "Times New Roman", serif',
  sans: '"Inter", -apple-system, "SF Pro Display", system-ui, sans-serif',
};

const STYLES = `
.cinematic-footer-wrapper {
  font-family: ${ARC.sans};
  color: ${ARC.ink};
  background: ${ARC.bg};
  -webkit-font-smoothing: antialiased;

  --pill-bg-1: rgba(21,23,29,0.03);
  --pill-bg-2: rgba(21,23,29,0.01);
  --pill-shadow: rgba(15,17,29,0.06);
  --pill-highlight: rgba(255,255,255,0.6);
  --pill-inset-shadow: rgba(21,23,29,0.04);
  --pill-border: ${ARC.hairline};

  --pill-bg-1-hover: rgba(21,23,29,0.05);
  --pill-bg-2-hover: rgba(21,23,29,0.02);
  --pill-border-hover: rgba(21,23,29,0.18);
  --pill-shadow-hover: rgba(15,17,29,0.10);
  --pill-highlight-hover: rgba(255,255,255,0.8);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.85; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(31,63,227,0.35)); }
  15%, 45% { transform: scale(1.18); filter: drop-shadow(0 0 8px rgba(31,63,227,0.55)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }
.animate-footer-heartbeat { animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite; }

.footer-bg-grid {
  background-size: 60px 60px;
  background-image:
    linear-gradient(to right, rgba(21,23,29,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(21,23,29,0.04) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}

.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%,
    rgba(31,63,227,0.14) 0%,
    rgba(220,226,250,0.55) 40%,
    transparent 72%
  );
}

.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow:
      0 10px 30px -12px var(--pill-shadow),
      inset 0 1px 1px var(--pill-highlight),
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  color: ${ARC.ink};
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow:
      0 18px 36px -10px var(--pill-shadow-hover),
      inset 0 1px 1px var(--pill-highlight-hover);
}

.footer-cta-pill {
  background: ${ARC.ink};
  color: ${ARC.bg};
  border: 1px solid ${ARC.ink};
  box-shadow: 0 12px 30px -10px rgba(15,17,29,0.18);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
}
.footer-cta-pill:hover {
  background: ${ARC.accentDeep};
  border-color: ${ARC.accentDeep};
  box-shadow: 0 22px 40px -10px rgba(21,34,74,0.30);
}

.footer-giant-bg-text {
  font-family: ${ARC.serif};
  font-size: 26vw;
  line-height: 0.78;
  font-weight: 600;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(21,23,29,0.07);
  background: linear-gradient(180deg, rgba(21,23,29,0.14) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

.footer-text-glow {
  font-family: ${ARC.serif};
  background: linear-gradient(180deg, ${ARC.ink} 0%, rgba(21,23,29,0.55) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-marquee-bar {
  background: ${ARC.bgTinted};
  border-top: 1px solid ${ARC.hairline};
  border-bottom: 1px solid ${ARC.hairline};
}

@media (prefers-reduced-motion: reduce) {
  .animate-footer-breathe,
  .animate-footer-scroll-marquee,
  .animate-footer-heartbeat {
    animation: none !important;
  }
  .footer-glass-pill,
  .footer-cta-pill { transition: none !important; }
}
`;

// Magnetic pill — GSAP cursor-tracking with elastic settle. Disabled when
// the user prefers reduced motion.
export type MagneticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as?: React.ElementType;
  };

const MagneticButton = React.forwardRef<HTMLElement, MagneticButtonProps>(
  ({ className, children, as: Component = "button", ...props }, forwardedRef) => {
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const h = rect.width / 2;
          const w = rect.height / 2;
          const x = e.clientX - rect.left - h;
          const y = e.clientY - rect.top - w;

          gsap.to(element, {
            x: x * 0.35,
            y: y * 0.35,
            rotationX: -y * 0.12,
            rotationY: x * 0.12,
            scale: 1.04,
            ease: "power2.out",
            duration: 0.4,
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.2,
          });
        };

        element.addEventListener("mousemove", handleMouseMove);
        element.addEventListener("mouseleave", handleMouseLeave);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove);
          element.removeEventListener("mouseleave", handleMouseLeave);
        };
      }, element);

      return () => ctx.revert();
    }, []);

    return (
      <Component
        ref={(node: HTMLElement | null) => {
          (localRef as React.MutableRefObject<HTMLElement | null>).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef)
            (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        className={cn("cursor-pointer", className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
MagneticButton.displayName = "MagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center space-x-12 px-6">
    <span>Lessons &amp; Drills</span> <span style={{ color: ARC.accent, opacity: 0.55 }}>✦</span>
    <span>Smart Drill</span> <span style={{ color: ARC.accentDeep, opacity: 0.55 }}>✦</span>
    <span>Adaptive Difficulty</span> <span style={{ color: ARC.accent, opacity: 0.55 }}>✦</span>
    <span>Ask Joshua</span> <span style={{ color: ARC.accentDeep, opacity: 0.55 }}>✦</span>
    <span>Built for Aspiring Attorneys</span> <span style={{ color: ARC.accent, opacity: 0.55 }}>✦</span>
  </div>
);

export type CinematicFooterProps = {
  onPrimary?: () => void;
  onSecondary?: () => void;
};

export function CinematicFooter({ onPrimary, onSecondary }: CinematicFooterProps = {}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        giantTextRef.current,
        { y: "10vh", scale: 0.85, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 80%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );

      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 40%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div
        ref={wrapperRef}
        className="relative h-screen w-full"
        style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
      >
        <footer className="cinematic-footer-wrapper fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden">

          <div className="footer-aurora absolute left-1/2 top-1/2 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px] pointer-events-none z-0" />
          <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

          <div
            ref={giantTextRef}
            className="footer-giant-bg-text absolute -bottom-[5vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
          >
            LSAT
          </div>

          <div className="footer-marquee-bar absolute top-12 left-0 w-full overflow-hidden py-4 z-10 -rotate-2 scale-110 shadow-[0_8px_30px_-12px_rgba(15,17,29,0.10)]">
            <div
              className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-medium tracking-[0.3em] uppercase"
              style={{ color: ARC.inkSecondary }}
            >
              <MarqueeItem />
              <MarqueeItem />
            </div>
          </div>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 mt-20 w-full max-w-5xl mx-auto">
            <h2
              ref={headingRef}
              className="footer-text-glow text-5xl md:text-8xl tracking-tighter mb-12 text-center"
              style={{ fontWeight: 600, letterSpacing: "-0.03em" }}
            >
              Ready to begin?
            </h2>

            <div ref={linksRef} className="flex flex-col items-center gap-6 w-full">
              <div className="flex flex-wrap justify-center gap-4 w-full">
                <MagneticButton
                  as="button"
                  type="button"
                  onClick={onPrimary}
                  className="footer-cta-pill px-10 py-5 rounded-full font-medium text-sm md:text-base flex items-center gap-3"
                >
                  Begin training
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </MagneticButton>

                <MagneticButton
                  as="button"
                  type="button"
                  onClick={onSecondary}
                  className="footer-glass-pill px-10 py-5 rounded-full font-medium text-sm md:text-base"
                >
                  Sign in
                </MagneticButton>
              </div>
            </div>
          </div>

          <div className="relative z-20 w-full pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">

            <div
              className="text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1"
              style={{ color: ARC.inkSecondary }}
            >
              © LSAT U · Built for aspiring attorneys.
            </div>

            <div
              className="footer-glass-pill px-6 py-3 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default"
              style={{ borderColor: ARC.hairline }}
            >
              <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest" style={{ color: ARC.inkSecondary }}>
                Crafted with
              </span>
              <span className="animate-footer-heartbeat text-sm md:text-base" style={{ color: ARC.accent }}>❤</span>
              <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest" style={{ color: ARC.inkSecondary }}>
                for aspiring attorneys
              </span>
            </div>

            <MagneticButton
              as="button"
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="w-12 h-12 rounded-full footer-glass-pill flex items-center justify-center group order-3"
              style={{ color: ARC.inkSecondary }}
            >
              <svg className="w-5 h-5 transform group-hover:-translate-y-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </MagneticButton>

          </div>
        </footer>
      </div>
    </>
  );
}
