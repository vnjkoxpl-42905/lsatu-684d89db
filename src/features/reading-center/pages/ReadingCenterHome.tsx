import { ArrowRight, Clock3, Gauge, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useDashboardPassages, useDashboardProgress, useDashboardSessions, useRecallDashboard } from "../hooks/useRecallDashboard";
import { readingDashboard, recordedTime } from "../lib/dashboard";
import { RC_LIBRARY_PATH, RC_PROFILE_PATH, RC_RRC_PATH } from "../lib/routes";
import { RcTrainingProgress } from "../components/RcTrainingProgress";

const panel = { background: "var(--rc-card)", borderColor: "var(--rc-outline-2)" };
const muted = { color: "var(--rc-text-2)" };
const actionClass = "inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4";
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved activity" : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

function Trend({ title, description, unit, points, loading, failed, empty, to, retry }: {
  title: string; description: string; unit: string; points: { label: string; date: string; value: number }[];
  loading: boolean; failed: boolean; empty: string; to: string; retry: () => void;
}) {
  return <section data-motion-reveal data-motion-ready={loading ? "false" : "true"} className="min-w-0 rounded-2xl border p-5 sm:p-6" style={panel} aria-label={`${title} progress`}>
    <div className="flex flex-wrap items-center justify-between gap-x-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link to={to} className={actionClass}>View activity <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
    <p className="text-sm leading-6" style={muted}>{description}</p>
    {loading ? <p role="status" className="flex min-h-44 items-center text-sm" style={muted}>Loading your progress…</p>
      : failed ? <div className="flex min-h-44 flex-col justify-center text-sm" style={muted}><p role="alert">This progress could not load. Your saved work has not changed.</p><button type="button" className={`${actionClass} mt-2 self-start`} onClick={retry}>Try again</button></div>
        : !points.length ? <p className="flex min-h-44 items-center text-sm leading-6" style={muted}>{empty}</p>
          : <>
            <div className="mt-5 h-44 min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points.map((p, index) => ({ ...p, run: index + 1 }))} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                  <CartesianGrid vertical={false} stroke="var(--rc-outline-2)" />
                  <XAxis dataKey="run" tick={{ fontSize: 11, fill: "var(--rc-text-2)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={unit === "%" ? [0, 100] : [0, "auto"]} tick={{ fontSize: 11, fill: "var(--rc-text-2)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--rc-card)", borderColor: "var(--rc-outline-2)", color: "var(--rc-text)" }} labelFormatter={(_value, payload) => payload?.[0]?.payload?.label || "Run"} formatter={(value: number) => [`${value}${unit === "%" ? "%" : " WPM"}`, unit === "%" ? "Recall coverage" : "Measured pace"]} />
                  <Line type="linear" dataKey="value" stroke="var(--rc-accent, #494387)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs" style={muted}>Latest {points.length} {unit === "%" ? "graded runs" : "recorded sessions"}, oldest to newest · {unit === "%" ? "coverage (%)" : "words per minute"}</p>
            <ol className="sr-only">{points.map((point, index) => <li key={index}>{point.label}, {dateLabel(point.date)}: {point.value}{unit === "%" ? "% recall coverage" : " words per minute"}</li>)}</ol>
          </>}
  </section>;
}

export default function ReadingCenterHome() {
  const { user } = useAuth();
  const recall = useRecallDashboard();
  const sessions = useDashboardSessions();
  const passages = useDashboardPassages();
  const progress = useDashboardProgress();
  const dashboard = readingDashboard(user?.id ?? "", recall.data?.assignments ?? [], recall.data?.grades ?? [], sessions.data ?? [], passages.data ?? [], progress.data ?? []);
  const recentLoading = recall.isLoading || passages.isLoading || progress.isLoading;
  const recentFailed = recall.isError || passages.isError || progress.isError;
  const stats = [
    { label: "LR drills completed", value: recall.isLoading ? "…" : recall.isError ? "Unavailable" : dashboard.completedLr, icon: Mic, detail: "Completed LR sections" },
    { label: "Passages completed", value: progress.isLoading ? "…" : progress.isError ? "Unavailable" : dashboard.completedPassages, icon: Gauge, detail: "Speed Reading collection" },
    { label: "Recorded practice", value: recall.isLoading || sessions.isLoading ? "…" : recall.isError || sessions.isError ? "Unavailable" : recordedTime(dashboard.practiceSeconds), icon: Clock3, detail: "Graded LR runs + active reading time" },
  ];

  return <main data-motion-group className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-10" style={{ color: "var(--rc-text)" }}>
    <h1 data-motion-item className="text-3xl font-semibold tracking-tight">Your reading dashboard</h1>
    <p data-motion-item className="mt-2 max-w-2xl text-sm leading-7" style={muted}>Pick up your practice and see how each activity is progressing.</p>
    <div data-motion-item data-motion-ready={recall.isLoading || sessions.isLoading || progress.isLoading ? "false" : "true"} className="mt-6 grid gap-3 sm:grid-cols-3">
      {stats.map(({ label, value, icon: StatIcon, detail }) => <section key={label} className="min-w-0 rounded-2xl border p-5" style={panel} aria-label={label}>
        <div className="flex items-center gap-2 text-sm" style={muted}><StatIcon size={17} aria-hidden="true" />{label}</div>
        <p className="mt-3 break-words text-3xl font-semibold tabular-nums">{value}</p>
        <p className="mt-2 text-xs leading-5" style={muted}>{detail}</p>
      </section>)}
    </div>
    <p className="mt-3 text-xs leading-5" style={muted}>All-time totals. Practice time excludes pauses and LR runs that have not been graded.</p>
    {(recall.isError || sessions.isError || progress.isError) && <button type="button" className={actionClass} onClick={() => { void recall.refetch(); void sessions.refetch(); void progress.refetch(); }}>Retry unavailable totals</button>}
    <div data-motion-group className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
      <Trend title="LR Training" description="How much of the original detail survived in your recall." unit="%" points={dashboard.recallTrend} loading={recall.isLoading} failed={recall.isError} empty="No graded LR runs yet. Complete a section to start your recall graph." to={RC_RRC_PATH} retry={() => { void recall.refetch(); }} />
      <Trend title="Speed Reading" description="Recorded pace, calculated from words read and active reading time." unit="WPM" points={dashboard.speedTrend} loading={sessions.isLoading} failed={sessions.isError} empty="No recorded reading sessions yet. Read a passage to start your pace graph." to={RC_LIBRARY_PATH} retry={() => { void sessions.refetch(); }} />
    </div>
    <div className="mt-6"><RcTrainingProgress compact /></div>
    <section data-motion-reveal data-motion-ready={recentLoading ? "false" : "true"} className="mt-6 rounded-2xl border p-5 sm:p-6" style={panel} aria-label="Recent practice">
      <h2 className="text-lg font-semibold">Recent practice</h2>
      <p className="mt-1 text-sm" style={muted}>Resume a drill, open its results or return to a passage.</p>
      {recentLoading && <p role="status" className="py-4 text-sm" style={muted}>Loading your recent practice…</p>}
      {recentFailed && <div className="py-4 text-sm" style={muted}><p role="alert">Some recent practice could not load. Available work is shown below.</p><button type="button" className={actionClass} onClick={() => { void recall.refetch(); void passages.refetch(); void progress.refetch(); }}>Retry recent practice</button></div>}
      {dashboard.recent.length ? <ul className="mt-4 divide-y">{dashboard.recent.map(item => <li key={item.id} className="py-3" style={{ borderColor: "var(--rc-outline-2)" }}>
            <Link to={item.to} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
              <span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs" style={muted}>{item.activity} · {dateLabel(item.date)}</span></span>
              <span className="inline-flex items-center gap-2 text-sm font-medium">{item.action}<ArrowRight size={16} aria-hidden="true" /></span>
            </Link>
          </li>)}</ul> : !recentLoading && !recentFailed ? <p className="py-8 text-sm leading-7" style={muted}>Your practice will appear here after you start an LR section or read a passage.</p> : null}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <Link to={RC_RRC_PATH} className={actionClass}>Open LR Training <ArrowRight size={16} aria-hidden="true" /></Link>
        <Link to={RC_LIBRARY_PATH} className={actionClass}>Open Speed Reading <ArrowRight size={16} aria-hidden="true" /></Link>
        <Link to={RC_PROFILE_PATH} className={actionClass}>Reading progress <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  </main>;
}
