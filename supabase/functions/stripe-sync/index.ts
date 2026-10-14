// Admin-only: pull Stripe charges into the stripe_payments ledger.
// POST { days?: number } — default 90 (the three-month history). Read-only on
// Stripe; never grants passes or access (backfilled rows are grant_state none).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  buildPaymentRow,
  loadOfferIndex,
  loadStudentIndex,
  stripeListAll,
  upsertPayment,
} from "../_shared/stripeLedger.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let runId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: claimsRes } = await authClient.auth.getClaims(authHeader.slice(7));
    const userId = claimsRes?.claims?.sub ? String(claimsRes.claims.sub) : null;
    if (!userId) return json({ error: "unauthorized" }, 401);
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (roleError) throw roleError;
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const secret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secret) return json({ error: "stripe_secret_key_not_configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const days = Math.min(Math.max(Number(body.days) || 90, 1), 400);
    const since = Math.floor(Date.now() / 1000) - days * 86400;

    const { data: run } = await supabase.from("stripe_sync_runs")
      .insert({ since: new Date(since * 1000).toISOString() }).select("id").single();
    runId = run?.id ?? null;

    const window = { "created[gte]": String(since) };
    const [charges, sessions, students, offers] = await Promise.all([
      stripeListAll(secret, "/charges", { ...window, "expand[]": "data.customer" }),
      stripeListAll(secret, "/checkout/sessions", window),
      loadStudentIndex(supabase),
      loadOfferIndex(supabase),
    ]);
    const sessionByIntent = new Map<string, any>();
    for (const s of sessions) {
      const pi = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id;
      if (pi) sessionByIntent.set(pi, s);
    }

    let written = 0;
    for (const charge of charges) {
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      await upsertPayment(supabase, buildPaymentRow(charge, pi ? sessionByIntent.get(pi) ?? null : null, students, offers, "backfill"));
      written++;
    }

    if (runId) {
      await supabase.from("stripe_sync_runs")
        .update({ finished_at: new Date().toISOString(), charges_seen: charges.length, rows_written: written })
        .eq("id", runId);
    }
    return json({ ok: true, days, charges: charges.length, written });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("stripe-sync", { error: message });
    if (runId) await supabase.from("stripe_sync_runs").update({ finished_at: new Date().toISOString(), error: message }).eq("id", runId);
    return json({ error: "sync_failed", detail: message }, 500);
  }
});
