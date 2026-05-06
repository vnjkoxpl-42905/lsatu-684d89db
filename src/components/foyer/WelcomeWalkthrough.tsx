"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Compass,
  Target,
  LayoutDashboard,
  MessageSquare,
  Calendar,
  GraduationCap,
  LifeBuoy,
  ChevronRight,
  ChevronLeft,
  X,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lsatu_welcome_walkthrough_v1";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
  bullets?: string[];
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    eyebrow: "Welcome",
    title: "Welcome to LSAT U",
    body: "A quick 60-second tour of how everything fits together. You can replay it any time from the Help menu.",
  },
  {
    icon: Compass,
    eyebrow: "Foyer",
    title: "This is your Foyer",
    body: "Your home base. The orbital ring in the center holds your three main actions, and the sidebar on the left is your full workspace.",
    bullets: [
      "Smart Drill — adaptive practice on your weakest types",
      "Resume — jumps back into your latest assignment",
      "Find — pull up any specific question instantly",
    ],
  },
  {
    icon: Target,
    eyebrow: "Practice",
    title: "Smart Drill is your daily reps",
    body: "Adaptive engine picks questions based on your accuracy, timing, and recent struggles. Every wrong answer feeds your Wrong Answer Journal so it comes back later.",
  },
  {
    icon: GraduationCap,
    eyebrow: "Bootcamps",
    title: "Bootcamps build the skills",
    body: "Focused multi-day modules — Intro to LR, Causation Station, Principle & Flaw — that teach the underlying mechanics before you drill them.",
  },
  {
    icon: MessageSquare,
    eyebrow: "Coaching",
    title: "Talk to Joshua anytime",
    body: "The Inbox is a real 1:1 thread with your instructor. Send messages, attach PDFs, get feedback. Ask Joshua (top-right) is the AI companion for instant help.",
  },
  {
    icon: Calendar,
    eyebrow: "Plan",
    title: "Schedule keeps you on pace",
    body: "Your weekly plan, classroom assignments, and recap notes all live in the sidebar. Open Schedule to see what's due next.",
  },
  {
    icon: LayoutDashboard,
    eyebrow: "Tools",
    title: "Quick dock at the bottom",
    body: "The floating dock holds tools you reach for often — whiteboard, notifications, settings, and help. Customize it from Settings → Layout.",
  },
  {
    icon: LifeBuoy,
    eyebrow: "Stuck?",
    title: "Help is one click away",
    body: "The Help button (in the dock) sends a message straight to Joshua. Real human, real response — no support tickets.",
  },
  {
    icon: Rocket,
    eyebrow: "Ready",
    title: "You're all set",
    body: "Start with a Smart Drill to calibrate the engine, or jump into a bootcamp. Everything you do feeds your analytics so the system gets smarter.",
  },
];

export interface WelcomeWalkthroughProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeWalkthrough({ open, onClose }: WelcomeWalkthroughProps) {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    onClose();
  };

  const handleFinish = () => {
    handleClose();
    navigate("/drill", { state: { mode: "adaptive" } });
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Card */}
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900 to-neutral-950 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
          >
            {/* Bronze glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-accent-bronze/20 blur-3xl" />

            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
              aria-label="Close walkthrough"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-7 pt-10 pb-6">
              {/* Icon */}
              <div className="mb-5 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-inner">
                  <Icon className="h-6 w-6 text-accent-bronze" />
                </div>
              </div>

              {/* Eyebrow */}
              <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-accent-bronze/80">
                {current.eyebrow}
              </p>

              {/* Title */}
              <h2 className="mb-3 text-center text-2xl font-semibold text-white">
                {current.title}
              </h2>

              {/* Body */}
              <p className="text-center text-[15px] leading-relaxed text-neutral-300">
                {current.body}
              </p>

              {/* Bullets */}
              {current.bullets && (
                <ul className="mt-5 space-y-2">
                  {current.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-neutral-300"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-bronze" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-4">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={`Go to step ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step
                      ? "w-6 bg-accent-bronze"
                      : i < step
                        ? "w-1.5 bg-white/40"
                        : "w-1.5 bg-white/15",
                  )}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-white/5 bg-black/30 px-5 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-neutral-400 hover:text-white"
              >
                Skip tour
              </Button>

              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep((s) => s - 1)}
                    className="border-white/10 bg-white/[0.02] text-neutral-200 hover:bg-white/[0.06]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}

                {isLast ? (
                  <Button
                    size="sm"
                    onClick={handleFinish}
                    className="bg-accent-bronze text-black hover:bg-accent-bronze/90"
                  >
                    Start Smart Drill
                    <Rocket className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setStep((s) => s + 1)}
                    className="bg-accent-bronze text-black hover:bg-accent-bronze/90"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Step counter */}
            <div className="absolute bottom-[68px] right-5 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              {step + 1} / {STEPS.length}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function hasSeenWalkthrough(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function resetWalkthrough() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export default WelcomeWalkthrough;
