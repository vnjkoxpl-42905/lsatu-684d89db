// Turning edge-function failures into something a student can act on.
//
// supabase-js wraps any non-2xx response as a FunctionsHttpError whose
// `.message` is the generic "Edge Function returned a non-2xx status code".
// The backend's real `{ error: "..." }` body is still there, stashed on the
// failing Response at `.context` — but only if you go and read it. Code that
// throws `error.message` straight through loses the reason entirely, and a
// student ends up staring at the raw supabase-js string.

/** The literal supabase-js message. Never show this to a student. */
export const GENERIC_EDGE_ERROR = "Edge Function returned a non-2xx status code";

/**
 * Pull the real `{ error }` message out of a FunctionsHttpError.
 * Returns null if nothing usable is found.
 */
export async function extractEdgeFunctionError(error: unknown): Promise<string | null> {
  const ctx = (error as { context?: unknown })?.context;
  if (ctx instanceof Response) {
    try {
      const body = await ctx.clone().json();
      const msg = (body as { error?: string })?.error;
      if (typeof msg === "string" && msg.trim()) return msg;
    } catch {
      // not JSON — fall through
    }
  }
  return null;
}

// Every machine code the booking path can return, paired with what the student
// should actually read. Codes absent from this map are internal faults, and the
// student gets the generic fallback rather than the code itself.
const BOOKING_MESSAGES: { match: string; message: string }[] = [
  { match: "slot_conflict", message: "That time was just taken. Pick another." },
  { match: "slot_unavailable", message: "That time isn't available. Pick another." },
  { match: "pass_exhausted", message: "You're out of sessions for now. Message Joshua for more." },
  { match: "no_sessions", message: "You're out of sessions for now. Message Joshua for more." },
  { match: "pass_expired", message: "Your booking access has expired. Message Joshua." },
  { match: "pass_not_active", message: "Your booking access isn't active. Message Joshua." },
  { match: "no_active_pass", message: "We can't find your booking package on this account. Message Joshua." },
  { match: "invalid_link", message: "This booking link isn't valid anymore. Message Joshua for a new one." },
  { match: "rate_limited", message: "Too many tries in a row. Wait a minute, then try again." },
  { match: "availability_check_failed", message: "The calendar isn't responding right now. Try again in a few minutes." },
  { match: "calendar_config_failed", message: "The calendar isn't responding right now. Try again in a few minutes." },
  { match: "payload_too_large", message: "That file is too large to attach." },
];

const BOOKING_FALLBACK =
  "Something went wrong booking that time. Try again, and message Joshua if it keeps happening.";

/**
 * Map a thrown booking error to student-facing text.
 *
 * Two failure modes are deliberately collapsed here: an unrecognised backend
 * code and the bare supabase-js wrapper both mean "we broke, not you", so both
 * get the same plain fallback. A raw code like `redeem_failed` is never shown.
 */
export function bookingErrorMessage(raw: string | null | undefined): string {
  const msg = (raw ?? "").trim();
  if (!msg || msg.includes(GENERIC_EDGE_ERROR)) return BOOKING_FALLBACK;
  const hit = BOOKING_MESSAGES.find((m) => msg.includes(m.match));
  return hit ? hit.message : BOOKING_FALLBACK;
}

/**
 * One call for the common shape: unwrap a supabase-js error, then translate it.
 * Use at the `supabase.functions.invoke` boundary so the thrown Error already
 * carries the real code for callers that want to branch on it.
 */
export async function edgeErrorText(error: unknown): Promise<string> {
  const real = await extractEdgeFunctionError(error);
  if (real) return real;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message;
}
