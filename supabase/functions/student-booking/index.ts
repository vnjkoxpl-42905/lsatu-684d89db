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
  bookSession, generateSlots, loadAvailability, loadBusyIntervals, passSlotPolicy, type BookingPass, type GoogleCal,
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
  // The SQL resolver owns the cutover semantics. In particular, an authored
  // external Cal override stays available on the inactive legacy offer and
  // suppresses native Single Session until an operator reviews it.
  const { data, error } = await supabase.rpc("get_effective_booking_offers", { _student_id: userId });
  if (error) throw error;
  return data ?? [];
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
      const [offersResult, commerceResult, externalResult, singleSessionsResult] = await Promise.allSettled([
        offersForStudent(supabase, userId),
        supabase.from("booking_commerce_events").select("id,offer_id,provider,event_type,amount_cents,currency,created_at").eq("student_id", userId).order("created_at", { ascending: false }).limit(30),
        // meet_url comes from the mirrored calendar row: a Cal.com booking is a
        // real session the student has to be able to join, not just a receipt.
        supabase.from("external_booking_events").select("id,offer_id,source_url,start_at,end_at,status,created_at,schedule_events(meet_url)").eq("student_id", userId).order("start_at", { ascending: false }).limit(30),
        // Association is verified-account only. Email similarity is deliberately
        // confined to operator tooling and never injects a guest purchase into
        // the authenticated student's DTO.
        supabase.from("single_session_bookings")
          .select("id,start_at,end_at,status,meet_url,gcal_event_id")
          .eq("user_id", userId)
          .order("start_at", { ascending: false })
          .limit(30),
      ]);

      const offers = offersResult.status === "fulfilled" ? offersResult.value : [];
      if (offersResult.status === "rejected") console.warn("booking offers unavailable", offersResult.reason);
      const commerce = commerceResult.status === "fulfilled" && !commerceResult.value.error ? commerceResult.value.data ?? [] : [];
      if (commerceResult.status === "rejected" || commerceResult.value?.error) console.warn("booking commerce unavailable", commerceResult.status === "rejected" ? commerceResult.reason : commerceResult.value.error);
      const externalRaw = externalResult.status === "fulfilled" && !externalResult.value.error ? externalResult.value.data ?? [] : [];
      if (externalResult.status === "rejected" || externalResult.value?.error) console.warn("external bookings unavailable", externalResult.status === "rejected" ? externalResult.reason : externalResult.value.error);
      // Flatten the joined calendar row so the client sees one shape.
      const external = (externalRaw as any[]).map((row) => {
        const { schedule_events, ...rest } = row;
        const joined = Array.isArray(schedule_events) ? schedule_events[0] : schedule_events;
        return { ...rest, meet_url: joined?.meet_url ?? null };
      });
      const singleSessions = singleSessionsResult.status === "fulfilled" && !singleSessionsResult.value.error
        ? singleSessionsResult.value.data ?? []
        : [];
      if (singleSessionsResult.status === "rejected" || singleSessionsResult.value?.error) {
        console.warn("single sessions unavailable", singleSessionsResult.status === "rejected" ? singleSessionsResult.reason : singleSessionsResult.value.error);
      }
      const rpcData = data ?? { pass: null, redemptions: [] };
      const bookings = [
        ...((rpcData.redemptions ?? []) as any[]).map((row) => ({
          source: "redemption" as const,
          ...row,
        })),
        ...(singleSessions as any[]).map((row) => ({
          source: "single_session" as const,
          id: row.id,
          start_at: row.start_at,
          end_at: row.end_at,
          status: row.status,
          meet_url: row.status === "booked" ? row.meet_url ?? null : null,
          google_event_id: row.gcal_event_id ?? null,
          calendar_status: null,
          can_reschedule: false,
        })),
      ].sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
      // `bookings` is the sole schedule contract. Do not leak the RPC's legacy
      // `redemptions` key alongside it or consumers will drift back into two
      // incompatible code paths.
      const { redemptions: _legacyRedemptions, ...studentState } = rpcData;
      return json({ ...studentState, bookings, offers, commerce: commerce ?? [], external_bookings: external });
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
      const nowMs = Date.now();
      const avail = await loadAvailability(supabase);
      const policy = passSlotPolicy(pass, avail, nowMs, Number(body.days_ahead) || undefined);
      const bufferMs = avail.bufferMin * 60_000;
      const rangeStart = new Date(nowMs + policy.leadMin * 60_000 - bufferMs).toISOString();
      const rangeEnd = new Date(policy.windowEndMs + bufferMs).toISOString();
      const busy = await loadBusyIntervals({ supabase, gcal, rangeStartIso: rangeStart, rangeEndIso: rangeEnd });

      const slots = generateSlots({ policy, hours: avail, nowMs, busy });
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
      if (!result.ok) {
        // Keep the slot and the reason, so a "that time was taken" report can
        // be answered from the log instead of guessed at.
        const { error: logErr } = await supabase.from("booking_refusals").insert({
          booking_pass_id: pass.id, surface: "student-booking",
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
    console.error("student-booking error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
