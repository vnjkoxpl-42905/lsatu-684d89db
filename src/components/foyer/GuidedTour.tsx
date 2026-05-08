"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  PanelLeft,
  Zap,
  Target,
  GraduationCap,
  MessageSquare,
  Calendar,
  Rocket,
  LifeBuoy,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useUserPermissions,
  type PermissionFlag,
} from "@/hooks/useUserPermissions";

const STORAGE_KEY = "lsatu_guided_tour_v2";
const LEGACY_KEYS = ["lsatu_guided_tour_v1", "lsatu_welcome_walkthrough_v1"];
const EVENT_START = "lsatu:tour:start";

type Side = "top" | "bottom" | "left" | "right";

type Step = {
  /** Route the step lives on. The tour navigates here when entering. */
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  /**
   * Optional CSS selector for the element to spotlight. When set, the
   * tooltip is anchored next to it with an arrow; otherwise the card
   * floats in the bottom-right corner.
   */
  anchor?: string;
  /** Preferred side for the tooltip relative to the anchor. */
  side?: Side;
  /** Skip this step if the user lacks the listed permission flag. */
  requires?: PermissionFlag;
  /** Skip this step on viewports narrower than `md` (768px). */
  desktopOnly?: boolean;
};

const ALL_STEPS: Step[] = [
  {
    path: "/foyer",
    icon: Compass,
    eyebrow: "Foyer",
    title: "Welcome — this is your home base",
    body: "Everything you need each day starts here. Let's quickly point out where things live.",
  },
  {
    path: "/foyer",
    icon: Zap,
    eyebrow: "Orbital ring",
    title: "Your primary daily actions",
    body: "The orbital ring holds your top shortcuts. Click the center node to activate it, or click any outer node to jump straight into that surface. You can swap which actions live here from Settings → Layout.",
    anchor: '[data-tour="foyer-orbital"]',
    side: "right",
  },
  {
    path: "/foyer",
    icon: PanelLeft,
    eyebrow: "Sidebar",
    title: "Your full workspace",
    body: "Every workspace surface — Classroom, Messages, Practice, Schedule, and more — opens from the sidebar. The active page is highlighted as you move around.",
    anchor: '[data-tour="foyer-sidebar"]',
    side: "right",
    desktopOnly: true,
  },
  {
    path: "/foyer",
    icon: Bell,
    eyebrow: "Top dock",
    title: "Notifications & your account",
    body: "The bell shows new alerts; the avatar opens your account menu. New messages from Joshua surface here too.",
    anchor: '[data-tour="foyer-dock"]',
    side: "bottom",
  },
  {
    path: "/foyer",
    icon: LifeBuoy,
    eyebrow: "Quick dock",
    title: "Help, settings, and quick tools",
    body: "The floating dock at the bottom is your quick-launch row — settings, profile, schedule, inbox, and Help. Open Help to send Joshua a message or replay this tour.",
    anchor: '[data-tour="foyer-quickdock"]',
    side: "top",
  },
  {
    path: "/practice",
    icon: Target,
    eyebrow: "Practice",
    title: "Where you actually drill questions",
    body: "Pick Full Section for a 25-question timed test, Smart Builder to let the AI choose your weakest types, or Build a Set to hand-pick.",
    requires: "has_practice_access",
  },
  {
    path: "/bootcamps",
    icon: GraduationCap,
    eyebrow: "Bootcamps",
    title: "Multi-day skill modules",
    body: "Each bootcamp teaches a specific skill — Causation, Flaw, Intro to LR — across days of focused practice. Open one to start.",
    requires: "has_bootcamp_access",
  },
  {
    path: "/inbox",
    icon: MessageSquare,
    eyebrow: "Inbox",
    title: "Direct line to Joshua",
    body: "Real 1-on-1 messaging with your instructor. Send questions, attach PDFs, get personalized feedback.",
    requires: "has_chat_access",
  },
  {
    path: "/schedule",
    icon: Calendar,
    eyebrow: "Schedule",
    title: "What's due and when",
    body: "Your weekly plan and upcoming tutoring sessions. Anything scheduled or assigned shows up here so nothing slips.",
    requires: "has_schedule_access",
  },
  {
    path: "/foyer",
    icon: Rocket,
    eyebrow: "Ready",
    title: "You're all set",
    body: "You can replay this tour anytime from Help in the bottom dock. Now jump into a Smart Drill to calibrate the engine.",
  },
];

export function hasSeenTour(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
    return LEGACY_KEYS.some((k) => localStorage.getItem(k) === "1");
  } catch {
    return true;
  }
}

export function resetTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function startTour() {
  resetTour();
  window.dispatchEvent(new CustomEvent(EVENT_START));
}

interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function useAnchorRect(selector: string | undefined, deps: unknown[]): AnchorRect | null {
  const [rect, setRect] = React.useState<AnchorRect | null>(null);

  React.useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    // Initial measure (and one more on next frame to catch transitions)
    measure();
    raf = window.requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const ro = new ResizeObserver(measure);
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el) ro.observe(el);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector, ...deps]);

  return rect;
}

const TOOLTIP_W = 360;
const TOOLTIP_GAP = 16;
const PAD = 12;

function placeTooltip(
  rect: AnchorRect,
  preferred: Side | undefined,
  vw: number,
  vh: number,
  tooltipH: number,
): { top: number; left: number; side: Side } {
  // Generous padding; if a side doesn't fit, try the next one in priority order.
  const order: Side[] = preferred
    ? [preferred, ...(["right", "bottom", "left", "top"] as Side[]).filter((s) => s !== preferred)]
    : (["right", "bottom", "left", "top"] as Side[]);

  for (const side of order) {
    if (side === "right" && rect.left + rect.width + TOOLTIP_GAP + TOOLTIP_W + PAD < vw) {
      return {
        top: clamp(rect.top + rect.height / 2 - tooltipH / 2, PAD, vh - tooltipH - PAD),
        left: rect.left + rect.width + TOOLTIP_GAP,
        side,
      };
    }
    if (side === "left" && rect.left - TOOLTIP_GAP - TOOLTIP_W - PAD > 0) {
      return {
        top: clamp(rect.top + rect.height / 2 - tooltipH / 2, PAD, vh - tooltipH - PAD),
        left: rect.left - TOOLTIP_GAP - TOOLTIP_W,
        side,
      };
    }
    if (side === "bottom" && rect.top + rect.height + TOOLTIP_GAP + tooltipH + PAD < vh) {
      return {
        top: rect.top + rect.height + TOOLTIP_GAP,
        left: clamp(rect.left + rect.width / 2 - TOOLTIP_W / 2, PAD, vw - TOOLTIP_W - PAD),
        side,
      };
    }
    if (side === "top" && rect.top - TOOLTIP_GAP - tooltipH - PAD > 0) {
      return {
        top: rect.top - TOOLTIP_GAP - tooltipH,
        left: clamp(rect.left + rect.width / 2 - TOOLTIP_W / 2, PAD, vw - TOOLTIP_W - PAD),
        side,
      };
    }
  }
  // Fallback: center under viewport
  return { top: vh - tooltipH - PAD, left: clamp(vw / 2 - TOOLTIP_W / 2, PAD, vw - TOOLTIP_W - PAD), side: "bottom" };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export default function GuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const perms = useUserPermissions();
  const [active, setActive] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);
  const [tooltipH, setTooltipH] = React.useState(180);
  const [vp, setVp] = React.useState({ vw: typeof window !== "undefined" ? window.innerWidth : 1280, vh: typeof window !== "undefined" ? window.innerHeight : 720 });

  // Filter steps the user can't reach so the tour never strands them on a
  // gated route or a viewport where the anchor is hidden.
  const STEPS = React.useMemo(() => {
    const isMobile = vp.vw < 768;
    return ALL_STEPS.filter((s) => {
      if (s.desktopOnly && isMobile) return false;
      if (s.requires && !perms.is_admin && !perms[s.requires]) return false;
      return true;
    });
  }, [perms, vp.vw]);

  // Pick a safe finish destination: prefer /practice, fall back to /foyer.
  const finishPath = React.useMemo(() => {
    if (perms.is_admin || perms.has_practice_access) return "/practice";
    return "/foyer";
  }, [perms]);

  React.useEffect(() => {
    const onStart = () => {
      setStep(0);
      setActive(true);
      if (STEPS.length > 0 && location.pathname !== STEPS[0].path) {
        navigate(STEPS[0].path);
      }
    };
    window.addEventListener(EVENT_START, onStart as EventListener);
    return () => window.removeEventListener(EVENT_START, onStart as EventListener);
  }, [location.pathname, navigate, STEPS]);

  React.useEffect(() => {
    const onResize = () => setVp({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // If the filtered list shrinks below the current index, snap back in range.
  React.useEffect(() => {
    if (step > STEPS.length - 1) setStep(Math.max(0, STEPS.length - 1));
  }, [STEPS.length, step]);

  const close = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setActive(false);
  }, []);

  const goNext = React.useCallback(() => {
    setStep((s) => {
      const next = Math.min(STEPS.length - 1, s + 1);
      if (next !== s && STEPS[next].path !== location.pathname) navigate(STEPS[next].path);
      return next;
    });
  }, [location.pathname, navigate, STEPS]);

  const goBack = React.useCallback(() => {
    setStep((s) => {
      const prev = Math.max(0, s - 1);
      if (prev !== s && STEPS[prev].path !== location.pathname) navigate(STEPS[prev].path);
      return prev;
    });
  }, [location.pathname, navigate, STEPS]);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack arrow keys when the user is editing text.
      const t = e.target as HTMLElement | null;
      const editing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (e.key === "Escape") {
        close();
        return;
      }
      if (editing) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, goNext, goBack]);

  const current = active ? STEPS[step] : null;
  const onCurrentRoute = current ? location.pathname === current.path : false;
  const anchorRect = useAnchorRect(onCurrentRoute && current?.anchor ? current.anchor : undefined, [step, vp.vw, vp.vh]);

  // Measure tooltip after render
  React.useLayoutEffect(() => {
    if (tooltipRef.current) setTooltipH(tooltipRef.current.offsetHeight);
  }, [step, active, anchorRect]);

  // Scroll anchor into view when step changes
  React.useEffect(() => {
    if (!active || !current?.anchor) return;
    const el = document.querySelector(current.anchor) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
  }, [active, step, current?.anchor]);

  if (!active || !current || !onCurrentRoute) return null;

  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const handleFinish = () => {
    close();
    navigate(finishPath);
  };

  // Compute placement
  const usingAnchor = !!anchorRect;
  const placement = usingAnchor
    ? placeTooltip(anchorRect, current.side, vp.vw, vp.vh, tooltipH)
    : null;

  // Spotlight box (slightly larger than the anchor)
  const SPOT_PAD = 8;
  const spot = anchorRect
    ? {
        top: anchorRect.top - SPOT_PAD,
        left: anchorRect.left - SPOT_PAD,
        width: anchorRect.width + SPOT_PAD * 2,
        height: anchorRect.height + SPOT_PAD * 2,
      }
    : null;

  return (
    <>
      {/* Dim overlay with cutout for the spotlight. Clicks on the dim area
          are eaten so users don't accidentally navigate mid-tour; the
          spotlight cutout itself stays click-through so the highlighted
          element remains interactive. */}
      <AnimatePresence>
        <motion.div
          key="tour-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[110]"
          aria-hidden
          onClick={(e) => {
            // Only swallow clicks on the dim area itself, not on the spotlight.
            if (e.target === e.currentTarget) e.stopPropagation();
          }}
        >
          {spot ? (
            <div
              className="absolute rounded-2xl pointer-events-none"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                boxShadow: "0 0 0 9999px rgba(8, 11, 22, 0.62)",
                outline: "2px solid rgba(245, 158, 11, 0.85)",
                outlineOffset: "0px",
                transition: "all 220ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[rgba(8,11,22,0.50)]" />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`step-${step}`}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "fixed z-[120] pointer-events-none",
            !usingAnchor && "inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]",
          )}
          style={
            usingAnchor && placement
              ? { top: placement.top, left: placement.left, width: TOOLTIP_W }
              : { paddingBottom: "env(safe-area-inset-bottom)" }
          }
        >
          <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 backdrop-blur-xl shadow-[0_24px_60px_-16px_rgba(0,0,0,0.75)]">
            {/* Arrow toward anchor */}
            {usingAnchor && placement && (
              <Arrow side={placement.side} />
            )}

            {/* Bronze glow */}
            <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />

            {/* Progress bar */}
            <div className="relative h-0.5 w-full bg-white/5">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500/80 to-amber-500"
                initial={false}
                animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="relative px-4 pt-3.5 pb-3.5">
              {/* Header */}
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <Icon className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                    <span className="text-amber-400">{step + 1}/{STEPS.length}</span>
                    <span className="text-neutral-600">·</span>
                    <span className="normal-case tracking-normal text-neutral-300">{current.eyebrow}</span>
                  </div>
                </div>
                <button
                  onClick={close}
                  aria-label="Close tour"
                  className="rounded-md p-1 text-neutral-500 hover:bg-white/5 hover:text-white transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Title + body */}
              <h3 className="text-[15px] font-semibold text-white leading-snug">{current.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">{current.body}</p>

              {/* Footer */}
              <div className="mt-3.5 flex items-center justify-between">
                <button
                  onClick={close}
                  className="text-[11px] text-neutral-500 hover:text-white transition"
                >
                  Skip tour
                </button>

                <div className="flex items-center gap-1.5">
                  {step > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goBack}
                      className="h-7 border-white/10 bg-white/[0.03] px-2 text-[11px] text-neutral-200 hover:bg-white/[0.06]"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Back
                    </Button>
                  )}
                  {isLast ? (
                    <Button
                      size="sm"
                      onClick={handleFinish}
                      className="h-7 bg-amber-500 px-2.5 text-[11px] text-black hover:bg-amber-500/90"
                    >
                      Start practicing
                      <Rocket className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={goNext}
                      className="h-7 bg-amber-500 px-2.5 text-[11px] text-black hover:bg-amber-500/90"
                    >
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

function Arrow({ side }: { side: Side }) {
  // Small triangular nub pointing toward the anchor.
  const base = "absolute h-3 w-3 rotate-45 border border-white/10 bg-neutral-900";
  if (side === "right") {
    // Tooltip is to the right of anchor → arrow on the left edge of tooltip
    return <span aria-hidden className={cn(base, "-left-[6px] top-1/2 -translate-y-1/2 border-r-0 border-t-0")} />;
  }
  if (side === "left") {
    return <span aria-hidden className={cn(base, "-right-[6px] top-1/2 -translate-y-1/2 border-l-0 border-b-0")} />;
  }
  if (side === "bottom") {
    return <span aria-hidden className={cn(base, "-top-[6px] left-1/2 -translate-x-1/2 border-r-0 border-b-0")} />;
  }
  // top
  return <span aria-hidden className={cn(base, "-bottom-[6px] left-1/2 -translate-x-1/2 border-l-0 border-t-0")} />;
}
