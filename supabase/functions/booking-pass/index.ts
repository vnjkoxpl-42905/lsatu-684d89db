// Public, token-gated booking pass endpoint.
// Actions: info | slots | book
// Direct Google OAuth via _shared/googleCalendar.ts (no Lovable connector gateway).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  deleteEvent,
  freeBusy,
  getEvent,
  insertEvent,
  meetUrlFromEvent,
  patchEvent,
} from "../_shared/googleCalendar.ts";

const BUSINESS_START_HOUR = 9;   // local
const BUSINESS_END_HOUR = 20;    // local
const DEFAULT_LOOKAHEAD_DAYS = 21;
const SLOT_LEAD_MINUTES = 60;    // no booking within the next hour

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function studentLabel(pass: { student_name: string | null; student_email: string | null }): string {
  return pass.student_name?.trim() || pass.student_email?.trim() || "Student";
}

function publicPass(pass: any) {
  return {
    id: pass.id,
    status: pass.status,
    total_credits: pass.total_credits,
    used_credits: pass.used_credits,
    credits_remaining: Math.max(0, pass.total_credits - pass.used_credits),
    session_length_minutes: pass.session_length_minutes,
    expires_at: pass.expires_at,
    student_label: studentLabel(pass),
    student_name: pass.student_name,
    student_email: pass.student_email,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const rawToken = String(body.token || "");
    if (!rawToken || rawToken.length < 16) return json({ error: "invalid_token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const tokenHash = await sha256Hex(rawToken);
    const { data: pass, error: passErr } = await supabase
      .from("booking_passes").select("*").eq("token_hash", tokenHash).maybeSingle();
    if (passErr) throw passErr;
    if (!pass) return json({ error: "invalid_token" }, 404);

    // Auto-expire on read
    if (pass.status === "active" && pass.expires_at && new Date(pass.expires_at) < new Date()) {
      await supabase.from("booking_passes").update({ status: "expired" }).eq("id", pass.id);
      pass.status = "expired";
    }
    if (pass.status === "active" && pass.used_credits >= pass.total_credits) {
      await supabase.from("booking_passes").update({ status: "exhausted" }).eq("id", pass.id);
      pass.status = "exhausted";
    }

    if (action === "info") {
      const { data: history } = await supabase
        .from("booking_pass_redemptions")
        .select("id,start_at,end_at,status,google_event_id,meet_url,created_at")
        .eq("booking_pass_id", pass.id)
        .order("start_at", { ascending: true });
      return json({ pass: publicPass(pass), history: history ?? [] });
    }

    if (action === "slots") {
      if (pass.status !== "active") return json({ pass: publicPass(pass), slots: [] });

      const sessionMs = pass.session_length_minutes * 60_000;
      const now = new Date();
      const rangeStart = new Date(now.getTime() + SLOT_LEAD_MINUTES * 60_000);
      const daysAhead = Math.min(Math.max(Number(body.days_ahead) || DEFAULT_LOOKAHEAD_DAYS, 1), 60);
      let rangeEnd = new Date(now.getTime() + daysAhead * 86_400_000);
      if (pass.expires_at && new Date(pass.expires_at) < rangeEnd) rangeEnd = new Date(pass.expires_at);

      const { data: events } = await supabase
        .from("schedule_events")
        .select("start_at,end_at")
        .is("deleted_at", null)
        .neq("status", "cancelled")
        .lt("start_at", rangeEnd.toISOString())
        .gt("end_at", rangeStart.toISOString());

      const busy = (events ?? []).map(e => ({
        start: new Date(e.start_at).getTime(),
        end: new Date(e.end_at).getTime(),
      }));

      // Include existing booked redemptions from this pass as busy too (defensive)
      const { data: myBookings } = await supabase
        .from("booking_pass_redemptions")
        .select("start_at,end_at")
        .eq("booking_pass_id", pass.id)
        .eq("status", "booked");
      for (const r of myBookings ?? []) {
        busy.push({ start: new Date(r.start_at).getTime(), end: new Date(r.end_at).getTime() });
      }

      const slots: { start_at: string; end_at: string }[] = [];
      // iterate day by day in the client's implied local by using UTC hours -- keep simple, use viewer TZ hint
      const tzOffsetMinutes = Number(body.tz_offset_minutes) || 0; // minutes east of UTC provided by client
      const dayMs = 86_400_000;
      const firstDay = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()));
      for (let d = 0; d <= daysAhead; d++) {
        const dayStartUtc = new Date(firstDay.getTime() + d * dayMs);
        // Business window in viewer's local time -> UTC:
        // localHour X == UTC minute (X*60 - tzOffsetMinutes)
        const winStart = new Date(dayStartUtc.getTime() + (BUSINESS_START_HOUR * 60 - tzOffsetMinutes) * 60_000);
        const winEnd = new Date(dayStartUtc.getTime() + (BUSINESS_END_HOUR * 60 - tzOffsetMinutes) * 60_000);
        for (let t = winStart.getTime(); t + sessionMs <= winEnd.getTime(); t += sessionMs) {
          if (t < rangeStart.getTime()) continue;
          if (t + sessionMs > rangeEnd.getTime()) break;
          const conflict = busy.some(b => b.start < t + sessionMs && b.end > t);
          if (!conflict) {
            slots.push({
              start_at: new Date(t).toISOString(),
              end_at: new Date(t + sessionMs).toISOString(),
            });
          }
          if (slots.length >= 200) break;
        }
        if (slots.length >= 200) break;
      }
      return json({ pass: publicPass(pass), slots });
    }

    if (action === "book") {
      if (pass.status !== "active") return json({ error: `pass_${pass.status}` }, 409);

      const startAt = new Date(String(body.start_at || ""));
      if (isNaN(startAt.getTime())) return json({ error: "invalid_start_at" }, 400);
      const endAt = new Date(startAt.getTime() + pass.session_length_minutes * 60_000);
      const idem = String(body.idempotency_key || "");
      if (!idem || idem.length < 8) return json({ error: "invalid_idempotency_key" }, 400);
      if (startAt.getTime() < Date.now() + SLOT_LEAD_MINUTES * 60_000) return json({ error: "slot_too_soon" }, 400);
      if (pass.expires_at && endAt > new Date(pass.expires_at)) return json({ error: "past_expiration" }, 400);

      // Short-circuit: if this idempotency key already succeeded, return it.
      const { data: existing } = await supabase
        .from("booking_pass_redemptions")
        .select("*")
        .eq("booking_pass_id", pass.id)
        .eq("idempotency_key", idem)
        .maybeSingle();
      if (existing) {
        return json({ ok: true, redemption: existing, pass: publicPass(pass), was_existing: true });
      }

      const { data: stateRow } = await supabase
        .from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
      const calendarId = stateRow?.calendar_id || "primary";

      // Live freeBusy conflict check (audit A5): catches events added directly in
      // Google that the schedule_events mirror has not synced yet.
      try {
        const fb = await freeBusy([calendarId], startAt.toISOString(), endAt.toISOString());
        const busy = fb[calendarId] ?? [];
        const overlaps = busy.some((b) =>
          new Date(b.start).getTime() < endAt.getTime() && new Date(b.end).getTime() > startAt.getTime()
        );
        if (overlaps) return json({ error: "slot_conflict" }, 409);
      } catch (fbErr) {
        console.error("freeBusy check failed (continuing to DB re-check)", fbErr);
      }

      const label = studentLabel(pass);
      const description = [
        "Booked via LSAT U.",
        pass.student_email ? `Student: ${label} <${pass.student_email}>` : `Student: ${label}`,
        `Session ${pass.used_credits + 1} of ${pass.total_credits}`,
      ].join("\n");

      // 1) Insert the Google event WITH a Meet conference but WITHOUT attendees
      //    (audit A4: no invite email is sent until the credit is safely redeemed).
      let gEvent: any;
      try {
        gEvent = await insertEvent(calendarId, {
          summary: `LSAT session — ${label}`,
          description,
          start: { dateTime: startAt.toISOString() },
          end: { dateTime: endAt.toISOString() },
          conferenceData: {
            createRequest: { requestId: idem, conferenceSolutionKey: { type: "hangoutsMeet" } },
          },
          extendedProperties: { private: { lsatu_pass_id: pass.id } },
        }, { conferenceDataVersion: 1, sendUpdates: "none" });
      } catch (gErr) {
        console.error("google insert failed", gErr);
        return json({ error: "google_create_failed", details: gErr instanceof Error ? gErr.message : String(gErr) }, 502);
      }

      // Best-effort Meet URL (audit B2/pending rule): retry once if the conference is still pending.
      let meetUrl = meetUrlFromEvent(gEvent);
      if (!meetUrl) {
        try {
          await new Promise((r) => setTimeout(r, 1200));
          const refreshed = await getEvent(calendarId, gEvent.id);
          meetUrl = meetUrlFromEvent(refreshed);
        } catch (_) { /* non-fatal; booking still confirms, link backfills on sync */ }
      }

      // Mirror to schedule_events
      const { data: se, error: seErr } = await supabase
        .from("schedule_events")
        .upsert({
          google_event_id: gEvent.id,
          calendar_id: calendarId,
          title: `LSAT session — ${label}`,
          description,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          all_day: false,
          status: gEvent.status ?? "confirmed",
          html_link: gEvent.htmlLink ?? null,
          meet_url: meetUrl,
          source: "booking_pass",
          etag: gEvent.etag ?? null,
          last_synced_at: new Date().toISOString(),
          deleted_at: null,
        }, { onConflict: "google_event_id" })
        .select()
        .maybeSingle();
      if (seErr) console.error("schedule_events upsert failed", seErr);

      // 2) Atomic redeem (the credit debit + slot re-check)
      const { data: rpc, error: rpcErr } = await supabase.rpc("redeem_booking_pass", {
        _pass_id: pass.id,
        _idempotency_key: idem,
        _start_at: startAt.toISOString(),
        _end_at: endAt.toISOString(),
        _schedule_event_id: se?.id ?? null,
        _google_event_id: gEvent.id,
        _student_name: pass.student_name,
        _student_email: pass.student_email,
      });

      if (rpcErr) {
        // Roll back the attendee-less, un-emailed Google event + mirror.
        try {
          await deleteEvent(calendarId, gEvent.id, { sendUpdates: "none" });
          if (se?.id) {
            await supabase.from("schedule_events")
              .update({ deleted_at: new Date().toISOString(), status: "cancelled" })
              .eq("id", se.id);
          }
        } catch (rollbackErr) {
          console.error("rollback failed", rollbackErr);
        }
        console.error("redeem failed", rpcErr);
        const msg = String(rpcErr.message || "");
        const code = msg.includes("pass_exhausted") ? "pass_exhausted"
          : msg.includes("pass_expired") ? "pass_expired"
          : msg.includes("slot_conflict") || msg.includes("no_overlapping_bookings") ? "slot_conflict"
          : "redeem_failed";
        return json({ error: code, details: msg }, 409);
      }

      const row = Array.isArray(rpc) ? rpc[0] : rpc;
      const redemptionId = row?.redemption_id;

      // 3) Now that the credit is safely debited, patch the event to add the student
      //    as an attendee and send the invite + Meet link (audit A4: sendUpdates=all here only).
      if (pass.student_email) {
        try {
          const patched = await patchEvent(calendarId, gEvent.id, {
            attendees: [{ email: pass.student_email }],
            extendedProperties: { private: { lsatu_pass_id: pass.id, lsatu_redemption_id: redemptionId } },
          }, { conferenceDataVersion: 1, sendUpdates: "all" });
          const patchedMeet = meetUrlFromEvent(patched);
          if (patchedMeet) meetUrl = patchedMeet;
        } catch (patchErr) {
          // Booking is already confirmed; the invite is best-effort. Log and continue.
          console.error("attendee patch failed (booking still confirmed)", patchErr);
        }
      }

      // Persist the Meet URL on the redemption (and refresh the mirror if it changed).
      if (redemptionId && meetUrl) {
        await supabase.from("booking_pass_redemptions").update({ meet_url: meetUrl }).eq("id", redemptionId);
        if (se?.id) await supabase.from("schedule_events").update({ meet_url: meetUrl }).eq("id", se.id);
      }

      const { data: freshPass } = await supabase
        .from("booking_passes").select("*").eq("id", pass.id).maybeSingle();

      return json({
        ok: true,
        pass: publicPass(freshPass ?? pass),
        redemption: {
          id: redemptionId,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          google_event_id: gEvent.id,
          html_link: gEvent.htmlLink ?? null,
          meet_url: meetUrl,
          status: "booked",
        },
        was_existing: !!row?.was_existing,
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("booking-pass error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
