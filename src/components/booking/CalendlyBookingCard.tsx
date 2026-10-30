import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import BookingConfirmDialog from "@/components/booking/BookingConfirmDialog";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { bookingErrorMessage } from "@/lib/edgeFunctionError";
import "@/pages/booking/booking-theme.css";
import { buildMonthCells, dayKey, formatBookingTime, groupSlotsByDay, startOfDay } from "@/components/booking/bookingCalendar";

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

export type UpcomingBooking = {
  source: "redemption" | "single_session"; id: string; start_at: string; status: string; meet_url?: string | null;
};

export type BookingApi = {
  // Load the pass summary. null = no active booking access.
  loadInfo: () => Promise<{ pass: BookingPassView; bookings?: UpcomingBooking[] }>;
  loadSlots: () => Promise<{ pass: BookingPassView; slots: BookingSlot[] }>;
  book: (startAtIso: string, idempotencyKey: string, studentNote?: string) => Promise<void>;
  // Optional booking-time submission. When present, the confirm step shows an
  // upload card (files + comment). Files upload BEFORE book, keyed by the same
  // idempotency key so the server links them to the redemption.
  uploadFiles?: (files: { file: File; clientUploadId: string }[], idempotencyKey: string) => Promise<{ uploaded: number; clientUploadIds: string[] }>;
  discardUpload?: (clientUploadId: string, idempotencyKey: string) => Promise<void>;
};

const fmtTime = formatBookingTime;
const fmtSlot = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function durationLabel(mins: number) {
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

function UpcomingSessions({ bookings }: { bookings: UpcomingBooking[] }) {
  const upcoming = bookings.filter((r) => r.status === "booked" && new Date(r.start_at) > new Date());
  if (upcoming.length === 0) return null;
  return (
    <div className="border-t border-border p-6" aria-label="Your upcoming sessions">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Your upcoming sessions</div>
      <div className="space-y-2">
        {upcoming.map((r) => (
          <div key={`${r.source}-${r.id}`} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span className="flex-1">{fmtSlot(r.start_at)}</span>
            {r.meet_url && (
              <Button asChild size="sm" variant="ghost" className="min-h-11 text-emerald-600 hover:text-emerald-500">
                <a href={r.meet_url} target="_blank" rel="noreferrer">
                  <Video className="mr-1 h-4 w-4" /> Join
                </a>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendlyBookingCard({
  api,
  sessionHeadingLevel = "h2",
  noPassDescription = "Message Joshua to have 1:1 session booking turned on.",
  theme = "booking",
  dayPicker = "calendar",
  bookingFor,
  onConfirmationChange,
  onBookingCommitted,
}: {
  api: BookingApi;
  dayPicker?: "calendar" | "dropdown";
  bookingFor?: { name: string; email: string };
  onConfirmationChange?: (open: boolean) => void;
  onBookingCommitted?: () => void | Promise<void>;
  sessionHeadingLevel?: "h2" | "h3";
  noPassDescription?: string;
  /**
   * "booking" keeps the standalone burgundy palette, which the public
   * /book/:slug microsite owns end to end. "app" drops it so the card inherits
   * the Classroom tokens — inside the product, three palettes across three
   * adjacent screens read as three different products.
   */
  theme?: "booking" | "app";
}) {
  const dayPickerId = useId();
  const SessionHeading = sessionHeadingLevel;
  const holo = theme === "booking" ? "booking-holo " : "";
  const [info, setInfo] = useState<{ pass: BookingPassView; bookings?: UpcomingBooking[] } | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState<Date>(() => startOfDay(new Date()));
  const [pickedDay, setPickedDay] = useState<Date | null>(null);
  const initialDaySelected = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  useEffect(() => {
    onConfirmationChange?.(confirmOpen);
    return () => onConfirmationChange?.(false);
  }, [confirmOpen, onConfirmationChange]);

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
    setInfoError(null);
    try { setInfo(await api.loadInfo()); }
    catch (e) {
      const message = bookingErrorMessage(e instanceof Error ? e.message : "");
      setInfoError(message);
      toast.error(message);
    }
    finally { setInfoLoading(false); }
  }, [api]);

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    setSlotsError(null);
    try { const res = await api.loadSlots(); setSlots(res.slots ?? []); }
    catch (e) {
      const message = bookingErrorMessage(e instanceof Error ? e.message : "");
      setSlotsError(message);
      toast.error(message);
    }
    finally { setSlotsLoading(false); }
  }, [api]);

  useEffect(() => { void refreshInfo(); }, [refreshInfo]);
  useEffect(() => { if (pass?.status === "active" && pass.credits_remaining > 0) void loadSlots(); }, [pass, loadSlots]);

  const slotsByDay = useMemo(() => {
    return groupSlotsByDay(slots);
  }, [slots, dayPicker]);

  useEffect(() => {
    if (initialDaySelected.current || slots.length === 0) return;
    const first = new Date(dayPicker === "dropdown"
      ? Math.min(...slots.map((slot) => Date.parse(slot.start_at)))
      : slots[0].start_at);
    setMonthAnchor(startOfDay(new Date(first.getFullYear(), first.getMonth(), 1)));
    setPickedDay(startOfDay(first));
    initialDaySelected.current = true;
  }, [slots, dayPicker]);

  const monthDays = useMemo(() => {
    return buildMonthCells(monthAnchor);
  }, [monthAnchor]);

  const daySlots = pickedDay ? (slotsByDay.get(dayKey(pickedDay)) ?? []) : [];

  if (infoLoading) {
    return (
      <div role="status" aria-live="polite" className={`${holo}flex items-center justify-center rounded-2xl border border-border bg-card p-12 text-sm text-muted-foreground`}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (infoError) {
    return (
      <div role="alert" className={`${holo}rounded-2xl border border-border bg-card p-8 text-center`}>
        <p className="text-sm font-medium">We couldn't load booking right now.</p>
        <p className="mt-1 text-sm text-muted-foreground">Your booking access has not changed.</p>
        <Button variant="outline" className="mt-4 min-h-11" onClick={() => void refreshInfo()}>Try again</Button>
      </div>
    );
  }

  // No active pass -> "no sessions available, contact Joshua".
  if (!pass) {
    return (
      <div className={`${holo}overflow-hidden rounded-2xl border border-dashed border-border bg-card`}>
        <div className="p-12 text-center">
          <p className="text-sm font-medium">No sessions available.</p>
          <p className="mt-1 text-xs text-muted-foreground">{noPassDescription}</p>
        </div>
        <UpcomingSessions bookings={info?.bookings ?? []} />
      </div>
    );
  }

  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const today = startOfDay(new Date());

  return (
    // Container query, not a viewport breakpoint: this card used to sit in a
    // full-width shell, so `md:` was a fair proxy for "there is room". Inside
    // the classroom stage the viewport is wide while the column is not, and a
    // viewport breakpoint split it into two columns that then clipped against
    // `overflow-hidden`. Measure the space the card actually has.
    <div className={`@container ${holo}booking-shadow overflow-hidden rounded-2xl border border-border bg-card`}>
      <div className="grid grid-cols-1 @[54rem]:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: host card (Calendly-style, no student PII) */}
        <div className="min-w-0 border-b border-border p-5 @[54rem]:border-b-0 @[54rem]:border-r @[54rem]:p-6">
          <div className="text-sm font-medium text-muted-foreground">Joshua</div>
          <SessionHeading className="mt-1 text-xl font-semibold tracking-tight">1:1 LSAT Session</SessionHeading>
          {bookingFor && <p className="mt-3 break-words text-sm">Booking for <strong>{bookingFor.name}</strong><br />{bookingFor.email}</p>}
          {/* The balance decides which path is even relevant to this student,
              so it leads the card rather than trailing the metadata. */}
          <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="text-3xl font-semibold leading-none tracking-tight text-primary">
              {pass.credits_remaining}
            </div>
            <div className="mt-1 text-xs font-medium text-muted-foreground">
              session{pass.credits_remaining === 1 ? "" : "s"} available to book
            </div>
          </div>
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
        </div>

        {/* Right: date + time picker */}
        {pass.status === "paused" ? (
          <div className="p-6 text-sm text-muted-foreground">
            Booking is paused right now. Message Joshua if you need to schedule a session.
          </div>
        ) : pass.status === "expired" ? (
          <div className="p-6 text-sm text-muted-foreground">
            This booking access has expired. Your upcoming sessions are still shown below.
          </div>
        ) : pass.status === "revoked" ? (
          <div className="p-6 text-sm text-muted-foreground">
            This booking access is no longer active. Your upcoming sessions are still shown below.
          </div>
        ) : pass.credits_remaining <= 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            You've used all your sessions. Message Joshua if you need more.
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0 border-b border-border p-4 @sm:p-5 @2xl:border-b-0 @2xl:border-r">
              <div className="mb-1 text-sm font-semibold">Select a Date &amp; Time</div>
              {dayPicker === "dropdown" ? (
                <label htmlFor={dayPickerId} className="my-4 block text-sm font-medium">
                  Available day
                  <select id={dayPickerId} aria-label="Available day" className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 text-foreground" value={pickedDay ? dayKey(pickedDay) : ""} onChange={(event) => {
                    const offered = [...slotsByDay.values()].map((entries) => startOfDay(new Date(entries[0].start_at))).find((day) => dayKey(day) === event.target.value);
                    setPickedDay(offered ?? null); setSelected(null);
                  }}>
                    <option value="">Select a day</option>
                    {[...slotsByDay.entries()].sort(([, a], [, b]) => startOfDay(new Date(a[0].start_at)).getTime() - startOfDay(new Date(b[0].start_at)).getTime()).map(([key, entries]) => <option key={key} value={key}>{new Date(entries[0].start_at).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</option>)}
                  </select>
                </label>
              ) : (<>
              <div className="mb-4 mt-3 flex items-center justify-between">
                <button
                  onClick={() => { setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1)); setPickedDay(null); setSelected(null); }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Previous month"
                ><ChevronLeft className="h-4 w-4" /></button>
                <span aria-live="polite" className="text-center text-sm font-semibold">{monthLabel}</span>
                <button
                  onClick={() => { setMonthAnchor((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1)); setPickedDay(null); setSelected(null); }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Next month"
                ><ChevronRight className="h-4 w-4" /></button>
              </div>
              <div role="group" aria-label={`${monthLabel} availability calendar`} className="grid grid-cols-7 gap-0.5 text-center @sm:gap-1">
                {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                  <div key={day} aria-hidden="true" className="pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{day.slice(0, 1)}</div>
                ))}
                {monthDays.map((d, i) => {
                  if (!d) return <div key={`e${i}`} />;
                  const hasSlots = slotsByDay.has(dayKey(d));
                  const isPicked = pickedDay && dayKey(d) === dayKey(pickedDay);
                  const isToday = dayKey(d) === dayKey(today);
                  return (
                    <button
                      key={dayKey(d)}
                      aria-label={d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                      aria-pressed={Boolean(isPicked)}
                      disabled={!hasSlots}
                      onClick={() => { setPickedDay(d); setSelected(null); }}
                      className={cn(
                        "mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        !hasSlots && "text-muted-foreground/40 cursor-default",
                        hasSlots && !isPicked && "font-medium text-foreground hover:bg-accent bg-primary/10",
                        isPicked && "bg-primary text-primary-foreground font-semibold",
                        isToday && !isPicked && "ring-1 ring-primary/40",
                      )}
                    >{d.getDate()}</button>
                  );
                })}
              </div>
              </>)}
              {slotsLoading && slots.length === 0 && (
                <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading times…
                </div>
              )}
              {slotsError && (
                <div role="alert" className="mt-4 text-center text-sm text-muted-foreground">
                  <p>We couldn't load available times.</p>
                  <Button variant="ghost" className="mt-2 min-h-11" onClick={() => void loadSlots()}>Try again</Button>
                </div>
              )}
              {!slotsLoading && !slotsError && slots.length === 0 && (
                <p className="mt-4 text-center text-sm text-muted-foreground">No open times in the next few weeks.</p>
              )}
            </div>

            <div className="flex min-w-0 flex-col p-4 @sm:p-5">
              <div className="mb-3 text-sm font-semibold">
                {pickedDay
                  ? pickedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", ...(bookingFor ? { year: "numeric" as const } : {}) })
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
                      aria-pressed={active}
                      className={cn(
                        "min-h-11 w-full rounded-lg border px-3 py-2.5 text-center text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        active ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary/40 text-primary hover:border-primary hover:bg-primary/5",
                      )}
                    >{fmtTime(s.start_at)}</button>
                  );
                })}
              </div>
              {selected && (
                <Button className="mt-4 w-full" onClick={() => setConfirmOpen(true)}>
                  Book {fmtTime(selected)}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <BookingConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        slotIso={selected}
        durationMinutes={pass.session_length_minutes}
        book={(slotIso, key, studentNote) => api.book(slotIso, key, studentNote)}
        theme={theme}
        bookingFor={bookingFor}
        upload={api.uploadFiles ? { uploadFiles: api.uploadFiles, discardUpload: api.discardUpload } : undefined}
        onBooked={async (slotIso) => {
          setSelected(null);
          const parentRefresh = Promise.resolve().then(() => onBookingCommitted?.()).catch(() => { toast.info("Session booked. Refresh the student account to see its updated balance."); });
          const fresh = await api.loadInfo();
          await parentRefresh;
          setInfo(fresh);
          await loadSlots();
          const match = fresh.bookings?.find((r) => r.start_at === slotIso && r.status === "booked");
          return match?.meet_url ?? null;
        }}
        onCommitError={async () => { await refreshInfo(); await loadSlots(); }}
      />

      <UpcomingSessions bookings={info?.bookings ?? []} />
    </div>
  );
}
