import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarClock, Link2, Loader2, RefreshCw, Ticket, Trash2 } from "lucide-react";

type ActivePass = {
  id: string;
  total_credits: number;
  used_credits: number;
  credits_remaining: number;
  session_length_minutes: number;
  status: string;
  expires_at: string | null;
  booking_url?: string | null;
};

type SingleSessionBooking = {
  source?: "single_session";
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  meet_url?: string | null;
  name?: string | null;
  email?: string | null;
  association?: "verified_user" | "possible_match_unverified_email";
};

const fmtSession = (iso: string) => new Date(iso).toLocaleString(undefined, {
  weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

const DEFAULT_CREDITS = 5;
const DEFAULT_LENGTH = 70;

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
  const [singleSessions, setSingleSessions] = useState<SingleSessionBooking[]>([]);
  const [possibleMatches, setPossibleMatches] = useState<SingleSessionBooking[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await call("get_for_student", { student_id: studentId })) as {
        pass: ActivePass | null;
        single_session_bookings?: SingleSessionBooking[];
        single_session_possible_matches?: SingleSessionBooking[];
      };
      setPass(res.pass);
      setSingleSessions(res.single_session_bookings ?? []);
      setPossibleMatches(res.single_session_possible_matches ?? []);
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

  async function setRemaining() {
    if (!pass) return;
    if (!confirm(`Set this student to ${DEFAULT_CREDITS} remaining sessions? Their booking link and history will stay the same.`)) return;
    setBusy(true);
    try {
      await call("update", {
        pass_id: pass.id,
        total_credits: pass.used_credits + DEFAULT_CREDITS,
      });
      toast.success(`Remaining sessions set to ${DEFAULT_CREDITS}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLink() {
    if (!pass) return;
    if (!confirm(`Delete the booking link for ${studentName || "this student"}? It will stop working immediately and cannot be restored.`)) return;
    setBusy(true);
    try {
      await call("revoke", { pass_id: pass.id });
      toast.success("Booking link deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete booking link");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!pass?.booking_url) return;
    try {
      await navigator.clipboard.writeText(pass.booking_url);
      toast.success("Booking link copied");
    } catch {
      // Fallback: show it so it can be copied manually.
      toast.message(pass.booking_url);
    }
  }

  async function regenerate() {
    if (!pass) return;
    if (!confirm("Generate a new booking link? The old link will immediately stop working.")) return;
    setBusy(true);
    try {
      const res = (await call("regenerate_link", { student_id: studentId })) as { booking_url?: string };
      if (res.booking_url) {
        try { await navigator.clipboard.writeText(res.booking_url); } catch { /* ignore */ }
        toast.success("New link generated and copied");
      }
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed");
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={copyLink} disabled={busy || !pass.booking_url}>
              <Link2 className="mr-1 h-4 w-4" /> Copy link
            </Button>
            <Button size="sm" variant="outline" onClick={setRemaining} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              Set remaining to {DEFAULT_CREDITS}
            </Button>
            <Button size="sm" variant="ghost" className="text-zinc-400 hover:text-zinc-200" onClick={regenerate} disabled={busy}>
              <RefreshCw className="mr-1 h-4 w-4" /> New link
            </Button>
            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400" onClick={deleteLink} disabled={busy}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete link
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

      {singleSessions.length > 0 && (
        <div className="mt-4 border-t border-zinc-800 pt-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Verified Single Sessions</div>
          <ul className="mt-2 space-y-2">
            {singleSessions.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
                <span className="text-zinc-200">{fmtSession(booking.start_at)}</span>
                <span className="text-xs capitalize text-zinc-500">{booking.status.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {possibleMatches.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Possible match (unverified email)</div>
          <p className="mt-1 text-xs text-zinc-500">Shown to operators only. These bookings are not attached to this student's account.</p>
          <ul className="mt-2 space-y-1.5">
            {possibleMatches.map((booking) => <li key={booking.id} className="flex justify-between gap-3 text-xs text-zinc-400"><span>{fmtSession(booking.start_at)}</span><span className="capitalize">{booking.status.replace(/_/g, " ")}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
