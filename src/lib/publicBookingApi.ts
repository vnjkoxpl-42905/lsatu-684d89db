import type { BookingApi } from "@/components/booking/CalendlyBookingCard";

// Only documented refusals that occur before redemption may release a fresh intent.
// A conflict on a retry still requires the caller to reconcile its pending intent.
const PRECOMMIT_CODES = new Set(["payload_too_large", "invalid_link", "rate_limited", "invalid_start_at", "invalid_idempotency_key", "no_sessions_remaining", "slot_conflict", "slot_unavailable", "pass_exhausted", "pass_expired", "pass_not_active"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class PublicBookingError extends Error {
  readonly definitiveRefusal: boolean;
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
    this.name = "PublicBookingError";
    this.definitiveRefusal = status >= 400 && status < 500 && PRECOMMIT_CODES.has(code);
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callPublic(slug: string, action: string, extra: Record<string, unknown> = {}, fetcher: typeof fetch = fetch) {
  let res: Response;
  try { res = await fetcher(`${SUPABASE_URL}/functions/v1/public-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ slug, action, ...extra }),
  }); } catch { throw new PublicBookingError(0, "network_error"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new PublicBookingError(res.status, data?.error || `request_failed_${res.status}`);
  }
  return data;
}

// Anonymous credentials only. Never consult an authenticated Supabase session.
export function createPublicBookingApi(slug: string, fetcher: typeof fetch = fetch, options: { allowMissingReplay?: boolean } = {}): BookingApi {
  if (!/^[a-zA-Z0-9_-]{3,128}$/.test(slug)) throw new PublicBookingError(404, "invalid_link");
  return {
    loadInfo: async () => {
      const d = await callPublic(slug, "info", {}, fetcher);
      return {
        pass: d.pass ?? null,
        bookings: (d.redemptions ?? []).map((row: { id: string; start_at: string; status: string; meet_url?: string | null }) => ({ source: "redemption" as const, ...row })),
      };
    },
    loadSlots: async () => {
      const d = await callPublic(slug, "slots", {}, fetcher);
      return { pass: d.pass ?? null, slots: d.slots ?? [] };
    },
    book: async (startAtIso, idempotencyKey, studentNote) => {
      const result = await callPublic(slug, "book", {
        start_at: startAtIso,
        idempotency_key: idempotencyKey,
        ...(studentNote ? { student_note: studentNote } : {}),
      }, fetcher);
      const row = result?.redemption;
      // Preserve the public student route's existing committed-replay contract.
      // Teacher callers keep strict redemption proof and independent readback.
      if (options.allowMissingReplay && result?.ok === true && result.was_existing === true && row == null) return;
      if (result?.ok !== true || !row || !UUID.test(row.id ?? "") || row.status !== "booked" || !Number.isFinite(Date.parse(startAtIso)) || Date.parse(row.start_at) !== Date.parse(startAtIso) || typeof result.was_existing !== "boolean") {
        throw new PublicBookingError(200, "invalid_booking_response");
      }
    },
    uploadFiles: async (files, idempotencyKey) => {
      const fd = new FormData();
      fd.append("slug", slug);
      fd.append("idempotency_key", idempotencyKey);
      for (const entry of files) {
        fd.append("files", entry.file, entry.file.name);
        fd.append("client_upload_ids", entry.clientUploadId);
      }
      const res = await fetcher(`${SUPABASE_URL}/functions/v1/booking-upload`, {
        method: "POST",
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || `upload_failed_${res.status}`);
      return {
        uploaded: data.uploaded ?? files.length,
        clientUploadIds: (data.files ?? []).map((entry: { client_upload_id: string }) => entry.client_upload_id),
      };
    },
    discardUpload: async (clientUploadId, idempotencyKey) => {
      const res = await fetcher(`${SUPABASE_URL}/functions/v1/booking-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          action: "discard", slug, idempotency_key: idempotencyKey, client_upload_id: clientUploadId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || `discard_failed_${res.status}`);
    },
  };
}
