import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
 * Reads profiles.onboarding_completed_at; routes to /onboarding if null,
 * /mainhub otherwise. The gate is set once (explicit Skip or Finish in the
 * onboarding flow) and never re-shown after that; closing the tab mid-flow
 * leaves it null so the user resumes onboarding on next entry. Name capture is
 * step 0 of the same flow, so a null gate covers both "no name" and "not yet
 * onboarded". Used by Auth.tsx (both the post-signin handler and the
 * user-watcher useEffect) and ResetPassword.tsx so the three paths can't drift.
 */
export async function redirectAfterAuth(
  userId: string,
  navigate: NavigateFunction,
  options?: { replace?: boolean },
): Promise<void> {
  const returnTo = getSafeReturnTo();
  if (returnTo) {
    navigate(returnTo, { replace: options?.replace ?? false });
    return;
  }

  // Onboarding gate: route through the intake flow when it hasn't been
  // completed. The profile row is created lazily (the onboarding flow's first
  // save), so a fresh signup has NO row yet — treat "no row" the same as
  // "row with null onboarding_completed_at": both mean not-yet-onboarded.
  // Only a row with a set timestamp lands on /mainhub. A failed lookup must
  // not trap the user; on error we fall through to /mainhub (fail-open).
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("class_id", userId)
      .maybeSingle();

    if (!error && !data?.onboarding_completed_at) {
      navigate("/onboarding", { replace: options?.replace ?? false });
      return;
    }
  } catch {
    // fall through to the default landing
  }

  // Default landing is the homepage. Feature access is gated per-flag on
  // profiles (locked by default), so onboarded users land on /mainhub and see
  // LockedModule on anything an admin hasn't enabled yet.
  navigate("/mainhub", { replace: options?.replace ?? false });
}
