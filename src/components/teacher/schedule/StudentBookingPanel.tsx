import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarClock, Loader2, Ticket, XCircle } from "lucide-react";

type ActivePass = {
  id: string;
  total_credits: number;
  used_credits: number;
  credits_remaining: number;
  session_length_minutes: number;
  status: string;
  expires_at: string | null;
};

const DEFAULT_CREDITS = 5;
const DEFAULT_LENGTH = 60;

const call = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("booking-pass-admin", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

export default function StudentBookingPanel({
  studentId,
  studentName,
  studentEmail,
}: {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await call("get_for_student", { student_id: studentId })) as { pass: ActivePass | null };
      setPass(res.pass);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load booking access");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function grant() {
    setBusy(true);
    try {
      await call("create", {
        student_id: studentId,
        student_name: studentName || null,
        student_email: studentEmail || null,
        total_credits: DEFAULT_CREDITS,
        session_length_minutes: DEFAULT_LENGTH,
        expires_at: null,
      });
      toast.success("Booking access granted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Grant failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!pass) return;
    if (!confirm(`Revoke booking access for ${studentName || "this student"}? They won't be able to book new sessions.`)) return;
    setBusy(true);
    try {
      await call("revoke", { pass_id: pass.id });
      toast.success("Booking access revoked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-amber-500">
        <Ticket className="h-4 w-4" /> Session booking
      </div>

      {loading ? (
        <div className="mt-3 flex items-center text-sm text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : pass ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-zinc-300">
            <CalendarClock className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <div className="text-zinc-100">
                <span className="font-semibold text-amber-400">{pass.credits_remaining}</span>
                <span className="text-zinc-500"> / {pass.total_credits} sessions left</span>
              </div>
              <div className="text-xs text-zinc-500">
                {pass.session_length_minutes} min each · they can book from their own calendar
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={grant} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Reset to {DEFAULT_CREDITS} sessions
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400" onClick={revoke} disabled={busy}>
              <XCircle className="mr-1 h-4 w-4" /> Revoke
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            This student can't book sessions yet. Grant access to let them book from their calendar.
          </p>
          <Button size="sm" onClick={grant} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Grant booking access
          </Button>
        </div>
      )}
    </div>
  );
}
