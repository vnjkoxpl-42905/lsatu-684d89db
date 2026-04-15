import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPermissions {
  has_bootcamp_access: boolean;
  has_classroom_access: boolean;
  has_analytics_access: boolean;
  has_schedule_access: boolean;
  is_admin: boolean;
  loading: boolean;
}

export function useUserPermissions(): UserPermissions {
  const { user, authReady } = useAuth();
  const [permissions, setPermissions] = useState<Omit<UserPermissions, "loading">>({
    has_bootcamp_access: false,
    has_classroom_access: false,
    has_analytics_access: false,
    has_schedule_access: false,
    is_admin: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      try {
        // Fetch access flags from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_bootcamp_access, has_classroom_access, has_analytics_access, has_schedule_access")
          .eq("class_id", user.id)
          .maybeSingle();

        // Fetch admin role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setPermissions({
          has_bootcamp_access: profile?.has_bootcamp_access ?? false,
          has_classroom_access: profile?.has_classroom_access ?? false,
          has_analytics_access: profile?.has_analytics_access ?? false,
          has_schedule_access: profile?.has_schedule_access ?? false,
          is_admin: !!roleData,
        });
      } catch (e) {
        console.error("Failed to fetch permissions", e);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user, authReady]);

  return { ...permissions, loading };
}
