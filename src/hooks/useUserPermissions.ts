import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { authUrlWithReturnTo } from "@/lib/authRedirect";
import { CONFIGURABLE_FLAG_KEYS, withDerivedAccess } from "@/lib/adminUsers";

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
function isSessionDeadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const details = err as { status?: unknown; message?: unknown };
  if (details.status === 401) return true;
  const msg = String(details.message || "").toLowerCase();
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

// Thrown when the signed-in student's profile is stamped archived. An archived
// account keeps every record, but it may not be inside the app: the session is
// ended immediately rather than left running with all doors shut.
class AccountArchivedError extends Error {}

// One realtime channel per signed-in user, shared by every mounted consumer.
// An UPDATE to the student's own profiles row (an admin flipping a flag)
// invalidates the cached permissions, so a revoke takes effect on the next
// render rather than when the stale window runs out. RLS scopes the stream to
// the student's own row; profiles is in the supabase_realtime publication
// (migration 20260922120000).
type WatchListener = (row: Record<string, unknown> | null) => void;
type ProfileWatch = { channel: ReturnType<typeof supabase.channel>; listeners: Set<WatchListener> };
const profileWatches = new Map<string, ProfileWatch>();

function acquireProfileWatch(userId: string, onChange: WatchListener): WatchListener {
  let watch = profileWatches.get(userId);
  if (!watch) {
    const listeners = new Set<WatchListener>();
    const channel = supabase
      .channel(`profile-access-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `class_id=eq.${userId}` },
        (payload) => {
          const row = (payload?.new ?? null) as Record<string, unknown> | null;
          listeners.forEach((fn) => fn(row));
        },
      )
      .subscribe();
    watch = { channel, listeners };
    profileWatches.set(userId, watch);
  }
  watch.listeners.add(onChange);
  return onChange;
}

function releaseProfileWatch(userId: string, listener: WatchListener) {
  const watch = profileWatches.get(userId);
  if (!watch) return;
  watch.listeners.delete(listener);
  if (watch.listeners.size === 0) {
    profileWatches.delete(userId);
    void supabase.removeChannel(watch.channel);
  }
}

export function useUserPermissions(): UserPermissions {
  const { user, authReady, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const userId = user?.id;

  // The hook mounts once per ProtectedRoute, so the subscription is guarded by
  // a single shared channel per user: the first mount opens it, the last unmount
  // closes it. Without this, every gated page would hold its own socket.
  useEffect(() => {
    if (!authReady || !userId) return;
    const entry = acquireProfileWatch(userId, (row) => {
      // Ignore self-caused / unrelated row updates (e.g. presence heartbeats
      // writing last_seen_at). Only an actual access-flag change needs a
      // refetch; otherwise every heartbeat would re-trigger the permissions
      // query, which used to feed a fetch -> write -> event -> fetch loop.
      if (row) {
        const cached = queryClient.getQueryData<PermissionFlags>(["user-permissions", userId]);
        if (cached) {
          const archivedNow = "archived_at" in row && !!row.archived_at;
          const changed = CONFIGURABLE_FLAG_KEYS.some(
            (flag) => flag in row && !!row[flag] !== !!cached[flag],
          );
          if (!changed && !archivedNow) return;
        }
      }
      void queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
    });
    return () => releaseProfileWatch(userId, entry);
  }, [authReady, userId, queryClient]);

  const query = useQuery<PermissionFlags>({
    // Cached per user, shared across all ProtectedRoute / consumer mounts, so
    // navigating between gated pages reads cached permissions synchronously
    // instead of re-fetching (and re-showing the full-screen loading gate).
    queryKey: ["user-permissions", userId],
    enabled: authReady && !!user,
    // Realtime (below) is the primary path for a revoke to land; the short
    // stale window and the focus refetch are the fallback when the socket is
    // down, so "Revoke All Access" is never more than a tab switch away from
    // taking effect. Cached data keeps `loading` false, so neither flashes.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    // Retry transient failures a couple times, but never retry a dead session
    // (that path signs the user out).
    retry: (count, err) =>
      !(err instanceof SessionExpiredError) && !(err instanceof AccountArchivedError) && count < 2,
    queryFn: async () => {
      const userId = user!.id;

      // Pre-check: is the session still alive on the client?
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new SessionExpiredError();

      // Fetch access flags from profile
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select([...ACCESS_FLAGS, "archived_at"].join(", "))
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

      const profileRow = (profile ?? null) as unknown as Record<string, unknown> | null;
      // Archived: no flags, no app. Sign them out on the spot.
      if (profileRow?.archived_at) throw new AccountArchivedError();

      const flagValues = { ...DEFAULT_PERMISSIONS };
      for (const flag of ACCESS_FLAGS) {
        flagValues[flag] = Boolean(profileRow?.[flag]);
      }
      Object.assign(flagValues, withDerivedAccess(flagValues));
      flagValues.is_admin = !!roleData;

      // Presence is owned by usePresenceHeartbeat; this read stays read-only.
      // Writing last_seen_at here produced a write per permissions fetch and
      // (with profiles in the realtime publication) a self-sustaining
      // fetch -> write -> event -> fetch loop.



      return flagValues;
    },
  });

  // A dead session bounces to /auth once. Preserve lsatu_saved_email so
  // re-login is smooth after an expiry bounce, and carry where they were: a
  // bare "/auth" discarded the pathname, query, and hash, so a student whose
  // token expired on an assignment link lost the link as well as the session.
  useEffect(() => {
    if (query.error instanceof AccountArchivedError) {
      (async () => {
        await signOut({ keepSavedEmail: true });
        navigate("/auth", { replace: true, state: { reason: "account_archived" } });
      })();
    } else if (query.error instanceof SessionExpiredError) {
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
