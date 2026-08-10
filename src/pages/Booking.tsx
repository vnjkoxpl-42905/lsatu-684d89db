import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/useUserPermissions";
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
  const { is_admin, loading } = useUserPermissions();

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
    book: async (startAtIso, idempotencyKey, studentNote) => {
      await invoke("book", {
        start_at: startAtIso,
        idempotency_key: idempotencyKey,
        ...(studentNote ? { student_note: studentNote } : {}),
      });
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
  }), []);

  // Teacher booking controls live on each student's in-shell dossier. The
  // former /booking/admin destination mounts a separate app shell, which
  // breaks the Classroom frame the rail is meant to preserve.
  if (loading) return <div className="min-h-screen bg-background" />;
  if (is_admin) return <Navigate to="/teacher/students" replace />;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="relative mb-6 flex items-center justify-center">
        <Button variant="ghost" size="icon" onClick={() => navigate("/classroom")} aria-label="Back" className="absolute left-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="holo-surface flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold">L</div>
          <span className="holo-text text-2xl font-bold tracking-tight">Booking</span>
        </div>
      </div>

      <CalendlyBookingCard api={api} />
    </div>
  );
}
