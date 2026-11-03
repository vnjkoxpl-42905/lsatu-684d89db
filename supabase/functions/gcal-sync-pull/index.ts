// Pulls Google Calendar events into schedule_events.
// Uses incremental syncToken when available; falls back to time-window.
// Direct Google OAuth via _shared/googleCalendar.ts (no Lovable connector gateway).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { listEvents, meetUrlFromEvent } from "../_shared/googleCalendar.ts";
import { userFromRequest } from "../_shared/authClaims.ts";
import {
  missingSingleSessionCalendarCancellations,
  singleSessionCalendarCancellation,
} from "../_shared/calendarCancellation.ts";

async function wakeSingleSessionOutbox(): Promise<void> {
  const workerSecret = Deno.env.get("BOOKING_WORKER_SECRET");
  if (!workerSecret) throw new Error("booking_worker_secret_not_configured");

  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/single-session-outbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": workerSecret,
    },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`single_session_outbox_${response.status}`);
}

function zonedMidnightIso(dateOnly: string, timeZone: string): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const naive = Date.UTC(year, month - 1, day);
  const offsetAt = (at: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(at);
    const values: Record<string, number> = {};
    for (const part of parts) if (part.type !== "literal") values[part.type] = Number(part.value);
    return Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second) - at.getTime();
  };
  let instant = new Date(naive - offsetAt(new Date(naive)));
  instant = new Date(naive - offsetAt(instant));
  return instant.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: allow admin users, service-role callers, or a single-use
    // scheduler ticket minted server-side (never exposes a key in cron text).
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let authorized = false;
    const ticket = req.headers.get("x-worker-ticket") || "";
    if (/^[0-9a-f-]{36}$/i.test(ticket)) {
      const { data: ticketOk, error: ticketErr } = await supabase.rpc(
        "consume_booking_worker_ticket",
        { _token: ticket, _worker: "gcal-sync-pull" },
      );
      if (ticketErr) console.error("worker ticket check failed", { code: ticketErr.code });
      if (ticketOk === true) authorized = true;
    }
    if (!authorized && token && token === serviceRoleKey) {
      authorized = true;
    } else if (!authorized && token) {
      const user = await userFromRequest(req);
      if (user) {
        const { data: roleRow } = await supabase.from("user_roles")
          .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        if (roleRow) authorized = true;
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { data: stateRow } = await supabase
      .from("gcal_sync_state").select("*").eq("id", 1).maybeSingle();
    const calendarId = stateRow?.calendar_id || "primary";
    let syncToken: string | null = stateRow?.sync_token ?? null;
    const fullTimeMin = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const fullTimeMax = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
    const { data: availabilityConfig } = await supabase.from("booking_availability_config")
      .select("timezone").eq("id", 1).maybeSingle();
    const calendarTimeZone = availabilityConfig?.timezone || "America/Toronto";

    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    let processed = 0;
    let usedFallback = false;
    const errors: string[] = [];
    let reconciledSingleSessions = 0;
    // Every event id Google returned on a full-window pass. A mirrored Google
    // event inside the window that is NOT in this set no longer exists on the
    // calendar (deleted, or a recurring series that was cut short); Google
    // does not send those as `cancelled` on a windowed list, so without this
    // the mirror kept phantom rows that blocked slots for months.
    const seenEventIds = new Set<string>();

    const { error: attemptErr } = await supabase.from("gcal_sync_state")
      .update({ last_attempt_at: new Date().toISOString() }).eq("id", 1);
    if (attemptErr) throw attemptErr;

    do {
      const params: Record<string, string> = syncToken
        ? { singleEvents: "true", maxResults: "250", syncToken }
        : { singleEvents: "true", maxResults: "250", timeMin: fullTimeMin, timeMax: fullTimeMax, orderBy: "startTime" };
      if (pageToken) params.pageToken = pageToken;

      let body: any;
      try {
        body = await listEvents(calendarId, params);
      } catch (err) {
        const status = (err as { status?: number }).status;
        if (status === 410 && syncToken) {
          // syncToken expired — clear and retry full
          syncToken = null;
          pageToken = undefined;
          usedFallback = true;
          const { error: clearErr } = await supabase.from("gcal_sync_state")
            .update({ sync_token: null, sync_token_updated_at: new Date().toISOString() }).eq("id", 1);
          if (clearErr) throw clearErr;
          continue;
        }
        throw err;
      }

      // Permanent per-event failures (stamp points at a deleted redemption) are
      // logged and skipped so one stale event cannot pin the sync token forever.
      const pushReconcileErr = (label: string, eventId: string, err: { message: string; code?: string }) => {
        const permanent = err.code === "P0404" || /redemption_not_found/.test(err.message);
        console.error("gcal-sync-pull reconcile failed", { label, eventId, permanent, error: err.message });
        if (!permanent) errors.push(`${label} ${eventId}: ${err.message}`);
      };
      const items = body.items ?? [];
      for (const ev of items) {
        if (ev.id) seenEventIds.add(String(ev.id));
        const stamp = ev.extendedProperties?.private?.lsatu_redemption_id as string | undefined;
        if (ev.status === "cancelled") {
          const { error: cancelErr } = await supabase.from("schedule_events")
            .update({ deleted_at: new Date().toISOString(), status: "cancelled" })
            .eq("google_event_id", ev.id);
          if (cancelErr) {
            console.error("gcal-sync-pull cancel update failed", { eventId: ev.id, error: cancelErr.message });
            errors.push(`cancel ${ev.id}: ${cancelErr.message}`);
          }
          if (stamp) {
            const { error: reconcileErr } = await supabase.rpc("reconcile_booking_calendar_event", {
              _redemption_id: stamp, _google_event_id: ev.id,
              _start_at: new Date().toISOString(), _end_at: new Date().toISOString(),
              _deleted: true, _meet_url: null,
            });
            if (reconcileErr) pushReconcileErr("reconcile delete", ev.id, reconcileErr);
          }
          const singleSession = singleSessionCalendarCancellation(ev);
          if (singleSession) {
            const { error: singleSessionErr } = await supabase.rpc(
              "reconcile_single_session_calendar_deletion",
              {
                _booking_id: singleSession.bookingId,
                _google_event_id: singleSession.googleEventId,
              },
            );
            if (singleSessionErr) {
              errors.push(`reconcile single-session delete ${ev.id}: ${singleSessionErr.message}`);
            } else reconciledSingleSessions++;
          }
          processed++;
          continue;
        }
        const isAllDay = !!ev.start?.date;
        const eventTimeZone = ev.start?.timeZone || ev.end?.timeZone || calendarTimeZone;
        const startAt = ev.start?.dateTime ?? (ev.start?.date ? zonedMidnightIso(ev.start.date, eventTimeZone) : null);
        const endAt = ev.end?.dateTime ?? (ev.end?.date ? zonedMidnightIso(ev.end.date, eventTimeZone) : null);
        if (!startAt || !endAt) continue;

        const { error: upsertErr } = await supabase.from("schedule_events").upsert({
          google_event_id: ev.id,
          calendar_id: calendarId,
          title: ev.summary ?? "(no title)",
          description: ev.description ?? null,
          location: ev.location ?? null,
          start_at: startAt,
          end_at: endAt,
          all_day: isAllDay,
          transparency: ev.transparency === "transparent" ? "transparent" : "opaque",
          status: ev.status ?? "confirmed",
          html_link: ev.htmlLink ?? null,
          source: "google",
          etag: ev.etag ?? null,
          last_synced_at: new Date().toISOString(),
          deleted_at: null,
          meet_url: meetUrlFromEvent(ev),
        }, { onConflict: "google_event_id" });
        if (upsertErr) {
          console.error("gcal-sync-pull upsert failed", { eventId: ev.id, error: upsertErr.message });
          errors.push(`upsert ${ev.id}: ${upsertErr.message}`);
        }
        if (stamp) {
          const { error: reconcileErr } = await supabase.rpc("reconcile_booking_calendar_event", {
            _redemption_id: stamp, _google_event_id: ev.id,
            _start_at: startAt, _end_at: endAt, _deleted: false,
            _meet_url: meetUrlFromEvent(ev),
          });
          if (reconcileErr) pushReconcileErr("reconcile move", ev.id, reconcileErr);
        }
        processed++;
      }

      pageToken = body.nextPageToken;
      if (!pageToken) nextSyncToken = body.nextSyncToken;
    } while (pageToken);

    // Tombstone mirrored Google events the full-window pass did not return.
    // Only after a clean, complete pass without a sync token (a windowed list),
    // and only rows that came from Google: rows LSAT U wrote itself are owned
    // by their redemption / single-session reconcilers.
    const fullWindowPass = !syncToken && errors.length === 0;
    let tombstoned = 0;
    if (fullWindowPass) {
      const { data: candidates, error: candErr } = await supabase.from("schedule_events")
        .select("id,google_event_id")
        .eq("calendar_id", calendarId)
        .eq("source", "google")
        .is("deleted_at", null)
        .gte("start_at", fullTimeMin)
        .lt("start_at", fullTimeMax);
      if (candErr) {
        errors.push(`tombstone scan: ${candErr.message}`);
      } else {
        const stale = (candidates ?? []).filter((row: any) => !seenEventIds.has(String(row.google_event_id)));
        if (stale.length > 0) {
          const { error: tombErr } = await supabase.from("schedule_events")
            .update({ deleted_at: new Date().toISOString(), status: "cancelled", last_synced_at: new Date().toISOString() })
            .in("id", stale.map((row: any) => row.id));
          if (tombErr) errors.push(`tombstone update: ${tombErr.message}`);
          else tombstoned = stale.length;
        }
      }

      const { data: activeSingleSessions, error: bookingScanErr } = await supabase
        .from("single_session_bookings")
        .select("id,gcal_event_id")
        .eq("status", "booked")
        .not("gcal_event_id", "is", null)
        .gte("start_at", fullTimeMin)
        .lt("start_at", fullTimeMax);
      if (bookingScanErr) {
        errors.push(`single-session tombstone scan: ${bookingScanErr.message}`);
      } else {
        const missingBookings = missingSingleSessionCalendarCancellations(
          activeSingleSessions ?? [],
          seenEventIds,
        );
        for (const missing of missingBookings) {
          const { error: reconcileErr } = await supabase.rpc(
            "reconcile_single_session_calendar_deletion",
            {
              _booking_id: missing.bookingId,
              _google_event_id: missing.googleEventId,
            },
          );
          if (reconcileErr) {
            errors.push(`reconcile missing single-session ${missing.googleEventId}: ${reconcileErr.message}`);
          } else {
            reconciledSingleSessions++;
          }
        }
      }
    }

    // Guard the sync token: only advance if every write succeeded, otherwise
    // keep the old token so the next run retries the same window.
    if (errors.length > 0) {
      console.error("gcal-sync-pull completed with write errors, sync_token NOT advanced", { processed, errorCount: errors.length });
      return new Response(JSON.stringify({ ok: false, processed, errors }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: stateErr } = await supabase.from("gcal_sync_state").update({
      sync_token: nextSyncToken ?? syncToken ?? null,
      sync_token_updated_at: nextSyncToken ? new Date().toISOString() : stateRow?.sync_token_updated_at,
      last_synced_at: new Date().toISOString(),
      last_full_sync_at: usedFallback || !syncToken ? new Date().toISOString() : stateRow?.last_full_sync_at,
    }).eq("id", 1);
    if (stateErr) {
      console.error("gcal-sync-pull final state update failed", stateErr);
      return new Response(JSON.stringify({ ok: false, processed, error: `sync_state update failed: ${stateErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (reconciledSingleSessions > 0) {
      try {
        await wakeSingleSessionOutbox();
      } catch (workerError) {
        console.warn("single-session outbox wake failed; scheduled worker will retry", {
          error: workerError instanceof Error ? workerError.message : String(workerError),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, tombstoned, reconciledSingleSessions, calendarId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gcal-sync-pull error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
