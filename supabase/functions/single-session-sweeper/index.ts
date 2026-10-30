import { createClient } from "npm:@supabase/supabase-js@2";

import { deleteEvent } from "../_shared/googleCalendar.ts";
import { decryptEnvelope } from "../_shared/singleSessionCrypto.ts";
import { deterministicSingleSessionEventId } from "../_shared/singleSessionCore.ts";
import {
  createCheckoutSession,
  expireCheckoutSession,
  retrieveCheckoutSession,
  searchCheckoutSessions,
  type StripeCheckoutSession,
} from "../_shared/stripe.ts";

const WORKER_NAME = "single-session-sweeper";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name.toLowerCase()}_not_configured`);
  return value;
}

function authorize(req: Request): boolean {
  const expected = requiredEnv("BOOKING_WORKER_SECRET");
  const actual = req.headers.get("x-worker-secret") || "";
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  return difference === 0;
}

async function heartbeat(supabase: any, phase: "start" | "success" | "error", error?: string, metadata: Record<string, unknown> = {}) {
  const { error: heartbeatError } = await supabase.rpc("record_booking_worker_heartbeat", {
    _worker_name: WORKER_NAME,
    _phase: phase,
    _error: error ?? null,
    _metadata: metadata,
  });
  if (heartbeatError) throw heartbeatError;
}

async function targetCalendar(supabase: any): Promise<string> {
  const { data, error } = await supabase.from("gcal_sync_state").select("calendar_id").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data?.calendar_id || "primary";
}

async function resolve(supabase: any, booking: any, resolution: string, session?: StripeCheckoutSession | null) {
  const { data, error } = await supabase.rpc("resolve_single_session_sweep", {
    _booking_id: booking.id,
    _sweep_lease_token: booking.sweep_lease_token,
    _resolution: resolution,
    _stripe_session_id: session?.id ?? null,
    _stripe_expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
  });
  if (error) throw error;
  return data;
}

async function findSession(stripeSecret: string, bookingId: string): Promise<StripeCheckoutSession | null> {
  const results = await searchCheckoutSessions(stripeSecret, bookingId);
  return results.find((session) => session.metadata?.booking_id === bookingId) ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    if (!authorize(req)) return json({ error: "unauthorized" }, 401);
    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    await heartbeat(supabase, "start");
    const { data: bookings, error: claimError } = await supabase.rpc("claim_single_session_sweeps", {
      _worker_id: `${WORKER_NAME}:${crypto.randomUUID()}`,
      _limit: 20,
      _lease_seconds: 240,
    });
    if (claimError) throw claimError;
    const stripeSecret = requiredEnv("STRIPE_SECRET_KEY");
    const calendar = await targetCalendar(supabase);
    const outcomes: { booking_id: string; outcome: string }[] = [];

    for (const booking of bookings ?? []) {
      try {
        if (!booking.checkout_request_fingerprint && !booking.stripe_checkout_session_id) {
          await resolve(supabase, booking, "expired_no_checkout");
          await deleteEvent(calendar, booking.gcal_event_id || deterministicSingleSessionEventId(booking.id), { sendUpdates: "none" });
          outcomes.push({ booking_id: booking.id, outcome: "expired_no_checkout" });
          continue;
        }

        let session: StripeCheckoutSession | null = null;
        if (booking.stripe_checkout_session_id) {
          session = await retrieveCheckoutSession(stripeSecret, booking.stripe_checkout_session_id);
        } else {
          const fingerprint = await decryptEnvelope<Record<string, any>>(
            booking.checkout_request_fingerprint,
            requiredEnv("SINGLE_SESSION_ENCRYPTION_KEY"),
          );
          try {
            session = await createCheckoutSession(stripeSecret, fingerprint, booking.id);
          } catch (createError) {
            // If the original request never reached Stripe, replaying an old
            // fingerprint can now fail because its fixed expiry is in the past.
            // Search is the provider-authoritative absence check before purge.
            session = await findSession(stripeSecret, booking.id);
            if (!session) {
              await resolve(supabase, booking, "stripe_absent");
              await deleteEvent(calendar, booking.gcal_event_id || deterministicSingleSessionEventId(booking.id), { sendUpdates: "none" });
              outcomes.push({ booking_id: booking.id, outcome: "stripe_absent" });
              continue;
            }
            console.warn("single-session checkout replay adopted provider session", { bookingId: booking.id, checkoutSessionId: session.id, createError: createError instanceof Error ? createError.message : String(createError) });
          }
        }

        // A completed payment belongs to webhook arbitration. Never expire it.
        if (session.payment_status === "paid" || session.status === "complete") {
          outcomes.push({ booking_id: booking.id, outcome: "paid_awaiting_webhook" });
          continue;
        }
        if (session.status === "open") session = await expireCheckoutSession(stripeSecret, session.id);
        await resolve(supabase, booking, "stripe_expired", session);
        await deleteEvent(calendar, booking.gcal_event_id || deterministicSingleSessionEventId(booking.id), { sendUpdates: "none" });
        outcomes.push({ booking_id: booking.id, outcome: "stripe_expired" });
      } catch (error) {
        console.error("single-session sweep failed", { bookingId: booking.id, error: error instanceof Error ? error.message : String(error) });
        outcomes.push({ booking_id: booking.id, outcome: "retry" });
      }
    }

    const { data: purge, error: purgeError } = await supabase.rpc("purge_single_session_pii", { _now: new Date().toISOString() });
    if (purgeError) throw purgeError;
    await heartbeat(supabase, "success", undefined, { processed: outcomes.length, purge });
    return json({ processed: outcomes.length, outcomes, purge });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
      await heartbeat(supabase, "error", message);
    } catch (_) { /* fail-closed response remains visible to the scheduler */ }
    console.error("single-session-sweeper error", { error: message });
    return json({ error: "worker_failed" }, 500);
  }
});
