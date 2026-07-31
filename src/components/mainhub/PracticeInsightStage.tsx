import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Grid3x3,
  Layers,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { buildInsightSlides } from "@/components/mainhub/insightSlides";

const ROTATE_MS = 7000;

interface PracticeInsightStageProps {
  /** Opens the embedded analytics stage at the given tab. */
  onOpenAnalytics: (tab?: string) => void;
  /** Opens an embedded drill-launcher stage (was the /practice hub). */
  onOpenLauncher: (kind: "full-section" | "type-drill") => void;
  canOpenAnalytics: boolean;
  canOpenJournal: boolean;
}

/**
 * Replaces the orbital ring. A stable pair of primary practice actions
 * (Full Section / Build a Set) plus an auto-rotating, real-data insight
 * carousel. Dark/glass to sit as a sibling to the hero and Today panel.
 */
export default function PracticeInsightStage({
  onOpenAnalytics,
  onOpenLauncher,
  canOpenAnalytics,
  canOpenJournal,
}: PracticeInsightStageProps) {
  const navigate = useNavigate();
  const { analytics, streak, loading } = useStudentAnalytics();
  const slides = React.useMemo(
    () => buildInsightSlides(analytics, streak),
    [analytics, streak],
  );

  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [userPaused, setUserPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || userPaused || slides.length <= 1) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(t);
  }, [paused, userPaused, slides.length]);

  const slide = slides[index] ?? slides[0];

  const handleSlideAction = React.useCallback(
    (href: string, tab: string) => {
      if (href.startsWith("/classroom/drill?stage=analytics")) {
        onOpenAnalytics(tab);
        return;
      }
      if (href.startsWith("/classroom/drill?stage=full-section")) {
        onOpenLauncher("full-section");
        return;
      }
      if (href.startsWith("/classroom/drill?stage=type-drill")) {
        onOpenLauncher("type-drill");
        return;
      }
      navigate(href);
    },
    [navigate, onOpenAnalytics, onOpenLauncher],
  );

  return (
    <div className="drill-observatory-practice relative flex flex-col gap-4 overflow-hidden rounded-[24px] border border-white/[0.08] bg-zinc-950 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.16)] sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.10),transparent_36%),radial-gradient(circle_at_86%_82%,rgba(14,165,233,0.10),transparent_40%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:52px_52px]"
      />

      {/* Practice Tools */}
      <div className="relative z-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Practice tools
        </p>
        <div className="drill-observatory-practice-tools grid grid-cols-1 gap-0 sm:grid-cols-2">
          <PracticeTile
            icon={Layers}
            title="Full Section"
            description="Start a timed official section."
            onClick={() => onOpenLauncher("full-section")}
          />
          <PracticeTile
            icon={Grid3x3}
            title="Build a Set"
            description="Assemble a targeted question set."
            onClick={() => onOpenLauncher("type-drill")}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canOpenAnalytics && (
            <SecondaryLink icon={BarChart3} label="Analytics" onClick={() => onOpenAnalytics("overview")} />
          )}
          {canOpenJournal && (
            <SecondaryLink icon={BookOpen} label="Journal" onClick={() => navigate("/journal")} />
          )}
        </div>
      </div>

      {/* Rotating insight preview */}
      <div
        className="relative z-10 mt-1"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Insight preview
          </p>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Insight slides">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-label={s.kicker}
                  aria-selected={i === index}
                  onClick={() => setIndex(i)}
                  /* The dot stays 6px; the *target* is 24px. A centred
                     pseudo-element carries the hit area so the control meets
                     the 24x24 minimum without the dots visually drifting
                     apart. */
                  className={cn(
                    "relative h-1.5 rounded-full transition-all",
                    "before:absolute before:left-1/2 before:top-1/2 before:h-6 before:w-6",
                    "before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
                    i === index ? "w-5 bg-white/80" : "w-1.5 bg-white/25 hover:bg-white/45",
                  )}
                />
              ))}
            </div>
            {slides.length > 1 && (
              /* Auto-rotating content needs a real stop, not just
                 pause-on-hover: hover reaches neither keyboard nor touch. */
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                aria-label={
                  userPaused ? "Resume insight rotation" : "Pause insight rotation"
                }
                aria-pressed={userPaused}
                className="grid h-6 w-6 place-items-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white/80"
              >
                {userPaused ? (
                  <Play className="h-3 w-3" aria-hidden />
                ) : (
                  <Pause className="h-3 w-3" aria-hidden />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="drill-observatory-insight relative min-h-[132px] rounded-[18px] border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            {slide && (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="flex h-full flex-col"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {slide.kicker}
                </span>
                <span
                  className={cn(
                    "mt-1 text-xl font-semibold text-white",
                    slide.empty && "text-white/55",
                  )}
                >
                  {loading ? "…" : slide.headline}
                </span>
                <span className="mt-1 text-xs font-medium leading-5 text-white/55">
                  {slide.detail}
                </span>
                <button
                  type="button"
                  onClick={() => handleSlideAction(slide.actionHref, slide.tab)}
                  className="mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2 text-[12px] font-semibold text-white/90 transition hover:border-white/25 hover:bg-white/[0.12]"
                >
                  {slide.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PracticeTile({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "drill-observatory-practice-tile",
        "group flex flex-col items-start gap-2 rounded-[18px] border p-4 text-left transition",
        "border-white/[0.08] bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.09]",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <Icon className="h-5 w-5 text-white/80" aria-hidden />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-[11px] leading-4 text-white/50">{description}</div>
      </div>
    </button>
  );
}

function SecondaryLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="drill-observatory-secondary-link inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] font-semibold text-white/70 transition hover:border-white/25 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
