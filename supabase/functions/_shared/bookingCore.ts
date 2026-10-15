// Shared booking core, used by BOTH front doors:
//   * student-booking  (JWT identity)   — logged-in students
//   * public-booking   (slug identity)  — anonymous per-student links
//
// The core NEVER derives identity. Each caller resolves an already-authorized
// { pass, identity } and hands it in. Slot generation and the booking pipeline
// live here once (previously duplicated in student-booking + booking-pass).
//
// Booking uses a RESERVE-FIRST state machine (Codex R3 #4): the DB row is
// created first (gcal_state='pending') via redeem_booking_pass_v2 — which
// derives the end time and enforces the full slot policy in-transaction — and
// the Google event is created AFTER, then persisted back. A crash between the
// two leaves a 'pending' row the reconciler adopts; the booking is honored.
//
// The GoogleCalendar dependency is injected so tests can supply a deterministic
// mock and exercise the crash matrix without touching Google.

import { sendAppEmail } from "./sendAppEmail.ts";


// Fallbacks only. The live numbers come from booking_availability_config via
// get_booking_availability(): Buffer 10 min, 24 h notice, 8-day window
// (Joshua's numbers, 2026-09-11; the pitch and the buffer mirror Cal.com).
export const BOOKING_CFG = {
  sessionMinDefault: 70,
  bufferMinDefault: 10,
  leadMin: 1440,
  lookaheadDaysDefault: 8,
  maxSlots: 400,
};

export type BookingPass = {
  id: string;
  status: string;
  total_credits: number;
  used_credits: number;
  session_length_minutes: number;
  expires_at: string | null;
  student_id: string | null;
  student_name: string | null;
  student_email: string | null;
};

export type BookingIdentity = {
  student_id: string | null; // null for name/email-only passes (legacy); slug passes carry it
  email: string | null;
  name: string;
};

export type GoogleCal = {
  insertEvent: (calendarId: string, body: unknown, opts?: any) => Promise<any>;
  patchEvent: (calendarId: string, eventId: string, body: unknown, opts?: any) => Promise<any>;
  getEvent: (calendarId: string, eventId: string) => Promise<any>;
  deleteEvent: (calendarId: string, eventId: string, opts?: any) => Promise<any>;
  freeBusy: (calIds: string[], startIso: string, endIso: string) => Promise<Record<string, { start: string; end: string }[]>>;
  meetUrlFromEvent: (event: any) => string | null;
};

// ---------------------------------------------------------------- timezone utils
// UTC offset (minutes) of an IANA tz at an instant (DST-aware; positive = east).
function tzOffsetMinutesAt(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(at)) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

// UTC instant for a host-local calendar date + wall-clock minutes (settles DST).
function hostLocalToUtc(timeZone: string, y: number, m: number, d: number, minutesOfDay: number): Date {
  const naiveUtc = Date.UTC(y, m, d, Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  let guess = new Date(naiveUtc - tzOffsetMinutesAt(timeZone, new Date(naiveUtc)) * 60000);
  guess = new Date(naiveUtc - tzOffsetMinutesAt(timeZone, guess) * 60000);
  return guess;
}

function hostLocalParts(timeZone: string, at: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) map[p.type] = p.value;
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: Number(map.year), m: Number(map.month) - 1, d: Number(map.day), dow: wd[map.weekday] };
}

export type Slot = { start_at: string; end_at: string };

type SingleSessionBusyRow = {
  start_at?: string | null;
  end_at?: string | null;
  status?: string | null;
  draft_expires_at?: string | null;
  stripe_expires_at?: string | null;
};

// Only live holds may remove a time from availability. Expired or malformed
// drafts/checkouts are deliberately ignored so a missed sweeper run cannot
// suppress slots indefinitely. Confirmed bookings remain busy until cancelled.
export function activeSingleSessionBusyIntervals(
  rows: SingleSessionBusyRow[],
  nowMs = Date.now(),
): { start: number; end: number }[] {
  return rows.flatMap((row) => {
    const start = Date.parse(row.start_at ?? "");
    const end = Date.parse(row.end_at ?? "");
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

    let blocksAvailability = row.status === "booked";
    if (row.status === "draft") {
      blocksAvailability = Date.parse(row.draft_expires_at ?? "") > nowMs;
    } else if (row.status === "checkout_open") {
      blocksAvailability = Date.parse(row.stripe_expires_at ?? "") > nowMs;
    }

    return blocksAvailability ? [{ start, end }] : [];
  });
}


export async function loadBusyIntervals(opts: {
  supabase: any;
  gcal: GoogleCal;
  rangeStartIso: string;
  rangeEndIso: string;
}): Promise<{ start: number; end: number }[]> {
  const { supabase, gcal, rangeStartIso, rangeEndIso } = opts;
  const { data: state, error: stateErr } = await supabase.from("gcal_sync_state")
    .select("calendar_id,busy_calendar_ids").eq("id", 1).maybeSingle();
  if (stateErr) throw stateErr;
  const writeCalendar = state?.calendar_id || "primary";
  const calendarIds = [...new Set([writeCalendar, ...((state?.busy_calendar_ids ?? []) as string[])])];
  const { data: mirrored, error: mirrorErr } = await supabase.from("schedule_events")
    .select("start_at,end_at")
    .is("deleted_at", null).neq("status", "cancelled").neq("transparency", "transparent")
    .lt("start_at", rangeEndIso).gt("end_at", rangeStartIso);
  if (mirrorErr) throw mirrorErr;
  // Native Single Session Holds are first-class occupancy. Google normally
  // sees the tentative event too, but the database union closes the cache and
  // propagation window and keeps package slot browsing symmetric.
  const { data: singleSessions, error: singleSessionErr } = await supabase
    .from("single_session_bookings")
    .select("start_at,end_at,status,draft_expires_at,stripe_expires_at")
    .in("status", ["draft", "checkout_open", "booked"])
    .lt("start_at", rangeEndIso)
    .gt("end_at", rangeStartIso);
  if (singleSessionErr && singleSessionErr.code !== "42P01") throw singleSessionErr;
  // Booked pass redemptions are normally mirrored into schedule_events and
  // visible to Google, but the RPC checks the redemption rows directly, so the
  // list must see exactly what the RPC will see.
  const { data: redemptions, error: redemptionErr } = await supabase
    .from("booking_pass_redemptions")
    .select("start_at,end_at")
    .eq("status", "booked")
    .lt("start_at", rangeEndIso)
    .gt("end_at", rangeStartIso);
  if (redemptionErr) throw redemptionErr;
  const live = await gcal.freeBusy(calendarIds, rangeStartIso, rangeEndIso);
  const intervals = [
    ...(mirrored ?? []).map((e: any) => ({ start: new Date(e.start_at).getTime(), end: new Date(e.end_at).getTime() })),
    ...activeSingleSessionBusyIntervals(singleSessions ?? []),
    ...(redemptions ?? []).map((e: any) => ({ start: new Date(e.start_at).getTime(), end: new Date(e.end_at).getTime() })),
    ...Object.values(live).flat().map((e) => ({ start: new Date(e.start).getTime(), end: new Date(e.end).getTime() })),
  ].filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end));
  return intervals;
}

export function deterministicGoogleEventId(redemptionId: string): string {
  return redemptionId.replace(/-/g, "").toLowerCase();
}

// ---------------------------------------------------------------- slot policy
// The numbers that decide whether a time may be offered. Every front door
// (pass link, in-app schedule, single session, consultation) builds one of
// these and runs the same generateSlots, and the SQL side (is_slot_bookable /
// is_single_session_slot_bookable + booking_slot_is_clear) enforces the same
// arithmetic, so nothing a student can click is later refused as a conflict.
export type SlotPolicy = {
  lengthMin: number;
  /** Grid step from the start of each availability range. */
  pitchMin: number;
  /** Clearance required between the session and anything before / after it. */
  bufferBeforeMin: number;
  bufferAfterMin: number;
  /** Minimum notice: no slot starts before now + leadMin. */
  leadMin: number;
  /** Last instant a session may end (rolling window, pass expiry). */
  windowEndMs: number;
  maxSlots?: number;
};

export type DowRanges = Record<number, { startMin: number; endMin: number }[]>;
export type DateRanges = Record<string, { startMin: number; endMin: number }[]>;

// Weekly hours plus Cal.com-style date overrides. A date present in
// overridesByDate replaces that day's weekly hours entirely; an empty array
// closes the day.
export type BookingHours = {
  hostTz: string;
  rangesByDow: DowRanges;
  overridesByDate: DateRanges;
};

export type BookingAvailability = BookingHours & {
  bufferMin: number;
  leadMin: number;
  windowDays: number;
};

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function rangesForDate(hours: BookingHours, date: string, dow: number) {
  const override = hours.overridesByDate[date];
  if (override) return override;
  return hours.rangesByDow[dow] ?? [];
}

// Generate bookable slots. Mirrors is_slot_bookable / is_single_session_slot_bookable
// and booking_slot_is_clear exactly: slots step pitchMin from the start of each
// range on the host's local date (overrides first), the whole session fits inside
// the range, it starts no earlier than the notice and ends inside the window,
// and nothing busy sits within the buffer on either side. Busy blocks are not
// buffered themselves, so the gap between two events is one buffer, never two.
export function generateSlots(opts: {
  policy: SlotPolicy;
  hours: BookingHours;
  nowMs: number;
  busy: { start: number; end: number }[];
}): Slot[] {
  const { policy, hours, nowMs, busy } = opts;
  const sessionMs = policy.lengthMin * 60_000;
  const beforeMs = policy.bufferBeforeMin * 60_000;
  const afterMs = policy.bufferAfterMin * 60_000;
  const maxSlots = policy.maxSlots ?? BOOKING_CFG.maxSlots;
  const rangeStart = nowMs + policy.leadMin * 60_000;
  const rangeEnd = policy.windowEndMs;
  if (rangeEnd <= rangeStart) return [];

  const slots: Slot[] = [];
  const seen = new Set<string>();
  const daysAhead = Math.ceil((rangeEnd - rangeStart) / 86_400_000) + 1;
  // Walk host-local calendar dates, not 24-hour steps, so a DST change can
  // neither skip nor double a date.
  const first = hostLocalParts(hours.hostTz, new Date(rangeStart));
  for (let d = 0; d <= daysAhead && slots.length < maxSlots; d++) {
    const dt = new Date(Date.UTC(first.y, first.m, first.d + d));
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth(), dd = dt.getUTCDate(), dow = dt.getUTCDay();
    const dayRanges = rangesForDate(hours, isoDate(y, m, dd), dow);
    for (const rng of dayRanges) {
      for (let mins = rng.startMin; mins + policy.lengthMin <= rng.endMin; mins += policy.pitchMin) {
        const startUtc = hostLocalToUtc(hours.hostTz, y, m, dd, mins).getTime();
        if (startUtc < rangeStart) continue;
        if (startUtc + sessionMs > rangeEnd) break;
        const conflict = busy.some((b) => b.start < startUtc + sessionMs + afterMs && b.end > startUtc - beforeMs);
        if (!conflict) {
          const startIso = new Date(startUtc).toISOString();
          if (!seen.has(startIso)) {
            seen.add(startIso);
            slots.push({ start_at: startIso, end_at: new Date(startUtc + sessionMs).toISOString() });
          }
        }
        if (slots.length >= maxSlots) break;
      }
      if (slots.length >= maxSlots) break;
    }
  }
  slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return slots;
}

// The pass link's policy: the pass sets the length, the availability config
// sets everything else. Pitch is length + buffer so back-to-back slots are all
// bookable (80 minutes for the 70-minute session).
export function passSlotPolicy(pass: BookingPass, avail: BookingAvailability, nowMs: number, daysAhead?: number): SlotPolicy {
  const days = Math.min(Math.max(daysAhead ?? avail.windowDays, 1), avail.windowDays);
  // The window is counted in host-local calendar dates, the way the single
  // session and Cal.com count it: today plus N days, through the end of that
  // day. Counting 24-hour blocks from "now" instead made the pass link drop
  // the last day's evening slots that the single-session page still offered.
  const today = hostLocalParts(avail.hostTz, new Date(nowMs));
  let windowEndMs = hostLocalToUtc(avail.hostTz, today.y, today.m, today.d + days + 1, 0).getTime();
  if (pass.expires_at) {
    const exp = new Date(pass.expires_at).getTime();
    if (Number.isFinite(exp) && exp < windowEndMs) windowEndMs = exp;
  }
  return {
    lengthMin: pass.session_length_minutes,
    pitchMin: pass.session_length_minutes + avail.bufferMin,
    bufferBeforeMin: avail.bufferMin,
    bufferAfterMin: avail.bufferMin,
    leadMin: avail.leadMin,
    windowEndMs,
  };
}

function toMinutes(hhmm: unknown): number {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
}

// Parse the get_booking_availability() RPC payload.
export function parseAvailability(avail: any): BookingAvailability {
  const rangesByDow: DowRanges = {};
  const overridesByDate: DateRanges = {};
  const hostTz = avail?.timezone || "America/Toronto";
  for (const r of (avail?.ranges ?? []) as any[]) {
    (rangesByDow[r.day_of_week] ??= []).push({ startMin: toMinutes(r.start_time), endMin: toMinutes(r.end_time) });
  }
  for (const o of (avail?.overrides ?? []) as any[]) {
    const date = String(o.date);
    overridesByDate[date] ??= [];
    if (o.start_time && o.end_time) overridesByDate[date].push({ startMin: toMinutes(o.start_time), endMin: toMinutes(o.end_time) });
  }
  return {
    hostTz,
    rangesByDow,
    overridesByDate,
    bufferMin: Number.isFinite(Number(avail?.buffer_minutes)) ? Number(avail.buffer_minutes) : BOOKING_CFG.bufferMinDefault,
    leadMin: Number.isFinite(Number(avail?.minimum_notice_minutes)) ? Number(avail.minimum_notice_minutes) : BOOKING_CFG.leadMin,
    windowDays: Number.isFinite(Number(avail?.window_days)) ? Number(avail.window_days) : BOOKING_CFG.lookaheadDaysDefault,
  };
}

export async function loadAvailability(supabase: any): Promise<BookingAvailability> {
  const { data, error } = await supabase.rpc("get_booking_availability");
  if (error) throw error;
  return parseAvailability(data);
}

export type BookResult =
  | { ok: true; redemption: any; was_existing: boolean }
  | { ok: false; error: string; status: number; details?: string };

// Reserve-first booking. `supabase` is a service-role client. `gcal` is injected.
export async function bookSession(opts: {
  supabase: any;
  gcal: GoogleCal;
  pass: BookingPass;
  identity: BookingIdentity;
  startAtIso: string;
  idempotencyKey: string;
  adminEmail: string;
  supabaseUrl: string;
  serviceKey: string;
  anonKey: string;
  studentNote?: string;
}): Promise<BookResult> {
  const { supabase, gcal, pass, identity, startAtIso, idempotencyKey: idem } = opts;
  const studentNote = (opts.studentNote || "").trim();

  const startAt = new Date(startAtIso);
  if (isNaN(startAt.getTime())) return { ok: false, error: "invalid_start_at", status: 400 };
  if (!idem || idem.length < 8) return { ok: false, error: "invalid_idempotency_key", status: 400 };
  const endAt = new Date(startAt.getTime() + pass.session_length_minutes * 60_000);
  const studentName = identity.name;
  const studentEmail = identity.email;

  // Freshness guard immediately before the database reservation, with the
  // same Buffer the slot list and the RPC use. The exclusion constraint
  // remains the hard guard for LSAT U races.
  try {
    const avail = await loadAvailability(supabase);
    const bufferMs = avail.bufferMin * 60_000;
    const busy = await loadBusyIntervals({
      supabase,
      gcal,
      rangeStartIso: new Date(startAt.getTime() - bufferMs).toISOString(),
      rangeEndIso: new Date(endAt.getTime() + bufferMs).toISOString(),
    });
    const conflict = busy.some((b) => b.start < endAt.getTime() + bufferMs && b.end > startAt.getTime() - bufferMs);
    if (conflict) return { ok: false, error: "slot_conflict", status: 409 };
  } catch (busyError) {
    return {
      ok: false,
      error: "availability_check_failed",
      status: 503,
      details: busyError instanceof Error ? busyError.message : String(busyError),
    };
  }

  // ---- STEP 1: RESERVE (in-txn slot policy + credit debit, gcal_state=pending)
  const { data: rpc, error: rpcErr } = await supabase.rpc("redeem_booking_pass_v2", {
    _pass_id: pass.id,
    _idempotency_key: idem,
    _start_at: startAt.toISOString(),
    _schedule_event_id: null,
    _student_name: studentName,
    _student_email: studentEmail,
  });
  if (rpcErr) {
    const msg = String(rpcErr.message || "");
    const code = rpcErr.code as string | undefined;
    const mapped =
      code === "P0425" || msg.includes("slot_unavailable") ? "slot_unavailable"
      : code === "P0409" || msg.includes("slot_conflict") || msg.includes("no_overlapping_bookings") ? "slot_conflict"
      : msg.includes("pass_exhausted") ? "pass_exhausted"
      : msg.includes("pass_expired") ? "pass_expired"
      : msg.includes("pass_not_active") ? "pass_not_active"
      : "redeem_failed";
    return { ok: false, error: mapped, status: 409, details: msg };
  }
  const row = Array.isArray(rpc) ? rpc[0] : rpc;
  const redemptionId = row?.redemption_id;
  if (row?.was_existing) {
    // Idempotent replay: return the already-booked row.
    const { data: existing } = await supabase.from("booking_pass_redemptions").select("*").eq("id", redemptionId).maybeSingle();
    return { ok: true, redemption: existing, was_existing: true };
  }

  // ---- Booking-time student submission: persist the note + link any files
  // staged (by booking-upload) under this (pass, idempotency_key). Done before
  // gcal so a Google failure never loses the student's note/attachments.
  let uploadedFileNames: string[] = [];
  let submissionStatus: "none" | "linked" | "failed" = "none";
  try {
    if (studentNote) {
      const { error: noteErr } = await supabase.from("booking_pass_redemptions")
        .update({ student_note: studentNote }).eq("id", redemptionId);
      if (noteErr) throw noteErr;
    }
    const { data: linked, error: linkErr } = await supabase.from("external_work_uploads")
      .update({ redemption_id: redemptionId, student_id: identity.student_id ?? undefined })
      .eq("booking_pass_id", pass.id)
      .eq("booking_idempotency_key", idem)
      .is("redemption_id", null)
      .select("file_name");
    if (linkErr) throw linkErr;
    uploadedFileNames = (linked ?? []).map((r: any) => r.file_name).filter(Boolean);
    if (studentNote || uploadedFileNames.length > 0) {
      submissionStatus = "linked";
      const { error: statusErr } = await supabase.from("booking_pass_redemptions")
        .update({ submission_status: "linked", submission_error: null }).eq("id", redemptionId);
      if (statusErr) throw statusErr;
    }
  } catch (subErr) {
    submissionStatus = "failed";
    const message = subErr instanceof Error ? subErr.message : String(subErr);
    console.error("linking booking submission failed", { redemptionId, error: message });
    const { error: repairErr } = await supabase.from("booking_pass_redemptions")
      .update({ submission_status: "failed", submission_error: message }).eq("id", redemptionId);
    if (repairErr) console.error("submission repair state failed", repairErr);
    const { error: alertErr } = await supabase.from("booking_calendar_alerts").insert({
      redemption_id: redemptionId, alert_type: "persistence_failure",
      details: { category: "submission_linkage", error: message },
    });
    if (alertErr && alertErr.code !== "23505") console.error("submission repair alert failed", alertErr);
  }

  // Resolve the target calendar.
  const { data: stateRow, error: stateErr } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
  if (stateErr) {
    return { ok: false, error: "calendar_config_failed", status: 503, details: stateErr.message };
  }
  const calendarId = stateRow?.calendar_id || "primary";

  // Calendar event title: "<first name> session" (e.g. "Ashley session").
  const firstName = String(studentName).trim().split(/\s+/)[0] || String(studentName).trim();
  const eventTitle = `${firstName} session`;

  // Sessions the student has left AFTER this booking — stated plainly, no
  // "X of Y" / "remaining" pressure framing.
  const creditsLeft = Math.max(0, (pass.total_credits ?? 0) - (pass.used_credits + 1));
  const description = [
    "Booked via LSAT U.",
    studentEmail ? `Student: ${studentName} <${studentEmail}>` : `Student: ${studentName}`,
    `${creditsLeft} session${creditsLeft === 1 ? "" : "s"} in your package`,
  ].join("\n");

  // ---- STEP 2: GOOGLE (event + Meet, stamped for the reconciler)
  let gEvent: any;
  const deterministicEventId = deterministicGoogleEventId(redemptionId);
  try {
    gEvent = await gcal.insertEvent(calendarId, {
      id: deterministicEventId,
      summary: eventTitle,
      description,
      start: { dateTime: startAt.toISOString() },
      end: { dateTime: endAt.toISOString() },
      conferenceData: { createRequest: { requestId: idem, conferenceSolutionKey: { type: "hangoutsMeet" } } },
      attendees: studentEmail ? [{ email: studentEmail }] : undefined,
      // The stamp the reconciler searches by to adopt-or-create idempotently.
      extendedProperties: { private: { lsatu_redemption_id: redemptionId, lsatu_idempotency_key: idem, lsatu_pass_id: pass.id } },
    }, { conferenceDataVersion: 1, sendUpdates: studentEmail ? "all" : "none" });
  } catch (gErr) {
    if ((gErr as { status?: number }).status === 409) {
      try {
        gEvent = await gcal.getEvent(calendarId, deterministicEventId);
      } catch (adoptErr) {
        console.error("google event conflict could not be adopted", adoptErr);
      }
    }
    if (gEvent) {
      // Adopted the deterministic event created by an earlier timed-out call.
    } else {
    // Booking is RESERVED and honored. Leave the row 'pending' for the
    // reconciler; do NOT roll back a paid slot. Report success with pending sync.
    console.error("google insert failed; left pending for reconciler", gErr);
    return {
      ok: true,
      was_existing: false,
      redemption: {
        id: redemptionId, start_at: startAt.toISOString(), end_at: endAt.toISOString(),
        status: "booked", gcal_state: "pending", meet_url: null, google_event_id: null,
        submission_status: submissionStatus,
      },
    };
    }
  }

  let meetUrl = gcal.meetUrlFromEvent(gEvent);
  if (!meetUrl) {
    try {
      await new Promise((r) => setTimeout(r, 1200));
      meetUrl = gcal.meetUrlFromEvent(await gcal.getEvent(calendarId, gEvent.id));
    } catch (_) { /* non-fatal */ }
  }

  // Mirror to schedule_events (best-effort; the redemption is the source of truth).
  const { data: se, error: mirrorErr } = await supabase.from("schedule_events").upsert({
    google_event_id: gEvent.id, calendar_id: calendarId,
    title: eventTitle, description,
    start_at: startAt.toISOString(), end_at: endAt.toISOString(),
    all_day: false, status: gEvent.status ?? "confirmed",
    html_link: gEvent.htmlLink ?? null, meet_url: meetUrl,
    source: "booking_pass", etag: gEvent.etag ?? null,
    last_synced_at: new Date().toISOString(), deleted_at: null,
  }, { onConflict: "google_event_id" }).select().maybeSingle();

  if (mirrorErr) {
    console.error("booking calendar mirror persistence failed", mirrorErr);
  }

  // ---- STEP 3: PERSIST (guard so a reconciler that already filled it isn't clobbered)
  const { error: persistErr } = await supabase.from("booking_pass_redemptions")
    .update({
      google_event_id: gEvent.id, meet_url: meetUrl, schedule_event_id: se?.id ?? null,
      gcal_state: "synced", needs_gcal_sync: false, gcal_error: null,
      calendar_action: "none", calendar_status: "synced", calendar_error: null,
      calendar_last_synced_at: new Date().toISOString(), calendar_lease_until: null,
    })
    .eq("id", redemptionId)
    .is("google_event_id", null);
  if (persistErr || mirrorErr) {
    const message = persistErr?.message || mirrorErr?.message || "calendar_persistence_failed";
    const { error: pendingErr } = await supabase.from("booking_pass_redemptions").update({
      calendar_action: "create", calendar_status: "pending", calendar_error: message,
      gcal_state: "pending", needs_gcal_sync: true, gcal_error: message,
    }).eq("id", redemptionId);
    if (pendingErr) console.error("booking pending-state persistence failed", pendingErr);
    return {
      ok: true,
      was_existing: false,
      redemption: {
        id: redemptionId, start_at: startAt.toISOString(), end_at: endAt.toISOString(),
        status: "booked", calendar_action: "create", calendar_status: "pending",
        meet_url: meetUrl, google_event_id: gEvent.id, submission_status: submissionStatus,
      },
    };
  }

  // Confirmation emails to BOTH student + admin (best-effort).
  const whenText = startAt.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Toronto", timeZoneName: "short",
  });
  const sendConfirmation = async (recipientEmail: string, recipientRole: "student" | "admin") => {
    try {
      await sendAppEmail("booking-confirmation", recipientEmail, {
        idempotencyKey: `booking-${redemptionId}-${recipientRole}`.slice(0, 200),
        templateData: {
          recipientRole, studentName, studentEmail, whenText,
          durationMinutes: pass.session_length_minutes, meetUrl,
          // Only the admin copy surfaces the submission.
          studentNote: recipientRole === "admin" ? studentNote : "",
          fileNames: recipientRole === "admin" ? uploadedFileNames : [],
        },
      });
    } catch (mailErr) {
      const message = mailErr instanceof Error ? mailErr.message : String(mailErr);
      console.error(`confirmation email to ${recipientRole} failed`, { redemptionId, error: message });
      const { error: alertErr } = await supabase.from("booking_calendar_alerts").insert({
        redemption_id: redemptionId, alert_type: "persistence_failure",
        details: { category: "confirmation_email", recipient_role: recipientRole, error: message },
      });
      if (alertErr && alertErr.code !== "23505") console.error("confirmation email alert failed", alertErr);
    }
  };
  if (studentEmail) await sendConfirmation(studentEmail, "student");
  if (opts.adminEmail) await sendConfirmation(opts.adminEmail, "admin");

  return {
    ok: true,
    was_existing: false,
    redemption: {
      id: redemptionId, start_at: startAt.toISOString(), end_at: endAt.toISOString(),
      google_event_id: gEvent.id, html_link: gEvent.htmlLink ?? null, meet_url: meetUrl,
      status: "booked", submission_status: submissionStatus,
    },
  };
}
