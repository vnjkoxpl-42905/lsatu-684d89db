import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, Loader2, Lock, Ticket, Video } from "lucide-react";

type PassInfo = {
  id: string;
  status: "active" | "exhausted" | "expired" | "revoked";
  total_credits: number;
  used_credits: number;
  credits_remaining: number;
  session_length_minutes: number;
  expires_at: string | null;
  student_label: string;
};

type Slot = { start_at: string; end_at: string };
type HistoryRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  google_event_id: string | null;
  meet_url: string | null;
};
type BookedSession = { start_at: string; meet_url: string | null };

const call = async (action: string, token: string, extra: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("booking-pass", {
    body: { action, token, ...extra },
  });
  if (error) {
    const msg = error instanceof Error ? error.message : "Request failed";
    throw new Error(msg);
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
  return data;
};

function statusCopy(status: PassInfo["status"]) {
  switch (status) {
    case "exhausted": return { title: "All sessions used", body: "This booking link has been fully redeemed. Ask Joshua for a new pass if you need more sessions." };
    case "expired": return { title: "Link expired", body: "This booking link has passed its expiration date." };
    case "revoked": return { title: "Link revoked", body: "This booking link is no longer valid. Reach out to Joshua for a new one." };
    default: return null;
  }
}

function formatSlot(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function groupByDay(slots: Slot[]) {
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const d = new Date(s.start_at);
    const key = d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return Array.from(groups.entries());
}

export default function BookingPass() {
  const { token = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pass, setPass] = useState<PassInfo | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [bookingKey, setBookingKey] = useState<string>(() => crypto.randomUUID());
  const [booking, setBooking] = useState(false);
  const [justBooked, setJustBooked] = useState<BookedSession | null>(null);
  const viewerTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const info = await call("info", token) as { pass: PassInfo; history: HistoryRow[] };
      setPass(info.pass);
      setHistory(info.history);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load link");
      setPass(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadSlots = useCallback(async () => {
    if (!pass || pass.status !== "active") return;
    setSlotsLoading(true);
    try {
      const tzOffsetMinutes = -new Date().getTimezoneOffset(); // minutes east of UTC
      const res = await call("slots", token, { tz_offset_minutes: tzOffsetMinutes }) as { slots: Slot[] };
      setSlots(res.slots ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load times");
    } finally {
      setSlotsLoading(false);
    }
  }, [pass, token]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { void loadSlots(); }, [loadSlots]);

  const grouped = useMemo(() => groupByDay(slots), [slots]);
  const locked = pass && pass.status !== "active";

  async function book() {
    if (!selected || !pass) return;
    setBooking(true);
    try {
      const bookedStart = selected;
      const res = await call("book", token, { start_at: selected, idempotency_key: bookingKey }) as {
        ok: boolean; pass: PassInfo; redemption?: { meet_url?: string | null };
      };
      toast.success("Session booked");
      setPass(res.pass);
      setSelected(null);
      setBookingKey(crypto.randomUUID());
      setJustBooked({ start_at: bookedStart, meet_url: res.redemption?.meet_url ?? null });
      await Promise.all([refresh(), loadSlots()]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Booking failed";
      if (msg.includes("slot_conflict")) toast.error("That time was just taken. Pick another.");
      else if (msg.includes("pass_exhausted")) toast.error("No sessions remaining on this pass.");
      else if (msg.includes("pass_expired")) toast.error("This pass has expired.");
      else toast.error(msg);
      await refresh();
      await loadSlots();
    } finally {
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 bg-zinc-900 border-zinc-800 text-center">
          <Lock className="h-8 w-8 mx-auto mb-3 text-amber-500" />
          <h1 className="text-xl font-semibold mb-2">Link not valid</h1>
          <p className="text-sm text-zinc-400">This booking link doesn't exist or was never issued. Check the URL or ask Joshua for a new one.</p>
        </Card>
      </div>
    );
  }

  const locked_copy = statusCopy(pass.status);

  if (justBooked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 bg-zinc-900 border-zinc-800 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
          <div>
            <h1 className="text-2xl font-semibold">You're booked</h1>
            <p className="mt-1 text-zinc-300">{formatSlot(justBooked.start_at)}</p>
            {viewerTz && <p className="text-xs text-zinc-500 mt-1">Times shown in {viewerTz}</p>}
          </div>
          <p className="text-sm text-zinc-400">
            It's on Joshua's Google Calendar and we've emailed you the invite{justBooked.meet_url ? " with the Meet link" : ""}.
          </p>
          {justBooked.meet_url ? (
            <a href={justBooked.meet_url} target="_blank" rel="noreferrer" className="block">
              <Button size="lg" className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold">
                <Video className="h-4 w-4 mr-2" /> Join with Google Meet
              </Button>
            </a>
          ) : (
            <p className="text-xs text-zinc-500">Your Google Meet link is in the calendar invite.</p>
          )}
          <Button variant="ghost" className="w-full text-zinc-400" onClick={() => setJustBooked(null)}>
            Book another session
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-500 text-xs uppercase tracking-wider font-medium">
              <Ticket className="h-4 w-4" /> LSAT U booking pass
            </div>
            <h1 className="mt-2 text-3xl font-semibold">Book a session with Joshua</h1>
            <p className="mt-1 text-sm text-zinc-400">For {pass.student_label}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold text-amber-400">{pass.credits_remaining}</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">of {pass.total_credits} left</div>
          </div>
        </header>

        <Card className="bg-zinc-900/70 border-zinc-800 p-5 flex items-center gap-3 text-sm text-zinc-300">
          <CalendarClock className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            Each booking uses <b>1 credit</b> and reserves a <b>{pass.session_length_minutes}-minute</b> session on Joshua's calendar.
            {pass.expires_at && (
              <span className="text-zinc-500"> · Expires {new Date(pass.expires_at).toLocaleDateString()}</span>
            )}
          </div>
        </Card>

        {locked_copy ? (
          <Card className="bg-zinc-900/70 border-amber-900/40 p-6 text-center">
            <Lock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <h2 className="text-lg font-semibold">{locked_copy.title}</h2>
            <p className="text-sm text-zinc-400 mt-1">{locked_copy.body}</p>
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Available times</h2>
                {viewerTz && <p className="text-xs text-zinc-500">Times shown in {viewerTz}</p>}
              </div>
              <Button size="sm" variant="ghost" onClick={loadSlots} disabled={slotsLoading}>
                {slotsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
            {slotsLoading && slots.length === 0 && (
              <div className="text-sm text-zinc-500 py-6 text-center">Loading Joshua's calendar…</div>
            )}
            {!slotsLoading && slots.length === 0 && (
              <Card className="bg-zinc-900/50 border-zinc-800 p-6 text-center text-sm text-zinc-400">
                No open times in the next few weeks. Try refreshing later.
              </Card>
            )}
            <div className="space-y-4">
              {grouped.map(([day, daySlots]) => (
                <Card key={day} className="bg-zinc-900/60 border-zinc-800 p-4">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-3">{day}</div>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map(s => {
                      const active = selected === s.start_at;
                      return (
                        <button
                          key={s.start_at}
                          onClick={() => setSelected(s.start_at)}
                          className={
                            "px-3 py-1.5 rounded-md text-sm border transition " +
                            (active
                              ? "bg-amber-500 text-zinc-950 border-amber-400 font-medium"
                              : "bg-zinc-950/60 text-zinc-200 border-zinc-800 hover:border-amber-600/60 hover:text-amber-200")
                          }
                        >
                          {new Date(s.start_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
            <div className="sticky bottom-4 flex justify-end">
              <Button
                onClick={book}
                disabled={!selected || booking}
                size="lg"
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold shadow-lg"
              >
                {booking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {selected ? `Book ${formatSlot(selected)}` : "Pick a time to book"}
              </Button>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Your bookings</h2>
          {history.length === 0 ? (
            <div className="text-sm text-zinc-500">No sessions booked yet.</div>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <Card key={h.id} className="bg-zinc-900/50 border-zinc-800 p-3 flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="flex-1">
                    <div className="text-zinc-100">{formatSlot(h.start_at)}</div>
                    <div className="text-xs text-zinc-500">{new Date(h.start_at) > new Date() ? "Upcoming" : "Past"}</div>
                  </div>
                  {h.meet_url && new Date(h.start_at) > new Date() && h.status === "booked" && (
                    <a href={h.meet_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300">
                        <Video className="h-4 w-4 mr-1" /> Join
                      </Button>
                    </a>
                  )}
                  <span className="text-xs uppercase tracking-wider text-zinc-500">{h.status}</span>
                </Card>
              ))}
              {/* TODO: cancellation flow — restores a credit when a booking is cancelled ahead of time. */}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
