import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Video } from "lucide-react";
import { useStudentBooking } from "@/hooks/useStudentBooking";

type Slot = { start_at: string; end_at: string };

const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("student-booking", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message);
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

function formatSlot(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function groupByDay(slots: Slot[]) {
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = new Date(s.start_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return Array.from(groups.entries());
}

/**
 * Student-facing "Book a session with Joshua" surface. Renders nothing unless
 * the student has an active booking pass (access granted by Joshua). All data
 * comes from the student-booking edge function; it never touches schedule_events.
 */
export default function BookSessionPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: info, isLoading: infoLoading } = useStudentBooking();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookingKey, setBookingKey] = useState(() => crypto.randomUUID());

  const pass = info?.pass ?? null;
  const viewerTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
  }, []);

  const loadSlots = useCallback(async () => {
    if (!pass) return;
    setSlotsLoading(true);
    try {
      const tzOffsetMinutes = -new Date().getTimezoneOffset();
      const res = (await invoke("slots", { tz_offset_minutes: tzOffsetMinutes })) as { slots: Slot[] };
      setSlots(res.slots ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load times");
    } finally {
      setSlotsLoading(false);
    }
  }, [pass]);

  useEffect(() => { void loadSlots(); }, [loadSlots]);

  const grouped = useMemo(() => groupByDay(slots), [slots]);

  async function book() {
    if (!selected) return;
    setBooking(true);
    try {
      await invoke("book", { start_at: selected, idempotency_key: bookingKey });
      toast.success("Session booked. Check your email for the calendar invite.");
      setSelected(null);
      setBookingKey(crypto.randomUUID());
      await qc.invalidateQueries({ queryKey: ["student-booking", "info", user?.id] });
      await loadSlots();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      if (msg.includes("slot_conflict")) toast.error("That time was just taken. Pick another.");
      else if (msg.includes("pass_exhausted")) toast.error("No sessions remaining.");
      else if (msg.includes("pass_expired")) toast.error("Your booking access has expired.");
      else toast.error(msg);
      await qc.invalidateQueries({ queryKey: ["student-booking", "info", user?.id] });
      await loadSlots();
    } finally {
      setBooking(false);
    }
  }

  // No active pass -> render nothing (calendar looks exactly as before).
  if (infoLoading || !pass) return null;

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="text-base font-semibold tracking-tight">Book a session with Joshua</h3>
            <p className="text-xs text-muted-foreground">
              {pass.session_length_minutes}-minute sessions
              {viewerTz ? ` · times shown in ${viewerTz}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-primary">{pass.credits_remaining}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">of {pass.total_credits} left</div>
        </div>
      </div>

      {pass.credits_remaining <= 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          You've used all your sessions. Message Joshua if you need more.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Available times</span>
            <Button size="sm" variant="ghost" onClick={loadSlots} disabled={slotsLoading}>
              {slotsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {slotsLoading && slots.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading Joshua's calendar…</div>
          ) : slots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No open times in the next few weeks. Try refreshing later.
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, daySlots]) => (
                <div key={day}>
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">{day}</div>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((s) => {
                      const active = selected === s.start_at;
                      return (
                        <button
                          key={s.start_at}
                          onClick={() => setSelected(s.start_at)}
                          className={
                            "rounded-md border px-3 py-1.5 text-sm transition " +
                            (active
                              ? "border-primary bg-primary text-primary-foreground font-medium"
                              : "border-border bg-background text-foreground hover:border-primary/60")
                          }
                        >
                          {new Date(s.start_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={book} disabled={!selected || booking}>
              {booking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selected ? `Book ${formatSlot(selected)}` : "Pick a time"}
            </Button>
          </div>
        </div>
      )}

      {info && info.redemptions.filter((r) => r.status === "booked" && new Date(r.start_at) > new Date()).length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Your upcoming sessions</div>
          <div className="space-y-2">
            {info.redemptions
              .filter((r) => r.status === "booked" && new Date(r.start_at) > new Date())
              .map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="flex-1">{formatSlot(r.start_at)}</span>
                  {r.meet_url && (
                    <a href={r.meet_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-500">
                        <Video className="mr-1 h-4 w-4" /> Join
                      </Button>
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
