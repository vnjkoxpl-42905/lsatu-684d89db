import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  defaultRailPrefs,
  normalizeRailPrefs,
  type RailPrefs,
} from "@/lib/railCatalog";

// Rail prefs live under layout_prefs.classroom_rail in the profiles row. The
// legacy orbital/dock/sidebar keys in the same jsonb are dead (the Foyer they
// customized no longer exists) and are preserved untouched on write.

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
      const raw = (data as { layout_prefs?: Record<string, unknown> } | null)
        ?.layout_prefs;
      return normalizeRailPrefs(raw?.classroom_rail);
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
      const payload = { ...existing, classroom_rail: next };
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
