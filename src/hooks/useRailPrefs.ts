import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import {
  defaultRailPrefs,
  migrateLegacyRailPrefs,
  normalizeRailPrefs,
  type RailPrefs,
} from "@/lib/railCatalog";

// The v2 key distinguishes the seven-destination rail from the old multi-group
// rail. Preserve the old key and unrelated layout settings during migration.
const RAIL_PREFS_KEY = "classroom_rail_v2";

export function useRailPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["rail-prefs", userId],
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<RailPrefs> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("layout_prefs")
        .eq("class_id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaultRailPrefs();
      const raw = (data as { layout_prefs?: Record<string, unknown> } | null)
        ?.layout_prefs ?? {};
      if (raw[RAIL_PREFS_KEY]) return normalizeRailPrefs(raw[RAIL_PREFS_KEY]);
      const migrated = migrateLegacyRailPrefs(raw.classroom_rail);
      const { error: migrationError } = await supabase
        .from("profiles")
        .update({ layout_prefs: { ...raw, [RAIL_PREFS_KEY]: migrated } as unknown as Json })
        .eq("class_id", userId!);
      if (migrationError) throw migrationError;
      return migrated;
    },
  });

  const save = useMutation({
    mutationFn: async (next: RailPrefs) => {
      if (!userId) throw new Error("No user");
      // Read-modify-write so the legacy layout_prefs keys survive.
      const { data, error: readError } = await supabase
        .from("profiles")
        .select("layout_prefs")
        .eq("class_id", userId)
        .maybeSingle();
      if (readError) throw readError;
      const existing =
        (data as { layout_prefs?: Record<string, unknown> } | null)
          ?.layout_prefs ?? {};
      const payload = { ...existing, [RAIL_PREFS_KEY]: normalizeRailPrefs(next) };
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          update: (v: unknown) => {
            eq: (k: string, v: string) => Promise<{ error: Error | null }>;
          };
        };
      })
        .from("profiles")
        .update({ layout_prefs: payload })
        .eq("class_id", userId);
      if (error) throw error;
      return next;
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["rail-prefs", userId] });
      const prev = qc.getQueryData<RailPrefs>(["rail-prefs", userId]);
      qc.setQueryData(["rail-prefs", userId], next);
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(["rail-prefs", userId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["rail-prefs", userId] });
    },
  });

  const prefs = useMemo<RailPrefs>(
    () => query.data ?? defaultRailPrefs(),
    [query.data],
  );

  return {
    prefs,
    loading: query.isLoading,
    save: save.mutateAsync,
    saving: save.isPending,
  };
}
