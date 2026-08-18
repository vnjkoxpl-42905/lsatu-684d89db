import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { authUrlWithReturnTo } from "@/lib/authRedirect";

export interface UserPermissions {
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
  has_practice_access: boolean;
  has_drill_access: boolean;
  has_waj_access: boolean;
  has_journal_access: boolean;
  has_flagged_access: boolean;
  has_chat_access: boolean;
  has_export_access: boolean;
  has_ta_access: boolean;
  has_activity_access: boolean;
  is_admin: boolean;
  loading: boolean;
}

const ACCESS_FLAGS = [
  "has_bootcamp_access",
  "has_classroom_access",
  "has_analytics_access",
  "has_schedule_access",
  "has_practice_access",
  "has_drill_access",
  "has_waj_access",
  "has_journal_access",
  "has_flagged_access",
  "has_chat_access",
  "has_export_access",
  "has_ta_access",
  "has_activity_access",
] as const;

export type PermissionFlag = (typeof ACCESS_FLAGS)[number];

// Narrow session-death classifier. Only three conditions count:
//  1. supabase.auth.getSession() returns no session while context says user is set
//  2. Supabase query error with HTTP status 401
//  3. Error message mentioning JWT / token-expired / invalid_token explicitly
// Everything else (including RLS 403s and null profile rows) is legitimate
// permission-denied and must fall through to the normal LockedModule path.
function isSessionDeadError(err: any): boolean {
  if (!err) return false;
  if (err.status === 401) return true;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("jwt") ||
    msg.includes("token is expired") ||
    msg.includes("token expired") ||
    msg.includes("invalid_token")
  );
}

type PermissionFlags = Omit<UserPermissions, "loading">;

const DEFAULT_PERMISSIONS: PermissionFlags = {
  has_bootcamp_access: false,
  has_classroom_access: false,
  has_analytics_access: false,
  has_schedule_access: false,
  has_practice_access: false,
  has_drill_access: false,
  has_waj_access: false,
  has_journal_access: false,
  has_flagged_access: false,
  has_chat_access: false,
  has_export_access: false,
  has_ta_access: false,
  has_activity_access: false,
  is_admin: false,
};

// Sentinel thrown by the query fn when the session is dead. The hook reacts to
// it once (sign out + /auth bounce) instead of navigating from inside the
// queryFn, which may run detached from a render.
class SessionExpiredError extends Error {}

export function useUserPermissions(): UserPermissions {
  const { user, authReady, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const query = useQuery<PermissionFlags>({
    // Cached per user, shared across all ProtectedRoute / consumer mounts, so
    // navigating between gated pages reads cached permissions synchronously
    // instead of re-fetching (and re-showing the full-screen loading gate).
    queryKey: ["user-permissions", user?.id],
    enabled: authReady && !!user,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    // Retry transient failures a couple times, but never retry a dead session
    // (that path signs the user out).
    retry: (count, err) => !(err instanceof SessionExpiredError) && count < 2,
    queryFn: async () => {
      const userId = user!.id;

      // Pre-check: is the session still alive on the client?
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new SessionExpiredError();

      // Fetch access flags from profile
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select(ACCESS_FLAGS.join(", "))
        .eq("class_id", userId)
        .maybeSingle();
      if (isSessionDeadError(profileErr)) throw new SessionExpiredError();
      // A non-session read failure (transient network / 5xx) must NOT be
      // silently converted to all-false permissions; throw so TanStack Query
      // records the error and retries instead of caching bogus denied flags.
      if (profileErr) throw profileErr;

      // Fetch admin role
      const { data: roleData, error: roleErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (isSessionDeadError(roleErr)) throw new SessionExpiredError();
      if (roleErr) throw roleErr;

      const profileRow = (profile ?? null) as unknown as Record<string, boolean> | null;
      const flagValues = { ...DEFAULT_PERMISSIONS };
      for (const flag of ACCESS_FLAGS) {
        flagValues[flag] = profileRow?.[flag] ?? false;
      }
      flagValues.is_admin = !!roleData;

      // Touch last_seen_at (fire-and-forget). Non-blocking, but check the
      // returned error and warn rather than discarding it entirely.
      supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("class_id", userId)
        .then(({ error }) => {
          if (error) console.warn("[permissions] last_seen_at touch failed:", error.message);
        });

      return flagValues;
    },
  });

  // A dead session bounces to /auth once. Preserve lsatu_saved_email so
  // re-login is smooth after an expiry bounce, and carry where they were: a
  // bare "/auth" discarded the pathname, query, and hash, so a student whose
  // token expired on an assignment link lost the link as well as the session.
  useEffect(() => {
    if (query.error instanceof SessionExpiredError) {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      (async () => {
        await signOut({ keepSavedEmail: true });
        navigate(authUrlWithReturnTo(returnTo), {
          replace: true,
          state: { reason: "session_expired" },
        });
      })();
    } else if (query.error) {
      console.error("Failed to fetch permissions", query.error);
    }
    // `location` is intentionally not a dependency: this must capture where the
    // user was when the session died, not follow them as they navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.error, signOut, navigate]);

  return {
    ...DEFAULT_PERMISSIONS,
    ...(query.data ?? {}),
    // Only the true cold load (no cached data) blocks; cached reads and
    // background refetches keep loading false, so gated navigations don't flash.
    loading: authReady && !!user && query.isPending,
  };
}
