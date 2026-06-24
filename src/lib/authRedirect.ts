import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function getSafeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("returnTo");
  if (!returnTo) return null;
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return null;
  return returnTo;
}

/**
 * Single source of truth for "where does a freshly authenticated user land?"
 *
 * Reads profiles.display_name; routes to /onboarding if blank, /mainhub
 * otherwise. Used by Auth.tsx (both the post-signin handler and the
 * user-watcher useEffect) and ResetPassword.tsx so the three paths can't
 * drift.
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

  // Default landing is the homepage. Feature access is gated per-flag on
  // profiles (locked by default), so new signups land on /mainhub and see
  // LockedModule on anything an admin hasn't enabled yet.
  navigate("/mainhub", { replace: options?.replace ?? false });
}
