"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Compass,
  Target,
  GraduationCap,
  MessageSquare,
  Calendar,
  Rocket,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lsatu_guided_tour_v1";
const LEGACY_KEY = "lsatu_welcome_walkthrough_v1";
const EVENT_START = "lsatu:tour:start";

type Step = {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    path: "/foyer",
    icon: Compass,
    eyebrow: "Foyer",
    title: "This is your home base",
    body: "Orbital ring = your top 3 actions. Sidebar = full workspace. We'll walk you through each one.",
  },
  {
    path: "/drill",
    icon: Target,
    eyebrow: "Smart Drill",
    title: "Adaptive practice, daily",
    body: "Picks questions from your weakest types. Wrong answers go to your Wrong Answer Journal automatically.",
  },
  {
    path: "/bootcamps",
    icon: GraduationCap,
    eyebrow: "Bootcamps",
    title: "Skill modules",
    body: "Multi-day courses that teach the mechanics — Intro to LR, Causation, Principle & Flaw — before you drill them.",
  },
  {
    path: "/inbox",
    icon: MessageSquare,
    eyebrow: "Inbox",
    title: "Talk to Joshua",
    body: "Real 1:1 thread with your instructor. Send messages, attach PDFs, get feedback.",
  },
  {
    path: "/schedule",
    icon: Calendar,
    eyebrow: "Schedule",
    title: "What's due next",
    body: "Your weekly plan and upcoming assignments live here so you always know what's on deck.",
  },
  {
    path: "/foyer",
    icon: Rocket,
    eyebrow: "Ready",
    title: "You're all set",
    body: "Jump into a Smart Drill to calibrate the engine, or open a bootcamp. Replay this tour anytime from Help.",
  },
];

export function hasSeenTour(): boolean {
  try {
    return (
      localStorage.getItem(STORAGE_KEY) === "1" ||
      localStorage.getItem(LEGACY_KEY) === "1"
    );
  } catch {
    return true;
  }
}

export function resetTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function startTour() {
  resetTour();
  window.dispatchEvent(new CustomEvent(EVENT_START));
}

export default function GuidedTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const [active, setActive] = React.useState(false);
  const [step, setStep] = React.useState(0);

  // Listen for external start triggers
  React.useEffect(() => {
    const onStart = () => {
      setStep(0);
      setActive(true);
      // ensure we're at the first step's route
      if (location.pathname !== STEPS[0].path) {
        navigate(STEPS[0].path);
      }
    };
    window.addEventListener(EVENT_START, onStart as EventListener);
    return () => window.removeEventListener(EVENT_START, onStart as EventListener);
  }, [location.pathname, navigate]);

  const close = React.useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setActive(false);
  }, []);

  const goNext = React.useCallback(() => {
    setStep((s) => {
      const next = Math.min(STEPS.length - 1, s + 1);
      if (next !== s && STEPS[next].path !== location.pathname) {
        navigate(STEPS[next].path);
      }
      return next;
    });
  }, [location.pathname, navigate]);

  const goBack = React.useCallback(() => {
    setStep((s) => {
      const prev = Math.max(0, s - 1);
      if (prev !== s && STEPS[prev].path !== location.pathname) {
        navigate(STEPS[prev].path);
      }
      return prev;
    });
  }, [location.pathname, navigate]);

  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, goNext, goBack]);

  if (!active) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const onCurrentRoute = location.pathname === current.path;

  // Hide the card briefly while the new route mounts (sleek transition)
  if (!onCurrentRoute) return null;

  const handleFinish = () => {
    close();
    navigate("/drill", { state: { mode: "adaptive" } });
  };

  return (
    <AnimatePresence>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed z-[120] pointer-events-none",
          // Mobile: bottom sheet feel; Desktop: bottom-right floating card
          "inset-x-3 bottom-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[360px]",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 backdrop-blur-xl shadow-[0_24px_60px_-16px_rgba(0,0,0,0.75)]">
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
                  <span className="text-amber-400">
                    {step + 1}/{STEPS.length}
                  </span>
                  <span className="text-neutral-600">·</span>
                  <span className="normal-case tracking-normal text-neutral-300">
                    {current.eyebrow}
                  </span>
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
            <h3 className="text-[15px] font-semibold text-white leading-snug">
              {current.title}
            </h3>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">
              {current.body}
            </p>

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
                    Start Smart Drill
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
  );
}
