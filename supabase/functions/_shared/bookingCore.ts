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


export const BOOKING_CFG = {
  sessionMinDefault: 70,
  bufferMin: 15,
  stepMin: 30,
  leadMin: 1440,
  lookaheadDaysDefault: 21,
  maxSlots: 200,
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
    .select("start_at,end_at")
    .in("status", ["draft", "checkout_open", "booked"])
    .lt("start_at", rangeEndIso)
    .gt("end_at", rangeStartIso);
  if (singleSessionErr && singleSessionErr.code !== "42P01") throw singleSessionErr;
  const live = await gcal.freeBusy(calendarIds, rangeStartIso, rangeEndIso);
  const intervals = [
    ...(mirrored ?? []).map((e: any) => ({ start: new Date(e.start_at).getTime(), end: new Date(e.end_at).getTime() })),
    ...(singleSessions ?? []).map((e: any) => ({ start: new Date(e.start_at).getTime(), end: new Date(e.end_at).getTime() })),
    ...Object.values(live).flat().map((e) => ({ start: new Date(e.start).getTime(), end: new Date(e.end).getTime() })),
  ].filter((e) => Number.isFinite(e.start) && Number.isFinite(e.end));
  return intervals;
}

export function deterministicGoogleEventId(redemptionId: string): string {
  return redemptionId.replace(/-/g, "").toLowerCase();
}

// Generate bookable slots: 30-min grid, inside seeded availability windows for
// the host tz, >= 24h lead, session must fit fully, 15-min buffer around busy
// blocks. `busy` = existing events (ms epoch). This mirrors the server-side
// is_slot_bookable predicate so what students see is what the RPC will accept.
export function generateSlots(opts: {
  pass: BookingPass;
  nowMs: number;
  hostTz: string;
  rangesByDow: Record<number, { startMin: number; endMin: number }[]>;
  busy: { start: number; end: number }[];
  daysAhead: number;
}): Slot[] {
  const { pass, nowMs, hostTz, rangesByDow, busy, daysAhead } = opts;
  const sessionMs = pass.session_length_minutes * 60_000;
  const bufMs = BOOKING_CFG.bufferMin * 60_000;
  const rangeStart = nowMs + BOOKING_CFG.leadMin * 60_000;
  let rangeEnd = nowMs + daysAhead * 86_400_000;
  if (pass.expires_at) {
    const exp = new Date(pass.expires_at).getTime();
    if (exp < rangeEnd) rangeEnd = exp;
  }

  const slots: Slot[] = [];
  const seen = new Set<string>();
  for (let d = 0; d <= daysAhead && slots.length < BOOKING_CFG.maxSlots; d++) {
    const dayAnchor = new Date(rangeStart + d * 86_400_000);
    const { y, m, d: dd, dow } = hostLocalParts(hostTz, dayAnchor);
    const dayRanges = rangesByDow[dow] ?? [];
    for (const rng of dayRanges) {
      // Step on the 30-min grid; require the whole session to fit in the range.
      const firstGridMinute = Math.ceil(rng.startMin / BOOKING_CFG.stepMin) * BOOKING_CFG.stepMin;
      for (let mins = firstGridMinute; mins + pass.session_length_minutes <= rng.endMin; mins += BOOKING_CFG.stepMin) {
        const startUtc = hostLocalToUtc(hostTz, y, m, dd, mins).getTime();
        if (startUtc < rangeStart) continue;
        if (startUtc + sessionMs > rangeEnd) break;
        // 15-min buffer around each busy block.
        const conflict = busy.some((b) => b.start - bufMs < startUtc + sessionMs && b.end + bufMs > startUtc);
        if (!conflict) {
          const startIso = new Date(startUtc).toISOString();
          if (!seen.has(startIso)) {
            seen.add(startIso);
            slots.push({ start_at: startIso, end_at: new Date(startUtc + sessionMs).toISOString() });
          }
        }
        if (slots.length >= BOOKING_CFG.maxSlots) break;
      }
      if (slots.length >= BOOKING_CFG.maxSlots) break;
    }
  }
  slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return slots;
}

// Parse the get_booking_availability() RPC payload into rangesByDow + tz.
export function parseAvailability(avail: any): { hostTz: string; rangesByDow: Record<number, { startMin: number; endMin: number }[]> } {
  const rangesByDow: Record<number, { startMin: number; endMin: number }[]> = {};
  let hostTz = "America/Toronto";
  if (avail?.timezone) hostTz = avail.timezone;
  for (const r of (avail?.ranges ?? []) as any[]) {
    const [sh, sm] = String(r.start_time).split(":").map(Number);
    const [eh, em] = String(r.end_time).split(":").map(Number);
    (rangesByDow[r.day_of_week] ??= []).push({ startMin: sh * 60 + sm, endMin: eh * 60 + em });
  }
  return { hostTz, rangesByDow };
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

  // Freshness guard immediately before the database reservation. The
  // exclusion constraint remains the hard guard for LSAT U races.
  try {
    const bufferMs = BOOKING_CFG.bufferMin * 60_000;
    const busy = await loadBusyIntervals({
      supabase,
      gcal,
      rangeStartIso: new Date(startAt.getTime() - bufferMs).toISOString(),
      rangeEndIso: new Date(endAt.getTime() + bufferMs).toISOString(),
    });
    const conflict = busy.some((b) => b.start - bufferMs < endAt.getTime() && b.end + bufferMs > startAt.getTime());
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
