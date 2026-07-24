// Authenticated student booking endpoint (info | slots | book).
// Identity is ALWAYS the verified JWT user; the function never trusts a
// caller-supplied pass_id / student_id / email / name. Routes through the
// shared bookingCore so the public (slug) and authed (JWT) paths behave
// identically — only the front-door identity resolution differs.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  deleteEvent, freeBusy, getEvent, insertEvent, meetUrlFromEvent, patchEvent,
} from "../_shared/googleCalendar.ts";
import {
  bookSession, BOOKING_CFG, generateSlots, loadBusyIntervals, parseAvailability, type BookingPass, type GoogleCal,
} from "../_shared/bookingCore.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const gcal: GoogleCal = { insertEvent, patchEvent, getEvent, deleteEvent, freeBusy, meetUrlFromEvent };

async function activePassRow(supabase: any, userId: string): Promise<BookingPass | null> {
  const { data } = await supabase
    .from("booking_passes").select("*")
    .eq("student_id", userId).eq("status", "active")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.slice(7);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify JWT via getClaims (compatible with the new signing-keys system,
    // which breaks the legacy getUser(jwt) path with "missing sub claim").
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(jwt);
    if (claimsErr || !claimsData?.claims?.sub) {
      console.error("student-booking auth failed", claimsErr);
      return json({ error: "unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string | undefined) ?? null;
    const userMeta = ((claimsData.claims.user_metadata ?? {}) as Record<string, unknown>);
    const user = { id: userId, email: userEmail, user_metadata: userMeta };

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");

    // ------------------------------------------------------------------- info
    if (action === "info") {
      const { data, error } = await supabase.rpc("get_student_booking", { _auth_user_id: userId });
      if (error) {
        console.error("get_student_booking failed", error);
        return json({ error: "info_failed", details: error.message ?? String(error) }, 500);
      }
      return json(data ?? { pass: null, redemptions: [] });
    }

    const pass = await activePassRow(supabase, userId);

    // ------------------------------------------------------------------ slots
    if (action === "slots") {
      if (!pass) return json({ pass: null, slots: [] });
      if (pass.total_credits - pass.used_credits <= 0) {
        return json({ pass: { credits_remaining: 0, session_length_minutes: pass.session_length_minutes }, slots: [] });
      }
      const daysAhead = Math.min(Math.max(Number(body.days_ahead) || BOOKING_CFG.lookaheadDaysDefault, 1), 60);
      const nowMs = Date.now();
      const bufferMs = BOOKING_CFG.bufferMin * 60_000;
      const rangeStart = new Date(nowMs + BOOKING_CFG.leadMin * 60_000 - bufferMs).toISOString();
      const rangeEnd = new Date(nowMs + daysAhead * 86_400_000 + bufferMs).toISOString();
      const busy = await loadBusyIntervals({ supabase, gcal, rangeStartIso: rangeStart, rangeEndIso: rangeEnd });

      const { data: avail } = await supabase.rpc("get_booking_availability");
      const { hostTz, rangesByDow } = parseAvailability(avail);

      const slots = generateSlots({ pass, nowMs, hostTz, rangesByDow, busy, daysAhead });
      return json({
        pass: {
          credits_remaining: Math.max(0, pass.total_credits - pass.used_credits),
          session_length_minutes: pass.session_length_minutes,
        },
        slots,
      });
    }

    // ------------------------------------------------------------------- book
    if (action === "book") {
      if (!pass) return json({ error: "no_active_pass" }, 409);
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      const name =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        pass.student_name || user.email || "Student";
      const result = await bookSession({
        supabase, gcal, pass,
        identity: { student_id: userId, email: user.email ?? null, name },
        startAtIso: String(body.start_at || ""),
        idempotencyKey: String(body.idempotency_key || ""),
        adminEmail: Deno.env.get("BOOKING_ADMIN_EMAIL") || "contact@aspiringattorneys.com",
        supabaseUrl: Deno.env.get("SUPABASE_URL")!,
        serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      });
      if (!result.ok) return json({ error: result.error, details: result.details }, result.status);
      return json({ ok: true, redemption: result.redemption, was_existing: result.was_existing });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("student-booking error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
