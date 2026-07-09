// Pulls Google Calendar events into schedule_events.
// Uses incremental syncToken when available; falls back to time-window.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    if (!GOOGLE_CALENDAR_API_KEY) throw new Error("GOOGLE_CALENDAR_API_KEY not configured (link Google Calendar connector)");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: allow admin users OR service-role callers (e.g. cron).
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let authorized = false;
    if (token && token === serviceRoleKey) {
      authorized = true;
    } else if (token) {
      const { data: userRes } = await supabase.auth.getUser(token);
      const user = userRes?.user;
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

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_CALENDAR_API_KEY,
    };

    let pageToken: string | undefined;
    let nextSyncToken: string | undefined;
    let processed = 0;
    let usedFallback = false;
    const errors: string[] = [];

    do {
      const params = new URLSearchParams();
      params.set("singleEvents", "true");
      params.set("maxResults", "250");
      if (syncToken && !pageToken) {
        params.set("syncToken", syncToken);
      } else if (!syncToken) {
        const timeMin = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();
        params.set("timeMin", timeMin);
        params.set("timeMax", timeMax);
        params.set("orderBy", "startTime");
      }
      if (pageToken) params.set("pageToken", pageToken);

      const url = `${GATEWAY}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
      const res = await fetch(url, { headers });

      if (res.status === 410 && syncToken) {
        // syncToken expired — clear and retry full
        syncToken = null;
        pageToken = undefined;
        usedFallback = true;
        await supabase.from("gcal_sync_state").update({ sync_token: null }).eq("id", 1);
        continue;
      }

      const body = await res.json();
      if (!res.ok) throw new Error(`Google API ${res.status}: ${JSON.stringify(body)}`);

      const items = body.items ?? [];
      for (const ev of items) {
        if (ev.status === "cancelled") {
          const { error: cancelErr } = await supabase.from("schedule_events")
            .update({ deleted_at: new Date().toISOString(), status: "cancelled" })
            .eq("google_event_id", ev.id);
          if (cancelErr) {
            console.error("gcal-sync-pull cancel update failed", { eventId: ev.id, error: cancelErr.message });
            errors.push(`cancel ${ev.id}: ${cancelErr.message}`);
          }
          processed++;
          continue;
        }
        const isAllDay = !!ev.start?.date;
        const startAt = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
        const endAt = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null);
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
          status: ev.status ?? "confirmed",
          html_link: ev.htmlLink ?? null,
          source: "google",
          etag: ev.etag ?? null,
          last_synced_at: new Date().toISOString(),
          deleted_at: null,
        }, { onConflict: "google_event_id" });
        if (upsertErr) {
          console.error("gcal-sync-pull upsert failed", { eventId: ev.id, error: upsertErr.message });
          errors.push(`upsert ${ev.id}: ${upsertErr.message}`);
        }
        processed++;
      }

      pageToken = body.nextPageToken;
      if (!pageToken) nextSyncToken = body.nextSyncToken;
    } while (pageToken);

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
      last_synced_at: new Date().toISOString(),
      last_full_sync_at: usedFallback || !syncToken ? new Date().toISOString() : stateRow?.last_full_sync_at,
    }).eq("id", 1);
    if (stateErr) {
      console.error("gcal-sync-pull final state update failed", stateErr);
      return new Response(JSON.stringify({ ok: false, processed, error: `sync_state update failed: ${stateErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, processed, calendarId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gcal-sync-pull error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
