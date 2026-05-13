// Admin-only: create / update / delete events on Google Calendar, then mirror to schedule_events.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_CALENDAR_API_KEY = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
    if (!LOVABLE_API_KEY || !GOOGLE_CALENDAR_API_KEY) {
      throw new Error("Missing connector credentials");
    }

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
    const { data: userRes } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = userRes?.user;
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

    const headers = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_CALENDAR_API_KEY,
      "Content-Type": "application/json",
    };

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

    let res: Response;
    let g: Record<string, unknown> | null = null;

    if (body.action === "create") {
      res = await fetch(`${GATEWAY}/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: "POST", headers, body: JSON.stringify(toGEvent(body)),
      });
      g = await res.json();
      if (!res.ok) throw new Error(`Google create ${res.status}: ${JSON.stringify(g)}`);
    } else if (body.action === "update") {
      if (!body.google_event_id) throw new Error("google_event_id required");
      res = await fetch(`${GATEWAY}/calendars/${encodeURIComponent(calendarId)}/events/${body.google_event_id}`, {
        method: "PATCH", headers, body: JSON.stringify(toGEvent(body)),
      });
      g = await res.json();
      if (!res.ok) throw new Error(`Google update ${res.status}: ${JSON.stringify(g)}`);
    } else if (body.action === "delete") {
      if (!body.google_event_id) throw new Error("google_event_id required");
      res = await fetch(`${GATEWAY}/calendars/${encodeURIComponent(calendarId)}/events/${body.google_event_id}`, {
        method: "DELETE", headers,
      });
      if (!res.ok && res.status !== 410) {
        const t = await res.text();
        throw new Error(`Google delete ${res.status}: ${t}`);
      }
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
    const ev = g as any;
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
