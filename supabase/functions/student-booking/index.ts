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

async function activePassRow(supabase: any, userId: string, userEmail?: string | null): Promise<BookingPass | null> {
  const { data } = await supabase
    .from("booking_passes").select("*")
    .eq("student_id", userId).eq("status", "active")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (data) return data;

  // Self-heal: passes issued by name/email only carry no student_id, so the
  // account lookup above misses them even though the student owns the pass.
  // Match on the verified JWT email and attach the account permanently.
  const email = (userEmail ?? "").trim().toLowerCase();
  if (!email) return null;
  const { data: byEmail } = await supabase
    .from("booking_passes").select("*")
    .is("student_id", null).eq("status", "active").ilike("student_email", email)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!byEmail) return null;
  const { error: linkErr } = await supabase
    .from("booking_passes").update({ student_id: userId }).eq("id", byEmail.id).is("student_id", null);
  if (linkErr) console.error("pass auto-link failed", { passId: byEmail.id, error: linkErr.message ?? linkErr });
  return { ...byEmail, student_id: userId };
}

async function offersForStudent(supabase: any, userId: string) {
  const [{ data: offers, error: offersErr }, { data: overrides, error: overridesErr }] = await Promise.all([
    supabase.from("booking_offers").select("id,label,provider,url,credits").eq("active", true).order("credits"),
    supabase.from("student_booking_offers").select("offer_id,enabled,url_override").eq("student_id", userId),
  ]);
  if (offersErr || overridesErr) throw offersErr ?? overridesErr;
  const byOffer = new Map<string, { offer_id: string; enabled: boolean; url_override: string | null }>(
    (overrides ?? []).map((row: any) => [row.offer_id, row]),
  );
  const hasArrangement = byOffer.size > 0;
  return (offers ?? [])
    .filter((offer: any) => !hasArrangement || byOffer.get(offer.id)?.enabled)
    .map((offer: any) => ({ ...offer, url: byOffer.get(offer.id)?.url_override || offer.url }));
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

    // Attach any account-less pass that belongs to this email before anything
    // reads passes by account id (info RPC, slots, book, uploads).
    await activePassRow(supabase, userId, userEmail);

    // ------------------------------------------------------------------- info
    if (action === "info") {
      const { data, error } = await supabase.rpc("get_student_booking", { _auth_user_id: userId });
      if (error) {
        console.error("get_student_booking failed", error);
        return json({ error: "info_failed", details: error.message ?? String(error) }, 500);
      }

      // Commerce is enrichment, not a prerequisite for using an existing
      // pass. Keep the scheduler available while migrations, provider events,
      // or offer configuration are temporarily unavailable.
      const [offersResult, commerceResult, externalResult] = await Promise.allSettled([
        offersForStudent(supabase, userId),
        supabase.from("booking_commerce_events").select("id,offer_id,provider,event_type,amount_cents,currency,created_at").eq("student_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("external_booking_events").select("id,offer_id,source_url,start_at,end_at,status,created_at").eq("student_id", userId).order("start_at", { ascending: false }).limit(30),
      ]);

      const offers = offersResult.status === "fulfilled" ? offersResult.value : [];
      if (offersResult.status === "rejected") console.warn("booking offers unavailable", offersResult.reason);
      const commerce = commerceResult.status === "fulfilled" && !commerceResult.value.error ? commerceResult.value.data ?? [] : [];
      if (commerceResult.status === "rejected" || commerceResult.value?.error) console.warn("booking commerce unavailable", commerceResult.status === "rejected" ? commerceResult.reason : commerceResult.value.error);
      const external = externalResult.status === "fulfilled" && !externalResult.value.error ? externalResult.value.data ?? [] : [];
      if (externalResult.status === "rejected" || externalResult.value?.error) console.warn("external bookings unavailable", externalResult.status === "rejected" ? externalResult.reason : externalResult.value.error);
      return json({ ...(data ?? { pass: null, redemptions: [] }), offers, commerce: commerce ?? [], external_bookings: external ?? [] });
    }

    if (action === "offer_click") {
      const offerId = String(body.offer_id || "");
      const offers = await offersForStudent(supabase, userId);
      const offer = offers.find((item: any) => item.id === offerId);
      if (!offer) return json({ error: "offer_not_available" }, 404);
      const { error } = await supabase.from("booking_commerce_events").insert({
        student_id: userId, offer_id: offer.id, provider: "lsatu",
        provider_event_id: crypto.randomUUID(), event_type: "offer_clicked", payload: { url: offer.url },
      });
      if (error) throw error;
      return json({ url: offer.url });
    }

    const pass = await activePassRow(supabase, userId, userEmail);

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
        studentNote: String(body.student_note || "").slice(0, 2000).trim(),
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
