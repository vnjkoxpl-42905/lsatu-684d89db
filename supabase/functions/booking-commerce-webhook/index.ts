// Verified Stripe + Cal.com commerce ingress. Every accepted response follows a
// durable database commit; raw provider payloads and Booker PII never enter logs.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@18.5.0";

import { insertEvent, listEvents, meetUrlFromEvent } from "../_shared/googleCalendar.ts";
import { hasConflictingCalendarEvent, SINGLE_SESSION, validateSingleSessionCheckout } from "../_shared/singleSessionCore.ts";
import { encryptEnvelope, generateCapabilityToken, hmacHex, sha256Hex } from "../_shared/singleSessionCrypto.ts";
import {
  listPaymentLinkLineItems,
  retrievePaymentLink,
} from "../_shared/stripe.ts";
import { recordCharge, stripeGet } from "../_shared/stripeLedger.ts";
import { sendAppEmail } from "../_shared/sendAppEmail.ts";

const MAX_BODY_BYTES = 256 * 1024;
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://lsatprep.study";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`);
  return value;
}

function expectedLivemode(): boolean {
  const value = requiredEnv("STRIPE_LIVEMODE").toLowerCase();
  if (value !== "true" && value !== "false") throw new Error("stripe_livemode_invalid");
  return value === "true";
}

async function readRaw(req: Request): Promise<string> {
  const declared = Number(req.headers.get("content-length") || "0");
  if (declared > MAX_BODY_BYTES) throw new Error("payload_too_large");
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.byteLength > MAX_BODY_BYTES) throw new Error("payload_too_large");
  return new TextDecoder().decode(bytes);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

async function verifyCal(raw: string, signature: string | null) {
  const secret = requiredEnv("CALCOM_BOOKING_WEBHOOK_SECRET");
  return !!signature && safeEqual(await hmacHex(secret, raw), signature.replace(/^sha256=/i, ""));
}

async function matchStudent(supabase: any, email: string | null, name: string | null) {
  if (email) {
    const wanted = email.trim().toLowerCase();
    let page = 1;
    while (page <= 5) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const users = data?.users ?? [];
      const hit = users.find((user: any) => (user.email ?? "").trim().toLowerCase() === wanted);
      if (hit) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles").select("class_id,display_name").eq("class_id", hit.id).maybeSingle();
        if (profileError) throw profileError;
        if (profile) return { id: profile.class_id, display_name: profile.display_name, email: hit.email };
      }
      if (users.length < 200) break;
      page++;
    }
  }
  if (name) {
    const normalized = name.trim().replace(/\s+/g, " ");
    const { data, error } = await supabase
      .from("profiles").select("class_id,display_name").ilike("display_name", normalized).limit(2);
    if (error) throw error;
    if ((data ?? []).length === 1) return { id: data[0].class_id, display_name: data[0].display_name, email };
  }
  return null;
}

async function calendarMirror(supabase: any, booking: { id: string; email: string | null; name: string | null; start: string; end: string }) {
  const { data: state, error: stateError } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
  if (stateError) throw stateError;
  const calendarId = state?.calendar_id || "primary";
  const event = await insertEvent(calendarId, {
    summary: `${(booking.name || booking.email || "Student").trim().split(/\s+/)[0]} session`,
    description: "Booked through Cal.com and mirrored by LSAT U.",
    start: { dateTime: booking.start },
    end: { dateTime: booking.end },
    attendees: booking.email ? [{ email: booking.email }] : undefined,
    extendedProperties: { private: { lsatu_calcom_booking_id: booking.id } },
  }, { conferenceDataVersion: 1, sendUpdates: booking.email ? "all" : "none" });
  const { data: mirrored, error: mirrorError } = await supabase.from("schedule_events").upsert({
    google_event_id: event.id,
    calendar_id: calendarId,
    title: event.summary,
    description: event.description,
    start_at: booking.start,
    end_at: booking.end,
    all_day: false,
    status: event.status ?? "confirmed",
    html_link: event.htmlLink ?? null,
    meet_url: meetUrlFromEvent(event),
    source: "calcom",
    etag: event.etag ?? null,
    last_synced_at: new Date().toISOString(),
    deleted_at: null,
  }, { onConflict: "google_event_id" }).select("id").maybeSingle();
  if (mirrorError) throw mirrorError;
  return { googleEventId: event.id as string, scheduleEventId: mirrored?.id ?? null };
}

async function liveCalendarClear(supabase: any, booking: any): Promise<boolean> {
  if (["booked", "refund_pending", "refunded", "refund_failed"].includes(booking.status)) return true;
  const { data: state, error } = await supabase.from("gcal_sync_state")
    .select("calendar_id,busy_calendar_ids").eq("id", 1).maybeSingle();
  if (error) throw error;
  const ids = [...new Set([state?.calendar_id || "primary", ...(state?.busy_calendar_ids ?? [])])];
  for (const calendarId of ids) {
    const page = await listEvents(calendarId, {
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
    )) return false;
  }
  return true;
}

async function expectedPaymentLinkFacts(stripeSecret: string, paymentLinkId: string) {
  const link = await retrievePaymentLink(stripeSecret, paymentLinkId);
  if (!link.active) throw new Error("inactive_payment_link");
  const lineItems = await listPaymentLinkLineItems(stripeSecret, paymentLinkId);
  if (!lineItems.length) throw new Error("payment_link_has_no_items");
  let currency: string | null = null;
  let amount = 0;
  for (const item of lineItems) {
    const price = item.price;
    if (!price || price.unit_amount == null || !item.quantity) throw new Error("unsupported_payment_link_price");
    currency ??= price.currency;
    if (currency !== price.currency) throw new Error("mixed_payment_link_currency");
    amount += price.unit_amount * item.quantity;
  }
  return { amount, currency };
}

// Server-to-server nudge so a paid booking's calendar promotion and emails run
// immediately instead of waiting for the scheduled worker. The worker secret is
// read from the function environment and never logged or returned. Failures are
// swallowed: the every-minute scheduled worker is the retry safety net, and a
// paid booking must never be undone by a missed nudge.
async function kickOutboxWorker(): Promise<void> {
  const secret = Deno.env.get("BOOKING_WORKER_SECRET");
  if (!secret) {
    console.error("outbox nudge skipped: worker secret not configured");
    return;
  }
  try {
    const res = await fetch(`${requiredEnv("SUPABASE_URL")}/functions/v1/single-session-outbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": secret },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("outbox nudge non-2xx", { status: res.status });
  } catch (error) {
    console.error("outbox nudge failed", { error: error instanceof Error ? error.message : String(error) });
  }
}

async function handleStripe(supabase: any, raw: string, signature: string | null) {
  const stripeSecret = requiredEnv("STRIPE_SECRET_KEY");
  if (!signature) return json({ error: "invalid_signature" }, 400);
  const stripe = new Stripe(stripeSecret, {
    apiVersion: "2025-08-27.basil",
    httpClient: Stripe.createFetchHttpClient(),
  });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      signature,
      requiredEnv("STRIPE_BOOKING_WEBHOOK_SECRET"),
      300,
    );
  } catch (_) {
    return json({ error: "invalid_signature" }, 400);
  }

  // Every charge lands in the teacher's payments ledger. The ledger is a view,
  // never a trigger, so a failure here is logged and never makes Stripe retry.
  const ledgerChargeId = await chargeIdForLedger(event, stripeSecret).catch(() => null);
  if (ledgerChargeId) {
    try {
      const { inserted, row } = await recordCharge(supabase, stripeSecret, ledgerChargeId, "webhook");
      // Every new paid charge tells the admins once, whatever it paid for:
      // payment links, the native single session, and Cal.com bookings alike.
      // Only the writer that created the ledger row announces it.
      if (inserted && row.status === "succeeded") {
        await notifyAdminsOfPayment(supabase, {
          email: row.email,
          name: row.payer_name,
          amountCents: row.amount_cents,
          currency: row.currency,
          awaitingGrant: row.grant_state === "awaiting",
          unmatched: !row.student_id,
        });
        await emailJoshuaOfPayment(supabase, row);
      }
    } catch (err) {
      console.error("ledger write failed", { event: event.id, type: event.type, error: err instanceof Error ? err.message : String(err) });
    }
    if (event.type.startsWith("charge.")) return json({ received: true });
  }

  if (event.type.startsWith("refund.")) {
    const refund = event.data.object as Stripe.Refund;
    if (event.livemode !== expectedLivemode()) return json({ error: "livemode_mismatch" }, 400);
    const bookingId = String(refund.metadata?.booking_id || "");
    if (!bookingId || !refund.id || !refund.status) return json({ error: "invalid_refund" }, 400);
    const { error } = await supabase.rpc("record_single_session_refund_status", {
      _booking_id: bookingId,
      _stripe_refund_id: refund.id,
      _provider_status: refund.status,
    });
    if (error) throw error;
    return json({ received: true });
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    if (session.metadata?.product !== "single_session") return json({ received: true, ignored: "not_single_session" });
    if (session.livemode !== expectedLivemode()) return json({ error: "livemode_mismatch" }, 400);
    const bookingId = String(session.metadata?.booking_id || "");
    if (!bookingId || !session.id) return json({ error: "invalid_session" }, 400);
    const { error } = await supabase.rpc("expire_single_session_checkout", {
      _booking_id: bookingId,
      _stripe_checkout_session_id: session.id,
      _reason: "stripe_checkout_expired",
    });
    if (error && error.code !== "P0409") throw error;
    return json({ received: true });
  }

  if (event.type !== "checkout.session.completed") return json({ received: true });
  const session = event.data.object;

  // A payment never changes access. Access is Joshua's decision, made by tier
  // on the People page, and it never changes by itself. The admin notice for
  // this payment is sent from the ledger write above, once per charge.

  if (session.metadata?.product === "single_session") {
    const bookingId = String(session.metadata?.booking_id || "");
    if (!bookingId) return json({ error: "invalid_product" }, 400);
    if (!session.id || typeof session.payment_intent !== "string") return json({ error: "missing_payment_facts" }, 400);
    const { data: booking, error: bookingError } = await supabase.from("single_session_bookings")
      .select("id,status,start_at,end_at,gcal_event_id,event_slug,email,quoted_amount_cents,quoted_currency")
      .eq("id", bookingId).maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return json({ error: "unknown_booking" }, 400);
    const { data: bookingEvent, error: eventError } = await supabase.from("booking_event_types")
      .select("price_cents,currency")
      .eq("slug", booking.event_slug).maybeSingle();
    if (eventError) throw eventError;
    if (!bookingEvent) return json({ error: "unknown_event" }, 400);
    // New holds carry the exact quote used to create Checkout. Rows created
    // before quote persistence use the same override-aware resolver as checkout.
    let expectedAmount = Number(booking.quoted_amount_cents);
    if (!Number.isInteger(booking.quoted_amount_cents)) {
      const { data: legacyAmount, error: legacyPriceError } = await supabase.rpc("booking_price_cents", {
        _event_slug: booking.event_slug,
        _email: booking.email,
      });
      if (legacyPriceError) throw legacyPriceError;
      expectedAmount = Number(legacyAmount ?? bookingEvent.price_cents);
    }
    const expectedCurrency = String(booking.quoted_currency || bookingEvent.currency).toLowerCase();
    const validation = validateSingleSessionCheckout(
      session,
      expectedLivemode(),
      expectedAmount,
      expectedCurrency,
    );
    if (!validation.ok) return json({ error: validation.error }, 400);

    const cancelToken = generateCapabilityToken();
    const encryptedCancelPayload = await encryptEnvelope({
      cancel_token: cancelToken,
      cancel_url: `${APP_ORIGIN}/book/session?cancel_token=${encodeURIComponent(cancelToken)}`,
    }, requiredEnv("SINGLE_SESSION_ENCRYPTION_KEY"));
    const { data: result, error } = await supabase.rpc("finalize_single_session_payment", {
      _booking_id: bookingId,
      _provider_event_id: event.id,
      _stripe_checkout_session_id: session.id,
      _stripe_payment_intent_id: session.payment_intent,
      _amount_cents: session.amount_total,
      _currency: session.currency,
      _livemode: session.livemode,
      _live_calendar_clear: await liveCalendarClear(supabase, booking),
      _cancel_token_hash: await sha256Hex(cancelToken),
      _cancel_payload_ciphertext: encryptedCancelPayload,
    });
    if (error) throw error;
    // Keep the Stripe response fast: the nudge runs after the response is sent
    // when the runtime supports it, and is otherwise best-effort.
    const nudge = kickOutboxWorker();
    const waitUntil = (globalThis as any)?.EdgeRuntime?.waitUntil;
    if (typeof waitUntil === "function") waitUntil.call((globalThis as any).EdgeRuntime, nudge);
    else void nudge;
    return json({ received: true, booking_id: result?.booking_id, status: result?.status });
  }

  // Existing package branch, now protected by immutable payment validation.
  if (session.mode !== "payment" || session.payment_status !== "paid") return json({ error: "payment_not_complete" }, 400);
  if (session.livemode !== expectedLivemode()) return json({ error: "livemode_mismatch" }, 400);
  const paymentLink = typeof session.payment_link === "string" ? session.payment_link : session.payment_link?.id;
  if (!paymentLink) return json({ received: true, ignored: "not_booking_commerce" });
  const { data: offer, error: offerError } = await supabase.from("booking_offers")
    .select("id,credits").eq("provider", "stripe").eq("provider_ref", paymentLink).eq("active", true).maybeSingle();
  if (offerError) throw offerError;
  if (!offer) return json({ received: true, ignored: "unknown_payment_link" });
  const expected = await expectedPaymentLinkFacts(stripeSecret, paymentLink);
  if (session.amount_total !== expected.amount) return json({ error: "amount_mismatch" }, 400);
  if (String(session.currency || "").toLowerCase() !== expected.currency) return json({ error: "currency_mismatch" }, 400);
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const student = await matchStudent(supabase, email, null);
  if (!student) {
    const { error } = await supabase.from("booking_commerce_events").upsert({
      provider: "stripe",
      provider_event_id: event.id,
      event_type: "unmatched_paid",
      offer_id: offer.id,
      email,
      amount_cents: session.amount_total,
      currency: session.currency,
      payload: { checkout_session_id: session.id, payment_link: paymentLink, payment_status: session.payment_status, livemode: session.livemode },
    }, { onConflict: "provider,provider_event_id,event_type" });
    if (error) throw error;
    return json({ received: true, match: "pending" });
  }
  // A package payment never grants passes by itself (decisions/log.md,
  // 2026-09-27). The ledger row above is marked "awaiting", and the teacher
  // grants it from Today with one click (admin_grant_stripe_payment).
  return json({ received: true, student_id: student.id, grant: "awaiting_teacher" });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const raw = await readRaw(req);
    const provider = new URL(req.url).searchParams.get("provider");
    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    if (provider === "stripe") return await handleStripe(supabase, raw, req.headers.get("stripe-signature"));

    if (provider === "calcom") {
      if (!await verifyCal(raw, req.headers.get("x-cal-signature-256"))) return json({ error: "invalid_signature" }, 400);
      const event = JSON.parse(raw);
      const payload = event.payload ?? event;
      const eventType = String(payload.eventType?.slug ?? payload.type ?? "");
      const bookingId = String(payload.uid ?? payload.bookingUid ?? payload.id ?? "");
      const attendee = payload.attendees?.[0] ?? payload.responses ?? {};
      const email = attendee.email ?? payload.email ?? null;
      const name = attendee.name ?? payload.attendeeName ?? null;
      const start = payload.startTime ?? payload.start_at ?? null;
      const end = payload.endTime ?? payload.end_at ?? null;
      if (!bookingId) return json({ error: "missing_booking_id" }, 400);
      const { data: offer, error: offerError } = await supabase.from("booking_offers")
        .select("id,url").eq("provider", "calcom").eq("provider_ref", eventType).maybeSingle();
      if (offerError) throw offerError;
      const student = await matchStudent(supabase, email, name);
      const status = event.triggerEvent === "BOOKING_CANCELLED" ? "cancelled" : "booked";
      let mirror: { googleEventId: string; scheduleEventId: string | null } | null = null;
      if (student && status === "booked" && start && end) mirror = await calendarMirror(supabase, { id: bookingId, email, name, start, end });
      const { error: externalError } = await supabase.from("external_booking_events").upsert({
        provider_booking_id: bookingId,
        student_id: student?.id ?? null,
        offer_id: offer?.id ?? null,
        email,
        attendee_name: name,
        start_at: start,
        end_at: end,
        status,
        source_url: offer?.url ?? null,
        google_event_id: mirror?.googleEventId ?? null,
        schedule_event_id: mirror?.scheduleEventId ?? null,
        payload: { booking_id: bookingId, event_type: event.triggerEvent ?? null, start_at: start, end_at: end },
      }, { onConflict: "provider_booking_id" });
      if (externalError) throw externalError;
      const { error: commerceError } = await supabase.from("booking_commerce_events").upsert({
        provider: "calcom",
        provider_event_id: event.id ?? `${bookingId}:${event.triggerEvent}`,
        event_type: event.triggerEvent ?? "booking",
        student_id: student?.id ?? null,
        offer_id: offer?.id ?? null,
        email,
        payload: { booking_id: bookingId, event_type: event.triggerEvent ?? null, start_at: start, end_at: end },
      }, { onConflict: "provider,provider_event_id,event_type" });
      if (commerceError) throw commerceError;
      return json({ received: true, match: student ? "matched" : "pending" });
    }
    return json({ error: "unknown_provider" }, 400);
  } catch (error) {
    if (error instanceof Error && error.message === "payload_too_large") return json({ error: "payload_too_large" }, 413);
    // Name the failing step: Stripe only ever sees the generic code below.
    console.error("booking-commerce-webhook", {
      error: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code ?? null,
      details: (error as any)?.details ?? null,
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 4).join(" | ") : null,
    });
    return json({ error: "provider_processing_failed" }, 500);
  }
});


/** One notification per admin for each new paid charge. */
async function notifyAdminsOfPayment(
  supabase: { from: (t: string) => any },
  payment: {
    email: string | null;
    name: string | null;
    amountCents: number | null;
    currency: string | null;
    awaitingGrant?: boolean;
    unmatched?: boolean;
  },
) {
  const { data: admins, error } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
  if (error) throw error;
  const who = payment.name || payment.email || "Someone";
  const amount =
    payment.amountCents !== null
      ? ` ${(payment.amountCents / 100).toFixed(2)} ${(payment.currency ?? "").toUpperCase()}`.trimEnd()
      : "";
  const rows = (admins ?? []).map((a: { user_id: string }) => ({
    user_id: a.user_id,
    type: "payment_needs_tier",
    title: "Payment received",
    body: `${who}${payment.email && payment.name ? ` (${payment.email})` : ""} paid${amount}.${
      payment.awaitingGrant ? " It is a package: grant the passes on Today." : ""
    }${payment.unmatched ? " No student account matches this email: link one on Today." : ""} Access has not changed.`,
    link: "/teacher/today",
  }));
  if (rows.length === 0) return;
  const { error: insertError } = await supabase.from("notifications").insert(rows);
  // A failed notice must not abort the webhook: the payment itself is already
  // recorded, and throwing here would make the provider retry the whole event.
  if (insertError) console.error("payment notice failed", { error: insertError });
}


/** The charge a Stripe event is about, for the payments ledger. */
async function chargeIdForLedger(event: any, secret: string): Promise<string | null> {
  const obj = event.data?.object ?? {};
  if (event.type.startsWith("charge.dispute.")) return typeof obj.charge === "string" ? obj.charge : null;
  if (event.type.startsWith("charge.")) return obj.id ?? null;
  if (event.type.startsWith("refund.")) return typeof obj.charge === "string" ? obj.charge : null;
  if (event.type === "checkout.session.completed" && obj.payment_status === "paid" && typeof obj.payment_intent === "string") {
    const intent = await stripeGet(secret, `/payment_intents/${obj.payment_intent}`);
    return typeof intent.latest_charge === "string" ? intent.latest_charge : null;
  }
  return null;
}

/**
 * One email to Joshua per new paid charge. Keyed on the charge id, so a Stripe
 * retry or a second event for the same charge can never send it twice. A failed
 * send is logged (sendAppEmail writes email_send_log) and never fails the webhook.
 */
async function emailJoshuaOfPayment(supabase: any, row: any) {
  try {
    let whatFor = row.product === "single_session" ? "Single session" : row.description || "";
    if (row.offer_id) {
      const { data: offer } = await supabase.from("booking_offers").select("label,credits").eq("id", row.offer_id).maybeSingle();
      if (offer) whatFor = `${offer.label} (package, ${offer.credits} passes)`;
    }
    const amount = new Intl.NumberFormat("en-US", { style: "currency", currency: (row.currency || "usd").toUpperCase() })
      .format(row.amount_cents / 100);
    const paidAt = new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York",
    }).format(new Date(row.paid_at)) + " ET";
    const nextStep = row.grant_state === "awaiting"
      ? "Waiting on you: grant the passes on Today."
      : !row.student_id
        ? "No student account matches this email. Link one on Today."
        : "Nothing waiting on you. It is in the Payments list on Today.";
    await sendAppEmail("payment-received", "", {
      idempotencyKey: `payment-received:${row.stripe_charge_id}`,
      replyTo: row.email ?? undefined,
      templateData: { who: row.payer_name || row.email || "Someone", email: row.email ?? "", amount, paidAt, whatFor, nextStep },
    });
  } catch (err) {
    console.error("payment email failed", { charge: row.stripe_charge_id, error: err instanceof Error ? err.message : String(err) });
  }
}
