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
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("class_id", userId)
    .maybeSingle();

  const target = profile?.display_name ? "/mainhub" : "/onboarding";
  navigate(target, { replace: options?.replace ?? false });
}
