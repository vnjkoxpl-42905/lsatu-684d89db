// Authenticated student booking endpoint (phase 1: info | slots | book).
// Identity is ALWAYS the verified JWT user; the function never trusts a
// caller-supplied pass_id / student_id / email / name. Uses the service-role
// key ONLY after authenticating, and scopes every read/write to auth.uid().
//
// Reschedule is a later phase and intentionally NOT implemented here yet.
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

const BUSINESS_START_HOUR = 9;   // local (viewer tz)
const BUSINESS_END_HOUR = 20;    // local
const DEFAULT_LOOKAHEAD_DAYS = 21;
const SLOT_LEAD_MINUTES = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ActivePass = {
  id: string;
  status: string;
  total_credits: number;
  used_credits: number;
  credits_remaining: number;
  session_length_minutes: number;
  expires_at: string | null;
};

// Resolve the caller's active booking pass row (full row) by verified auth id.
async function activePassRow(supabase: any, userId: string) {
  const { data } = await supabase
    .from("booking_passes")
    .select("*")
    .eq("student_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // --- Auth: verify the JWT and derive identity from it, nothing else. ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.slice(7);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabase.auth.getUser(jwt);
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const userId = user.id;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ------------------------------------------------------------------ info
    if (action === "info") {
      const { data, error } = await supabase.rpc("get_student_booking", {
        _auth_user_id: userId,
      });
      if (error) {
        console.error("get_student_booking failed", error);
        return json({
          error: "info_failed",
          details: error.message ?? String(error),
          code: (error as { code?: string }).code ?? null,
          hint: (error as { hint?: string }).hint ?? null,
        }, 500);
      }
      return json(data ?? { pass: null, redemptions: [] });
    }

    // The remaining actions need an active pass.
    const pass = await activePassRow(supabase, userId);

    // ----------------------------------------------------------------- slots
    if (action === "slots") {
      if (!pass) return json({ pass: null, slots: [] });

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

      const busy = (events ?? []).map((e: any) => ({
        start: new Date(e.start_at).getTime(),
        end: new Date(e.end_at).getTime(),
      }));

      const tzOffsetMinutes = Number(body.tz_offset_minutes) || 0;
      const dayMs = 86_400_000;
      const firstDay = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate()));
      const slots: { start_at: string; end_at: string }[] = [];
      for (let d = 0; d <= daysAhead; d++) {
        const dayStartUtc = new Date(firstDay.getTime() + d * dayMs);
        const winStart = new Date(dayStartUtc.getTime() + (BUSINESS_START_HOUR * 60 - tzOffsetMinutes) * 60_000);
        const winEnd = new Date(dayStartUtc.getTime() + (BUSINESS_END_HOUR * 60 - tzOffsetMinutes) * 60_000);
        for (let t = winStart.getTime(); t + sessionMs <= winEnd.getTime(); t += sessionMs) {
          if (t < rangeStart.getTime()) continue;
          if (t + sessionMs > rangeEnd.getTime()) break;
          const conflict = busy.some((b: any) => b.start < t + sessionMs && b.end > t);
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
      return json({
        pass: {
          credits_remaining: Math.max(0, pass.total_credits - pass.used_credits),
          session_length_minutes: pass.session_length_minutes,
        },
        slots,
      });
    }

    // ------------------------------------------------------------------ book
    if (action === "book") {
      if (!pass) return json({ error: "no_active_pass" }, 409);

      const startAt = new Date(String(body.start_at || ""));
      if (isNaN(startAt.getTime())) return json({ error: "invalid_start_at" }, 400);
      const endAt = new Date(startAt.getTime() + pass.session_length_minutes * 60_000);
      const idem = String(body.idempotency_key || "");
      if (!idem || idem.length < 8) return json({ error: "invalid_idempotency_key" }, 400);
      if (startAt.getTime() < Date.now() + SLOT_LEAD_MINUTES * 60_000) return json({ error: "slot_too_soon" }, 400);
      if (pass.expires_at && endAt > new Date(pass.expires_at)) return json({ error: "past_expiration" }, 400);

      // Idempotency short-circuit.
      const { data: existing } = await supabase
        .from("booking_pass_redemptions")
        .select("*")
        .eq("booking_pass_id", pass.id)
        .eq("idempotency_key", idem)
        .maybeSingle();
      if (existing) {
        return json({ ok: true, redemption: existing, was_existing: true });
      }

      // Identity from the verified auth user, never from the client.
      const studentEmail = user.email ?? null;
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const studentName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        pass.student_name ||
        studentEmail ||
        "Student";

      const { data: stateRow } = await supabase
        .from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
      const calendarId = stateRow?.calendar_id || "primary";

      // Live freeBusy conflict check.
      try {
        const fb = await freeBusy([calendarId], startAt.toISOString(), endAt.toISOString());
        const fbBusy = fb[calendarId] ?? [];
        const overlaps = fbBusy.some((b) =>
          new Date(b.start).getTime() < endAt.getTime() && new Date(b.end).getTime() > startAt.getTime()
        );
        if (overlaps) return json({ error: "slot_conflict" }, 409);
      } catch (fbErr) {
        console.error("freeBusy check failed (continuing to DB re-check)", fbErr);
      }

      const description = [
        "Booked via LSAT U.",
        studentEmail ? `Student: ${studentName} <${studentEmail}>` : `Student: ${studentName}`,
        `Session ${pass.used_credits + 1} of ${pass.total_credits}`,
      ].join("\n");

      // 1) Insert the Google event WITH a Meet conference but WITHOUT attendees
      //    (no invite email until the credit is safely redeemed).
      let gEvent: any;
      try {
        gEvent = await insertEvent(calendarId, {
          summary: `LSAT session — ${studentName}`,
          description,
          start: { dateTime: startAt.toISOString() },
          end: { dateTime: endAt.toISOString() },
          conferenceData: {
            createRequest: { requestId: idem, conferenceSolutionKey: { type: "hangoutsMeet" } },
          },
          extendedProperties: { private: { lsatu_pass_id: pass.id, lsatu_student_id: userId } },
        }, { conferenceDataVersion: 1, sendUpdates: "none" });
      } catch (gErr) {
        console.error("google insert failed", gErr);
        return json({ error: "google_create_failed", details: gErr instanceof Error ? gErr.message : String(gErr) }, 502);
      }

      let meetUrl = meetUrlFromEvent(gEvent);
      if (!meetUrl) {
        try {
          await new Promise((r) => setTimeout(r, 1200));
          const refreshed = await getEvent(calendarId, gEvent.id);
          meetUrl = meetUrlFromEvent(refreshed);
        } catch (_) { /* non-fatal */ }
      }

      // Mirror to schedule_events.
      const { data: se, error: seErr } = await supabase
        .from("schedule_events")
        .upsert({
          google_event_id: gEvent.id,
          calendar_id: calendarId,
          title: `LSAT session — ${studentName}`,
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

      // 2) Atomic redeem (credit debit + slot re-check).
      const { data: rpc, error: rpcErr } = await supabase.rpc("redeem_booking_pass", {
        _pass_id: pass.id,
        _idempotency_key: idem,
        _start_at: startAt.toISOString(),
        _end_at: endAt.toISOString(),
        _schedule_event_id: se?.id ?? null,
        _google_event_id: gEvent.id,
        _student_name: studentName,
        _student_email: studentEmail,
      });

      if (rpcErr) {
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
        const msg = String(rpcErr.message || "");
        const code = msg.includes("pass_exhausted") ? "pass_exhausted"
          : msg.includes("pass_expired") ? "pass_expired"
          : msg.includes("pass_not_active") ? "pass_not_active"
          : msg.includes("slot_conflict") || msg.includes("no_overlapping_bookings") ? "slot_conflict"
          : "redeem_failed";
        return json({ error: code, details: msg }, 409);
      }

      const row = Array.isArray(rpc) ? rpc[0] : rpc;
      const redemptionId = row?.redemption_id;

      // 3) Add the student as attendee + send the invite (only now).
      if (studentEmail) {
        try {
          const patched = await patchEvent(calendarId, gEvent.id, {
            attendees: [{ email: studentEmail }],
            extendedProperties: { private: { lsatu_pass_id: pass.id, lsatu_redemption_id: redemptionId, lsatu_student_id: userId } },
          }, { conferenceDataVersion: 1, sendUpdates: "all" });
          const patchedMeet = meetUrlFromEvent(patched);
          if (patchedMeet) meetUrl = patchedMeet;
        } catch (patchErr) {
          console.error("attendee patch failed (booking still confirmed)", patchErr);
        }
      }

      if (redemptionId && meetUrl) {
        await supabase.from("booking_pass_redemptions").update({ meet_url: meetUrl }).eq("id", redemptionId);
        if (se?.id) await supabase.from("schedule_events").update({ meet_url: meetUrl }).eq("id", se.id);
      }

      // Confirmation emails to BOTH the student and the admin (best-effort;
      // booking is already committed regardless of email outcome).
      const whenText = startAt.toLocaleString("en-US", {
        weekday: "long", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", timeZoneName: "short",
      });
      const adminEmail = Deno.env.get("BOOKING_ADMIN_EMAIL") || "contact@aspiringattorneys.com";
      const sendConfirmation = async (recipientEmail: string, recipientRole: "student" | "admin") => {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              templateName: "booking-confirmation",
              recipientEmail,
              idempotencyKey: `booking-${redemptionId}-${recipientRole}`.slice(0, 200),
              templateData: {
                recipientRole,
                studentName,
                studentEmail,
                whenText,
                durationMinutes: pass.session_length_minutes,
                meetUrl,
              },
            }),
          });
        } catch (mailErr) {
          console.error(`confirmation email to ${recipientRole} failed`, mailErr);
        }
      };
      if (studentEmail) await sendConfirmation(studentEmail, "student");
      if (adminEmail) await sendConfirmation(adminEmail, "admin");

      return json({
        ok: true,
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
    console.error("student-booking error", e);
    const msg = e instanceof Error
      ? e.message
      : (e && typeof e === "object" && "message" in e)
        ? String((e as { message: unknown }).message)
        : JSON.stringify(e);
    return json({ error: msg }, 500);
  }
});
