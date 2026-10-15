import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve with the current Supabase session's access token, waiting briefly
 * for auth hydration if the session isn't loaded yet.
 *
 * Callers (edge-function fetchers for gdrive/gmail/etc.) that fire on mount
 * can race the initial `supabase.auth.getSession()` hydration. Firing without
 * a token sends `Authorization: Bearer ` with an empty token, and the edge
 * function's `requireAdmin` returns 401. This helper avoids that race by
 * subscribing to the next auth change if the session isn't ready yet.
 */
export async function waitForAccessToken(timeoutMs = 4000): Promise<string | null> {
  const first = (await supabase.auth.getSession()).data.session?.access_token;
  if (first) return first;

  return new Promise((resolve) => {
    let done = false;
    const finish = (token: string | null) => {
      if (done) return;
      done = true;
      sub.data.subscription.unsubscribe();
      clearTimeout(timer);
      resolve(token);
    };
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) finish(session.access_token);
    });
    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}
