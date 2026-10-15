import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { useLastActivity } from "@/hooks/useLastActivity";
import { buildInsightSlides, type InsightSlide } from "@/components/mainhub/insightSlides";
import type { DrillSection } from "@/lib/drillSection";
import { labelFor, resolveResumeTarget } from "@/lib/lastActivity";
import { RcSessionHistory } from "@/features/rc/components/RcSessionHistory";
import "@/features/rc/rc.css";

interface PracticeInsightStageProps {
  /** Which bank the hub is on. RC shows its own drill history in place of LR insights. */
  section?: DrillSection;
  /** Opens the embedded analytics stage at the given tab. */
  onOpenAnalytics: (tab?: string) => void;
  /** Opens an embedded drill-launcher stage (was the /practice hub). */
  onOpenLauncher: (kind: "type-drill") => void;
  canOpenAnalytics: boolean;
  canOpenJournal: boolean;
  drillReturnTo?: string;
}

/**
 * The practice card: what the student's own attempts say, and the two records
 * (Analytics, Journal) behind them.
 *
 * It used to hold a "Build a Set" tile and a five-slide rotating carousel. The
 * tile was the third door to the same builder the hero console opens; the
 * carousel showed one insight at a time on a seven-second timer, four of them
 * empty for a new account. Now: no door (the console is the door), and every
 * real insight is on the page at once, still. Nothing rotates, nothing needs a
 * pause control, and an empty account sees one honest line instead of five.
 */
export default function PracticeInsightStage({
  section = "lr",
  onOpenAnalytics,
  onOpenLauncher,
  canOpenAnalytics,
  canOpenJournal,
  drillReturnTo = "/classroom",
}: PracticeInsightStageProps) {
  const navigate = useNavigate();
  const { data: lastActivity } = useLastActivity();
  const { analytics, streak, loading } = useStudentAnalytics();
  const slides = React.useMemo(
    () => buildInsightSlides(analytics, streak),
    [analytics, streak],
  );

  /* Real signals first, at most three. With none, the streak slide alone: its
     empty copy ("Answer a few questions today to start one") is the one honest
     thing to say to an account with no attempts. */
  const shown = React.useMemo(() => {
    const real = slides.filter((s) => !s.empty).slice(0, 3);
    return real.length > 0 ? real : slides.slice(0, 1);
  }, [slides]);

  const resumable = React.useMemo(() => {
    if (section !== "lr" || !lastActivity) return null;
    const snapshot = lastActivity.state_snapshot;
    if (snapshot.kind === "bootcamp_step") return null;
    const target = resolveResumeTarget(snapshot);
    return {
      label: labelFor(snapshot),
      route: target.path,
      state:
        target.path === "/drill"
          ? { ...(target.state as object), returnTo: drillReturnTo }
          : target.state,
    };
  }, [drillReturnTo, lastActivity, section]);

  const handleSlideAction = React.useCallback(
    (slide: InsightSlide) => {
      const href = slide.actionHref;
      if (href.startsWith("/classroom/drill?stage=analytics")) {
        onOpenAnalytics(slide.tab);
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
    /* Surface and padding live in .drill-observatory-practice. */
    <div className="drill-observatory-practice relative flex flex-col overflow-hidden">
      <div className="flex flex-col gap-5">
        <h2 className="drill-observatory-label drill-observatory-ink-60">
          {section === "rc" ? "Your reading drills" : "Your practice"}
        </h2>

        {resumable && (
          <button
            type="button"
            className="drill-observatory-resume-row drill-observatory-focus-inset flex w-full min-w-0 items-center gap-3 text-left"
            onClick={() => navigate(resumable.route, { state: resumable.state })}
          >
            <span className="min-w-0 flex-1">
              <span className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55 block">
                Resume your drill
              </span>
              <span className="drill-observatory-ink-full mt-1 block truncate text-[13px] font-medium">
                {resumable.label}
              </span>
            </span>
            <ArrowRight className="drill-observatory-ink-85 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        )}

        {section === "rc" ? (
          <RcSessionHistory tone="dark" />
        ) : (
          <ul className="drill-observatory-insights" aria-label="Insights">
            {shown.map((slide, index) => (
              <li key={slide.id} className="drill-observatory-insight">
                <div className="min-w-0">
                  <span className="drill-observatory-label drill-observatory-label-sm drill-observatory-ink-55 block">
                    {slide.kicker}
                  </span>
                  <span
                    className={cn(
                      "drill-observatory-insight-value mt-[7px] block",
                      slide.empty && "drill-observatory-ink-62",
                    )}
                  >
                    {loading ? "…" : slide.headline}
                  </span>
                  <span className="drill-observatory-ink-62 mt-1 block text-[12.5px] font-normal leading-[1.45]">
                    {slide.detail}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSlideAction(slide)}
                  /* Only the top insight earns a pill. Three pills in a column
                     read as three primary actions. */
                  className={cn(
                    "inline-flex items-center gap-2",
                    index === 0 ? "drill-observatory-insight-action" : "drill-observatory-insight-link",
                  )}
                >
                  {slide.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(canOpenAnalytics || canOpenJournal) && (
        <div className="drill-observatory-records mt-auto flex flex-wrap gap-2 pt-5">
          {canOpenAnalytics && (
            <SecondaryLink icon={BarChart3} label="Analytics" onClick={() => onOpenAnalytics("overview")} />
          )}
          {canOpenJournal && (
            <SecondaryLink icon={BookOpen} label="Journal" onClick={() => navigate("/journal")} />
          )}
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
        <div className="drill-observatory-ink-62 mt-[3px] text-[12.5px] leading-[1.45]">
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
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}
