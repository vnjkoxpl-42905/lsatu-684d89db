import type { ReadingSession } from "./types";

/** A retry may confirm only the same user's exact visit, never an unrelated ID collision. */
export function matchesRecordedSession(row: Record<string, unknown> | null, session: ReadingSession, userId: string): boolean {
  if (!row || row.id !== session.id || row.user_id !== userId || row.passage_id !== session.passage_id || row.reading_mode !== session.reading_mode) return false;
  for (const field of ["wpm", "words_read", "active_ms", "paused_ms"] as const) if (Number(row[field]) !== session[field]) return false;
  for (const field of ["started_at", "ended_at"] as const) if (new Date(String(row[field])).getTime() !== new Date(session[field]).getTime()) return false;
  return true;
}
