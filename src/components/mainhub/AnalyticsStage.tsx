import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ExternalLink,
  Flame,
  Target,
  TrendingUp,
  ListChecks,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useAuth } from "@/contexts/AuthContext";
import ImportedMetricsPanel from "@/components/analytics/ImportedMetricsPanel";
import type { DimensionStat, PriorityRow } from "@/lib/mainhubAnalytics";
import { DRILL_SECTION_PARAM, type DrillSection } from "@/lib/drillSection";

const ACTIVE_TABS = ["overview", "drills", "priorities"] as const;
const LOCKED_TABS = ["sections", "preptests", "questions"] as const;

interface AnalyticsStageProps {
  tab: string;
  onTabChange: (tab: string) => void;
  /**
   * Which section the hub was on when this opened. Everything below is built
   * from LR attempts — RC keeps its own bank and its analytics are not built
   * yet — so from RC the workspace says so rather than letting a student read
   * LR numbers as their reading performance.
   */
  section?: DrillSection;
}

function pct(v: number | null): string {
  return v === null ? "—" : `${Math.round(v)}%`;
}

function secs(ms: number | null): string {
  return ms === null ? "—" : `${Math.round(ms / 1000)}s`;
}

/**
 * Full below-hero analytics workspace. Light, data-dense, LSAT U themed. Every
 * value comes from the signed-in student's real attempts; missing data renders
 * a truthful empty/low-sample state instead of a fake chart.
 */
function NativeAnalyticsStage({
  tab,
  onTabChange,
  section = "lr",
}: AnalyticsStageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const canOpenProgress = Boolean(user?.id && !permissions.loading && permissions.resolved === true && permissions.resolvedFor === user.id && (permissions.is_admin || permissions.has_analytics_access));
  /* Every link out of here carries the section back with it. Without it a
     student who opened analytics from RC returned to LR. */
  const backTo = (stage: string) =>
    `/classroom/drill?${DRILL_SECTION_PARAM}=${section}&stage=${stage}`;
  const { analytics, streak, loading, error, refetch } = useStudentAnalytics();
  const activeTab = (ACTIVE_TABS as readonly string[]).includes(tab)
    ? tab
    : "overview";

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border border-slate-200 border-t-slate-500" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Loading analytics
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-slate-700">
          Could not load your analytics.
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-4 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics || !analytics.hasData) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-base font-semibold text-slate-800">
          No analytics yet
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
          Answer questions in Smart Drill, Full Section, or Build a Set and your
          performance will appear here — first-attempt accuracy, priorities, and
          trends.
        </p>
        <button
          type="button"
          onClick={() => navigate(backTo("full-section"))}
          className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Start practicing
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Analytics</h2>
          <p className="text-xs text-slate-500">
            {analytics.totalQuestions} questions · {analytics.totalAttempts}{" "}
            attempts · first-attempt diagnostics
          </p>
          {section === "rc" && (
            <p className="mt-1 text-xs font-medium text-slate-600">
              These numbers cover Logical Reasoning. Reading Comprehension
              analytics are not built yet.
            </p>
          )}
        </div>
        {canOpenProgress && (
        <button
          type="button"
          onClick={() => navigate("/review/progress")}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
        >
          Open first-answer Progress
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </button>
        )}
      </div>

      {/* Top priorities */}
      <TopPriorities
        priorities={analytics.priorities}
        onDrill={() => navigate(backTo("type-drill"))}
      />

      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="flex flex-wrap gap-1 bg-slate-100">
          {ACTIVE_TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
              {t}
            </TabsTrigger>
          ))}
          {LOCKED_TABS.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              disabled
              className="capitalize opacity-40"
              title="Not available yet — needs data we don't track today"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-6">
          <StatCards analytics={analytics} streak={streak} />
          <div className="grid gap-5 lg:grid-cols-2">
            <AccuracyTrendCard analytics={analytics} />
            <PerformanceByTypeCard rows={analytics.byType} />
          </div>
        </TabsContent>

        <TabsContent value="drills" className="mt-5 space-y-6">
          <DrillStatCards analytics={analytics} />
          <PracticeVolumeCard analytics={analytics} />
          <PerformanceByTypeCard rows={analytics.byType} showRepeat />
        </TabsContent>

        <TabsContent value="priorities" className="mt-5">
          <PrioritiesBreakdown analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TopPriorities({
  priorities,
  onDrill,
}: {
  priorities: PriorityRow[];
  onDrill: (qtype: string) => void;
}) {
  if (priorities.length === 0) {
    return (
      <Card>
        <SectionLabel icon={Target}>Your top priorities</SectionLabel>
        <p className="mt-3 text-sm text-slate-500">
          Not enough first attempts yet for a reliable priority score. Keep
          practicing.
        </p>
      </Card>
    );
  }
  return (
    <div>
      <SectionLabel icon={Target}>Your top priorities</SectionLabel>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {priorities.slice(0, 4).map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onDrill(p.key)}
            className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                {p.label}
              </span>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                {p.score}
              </span>
            </div>
            <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {pct(p.firstAccuracy)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {p.firstAttempts} first attempts · {secs(p.avgTimeMs)} avg
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
              Build a set →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCards({
  analytics,
  streak,
}: {
  analytics: ReturnType<typeof useStudentAnalytics>["analytics"];
  streak: ReturnType<typeof useStudentAnalytics>["streak"];
}) {
  if (!analytics) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Target}
        label="First-attempt accuracy"
        value={pct(analytics.firstAttemptAccuracy)}
      />
      <StatCard
        icon={TrendingUp}
        label="7-day trend"
        value={
          analytics.trendDelta == null
            ? "—"
            : `${analytics.trendDelta >= 0 ? "+" : ""}${Math.round(analytics.trendDelta)} pts`
        }
      />
      <StatCard
        icon={ListChecks}
        label="Questions answered"
        value={String(analytics.totalQuestions)}
      />
      <StatCard
        icon={Flame}
        label="Current streak"
        value={streak ? `${streak.current}d` : "—"}
      />
    </div>
  );
}

function DrillStatCards({
  analytics,
}: {
  analytics: NonNullable<ReturnType<typeof useStudentAnalytics>["analytics"]>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={ListChecks}
        label="Total attempts"
        value={String(analytics.totalAttempts)}
      />
      <StatCard
        icon={Target}
        label="First-attempt accuracy"
        value={pct(analytics.firstAttemptAccuracy)}
      />
      <StatCard
        icon={TrendingUp}
        label="Review / retry accuracy"
        value={pct(analytics.repeatAccuracy)}
      />
      <StatCard
        icon={Flame}
        label="Repeat attempts"
        value={String(analytics.totalAttempts - analytics.totalQuestions)}
      />
    </div>
  );
}

function AccuracyTrendCard({
  analytics,
}: {
  analytics: NonNullable<ReturnType<typeof useStudentAnalytics>["analytics"]>;
}) {
  const data = analytics.accuracyTrend;
  return (
    <Card>
      <SectionLabel icon={TrendingUp}>Accuracy trend</SectionLabel>
      {data.length < 2 ? (
        <p className="mt-3 text-sm text-slate-500">
          Not enough days of practice yet to show a trend.
        </p>
      ) : (
        <div className="mt-3 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <Tooltip
                formatter={(v: number) => [
                  `${Math.round(v)}%`,
                  "First-attempt",
                ]}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#0f172a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function PracticeVolumeCard({
  analytics,
}: {
  analytics: NonNullable<ReturnType<typeof useStudentAnalytics>["analytics"]>;
}) {
  const data = analytics.volumeByDay;
  const total = data.reduce((s, d) => s + d.attempts, 0);
  return (
    <Card>
      <SectionLabel icon={ListChecks}>
        Practice volume · last 30 days
      </SectionLabel>
      {total === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No questions answered in the last 30 days.
        </p>
      ) : (
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickFormatter={(d) => d.slice(5)}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <Tooltip
                formatter={(v: number) => [String(v), "Attempts"]}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Bar dataKey="attempts" fill="#0f172a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function PerformanceByTypeCard({
  rows,
  showRepeat = false,
}: {
  rows: DimensionStat[];
  showRepeat?: boolean;
}) {
  const sorted = [...rows].sort(
    (a, b) => (a.firstAccuracy ?? 200) - (b.firstAccuracy ?? 200),
  );
  return (
    <Card>
      <SectionLabel icon={Target}>Performance by type</SectionLabel>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No question types recorded yet.
        </p>
      ) : (
        <div className="mt-3">
          <DimensionTable rows={sorted} showRepeat={showRepeat} />
        </div>
      )}
    </Card>
  );
}

function PrioritiesBreakdown({
  analytics,
}: {
  analytics: NonNullable<ReturnType<typeof useStudentAnalytics>["analytics"]>;
}) {
  const [sub, setSub] = React.useState("types");
  const map: Record<string, DimensionStat[]> = {
    types: analytics.byType,
    reasoning: analytics.byReasoning,
    features: analytics.byFeature,
    difficulty: analytics.byDifficulty,
  };
  const labels: Record<string, string> = {
    types: "Question Types",
    reasoning: "Reasoning Types",
    features: "Features",
    difficulty: "Difficulty",
  };
  const rows = [...map[sub]].sort(
    (a, b) => (a.firstAccuracy ?? 200) - (b.firstAccuracy ?? 200),
  );
  return (
    <Card>
      <div className="flex flex-wrap gap-1">
        {Object.keys(map).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSub(k)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
              sub === k
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            {labels[k]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">
            No {labels[sub].toLowerCase()} data yet. Keep practicing to populate
            this breakdown.
          </p>
        ) : (
          <DimensionTable rows={rows} showRepeat showMeta />
        )}
      </div>
    </Card>
  );
}

function DimensionTable({
  rows,
  showRepeat = false,
  showMeta = false,
}: {
  rows: DimensionStat[];
  showRepeat?: boolean;
  showMeta?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-3 font-semibold">Category</th>
            <th className="py-2 pr-3 font-semibold">First-attempt</th>
            <th className="py-2 pr-3 font-semibold">Attempts</th>
            {showRepeat && <th className="py-2 pr-3 font-semibold">Review</th>}
            {showMeta && <th className="py-2 pr-3 font-semibold">Avg time</th>}
            {showMeta && <th className="py-2 pr-3 font-semibold">Avg diff</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0">
              <td className="py-2 pr-3 font-medium text-slate-700">
                {r.label}
              </td>
              <td className="py-2 pr-3">
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    !r.reliable && "text-slate-400",
                  )}
                >
                  {pct(r.firstAccuracy)}
                </span>
                {!r.reliable && (
                  <span className="ml-1 text-[10px] text-slate-400">
                    low sample
                  </span>
                )}
              </td>
              <td className="py-2 pr-3 tabular-nums text-slate-600">
                {r.firstAttempts}
              </td>
              {showRepeat && (
                <td className="py-2 pr-3 tabular-nums text-slate-500">
                  {pct(r.repeatAccuracy)}
                </td>
              )}
              {showMeta && (
                <td className="py-2 pr-3 tabular-nums text-slate-500">
                  {secs(r.avgTimeMs)}
                </td>
              )}
              {showMeta && (
                <td className="py-2 pr-3 tabular-nums text-slate-500">
                  {r.avgDifficulty == null ? "—" : r.avgDifficulty.toFixed(1)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {children}
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {children}
    </p>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
    </div>
  );
}

/** Imported work remains reachable even if native analytics is empty or fails. */
export default function AnalyticsStage(props: AnalyticsStageProps) {
  return (
    <div className="space-y-6">
      <NativeAnalyticsStage {...props} />
      <ImportedMetricsPanel variant="light" />
    </div>
  );
}
