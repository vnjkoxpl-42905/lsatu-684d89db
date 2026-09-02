// Admin-only: create / update / delete events on Google Calendar, then mirror to schedule_events.
// Direct Google OAuth via _shared/googleCalendar.ts (no Lovable connector gateway).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { deleteEvent, insertEvent, patchEvent } from "../_shared/googleCalendar.ts";
import { userFromRequest } from "../_shared/authClaims.ts";

interface Body {
  action: "create" | "update" | "delete";
  google_event_id?: string;
  title?: string;
  description?: string;
  location?: string;
  start_at?: string;   // ISO
  end_at?: string;     // ISO
  all_day?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const user = await userFromRequest(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const { data: stateRow } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
    const calendarId = stateRow?.calendar_id || "primary";

    function toGEvent(b: Body) {
      const ev: Record<string, unknown> = {
        summary: b.title ?? "(no title)",
        description: b.description ?? undefined,
        location: b.location ?? undefined,
      };
      if (b.all_day) {
        ev.start = { date: (b.start_at ?? "").slice(0, 10) };
        ev.end = { date: (b.end_at ?? b.start_at ?? "").slice(0, 10) };
      } else {
        ev.start = { dateTime: b.start_at };
        ev.end = { dateTime: b.end_at };
      }
      return ev;
    }

    let g: any = null;

    if (body.action === "create") {
      g = await insertEvent(calendarId, toGEvent(body), { sendUpdates: "none" });
    } else if (body.action === "update") {
      if (!body.google_event_id) throw new Error("google_event_id required");
      g = await patchEvent(calendarId, body.google_event_id, toGEvent(body), { sendUpdates: "none" });
    } else if (body.action === "delete") {
      if (!body.google_event_id) throw new Error("google_event_id required");
      await deleteEvent(calendarId, body.google_event_id, { sendUpdates: "none" });
      await supabase.from("schedule_events")
        .update({ deleted_at: new Date().toISOString(), status: "cancelled" })
        .eq("google_event_id", body.google_event_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("invalid action");
    }

    // Mirror to schedule_events
    const ev = g;
    const isAllDay = !!ev.start?.date;
    const startAt = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00Z` : null);
    const endAt = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00Z` : null);

    await supabase.from("schedule_events").upsert({
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
      source: "lsatu",
      created_by: user.id,
      etag: ev.etag ?? null,
      last_synced_at: new Date().toISOString(),
      deleted_at: null,
    }, { onConflict: "google_event_id" });

    return new Response(JSON.stringify({ ok: true, event: ev }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gcal-event-write error", e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
