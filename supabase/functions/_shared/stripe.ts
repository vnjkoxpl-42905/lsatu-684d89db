import { parseStripeSignature } from "./singleSessionCore.ts";

const API = "https://api.stripe.com/v1";
const encoder = new TextEncoder();

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifyStripeWebhookSignature(
  raw: string,
  header: string | null,
  secret: string,
  nowMs = Date.now(),
  toleranceSeconds = 300,
): Promise<boolean> {
  const parsed = parseStripeSignature(header);
  if (!parsed || !secret || Math.abs(nowMs / 1000 - parsed.timestamp) > toleranceSeconds) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(`${parsed.timestamp}.${raw}`)));
  const expected = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return parsed.signatures.some((signature) => safeEqual(signature, expected));
}

function appendForm(form: URLSearchParams, key: string, value: any): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendForm(form, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) appendForm(form, `${key}[${childKey}]`, childValue);
    return;
  }
  form.append(key, String(value));
}

function stripeForm(params: Record<string, any>): URLSearchParams {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) appendForm(form, key, value);
  return form;
}

async function stripeRequest(
  secret: string,
  method: "GET" | "POST",
  path: string,
  params: Record<string, any> = {},
  idempotencyKey?: string,
): Promise<any> {
  if (!secret) throw new Error("stripe_secret_key_not_configured");
  const form = stripeForm(params);
  const url = `${API}${path}${method === "GET" && form.size ? `?${form}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" ? form : undefined,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `stripe_http_${response.status}`) as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = body?.error?.code;
    throw error;
  }
  return body;
}

export type StripeCheckoutSession = {
  id: string;
  url?: string | null;
  expires_at?: number;
  status?: string | null;
  payment_status?: string;
  payment_intent?: string | { id: string } | null;
  payment_link?: string | { id: string } | null;
  amount_total?: number | null;
  currency?: string | null;
  mode?: string;
  livemode?: boolean;
  customer_email?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string>;
};

export type StripeRefund = {
  id: string;
  status?: string | null;
  livemode?: boolean;
  metadata?: Record<string, string>;
};

export async function createCheckoutSession(secret: string, params: Record<string, any>, idempotencyKey: string): Promise<StripeCheckoutSession> {
  return stripeRequest(secret, "POST", "/checkout/sessions", params, idempotencyKey);
}

export async function retrieveCheckoutSession(secret: string, id: string): Promise<StripeCheckoutSession> {
  return stripeRequest(secret, "GET", `/checkout/sessions/${encodeURIComponent(id)}`);
}

export async function expireCheckoutSession(secret: string, id: string): Promise<StripeCheckoutSession> {
  return stripeRequest(secret, "POST", `/checkout/sessions/${encodeURIComponent(id)}/expire`);
}

export async function searchCheckoutSessions(secret: string, bookingId: string): Promise<StripeCheckoutSession[]> {
  const result = await stripeRequest(secret, "GET", "/checkout/sessions/search", {
    query: `metadata['booking_id']:'${bookingId.replace(/'/g, "")}'`,
    limit: 10,
  });
  return result?.data ?? [];
}

export async function createRefund(secret: string, params: Record<string, any>, idempotencyKey: string): Promise<StripeRefund> {
  return stripeRequest(secret, "POST", "/refunds", params, idempotencyKey);
}

export async function retrieveRefund(secret: string, id: string): Promise<StripeRefund> {
  return stripeRequest(secret, "GET", `/refunds/${encodeURIComponent(id)}`);
}

export async function retrievePaymentLink(secret: string, id: string): Promise<any> {
  return stripeRequest(secret, "GET", `/payment_links/${encodeURIComponent(id)}`);
}

export async function listPaymentLinkLineItems(secret: string, id: string): Promise<any[]> {
  const result = await stripeRequest(secret, "GET", `/payment_links/${encodeURIComponent(id)}/line_items`, { limit: 100 });
  return result?.data ?? [];
}
