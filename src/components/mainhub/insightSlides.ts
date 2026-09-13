import type { StudentAnalytics } from "@/lib/mainhubAnalytics";
import type { StudentStreak } from "@/hooks/useStudentAnalytics";
import { launchDrill } from "@/lib/drillLaunch";

/** Which stable practice action a slide nudges the user toward. */
export type RecommendedAction = "full-section" | "type-drill" | null;

export interface InsightSlide {
  id: "streak" | "top-priority" | "accuracy-trend" | "practice-volume" | "wrong-answer";
  kicker: string;
  /** Primary line — the number/headline. Null when there is no data yet. */
  headline: string;
  detail: string;
  /** Label for the slide's own contextual action button. */
  actionLabel: string;
  /** Where the action button navigates (route or mainhub stage link). */
  actionHref: string;
  /** Analytics tab this slide deep-links into. */
  tab: string;
  /** Stable practice button to visually highlight while this slide shows. */
  recommend: RecommendedAction;
  /** True when the slide is showing a truthful empty state. */
  empty: boolean;
}

function fmtPct(v: number | null): string {
  return v === null ? "not yet" : `${Math.round(v)}%`;
}

const ANALYTICS = "/classroom/drill?stage=analytics";
const TYPE_DRILL = "/classroom/drill?stage=type-drill";
const SMART_DRILL = `/drill?${launchDrill({
  kind: "smart-drill",
  options: { returnTo: "/classroom" },
})}`;
// Sitting a section lives in the Testing Centre, not the drill hub.
const FULL_SECTION = "/testing";

/**
 * Derives the rotating insight slides from real analytics + streak. Slides
 * always render (stable order) but each falls back to a truthful empty state
 * when its underlying data is missing, rather than inventing numbers.
 */
export function buildInsightSlides(
  analytics: StudentAnalytics | null,
  streak: StudentStreak | null,
): InsightSlide[] {
  const topPriority = analytics?.priorities[0] ?? null;
  const trend = analytics?.trendDelta ?? null;
  const volume7d =
    analytics?.volumeByDay.slice(-7).reduce((sum, d) => sum + d.attempts, 0) ?? 0;

  return [
    {
      id: "streak",
      kicker: "Streak",
      headline: streak && streak.current > 0 ? `${streak.current}-day streak` : "No streak yet",
      detail:
        streak && streak.current > 0
          ? streak.goalReached
            ? `Goal met today · best ${streak.longest} days`
            : `${Math.max(0, streak.goal - streak.questionsToday)} more today to keep it`
          : "Answer a few questions today to start one",
      actionLabel: "Practice today",
      actionHref: SMART_DRILL,
      tab: "overview",
      recommend: "full-section",
      empty: !streak || streak.current === 0,
    },
    {
      id: "top-priority",
      kicker: "Top priority",
      headline: topPriority ? topPriority.label : "No priority yet",
      detail: topPriority
        ? `${fmtPct(topPriority.firstAccuracy)} first-attempt · ${topPriority.firstAttempts} attempts`
        : "Practice more to surface your weakest type",
      actionLabel: "Build targeted set",
      actionHref: TYPE_DRILL,
      tab: "priorities",
      recommend: "type-drill",
      empty: !topPriority,
    },
    {
      id: "accuracy-trend",
      kicker: "Accuracy trend",
      headline: analytics?.firstAttemptAccuracy != null
        ? fmtPct(analytics.firstAttemptAccuracy)
        : "No accuracy yet",
      detail:
        trend != null
          ? `${trend >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(trend))} pts vs last week`
          : "First-attempt accuracy across all your questions",
      /* Name the outcome, not the screen. A student does not want analytics,
         they want to know where the points are going. */
      actionLabel: "See where you lose points",
      actionHref: `${ANALYTICS}&tab=overview`,
      tab: "overview",
      recommend: null,
      empty: analytics?.firstAttemptAccuracy == null,
    },
    {
      id: "practice-volume",
      kicker: "Practice volume",
      headline: volume7d > 0 ? `${volume7d} this week` : "Quiet week",
      detail:
        volume7d > 0
          ? "Questions answered in the last 7 days"
          : "No questions logged in the last 7 days",
      actionLabel: "Start timed section",
      actionHref: FULL_SECTION,
      tab: "drills",
      recommend: "full-section",
      empty: volume7d === 0,
    },
    {
      id: "wrong-answer",
      kicker: "Wrong answer signal",
      headline: topPriority && topPriority.recentMissRate > 0
        ? `${Math.round(topPriority.recentMissRate * 100)}% recent misses`
        : "No recent misses",
      detail: topPriority && topPriority.recentMissRate > 0
        ? `Concentrated in ${topPriority.label}`
        : "Review missed questions in your Journal",
      actionLabel: "Review your missed questions",
      actionHref: "/journal",
      tab: "priorities",
      recommend: "type-drill",
      empty: !topPriority || topPriority.recentMissRate === 0,
    },
  ];
}
