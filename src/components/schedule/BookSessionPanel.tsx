import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import BookingConfirmDialog from "@/components/booking/BookingConfirmDialog";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
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

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function formatSlot(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

/**
 * Student-facing "Book a session with Joshua" surface. Renders nothing unless
 * the student has an active booking pass (access granted by Joshua). All data
 * comes from the student-booking edge function; it never touches schedule_events.
 *
 * Calendly-style layout: month day-picker on the left, a column of time-slot
 * buttons for the selected day on the right.
 */
export default function BookSessionPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: info, isLoading: infoLoading } = useStudentBooking();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [pickedDay, setPickedDay] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pass = info?.pass ?? null;
  // Friendly local-timezone label, e.g. "Eastern Time · 3:14 PM" instead of the
  // raw IANA name "America/Toronto". Auto-detected from the student's browser.
  const viewerTz = useMemo(() => {
    try {
      const now = new Date();
      const longName = new Intl.DateTimeFormat(undefined, { timeZoneName: "long" })
        .formatToParts(now).find((p) => p.type === "timeZoneName")?.value;
      const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return longName ? `${longName} · ${time}` : time;
    } catch {
      return null;
    }
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

  // Which calendar days have at least one open slot.
  const slotsByDay = useMemo(() => {
    const m = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(new Date(s.start_at));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [slots]);

  // Auto-pick the first available day when slots load.
  useEffect(() => {
    if (pickedDay || slots.length === 0) return;
    const first = new Date(slots[0].start_at);
    setMonthAnchor(startOfDay(new Date(first.getFullYear(), first.getMonth(), 1)));
    setPickedDay(startOfDay(first));
  }, [slots, pickedDay]);

  const monthDays = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const startPad = first.getDay(); // 0=Sun
    const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthAnchor]);

  const daySlots = pickedDay ? (slotsByDay.get(dayKey(pickedDay)) ?? []) : [];

  const refreshBooking = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["student-booking", "info", user?.id] });
    await loadSlots();
  }, [qc, user?.id, loadSlots]);

  // No active pass -> render nothing (calendar looks exactly as before).
  if (infoLoading || !pass) return null;

  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = startOfDay(new Date());
  const upcoming = (info?.bookings ?? []).filter(
    (r) => r.status === "booked" && new Date(r.start_at) > new Date(),
  );

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-6">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Book a session with Joshua</h3>
            <p className="text-xs text-muted-foreground">
              {pass.session_length_minutes} min{viewerTz ? ` · ${viewerTz}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-primary">{pass.credits_remaining}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">session{pass.credits_remaining === 1 ? "" : "s"}</div>
        </div>
      </div>

      {pass.credits_remaining <= 0 ? (
        <p className="p-6 text-sm text-muted-foreground">
          You've used all your sessions. Message Joshua if you need more.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px]">
          {/* Left: month day-picker */}
          <div className="border-b border-border p-6 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <button
                onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{d}</div>
              ))}
              {monthDays.map((d, i) => {
                if (!d) return <div key={`e${i}`} />;
                const hasSlots = slotsByDay.has(dayKey(d));
                const isPicked = pickedDay && dayKey(d) === dayKey(pickedDay);
                const isToday = dayKey(d) === dayKey(today);
                return (
                  <button
                    key={dayKey(d)}
                    disabled={!hasSlots}
                    onClick={() => { setPickedDay(d); setSelected(null); }}
                    className={cn(
                      "mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition",
                      !hasSlots && "text-muted-foreground/40 cursor-default",
                      hasSlots && !isPicked && "font-medium text-foreground hover:bg-accent",
                      hasSlots && !isPicked && "bg-primary/10",
                      isPicked && "bg-primary text-primary-foreground font-semibold",
                      isToday && !isPicked && "ring-1 ring-primary/40",
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            {slotsLoading && slots.length === 0 && (
              <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Joshua's calendar…
              </div>
            )}
            {!slotsLoading && slots.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                No open times in the next few weeks.
              </p>
            )}
          </div>

          {/* Right: time-slot column for the picked day */}
          <div className="flex flex-col p-6">
            <div className="mb-3 text-sm font-semibold">
              {pickedDay
                ? pickedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                : "Select a day"}
            </div>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {pickedDay && daySlots.length === 0 && (
                <p className="text-sm text-muted-foreground">No times this day.</p>
              )}
              {daySlots.map((s) => {
                const active = selected === s.start_at;
                return (
                  <button
                    key={s.start_at}
                    onClick={() => setSelected(active ? null : s.start_at)}
                    className={cn(
                      "w-full rounded-lg border py-2.5 text-center text-sm font-medium transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/40 text-primary hover:border-primary hover:bg-primary/5",
                    )}
                  >
                    {formatTime(s.start_at)}
                  </button>
                );
              })}
            </div>
            {selected && (
              <Button className="mt-4 w-full" onClick={() => setConfirmOpen(true)}>
                Book {formatTime(selected)}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation step — only books when the student says yes. */}
      <BookingConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        slotIso={selected}
        durationMinutes={pass.session_length_minutes}
        book={async (slotIso, key) => { await invoke("book", { start_at: slotIso, idempotency_key: key }); }}
        onBooked={async () => { setSelected(null); await refreshBooking(); return null; }}
        onCommitError={refreshBooking}
      />

      {upcoming.length > 0 && (
        <div className="border-t border-border p-6">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Your upcoming sessions</div>
          <div className="space-y-2">
            {upcoming.map((r) => (
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
