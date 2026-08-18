import type { NavigateFunction } from "react-router-dom";

/**
 * Where a freshly authenticated user lands, and the validation that decides it.
 *
 * One module owns this so the three arrival paths — password sign-in, the Google
 * OAuth return leg, and the session-expiry bounce — cannot drift. Everyone lands
 * on /classroom unless a *validated* target says otherwise.
 */

export const DEFAULT_POST_AUTH_TARGET = "/classroom";

/** Where an OAuth departure parks its target, since a ref cannot survive the round trip. */
const STASH_KEY = "lsatu_post_auth_target";
const STASH_TS_KEY = "lsatu_post_auth_target_ts";

/**
 * A stashed target older than this is a leftover from an abandoned attempt — the
 * user opened the tab, wandered off, and came back. Following it would teleport
 * them somewhere they no longer expect, so it is discarded instead.
 */
export const STASH_MAX_AGE_MS = 10 * 60_000;

/**
 * Validate a redirect target by parsing it, not by matching strings.
 *
 * The previous string checks (`startsWith("/")` and `!startsWith("//")`) let
 * `/\evil.com` through: the WHATWG parser treats a backslash as a slash for
 * http(s), so that string resolves to a different origin entirely. Parsing and
 * comparing origins closes that, and every other scheme-based variant
 * (`javascript:`, `https://evil.com`, protocol-relative) with it.
 *
 * `/auth` is rejected as a target so a bounce can never loop back onto the page
 * doing the bouncing.
 */
export function parseSafeReturnTo(raw: string | null | undefined): string | null {
  if (!raw || typeof window === "undefined") return null;

  let url: URL;
  try {
    url = new URL(raw, window.location.origin);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;
  if (url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return null;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** Reads `?returnTo=` (legacy) or `?next=` (OAuth consent flow) off the current URL. */
export function readReturnToFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return parseSafeReturnTo(params.get("returnTo") ?? params.get("next"));
}

/**
 * Park a validated target before leaving the page — the OAuth departure leg.
 * Passing a null/invalid target clears any previous stash rather than keeping a
 * stale one alive.
 */
export function stashReturnTo(raw: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const target = parseSafeReturnTo(raw);
  if (!target) {
    clearStashedReturnTo();
    return;
  }
  try {
    sessionStorage.setItem(STASH_KEY, target);
    sessionStorage.setItem(STASH_TS_KEY, String(Date.now()));
  } catch {
    // Private mode / storage disabled: the deep link is lost, the sign-in is not.
  }
}

export function clearStashedReturnTo(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STASH_KEY);
    sessionStorage.removeItem(STASH_TS_KEY);
  } catch {
    /* ignore */
  }
}

/** Reads and removes the stashed target. Always consumed, even when stale. */
export function consumeStashedReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  let ts = 0;
  try {
    raw = sessionStorage.getItem(STASH_KEY);
    ts = Number(sessionStorage.getItem(STASH_TS_KEY) ?? 0);
  } catch {
    return null;
  }
  clearStashedReturnTo();
  if (!raw) return null;
  if (!ts || Date.now() - ts > STASH_MAX_AGE_MS) return null;
  return parseSafeReturnTo(raw);
}

/**
 * The target for this arrival. The URL wins when it carries one (password
 * sign-in, the expiry bounce); the stash covers the OAuth round trip, which
 * comes back with no query of its own.
 */
export function resolvePostAuthTarget(): string {
  const fromUrl = readReturnToFromUrl();
  if (fromUrl) {
    clearStashedReturnTo();
    return fromUrl;
  }
  return consumeStashedReturnTo() ?? DEFAULT_POST_AUTH_TARGET;
}

/**
 * Build the /auth URL that preserves where the user was trying to go.
 * Used by ProtectedRoute and by the session-expiry bounce.
 */
export function authUrlWithReturnTo(target: string | null | undefined): string {
  const safe = parseSafeReturnTo(target);
  return safe ? `/auth?returnTo=${encodeURIComponent(safe)}` : "/auth";
}

/**
 * Navigate a freshly authenticated user to where they belong.
 *
 * `replace` defaults to **true**: this always runs while sitting on /auth, and
 * pushing left the sign-in page in history, one Back press behind a signed-in
 * user — which then re-redirected them forward. Feature access is gated
 * per-flag on `profiles` (locked by default), so an unentitled target still
 * lands on ProtectedRoute's locked state rather than being second-guessed here.
 */
export async function redirectAfterAuth(
  _userId: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
): Promise<void> {
  navigate(resolvePostAuthTarget(), { replace: options?.replace ?? true });
}
