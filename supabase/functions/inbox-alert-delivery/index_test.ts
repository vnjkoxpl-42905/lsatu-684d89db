import { deliverInboxAlert } from "./index.ts";

const fixture = {
  projectRef: "atrcqxpmqrynmtvvyjju",
  signingSecret: "synthetic-credential-synthetic-credential-",
  resendKey: "synthetic-resend-key",
  from: "LSAT U <fixture@example.test>",
};
const testTime = 1_780_000_000;
const event = {
  thread_id: "20000000-0000-4000-8000-000000000001",
  message_id: "30000000-0000-4000-8000-000000000004",
  signed_at: testTime,
};

async function sign(payload = event) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(fixture.signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signingText =
    `lsatu-inbox-alert-v1:${fixture.projectRef}:${payload.signed_at}:${payload.thread_id}:${payload.message_id}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(signingText),
  );
  return Array.from(
    new Uint8Array(signature),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

function request(body = event, signature?: string) {
  const headers = { "Content-Type": "application/json" };
  return new Request("https://worker.example.test", {
    method: "POST",
    headers: signature
      ? { ...headers, "x-lsatu-signature": signature }
      : headers,
    body: JSON.stringify(body),
  });
}

function assertEqual(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("disabled, unsigned, stale, extra-field and tampered alerts never call Resend", async () => {
  const signature = await sign();
  let calls = 0;
  const options = {
    ...fixture,
    enabled: true,
    now: () => testTime * 1000,
    fetcher: (() => {
      calls++;
      return Promise.resolve(new Response(null, { status: 200 }));
    }) as typeof fetch,
  };
  assertEqual(
    (await deliverInboxAlert(request(event, signature), {
      ...options,
      enabled: false,
    })).status,
    503,
  );
  assertEqual((await deliverInboxAlert(request(), options)).status, 401);
  assertEqual(
    (await deliverInboxAlert(request(event, signature), {
      ...options,
      now: () => (testTime + 121) * 1000,
    })).status,
    408,
  );
  assertEqual(
    (await deliverInboxAlert(
      request({ ...event, text: "Private message" } as typeof event, signature),
      options,
    )).status,
    400,
  );
  assertEqual(
    (await deliverInboxAlert(
      request({ ...event, thread_id: event.message_id }, signature),
      options,
    )).status,
    401,
  );
  assertEqual(calls, 0);
});

Deno.test("approved signed retries send IDs to the fixed mailbox under the same provider key", async () => {
  const signature = await sign();
  const calls: Array<{ url: string; key: string | null; body: unknown }> = [];
  const options = {
    ...fixture,
    enabled: true,
    now: () => (testTime + 60) * 1000,
    fetcher: ((url: URL | Request | string, init?: RequestInit) => {
      calls.push({
        url: String(url),
        key: new Headers(init?.headers).get("Idempotency-Key"),
        body: JSON.parse(String(init?.body)),
      });
      return Promise.resolve(
        new Response(null, { status: calls.length === 1 ? 429 : 200 }),
      );
    }) as typeof fetch,
  };
  assertEqual(
    (await deliverInboxAlert(request(event, signature), options)).status,
    429,
  );
  const retry = { ...event, signed_at: testTime + 60 };
  assertEqual(
    (await deliverInboxAlert(request(retry, await sign(retry)), options))
      .status,
    204,
  );
  assertEqual(calls[0], calls[1]);
  assertEqual(calls[0], {
    url: "https://api.resend.com/emails",
    key: `lsatu-inbox-alert-v1/${fixture.projectRef}/${event.message_id}`,
    body: {
      from: fixture.from,
      to: ["contact@aspiringattorneys.com"],
      subject: "[LSAT U Inbox] New student message",
      text: `thread_id: ${event.thread_id}\nmessage_id: ${event.message_id}`,
    },
  });
});
