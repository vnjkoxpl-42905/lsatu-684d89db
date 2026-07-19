import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import CalendlyBookingCard, { type BookingApi } from "@/components/booking/CalendlyBookingCard";

// In-app booking page (authed). Uses the SAME Calendly-clone card as the public
// /book/:slug page, fed by the authenticated student-booking function.
const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("student-booking", { body: { action, ...extra } });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

export default function Booking() {
  const navigate = useNavigate();

  const api: BookingApi = useMemo(() => ({
    loadInfo: async () => {
      const d = (await invoke("info")) as {
        pass: { credits_remaining: number; session_length_minutes: number; total_credits: number; status: string } | null;
        redemptions?: { id: string; start_at: string; status: string; meet_url?: string | null }[];
      };
      const p = d.pass;
      return {
        pass: p ? { credits_remaining: p.credits_remaining, session_length_minutes: p.session_length_minutes, total_credits: p.total_credits, status: p.status } : null,
        redemptions: d.redemptions ?? [],
      };
    },
    loadSlots: async () => {
      const d = (await invoke("slots")) as {
        pass: { credits_remaining: number; session_length_minutes: number } | null;
        slots: { start_at: string; end_at: string }[];
      };
      return { pass: d.pass ?? null, slots: d.slots ?? [] };
    },
    book: async (startAtIso, idempotencyKey) => {
      await invoke("book", { start_at: startAtIso, idempotency_key: idempotencyKey });
    },
  }), []);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mainhub")} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Book a session</h1>
          <p className="text-sm text-muted-foreground">Schedule 1:1 time with Joshua.</p>
        </div>
      </div>

      <CalendlyBookingCard api={api} />
    </div>
  );
}
