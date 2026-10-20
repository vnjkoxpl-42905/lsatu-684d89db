import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Single source of truth for resolving the current user's `class_id`.
 *
 * Pattern: look up the `students` row keyed by `user_id` and return its
 * `class_id`. If no row exists (auth trigger miss, new signup race), fall
 * back to `user.id` so writes never silently drop. The auth-provisioner
 * invariant is `class_id = user.id` today, which makes the fallback safe.
 *
 * Replaces 4 divergent inline implementations (Drill, Profile, Home,
 * RecentPerformanceWidget) — F1.10.
 */
export interface UseClassIdResult {
  /** Empty string while loading; never null. */
  classId: string;
  loading: boolean;
  error: string | null;
}

export function useClassId(): UseClassIdResult {
  const { user, authReady } = useAuth();
  const [state, setState] = useState<UseClassIdResult>({
    classId: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setState({ classId: "", loading: false, error: null });
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: student, error } = await supabase
        .from("students")
        .select("class_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.warn("[useClassId] students lookup failed", {
          userId: user.id,
          email: user.email,
          error: error.message,
        });
        setState({ classId: user.id, loading: false, error: error.message });
        return;
      }

      if (!student?.class_id) {
        console.warn(
          "[useClassId] no students row for user; falling back to user.id",
          { userId: user.id, email: user.email },
        );
        setState({ classId: user.id, loading: false, error: null });
        return;
      }

      setState({ classId: student.class_id, loading: false, error: null });
    })();

    return () => {
      cancelled = true;
    };
    // email is only read for diagnostic console.warn; id change implies email change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authReady]);

  return state;
}
