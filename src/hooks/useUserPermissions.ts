import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPermissions {
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
  has_practice_access: boolean;
  has_drill_access: boolean;
  has_waj_access: boolean;
  has_flagged_access: boolean;
  has_chat_access: boolean;
  has_export_access: boolean;
  has_ta_access: boolean;
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
  "has_flagged_access",
  "has_chat_access",
  "has_export_access",
  "has_ta_access",
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

export function useUserPermissions(): UserPermissions {
  const { user, authReady, signOut } = useAuth();
  const navigate = useNavigate();
  const [permissions, setPermissions] = useState<Omit<UserPermissions, "loading">>({
    has_bootcamp_access: false,
    has_classroom_access: false,
    has_analytics_access: false,
    has_schedule_access: false,
    has_practice_access: false,
    has_drill_access: false,
    has_waj_access: false,
    has_flagged_access: false,
    has_chat_access: false,
    has_export_access: false,
    has_ta_access: false,
    is_admin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }

    // Preserve lsatu_saved_email so re-login is smooth after an expiry bounce.
    const bounceExpired = async () => {
      await signOut({ keepSavedEmail: true });
      navigate("/auth", { replace: true, state: { reason: "session_expired" } });
    };

    const fetchPerms = async () => {
      try {
        // Pre-check: is the session still alive on the client?
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          await bounceExpired();
          return;
        }

        // Fetch access flags from profile
        const { data: profile, error: profileErr } = await supabase
          .from("profiles")
          .select(ACCESS_FLAGS.join(", "))
          .eq("class_id", user.id)
          .maybeSingle();
        if (isSessionDeadError(profileErr)) {
          await bounceExpired();
          return;
        }

        // Fetch admin role
        const { data: roleData, error: roleErr } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (isSessionDeadError(roleErr)) {
          await bounceExpired();
          return;
        }

        const flagValues: any = {};
        for (const flag of ACCESS_FLAGS) {
          flagValues[flag] = profile?.[flag] ?? false;
        }

        setPermissions({
          ...flagValues,
          is_admin: !!roleData,
        });

        // Touch last_seen_at (fire-and-forget)
        supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() } as any)
          .eq("class_id", user.id)
          .then();
      } catch (e) {
        console.error("Failed to fetch permissions", e);
        if (isSessionDeadError(e)) {
          await bounceExpired();
          return;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPerms();
  }, [user, authReady, signOut, navigate]);

  return { ...permissions, loading };
}
