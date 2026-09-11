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
  bookSession, generateSlots, loadAvailability, loadBusyIntervals, passSlotPolicy, type BookingPass, type GoogleCal,
} from "../_shared/bookingCore.ts";
import { linkPassToAccount } from "../_shared/linkPassToAccount.ts";
import { userFromRequest } from "../_shared/authClaims.ts";

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

/** True only for a caller holding a valid admin JWT, so an error response can
 *  carry its real cause without leaking it to students. */
async function callerIsAdmin(req: Request): Promise<boolean> {
  try {
    const authorization = req.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) return false;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const caller = await userFromRequest(req);
    if (!caller) return false;
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    return !!role;
  } catch {
    return false;
  }
}

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
    // The resolver RETURNS booking_passes, so a non-resolving slug comes back as
    // an all-NULL composite, not an empty result. Over PostgREST that is a
    // truthy object, so `?? null` alone lets a phantom pass through and the
    // redemptions lookup then filters uuid = 'null' and 500s. Require the id.
    const pass: BookingPass | null = passRow?.id ? passRow : null;

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
      const { data: redemptions, error: redemptionsErr } = await supabase
        .from("booking_pass_redemptions")
        .select("id,start_at,status,meet_url")
        .eq("booking_pass_id", pass.id)
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true });
      if (redemptionsErr) throw redemptionsErr;
      // Redacted DTO — NO email, name, token_hash, slug, or pass_id.
      return json({
        pass: {
          credits_remaining: creditsRemaining,
          session_length_minutes: pass.session_length_minutes,
          status: pass.status,
        },
        redemptions: redemptions ?? [],
        host: { name: "Joshua", title: "1:1 LSAT Session" },
      });
    }

    // ------------------------------------------------------------------ slots
    if (action === "slots") {
      if (pass.status !== "active" || creditsRemaining <= 0) {
        return json({ pass: { credits_remaining: creditsRemaining, session_length_minutes: pass.session_length_minutes, status: pass.status }, slots: [] });
      }
      const nowMs = Date.now();
      // Calendar lookups fail for reasons the student cannot act on (expired
      // Google credentials, a transient query error). Let that surface as a
      // named, retryable condition instead of an opaque 500.
      let busy, policy, avail;
      try {
        avail = await loadAvailability(supabase);
        policy = passSlotPolicy(pass, avail, nowMs, Number(body.days_ahead) || undefined);
        const bufferMs = avail.bufferMin * 60_000;
        const rangeStart = new Date(nowMs + policy.leadMin * 60_000 - bufferMs).toISOString();
        const rangeEnd = new Date(policy.windowEndMs + bufferMs).toISOString();
        busy = await loadBusyIntervals({ supabase, gcal, rangeStartIso: rangeStart, rangeEndIso: rangeEnd });
      } catch (e) {
        console.error("public-booking slots availability lookup failed", {
          slug, error: e instanceof Error ? e.message : String(e),
        });
        return json({ error: "availability_check_failed" }, 503);
      }

      const slots = generateSlots({ policy, hours: avail, nowMs, busy });
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
      // An account-less pass whose email matches a real account gets attached
      // here, so the booking, uploads, and history land on that account.
      if (!pass.student_id) {
        const linked = await linkPassToAccount(supabase, pass);
        if (linked) pass.student_id = linked;
      }
      let email = pass.student_email;
      if (pass.student_id) {
        const { data: authUser, error: authUserErr } = await supabase.auth.admin.getUserById(pass.student_id);
        if (authUserErr) console.error("booking account email lookup failed", { passId: pass.id, error: authUserErr.message });
        if (authUser?.user?.email) email = authUser.user.email;
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
      if (!result.ok) {
        // Keep the slot and the reason, so a "that time was taken" report can
        // be answered from the log instead of guessed at.
        const { error: logErr } = await supabase.from("booking_refusals").insert({
          booking_pass_id: pass.id, surface: "public-booking",
          start_at: body.start_at ? String(body.start_at) : null,
          reason: result.error, details: result.details ?? null,
        });
        if (logErr) console.error("booking refusal log failed", logErr);
        return json({ error: result.error, details: result.details }, result.status);
      }
      return json({ ok: true, redemption: result.redemption, was_existing: result.was_existing });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("public-booking error", e);
    // Same rule as single-session: a student sees nothing, an admin holding a
    // valid JWT gets the real cause, because the logs are not reachable from
    // where the page is broken.
    if (await callerIsAdmin(req)) return json({ error: "server_error", detail }, 500);
    return json({ error: "server_error" }, 500);
  }
});
