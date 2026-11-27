const RECIPIENT = "contact@aspiringattorneys.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SIGNATURE = /^[0-9a-f]{64}$/;
const PROJECT_REF = /^[a-z]{20}$/;
const encoder = new TextEncoder();

type WorkerOptions = {
  enabled: boolean;
  projectRef?: string;
  signingSecret?: string;
  resendKey?: string;
  from?: string;
  fetcher?: typeof fetch;
  now?: () => number;
};

// Input is a short-lived signed envelope from the database scheduler. The
// worker holds no Supabase credentials and has one fixed destination mailbox.
export async function deliverInboxAlert(
  req: Request,
  options: WorkerOptions,
): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const { enabled, projectRef, signingSecret, resendKey, from } = options;
  if (
    !enabled || !projectRef || !PROJECT_REF.test(projectRef) ||
    !signingSecret || signingSecret.length < 32 || !resendKey || !from
  ) {
    return new Response(null, { status: 503 });
  }
  const signature = req.headers.get("x-lsatu-signature");
  if (!signature || !SIGNATURE.test(signature)) {
    return new Response(null, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 512) return new Response(null, { status: 413 });

  let payload: {
    message_id?: unknown;
    thread_id?: unknown;
    signed_at?: unknown;
  };
  try {
    const raw = await req.text();
    if (raw.length > 512) return new Response(null, { status: 413 });
    payload = JSON.parse(raw);
    if (!payload || typeof payload !== "object") {
      return new Response(null, { status: 400 });
    }
  } catch {
    return new Response(null, { status: 400 });
  }
  const { message_id, thread_id, signed_at } = payload;
  if (
    Object.keys(payload).length !== 3 || typeof message_id !== "string" ||
    !UUID.test(message_id) ||
    typeof thread_id !== "string" || !UUID.test(thread_id) ||
    typeof signed_at !== "number" ||
    !Number.isSafeInteger(signed_at)
  ) return new Response(null, { status: 400 });

  const now = Math.floor((options.now?.() ?? Date.now()) / 1000);
  if (Math.abs(now - signed_at) > 120) {
    return new Response(null, { status: 408 });
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signatureBytes = Uint8Array.from(
    signature.match(/.{2}/g)!,
    (value) => Number.parseInt(value, 16),
  );
  const signedText =
    `lsatu-inbox-alert-v1:${projectRef}:${signed_at}:${thread_id}:${message_id}`;
  if (
    !await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(signedText),
    )
  ) {
    return new Response(null, { status: 401 });
  }

  try {
    const result = await (options.fetcher ?? fetch)(
      "https://api.resend.com/emails",
      {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `lsatu-inbox-alert-v1/${projectRef}/${message_id}`,
        },
        body: JSON.stringify({
          from,
          to: [RECIPIENT],
          subject: "[LSAT U Inbox] New student message",
          text: `thread_id: ${thread_id}\nmessage_id: ${message_id}`,
        }),
      },
    );
    if (result.ok) return new Response(null, { status: 204 });
    return new Response(null, {
      status: result.status >= 400 && result.status <= 599
        ? result.status
        : 502,
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}

if (import.meta.main) {
  Deno.serve((req) =>
    deliverInboxAlert(req, {
      enabled: Deno.env.get("INBOX_ALERT_DELIVERY_ENABLED") === "true",
      projectRef: Deno.env.get("INBOX_ALERT_PROJECT_REF"),
      signingSecret: Deno.env.get("INBOX_ALERT_SIGNING_SECRET"),
      resendKey: Deno.env.get("RESEND_API_KEY"),
      from: Deno.env.get("FROM_EMAIL"),
    })
  );
}
