import { useEffect, useState } from "react";
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
] as const;

export type PermissionFlag = (typeof ACCESS_FLAGS)[number];

export function useUserPermissions(): UserPermissions {
  const { user, authReady } = useAuth();
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
    is_admin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPerms = async () => {
      try {
        // Fetch access flags from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select(ACCESS_FLAGS.join(", "))
          .eq("class_id", user.id)
          .maybeSingle();

        // Fetch admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

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
      } finally {
        setLoading(false);
      }
    };

    fetchPerms();
  }, [user, authReady]);

  return { ...permissions, loading };
}
