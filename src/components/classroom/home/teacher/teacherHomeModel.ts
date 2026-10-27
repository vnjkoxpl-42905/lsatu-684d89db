/**
 * The teaching desk model: what Joshua's Home states, built only from rows
 * that exist. Three regions, each with its own loading and error state so a
 * failed roster read never turns into "no students" and a failed inbox read
 * never turns into "nothing unread".
 *
 * A region that loaded once and then failed to refresh keeps what it had and
 * says so (`refreshFailed`), so an old empty answer is never presented as a
 * current one.
 *
 * Nothing here comes from the teacher's own assignment record. An admin
 * account can hold assignments left over from verification runs; they are
 * not the teacher's work and this model has no field that could carry them.
 */

import type { Conversation } from "@/hooks/useInbox";
import { localDayISO } from "@/lib/localDate";

export type RegionState = "loading" | "error" | "ready";

export interface TeacherThreadRow {
  id: string;
  name: string;
  initial: string;
  /** The newest unread message FROM the student, never the teacher's own reply. */
  snippet: string;
  timeLabel: string;
  /** Sort key: when that unread message arrived. */
  receivedAt: string;
  hasAttachments: boolean;
  route: string;
}

export interface TeacherStudentRow {
  id: string;
  name: string;
  activityLabel: string;
  route: string;
}

export interface TeacherSessionRow {
  id: string;
  name: string;
  dayLabel: string;
  timeLabel: string;
  durationLabel: string | null;
  route: string;
  /** Original timestamp retained for the seven-day strip. */
  scheduledAt?: string;
}

export interface TeacherHomeModel {
  greeting: string;
  displayName: string;
  dateline: string;
  /** Unread conversations. `total` is the canonical count every badge shows. */
  unread: { state: RegionState; total: number | null; rows: TeacherThreadRow[]; refreshFailed?: boolean };
  roster: {
    state: RegionState;
    total: number | null;
    recent: TeacherStudentRow[];
    /** Every fetched student, for the name filter. */
    all?: TeacherStudentRow[];
    refreshFailed?: boolean;
  };
  sessions: { state: RegionState; rows: TeacherSessionRow[]; refreshFailed?: boolean };
}

export interface RosterInput {
  class_id: string;
  display_name: string | null;
  last_seen_at: string | null;
  role: string;
}

export interface SessionInput {
  id: string;
  student_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
}

const SHOWN_THREADS = 6;
const SHOWN_STUDENTS = 5;

function clockLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(date)
    .replace(/\s?AM$/, " am")
    .replace(/\s?PM$/, " pm");
}

/** "9:40 am" today, "Yesterday", then "Oct 12". */
export function threadTimeLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = localDayISO(date);
  if (day === localDayISO(now)) return clockLabel(date);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === localDayISO(yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function sessionDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const day = localDayISO(date);
  if (day === localDayISO(now)) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (day === localDayISO(tomorrow)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

export function activityLabel(lastSeenAt: string | null, now: Date = new Date()): string {
  if (!lastSeenAt) return "No activity recorded";
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return "No activity recorded";
  if (localDayISO(date) === localDayISO(now)) return "Active today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (localDayISO(date) === localDayISO(yesterday)) return "Active yesterday";
  return `Last active ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}`;
}

/**
 * The unread threads, newest unread first, named after the other person.
 *
 * Built from each thread's newest unread INCOMING message. A reply the teacher
 * sent afterwards does not change the snippet, the time or the order: what is
 * waiting is the student's message, not the answer.
 */
export function buildUnreadThreads(
  conversations: Conversation[],
  viewerId: string | null,
  now: Date = new Date(),
): TeacherThreadRow[] {
  return conversations
    .filter((thread) => thread.unread)
    .map((thread) => {
      const waiting = thread.latest_unread_message ?? null;
      const receivedAt = waiting?.created_at ?? thread.latest_unread_at ?? thread.last_message_at;
      const other =
        thread.participants.find((p) => p.user_id === waiting?.sender_id) ??
        thread.participants.find((p) => p.user_id !== viewerId && !p.is_admin) ??
        thread.participants.find((p) => p.user_id !== viewerId);
      const name = other?.display_name?.trim() || thread.subject?.trim() || "Student";
      return {
        id: thread.id,
        name,
        initial: name.slice(0, 1).toUpperCase(),
        snippet: waiting?.body?.trim() || (thread.hasAttachments ? "Sent an attachment" : "New message"),
        timeLabel: threadTimeLabel(receivedAt, now),
        receivedAt,
        hasAttachments: thread.hasAttachments,
        // The teacher inbox room keys platform threads as `platform:<id>`.
        route: `/teacher/inbox/platform:${thread.id}`,
      };
    })
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, SHOWN_THREADS);
}

export function buildRoster(rows: RosterInput[], now: Date = new Date()) {
  const students = rows
    .filter((row) => row.role !== "admin")
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""))
    .map((row) => ({
      id: row.class_id,
      name: row.display_name?.trim() || "Unnamed student",
      activityLabel: activityLabel(row.last_seen_at, now),
      route: `/teacher/students/${encodeURIComponent(row.class_id)}`,
    }));
  return { total: students.length, recent: students.slice(0, SHOWN_STUDENTS), all: students };
}

/** Case- and accent-insensitive name match over every fetched student. */
export function filterStudents(students: TeacherStudentRow[], query: string): TeacherStudentRow[] {
  const fold = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const needle = fold(query.trim());
  if (!needle) return students;
  return students.filter((student) => fold(student.name).includes(needle));
}

export function buildSessions(
  sessions: SessionInput[],
  names: Map<string, string>,
  now: Date = new Date(),
): TeacherSessionRow[] {
  return sessions.map((session) => {
    const start = new Date(session.scheduled_at);
    return {
      id: session.id,
      name: names.get(session.student_id) ?? "Student",
      dayLabel: sessionDayLabel(session.scheduled_at, now),
      timeLabel: clockLabel(start),
      durationLabel: session.duration_minutes ? `${session.duration_minutes} min` : null,
      route: `/teacher/students/${encodeURIComponent(session.student_id)}/schedule`,
      scheduledAt: session.scheduled_at,
    };
  });
}

const ONES = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** The one line under the greeting, stated only from what loaded. */
export function teacherLede(unread: TeacherHomeModel["unread"]): string {
  if (unread.state === "loading") return "Checking your inbox.";
  if (unread.state === "error" || unread.total === null) return "Your inbox did not load. Retry below.";
  const count = unread.total < ONES.length ? ONES[unread.total] : String(unread.total);
  if (unread.refreshFailed) {
    // An old answer, said as one.
    if (unread.total === 0) return "Nothing was unread when your inbox last loaded.";
    return unread.total === 1
      ? "One conversation was unread when your inbox last loaded."
      : `${count} conversations were unread when your inbox last loaded.`;
  }
  if (unread.total === 0) return "Every conversation is read.";
  return unread.total === 1 ? "One conversation is unread." : `${count} conversations are unread.`;
}
