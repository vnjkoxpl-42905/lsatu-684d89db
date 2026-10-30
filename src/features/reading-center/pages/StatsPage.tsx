import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GoalDialog } from "../components/GoalDialog";
import { usePreferences, useSavePreferences, useSessions } from "../hooks/useReadingCenterData";
import { DEFAULT_PREFERENCES, STAT_PERIODS } from "../lib/constants";
import { effectiveWpm } from "../lib/timing";
import { RC_LIBRARY_PATH } from "../lib/routes";
import type { ReadingSession } from "../lib/types";

type Metric = "speed" | "focus" | "time";
const GAUGE_MAX = 2000;
const INK = "#11181c";
const TRACK = "rgba(17,24,28,0.12)";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

const dayKey = (iso: string): string => iso.slice(0, 10);
const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function Gauge({ label, value }: { label: string; value: number }): React.ReactElement {
  const filled = Math.min(GAUGE_MAX, Math.max(0, value));
  const data = [{ v: filled }, { v: GAUGE_MAX - filled }];
  return (
    <div className="flex flex-col items-center">
      <div className="h-28 w-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="v"
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="100%"
              innerRadius="70%"
              outerRadius="100%"
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={INK} />
              <Cell fill={TRACK} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs uppercase tracking-[0.16em] text-black/50">{label}</div>
    </div>
  );
}

export default function StatsPage(): React.ReactElement {
  const [period, setPeriod] = useState<string>("30d");
  const [metric, setMetric] = useState<Metric>("speed");
  const [goalOpen, setGoalOpen] = useState(false);

  const sinceIso = useMemo(() => {
    const ms = STAT_PERIODS.find((p) => p.value === period)?.ms ?? STAT_PERIODS[3].ms;
    return new Date(Date.now() - ms).toISOString();
  }, [period]);

  const sessionsQuery = useSessions(sinceIso);
  const prefs = usePreferences().data ?? DEFAULT_PREFERENCES;
  const savePrefs = useSavePreferences();
  const sessions: ReadingSession[] = useMemo(
    () => [...(sessionsQuery.data ?? [])].sort((a, b) => a.ended_at.localeCompare(b.ended_at)),
    [sessionsQuery.data],
  );

  const currentSpeed = median(sessions.slice(-5).map((s) => effectiveWpm(s.words_read, s.active_ms)));

  const chartData = useMemo(() => {
    if (metric === "speed") {
      return sessions.map((s) => ({ x: shortDate(s.ended_at), y: effectiveWpm(s.words_read, s.active_ms) }));
    }
    const byDay = new Map<string, ReadingSession[]>();
    for (const s of sessions) {
      const k = dayKey(s.ended_at);
      byDay.set(k, [...(byDay.get(k) ?? []), s]);
    }
    return Array.from(byDay.entries()).map(([day, list]) => {
      if (metric === "focus") {
        const pcts = list.map((s) => {
          const total = s.active_ms + s.paused_ms;
          return total > 0 ? (s.active_ms / total) * 100 : 0;
        });
        return { x: shortDate(day), y: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) };
      }
      return { x: shortDate(day), y: Math.round(list.reduce((a, s) => a + s.active_ms, 0) / 60000) };
    });
  }, [sessions, metric]);

  const yLabel = metric === "speed" ? "WPM" : metric === "focus" ? "%" : "min";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-6">
      <Link to={RC_LIBRARY_PATH} className="inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-black">
        <ArrowLeft className="h-4 w-4" /> Reading Center
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl tracking-tight">Your reading</h1>
        <div className="ml-auto flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-36 border-black/15 bg-white/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STAT_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setGoalOpen(true)}
            className="h-9 border border-black bg-black px-3 text-sm font-medium text-white hover:bg-black/85"
          >
            Set goal
          </button>
        </div>
      </div>

      <section className="mt-6 border border-black/12 bg-white/25 p-5">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/45">Vital stats</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-10">
          <Gauge label="Current Speed" value={currentSpeed} />
          <Gauge label="Target Speed" value={prefs.goal_wpm} />
        </div>
      </section>

      <section className="mt-5 border border-black/12 bg-white/25 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/45">Trend</h2>
          <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
            <SelectTrigger className="h-9 w-44 border-black/15 bg-white/40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="speed">Reading Speed</SelectItem>
              <SelectItem value="focus">Reading Focus</SelectItem>
              <SelectItem value="time">Training Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sessionsQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center text-sm text-black/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-1 text-center">
            <BarChart3 className="h-8 w-8 text-black/30" strokeWidth={1.25} />
            <div className="font-semibold">Not enough data yet</div>
            <p className="text-sm text-black/50">Read a few passages and come back.</p>
          </div>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              {metric === "speed" ? (
                <LineChart data={chartData}>
                  <CartesianGrid stroke={TRACK} vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip formatter={(v: number) => [`${v} ${yLabel}`, "Speed"]} />
                  <Line type="monotone" dataKey="y" stroke={INK} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid stroke={TRACK} vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={44} />
                  <Tooltip formatter={(v: number) => [`${v} ${yLabel}`, metric === "focus" ? "Focus" : "Time"]} />
                  <Bar dataKey="y" fill={INK} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <GoalDialog
        open={goalOpen}
        onOpenChange={setGoalOpen}
        value={prefs.goal_wpm}
        currentSpeed={currentSpeed}
        onSet={(goal) => savePrefs.mutate({ goal_wpm: goal })}
      />
    </div>
  );
}
