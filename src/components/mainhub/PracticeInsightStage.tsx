import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Grid3x3,
  Layers,
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { buildInsightSlides } from "@/components/mainhub/insightSlides";
import type { DrillSection } from "@/lib/drillSection";
import { RcSessionHistory } from "@/features/rc/components/RcSessionHistory";
import "@/features/rc/rc.css";

const ROTATE_MS = 7000;

interface PracticeInsightStageProps {
  /**
   * Which bank the hub is on. The bay is shared by both sections now, so the
   * two tiles name the bank they open: "a targeted question set" was
   * describing a passage builder on the RC side.
   */
  section?: DrillSection;
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
  section = "lr",
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
    // RC does not draw the carousel, so nothing should be rotating behind it.
    if (section === "rc" || paused || userPaused || slides.length <= 1) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(t);
  }, [section, paused, userPaused, slides.length]);

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
    /* Surface, padding and the hairline split live in .drill-observatory-practice
       and -practice-tools. Flat #08080b: no texture, no wash, no grid. */
    <div className="drill-observatory-practice relative flex flex-col overflow-hidden">
      {/* Practice Tools */}
      <div>
        <p className="drill-observatory-label drill-observatory-ink-42 mb-4">
          Practice tools
        </p>
        {/* Section choice belongs to the LR/RC switch above. Practice tools
            only describe what the student can do inside the active section. */}
        <div className="drill-observatory-practice-tools">
          <PracticeTile
            icon={Layers}
            title="Full Section"
            description={
              section === "rc"
                ? "Sit one real RC section, four passages, under the clock."
                : "Sit one real LR section under the clock."
            }
            onClick={() => onOpenLauncher("full-section")}
          />
          <PracticeTile
            icon={Grid3x3}
            title="Build a Set"
            description={
              section === "rc"
                ? "Choose passages by topic, format, and difficulty."
                : "Choose questions by type, reasoning, and level."
            }
            onClick={() => onOpenLauncher("type-drill")}
          />
        </div>
        <div className="mt-[18px] flex flex-wrap gap-2">
          {canOpenAnalytics && (
            <SecondaryLink icon={BarChart3} label="Analytics" onClick={() => onOpenAnalytics("overview")} />
          )}
          {canOpenJournal && (
            <SecondaryLink icon={BookOpen} label="Journal" onClick={() => navigate("/journal")} />
          )}
        </div>
      </div>

      {/* Rotating insight preview — LR only. The carousel is built from LR
          attempts, so on RC it would be one section's numbers presented as the
          other's. RC's own drill history takes the slot instead: it is the
          real, RC-specific status, and it had nowhere to live once the two
          bays became one. RcHubSurface still skips drawing a history of its
          own on the assumption that this slot carries it. */}
      {section === "rc" ? (
        <div className="drill-observatory-insight-section relative">
          <div className="mb-3.5 flex items-center justify-between">
            <p className="drill-observatory-label drill-observatory-ink-42">
              Your reading drills
            </p>
          </div>
          <RcSessionHistory tone="dark" />
        </div>
      ) : (
      <div
        className="drill-observatory-insight-section relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <p className="drill-observatory-label drill-observatory-ink-42">
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
                    i === index
                      ? "w-5 bg-[rgba(244,241,234,0.75)]"
                      : "w-1.5 bg-[rgba(244,241,234,0.22)] hover:bg-[rgba(244,241,234,0.45)]",
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
                className="drill-observatory-ink-38 grid h-6 w-6 place-items-center rounded-full transition hover:bg-[rgba(244,241,234,0.08)]"
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

        <div className="drill-observatory-insight relative">
          <AnimatePresence mode="wait">
            {slide && (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28 }}
                className="flex flex-wrap items-end justify-between gap-5"
              >
                <div className="min-w-0">
                  <span className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-38 block">
                    {slide.kicker}
                  </span>
                  <span
                    className={cn(
                      "drill-observatory-insight-value mt-[7px] block",
                      slide.empty && "drill-observatory-ink-55",
                    )}
                  >
                    {loading ? "…" : slide.headline}
                  </span>
                  <span className="drill-observatory-ink-48 mt-1 block text-[12.5px] font-normal leading-[1.45]">
                    {slide.detail}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSlideAction(slide.actionHref, slide.tab)}
                  className="drill-observatory-insight-action inline-flex items-center gap-2"
                >
                  {slide.actionLabel}
                  <ArrowRight className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </div>
  );
}


export function PracticeTile({
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
        "group flex flex-col items-start text-left",
      )}
    >
      <Icon
        className="drill-observatory-ink-85 h-5 w-5"
        strokeWidth={1.8}
        aria-hidden
      />
      <div>
        <div className="drill-observatory-ink-full text-[15px] font-semibold">{title}</div>
        <div className="drill-observatory-ink-48 mt-[3px] text-[12.5px] leading-[1.45]">
          {description}
        </div>
      </div>
    </button>
  );
}

export function SecondaryLink({
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
      className="drill-observatory-secondary-link inline-flex items-center"
    >
      <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}
