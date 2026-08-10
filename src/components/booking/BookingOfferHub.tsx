import { useState } from "react";
import { CreditCard, ExternalLink, Loader2, CalendarDays, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BookingOffer = {
  id: string;
  label: string;
  provider: "stripe" | "calcom";
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

export default function BookingOfferHub({
  offers,
  commerce,
  externalBookings,
}: {
  offers: BookingOffer[];
  commerce: BookingCommerceItem[];
  externalBookings: ExternalBookingItem[];
}) {
  const [opening, setOpening] = useState<string | null>(null);
  const openOffer = async (offer: BookingOffer) => {
    setOpening(offer.id);
    try {
      const { data, error } = await supabase.functions.invoke("student-booking", { body: { action: "offer_click", offer_id: offer.id } });
      if (error || data?.error) throw new Error(data?.error || error.message);
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the payment link");
      setOpening(null);
    }
  };

  const labelFor = (id: string | null) => offers.find((offer) => offer.id === id)?.label ?? "Booking";
  if (offers.length === 0 && commerce.length === 0 && externalBookings.length === 0) return null;

  return (
    <section className="booking-holo mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Book or add sessions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your agreed booking and payment options are saved here.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {offers.map((offer) => {
          const isSingle = offer.credits === 0;
          return (
            <div key={offer.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                {isSingle ? <CalendarDays className="h-4 w-4 text-primary" /> : <PackagePlus className="h-4 w-4 text-primary" />}
                {offer.label}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {isSingle ? "Schedule and pay for one session through the secure booking link." : `Secure checkout adds ${offer.credits} sessions to your existing booking pass.`}
              </p>
              <Button className="mt-4 min-h-11 w-full" variant={isSingle ? "outline" : "default"} onClick={() => void openOffer(offer)} disabled={opening !== null}>
                {opening === offer.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-1.5 h-4 w-4" />}
                {isSingle ? "Schedule session" : "Checkout"}
              </Button>
            </div>
          );
        })}
      </div>
      {(commerce.length > 0 || externalBookings.length > 0) && (
        <div className="mt-5 border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent booking activity</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {externalBookings.slice(0, 5).map((booking) => (
              <li key={booking.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2">
                <span>{labelFor(booking.offer_id)}</span>
                <span className="text-xs text-muted-foreground">{booking.start_at ? new Date(booking.start_at).toLocaleString() : booking.status}</span>
              </li>
            ))}
            {commerce.filter((item) => item.event_type === "paid").slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2">
                <span>{labelFor(item.offer_id)}</span>
                <span className="text-xs text-muted-foreground">Paid {new Date(item.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
