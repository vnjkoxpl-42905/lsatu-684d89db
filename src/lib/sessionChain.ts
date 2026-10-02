import type { ClassroomItem, ClassroomItemType } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';

/**
 * Session chain: an explicit link from an existing classroom item to one
 * one-to-one appointment, under one of three phases.
 *
 * The link lives in `classroom_items.metadata_json.session_chain`. It never
 * comes from a title, a nearby date, a name or an email: an item without the
 * member is unlinked, however close it sits to an appointment. `source_table`
 * and `source_id` keep meaning what the item was made from, and are not read
 * or written here.
 *
 * Everything in this module is pure. Student and teacher views both go
 * through `projectSessionChain`, so they cannot disagree about which record
 * belongs to which appointment; they differ only in which records each
 * audience is shown.
 */

export const SESSION_CHAIN_KEY = 'session_chain';
export const SESSION_CHAIN_VERSION = 1;

export const BOOKING_SOURCES = ['redemption', 'single_session'] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const SESSION_PHASES = ['preparation', 'recap', 'follow_up'] as const;
export type SessionPhase = (typeof SESSION_PHASES)[number];

export const PHASE_LABEL: Record<SessionPhase, string> = {
  preparation: 'Preparation',
  recap: 'Recap',
  follow_up: 'Follow-up',
};

export const PHASE_EMPTY: Record<SessionPhase, string> = {
  preparation: 'No preparation linked',
  recap: 'No recap linked',
  follow_up: 'No follow-up linked',
};

export const PHASE_ACTION: Record<SessionPhase, string> = {
  preparation: 'Open preparation',
  recap: 'Open recap',
  follow_up: 'Open follow-up',
};

export interface SessionChainLink {
  version: 1;
  booking_source: BookingSource;
  booking_id: string;
  phase: SessionPhase;
}

/** Both booking tables key on uuid primary keys. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isBookingSource(value: unknown): value is BookingSource {
  return typeof value === 'string' && (BOOKING_SOURCES as readonly string[]).includes(value);
}

export function isSessionPhase(value: unknown): value is SessionPhase {
  return typeof value === 'string' && (SESSION_PHASES as readonly string[]).includes(value);
}

export function isValidBookingId(source: BookingSource, id: unknown): id is string {
  // Both families currently use uuid ids. Kept per source so a future family
  // with a different id contract changes one branch, not every caller.
  return typeof id === 'string' && (source === 'redemption' || source === 'single_session') && UUID.test(id);
}

// ── Booking identity ─────────────────────────────────────────────────────────

export interface BookingIdentity {
  source: BookingSource;
  id: string;
}

/** Map key for a typed booking pair. Never parse a display id for ownership. */
export function bookingKey(identity: BookingIdentity): string {
  return `${identity.source}:${identity.id}`;
}

/** The display id the calendar adapter already uses for booking entries. */
export function bookingDisplayId(identity: BookingIdentity): string {
  return `booking-${identity.source}-${identity.id}`;
}

/**
 * A booking that a trusted source returned as belonging to the subject. Built
 * only from the student's own booking DTO or the admin's verified-account
 * reads, never from possible email matches.
 */
export interface SessionBooking extends BookingIdentity {
  startAt: string;
  endAt: string | null;
  /** Source booking status: booked, cancelled, canceled, failed, … */
  status: string;
  meetUrl: string | null;
}

export function isCanceledBooking(booking: Pick<SessionBooking, 'status'>): boolean {
  return booking.status === 'cancelled' || booking.status === 'canceled';
}

/**
 * Calendar state only. An elapsed appointment says nothing about whether any
 * linked work was done, so callers must not feed this into a work status.
 */
export function bookingStateLabel(booking: SessionBooking, now = new Date()): string {
  if (isCanceledBooking(booking)) return 'Canceled';
  if (booking.status !== 'booked') return booking.status.replace(/_/g, ' ');
  const end = new Date(booking.endAt ?? booking.startAt);
  return end.getTime() < now.getTime() ? 'Session time has passed' : 'Booked';
}

/** New links may only point at an appointment that is still booked. */
export function canLinkToBooking(booking: SessionBooking): boolean {
  return booking.status === 'booked';
}

/** Normalise one raw booking row. Rows that fail validation are dropped. */
export function toSessionBooking(raw: {
  source?: unknown;
  id?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  status?: unknown;
  meet_url?: unknown;
}): SessionBooking | null {
  if (!isBookingSource(raw.source) || !isValidBookingId(raw.source, raw.id)) return null;
  if (typeof raw.start_at !== 'string' || Number.isNaN(new Date(raw.start_at).getTime())) return null;
  return {
    source: raw.source,
    id: raw.id,
    startAt: raw.start_at,
    endAt: typeof raw.end_at === 'string' ? raw.end_at : null,
    status: typeof raw.status === 'string' ? raw.status : 'unknown',
    meetUrl: typeof raw.meet_url === 'string' ? raw.meet_url : null,
  };
}

// ── Metadata contract ────────────────────────────────────────────────────────

export type ParsedSessionChain =
  | { kind: 'none' }
  | { kind: 'invalid'; reason: 'malformed' | 'unknown_version' | 'unknown_source' | 'bad_id' | 'bad_phase' }
  | { kind: 'valid'; link: SessionChainLink };

export function parseSessionChain(metadata: unknown): ParsedSessionChain {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return { kind: 'none' };
  if (!(SESSION_CHAIN_KEY in metadata)) return { kind: 'none' };
  const raw = (metadata as Record<string, unknown>)[SESSION_CHAIN_KEY];
  if (raw === null || raw === undefined) return { kind: 'none' };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { kind: 'invalid', reason: 'malformed' };
  const value = raw as Record<string, unknown>;
  if (value.version !== SESSION_CHAIN_VERSION) return { kind: 'invalid', reason: 'unknown_version' };
  if (!isBookingSource(value.booking_source)) return { kind: 'invalid', reason: 'unknown_source' };
  if (!isValidBookingId(value.booking_source, value.booking_id)) return { kind: 'invalid', reason: 'bad_id' };
  if (!isSessionPhase(value.phase)) return { kind: 'invalid', reason: 'bad_phase' };
  return {
    kind: 'valid',
    link: {
      version: 1,
      booking_source: value.booking_source,
      booking_id: value.booking_id,
      phase: value.phase,
    },
  };
}

export function sameLink(a: SessionChainLink | null, b: SessionChainLink | null): boolean {
  if (!a || !b) return a === b;
  return a.booking_source === b.booking_source && a.booking_id === b.booking_id && a.phase === b.phase;
}

/** The link stored on an item, or null when there is none or it is invalid. */
export function linkOf(item: Pick<ClassroomItem, 'metadata_json'>): SessionChainLink | null {
  const parsed = parseSessionChain(item.metadata_json);
  return parsed.kind === 'valid' ? parsed.link : null;
}

/**
 * Next metadata object with only `session_chain` replaced or removed. Every
 * other key, nested values included, is carried over from `current` as is.
 * `current` must be the authoritative row just read, never a cached copy.
 */
export function withSessionChain(
  current: Record<string, unknown> | null | undefined,
  link: SessionChainLink | null,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(current ?? {}) };
  if (link) next[SESSION_CHAIN_KEY] = { ...link };
  else delete next[SESSION_CHAIN_KEY];
  return next;
}

export function makeLink(identity: BookingIdentity, phase: SessionPhase): SessionChainLink {
  return { version: 1, booking_source: identity.source, booking_id: identity.id, phase };
}

// ── Eligibility ──────────────────────────────────────────────────────────────

/** Item types that can stand as work before or after a session. */
const WORK_TYPES = new Set<ClassroomItemType>([
  'drill',
  'homework',
  'activity',
  'bootcamp_module',
  'practice_test',
  'note',
]);
/** Only a real recap can sit in the Recap group; a drill is never relabelled. */
const RECAP_TYPES = new Set<ClassroomItemType>(['session_recap', 'smartboard_recap']);

export function phaseAccepts(phase: SessionPhase, type: ClassroomItemType): boolean {
  return phase === 'recap' ? RECAP_TYPES.has(type) : WORK_TYPES.has(type);
}

/** Phases an item type may be linked under, in display order. */
export function phasesFor(type: ClassroomItemType): SessionPhase[] {
  return SESSION_PHASES.filter((phase) => phaseAccepts(phase, type));
}

/**
 * Mirrors the `classroom_items_student_select` policy: own row, visible,
 * unlocked (bootcamp modules are always listed), and additionally never a
 * draft or archived row. The server already enforces the first three for a
 * student; this keeps an admin previewing a student route, or a cache that
 * outlived a visibility change, from presenting more than the student sees.
 */
export function isStudentEligible(item: ClassroomItem, studentId: string, now = new Date()): boolean {
  if (item.student_id !== studentId) return false;
  if (!item.visible_to_student) return false;
  if (item.status === 'draft' || item.status === 'archived') return false;
  if (item.type === 'bootcamp_module') return true;
  if (!item.unlock_at) return true;
  const unlock = new Date(item.unlock_at).getTime();
  return !Number.isNaN(unlock) && unlock <= now.getTime();
}

/** Why a record is withheld from the student, for the teacher's label. */
export function teacherOnlyReason(item: ClassroomItem, now = new Date()): string | null {
  if (item.status === 'draft') return 'Draft';
  if (item.status === 'archived') return 'Archived';
  if (!item.visible_to_student) return 'Hidden from student';
  if (item.type !== 'bootcamp_module' && item.unlock_at && new Date(item.unlock_at).getTime() > now.getTime()) {
    return 'Locked until unlock date';
  }
  return null;
}

/** Items Joshua may pick in Link existing work for this student. */
export function isLinkCandidate(item: ClassroomItem, studentId: string): boolean {
  return item.student_id === studentId && phasesFor(item.type).length > 0 && item.status !== 'archived';
}

// ── Projection ───────────────────────────────────────────────────────────────

export type Audience = 'student' | 'teacher';

export interface LinkedRecord {
  item: ClassroomItem;
  phase: SessionPhase;
  route: string | null;
  /** Set in the teacher view when the student cannot see this record. */
  teacherOnly: string | null;
}

export type PhaseGroups = Record<SessionPhase, LinkedRecord[]>;

export interface AssociationIssue {
  itemId: string;
  title: string;
  problem: 'invalid_metadata' | 'appointment_unavailable' | 'phase_mismatch';
}

export interface SessionChainProjection {
  byBooking: Map<string, PhaseGroups>;
  /** Teacher only. Never populated for a student. */
  issues: AssociationIssue[];
}

export function emptyGroups(): PhaseGroups {
  return { preparation: [], recap: [], follow_up: [] };
}

function byCreatedThenId(a: LinkedRecord, b: LinkedRecord) {
  const t = Date.parse(a.item.created_at) - Date.parse(b.item.created_at);
  return t !== 0 && !Number.isNaN(t) ? t : a.item.id.localeCompare(b.item.id);
}

export function projectSessionChain(input: {
  items: ClassroomItem[];
  bookings: SessionBooking[];
  subjectId: string;
  audience: Audience;
  now?: Date;
}): SessionChainProjection {
  const { items, bookings, subjectId, audience } = input;
  const now = input.now ?? new Date();
  const owned = new Map(bookings.map((booking) => [bookingKey(booking), booking]));
  const byBooking = new Map<string, PhaseGroups>();
  const issues: AssociationIssue[] = [];
  const isTeacher = audience === 'teacher';

  for (const item of items) {
    // Foreign rows are dropped silently in both views: no title, no id.
    if (item.student_id !== subjectId) continue;
    const studentEligible = isStudentEligible(item, subjectId, now);
    if (!isTeacher && !studentEligible) continue;

    const parsed = parseSessionChain(item.metadata_json);
    if (parsed.kind === 'none') continue;
    if (parsed.kind === 'invalid') {
      if (isTeacher) issues.push({ itemId: item.id, title: item.title, problem: 'invalid_metadata' });
      continue;
    }
    const { link } = parsed;
    const key = bookingKey({ source: link.booking_source, id: link.booking_id });
    if (!owned.has(key)) {
      if (isTeacher) issues.push({ itemId: item.id, title: item.title, problem: 'appointment_unavailable' });
      continue;
    }
    if (!phaseAccepts(link.phase, item.type)) {
      if (isTeacher) issues.push({ itemId: item.id, title: item.title, problem: 'phase_mismatch' });
      continue;
    }
    const groups = byBooking.get(key) ?? emptyGroups();
    groups[link.phase].push({
      item,
      phase: link.phase,
      route: resolveItemRoute(item),
      teacherOnly: isTeacher && !studentEligible ? teacherOnlyReason(item, now) ?? 'Not visible to student' : null,
    });
    byBooking.set(key, groups);
  }

  for (const groups of byBooking.values()) {
    for (const phase of SESSION_PHASES) groups[phase].sort(byCreatedThenId);
  }
  return { byBooking, issues };
}

export function groupsFor(projection: SessionChainProjection, identity: BookingIdentity | null): PhaseGroups {
  if (!identity) return emptyGroups();
  return projection.byBooking.get(bookingKey(identity)) ?? emptyGroups();
}

// ── URL selection ────────────────────────────────────────────────────────────

export const SESSION_PARAM = 'session';

/** `v1.<source>.<id>` — versioned so a future format can be told apart. */
export function encodeSessionParam(identity: BookingIdentity): string {
  return `v1.${identity.source}.${identity.id}`;
}

export type DecodedSessionParam =
  | { kind: 'absent' }
  | { kind: 'invalid' }
  | { kind: 'valid'; identity: BookingIdentity };

export function decodeSessionParam(raw: string | null | undefined): DecodedSessionParam {
  if (raw === null || raw === undefined || raw === '') return { kind: 'absent' };
  const match = /^v1\.([a-z_]+)\.([^.]+)$/.exec(raw);
  if (!match) return { kind: 'invalid' };
  const [, source, id] = match;
  if (!isBookingSource(source) || !isValidBookingId(source, id)) return { kind: 'invalid' };
  return { kind: 'valid', identity: { source, id } };
}

/** Next query string with only the session selection changed. */
export function withSessionParam(params: URLSearchParams, identity: BookingIdentity | null): URLSearchParams {
  const next = new URLSearchParams(params);
  if (identity) next.set(SESSION_PARAM, encodeSessionParam(identity));
  else next.delete(SESSION_PARAM);
  return next;
}

/**
 * The typed booking pair behind a calendar booking entry, read from the
 * adapter's `booking_source` and `source_id`, never from its display id.
 */
export function identityFromBookingItem(item: Pick<ClassroomItem, 'source_id' | 'metadata_json'>): BookingIdentity | null {
  const source = item.metadata_json?.booking_source;
  if (!isBookingSource(source) || !isValidBookingId(source, item.source_id)) return null;
  return { source, id: item.source_id };
}

export function scheduleHrefFor(identity: BookingIdentity): string {
  return `/schedule?${SESSION_PARAM}=${encodeURIComponent(encodeSessionParam(identity))}`;
}

/** Appointment date/time in the runtime timezone, the Schedule's existing contract. */
export function formatAppointment(booking: Pick<SessionBooking, 'startAt' | 'endAt'>): string {
  const start = new Date(booking.startAt);
  const date = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(start);
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const end = booking.endAt ? new Date(booking.endAt) : null;
  const span = end && !Number.isNaN(end.getTime()) ? `${time.format(start)} – ${time.format(end)}` : time.format(start);
  return `${date}, ${span}`;
}

export function displayTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const TYPE_LABEL: Partial<Record<ClassroomItemType, string>> = {
  drill: 'Drill',
  homework: 'Homework',
  activity: 'Activity',
  bootcamp_module: 'Bootcamp module',
  practice_test: 'PrepTest',
  note: 'Note',
  session_recap: 'Session recap',
  smartboard_recap: 'Board recap',
  announcement: 'Announcement',
};

export function itemTypeLabel(type: ClassroomItemType): string {
  return TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

/** The item's own stored work status. Never derived from the calendar. */
export function itemStatusLabel(item: ClassroomItem): string | null {
  switch (item.status) {
    case 'assigned': return 'Assigned';
    case 'in_progress': return 'In progress';
    case 'completed': return 'Completed';
    case 'draft': return 'Draft';
    case 'archived': return 'Archived';
    default: return null;
  }
}

/**
 * Teacher link controls are off until the server protects `session_chain`.
 *
 * Today `guard_classroom_items_student_update` lets a student account change
 * `metadata_json` on its own rows, so a link stored there cannot be proven to
 * be Joshua's, and hiding buttons in this client would not stop a student
 * from adding, moving or removing one. The prerequisite (a guard on the
 * member plus an admin-only, ownership- and phase-checked CAS function) is in
 * docs/implementation-plans/2026-10-02-schedule-176-verification.md.
 */
export const SESSION_LINK_WRITES_ENABLED = false;

export const SESSION_LINK_WRITES_BLOCKED =
  'Secure session linking is not available yet. Links are stored in record data the student account can also edit, so this page cannot verify who made them. Linking, moving and removing stay off until the server protects them.';

export const SESSION_LINK_UNVERIFIED =
  'Links below are read from record data the student account can also edit. They are not verified as yours.';
