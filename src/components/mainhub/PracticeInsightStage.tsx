import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  Grid3x3,
  Layers,
  ScrollText,
  ArrowLeft,
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
  const [rcOpen, setRcOpen] = React.useState(false);

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
    /* Surface, padding and the hairline split live in .drill-observatory-practice
       and -practice-tools. Flat #08080b: no texture, no wash, no grid. */
    <div className="drill-observatory-practice relative flex flex-col overflow-hidden">
      {/* Practice Tools */}
      <div>
        <p className="drill-observatory-label drill-observatory-ink-42 mb-4">
          Practice tools
        </p>
        {/* Reading Comprehension is the one tool whose shape a student picks
            before leaving this page, so its tile turns the tool row over
            rather than navigating away cold. */}
        <FlipDeck
          flipped={rcOpen}
          front={
            <div className="drill-observatory-practice-tools">
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
              <PracticeTile
                icon={ScrollText}
                title="Reading Comprehension"
                description="Drill full passages the way they appear on the test."
                onClick={() => setRcOpen(true)}
              />
            </div>
          }
          back={<RcQuickBuild onClose={() => setRcOpen(false)} />}
        />
        <div className="mt-[18px] flex flex-wrap gap-2">
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
    </div>
  );
}

/**
 * Two faces sharing one footprint, turned on the Y axis. The faces are stacked
 * absolutely so the taller one cannot pad out the shorter, and the deck's own
 * height is measured from whichever face is showing — a fixed height would
 * either clip the back or leave a hole under the front.
 */
function FlipDeck({
  flipped,
  front,
  back,
}: {
  flipped: boolean;
  front: React.ReactNode;
  back: React.ReactNode;
}) {
  const frontRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number>();

  React.useLayoutEffect(() => {
    const measure = () => {
      const face = flipped ? backRef.current : frontRef.current;
      if (face) setHeight(face.offsetHeight);
    };
    measure();
    // Both faces are observed: the hidden one can reflow (a wrap at a new
    // width) while it waits, and it has to be right the moment it turns.
    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    // A resize event is dispatched even when the observer's callbacks are not
    // being delivered — a tab in the background has no rendering steps, so a
    // window resized there would otherwise leave the deck at a stale height.
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [flipped]);

  return (
    <div
      className={cn("drill-observatory-flip", flipped && "is-flipped")}
      style={height ? { height } : undefined}
    >
      <div
        ref={frontRef}
        className="drill-observatory-flip-face drill-observatory-flip-front"
        aria-hidden={flipped}
      >
        {front}
      </div>
      <div
        ref={backRef}
        className="drill-observatory-flip-face drill-observatory-flip-back"
        aria-hidden={!flipped}
      >
        {back}
      </div>
    </div>
  );
}

const RC_COUNTS = [1, 2, 3, 4] as const;

const RC_PACES = [
  { id: "untimed", label: "Untimed" },
  { id: "standard", label: "Standard", caption: "8:45 each" },
] as const;

const RC_REVEALS = [
  { id: "per_passage", label: "After each passage" },
  { id: "end_of_set", label: "At the end" },
] as const;

/**
 * The back of the tool row: the three choices that actually change an RC drill,
 * then straight into it. Anything finer (topic, format, hand-picking) lives on
 * the RC hub, one link away.
 */
function RcQuickBuild({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [count, setCount] = React.useState<number>(1);
  const [pace, setPace] = React.useState<string>("untimed");
  const [reveal, setReveal] = React.useState<string>("per_passage");

  const start = () => {
    const query = new URLSearchParams({
      count: String(count),
      timing: pace,
      reveal,
      start: "1",
    });
    navigate(`/rc?${query.toString()}`);
  };

  return (
    <div className="drill-observatory-rc-build">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="drill-observatory-ink-full text-[15px] font-semibold">
            Reading Comprehension
          </div>
          <div className="drill-observatory-ink-48 mt-[3px] text-[12.5px] leading-[1.45]">
            Set the shape of the drill, then go.
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="drill-observatory-secondary-link inline-flex shrink-0 items-center"
        >
          <ArrowLeft className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
          Back to tools
        </button>
      </div>

      <RcChoiceRow label="Passages">
        {RC_COUNTS.map((n) => (
          <RcChip key={n} active={count === n} onClick={() => setCount(n)}>
            {n}
          </RcChip>
        ))}
      </RcChoiceRow>

      <RcChoiceRow label="Pace">
        {RC_PACES.map((option) => (
          <RcChip
            key={option.id}
            active={pace === option.id}
            onClick={() => setPace(option.id)}
          >
            {option.label}
            {"caption" in option && option.caption && (
              <span className="drill-observatory-ink-48 ml-1.5">{option.caption}</span>
            )}
          </RcChip>
        ))}
      </RcChoiceRow>

      <RcChoiceRow label="Reveal answers">
        {RC_REVEALS.map((option) => (
          <RcChip
            key={option.id}
            active={reveal === option.id}
            onClick={() => setReveal(option.id)}
          >
            {option.label}
          </RcChip>
        ))}
      </RcChoiceRow>

      <div className="drill-observatory-rc-build-actions">
        <button
          type="button"
          onClick={start}
          className="drill-observatory-console-start inline-flex items-center justify-center gap-2"
        >
          Start reading drill
          <ArrowRight className="h-[13px] w-[13px]" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => navigate("/rc")}
          className="drill-observatory-secondary-link inline-flex items-center"
        >
          All passages and filters
        </button>
      </div>
    </div>
  );
}

function RcChoiceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-38 mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function RcChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("drill-observatory-rc-chip", active && "is-active")}
    >
      {children}
    </button>
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
      className="drill-observatory-secondary-link inline-flex items-center"
    >
      <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden />
      {label}
    </button>
  );
}
