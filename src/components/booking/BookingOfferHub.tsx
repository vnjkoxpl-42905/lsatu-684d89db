import { CreditCard, ExternalLink, CalendarDays, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export type BookingOffer = {
  id: string;
  label: string;
  provider: "stripe" | "calcom" | "native";
  url: string;
  credits: number;
};

export type BookingCommerceItem = {
  id: string;
  offer_id: string | null;
  provider: string;
  event_type: string;
  created_at: string;
};

export type ExternalBookingItem = {
  id: string;
  offer_id: string | null;
  source_url: string | null;
  start_at: string | null;
  status: string;
};

export type UnifiedBookingActivity = {
  source: "redemption" | "single_session";
  id: string;
  start_at: string;
  status: string;
};

export default function BookingOfferHub({
  offers,
  commerce,
  externalBookings,
  bookings = [],
  demoted = false,
}: {
  offers: BookingOffer[];
  commerce: BookingCommerceItem[];
  externalBookings: ExternalBookingItem[];
  bookings?: UnifiedBookingActivity[];
  /**
   * A student who already holds credits came here to pick a time, not to buy.
   * Demoted mode keeps every offer reachable (2026-08-13 decision: demote, do
   * not hide) but drops it to a quiet strip below the calendar instead of
   * leading the page with two filled "Buy" buttons.
   */
  demoted?: boolean;
}) {
  const logOfferClick = (offerId: string) => {
    // Telemetry is deliberately best-effort. A slow or unavailable function
    // must never sit between a student and a booking or checkout link.
    void supabase.functions.invoke("student-booking", {
      body: { action: "offer_click", offer_id: offerId },
    });
  };

  // The registry result is the student's complete effective arrangement,
  // including an intentionally empty one. Never synthesize defaults here:
  // doing so would re-enable disabled offers or override a retained Cal URL.
  const resolvedOffers = offers;
  // Prices come straight from the live checkout links so the student sees the
  // cost before clicking instead of having to ask.
  const priceFor = (offer: BookingOffer) => {
    if (offer.credits === 5) return "$200 · $40/hr";
    if (offer.credits === 10) return "$350 · $35/hr";
    if (offer.id === "single-session" || offer.id === "single-session-native") return "$45/hr";
    return null;
  };

  const labelFor = (id: string | null) => {
    if (id === "single-session") return "Single session";
    return resolvedOffers.find((offer) => offer.id === id)?.label ?? "Booking";
  };
  const recentActivity = [
    ...bookings.map((booking) => ({
      id: `${booking.source}-${booking.id}`,
      offerId: booking.source === "single_session" ? "single-session-native" : null,
      timestamp: booking.start_at,
      detail: `${booking.status.replace(/_/g, " ")} · ${new Date(booking.start_at).toLocaleString()}`,
    })),
    ...externalBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      offerId: booking.offer_id,
      timestamp: booking.start_at,
      detail: booking.start_at
        ? `${booking.status} · ${new Date(booking.start_at).toLocaleString()}`
        : booking.status,
    })),
    ...commerce
      .filter((item) => item.event_type === "paid")
      .map((item) => ({
        id: `commerce-${item.id}`,
        offerId: item.offer_id,
        timestamp: item.created_at,
        detail: `Paid · ${new Date(item.created_at).toLocaleDateString()}`,
      })),
  ]
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
    .slice(0, 5);

  return (
    <section
      className={
        demoted
          ? "@container overflow-hidden rounded-2xl border border-border bg-muted/25"
          : "@container mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      }
      aria-labelledby="booking-options-heading"
    >
      <div className="flex items-start gap-3">
        <CreditCard className={demoted ? "ml-5 mt-4 h-4 w-4 shrink-0 text-muted-foreground" : "ml-5 mt-5 h-5 w-5 shrink-0 text-primary"} />
        <div className={demoted ? "px-0 pb-4 pr-5 pt-4" : "px-0 pb-5 pr-5 pt-5"}>
          <h2 id="booking-options-heading" className={demoted ? "text-sm font-semibold tracking-tight" : "text-lg font-semibold tracking-tight"}>
            {demoted ? "Need more sessions?" : "Choose how you want to book"}
          </h2>
          <p className={demoted ? "mt-0.5 text-xs text-muted-foreground" : "mt-1 text-sm text-muted-foreground"}>
            {demoted
              ? "Add a single session or another package whenever you need one."
              : "Use one link for a single session, or choose the 5-hour or 10-hour package."}
          </p>
        </div>
      </div>
      <div className="grid border-t border-border @[40rem]:grid-cols-3">
        {resolvedOffers.length === 0 ? (
          <p className="col-span-full px-5 py-5 text-sm text-muted-foreground">
            No booking offers are available right now. Message Joshua if you need help.
          </p>
        ) : null}
        {resolvedOffers.map((offer, index) => {
          const isSingle = offer.id === "single-session-native" || offer.id === "single-session";
          const isNative = offer.provider === "native" && offer.url.startsWith("/");
          return (
            <div
              key={offer.id}
              className={
                index === 0
                  ? (demoted ? "p-4" : "p-5")
                  : (demoted
                    ? "border-t border-border p-4 @[40rem]:border-l @[40rem]:border-t-0"
                    : "border-t border-border p-5 @[40rem]:border-l @[40rem]:border-t-0")
              }
            >
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {isSingle
                  ? <CalendarDays className={demoted ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-primary"} />
                  : <PackagePlus className={demoted ? "h-4 w-4 text-muted-foreground" : "h-4 w-4 text-primary"} />}
                {offer.label}
                {priceFor(offer) ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {priceFor(offer)}
                  </span>
                ) : null}
              </div>
              {demoted ? null : (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {isSingle
                    ? "Choose a time and pay for one session."
                    : `Continue to the secure ${offer.label.toLowerCase()} checkout.`}
                </p>
              )}
              <Button
                asChild
                className={demoted ? "mt-3 min-h-11 w-full" : "mt-4 min-h-11 w-full"}
                variant={demoted || isSingle ? "outline" : "default"}
              >
                {isNative ? <Link to={offer.url} onClick={() => logOfferClick(offer.id)}>
                  <CalendarDays className="mr-1.5 h-4 w-4" />
                  Book one session
                </Link> : <a
                  href={offer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => logOfferClick(offer.id)}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  {isSingle ? "Book and pay for one session" : `Buy ${offer.label}`}
                </a>}
              </Button>

            </div>
          );
        })}
      </div>
      {recentActivity.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent booking activity</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {recentActivity.map((item) => (
              <li key={item.id} className="grid gap-1 rounded-lg bg-muted/35 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                <span>{labelFor(item.offerId)}</span>
                <span className="text-xs capitalize text-muted-foreground sm:text-right">{item.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
