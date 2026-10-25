import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  defaultLayout,
  detectPreset,
  type LayoutPrefs,
} from "@/lib/layoutPresets";

function mergeWithDefault(raw: unknown): LayoutPrefs {
  const def = defaultLayout();
  if (!raw || typeof raw !== "object") return def;
  const r = raw as Partial<LayoutPrefs>;
  const merged: LayoutPrefs = {
    preset: r.preset ?? "default",
    orbital: Array.isArray(r.orbital) ? r.orbital : def.orbital,
    dock: Array.isArray(r.dock) ? r.dock : def.dock,
    sidebar: Array.isArray(r.sidebar) ? r.sidebar : def.sidebar,
  };
  merged.preset = detectPreset(merged);
  return merged;
}

export function useLayoutPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["layout-prefs", userId],
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<LayoutPrefs> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("layout_prefs")
        .eq("class_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return mergeWithDefault((data as { layout_prefs?: unknown } | null)?.layout_prefs);
    },
  });

  const save = useMutation({
    mutationFn: async (next: LayoutPrefs) => {
      if (!userId) throw new Error("No user");
      const payload: LayoutPrefs = { ...next, preset: detectPreset(next) };
      const { error } = await (supabase as unknown as { from: (t: string) => { update: (v: unknown) => { eq: (k: string, v: string) => Promise<{ error: Error | null }> } } })
        .from("profiles")
        .update({ layout_prefs: payload })
        .eq("class_id", userId);
      if (error) throw error;
      return payload;
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["layout-prefs", userId] });
      const prev = qc.getQueryData<LayoutPrefs>(["layout-prefs", userId]);
      qc.setQueryData(["layout-prefs", userId], { ...next, preset: detectPreset(next) });
      return { prev };
    },
    onError: (_err, _next, ctx) => {
      if (ctx?.prev) qc.setQueryData(["layout-prefs", userId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["layout-prefs", userId] });
    },
  });

  const prefs = useMemo<LayoutPrefs>(
    () => query.data ?? defaultLayout(),
    [query.data],
  );

  return {
    prefs,
    loading: query.isLoading,
    save: save.mutateAsync,
    saving: save.isPending,
  };
}
