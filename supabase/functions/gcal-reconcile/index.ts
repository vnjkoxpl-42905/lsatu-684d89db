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
// Trigger: cron (see below) or manual POST. Service-role only in practice; it
// reads secrets and calls Google directly.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getEvent, insertEvent, listEvents, meetUrlFromEvent } from "../_shared/googleCalendar.ts";

const MAX_ATTEMPTS = 5;
const LEASE_SECONDS = 120;
const STALE_SECONDS = 120; // only touch rows pending longer than this

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - STALE_SECONDS * 1000).toISOString();
    const leaseUntil = new Date(Date.now() + LEASE_SECONDS * 1000).toISOString();

    // Fetch candidate pending rows whose lease is free/expired.
    const { data: candidates } = await supabase
      .from("booking_pass_redemptions")
      .select("id,booking_pass_id,start_at,end_at,idempotency_key,gcal_attempts,student_name_snapshot,student_email_snapshot")
      .eq("gcal_state", "pending")
      .lt("updated_at", staleCutoff)
      .or(`gcal_lease_until.is.null,gcal_lease_until.lt.${nowIso}`)
      .limit(25);

    const { data: stateRow } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
    const calendarId = stateRow?.calendar_id || "primary";

    const results: { id: string; outcome: string }[] = [];

    for (const row of candidates ?? []) {
      // 1) CLAIM the lease (conditional: only if still free/expired). If another
      //    worker grabbed it between our read and here, this updates 0 rows.
      const { data: claimed } = await supabase
        .from("booking_pass_redemptions")
        .update({ gcal_lease_until: leaseUntil, gcal_attempts: (row.gcal_attempts ?? 0) + 1 })
        .eq("id", row.id)
        .eq("gcal_state", "pending")
        .or(`gcal_lease_until.is.null,gcal_lease_until.lt.${nowIso}`)
        .select("id")
        .maybeSingle();
      if (!claimed) { results.push({ id: row.id, outcome: "not_claimed" }); continue; }

      try {
        // 2) SEARCH Google by the stamp to adopt an already-created event.
        let event: any = null;
        try {
          const found = await listEvents(calendarId, {
            privateExtendedProperty: `lsatu_idempotency_key=${row.idempotency_key}`,
            maxResults: "1", showDeleted: "false",
          });
          event = found?.items?.[0] ?? null;
        } catch (_) { /* fall through to create */ }

        // 3) CREATE if not found.
        if (!event) {
          const name = row.student_name_snapshot || "Student";
          const email = row.student_email_snapshot || null;
          event = await insertEvent(calendarId, {
            summary: `LSAT session — ${name}`,
            description: `Booked via LSAT U (reconciled).`,
            start: { dateTime: new Date(row.start_at).toISOString() },
            end: { dateTime: new Date(row.end_at).toISOString() },
            conferenceData: { createRequest: { requestId: row.idempotency_key, conferenceSolutionKey: { type: "hangoutsMeet" } } },
            attendees: email ? [{ email }] : undefined,
            extendedProperties: { private: { lsatu_redemption_id: row.id, lsatu_idempotency_key: row.idempotency_key, lsatu_pass_id: row.booking_pass_id } },
          }, { conferenceDataVersion: 1, sendUpdates: email ? "all" : "none" });
        }

        let meetUrl = meetUrlFromEvent(event);
        if (!meetUrl && event?.id) {
          try { meetUrl = meetUrlFromEvent(await getEvent(calendarId, event.id)); } catch (_) { /* non-fatal */ }
        }

        // Mirror schedule_events (best-effort).
        const { data: se } = await supabase.from("schedule_events").upsert({
          google_event_id: event.id, calendar_id: calendarId,
          title: `LSAT session — ${row.student_name_snapshot || "Student"}`,
          start_at: new Date(row.start_at).toISOString(), end_at: new Date(row.end_at).toISOString(),
          all_day: false, status: event.status ?? "confirmed", html_link: event.htmlLink ?? null,
          meet_url: meetUrl, source: "booking_pass", etag: event.etag ?? null,
          last_synced_at: new Date().toISOString(), deleted_at: null,
        }, { onConflict: "google_event_id" }).select().maybeSingle();

        // 4) PERSIST + clear pending/lease.
        await supabase.from("booking_pass_redemptions").update({
          google_event_id: event.id, meet_url: meetUrl, schedule_event_id: se?.id ?? null,
          gcal_state: "synced", needs_gcal_sync: false, gcal_error: null, gcal_lease_until: null,
        }).eq("id", row.id);

        results.push({ id: row.id, outcome: event ? "synced" : "created" });
      } catch (err) {
        const attempts = (row.gcal_attempts ?? 0) + 1;
        const terminal = attempts >= MAX_ATTEMPTS;
        await supabase.from("booking_pass_redemptions").update({
          gcal_state: terminal ? "failed" : "pending",
          gcal_error: err instanceof Error ? err.message : String(err),
          gcal_lease_until: null,
        }).eq("id", row.id);
        results.push({ id: row.id, outcome: terminal ? "failed_terminal" : "retry_later" });
      }
    }

    return json({ processed: results.length, results });
  } catch (e) {
    console.error("gcal-reconcile error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
