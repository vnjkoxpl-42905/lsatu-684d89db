// Reconciler for booking redemptions whose Google side effect is pending
// (gcal_state='pending') — the reserve-first state machine's backstop.
//
// A redemption is 'pending' when the DB row committed but the Google event
// wasn't created/persisted (crash, timeout, or transient Google failure). This
// sweep adopts-or-creates the event idempotently:
//   1. CLAIM a lease on the row (conditional UPDATE) so two concurrent
//      reconcilers can't both act on it (Codex R3 #4).
//   2. SEARCH Google by the stamped privateExtendedProperty
//      (lsatu_idempotency_key) — if the event already exists, ADOPT it.
//   3. Else CREATE it (same stamp), then PERSIST google_event_id/meet_url and
//      set gcal_state='synced'.
//   4. On repeated failure past MAX_ATTEMPTS, mark gcal_state='failed' + record
//      the error for admin follow-up (never silently drop a paid booking).
//
// Trigger: an authenticated worker cron. The dedicated worker secret is
// required even though the function itself uses service-role access internally.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deleteEvent, getEvent, insertEvent, listEvents, meetUrlFromEvent } from "../_shared/googleCalendar.ts";
import { deterministicGoogleEventId } from "../_shared/bookingCore.ts";
import { hasConflictingCalendarEvent } from "../_shared/singleSessionCore.ts";
import { retrieveRefund } from "../_shared/stripe.ts";

const MAX_ATTEMPTS = 5;
const LEASE_SECONDS = 120;

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`);
  return value;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Accepted callers: a worker holding BOOKING_WORKER_SECRET, the
    // service-role key, or a single-use scheduler ticket minted server-side
    // (so no key ever appears in cron text or logs).
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const workerKey = Deno.env.get("BOOKING_WORKER_SECRET") ?? "";

    const supabase = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    );

    let authorized =
      bearer === serviceRoleKey ||
      (workerKey.length > 0 && req.headers.get("X-Worker-Secret") === workerKey);
    if (!authorized) {
      const ticket = req.headers.get("x-worker-ticket") || "";
      if (/^[0-9a-f-]{36}$/i.test(ticket)) {
        const { data: ticketOk, error: ticketErr } = await supabase.rpc(
          "consume_booking_worker_ticket",
          { _token: ticket, _worker: "gcal-reconcile" },
        );
        if (ticketErr) console.error("worker ticket check failed", { code: ticketErr.code });
        if (ticketOk === true) authorized = true;
      }
    }
    if (!authorized) {
      return json({ error: "unauthorized" }, 401);
    }

    const stripeSecret = requiredEnv("STRIPE_SECRET_KEY");

    const { error: heartbeatStartError } = await supabase.rpc("record_booking_worker_heartbeat", {
      _worker_name: "gcal-reconciler", _phase: "start", _error: null, _metadata: {},
    });
    if (heartbeatStartError) throw heartbeatStartError;

    const { data: candidates, error: claimErr } = await supabase.rpc("claim_booking_calendar_actions", {
      _limit: 25, _lease_seconds: LEASE_SECONDS,
    });
    if (claimErr) throw claimErr;

    const { data: stateRow } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
    const calendarId = stateRow?.calendar_id || "primary";

    const results: { id: string; outcome: string }[] = [];

    for (const row of candidates ?? []) {
      try {
        // SEARCH Google by the redemption stamp. Search failures are fatal for
        // this attempt and never fall through to create.
        let event: any = null;
        if (row.google_event_id) {
          try { event = await getEvent(calendarId, row.google_event_id); }
          catch (err) {
            if ((err as { status?: number }).status !== 404 && (err as { status?: number }).status !== 410) throw err;
          }
        }
        if (!event) {
          const found = await listEvents(calendarId, {
            privateExtendedProperty: `lsatu_redemption_id=${row.id}`,
            maxResults: "2", showDeleted: "true",
          });
          if ((found?.items ?? []).filter((item: any) => item.status !== "cancelled").length > 1) {
            const { error: duplicateAlertErr } = await supabase.from("booking_calendar_alerts").insert({
              redemption_id: row.id, alert_type: "duplicate_event",
              details: { google_event_ids: found.items.map((item: any) => item.id).filter(Boolean) },
            });
            if (duplicateAlertErr && duplicateAlertErr.code !== "23505") throw duplicateAlertErr;
          }
          event = found?.items?.find((item: any) => item.status !== "cancelled") ?? null;
        }

        if (row.calendar_action === "delete") {
          if (event?.id) await deleteEvent(calendarId, event.id, { sendUpdates: "all" });
          const { error: mirrorErr } = await supabase.from("schedule_events").update({
            status: "cancelled", deleted_at: new Date().toISOString(),
          }).eq("google_event_id", event?.id || row.google_event_id);
          if (mirrorErr) throw mirrorErr;
          const { error: persistErr } = await supabase.from("booking_pass_redemptions").update({
            calendar_action: "none", calendar_status: "synced", calendar_error: null,
            calendar_lease_until: null, calendar_last_synced_at: new Date().toISOString(),
            gcal_state: "synced", gcal_error: null, needs_gcal_sync: false,
          }).eq("id", row.id);
          if (persistErr) throw persistErr;
          results.push({ id: row.id, outcome: event ? "deleted" : "already_absent" });
          continue;
        }

        // Calendar event title: "<first name> session" (must match bookingCore.ts).
        const name = row.student_name_snapshot || "Student";
        const eventTitle = `${String(name).trim().split(/\s+/)[0] || String(name).trim()} session`;

        // 3) CREATE if not found.
        if (!event) {
          const email = row.student_email_snapshot || null;
          event = await insertEvent(calendarId, {
            id: deterministicGoogleEventId(row.id),
            summary: eventTitle,
            description: `Booked via LSAT U (reconciled).`,
            start: { dateTime: new Date(row.start_at).toISOString() },
            end: { dateTime: new Date(row.end_at).toISOString() },
            conferenceData: { createRequest: { requestId: row.idempotency_key, conferenceSolutionKey: { type: "hangoutsMeet" } } },
            attendees: email ? [{ email }] : undefined,
            extendedProperties: { private: { lsatu_redemption_id: row.id, lsatu_idempotency_key: row.idempotency_key, lsatu_pass_id: row.booking_pass_id } },
          }, { conferenceDataVersion: 1, sendUpdates: email ? "all" : "none" }).catch(async (err) => {
            if ((err as { status?: number }).status === 409) {
              return await getEvent(calendarId, deterministicGoogleEventId(row.id));
            }
            throw err;
          });
        }

        let meetUrl = meetUrlFromEvent(event);
        if (!meetUrl && event?.id) {
          try { meetUrl = meetUrlFromEvent(await getEvent(calendarId, event.id)); } catch (_) { /* non-fatal */ }
        }

        const { data: se, error: mirrorErr } = await supabase.from("schedule_events").upsert({
          google_event_id: event.id, calendar_id: calendarId,
          title: eventTitle,
          start_at: new Date(row.start_at).toISOString(), end_at: new Date(row.end_at).toISOString(),
          all_day: false, status: event.status ?? "confirmed", html_link: event.htmlLink ?? null,
          meet_url: meetUrl, source: "booking_pass", etag: event.etag ?? null,
          last_synced_at: new Date().toISOString(), deleted_at: null,
        }, { onConflict: "google_event_id" }).select().maybeSingle();
        if (mirrorErr) throw mirrorErr;

        const meetPending = !meetUrl && (row.calendar_attempts ?? 0) < MAX_ATTEMPTS;
        const { error: persistErr } = await supabase.from("booking_pass_redemptions").update({
          google_event_id: event.id, meet_url: meetUrl, schedule_event_id: se?.id ?? null,
          calendar_action: meetPending ? "create" : "none",
          calendar_status: meetPending ? "pending" : "synced",
          calendar_error: meetPending ? "meet_url_pending" : null,
          calendar_lease_until: null,
          calendar_last_synced_at: meetPending ? null : new Date().toISOString(),
          gcal_state: meetPending ? "pending" : "synced",
          needs_gcal_sync: meetPending,
          gcal_error: meetPending ? "meet_url_pending" : null,
        }).eq("id", row.id);
        if (persistErr) throw persistErr;

        results.push({ id: row.id, outcome: meetPending ? "meet_pending" : "synced" });
      } catch (err) {
        const attempts = row.calendar_attempts ?? 1;
        const terminal = attempts >= MAX_ATTEMPTS;
        const message = err instanceof Error ? err.message : String(err);
        const { error: failureErr } = await supabase.from("booking_pass_redemptions").update({
          calendar_status: terminal ? "failed" : "pending",
          calendar_error: message,
          calendar_lease_until: null,
          gcal_state: terminal ? "failed" : "pending",
          gcal_error: message,
          gcal_lease_until: null,
        }).eq("id", row.id);
        if (failureErr) throw failureErr;
        if (terminal) {
          const { error: alertErr } = await supabase.from("booking_calendar_alerts").insert({
            redemption_id: row.id, alert_type: "terminal_failure",
            details: { calendar_action: row.calendar_action, error: message },
          });
          if (alertErr && alertErr.code !== "23505") console.error("calendar alert persistence failed", alertErr);
        }
        results.push({ id: row.id, outcome: terminal ? "failed_terminal" : "retry_later" });
      }
    }

    // Refund webhook delivery is normally authoritative. Polling is the
    // backstop for a provider event delayed or missed after refund creation.
    const { data: refundRows, error: refundRowsError } = await supabase.from("single_session_bookings")
      .select("id,stripe_refund_id")
      .in("status", ["refund_pending", "refund_failed"])
      .not("stripe_refund_id", "is", null)
      .limit(25);
    if (refundRowsError) throw refundRowsError;
    let refundsChecked = 0;
    if ((refundRows ?? []).length) {
      for (const refundRow of refundRows ?? []) {
        const refund = await retrieveRefund(stripeSecret, refundRow.stripe_refund_id);
        const { error: refundError } = await supabase.rpc("record_single_session_refund_status", {
          _booking_id: refundRow.id,
          _stripe_refund_id: refund.id,
          _provider_status: refund.status,
        });
        if (refundError) throw refundError;
        refundsChecked++;
      }
    }

    // Monitor the accepted Cal.com TOCTOU sliver. The live event list excludes
    // the booking's own promoted/tentative event and persists an operator alert
    // when another event overlaps a booked native slot.
    const { data: nativeBookings, error: nativeError } = await supabase.from("single_session_bookings")
      .select("id,start_at,end_at,gcal_event_id")
      .eq("status", "booked")
      .gte("start_at", new Date().toISOString())
      .lte("start_at", new Date(Date.now() + 30 * 86_400_000).toISOString())
      .limit(100);
    if (nativeError) throw nativeError;
    let doubleBookings = 0;
    for (const booking of nativeBookings ?? []) {
      const page = await listEvents(calendarId, {
        timeMin: booking.start_at,
        timeMax: booking.end_at,
        singleEvents: "true",
        showDeleted: "false",
        maxResults: "50",
      });
      const conflicts = (page?.items ?? []).filter((event: any) =>
        hasConflictingCalendarEvent([event], booking.start_at, booking.end_at, booking.gcal_event_id, booking.id)
      );
      if (conflicts.length) {
        const { error: alertError } = await supabase.from("booking_calendar_alerts").insert({
          single_session_booking_id: booking.id,
          redemption_id: null,
          alert_type: "double_booking",
          status: "open",
          details: { google_event_ids: conflicts.map((event: any) => event.id).filter(Boolean) },
        });
        if (alertError && alertError.code !== "23505") throw alertError;
        doubleBookings++;
      }
    }

    const { error: heartbeatSuccessError } = await supabase.rpc("record_booking_worker_heartbeat", {
      _worker_name: "gcal-reconciler", _phase: "success", _error: null,
      _metadata: { processed: results.length, refunds_checked: refundsChecked, double_bookings: doubleBookings },
    });
    if (heartbeatSuccessError) throw heartbeatSuccessError;
    return json({ processed: results.length, results, refunds_checked: refundsChecked, double_bookings: doubleBookings });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        await createClient(url, key).rpc("record_booking_worker_heartbeat", {
          _worker_name: "gcal-reconciler", _phase: "error", _error: message, _metadata: {},
        });
      }
    } catch (_) { /* the HTTP failure remains scheduler-visible */ }
    console.error("gcal-reconcile error", { error: message });
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
