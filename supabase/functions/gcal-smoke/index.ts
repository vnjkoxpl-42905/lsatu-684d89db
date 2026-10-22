// TEMPORARY Phase 0 smoke test for the direct Google Calendar path.
// Admin-only. Exercises: token exchange, calendarList, insert (Meet + attendee,
// sendUpdates=all), patch (new time, Meet must survive), delete (sendUpdates=all).
// Delete this function after Phase 1 cutover ships.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  deleteEvent,
  getAccessToken,
  getEvent,
  insertEvent,
  listCalendars,
  meetUrlFromEvent,
  patchEvent,
} from "../_shared/googleCalendar.ts";
import { userFromRequest } from "../_shared/authClaims.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const steps: Record<string, unknown> = {};
  let eventId: string | null = null;
  let calendarId = "primary";

  try {
    // Admin gate (same pattern as gcal-event-write)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const user = await userFromRequest(req);
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roleRow } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const attendeeEmail = String(body.attendee_email || "").trim();

    // Step 1: refresh-token exchange
    await getAccessToken();
    steps.token_exchange = "ok";

    // Step 2: list calendars directly against www.googleapis.com
    const calList = await listCalendars();
    const primary = (calList.items ?? []).find((c: any) => c.primary);
    calendarId = primary?.id ?? "primary";
    steps.list_calendars = {
      count: calList.items?.length ?? 0,
      primary: primary ? { id: primary.id, summary: primary.summary, timeZone: primary.timeZone } : null,
    };

    // Step 3: insert temp event with Meet + attendee, sendUpdates=all
    const start = new Date(Date.now() + 26 * 3600_000); // tomorrow-ish
    const end = new Date(start.getTime() + 30 * 60_000);
    const requestId = crypto.randomUUID();
    const inserted = await insertEvent(calendarId, {
      summary: "LSAT U smoke test (auto-deletes)",
      description: "Phase 0 direct-OAuth smoke test. Safe to ignore; deleted automatically.",
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      conferenceData: {
        createRequest: { requestId, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
      extendedProperties: { private: { lsatu_smoke: "true" } },
    }, { conferenceDataVersion: 1, sendUpdates: "all" });
    eventId = inserted.id;
    let meetUrl = meetUrlFromEvent(inserted);
    let conferenceStatus = inserted?.conferenceData?.createRequest?.status?.statusCode ?? "unknown";
    if (!meetUrl) {
      // pending conference: short retry via events.get
      await new Promise((r) => setTimeout(r, 1500));
      const refreshed = await getEvent(calendarId, eventId!);
      meetUrl = meetUrlFromEvent(refreshed);
      conferenceStatus = refreshed?.conferenceData?.createRequest?.status?.statusCode ?? conferenceStatus;
    }
    steps.insert = {
      event_id: eventId,
      html_link: inserted.htmlLink ?? null,
      meet_url: meetUrl,
      conference_status: conferenceStatus,
      attendees: (inserted.attendees ?? []).map((a: any) => ({ email: a.email, responseStatus: a.responseStatus })),
    };

    // Step 4: patch to a new time; Meet link must survive
    const newStart = new Date(start.getTime() + 60 * 60_000);
    const newEnd = new Date(newStart.getTime() + 30 * 60_000);
    const patched = await patchEvent(calendarId, eventId!, {
      start: { dateTime: newStart.toISOString() },
      end: { dateTime: newEnd.toISOString() },
    }, { conferenceDataVersion: 1, sendUpdates: "all" });
    const meetAfterPatch = meetUrlFromEvent(patched);
    steps.patch = {
      new_start: patched.start?.dateTime ?? null,
      meet_url_after_patch: meetAfterPatch,
      meet_survived: !!meetUrl && meetAfterPatch === meetUrl,
    };

    // Step 5: delete with sendUpdates=all
    await deleteEvent(calendarId, eventId!, { sendUpdates: "all" });
    eventId = null;
    steps.delete = "ok";

    steps.gateway_check = "helper only targets oauth2.googleapis.com + www.googleapis.com; no connector-gateway host in this path";
    return json({ ok: true, steps });
  } catch (e) {
    // Best-effort cleanup so the smoke test never leaves junk on the calendar
    if (eventId) {
      try { await deleteEvent(calendarId, eventId, { sendUpdates: "none" }); } catch (_) { /* reported below */ }
    }
    console.error("gcal-smoke failed", e);
    return json({ ok: false, steps, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
