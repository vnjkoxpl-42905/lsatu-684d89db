import { useMemo } from "react";
import { useParams } from "react-router-dom";
import CalendlyBookingCard, { type BookingApi } from "@/components/booking/CalendlyBookingCard";

// Public, no-login booking page for per-student links (/book/:slug).
// Talks to the anonymous `public-booking` edge function using the publishable
// (anon) key ONLY — never a user session. The function ignores Authorization
// and resolves identity from the slug, so even if a logged-in user opens this
// page, their JWT is never used (Codex R1 #1 defense).
//
// This page intentionally has NO app chrome (sidebar/nav) and shows no student
// PII — the host is always "Joshua".

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callPublic(slug: string, action: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/public-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ slug, action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `request_failed_${res.status}`);
  }
  return data;
}

export default function PublicBooking() {
  const { slug = "" } = useParams();

  const api: BookingApi = useMemo(() => ({
    loadInfo: async () => {
      const d = await callPublic(slug, "info");
      return {
        pass: d.pass ?? null,
        bookings: (d.redemptions ?? []).map((row: { id: string; start_at: string; status: string; meet_url?: string | null }) => ({ source: "redemption" as const, ...row })),
      };
    },
    loadSlots: async () => {
      const d = await callPublic(slug, "slots");
      return { pass: d.pass ?? null, slots: d.slots ?? [] };
    },
    book: async (startAtIso, idempotencyKey, studentNote) => {
      await callPublic(slug, "book", {
        start_at: startAtIso,
        idempotency_key: idempotencyKey,
        ...(studentNote ? { student_note: studentNote } : {}),
      });
    },
    uploadFiles: async (files, idempotencyKey) => {
      const fd = new FormData();
      fd.append("slug", slug);
      fd.append("idempotency_key", idempotencyKey);
      for (const entry of files) {
        fd.append("files", entry.file, entry.file.name);
        fd.append("client_upload_ids", entry.clientUploadId);
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-upload`, {
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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/booking-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          action: "discard", slug, idempotency_key: idempotencyKey, client_upload_id: clientUploadId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) throw new Error(data?.error || `discard_failed_${res.status}`);
    },
  }), [slug]);

  return (
    <div className="booking-holo min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="holo-surface flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">L</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Booking</h1>
        </div>
        <CalendlyBookingCard api={api} />
        <p className="mt-6 text-center text-xs text-muted-foreground">Powered by LSAT U</p>
      </div>
    </div>
  );
}
