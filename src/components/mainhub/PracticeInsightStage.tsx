import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Grid3x3,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { buildInsightSlides } from "@/components/mainhub/insightSlides";

const ROTATE_MS = 7000;

interface PracticeInsightStageProps {
  /** Opens the embedded analytics stage at the given tab. */
  onOpenAnalytics: (tab?: string) => void;
  canOpenAnalytics: boolean;
  canOpenJournal: boolean;
}

/**
 * Replaces the orbital ring. A stable pair of primary practice actions
 * (Full Section / Build a Set) plus an auto-rotating, real-data insight
 * carousel. Styled as the observatory's instrument bay.
 */
export default function PracticeInsightStage({
  onOpenAnalytics,
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

  React.useEffect(() => {
    if (paused || slides.length <= 1) return;
    const t = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(t);
  }, [paused, slides.length]);

  const slide = slides[index] ?? slides[0];

  const handleSlideAction = React.useCallback(
    (href: string, tab: string) => {
      if (href.startsWith("/classroom/drill?stage=analytics")) {
        onOpenAnalytics(tab);
        return;
      }
      navigate(href);
    },
    [navigate, onOpenAnalytics],
  );

  return (
    <div className="drill-observatory-practice">
      {/* Practice Tools */}
      <div className="obs-bay-block">
        <div className="obs-bay-head">
          <span className="obs-bay-index">01</span>
          <p className="obs-bay-title">Practice tools</p>
          <span className="obs-bay-rule" aria-hidden />
        </div>
        <div className="drill-observatory-practice-tools">
          <PracticeTile
            ordinal="01"
            icon={Layers}
            title="Full Section"
            description="Start a timed official section."
            onClick={() => navigate("/practice?action=full-section")}
          />
          <PracticeTile
            ordinal="02"
            icon={Grid3x3}
            title="Build a Set"
            description="Assemble a targeted question set."
            onClick={() => navigate("/practice?action=type-drill")}
          />
        </div>
        <div className="obs-secondary-row">
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
        className="obs-bay-block obs-bay-block-insight"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="obs-bay-head">
          <span className="obs-bay-index">02</span>
          <p className="obs-bay-title">Insight preview</p>
          <span className="obs-bay-rule" aria-hidden />
          <div className="obs-insight-dots" role="tablist" aria-label="Insight slides">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={s.kicker}
                aria-selected={i === index}
                onClick={() => setIndex(i)}
                className={cn("obs-insight-dot", i === index && "is-active")}
              />
            ))}
          </div>
        </div>

        <div className="drill-observatory-insight">
          <AnimatePresence mode="wait">
            {slide && (
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.32 }}
                className="obs-insight-body"
              >
                <span className="obs-insight-kicker">{slide.kicker}</span>
                <span className={cn("obs-insight-headline", slide.empty && "is-empty")}>
                  {loading ? "…" : slide.headline}
                </span>
                <span className="obs-insight-detail">{slide.detail}</span>
                <button
                  type="button"
                  onClick={() => handleSlideAction(slide.actionHref, slide.tab)}
                  className="obs-insight-action"
                >
                  {slide.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {slides.length > 1 && (
            <div className="obs-insight-progress" aria-hidden>
              <div
                key={`${index}-${paused}`}
                className={cn("obs-insight-progress-fill", paused && "is-paused")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PracticeTile({
  ordinal,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  ordinal: string;
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="drill-observatory-practice-tile group"
    >
      <span className="obs-tile-ordinal" aria-hidden>{ordinal}</span>
      <span className="obs-tile-icon">
        <Icon aria-hidden />
      </span>
      <span className="obs-tile-text">
        <span className="obs-tile-title">{title}</span>
        <span className="obs-tile-desc">{description}</span>
      </span>
      <span className="obs-tile-arrow" aria-hidden>
        <ArrowRight />
      </span>
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
      className="drill-observatory-secondary-link"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
      <span className="obs-secondary-pulse" aria-hidden />
    </button>
  );
}
