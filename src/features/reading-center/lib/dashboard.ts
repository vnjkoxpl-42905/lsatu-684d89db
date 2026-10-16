import type { ActivityAssignmentSummary, SectionGradeStub } from "@/features/activity-centre/api/types";
import type { Passage, Progress, ReadingSession } from "./types";
import { effectiveWpm } from "./timing";
import { RC_RRC_PATH, rcReaderPath } from "./routes";

export type DashboardPassage = Pick<Passage, "id" | "slug" | "title">;

export interface RecentReadingActivity {
  id: string;
  title: string;
  activity: "LR Recall" | "Speed Reading";
  date: string;
  action: "Resume" | "Open results" | "Read again";
  to: string;
}

const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const timestamp = (value: string | null | undefined) => value ? Date.parse(value) || 0 : 0;

/** The existing LR reports store both fractional and whole-percent coverage. */
export function recallCoverage(grade: SectionGradeStub): number | null {
  const value = grade.section?.mean_coverage;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(Math.min(100, Math.max(0, value <= 1 ? value * 100 : value)));
}

export function readingDashboard(
  userId: string,
  assignments: ActivityAssignmentSummary[],
  grades: SectionGradeStub[],
  sessions: ReadingSession[],
  passages: DashboardPassage[],
  progress: Progress[],
) {
  const ownSections = assignments.filter(a => a.student_id === userId && a.mode === "section" && !a.revoked_at);
  const ownedIds = new Set(ownSections.map(a => a.id));
  // Admin RLS can see other students' reports. Only reports of this account's
  // own section assignments may contribute, even if a caller supplies more.
  const uniqueGrades = new Map<string, SectionGradeStub>();
  for (const grade of grades) {
    if (ownedIds.has(grade.assignment_id)) {
      const key = `${grade.assignment_id}:${grade.attempt_no}`;
      const previous = uniqueGrades.get(key);
      if (!previous || timestamp(previous.graded_at) < timestamp(grade.graded_at)) uniqueGrades.set(key, grade);
    }
  }
  const runs = [...uniqueGrades.values()].sort((a, b) => timestamp(a.graded_at) - timestamp(b.graded_at));
  const uniqueSessions = [...new Map(sessions.map(s => [s.id, s])).values()];
  const availablePassages = new Map(passages.map(p => [p.id, p]));
  const recent: RecentReadingActivity[] = ownSections
    .filter(a => a.status === "in_progress" || a.status === "completed")
    .map(a => ({
      id: `lr-${a.id}`, title: a.source_section || a.title, activity: "LR Recall",
      date: a.completed_at || a.started_at || a.created_at,
      action: a.status === "completed" ? "Open results" : "Resume",
      to: `${RC_RRC_PATH}/attempt/${encodeURIComponent(a.id)}`,
    }));
  for (const row of progress) {
    const passage = availablePassages.get(row.passage_id);
    if (!passage || row.hidden_from_recent || (!row.completed_at && row.word_index <= 0)) continue;
    recent.push({ id: `speed-${row.passage_id}`, title: passage.title, activity: "Speed Reading",
      date: row.last_opened_at, action: row.completed_at ? "Read again" : "Resume", to: rcReaderPath(passage.slug) });
  }
  return {
    completedLr: ownSections.filter(a => a.status === "completed").length,
    completedPassages: new Set(progress.filter(p => p.completed_at).map(p => p.passage_id)).size,
    practiceSeconds: runs.reduce((n, r) => n + positive(r.section?.total_seconds), 0)
      + uniqueSessions.reduce((n, s) => n + positive(s.active_ms) / 1000, 0),
    recent: recent.sort((a, b) => timestamp(b.date) - timestamp(a.date)).slice(0, 6),
    recallTrend: runs.filter(r => recallCoverage(r) !== null).slice(-10).map(r => ({
      label: r.source_section || "Section", date: r.graded_at, value: recallCoverage(r)!,
    })),
    speedTrend: uniqueSessions.filter(s => s.active_ms > 0 && s.words_read > 0)
      .sort((a, b) => timestamp(a.ended_at) - timestamp(b.ended_at)).slice(-10)
      .map(s => ({ label: availablePassages.get(s.passage_id)?.title || "Reading session", date: s.ended_at, value: effectiveWpm(s.words_read, s.active_ms) })),
  };
}

export function recordedTime(seconds: number): string {
  if (seconds <= 0) return "0 min";
  if (seconds < 60) return "<1 min";
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
