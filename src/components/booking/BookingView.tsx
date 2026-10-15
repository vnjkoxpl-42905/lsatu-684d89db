import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { edgeErrorText } from "@/lib/edgeFunctionError";
import CalendlyBookingCard, { type BookingApi } from "@/components/booking/CalendlyBookingCard";
import BookingOfferHub, { type BookingCommerceItem, type BookingOffer, type ExternalBookingItem } from "@/components/booking/BookingOfferHub";

// The student-facing booking surface, with no page chrome of its own so it can
// sit inside the Schedule shell as a tab.
//
// Order is deliberate and is the fix for the audit's worst finding: a student
// holding paid credits used to land on a three-up sales panel, with the two
// loudest buttons on the page both saying "Buy", and their actual calendar more
// than a screen further down. State and calendar lead; the offers stay
// reachable but demoted (2026-08-13 decision: demote, do not hide).

const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
  // Wait for the session so we never send the anon key as the bearer token —
  // the function reads that as a token with no user and answers 401.
  const { waitForAccessToken } = await import("@/lib/waitForSession");
  const token = await waitForAccessToken();
  if (!token) throw new Error("Please sign in again to load your booking.");
  const { data, error } = await supabase.functions.invoke("student-booking", { body: { action, ...extra } });
  // supabase-js discards the response body on a non-2xx, leaving only the
  // generic wrapper string. Read the real `{ error }` back off the Response so
  // the code (slot_conflict, no_active_pass, ...) survives to the UI, which
  // maps it to something the student can act on.
  if (error) throw new Error(await edgeErrorText(error));
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

export default function BookingView() {
  const queryClient = useQueryClient();
  const [commerce, setCommerce] = useState<{ offers: BookingOffer[]; commerce: BookingCommerceItem[]; external_bookings: ExternalBookingItem[]; bookings: { source: "redemption" | "single_session"; id: string; start_at: string; status: string }[] } | null>(null);
  const [hasCredits, setHasCredits] = useState(false);

  const api: BookingApi = useMemo(() => ({
    loadInfo: async () => {
      const d = (await invoke("info")) as {
        pass: { credits_remaining: number; session_length_minutes: number; total_credits: number; status: string } | null;
        bookings?: { source: "redemption" | "single_session"; id: string; start_at: string; status: string; meet_url?: string | null }[];
        offers?: BookingOffer[];
        commerce?: BookingCommerceItem[];
        external_bookings?: ExternalBookingItem[];
      };
      setCommerce({ offers: d.offers ?? [], commerce: d.commerce ?? [], external_bookings: d.external_bookings ?? [], bookings: d.bookings ?? [] });
      const p = d.pass;
      setHasCredits((p?.credits_remaining ?? 0) > 0);
      return {
        pass: p ? { credits_remaining: p.credits_remaining, session_length_minutes: p.session_length_minutes, total_credits: p.total_credits, status: p.status } : null,
        bookings: d.bookings ?? [],
      };
    },
    loadSlots: async () => {
      const d = (await invoke("slots")) as {
        pass: { credits_remaining: number; session_length_minutes: number } | null;
        slots: { start_at: string; end_at: string }[];
      };
      return { pass: d.pass ?? null, slots: d.slots ?? [] };
    },
    book: async (startAtIso, idempotencyKey, studentNote) => {
      await invoke("book", {
        start_at: startAtIso,
        idempotency_key: idempotencyKey,
        ...(studentNote ? { student_note: studentNote } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["student-booking", "info"] });
    },
    uploadFiles: async (files, idempotencyKey) => {
      const fd = new FormData();
      fd.append("idempotency_key", idempotencyKey);
      for (const entry of files) {
        fd.append("files", entry.file, entry.file.name);
        fd.append("client_upload_ids", entry.clientUploadId);
      }
      const { data, error } = await supabase.functions.invoke("booking-upload", { body: fd });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      const d = data as { uploaded?: number; files?: { client_upload_id: string }[] };
      return {
        uploaded: d.uploaded ?? files.length,
        clientUploadIds: (d.files ?? []).map((entry) => entry.client_upload_id),
      };
    },
    discardUpload: async (clientUploadId, idempotencyKey) => {
      const { data, error } = await supabase.functions.invoke("booking-upload", {
        body: { action: "discard", idempotency_key: idempotencyKey, client_upload_id: clientUploadId },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
    },
  }), [queryClient]);

  const offerHub = commerce ? (
    <BookingOfferHub
      offers={commerce.offers}
      commerce={commerce.commerce}
      externalBookings={commerce.external_bookings}
      bookings={commerce.bookings}
      demoted={hasCredits}
    />
  ) : null;

  return (
    <div className="pb-20">
      {/* No credits: the offers ARE the next step, so they lead. */}
      {!hasCredits ? offerHub : null}

      <CalendlyBookingCard
        api={api}
        theme="app"
        sessionHeadingLevel="h3"
        noPassDescription="Choose a single session or a package below to get started, or message Joshua if you need help."
      />

      {/* Credits in hand: the calendar was the point, so buying trails it. */}
      {hasCredits ? <div className="mt-8">{offerHub}</div> : null}
    </div>
  );
}
