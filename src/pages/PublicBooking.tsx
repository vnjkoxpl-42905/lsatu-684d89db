import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { createPublicBookingApi } from "@/lib/publicBookingApi";
import CalendlyBookingCard, { type BookingApi } from "@/components/booking/CalendlyBookingCard";

// Public, no-login booking page for per-student links (/book/:slug).
// Talks to the anonymous `public-booking` edge function using the publishable
// (anon) key ONLY — never a user session. The function ignores Authorization
// and resolves identity from the slug, so even if a logged-in user opens this
// page, their JWT is never used (Codex R1 #1 defense).
//
// This page intentionally has NO app chrome (sidebar/nav) and shows no student
// PII — the host is always "Joshua".

export default function PublicBooking() {
  const { slug = "" } = useParams();

  const api = useMemo<BookingApi>(() => {
    try { return createPublicBookingApi(slug, undefined, { allowMissingReplay: true }); }
    catch (error) {
      // Keep malformed public URLs in the card's existing unavailable/retry UI.
      const unavailable = async (): Promise<never> => { throw error; };
      return { loadInfo: unavailable, loadSlots: unavailable, book: unavailable };
    }
  }, [slug]);

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
