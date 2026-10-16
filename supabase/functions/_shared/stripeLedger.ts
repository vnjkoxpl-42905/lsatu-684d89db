// Stripe payments ledger: turn a Stripe charge (plus its Checkout Session, when
// there is one) into a stripe_payments row. Shared by booking-commerce-webhook
// (live events) and stripe-sync (backfill + refresh).
//
// Upserts never overwrite a teacher decision: a linked student, an ignored
// payer, or a granted/dismissed package stays as the teacher left it. Only the
// Stripe facts (status, refunds, payer details) refresh.

const STRIPE_API = "https://api.stripe.com/v1";

export async function stripeGet(secret: string, path: string, params: Record<string, string | string[]> = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else qs.append(key, value);
  }
  const res = await fetch(`${STRIPE_API}${path}${qs.size ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`stripe_${res.status}_${body?.error?.code ?? body?.error?.type ?? "error"}`);
  return body;
}

/** Every page of a Stripe list endpoint, oldest cap by `created[gte]`. */
export async function stripeListAll(secret: string, path: string, params: Record<string, string | string[]>, max = 5000) {
  const out: any[] = [];
  let startingAfter: string | null = null;
  while (out.length < max) {
    const page = await stripeGet(secret, path, {
      ...params,
      limit: "100",
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    out.push(...(page.data ?? []));
    if (!page.has_more || !page.data?.length) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return out;
}

export function chargeStatus(charge: any): string {
  if (charge.disputed) return "disputed";
  if (charge.status === "failed") return "failed";
  if (charge.status === "pending") return "pending";
  if (charge.refunded) return "refunded";
  if ((charge.amount_refunded ?? 0) > 0) return "partially_refunded";
  return "succeeded";
}

export type StudentIndex = Map<string, string>;

/** Lowercased email -> student id, for everyone with a profile. */
export async function loadStudentIndex(supabase: any): Promise<StudentIndex> {
  const index: StudentIndex = new Map();
  const { data: profiles, error } = await supabase.from("profiles").select("class_id");
  if (error) throw error;
  const hasProfile = new Set((profiles ?? []).map((p: any) => p.class_id));
  for (let page = 1; page <= 20; page++) {
    const { data, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (usersError) throw usersError;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && hasProfile.has(u.id)) index.set(u.email.trim().toLowerCase(), u.id);
    }
    if (users.length < 200) break;
  }
  return index;
}

/** Stripe payment link id -> active package offer (id, credits). */
export async function loadOfferIndex(supabase: any): Promise<Map<string, { id: string; credits: number }>> {
  const { data, error } = await supabase.from("booking_offers")
    .select("id,credits,provider_ref").eq("provider", "stripe").eq("active", true);
  if (error) throw error;
  return new Map((data ?? []).map((o: any) => [o.provider_ref, { id: o.id, credits: o.credits }]));
}

export function buildPaymentRow(
  charge: any,
  session: any | null,
  students: StudentIndex,
  offers: Map<string, { id: string; credits: number }>,
  source: "webhook" | "backfill",
) {
  const email: string | null =
    session?.customer_details?.email ?? charge.billing_details?.email ?? charge.receipt_email ?? session?.customer_email ??
    (typeof charge.customer === "object" ? charge.customer?.email : null) ?? null;
  const paymentLink = typeof session?.payment_link === "string" ? session.payment_link : session?.payment_link?.id ?? null;
  const offer = paymentLink ? offers.get(paymentLink) : undefined;
  const studentId = email ? students.get(email.trim().toLowerCase()) ?? null : null;
  const status = chargeStatus(charge);
  const isPackage = !!offer && offer.credits > 0;
  return {
    stripe_charge_id: charge.id,
    payment_intent_id: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null,
    checkout_session_id: session?.id ?? null,
    payment_link_id: paymentLink,
    customer_id: typeof charge.customer === "string" ? charge.customer : charge.customer?.id ?? null,
    email,
    payer_name: session?.customer_details?.name ?? charge.billing_details?.name ??
      (typeof charge.customer === "object" ? charge.customer?.name : null) ?? null,
    description: charge.description ?? null,
    product: session?.metadata?.product ?? (isPackage ? "package" : null),
    amount_cents: charge.amount,
    amount_refunded_cents: charge.amount_refunded ?? 0,
    currency: String(charge.currency ?? "").toLowerCase(),
    status,
    paid_at: new Date(charge.created * 1000).toISOString(),
    livemode: !!charge.livemode,
    student_id: studentId,
    match_state: studentId ? "matched" : "unmatched",
    offer_id: offer?.id ?? null,
    // Backfilled history never asks for a grant: old packages were handled by hand.
    grant_state: isPackage && studentId && status === "succeeded" && source === "webhook" ? "awaiting" : "none",
    // Insert-only rollout provenance. Existing/manual history is never opted in.
    auto_grant_eligible: source === "webhook",
    source,
  };
}

/**
 * Insert, or refresh Stripe facts on an existing row without touching teacher
 * decisions. Returns true only when this call created the row, so exactly one
 * writer (webhook or sync) ever announces a new payment.
 */
export async function upsertPayment(supabase: any, row: ReturnType<typeof buildPaymentRow>): Promise<boolean> {
  const { data: existing, error } = await supabase.from("stripe_payments")
    .select("id,match_state,grant_state,student_id,source,status,auto_grant_eligible").eq("stripe_charge_id", row.stripe_charge_id).maybeSingle();
  if (error) throw error;
  if (!existing) {
    const { error: insertError } = await supabase.from("stripe_payments").insert(row);
    // A concurrent writer (webhook vs sync) inserted first: fall through to update.
    if (!insertError) return true;
    if (insertError.code !== "23505") throw insertError;
    return upsertPayment(supabase, row);
  }
  const facts: Record<string, unknown> = {
    payment_intent_id: row.payment_intent_id,
    checkout_session_id: row.checkout_session_id ?? undefined,
    payment_link_id: row.payment_link_id ?? undefined,
    customer_id: row.customer_id,
    email: row.email,
    payer_name: row.payer_name,
    description: row.description,
    product: row.product ?? undefined,
    amount_cents: row.amount_cents,
    amount_refunded_cents: row.amount_refunded_cents,
    currency: row.currency,
    status: row.status,
    offer_id: row.offer_id ?? undefined,
    updated_at: new Date().toISOString(),
  };
  for (const k of Object.keys(facts)) if (facts[k] === undefined) delete facts[k];
  const { error: updateError } = await supabase.from("stripe_payments").update(facts).eq("id", existing.id);
  if (updateError) throw updateError;
  if (existing.match_state === "unmatched" && row.student_id) {
    const { error: matchError } = await supabase.from("stripe_payments")
      .update({ student_id: row.student_id, match_state: "matched" }).eq("id", existing.id).eq("match_state", "unmatched");
    if (matchError) throw matchError;
  }
  // Only a live row inserted after rollout can become newly eligible (a charge
  // can arrive before Checkout facts). History and unmatched payments stay for review; never overwrite a dismissal or
  // concurrent grant using the earlier (potentially stale) SELECT.
  if (existing.auto_grant_eligible && existing.source === "webhook" && existing.match_state === "matched" && row.grant_state === "awaiting") {
    const { error: transitionError } = await supabase.from("stripe_payments")
      .update({ grant_state: "awaiting" }).eq("id", existing.id).eq("source", "webhook")
      .eq("auto_grant_eligible", true).eq("grant_state", "none").eq("match_state", "matched").eq("student_id", row.student_id).eq("status", "succeeded");
    if (transitionError) throw transitionError;
  }
  return false;
}

/** Record one charge (by id) into the ledger, looking up its Checkout Session. */
export async function recordCharge(supabase: any, secret: string, chargeId: string, source: "webhook" | "backfill") {
  const charge = await stripeGet(secret, `/charges/${chargeId}`, { "expand[]": "customer" });
  let session: any = null;
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (pi) {
    const sessions = await stripeGet(secret, "/checkout/sessions", { payment_intent: pi, limit: "1" });
    session = sessions.data?.[0] ?? null;
  }
  const [students, offers] = await Promise.all([loadStudentIndex(supabase), loadOfferIndex(supabase)]);
  const row = buildPaymentRow(charge, session, students, offers, source);
  const inserted = await upsertPayment(supabase, row);
  return { inserted, row };
}
