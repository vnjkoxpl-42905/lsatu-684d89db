import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

import {
  deleteEvent,
  freeBusy,
  getEvent,
  insertEvent,
  listEvents,
  meetUrlFromEvent,
  patchEvent,
} from "../_shared/googleCalendar.ts";
import {
  loadBusyIntervals,
  parseAvailability,
  type GoogleCal,
} from "../_shared/bookingCore.ts";
import {
  buildCheckoutFingerprint,
  deterministicSingleSessionEventId,
  generateSingleSessionSlots,
  normalizeEmail,
  normalizeGuests,
  SINGLE_SESSION,
  toPublicBooking,
} from "../_shared/singleSessionCore.ts";
import {
  decryptEnvelope,
  encryptEnvelope,
  generateCapabilityToken,
  hmacHex,
  sha256Hex,
} from "../_shared/singleSessionCrypto.ts";
import { createCheckoutSession, expireCheckoutSession } from "../_shared/stripe.ts";

const MAX_BODY_BYTES = 8192;
const READ_LIMIT = 30;
const WRITE_LIMIT = 5;
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://lsatprep.study";
let slotsCache: { expiresAt: number; payload: { slots: unknown[]; timezone: string } } | null = null;

const gcal: GoogleCal = { insertEvent, patchEvent, getEvent, deleteEvent, freeBusy, meetUrlFromEvent };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`);
  return value;
}

async function readBody(req: Request): Promise<any> {
  const declared = Number(req.headers.get("content-length") || "0");
  if (declared > MAX_BODY_BYTES) throw new Error("payload_too_large");
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength > MAX_BODY_BYTES) throw new Error("payload_too_large");
  return bytes.byteLength ? JSON.parse(new TextDecoder().decode(bytes)) : {};
}

function clientIp(req: Request): string {
  const platformIp = req.headers.get("cf-connecting-ip") || req.headers.get("fly-client-ip") || req.headers.get("x-real-ip");
  if (platformIp?.trim()) return platformIp.trim();
  const hops = (req.headers.get("x-forwarded-for") || "").split(",").map((part) => part.trim()).filter(Boolean);
  return hops.at(-1) || "unknown";
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = requiredEnv("TURNSTILE_SECRET");
  if (!token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  if (!response.ok) return false;
  const result = await response.json().catch(() => ({}));
  return result?.success === true;
}

async function rateLimit(supabase: any, ipHash: string, action: string, limit: number): Promise<boolean> {
  const { data, error } = await supabase.rpc("bump_booking_hit", {
    _ip_hash: ipHash,
    _slug: "single-session",
    _action: action,
  });
  // Fail open. This is a throttle, not a gate: a counter that cannot write is
  // a reason to log loudly, never a reason to stop every student from booking
  // a session. Throwing here took the whole booking page down.
  if (error) {
    console.error("single-session rate limit unavailable, allowing", {
      action,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return true;
  }
  return Number(data ?? 0) <= limit;
}

/** True only for a caller holding a valid admin JWT. Used to decide whether an
 *  error response may carry its real cause. */
async function callerIsAdmin(req: Request): Promise<boolean> {
  try {
    const authorization = req.headers.get("authorization") || "";
    if (!authorization.startsWith("Bearer ")) return false;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data, error } = await admin.auth.getUser(authorization.slice(7));
    if (error || !data?.user) return false;
    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .eq("role", "admin")
      .maybeSingle();
    return !!role;
  } catch {
    return false;
  }
}

async function optionalUserId(supabase: any, req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const { data, error } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !data?.user) return null;
  return data.user.id;
}

function checkoutDescription(startAt: string, timezone: string): string {
  let tz = timezone || SINGLE_SESSION.hostTimezone;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(); }
  catch (_) { tz = SINGLE_SESSION.hostTimezone; }
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startAt));
  return `LSAT Session with Joshua — ${formatted} (${tz})`;
}

function bookingTokenFromUrl(value: string): string | null {
  try { return new URL(value).searchParams.get("booking_token"); }
  catch (_) { return null; }
}

async function calendarId(supabase: any): Promise<string> {
  const { data, error } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data?.calendar_id || "primary";
}

async function adoptTentativeEvent(calendar: string, bookingId: string, startAt: string, endAt: string): Promise<any> {
  const eventId = deterministicSingleSessionEventId(bookingId);
  let event: any = null;
  try {
    event = await insertEvent(calendar, {
      id: eventId,
      summary: "Reserved LSAT session",
      description: "Temporary booking hold.",
      start: { dateTime: startAt },
      end: { dateTime: endAt },
      transparency: "opaque",
      visibility: "private",
      extendedProperties: { private: { lsatu_single_session_booking_id: bookingId, lsatu_hold: "true" } },
    }, { sendUpdates: "none" });
  } catch (error) {
    try { event = await getEvent(calendar, eventId); }
    catch (_) {
      const found = await listEvents(calendar, {
        privateExtendedProperty: `lsatu_single_session_booking_id=${bookingId}`,
        showDeleted: "false",
        maxResults: "2",
      });
      event = found?.items?.find((item: any) => item.status !== "cancelled") ?? null;
    }
    if (!event) throw error;
  }
  return event;
}

async function cleanupTentative(calendar: string, bookingId: string, knownEventId?: string | null) {
  const eventId = knownEventId || deterministicSingleSessionEventId(bookingId);
  try { await deleteEvent(calendar, eventId, { sendUpdates: "none" }); }
  catch (error) { console.error("single-session calendar cleanup failed", { bookingId, eventId, error: error instanceof Error ? error.message : String(error) }); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await readBody(req);
    const action = String(body.action || "");
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);
    const ip = clientIp(req);
    // Keyed when the secret is there, plain digest when it is not. Either way
    // it is only a bucket key for counting hits, and a missing secret must not
    // cost every student the ability to book.
    const hmacKey = Deno.env.get("BOOKING_IP_HMAC_KEY");
    if (!hmacKey) console.error("BOOKING_IP_HMAC_KEY is not set; throttle keys are unkeyed digests");
    const ipHash = hmacKey ? await hmacHex(hmacKey, ip) : await sha256Hex(ip);
    const isWrite = ["hold", "abandon", "cancel"].includes(action);
    if (!await rateLimit(supabase, ipHash, isWrite ? action : "read", isWrite ? WRITE_LIMIT : READ_LIMIT)) {
      return json({ error: "rate_limited" }, 429);
    }

    if (action === "info") {
      return json({
        host: { name: "Joshua", title: "LSAT Session" },
        duration_minutes: SINGLE_SESSION.durationMinutes,
        amount_cents: SINGLE_SESSION.amountCents,
        currency: SINGLE_SESSION.currency,
        timezone: SINGLE_SESSION.hostTimezone,
      });
    }

    if (action === "slots") {
      if (slotsCache && slotsCache.expiresAt > Date.now()) return json(slotsCache.payload);
      const nowMs = Date.now();
      const rangeStart = new Date(nowMs + SINGLE_SESSION.leadMinutes * 60_000).toISOString();
      const rangeEnd = new Date(nowMs + 16 * 86_400_000).toISOString();
      const busy = await loadBusyIntervals({ supabase, gcal, rangeStartIso: rangeStart, rangeEndIso: rangeEnd });
      const { data: availability, error } = await supabase.rpc("get_booking_availability");
      if (error) throw error;
      const { hostTz, rangesByDow } = parseAvailability(availability);
      const payload = {
        slots: generateSingleSessionSlots({ nowMs, hostTz, rangesByDow, busy, businessDays: SINGLE_SESSION.businessDays }),
        timezone: hostTz,
      };
      slotsCache = { expiresAt: Date.now() + 15_000, payload };
      return json(payload);
    }

    if (action === "status") {
      const checkoutSessionId = String(body.checkout_session_id || "");
      const token = String(body.booking_token || "");
      if (!checkoutSessionId || !token) return json({ error: "invalid_token" }, 403);
      const { data, error } = await supabase.rpc("get_single_session_status", {
        _stripe_checkout_session_id: checkoutSessionId,
        _booking_token_hash: await sha256Hex(token),
      });
      if (error || !data) return json({ error: "invalid_token" }, error?.code === "P0403" ? 403 : 404);
      return json(data);
    }

    if (action === "hold") {
      const name = String(body.name || "").trim().replace(/\s+/g, " ").slice(0, 120);
      const email = normalizeEmail(body.email);
      const notes = String(body.notes || "").trim().slice(0, 2000);
      const guests = normalizeGuests(body.guests, email);
      const clientIdempotencyKey = String(body.client_idempotency_key || "").trim();
      const startAt = new Date(String(body.start_at || ""));
      if (!name || clientIdempotencyKey.length < 8 || !Number.isFinite(startAt.getTime())) return json({ error: "invalid_request" }, 400);
      if (!await verifyTurnstile(String(body.turnstile_token || ""), ip)) return json({ error: "verification_failed" }, 403);
      const endAt = new Date(startAt.getTime() + SINGLE_SESSION.durationMinutes * 60_000);

      // A replay must not conflict with its own DB hold or tentative Google
      // event. New claims still take the live observation immediately before
      // the authoritative SQL claim.
      const { data: existingReplay, error: replayLookupError } = await supabase
        .from("single_session_bookings")
        .select("id")
        .eq("client_idempotency_key", clientIdempotencyKey)
        .maybeSingle();
      if (replayLookupError) throw replayLookupError;
      if (!existingReplay) {
        const liveBusy = await loadBusyIntervals({
          supabase,
          gcal,
          rangeStartIso: startAt.toISOString(),
          rangeEndIso: endAt.toISOString(),
        });
        if (liveBusy.some((interval) => interval.start < endAt.getTime() && interval.end > startAt.getTime())) {
          return json({ error: "slot_unavailable" }, 409);
        }
      }

      const replayToken = String(body.booking_token || "");
      const bookingToken = replayToken || generateCapabilityToken();
      const bookingTokenHash = await sha256Hex(bookingToken);
      const { data: claimed, error: claimError } = await supabase.rpc("claim_single_session_slot", {
        _start_at: startAt.toISOString(),
        _name: name,
        _email: email,
        _notes: notes || null,
        _guests: guests,
        _client_idempotency_key: clientIdempotencyKey,
        _booking_token_hash: bookingTokenHash,
        _ip_hash: ipHash,
        _user_id: await optionalUserId(supabase, req),
      });
      if (claimError) {
        const status = claimError.code === "P0429" ? 429
          : ["P0409", "P0425"].includes(claimError.code) ? 409
          : claimError.code === "P0400" ? 400
          : 500;
        return json({ error: status === 429 ? "rate_limited" : status === 409 ? "slot_unavailable" : status === 400 ? "invalid_request" : "server_error" }, status);
      }
      let booking = Array.isArray(claimed) ? claimed[0] : claimed;
      if (!booking) throw new Error("claim_returned_no_booking");
      const encryptionSecret = requiredEnv("SINGLE_SESSION_ENCRYPTION_KEY");
      if (booking.status !== "draft") {
        let responseBookingToken = booking.booking_token_hash === bookingTokenHash ? bookingToken : "";
        if (!responseBookingToken && booking.checkout_request_fingerprint) {
          const replayFingerprint = await decryptEnvelope<ReturnType<typeof buildCheckoutFingerprint>>(
            booking.checkout_request_fingerprint,
            encryptionSecret,
          );
          responseBookingToken = bookingTokenFromUrl(replayFingerprint.success_url) || "";
        }
        if (!responseBookingToken) return json({ error: "idempotency_token_required" }, 409);
        return json({
          booking: toPublicBooking(booking),
          booking_token: responseBookingToken,
          checkout_session_id: booking.stripe_checkout_session_id ?? null,
          checkout_url: booking.stripe_checkout_url ?? null,
        });
      }

      const targetCalendar = await calendarId(supabase);
      let tentative: any;
      try {
        tentative = await adoptTentativeEvent(targetCalendar, booking.id, booking.start_at, booking.end_at);
        const { data, error } = await supabase.rpc("set_single_session_tentative_event", {
          _booking_id: booking.id,
          _expected_version: booking.lifecycle_version,
          _gcal_event_id: tentative.id,
        });
        if (error) throw error;
        booking = data ?? booking;
      } catch (calendarError) {
        await supabase.rpc("expire_single_session_draft", {
          _booking_id: booking.id,
          _expected_version: booking.lifecycle_version,
          _reason: "tentative_calendar_failed",
        });
        await cleanupTentative(targetCalendar, booking.id, tentative?.id);
        console.error("single-session tentative event failed", { bookingId: booking.id, error: calendarError instanceof Error ? calendarError.message : String(calendarError) });
        return json({ error: "slot_unavailable" }, 409);
      }

      let fingerprint: ReturnType<typeof buildCheckoutFingerprint>;
      let responseBookingToken = booking.booking_token_hash === bookingTokenHash ? bookingToken : "";
      if (booking.checkout_request_fingerprint) {
        fingerprint = await decryptEnvelope(booking.checkout_request_fingerprint, encryptionSecret);
        responseBookingToken ||= bookingTokenFromUrl(fingerprint.success_url) || "";
      } else {
        const tokenForUrl = responseBookingToken;
        if (!tokenForUrl) throw new Error("idempotent_draft_missing_fingerprint");
        const successUrl = `${APP_ORIGIN}/book/session?checkout_session_id={CHECKOUT_SESSION_ID}&booking_token=${encodeURIComponent(tokenForUrl)}`;
        const cancelUrl = `${APP_ORIGIN}/book/session?cancelled=1&booking_token=${encodeURIComponent(tokenForUrl)}`;
        fingerprint = buildCheckoutFingerprint({
          bookingId: booking.id,
          description: checkoutDescription(booking.start_at, String(body.timezone || SINGLE_SESSION.hostTimezone)),
          email,
          successUrl,
          cancelUrl,
          expiresAt: Math.floor(Date.now() / 1000) + SINGLE_SESSION.checkoutMinutes * 60,
        });
        const encrypted = await encryptEnvelope(fingerprint, encryptionSecret);
        const { data, error } = await supabase.rpc("persist_single_session_checkout_fingerprint", {
          _booking_id: booking.id,
          _expected_version: booking.lifecycle_version,
          _fingerprint_ciphertext: encrypted,
        });
        if (error) throw error;
        booking = data ?? { ...booking, checkout_request_fingerprint: encrypted };
      }

      const stripeSecret = requiredEnv("STRIPE_SECRET_KEY");
      const session = await createCheckoutSession(stripeSecret, fingerprint, booking.id);
      if (!session.id || !session.url || !session.expires_at) throw new Error("stripe_checkout_incomplete_response");
      const { data: attached, error: attachError } = await supabase.rpc("attach_single_session_checkout", {
        _booking_id: booking.id,
        _expected_version: booking.lifecycle_version,
        _stripe_checkout_session_id: session.id,
        _stripe_checkout_url: session.url,
        _stripe_expires_at: new Date(session.expires_at * 1000).toISOString(),
      });
      if (attachError) {
        await expireCheckoutSession(stripeSecret, session.id).catch(() => undefined);
        throw attachError;
      }
      return json({
        booking: toPublicBooking(attached),
        booking_token: responseBookingToken,
        checkout_session_id: session.id,
        checkout_url: session.url,
      });
    }

    if (action === "abandon") {
      const checkoutSessionId = String(body.checkout_session_id || "");
      const bookingToken = String(body.booking_token || "");
      if (!checkoutSessionId || !bookingToken) return json({ error: "invalid_token" }, 403);
      const bookingTokenHash = await sha256Hex(bookingToken);
      const { data: current, error: statusError } = await supabase.rpc("get_single_session_status", {
        _stripe_checkout_session_id: checkoutSessionId,
        _booking_token_hash: bookingTokenHash,
      });
      if (statusError || !current) return json({ error: "invalid_token" }, 403);
      if (current.status !== "checkout_open") return json(current);
      try { await expireCheckoutSession(requiredEnv("STRIPE_SECRET_KEY"), checkoutSessionId); }
      catch (error) {
        console.error("single-session abandon stripe expiry failed", { checkoutSessionId, error: error instanceof Error ? error.message : String(error) });
        return json({ error: "unable_to_abandon" }, 503);
      }
      const { data, error } = await supabase.rpc("abandon_single_session_booking", {
        _booking_id: current.id,
        _booking_token_hash: bookingTokenHash,
      });
      if (error) return json({ error: "unable_to_abandon" }, error.code === "P0403" ? 403 : 409);
      return json(toPublicBooking(data));
    }

    if (action === "cancel") {
      const token = String(body.cancel_token || "");
      if (!token) return json({ error: "invalid_token" }, 403);
      const cancelTokenHash = await sha256Hex(token);
      if (body.confirm !== true) {
        const { data: preview, error: previewError } = await supabase.from("single_session_bookings")
          .select("id,status,start_at,end_at,meet_url,stripe_checkout_session_id,cancel_token_expires_at")
          .eq("cancel_token_hash", cancelTokenHash)
          .gt("cancel_token_expires_at", new Date().toISOString())
          .maybeSingle();
        if (previewError) throw previewError;
        if (!preview) return json({ error: "invalid_token" }, 403);
        return json(toPublicBooking(preview));
      }
      const { data, error } = await supabase.rpc("cancel_single_session_booking", {
        _cancel_token_hash: cancelTokenHash,
      });
      if (error) {
        const status = error.code === "P0403" ? 403 : error.code === "P0409" ? 409 : 500;
        return json({ error: status === 409 ? "cancellation_closed" : status === 403 ? "invalid_token" : "server_error" }, status);
      }
      return json(toPublicBooking(data));
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === "payload_too_large") return json({ error: "payload_too_large" }, 413);
    const detail = error instanceof Error ? error.message : String(error);
    console.error("single-session error", { error: detail });
    // Students see nothing but "server_error". An admin, proven by their own
    // JWT, gets the actual reason - otherwise a broken booking page is a
    // guessing game from the outside.
    if (await callerIsAdmin(req)) return json({ error: "server_error", detail }, 500);
    return json({ error: "server_error" }, 500);
  }
});
