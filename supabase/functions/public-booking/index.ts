// Anonymous public booking endpoint for per-student links (/book/<slug>).
// NO login. The slug (its high-entropy tail) is the bearer credential. The
// function NEVER reads Authorization and NEVER trusts caller-supplied identity;
// identity comes ONLY from the pass row that the slug resolves to.
//
// Config: [functions.public-booking] verify_jwt = false.
//
// Hardening (Codex R2 #6/#7):
//   * per-(ip,slug,action) 1-min rate limits via bump_booking_hit
//   * invalid-slug lockout to blunt enumeration
//   * uniform {error:"invalid_link"} 404 for any non-resolving slug
//   * Cache-Control: no-store on every response
//   * body-size cap
//   * redacted DTO to the browser (never email/name/token_hash/slug)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  deleteEvent, freeBusy, getEvent, insertEvent, meetUrlFromEvent, patchEvent,
} from "../_shared/googleCalendar.ts";
import {
  bookSession, BOOKING_CFG, generateSlots, parseAvailability, type BookingPass, type GoogleCal,
} from "../_shared/bookingCore.ts";

const LIMITS = {
  read: 20,          // info|slots per (ip,slug) per minute
  book: 5,           // book per (ip,slug) per minute
  invalid: 10,       // invalid-slug misses per ip per minute -> lockout
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const gcal: GoogleCal = { insertEvent, patchEvent, getEvent, deleteEvent, freeBusy, meetUrlFromEvent };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Body-size cap (8KB) — reject oversized payloads early. Files never come
    // through here (see booking-upload); this only needs headroom for a book
    // call carrying an optional student_note (validated <=2000 chars below).
    const cl = Number(req.headers.get("content-length") || "0");
    if (cl > 8192) return json({ error: "payload_too_large" }, 413);
    const raw = await req.text();
    if (raw.length > 8192) return json({ error: "payload_too_large" }, 413);
    const body = raw ? JSON.parse(raw) : {};

    const action = String(body.action || "");
    const slug = String(body.slug || "");
    if (!slug || slug.length < 3 || slug.length > 128) return json({ error: "invalid_link" }, 404);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Best-available client IP (untrusted; used only for throttling).
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip = xff.split(",")[0].trim() || "unknown";
    const ipHash = await sha256Hex(ip);

    // Invalid-slug lockout check first.
    const invCount = await supabase.rpc("bump_booking_hit", { _ip_hash: ipHash, _slug: "__invalid__", _action: "probe" });
    // (bump on every request; only enforce for misses below.)

    // Resolve identity from the slug (service-only full row).
    const { data: passRow } = await supabase.rpc("resolve_booking_link_full", { _slug: slug });
    const pass: BookingPass | null = passRow ?? null;

    if (!pass) {
      // Count the miss; lock out after too many.
      const misses = await supabase.rpc("bump_booking_hit", { _ip_hash: ipHash, _slug: "__invalid__", _action: "miss" });
      if ((misses.data ?? 0) > LIMITS.invalid) return json({ error: "rate_limited" }, 429);
      return json({ error: "invalid_link" }, 404);
    }

    // Per-(ip,slug,action) rate limit.
    const isBook = action === "book";
    const { data: hitCount } = await supabase.rpc("bump_booking_hit", {
      _ip_hash: ipHash, _slug: slug, _action: isBook ? "book" : "read",
    });
    if (isBook && (hitCount ?? 0) > LIMITS.book) return json({ error: "rate_limited" }, 429);
    if (!isBook && (hitCount ?? 0) > LIMITS.read) return json({ error: "rate_limited" }, 429);

    const creditsRemaining = Math.max(0, pass.total_credits - pass.used_credits);

    // ------------------------------------------------------------------- info
    if (action === "info") {
      // Redacted DTO — NO email, name, token_hash, slug, or pass_id.
      return json({
        pass: {
          credits_remaining: creditsRemaining,
          session_length_minutes: pass.session_length_minutes,
          status: pass.status,
        },
        host: { name: "Joshua", title: "1:1 LSAT Session" },
      });
    }

    // ------------------------------------------------------------------ slots
    if (action === "slots") {
      if (pass.status !== "active" || creditsRemaining <= 0) {
        return json({ pass: { credits_remaining: creditsRemaining, session_length_minutes: pass.session_length_minutes, status: pass.status }, slots: [] });
      }
      const daysAhead = Math.min(Math.max(Number(body.days_ahead) || BOOKING_CFG.lookaheadDaysDefault, 1), 60);
      const nowMs = Date.now();
      const rangeStart = new Date(nowMs + BOOKING_CFG.leadMin * 60_000).toISOString();
      const rangeEnd = new Date(nowMs + daysAhead * 86_400_000).toISOString();

      const { data: events } = await supabase
        .from("schedule_events").select("start_at,end_at")
        .is("deleted_at", null).neq("status", "cancelled")
        .lt("start_at", rangeEnd).gt("end_at", rangeStart);
      const busy = (events ?? []).map((e: any) => ({ start: new Date(e.start_at).getTime(), end: new Date(e.end_at).getTime() }));

      const { data: avail } = await supabase.rpc("get_booking_availability");
      const { hostTz, rangesByDow } = parseAvailability(avail);

      const slots = generateSlots({ pass, nowMs, hostTz, rangesByDow, busy, daysAhead });
      return json({
        pass: { credits_remaining: creditsRemaining, session_length_minutes: pass.session_length_minutes },
        slots,
      });
    }

    // ------------------------------------------------------------------- book
    if (action === "book") {
      if (creditsRemaining <= 0) return json({ error: "no_sessions_remaining" }, 409);
      // Identity comes ONLY from the resolved pass row. If the pass carries a
      // student_id, prefer that profile's current email; else the pass email.
      let email = pass.student_email;
      if (pass.student_id) {
        const { data: prof } = await supabase.from("profiles").select("email,name,full_name").eq("id", pass.student_id).maybeSingle();
        if (prof?.email) email = prof.email;
      }
      const studentNote = String(body.student_note || "").slice(0, 2000).trim();
      const result = await bookSession({
        supabase, gcal, pass,
        identity: { student_id: pass.student_id, email, name: pass.student_name || email || "Student" },
        startAtIso: String(body.start_at || ""),
        idempotencyKey: String(body.idempotency_key || ""),
        studentNote,
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
    console.error("public-booking error", e);
    return json({ error: "server_error" }, 500);
  }
});
