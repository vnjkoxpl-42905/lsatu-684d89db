// Safe class_id -> auth.users.id resolver for the post-session intelligence
// pipeline (Phase 1A).
//
// Background: `profiles.class_id` IS the `auth.users.id` — the same UUID stored
// as `text` (confirmed in `supabase/functions/admin-manage-users/index.ts`,
// where `emailMap.get(p.class_id)` is keyed by `auth.users.id`). Every storage
// and delivery table the pipeline writes to (`student_context.student_id`,
// `student_sessions.student_id`, `ai_ta_drafts.student_id`,
// `notifications.user_id`, `conversation_participants.user_id`) keys off
// `auth.users(id)`.
//
// Rather than blindly casting `class_id` into a uuid FK column, the pipeline
// resolves it through this helper and FAILS CLOSED: a malformed UUID or a
// `class_id` with no live auth user (the orphan / `email === 'unknown'` case
// that `useHubStudents` already logs) returns a failure, and the caller must
// NOT write — it routes the ingestion to the resolution queue instead.
//
// This module is intentionally pure and dependency-free so it can be unit
// tested and shared between the client (roster-backed check) and the
// `ingest-session-note` edge function (authoritative `auth.users` check via the
// service role).

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True only for a canonically-formatted RFC 4122 UUID (v1–v5). */
export function isWellFormedUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

/** Why a resolve attempt failed. Mirrors `session_ingestions.match_reason`. */
export type ResolveFailureReason =
  | "missing_class_id"
  | "malformed_uuid"
  | "not_in_roster"
  | "not_a_student"
  | "no_classroom_access"
  | "orphan_auth_id";

export type ResolveResult =
  | { ok: true; authId: string }
  | { ok: false; reason: ResolveFailureReason };

/**
 * Minimal shape this resolver needs off a roster row (`HubStudentRow`). Kept
 * structural so callers don't have to import the full hook type.
 */
export interface RosterMember {
  class_id: string;
  role: string;
  email: string | null;
  has_classroom_access: boolean;
}

/**
 * Client-side resolve against the already-loaded admin roster
 * (`useHubStudents` -> `HubStudentRow[]`). This does NOT touch the database; it
 * is a format + membership + delivery-gate guard. The authoritative
 * `auth.users` existence check lives in the `ingest-session-note` edge function
 * (which has the service role to call `admin.auth.admin.getUserById`).
 *
 * Returns the resolved `auth.users.id` (the same UUID as `class_id`) only when
 * the `class_id` is well-formed AND maps to a roster member that is a student
 * with classroom access. Anything else fails closed.
 */
export function resolveStudentAuthIdFromRoster(
  classId: string | null | undefined,
  roster: readonly RosterMember[],
): ResolveResult {
  const trimmed = (classId ?? "").trim();
  if (!trimmed) return { ok: false, reason: "missing_class_id" };
  if (!isWellFormedUuid(trimmed)) return { ok: false, reason: "malformed_uuid" };

  const member = roster.find((r) => r.class_id?.trim() === trimmed);
  if (!member) return { ok: false, reason: "not_in_roster" };

  // `email === 'unknown'` is the orphan marker emitted by admin-manage-users
  // when a profile's class_id has no matching auth.users row.
  if (!member.email || member.email === "unknown") {
    return { ok: false, reason: "orphan_auth_id" };
  }
  if (member.role !== "student") return { ok: false, reason: "not_a_student" };
  if (!member.has_classroom_access) {
    return { ok: false, reason: "no_classroom_access" };
  }

  return { ok: true, authId: trimmed };
}
