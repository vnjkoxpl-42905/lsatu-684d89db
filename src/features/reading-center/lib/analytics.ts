import type { ReadingSession } from "./types";

export type ReadingMetric = "speed" | "focus" | "time";

/** Counts are playback/page estimates recorded by the reader, not an ability assessment. */
export function summarizeReading(sessions: ReadingSession[]) {
  const valid = sessions.filter((session) => Number.isFinite(session.active_ms) && session.active_ms > 0 && Number.isFinite(session.words_read) && session.words_read >= 0);
  const activeMs = valid.reduce((total, session) => total + session.active_ms, 0);
  const pausedMs = valid.reduce((total, session) => total + (Number.isFinite(session.paused_ms) ? Math.max(0, session.paused_ms) : 0), 0);
  const words = valid.reduce((total, session) => total + session.words_read, 0);
  return {
    visits: valid.length,
    activeMs,
    pausedMs,
    words,
    paceWpm: activeMs > 0 && words > 0 ? Math.round(words * 60_000 / activeMs) : null,
    activeShare: activeMs > 0 ? Math.round(activeMs / (activeMs + pausedMs) * 100) : null,
  };
}

export function readingSeries(sessions: ReadingSession[], metric: ReadingMetric): { x: string; y: number }[] {
  const days = new Map<string, { date: Date; sessions: ReadingSession[] }>();
  for (const session of sessions) {
    const date = new Date(session.ended_at);
    if (!Number.isFinite(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const group = days.get(key) ?? { date, sessions: [] };
    group.sessions.push(session);
    days.set(key, group);
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).flatMap(([, day]) => {
    const totals = summarizeReading(day.sessions);
    if (!totals.visits) return [];
    const y = metric === "time" ? Math.round(totals.activeMs / 600) / 100 : metric === "focus" ? totals.activeShare : totals.paceWpm;
    return y == null ? [] : [{ x: day.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), y }];
  });
}
