import type { NavigateFunction } from "react-router-dom";

function getSafeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  // Accept both `returnTo` (legacy) and `next` (used by the OAuth consent flow).
  const returnTo = params.get("returnTo") ?? params.get("next");
  if (!returnTo) return null;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null;
  return returnTo;
}


/**
 * Single source of truth for "where does a freshly authenticated user land?"
 *
 * Everyone lands on /classroom, including a brand-new signup with no profile
 * row at all. Onboarding is no longer a redirect: the intake lives in the
 * classroom's orientation card, which a student has to open and click through
 * themselves (see OrientationCard). Used by Auth.tsx (both the post-signin
 * handler and the user-watcher useEffect) and ResetPassword.tsx so the three
 * paths can't drift.
 */
export async function redirectAfterAuth(
  _userId: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
): Promise<void> {
  const returnTo = getSafeReturnTo();
  if (returnTo) {
    navigate(returnTo, { replace: options?.replace ?? false });
    return;
  }

  // Feature access is gated per-flag on profiles (locked by default), so
  // everyone lands on /classroom and hits the ProtectedRoute fallback on
  // anything an admin hasn't enabled yet.
  navigate("/classroom", { replace: options?.replace ?? false });
}
