import { createClient } from "npm:@supabase/supabase-js@2";

import { deleteEvent, getEvent, patchEvent, meetUrlFromEvent } from "../_shared/googleCalendar.ts";
import { decryptEnvelope } from "../_shared/singleSessionCrypto.ts";
import { createRefund, retrieveRefund } from "../_shared/stripe.ts";
import { sendAppEmail } from "../_shared/sendAppEmail.ts";

const WORKER_NAME = "single-session-outbox";
const MAX_BODY_BYTES = 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`);
  return value;
}

async function authorizeTicket(supabase: any, req: Request): Promise<boolean> {
  const ticket = req.headers.get("x-worker-ticket") || "";
  if (!/^[0-9a-f-]{36}$/i.test(ticket)) return false;
  const { data, error } = await supabase.rpc("consume_booking_worker_ticket", {
    _token: ticket,
    _worker: WORKER_NAME,
  });
  if (error) {
    console.error("worker ticket check failed", { code: error.code });
    return false;
  }
  return data === true;
}

function authorize(req: Request): boolean {
  const expected = Deno.env.get("BOOKING_WORKER_SECRET") ?? "";
  if (!expected) return false;
  const supplied = req.headers.get("x-worker-secret") || "";
  if (expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= expected.charCodeAt(index) ^ supplied.charCodeAt(index);
  return difference === 0;
}

async function heartbeat(supabase: any, phase: "start" | "success" | "error", error?: string, metadata: Record<string, unknown> = {}) {
  const { error: heartbeatError } = await supabase.rpc("record_booking_worker_heartbeat", {
    _worker_name: WORKER_NAME,
    _phase: phase,
    _error: error ?? null,
    _metadata: metadata,
  });
  if (heartbeatError) throw heartbeatError;
}

function whenText(startAt: string, timezone: string): string {
  let safeTimezone = timezone || "America/Toronto";
  try { new Intl.DateTimeFormat("en-US", { timeZone: safeTimezone }).format(); }
  catch (_) { safeTimezone = "America/Toronto"; }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(startAt));
}

async function sendEmail(job: any, booking: any, payload: any) {
  const admin = job.recipient === "admin";
  const recipientEmail = admin ? requiredEnv("BOOKING_ADMIN_EMAIL") : booking.email;
  if (!recipientEmail) throw new Error("email_recipient_missing");
  let templateName = "booking-confirmation";
  let templateData: Record<string, unknown> = {
    recipientRole: admin ? "admin" : "student",
    studentName: booking.name,
    studentEmail: booking.email,
    eventLabel: booking.event_label || "LSAT Session",
    startAt: booking.start_at,
    endAt: booking.end_at,
    whenText: whenText(booking.start_at, booking.booker_timezone),
    durationMinutes: Math.round((new Date(booking.end_at).getTime() - new Date(booking.start_at).getTime()) / 60_000),
    timezone: booking.booker_timezone || "America/Toronto",
    meetUrl: booking.meet_url,
    calendarUrl: booking.calendar_url,
    bookingId: booking.id,
    studentNote: admin ? booking.notes : "",
    fileNames: [],
    cancelUrl: admin ? undefined : payload?.cancel_url,
    calendarPending: !booking.meet_url || !booking.calendar_url,
  };
  if (["email_cancellation", "email_refund_apology"].includes(job.action)) {
    templateName = "single-session-update";
    templateData = {
      kind: job.action === "email_refund_apology" ? "refund" : "cancellation",
      recipientRole: admin ? "admin" : "booker",
      studentName: booking.name,
      whenText: whenText(booking.start_at, booking.booker_timezone),
    };
  }
  await sendAppEmail(templateName, recipientEmail, {
    idempotencyKey: job.idempotency_key,
    templateData,
  });
}

async function complete(supabase: any, job: any, options: { providerStatus?: string; result?: any; meetUrl?: string } = {}) {
  const { data, error } = await supabase.rpc("complete_single_session_outbox", {
    _job_id: job.id,
    _lease_token: job.lease_token,
    _provider_status: options.providerStatus ?? null,
    _result: options.result ?? {},
    _meet_url: options.meetUrl ?? null,
  });
  if (error) throw error;
  return data;
}

async function fail(supabase: any, job: any, error: unknown, providerStatus?: string, confirmedFailure = false) {
  const message = error instanceof Error ? error.message : String(error);
  const { error: failureError } = await supabase.rpc("fail_single_session_outbox", {
    _job_id: job.id,
    _lease_token: job.lease_token,
    _error: message,
    _provider_status: providerStatus ?? null,
    _confirmed_failure: confirmedFailure,
  });
  if (failureError && failureError.code !== "P0409") throw failureError;
  return message;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const declared = Number(req.headers.get("content-length") || "0");
    if (declared > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    // Two accepted callers: a worker holding BOOKING_WORKER_SECRET, and the
    // scheduled job, which presents a single-use ticket only a service-role
    // reader could have minted. No shared secret lives in SQL or cron metadata.
    if (!authorize(req) && !(await authorizeTicket(supabase, req))) {
      return json({ error: "unauthorized" }, 401);
    }
    await heartbeat(supabase, "start");
    const workerId = `${WORKER_NAME}:${crypto.randomUUID()}`;
    const results: { id: string; action: string; outcome: string }[] = [];
    // A calendar promotion unblocks its email jobs. Claim twice, and only
    // twice, so those emails can send in this invocation without turning one
    // request into an unbounded queue drain.
    for (let pass = 0; pass < 2; pass++) {
      const { data: jobs, error: claimError } = await supabase.rpc("claim_single_session_outbox", {
        _worker_id: workerId,
        _actions: null,
        _limit: 20,
        _lease_seconds: 180,
      });
      if (claimError) throw claimError;
      if (!jobs?.length) break;
      for (const job of jobs) {
      const { data: booking, error: bookingError } = await supabase.from("single_session_bookings")
        .select("*").eq("id", job.booking_id).maybeSingle();
      if (bookingError || !booking) {
        await fail(supabase, job, bookingError ?? new Error("booking_not_found"));
        results.push({ id: job.id, action: job.action, outcome: "retry" });
        continue;
      }
      if (booking.status !== job.precondition_status || booking.lifecycle_version !== job.precondition_lifecycle_version) {
        await fail(supabase, job, new Error("lifecycle_precondition_changed"));
        results.push({ id: job.id, action: job.action, outcome: "superseded" });
        continue;
      }

      try {
        if (job.action === "gcal_promote") {
          if (!booking.gcal_event_id) throw new Error("tentative_event_missing");
          const { data: state, error: stateError } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
          if (stateError) throw stateError;
          const targetCalendar = state?.calendar_id || "primary";
          const attendees = [booking.email, ...((booking.guests ?? []) as string[])].filter(Boolean).map((email) => ({ email }));
          let event = await patchEvent(targetCalendar, booking.gcal_event_id, {
            summary: `${String(booking.name || "Student").trim().split(/\s+/)[0]} session`,
            description: booking.notes ? `Booked via LSAT U.\n\nNotes from Booker:\n${booking.notes}` : "Booked via LSAT U.",
            attendees,
            visibility: "default",
            conferenceData: { createRequest: { requestId: booking.id, conferenceSolutionKey: { type: "hangoutsMeet" } } },
            extendedProperties: { private: { lsatu_single_session_booking_id: booking.id, lsatu_hold: "false" } },
          }, { conferenceDataVersion: 1, sendUpdates: "all" });
          let meetUrl = meetUrlFromEvent(event);
          if (!meetUrl || !event.htmlLink) {
            event = await getEvent(targetCalendar, booking.gcal_event_id);
            meetUrl = meetUrlFromEvent(event);
          }
          if (!meetUrl) throw new Error("meet_url_pending");
          if (!event.htmlLink) throw new Error("calendar_url_pending");
          const { error: mirrorError } = await supabase.from("schedule_events").upsert({
            google_event_id: event.id,
            calendar_id: targetCalendar,
            title: event.summary,
            description: event.description,
            start_at: booking.start_at,
            end_at: booking.end_at,
            all_day: false,
            status: event.status ?? "confirmed",
            html_link: event.htmlLink ?? null,
            meet_url: meetUrl,
            source: "single_session",
            etag: event.etag ?? null,
            last_synced_at: new Date().toISOString(),
            deleted_at: null,
          }, { onConflict: "google_event_id" });
          if (mirrorError) throw mirrorError;
          const completion = await complete(supabase, job, {
            meetUrl,
            result: { google_event_id: event.id, calendar_url: event.htmlLink },
          });
          if (completion?.compensate) {
            await deleteEvent(targetCalendar, event.id, { sendUpdates: "all" });
            await supabase.from("schedule_events").update({ status: "cancelled", deleted_at: new Date().toISOString() }).eq("google_event_id", event.id);
          }
        } else if (job.action === "gcal_delete") {
          const { data: state, error: stateError } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
          if (stateError) throw stateError;
          const eventId = booking.gcal_event_id;
          if (eventId) {
            await deleteEvent(state?.calendar_id || "primary", eventId, { sendUpdates: booking.status === "cancelled" ? "all" : "none" });
            const { error: mirrorError } = await supabase.from("schedule_events").update({
              status: "cancelled",
              deleted_at: new Date().toISOString(),
              last_synced_at: new Date().toISOString(),
            }).eq("google_event_id", eventId);
            if (mirrorError) throw mirrorError;
          }
          await complete(supabase, job, { result: { google_event_id: eventId ?? null } });
        } else if (job.action === "stripe_refund") {
          if (!booking.stripe_payment_intent_id) throw new Error("payment_intent_missing");
          if (!Number.isInteger(Number(booking.amount_cents)) || Number(booking.amount_cents) <= 0) {
            throw new Error("refund_amount_missing");
          }
          const stripeSecret = requiredEnv("STRIPE_SECRET_KEY");
          const refund = booking.stripe_refund_id
            ? await retrieveRefund(stripeSecret, booking.stripe_refund_id)
            : await createRefund(stripeSecret, {
              payment_intent: booking.stripe_payment_intent_id,
              amount: Number(booking.amount_cents),
              metadata: { booking_id: booking.id, product: "single_session" },
            }, job.idempotency_key);
          if (refund.status === "succeeded") {
            await complete(supabase, job, { providerStatus: refund.status, result: { refund_id: refund.id } });
          } else if (["failed", "canceled"].includes(String(refund.status))) {
            await fail(supabase, job, new Error("stripe_refund_confirmed_failed"), String(refund.status), true);
          } else {
            await fail(supabase, job, new Error("stripe_refund_pending"), String(refund.status), false);
          }
        } else if (job.action.startsWith("email_")) {
          const payload = job.payload_ciphertext
            ? await decryptEnvelope(job.payload_ciphertext, requiredEnv("SINGLE_SESSION_ENCRYPTION_KEY"))
            : {};
          const [{ data: eventType, error: eventTypeError }, { data: calendarEvent, error: calendarEventError }] = await Promise.all([
            supabase.from("booking_event_types").select("label").eq("slug", booking.event_slug).maybeSingle(),
            booking.gcal_event_id
              ? supabase.from("schedule_events").select("html_link").eq("google_event_id", booking.gcal_event_id).maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);
          if (eventTypeError) throw eventTypeError;
          if (calendarEventError) throw calendarEventError;
          await sendEmail(job, {
            ...booking,
            event_label: eventType?.label || "LSAT Session",
            calendar_url: calendarEvent?.html_link || null,
          }, payload);
          await complete(supabase, job, { providerStatus: "accepted" });
        } else {
          throw new Error("unknown_outbox_action");
        }
        results.push({ id: job.id, action: job.action, outcome: "processed" });
      } catch (error) {
        await fail(supabase, job, error);
        console.error("single-session outbox job failed", { bookingId: booking.id, jobId: job.id, action: job.action, error: error instanceof Error ? error.message : String(error) });
        results.push({ id: job.id, action: job.action, outcome: "retry" });
      }
      }
    }
    await heartbeat(supabase, "success", undefined, { processed: results.length });
    return json({ processed: results.length, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
      await heartbeat(supabase, "error", message);
    } catch (_) { /* fail-closed response is the durable alert when heartbeat is unavailable */ }
    console.error("single-session-outbox error", { error: message });
    return json({ error: "worker_failed" }, 500);
  }
});
