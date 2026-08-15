// Verified Stripe + Cal.com commerce ingress for the invite-only Booking hub.
// Provider ids are persisted before changing a pass so retries are harmless.
import { createClient } from "npm:@supabase/supabase-js@2";
import { insertEvent, meetUrlFromEvent } from "../_shared/googleCalendar.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});

const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let same = 0;
  for (let i = 0; i < a.length; i++) same |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return same === 0;
}

async function verifyStripe(raw: string, signature: string | null) {
  const secret = Deno.env.get("STRIPE_BOOKING_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=", 2)));
  if (!parts.t || !parts.v1) return false;
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  return safeEqual(await hmac(secret, `${parts.t}.${raw}`), parts.v1);
}

async function verifyCal(raw: string, signature: string | null) {
  const secret = Deno.env.get("CALCOM_BOOKING_WEBHOOK_SECRET");
  return !!secret && !!signature && safeEqual(await hmac(secret, raw), signature.replace(/^sha256=/i, ""));
}

// profiles has no `email` column — profiles.class_id IS the auth user id, and
// the email lives on auth.users. Match by auth email first, then by name.
async function matchStudent(supabase: any, email: string | null, name: string | null) {
  if (email) {
    const wanted = email.trim().toLowerCase();
    let page = 1;
    while (page <= 5) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const users = data?.users ?? [];
      const hit = users.find((u: any) => (u.email ?? "").trim().toLowerCase() === wanted);
      if (hit) {
        const { data: profile } = await supabase
          .from("profiles").select("class_id,display_name").eq("class_id", hit.id).maybeSingle();
        if (profile) return { id: profile.class_id, display_name: profile.display_name, email: hit.email };
      }
      if (users.length < 200) break;
      page++;
    }
  }
  if (name) {
    const normalized = name.trim().replace(/\s+/g, " ");
    const { data } = await supabase
      .from("profiles").select("class_id,display_name").ilike("display_name", normalized).limit(2);
    if ((data ?? []).length === 1) {
      return { id: data[0].class_id, display_name: data[0].display_name, email };
    }
  }
  return null;
}

async function calendarMirror(supabase: any, booking: { id: string; email: string | null; name: string | null; start: string; end: string }) {
  const { data: state } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
  const calendarId = state?.calendar_id || "primary";
  const event = await insertEvent(calendarId, {
    summary: `${(booking.name || booking.email || "Student").trim().split(/\s+/)[0]} session`,
    description: "Booked through Cal.com and mirrored by LSAT U.",
    start: { dateTime: booking.start }, end: { dateTime: booking.end },
    attendees: booking.email ? [{ email: booking.email }] : undefined,
    extendedProperties: { private: { lsatu_calcom_booking_id: booking.id } },
  }, { conferenceDataVersion: 1, sendUpdates: booking.email ? "all" : "none" });
  const { data: mirrored } = await supabase.from("schedule_events").upsert({
    google_event_id: event.id, calendar_id: calendarId, title: event.summary,
    description: event.description, start_at: booking.start, end_at: booking.end,
    all_day: false, status: event.status ?? "confirmed", html_link: event.htmlLink ?? null,
    meet_url: meetUrlFromEvent(event), source: "calcom", etag: event.etag ?? null,
    last_synced_at: new Date().toISOString(), deleted_at: null,
  }, { onConflict: "google_event_id" }).select("id").maybeSingle();
  return { googleEventId: event.id as string, scheduleEventId: mirrored?.id ?? null };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const raw = await req.text();
  const provider = new URL(req.url).searchParams.get("provider");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    if (provider === "stripe") {
      if (!await verifyStripe(raw, req.headers.get("stripe-signature"))) return json({ error: "invalid_signature" }, 400);
      const event = JSON.parse(raw);
      if (event.type !== "checkout.session.completed") return json({ received: true });
      const session = event.data?.object ?? {};
      const paymentLink = String(session.payment_link ?? "");
      const email = session.customer_details?.email ?? session.customer_email ?? null;
      const { data: offer } = await supabase.from("booking_offers").select("id,credits").eq("provider", "stripe").eq("provider_ref", paymentLink).maybeSingle();
      if (!offer) return json({ received: true, ignored: "unknown_payment_link" });
      const student = await matchStudent(supabase, email, null);
      if (!student) {
        await supabase.from("booking_commerce_events").upsert({ provider: "stripe", provider_event_id: event.id, event_type: "unmatched_paid", offer_id: offer.id, email, amount_cents: session.amount_total ?? null, currency: session.currency ?? null, payload: event }, { onConflict: "provider,provider_event_id,event_type" });
        return json({ received: true, match: "pending" });
      }
      await supabase.rpc("apply_booking_package_payment", { _student_id: student.id, _offer_id: offer.id, _provider_event_id: event.id, _email: email });
      return json({ received: true, student_id: student.id });
    }

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
      const { data: offer } = await supabase.from("booking_offers").select("id,url").eq("provider", "calcom").eq("provider_ref", eventType).maybeSingle();
      const student = await matchStudent(supabase, email, name);
      const status = event.triggerEvent === "BOOKING_CANCELLED" ? "cancelled" : "booked";
      let mirror: { googleEventId: string; scheduleEventId: string | null } | null = null;
      if (student && status === "booked" && start && end) mirror = await calendarMirror(supabase, { id: bookingId, email, name, start, end });
      await supabase.from("external_booking_events").upsert({
        provider_booking_id: bookingId, student_id: student?.id ?? null, offer_id: offer?.id ?? null,
        email, attendee_name: name, start_at: start, end_at: end, status, source_url: offer?.url ?? null,
        google_event_id: mirror?.googleEventId ?? null, schedule_event_id: mirror?.scheduleEventId ?? null, payload,
      }, { onConflict: "provider_booking_id" });
      await supabase.from("booking_commerce_events").upsert({ provider: "calcom", provider_event_id: event.id ?? `${bookingId}:${event.triggerEvent}`, event_type: event.triggerEvent ?? "booking", student_id: student?.id ?? null, offer_id: offer?.id ?? null, email, payload: event }, { onConflict: "provider,provider_event_id,event_type" });
      return json({ received: true, match: student ? "matched" : "pending" });
    }
    return json({ error: "unknown_provider" }, 400);
  } catch (error) {
    console.error("booking-commerce-webhook", error);
    return json({ error: "provider_processing_failed" }, 500);
  }
});
