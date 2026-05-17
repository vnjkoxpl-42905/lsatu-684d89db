import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  // Default landing is the homepage. Feature access is gated per-flag on
  // profiles (locked by default), so new signups land on /mainhub and see
  // LockedModule on anything an admin hasn't enabled yet.
  navigate("/mainhub", { replace: options?.replace ?? false });
}
