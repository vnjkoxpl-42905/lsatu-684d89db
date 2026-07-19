import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Video } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared Calendly-clone booking card used by BOTH the in-app authed page and the
// public /book/<slug> page. The data source is injected via `api`, so the same
// UI renders whether identity comes from a JWT (student-booking) or a slug
// (public-booking). Renders NO student PII — host is always "Joshua".

export type BookingSlot = { start_at: string; end_at: string };

export type BookingPassView = {
  credits_remaining: number;
  session_length_minutes: number;
  total_credits?: number;
  status?: string;
} | null;

export type UpcomingRedemption = {
  id: string; start_at: string; status: string; meet_url?: string | null;
};

export type BookingApi = {
  // Load the pass summary. null = no active booking access.
  loadInfo: () => Promise<{ pass: BookingPassView; redemptions?: UpcomingRedemption[] }>;
  loadSlots: () => Promise<{ pass: BookingPassView; slots: BookingSlot[] }>;
  book: (startAtIso: string, idempotencyKey: string) => Promise<void>;
};

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const fmtSlot = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function durationLabel(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

export default function CalendlyBookingCard({ api }: { api: BookingApi }) {
  const [info, setInfo] = useState<{ pass: BookingPassView; redemptions?: UpcomingRedemption[] } | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [pickedDay, setPickedDay] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingKey, setBookingKey] = useState(() => crypto.randomUUID());

  const pass = info?.pass ?? null;

  const viewerTz = useMemo(() => {
    try {
      const now = new Date();
      const longName = new Intl.DateTimeFormat(undefined, { timeZoneName: "long" })
        .formatToParts(now).find((p) => p.type === "timeZoneName")?.value;
      const time = now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return longName ? `${longName} · ${time}` : time;
    } catch { return null; }
  }, []);

  const refreshInfo = useCallback(async () => {
    setInfoLoading(true);
    try { setInfo(await api.loadInfo()); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load"); }
    finally { setInfoLoading(false); }
  }, [api]);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    try { const res = await api.loadSlots(); setSlots(res.slots ?? []); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to load times"); }
    finally { setSlotsLoading(false); }
  }, [api]);

  useEffect(() => { void refreshInfo(); }, [refreshInfo]);
  useEffect(() => { if (pass && pass.credits_remaining > 0) void loadSlots(); }, [pass, loadSlots]);

  const slotsByDay = useMemo(() => {
    const m = new Map<string, BookingSlot[]>();
    for (const s of slots) {
      const k = dayKey(new Date(s.start_at));
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [slots]);

  useEffect(() => {
    if (pickedDay || slots.length === 0) return;
    const first = new Date(slots[0].start_at);
    setMonthAnchor(startOfDay(new Date(first.getFullYear(), first.getMonth(), 1)));
    setPickedDay(startOfDay(first));
  }, [slots, pickedDay]);

  const monthDays = useMemo(() => {
    const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthAnchor]);

  const daySlots = pickedDay ? (slotsByDay.get(dayKey(pickedDay)) ?? []) : [];

  async function doBook() {
    if (!selected) return;
    setBooking(true);
    try {
      await api.book(selected, bookingKey);
      toast.success("Session booked. Check your email for the calendar invite.");
      setConfirmOpen(false);
      setSelected(null);
      setBookingKey(crypto.randomUUID());
      await refreshInfo();
      await loadSlots();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      if (msg.includes("slot_conflict")) toast.error("That time was just taken. Pick another.");
      else if (msg.includes("slot_unavailable")) toast.error("That time isn't available. Pick another.");
      else if (msg.includes("pass_exhausted") || msg.includes("no_sessions")) toast.error("No sessions remaining.");
      else if (msg.includes("pass_expired")) toast.error("Your booking access has expired.");
      else toast.error(msg);
      await refreshInfo();
      await loadSlots();
    } finally { setBooking(false); }
  }

  if (infoLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  // No active pass -> "no sessions available, contact Joshua".
  if (!pass) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="text-sm font-medium">No sessions available.</p>
        <p className="mt-1 text-xs text-muted-foreground">Message Joshua to have 1:1 session booking turned on.</p>
      </div>
    );
  }

  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = startOfDay(new Date());
  const upcoming = (info?.redemptions ?? []).filter((r) => r.status === "booked" && new Date(r.start_at) > new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
        {/* Left: host card (Calendly-style, no student PII) */}
        <div className="border-b border-border p-6 md:border-b-0 md:border-r">
          <div className="text-sm font-medium text-muted-foreground">Joshua</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">1:1 LSAT Session</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{durationLabel(pass.session_length_minutes)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 shrink-0" />
              <span>Google Meet link provided on confirmation.</span>
            </div>
            {viewerTz && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0" />
                <span>{viewerTz}</span>
              </div>
            )}
          </div>
          <div className="mt-6 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-primary">{pass.credits_remaining}</span>
            {pass.total_credits ? ` of ${pass.total_credits}` : ""} session{pass.credits_remaining === 1 ? "" : "s"} remaining
          </div>
        </div>

        {/* Right: date + time picker */}
        {pass.credits_remaining <= 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            You've used all your sessions. Message Joshua if you need more.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_240px]">
            <div className="border-b border-border p-6 sm:border-b-0 sm:border-r">
              <div className="mb-1 text-sm font-semibold">Select a Date &amp; Time</div>
              <div className="mb-4 mt-3 flex items-center justify-between">
                <button
                  onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="Previous month"
                ><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm font-semibold">{monthLabel}</span>
                <button
                  onClick={() => setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  aria-label="Next month"
                ><ChevronRight className="h-4 w-4" /></button>
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
                        hasSlots && !isPicked && "font-medium text-foreground hover:bg-accent bg-primary/10",
                        isPicked && "bg-primary text-primary-foreground font-semibold",
                        isToday && !isPicked && "ring-1 ring-primary/40",
                      )}
                    >{d.getDate()}</button>
                  );
                })}
              </div>
              {slotsLoading && slots.length === 0 && (
                <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading times…
                </div>
              )}
              {!slotsLoading && slots.length === 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">No open times in the next few weeks.</p>
              )}
            </div>

            <div className="flex flex-col p-6">
              <div className="mb-3 text-sm font-semibold">
                {pickedDay
                  ? pickedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                  : "Select a day"}
              </div>
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {pickedDay && daySlots.length === 0 && <p className="text-sm text-muted-foreground">No times this day.</p>}
                {daySlots.map((s) => {
                  const active = selected === s.start_at;
                  return (
                    <button
                      key={s.start_at}
                      onClick={() => setSelected(active ? null : s.start_at)}
                      className={cn(
                        "w-full rounded-lg border py-2.5 text-center text-sm font-medium transition",
                        active ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/40 text-primary hover:border-primary hover:bg-primary/5",
                      )}
                    >{fmtTime(s.start_at)}</button>
                  );
                })}
              </div>
              {selected && (
                <Button className="mt-4 w-full" onClick={() => setConfirmOpen(true)} disabled={booking}>
                  Book {fmtTime(selected)}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!booking) setConfirmOpen(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your session</AlertDialogTitle>
            <AlertDialogDescription>
              {selected ? (
                <>Book a {durationLabel(pass.session_length_minutes)} session with Joshua on{" "}
                <span className="font-medium text-foreground">{fmtSlot(selected)}</span>? This uses 1 of your{" "}
                {pass.credits_remaining} remaining sessions.</>
              ) : "Pick a time first."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={booking}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); void doBook(); }} disabled={booking}>
              {booking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Yes, book it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {upcoming.length > 0 && (
        <div className="border-t border-border p-6">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Your upcoming sessions</div>
          <div className="space-y-2">
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="flex-1">{fmtSlot(r.start_at)}</span>
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
