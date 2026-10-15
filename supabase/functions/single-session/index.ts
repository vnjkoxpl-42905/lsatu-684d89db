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
  hasConflictingCalendarEvent,
  hostLocalToUtc,
  normalizeEmail,
  normalizeGuests,
  SINGLE_SESSION,
  SINGLE_SESSION_EVENT,
  singleSessionWindowEndDate,
  toEventConfig,
  toPublicBooking,
  unwrapRpcRow,
  type BookingEventConfig,
} from "../_shared/singleSessionCore.ts";
import {
  decryptEnvelope,
  encryptEnvelope,
  generateCapabilityToken,
  hmacHex,
  sha256Hex,
} from "../_shared/singleSessionCrypto.ts";
import { createCheckoutSession, expireCheckoutSession } from "../_shared/stripe.ts";
import { userFromRequest } from "../_shared/authClaims.ts";

const MAX_BODY_BYTES = 8192;
const READ_LIMIT = 30;
const WRITE_LIMIT = 5;
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://lsatprep.study";
const slotsCache = new Map<string, { expiresAt: number; payload: { slots: unknown[]; timezone: string } }>();

function slotUnavailable(eventSlug: string) {
  slotsCache.delete(eventSlug);
  return json({ error: "slot_unavailable" }, 409);
}

const gcal: GoogleCal = { insertEvent, patchEvent, getEvent, deleteEvent, freeBusy, meetUrlFromEvent };

/**
 * The capability token the caller gets back for a free booking. Only the caller
 * that minted this token may cancel with it, so a replay from a different
 * request gets nothing rather than someone else's token.
 */
function responseBookingTokenForFree(
  booking: { booking_token_hash?: string | null },
  bookingTokenHash: string,
  bookingToken: string,
): string {
  return booking.booking_token_hash === bookingTokenHash ? bookingToken : "";
}

/**
 * Is the host's calendar actually free for this booking's window, ignoring the
 * booking's own tentative event. Mirrors the check the Stripe webhook runs
 * before it promotes a paid hold.
 */
async function calendarClearFor(supabase: any, booking: any): Promise<boolean> {
  if (!booking?.id || !booking?.start_at || !booking?.end_at || !booking?.gcal_event_id) {
    throw new Error("booking_calendar_check_missing_fields");
  }
  const { data: state, error } = await supabase.from("gcal_sync_state")
    .select("calendar_id,busy_calendar_ids").eq("id", 1).maybeSingle();
  if (error) throw error;
  const ids = [...new Set([state?.calendar_id || "primary", ...(state?.busy_calendar_ids ?? [])])];
  for (const calendar of ids) {
    const page = await listEvents(calendar, {
      timeMin: booking.start_at,
      timeMax: booking.end_at,
      singleEvents: "true",
      showDeleted: "false",
      maxResults: "50",
    });
    if (hasConflictingCalendarEvent(
      page?.items ?? [],
      booking.start_at,
      booking.end_at,
      booking.gcal_event_id,
      booking.id,
    )) {
      return false;
    }
  }
  return true;
}

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

async function optionalUserId(supabase: any, req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const caller = await userFromRequest(req);
  return caller?.id ?? null;
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

/**
 * The event this request is about. Defaults to the single session so an older
 * client that sends no slug keeps working exactly as it did.
 */
async function loadEvent(supabase: any, slug: unknown): Promise<BookingEventConfig> {
  const wanted = String(slug || "single-session").trim().slice(0, 64) || "single-session";
  const { data, error } = await supabase
    .from("booking_event_types")
    .select("*")
    .eq("slug", wanted)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    // An unknown slug must not silently fall back to the paid session.
    if (wanted !== "single-session") throw new Error("unknown_event");
    return SINGLE_SESSION_EVENT;
  }
  return toEventConfig(data);
}

/**
 * Has this one-off link already been used. Ordinary events are never spent, so
 * this is a single indexed lookup that answers false for every existing caller.
 */
async function linkSpent(supabase: any, event: BookingEventConfig): Promise<boolean> {
  if (!event.singleUse) return false;
  const { data, error } = await supabase.rpc("booking_event_is_spent", { _event_slug: event.slug });
  if (error) throw error;
  return data === true;
}

// Best-effort immediate processing for free bookings. The scheduled worker is
// still the durable retry path, so a missed nudge must never undo a booking.
async function kickOutboxWorker(): Promise<void> {
  const secret = Deno.env.get("BOOKING_WORKER_SECRET");
  if (!secret) {
    console.error("outbox nudge skipped: worker secret not configured");
    return;
  }
  try {
    const response = await fetch(`${requiredEnv("SUPABASE_URL")}/functions/v1/single-session-outbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": secret },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("outbox nudge non-2xx", { status: response.status });
  } catch (error) {
    console.error("outbox nudge failed", { error: error instanceof Error ? error.message : String(error) });
  }
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
      const event = await loadEvent(supabase, body.event);
      return json({
        host: { name: "Joshua", title: event.label },
        event: event.slug,
        duration_minutes: event.lengthMinutes,
        amount_cents: event.priceCents,
        currency: event.currency,
        requires_payment: event.requiresPayment,
        timezone: SINGLE_SESSION.hostTimezone,
        single_use: event.singleUse,
        // A one-off link that has been used still resolves -- the page needs to
        // say so rather than show an empty calendar. `note` is never included:
        // it is Joshua's reminder of who the link was for.
        available: !(await linkSpent(supabase, event)),
      });
    }

    if (action === "slots") {
      const event = await loadEvent(supabase, body.event);
      // A spent one-off link sells nothing. Checked before the cache, because
      // whether a link is used changes on a booking, not on a 15-second timer.
      if (await linkSpent(supabase, event)) return json({ slots: [], timezone: SINGLE_SESSION.hostTimezone });
      // Keyed by event: a consultation and a session have different lengths,
      // buffers and windows, so one cached answer cannot serve both.
      const cached = slotsCache.get(event.slug);
      if (cached && cached.expiresAt > Date.now()) return json(cached.payload);
      const nowMs = Date.now();
      const { data: availability, error } = await supabase.rpc("get_booking_availability");
      if (error) throw error;
      const { hostTz, rangesByDow, overridesByDate } = parseAvailability(availability);
      // Load busy blocks for the whole window plus the buffers on both ends, so
      // an event just outside the window still blocks the slot next to it.
      const bufferMs = Math.max(event.bufferBeforeMinutes, event.bufferAfterMinutes) * 60_000;
      const last = singleSessionWindowEndDate(nowMs, hostTz, event);
      const rangeStart = new Date(nowMs + event.minimumNoticeMinutes * 60_000 - bufferMs).toISOString();
      const rangeEnd = new Date(hostLocalToUtc(hostTz, last.year, last.month, last.day, 24 * 60).getTime() + bufferMs).toISOString();
      const busy = await loadBusyIntervals({ supabase, gcal, rangeStartIso: rangeStart, rangeEndIso: rangeEnd });
      const payload = {
        slots: generateSingleSessionSlots({ nowMs, hostTz, rangesByDow, overridesByDate, busy, event }),
        timezone: hostTz,
      };
      slotsCache.set(event.slug, { expiresAt: Date.now() + 15_000, payload });
      return json(payload);
    }

    if (action === "status") {
      const checkoutSessionId = String(body.checkout_session_id || "");
      const bookingId = String(body.booking_id || "");
      const token = String(body.booking_token || "");
      if ((!checkoutSessionId && !bookingId) || !token) return json({ error: "invalid_token" }, 403);
      const { data, error } = await supabase.rpc("get_single_session_status", {
        _stripe_checkout_session_id: checkoutSessionId || null,
        _booking_id: bookingId || null,
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
      const event = await loadEvent(supabase, body.event);
      const { data: resolvedPrice, error: priceError } = await supabase.rpc("booking_price_cents", {
        _event_slug: event.slug,
        _email: email,
      });
      if (priceError) throw priceError;
      const amountCents = Number(resolvedPrice ?? event.priceCents);
      if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error("invalid_event_price");
      const endAt = new Date(startAt.getTime() + event.lengthMinutes * 60_000);

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
          return slotUnavailable(event.slug);
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
        _event_slug: event.slug,
        _booker_timezone: String(body.timezone || SINGLE_SESSION.hostTimezone),
      });
      if (claimError) {
        // P0410 is a one-off link that was already used. It is a 409 like a
        // taken slot, but it needs its own word: no other time will work either.
        if (claimError.code === "P0410") return json({ error: "link_already_used" }, 409);
        const status = claimError.code === "P0429" ? 429
          : ["P0409", "P0425"].includes(claimError.code) ? 409
          : claimError.code === "P0400" ? 400
          : 500;
        if (status === 409) return slotUnavailable(event.slug);
        return json({ error: status === 429 ? "rate_limited" : status === 400 ? "invalid_request" : "server_error" }, status);
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
        const updatedBooking = unwrapRpcRow(data);
        if (!updatedBooking) throw new Error("set_tentative_event_returned_no_booking");
        booking = updatedBooking;
      } catch (calendarError) {
        await supabase.rpc("expire_single_session_draft", {
          _booking_id: booking.id,
          _expected_version: booking.lifecycle_version,
          _reason: "tentative_calendar_failed",
        });
        await cleanupTentative(targetCalendar, booking.id, tentative?.id);
        console.error("single-session tentative event failed", { bookingId: booking.id, error: calendarError instanceof Error ? calendarError.message : String(calendarError) });
        return slotUnavailable(event.slug);
      }

      // A free event has no middle step. The slot is held and the tentative
      // calendar event is up; there is no payment to wait for, so confirm now.
      // finalize_single_session_free refuses on any event whose type says it
      // requires payment, so this door cannot be walked through by a session.
      if (!event.requiresPayment) {
        const cancelToken = generateCapabilityToken();
        const cancelPayload = await encryptEnvelope({
          cancel_token: cancelToken,
          cancel_url: `${APP_ORIGIN}/book/${event.slug}?cancel_token=${encodeURIComponent(cancelToken)}`,
        }, encryptionSecret);
        // Same last look the paid path takes on the webhook, and for the same
        // reason: the tentative event we just wrote is our own, so it has to be
        // excluded or every booking would look like a clash with itself.
        const liveCalendarClear = await calendarClearFor(supabase, booking);
        const { data: freeResult, error: freeError } = await supabase.rpc("finalize_single_session_free", {
          _booking_id: booking.id,
          _expected_version: booking.lifecycle_version,
          _live_calendar_clear: liveCalendarClear,
          _cancel_token_hash: await sha256Hex(cancelToken),
          _cancel_payload_ciphertext: cancelPayload,
        });
        if (freeError) {
          await cleanupTentative(targetCalendar, booking.id, booking.gcal_event_id);
          const status = freeError.code === "P0409" ? 409 : freeError.code === "P0400" ? 400 : 500;
          if (status === 409) return slotUnavailable(event.slug);
          return json({ error: status === 400 ? "invalid_request" : "server_error" }, status);
        }
        if (freeResult?.status !== "booked") {
          await cleanupTentative(targetCalendar, booking.id, booking.gcal_event_id);
          return slotUnavailable(event.slug);
        }
        const { data: confirmed } = await supabase
          .from("single_session_bookings").select("*").eq("id", booking.id).maybeSingle();
        const nudge = kickOutboxWorker();
        const waitUntil = (globalThis as any)?.EdgeRuntime?.waitUntil;
        if (typeof waitUntil === "function") waitUntil.call((globalThis as any).EdgeRuntime, nudge);
        else void nudge;
        return json({
          booking: toPublicBooking(confirmed ?? booking),
          booking_token: responseBookingTokenForFree(booking, bookingTokenHash, bookingToken),
          checkout_session_id: null,
          checkout_url: null,
        });
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
          amountCents,
          currency: event.currency,
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
        _booking_id: null,
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
      // Cancellation side effects must start now, not whenever the fallback
      // scheduler next happens to run. Awaiting this best-effort nudge lets the
      // worker remove the Calendar event, send both emails, and release the
      // mirrored busy interval before the cancellation page settles. The
      // worker call swallows failures, so the durable scheduled retry remains
      // authoritative during an outage.
      await kickOutboxWorker();
      slotsCache.delete(String(data?.event_slug || body.event || "single-session"));
      return json(toPublicBooking(data));
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === "payload_too_large") return json({ error: "payload_too_large" }, 413);
    // A slug that names no active event is not a fault in the server. It is a
    // revoked, mistyped or retired link, and the page can only say so if it
    // arrives as its own answer rather than as a 500 with the reason withheld.
    if (error instanceof Error && error.message === "unknown_event") return json({ error: "unknown_event" }, 404);
    const detail = error instanceof Error ? error.message : String(error);
    console.error("single-session error", { error: detail });
    // Students see nothing but "server_error". An admin, proven by their own
    // JWT, gets the actual reason - otherwise a broken booking page is a
    // guessing game from the outside.
    if (await callerIsAdmin(req)) return json({ error: "server_error", detail }, 500);
    return json({ error: "server_error" }, 500);
  }
});
