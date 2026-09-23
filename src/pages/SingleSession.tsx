import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock, ExternalLink,
  Globe2, Loader2, Plus, ShieldCheck, Trash2, UserRound, Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import "@/pages/booking/booking-theme.css";
import { buildMonthCells, dayKey, groupSlotsByDay, startOfDay } from "@/components/booking/bookingCalendar";

export type SingleSessionSlot = { start_at: string; end_at: string };
export type SingleSessionStatus = {
  id?: string;
  booking_id?: string;
  status: "draft" | "checkout_open" | "booked" | "cancelled" | "expired" | "abandoned" | "refund_pending" | "refunded" | "refund_failed";
  start_at: string;
  end_at: string;
  meet_url?: string | null;
  checkout_url?: string | null;
  attendee_name?: string | null;
  event_label?: string | null;
  duration_minutes?: number | null;
  timezone?: string | null;
  calendar_ready?: boolean;
  calendar_pending?: boolean;
  calendar_url?: string | null;
};
export type SingleSessionStatusLookup = {
  checkout_session_id?: string;
  booking_id?: string;
};
type HoldInput = {
  start_at: string;
  name: string;
  email: string;
  notes: string;
  guests: string[];
  timezone: string;
  client_idempotency_key: string;
  turnstile_token: string;
  booking_token?: string;
};
// A free event finishes inside `hold`: there is no checkout to send anyone to,
// so the url and session id come back null and the booking is already booked.
type HoldResult = {
  checkout_url: string | null;
  booking_token: string;
  checkout_session_id: string | null;
  booking_id?: string | null;
  booking?: SingleSessionStatus;
};

export type EventInfo = {
  host: { name: string; title: string };
  duration_minutes: number;
  amount_cents: number;
  currency: string;
  requires_payment?: boolean;
  /** True for a one-off link: this URL sells one session and then stops. */
  single_use?: boolean;
  /** False once a one-off link has been used. Undefined for ordinary events. */
  available?: boolean;
};

/** "1h 10m", "30m" -- the event's own length, not a constant. */
function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** The wire words the edge function uses, as something a person can read. */
const ERROR_TEXT: Record<string, string> = {
  unknown_event: "This booking link is no longer active.",
  link_already_used: "This link has already been used to book a session.",
  slot_unavailable: "That time was taken while you were filling this in. Please pick another.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  security_check_failed: "The security check did not pass. Please reload and try again.",
  security_check_unavailable: "The security check could not load. Please reload and try again.",
  security_check_expired: "The security check expired. Please try again.",
  verification_failed: "The security check did not pass. Please reload and try again.",
};

function readableError(message: string): string {
  return ERROR_TEXT[message] ?? message;
}

export type SingleSessionApi = {
  info: () => Promise<EventInfo>;
  slots: () => Promise<{ slots: SingleSessionSlot[] }>;
  hold: (input: HoldInput) => Promise<HoldResult>;
  status: (lookup: SingleSessionStatusLookup, bookingToken: string) => Promise<SingleSessionStatus>;
  abandon: (checkoutSessionId: string, bookingToken: string) => Promise<{ status: string }>;
  cancel: (cancelToken: string, confirm: boolean) => Promise<SingleSessionStatus>;
  getTurnstileToken: () => Promise<string>;
  redirectToCheckout: (url: string) => void;
};

type PendingCheckout = HoldResult;
const PENDING_KEY = "lsatu.single-session.pending";
const IDEMPOTENCY_KEY = "lsatu.single-session.idempotency";
// The single session keeps the original, unsuffixed keys so a hold already in
// someone's browser survives this change. Other events get their own namespace
// so a held consultation and a held session can never read each other's token.
const pendingKey = (event: string) =>
  event === "single-session" ? PENDING_KEY : `${PENDING_KEY}.${event}`;
const idempotencyKeyFor = (event: string) =>
  event === "single-session" ? IDEMPOTENCY_KEY : `${IDEMPOTENCY_KEY}.${event}`;

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

async function invoke<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("single-session", { body: { action, ...extra } });
  if (error) {
    // supabase-js turns any non-2xx into "Edge Function returned a non-2xx
    // status code" and keeps the body on the error object. That body is where
    // the reason lives -- unknown_event, link_already_used -- and it is the
    // whole difference between "something went wrong" and "this link is spent".
    const body = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    const reason = await body?.json?.().then((parsed) => parsed?.error).catch(() => undefined);
    throw new Error(reason || error.message);
  }
  const result = data as { error?: string } & T;
  if (result?.error) throw new Error(result.error);
  return result;
}

function turnstileToken(): Promise<string> {
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  if (!sitekey) return Promise.reject(new Error("security_check_unavailable"));
  const run = () => new Promise<string>((resolve, reject) => {
    if (!window.turnstile) return reject(new Error("security_check_unavailable"));
    const mount = document.createElement("div");
    mount.hidden = true;
    document.body.appendChild(mount);
    let widgetId = "";
    const clean = () => {
      if (widgetId) window.turnstile?.remove(widgetId);
      mount.remove();
    };
    widgetId = window.turnstile.render(mount, {
      sitekey,
      size: "invisible",
      callback: (token: string) => { clean(); resolve(token); },
      "error-callback": () => { clean(); reject(new Error("security_check_failed")); },
      "expired-callback": () => { clean(); reject(new Error("security_check_expired")); },
    });
  });
  if (window.turnstile) return run();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-lsatu-turnstile="true"]');
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.lsatuTurnstile = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => void run().then(resolve, reject), { once: true });
    script.addEventListener("error", () => reject(new Error("security_check_unavailable")), { once: true });
  });
}

/**
 * One api per event. Every call names the event it is about, so the same page
 * serves the paid session and the free consultation without either of them
 * being able to answer for the other.
 */
export function makeApi(eventSlug: string): SingleSessionApi {
  return {
    info: () => invoke("info", { event: eventSlug }),
    slots: () => invoke("slots", { event: eventSlug }),
    hold: (input) => invoke("hold", { ...input, event: eventSlug }),
    status: (lookup, bookingToken) => invoke("status", { event: eventSlug, ...lookup, booking_token: bookingToken }),
    abandon: (checkoutSessionId, bookingToken) => invoke("abandon", { event: eventSlug, checkout_session_id: checkoutSessionId, booking_token: bookingToken }),
    cancel: (cancelToken, confirm) => invoke("cancel", { event: eventSlug, cancel_token: cancelToken, confirm }),
    getTurnstileToken: turnstileToken,
    redirectToCheckout: (url) => window.location.assign(url),
  };
}

const defaultApi: SingleSessionApi = makeApi("single-session");

function readPending(event = "single-session"): PendingCheckout | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(pendingKey(event)) ?? "null") as Partial<PendingCheckout> | null;
    return parsed?.booking_token && parsed.checkout_session_id && parsed.checkout_url ? parsed as PendingCheckout : null;
  } catch { return null; }
}

function viewerTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto"; }
  catch { return "America/Toronto"; }
}

function formatTime(iso: string, hour12: boolean, timeZone?: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12, ...(timeZone ? { timeZone } : {}) });
}

function formatSlot(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function bookingDuration(state: SingleSessionStatus) {
  if (state.duration_minutes && state.duration_minutes > 0) return state.duration_minutes;
  return Math.max(0, Math.round((new Date(state.end_at).getTime() - new Date(state.start_at).getTime()) / 60_000));
}

function formatBookingTime(state: SingleSessionStatus) {
  const timeZone = state.timezone || viewerTimezone();
  const date = new Date(state.start_at).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone,
  });
  const start = formatTime(state.start_at, true, timeZone);
  const end = formatTime(state.end_at, true, timeZone);
  return `${start} – ${end}, ${date}`;
}

function statusLookupFromParams(
  checkoutSessionId: string | null,
  bookingId: string | null,
  pending?: PendingCheckout | null,
): SingleSessionStatusLookup | null {
  if (checkoutSessionId) return { checkout_session_id: checkoutSessionId };
  if (bookingId) return { booking_id: bookingId };
  if (pending?.checkout_session_id) {
    return { checkout_session_id: pending.checkout_session_id };
  }
  return null;
}

function isCalendarReady(state: SingleSessionStatus): boolean {
  return state.calendar_ready === true && Boolean(state.calendar_url);
}

function invitationStatusCopy(
  calendarReady: boolean,
  pollingExhausted = false,
): string {
  if (calendarReady) {
    return "A calendar invitation has been sent to your email address.";
  }
  if (pollingExhausted) {
    return "Your session is confirmed. Your calendar invitation is taking a little longer to prepare, and we'll email it to you as soon as it's ready.";
  }
  return "Your session is confirmed. We're preparing your calendar invitation now.";
}

function statusCopy(status: SingleSessionStatus["status"]) {
  if (status === "cancelled") return { title: "Your session is cancelled", body: "The calendar invitation is being removed. Cancelling does not automatically issue a refund." };
  if (status === "refund_pending") return { title: "We're returning your payment", body: "That time was no longer available when payment finished. Your refund is being processed, and we'll email you when Stripe confirms it." };
  if (status === "refunded") return { title: "Your payment was refunded", body: "That time could not be booked. Stripe has confirmed the refund." };
  if (status === "refund_failed") return { title: "Your refund needs attention", body: "Joshua has been alerted and will follow up with you directly." };
  if (status === "abandoned") return { title: "This hold was released", body: "No booking was made. You can choose another available time." };
  return { title: "This hold expired", body: "No booking was made. Choose another available time to start again." };
}

function ResultView({
  state,
  calendarPollingExhausted,
  checkoutSessionId,
}: {
  state: SingleSessionStatus;
  calendarPollingExhausted?: boolean;
  checkoutSessionId?: string | null;
}) {
  if (state.status === "booked") {
    const calendarReady = isCalendarReady(state);
    const timezone = (state.timezone || viewerTimezone()).replace(/_/g, " ");
    const invitationCopy = invitationStatusCopy(
      calendarReady,
      calendarPollingExhausted,
    );
    return <main className="booking-holo flex min-h-screen items-center px-3 py-8 sm:px-6 sm:py-14">
      <section className="booking-shadow relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-[#75152A]/20 bg-white px-5 py-10 text-center text-slate-900 sm:px-12 sm:py-14 lg:px-20" aria-live="polite">
        <div aria-hidden="true" className="absolute -right-14 top-8 w-52 rotate-45 bg-gradient-to-r from-[#4F0D1C] via-[#6E1423] to-[#8E1D3A] py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-white shadow-sm sm:-right-12 sm:top-9 sm:text-[10px]">Powered by LSAT U</div>
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#75152A] text-[#75152A]"><Check className="h-5 w-5 stroke-[2.5]" /></div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[#75152A] sm:text-3xl">You are scheduled!</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{invitationCopy}</p>
        {calendarReady
          ? <Button asChild variant="outline" className="mt-6 min-h-11 border-[#75152A] px-6 text-[#75152A] hover:bg-[#75152A] hover:text-white"><a href={state.calendar_url!} target="_blank" rel="noreferrer">Open Invitation <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
          : state.meet_url
            ? <Button asChild variant="outline" className="mt-6 min-h-11 border-[#75152A] px-6 text-[#75152A] hover:bg-[#75152A] hover:text-white"><a href={state.meet_url} target="_blank" rel="noreferrer">Join Google Meet <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
            : <Button variant="outline" className="mt-6 min-h-11 border-[#75152A]/35 px-6 text-[#75152A]/60" disabled>{calendarPollingExhausted ? "Invitation pending" : <><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />Preparing invitation</>}</Button>}

        <div className="mt-10 border-t border-slate-200 pt-8 text-left sm:mt-12 sm:pt-10">
          <h2 className="text-xl font-semibold text-[#75152A] sm:text-2xl">{state.event_label || "LSAT U Session"}</h2>
          <dl className="mt-6 space-y-5 text-sm text-slate-700 sm:text-base">
            <div className="flex items-start gap-4"><UserRound className="mt-0.5 h-5 w-5 shrink-0 text-[#75152A]" aria-hidden="true" /><dt className="sr-only">Attendee</dt><dd>{state.attendee_name || "Your session"}</dd></div>
            <div className="flex items-start gap-4"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[#75152A]" aria-hidden="true" /><dt className="sr-only">Date and time</dt><dd>{formatBookingTime(state)} <span className="whitespace-nowrap text-slate-500">({bookingDuration(state)} minutes)</span></dd></div>
            <div className="flex items-start gap-4"><Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-[#75152A]" aria-hidden="true" /><dt className="sr-only">Timezone</dt><dd>{timezone}</dd></div>
            <div className="flex items-start gap-4"><Video className="mt-0.5 h-5 w-5 shrink-0 text-[#75152A]" aria-hidden="true" /><dt className="sr-only">Location</dt><dd>{state.meet_url ? <a href={state.meet_url} target="_blank" rel="noreferrer" className="underline">{state.meet_url}</a> : "Google Meet details will be included in your calendar invitation."}</dd></div>
          </dl>
        </div>
      </section>
    </main>;
  }
  if (state.status === "checkout_open" || state.status === "draft") {
    return <main className="booking-holo min-h-screen px-4 py-12 sm:py-20">
      <section className="booking-shadow mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center sm:p-10" aria-live="polite">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary motion-reduce:animate-none" />
        <h1 className="mt-5 text-2xl font-semibold">Payment received, finalizing</h1>
        <p className="mt-2 text-sm text-muted-foreground">You'll have an email shortly. If you contact support, include checkout session {checkoutSessionId ?? "unknown"}.</p>
      </section>
    </main>;
  }
  const copy = statusCopy(state.status);
  return <main className="booking-holo min-h-screen px-4 py-12 sm:py-20">
    <section className="booking-shadow mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center sm:p-10" role="status">
      <h1 className="text-2xl font-semibold">{copy.title}</h1><p className="mt-3 text-sm text-muted-foreground">{copy.body}</p>
      <Button asChild className="mt-6"><Link to="/book/session">See available times</Link></Button>
    </section>
  </main>;
}

export default function SingleSession({
  api,
  event = "single-session",
}: { api?: SingleSessionApi; event?: string }) {
  // Built once per event. A caller that hands in its own api (the tests) still wins.
  const resolvedApi = useMemo(() => api ?? (event === "single-session" ? defaultApi : makeApi(event)), [api, event]);
  const [params] = useSearchParams();
  const bookingToken = params.get("booking_token");
  const checkoutSessionId = params.get("checkout_session_id");
  const bookingId = params.get("booking_id");
  const cancelToken = params.get("cancel_token");
  const [info, setInfo] = useState<EventInfo | null>(null);
  const [slots, setSlots] = useState<SingleSessionSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickedDay, setPickedDay] = useState<Date | null>(null);
  const [selected, setSelected] = useState<SingleSessionSlot | null>(null);
  const [monthAnchor, setMonthAnchor] = useState(() => startOfDay(new Date()));
  const [hour12, setHour12] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SingleSessionStatus | null>(null);
  const [statusLookup, setStatusLookup] =
    useState<SingleSessionStatusLookup | null>(() =>
      statusLookupFromParams(checkoutSessionId, bookingId)
    );
  const [confirmationToken, setConfirmationToken] = useState(bookingToken);
  const [calendarPollingExhausted, setCalendarPollingExhausted] = useState(false);
  const [resume, setResume] = useState<PendingCheckout | null>(null);
  const [cancelPreview, setCancelPreview] = useState<SingleSessionStatus | null>(null);
  const submitPromise = useRef<Promise<void> | null>(null);
  const availabilityHeading = useRef<HTMLHeadingElement>(null);
  const [timezone, setTimezone] = useState(viewerTimezone);
  const timezoneOptions = useMemo(() => {
    try {
      const values = (Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf?.("timeZone") ?? [];
      return values.includes(timezone) ? values : [timezone, ...values];
    } catch { return [timezone]; }
  }, [timezone]);

  const loadAvailability = useCallback(async (rejectedStartAt?: string) => {
    const [nextInfo, nextSlots] = await Promise.all([resolvedApi.info(), resolvedApi.slots()]);
    const availableSlots = (nextSlots.slots ?? []).filter((slot) => slot.start_at !== rejectedStartAt);
    setInfo(nextInfo);
    setSlots(availableSlots);
    const first = availableSlots[0];
    if (first) {
      const date = startOfDay(new Date(first.start_at));
      setPickedDay((current) => current ?? date);
      setMonthAnchor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [resolvedApi]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (cancelToken) {
          const preview = await resolvedApi.cancel(cancelToken, false);
          if (!cancelled) setCancelPreview(preview);
          return;
        }
        const pending = readPending(event);
        const token = bookingToken ?? pending?.booking_token;
        const lookup = statusLookupFromParams(
          checkoutSessionId,
          bookingId,
          pending,
        );
        if (token && lookup) {
          const state = await resolvedApi.status(lookup, token);
          if (cancelled) return;
          if (!checkoutSessionId && state.status === "checkout_open" && pending) setResume(pending);
          else {
            setStatusLookup(lookup);
            setConfirmationToken(token);
            setResult(state);
          }
          return;
        }
        await loadAvailability();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "booking_unavailable");
      } finally { if (!cancelled) setLoading(false); }
    }
    void start();
    return () => { cancelled = true; };
  }, [bookingId, bookingToken, cancelToken, checkoutSessionId, event, loadAvailability, resolvedApi]);

  const resultStatus = result?.status;
  const calendarReady = result !== null && isCalendarReady(result);
  useEffect(() => {
    const waitingForBooking = resultStatus === "checkout_open" || resultStatus === "draft";
    const waitingForCalendar = resultStatus === "booked" && !calendarReady;
    if (!resultStatus || !statusLookup || !confirmationToken || (!waitingForBooking && !waitingForCalendar)) return;
    let stopped = false;
    let attempts = 0;
    const poll = async () => {
      setCalendarPollingExhausted(false);
      while (!stopped && attempts < 20) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        if (stopped) return;
        attempts += 1;
        try {
          const next = await resolvedApi.status(statusLookup, confirmationToken);
          if (!stopped) setResult(next);
          if (next.status === "booked" && isCalendarReady(next)) return;
          if (next.status !== "checkout_open" && next.status !== "draft" && next.status !== "booked") return;
        } catch { /* the bounded confirmation fallback remains truthful */ }
      }
      if (!stopped) setCalendarPollingExhausted(true);
    };
    void poll();
    return () => { stopped = true; };
  }, [calendarReady, confirmationToken, resolvedApi, resultStatus, statusLookup]);

  useEffect(() => {
    if (!result || result.status === "checkout_open" || result.status === "draft") return;
    sessionStorage.removeItem(pendingKey(event));
    sessionStorage.removeItem(idempotencyKeyFor(event));
  }, [event, result]);

  const slotsByDay = useMemo(() => groupSlotsByDay(slots), [slots]);
  const daySlots = pickedDay ? slotsByDay.get(dayKey(pickedDay)) ?? [] : [];
  const cells = useMemo(() => buildMonthCells(monthAnchor), [monthAnchor]);

  const choose = (slot: SingleSessionSlot) => {
    setSelected(slot);
    setError(null);
    window.setTimeout(() => document.getElementById("single-session-name")?.focus(), 0);
  };

  // Named formEvent, not event: `event` is the booking event this page is for,
  // and shadowing it here would silently key the session storage on a DOM object.
  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!selected || submitPromise.current) return;
    const work = (async () => {
      setSubmitting(true);
      setError(null);
      try {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedGuests = [...new Set(guests.map((guest) => guest.trim().toLowerCase()).filter((guest) => guest && guest !== normalizedEmail))].slice(0, 10);
        let idempotencyKey = sessionStorage.getItem(idempotencyKeyFor(event));
        if (!idempotencyKey) {
          idempotencyKey = crypto.randomUUID();
          sessionStorage.setItem(idempotencyKeyFor(event), idempotencyKey);
        }
        const token = await resolvedApi.getTurnstileToken();
        const hold = await resolvedApi.hold({
          start_at: selected.start_at,
          name: name.trim(), email: normalizedEmail, notes: notes.trim(), guests: normalizedGuests,
          timezone, client_idempotency_key: idempotencyKey, turnstile_token: token,
          ...(readPending(event)?.booking_token ? { booking_token: readPending(event)!.booking_token } : {}),
        });
        // A free event is already booked by the time hold returns: there is no
        // checkout to send anyone to, so show the confirmation instead of
        // navigating away to a Stripe page that does not exist.
        if (!hold.checkout_url) {
          sessionStorage.removeItem(pendingKey(event));
          sessionStorage.removeItem(idempotencyKeyFor(event));
          const freeBookingId = hold.booking_id || hold.booking?.booking_id || hold.booking?.id;
          if (freeBookingId) {
            const lookup = { booking_id: freeBookingId };
            setStatusLookup(lookup);
            setConfirmationToken(hold.booking_token);
            const url = new URL(window.location.href);
            url.searchParams.set("booking_id", freeBookingId);
            url.searchParams.set("booking_token", hold.booking_token);
            window.history.replaceState(window.history.state, "", url);
          }
          setResult(hold.booking ?? null);
          return;
        }
        sessionStorage.setItem(pendingKey(event), JSON.stringify(hold));
        resolvedApi.redirectToCheckout(hold.checkout_url);
      } catch (e) {
        const message = e instanceof Error ? e.message : "booking_failed";
        if (message.includes("security_check") || message === "verification_failed") {
          setError(readableError(message));
        } else if (message.includes("slot") || message.includes("unavailable") || message.includes("conflict")) {
          const rejectedStartAt = selected.start_at;
          sessionStorage.removeItem(idempotencyKeyFor(event));
          setError("That time was just taken. We refreshed the available times so you can choose another.");
          setSelected(null);
          await loadAvailability(rejectedStartAt);
          window.setTimeout(() => availabilityHeading.current?.focus(), 0);
        } else setError(info?.requires_payment === false
          ? "We couldn't confirm that time. Please try again."
          : "We couldn't open checkout. Your card was not charged. Please try again.");
      } finally {
        setSubmitting(false);
        submitPromise.current = null;
      }
    })();
    submitPromise.current = work;
  };

  if (loading) return <main className="booking-holo flex min-h-screen items-center justify-center" role="status" aria-live="polite"><Loader2 className="mr-2 h-5 w-5 animate-spin motion-reduce:animate-none" />Loading available times</main>;
  if (result) {
    return (
      <ResultView
        state={result}
        calendarPollingExhausted={calendarPollingExhausted}
        checkoutSessionId={checkoutSessionId}
      />
    );
  }
  if (resume) return <main className="booking-holo min-h-screen px-4 py-12 sm:py-20"><section className="booking-shadow mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
    <h1 className="text-2xl font-semibold">Finish your payment</h1><p className="mt-2 text-sm text-muted-foreground">Your time is still held. Return to Stripe to finish booking it.</p>
    <Button className="mt-6" onClick={() => resolvedApi.redirectToCheckout(resume.checkout_url)}>Return to secure checkout <ExternalLink className="ml-2 h-4 w-4" /></Button>
    <Button variant="ghost" className="mt-3 block w-full" onClick={async () => { await resolvedApi.abandon(resume.checkout_session_id, resume.booking_token); sessionStorage.removeItem(pendingKey(event)); sessionStorage.removeItem(idempotencyKeyFor(event)); setResume(null); await loadAvailability(); }}>Release this time</Button>
  </section></main>;
  if (cancelToken && cancelPreview) return <main className="booking-holo min-h-screen px-4 py-12 sm:py-20"><section className="booking-shadow mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 text-center sm:p-10">
    <h1 className="text-2xl font-semibold">Cancel this session?</h1><p className="mt-2 text-sm text-muted-foreground">{formatSlot(cancelPreview.start_at)}</p><p className="mt-4 text-sm">Cancelling does not automatically issue a refund.</p>
    <Button variant="destructive" className="mt-6" onClick={async () => { setSubmitting(true); try { setResult(await resolvedApi.cancel(cancelToken, true)); } finally { setSubmitting(false); } }} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}Cancel session</Button>
  </section></main>;

  // A free event says "Free" rather than "$0.00", which reads like a bug.
  const price = info
    ? (info.requires_payment === false || info.amount_cents === 0
        ? "Free"
        : new Intl.NumberFormat(undefined, { style: "currency", currency: info.currency.toUpperCase() }).format(info.amount_cents / 100))
    // Never a number while the event is unknown: a one-off link carries its own
    // price, and guessing $45 at it would be a lie in the reader's favour.
    : "—";
  const title = info?.host.title ?? "LSAT Session";
  // A one-off link the edge function has already marked spent. Nothing on this
  // page is actionable in that state, so it replaces the picker outright.
  const linkUsed = info?.available === false;
  return <main className="booking-holo single-session-page min-h-screen px-3 py-4 sm:px-6 sm:py-8 lg:flex lg:items-center">
    <section className="booking-shadow mx-auto w-full max-w-7xl overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border p-5 lg:border-b-0 lg:border-r lg:p-7">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground" aria-hidden="true">J</div>
          <p className="mt-4 text-sm font-medium text-muted-foreground">{info?.host.name ?? "Joshua"}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          <dl className="mt-5 space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><dt className="sr-only">Duration</dt><dd>{info ? durationLabel(info.duration_minutes) : "—"}</dd></div>
            <div className="flex items-center gap-2"><Video className="h-4 w-4" /><dt className="sr-only">Location</dt><dd>Google Meet</dd></div>
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><dt className="sr-only">Price</dt><dd>{price}</dd></div>
          </dl>
          <div className="mt-6 border-t border-border pt-5"><Label htmlFor="booking-timezone" className="text-xs uppercase tracking-wider text-muted-foreground">Timezone</Label><select id="booking-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm">{timezoneOptions.map((zone) => <option key={zone} value={zone}>{zone.replace(/_/g, " ")}</option>)}</select></div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6 lg:p-7">
          {error ? <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{readableError(error)}</div> : null}
          {linkUsed ? <div className="py-16 text-center">
            <CalendarDays className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold">This link has already been used</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">It booked one session and is now closed. If you still need a time, reply to Joshua and he'll send you a new link.</p>
          </div> : selected ? <form onSubmit={submit} className="mx-auto max-w-2xl">
            <Button type="button" variant="ghost" className="mb-4 -ml-3" onClick={() => setSelected(null)}><ChevronLeft className="mr-1 h-4 w-4" />Back to times</Button>
            <h2 className="text-xl font-semibold">Your details</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary">{formatSlot(selected.start_at)}</span><span className="rounded-full bg-muted px-3 py-1.5">{info ? `${info.duration_minutes} minutes` : ""}</span></div>
            <div className="mt-6 grid gap-5">
              <div><Label htmlFor="single-session-name">Your name*</Label><Input id="single-session-name" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" className="mt-2 min-h-11" /></div>
              <div><Label htmlFor="single-session-email">Email address*</Label><Input id="single-session-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-2 min-h-11" /></div>
              <div><Label htmlFor="single-session-notes">Additional notes</Label><Textarea id="single-session-notes" value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} placeholder="Please share anything that will help prepare for our meeting." className="mt-2 min-h-28" /></div>
              <fieldset><legend className="text-sm font-medium">Guests</legend>{guests.map((guest, index) => <div key={index} className="mt-2 flex gap-2"><Input aria-label={`Guest ${index + 1} email address`} type="email" value={guest} onChange={(event) => setGuests((current) => current.map((value, guestIndex) => guestIndex === index ? event.target.value : value))} className="min-h-11" /><Button type="button" variant="ghost" size="icon" aria-label={`Remove guest ${index + 1}`} onClick={() => setGuests((current) => current.filter((_, guestIndex) => guestIndex !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
                {guests.length < 10 ? <Button type="button" variant="ghost" className="mt-2 -ml-3" onClick={() => setGuests((current) => [...current, ""])}><Plus className="mr-1 h-4 w-4" />Add guests</Button> : null}</fieldset>
            </div>
            <Button type="submit" className="mt-7 min-h-12 w-full" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}{info?.requires_payment === false ? "Confirm booking" : "Pay to book"}</Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {info?.requires_payment === false ? "No payment is required." : "You'll finish payment securely on Stripe."}
            </p>
          </form> : <>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 ref={availabilityHeading} tabIndex={-1} className="text-xl font-semibold outline-none">Select a time</h2><div className="inline-flex rounded-lg border border-border p-1" aria-label="Time format"><button type="button" aria-pressed={hour12} onClick={() => setHour12(true)} className={cn("min-h-9 rounded-md px-3 text-xs font-medium", hour12 && "bg-primary text-primary-foreground")}>12h</button><button type="button" aria-pressed={!hour12} onClick={() => setHour12(false)} className={cn("min-h-9 rounded-md px-3 text-xs font-medium", !hour12 && "bg-primary text-primary-foreground")}>24h</button></div></div>
            <div className="mt-5 grid gap-8">
              <div><div className="flex items-center justify-between"><Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonthAnchor((date) => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-semibold" aria-live="polite">{monthAnchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span><Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonthAnchor((date) => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
                <div className="mt-4 grid grid-cols-7 gap-x-2 gap-y-1 text-center sm:gap-x-4">{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`} aria-hidden="true" className="py-2 text-xs text-muted-foreground">{day}</span>)}{cells.map((date, index) => date ? <button key={dayKey(date)} type="button" disabled={!slotsByDay.has(dayKey(date))} aria-label={date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} aria-pressed={pickedDay ? dayKey(date) === dayKey(pickedDay) : false} onClick={() => setPickedDay(date)} className={cn("mx-auto flex aspect-square w-full max-w-12 items-center justify-center rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", slotsByDay.has(dayKey(date)) ? "bg-primary/10 font-medium hover:bg-primary/20" : "text-muted-foreground/35", pickedDay && dayKey(date) === dayKey(pickedDay) && "bg-primary text-primary-foreground hover:bg-primary")}>{date.getDate()}</button> : <span key={`empty-${index}`} />)}</div>
              </div>
              <div data-testid="single-session-selected-day-slots"><h3 className="text-sm font-semibold">{pickedDay ? pickedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Choose a day"}</h3><div className="mt-3 grid gap-2">{daySlots.map((slot) => <button key={slot.start_at} type="button" onClick={() => choose(slot)} aria-label={formatTime(slot.start_at, hour12, timezone)} className="min-h-12 w-full rounded-lg border border-primary/40 px-4 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{formatTime(slot.start_at, hour12, timezone)}</button>)}</div></div>
            </div>
            {!slots.length ? <div className="mt-8 text-center text-sm text-muted-foreground"><CalendarDays className="mx-auto mb-2 h-5 w-5" />No open times in the current booking window.</div> : null}
          </>}
        </div>
      </div>
    </section>
  </main>;
}
