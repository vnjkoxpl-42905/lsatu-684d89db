import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { defaultRailPrefs, migrateLegacyRailPrefs, normalizeRailPrefs, projectReviewRailPrefs, type RailPrefs } from "@/lib/railCatalog";

const RAIL_PREFS_KEY = "classroom_rail_v2";
type ProfileLayout = { class_id: string; layout_prefs: Json | null };

function layoutObject(raw: Json | null): Record<string, Json> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function storedRailPrefs(layout: Record<string, Json>): RailPrefs {
  return layout[RAIL_PREFS_KEY] ? normalizeRailPrefs(layout[RAIL_PREFS_KEY]) : migrateLegacyRailPrefs(layout.classroom_rail);
}

async function requireLayoutOwner(ownerId: string): Promise<void> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user || user.id !== ownerId) throw new Error("Your account changed. Sign in to the sidebar layout owner before trying again.");
}

async function readLayout(ownerId: string): Promise<ProfileLayout> {
  await requireLayoutOwner(ownerId);
  const { data, error } = await supabase.from("profiles").select("class_id, layout_prefs")
    .eq("class_id", ownerId).maybeSingle();
  if (error) throw error;
  await requireLayoutOwner(ownerId);
  if (!data || data.class_id !== ownerId) throw new Error("Your saved sidebar layout could not be verified.");
  return data;
}

async function writeLayout(ownerId: string, before: ProfileLayout, next: RailPrefs): Promise<RailPrefs> {
  const normalized = normalizeRailPrefs(next);
  const payload = { ...layoutObject(before.layout_prefs), [RAIL_PREFS_KEY]: normalized } as unknown as Json;
  // Match the entire previous layout so a second device cannot silently lose
  // unrelated settings changed between this read and write.
  await requireLayoutOwner(ownerId);
  const update = supabase.from("profiles").update({ layout_prefs: payload }).eq("class_id", ownerId);
  const guarded = before.layout_prefs === null
    ? update.is("layout_prefs", null)
    : update.filter("layout_prefs", "eq", JSON.stringify(before.layout_prefs));
  const { data, error } = await guarded.select("class_id, layout_prefs").maybeSingle();
  if (error) throw error;
  if (!data || data.class_id !== ownerId || !layoutObject(data.layout_prefs)[RAIL_PREFS_KEY] ||
      JSON.stringify(normalizeRailPrefs(layoutObject(data.layout_prefs)[RAIL_PREFS_KEY])) !== JSON.stringify(normalized)) {
    throw new Error("Your sidebar layout was not acknowledged. Reload it and try again.");
  }
  await requireLayoutOwner(ownerId);
  return normalized;
}

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
      const row = await readLayout(userId!);
      const raw = layoutObject(row.layout_prefs);
      return storedRailPrefs(raw);
    },
  });
  const save = useMutation({
    mutationFn: async ({ ownerId, next, base }: { ownerId: string; next: RailPrefs; base: RailPrefs }) => {
      const row = await readLayout(ownerId);
      // `next` was built from the layout on screen. If another device saved
      // since, writing it would silently undo that newer choice; refuse, and
      // onError reloads what is actually stored.
      const stored = storedRailPrefs(layoutObject(row.layout_prefs));
      if (JSON.stringify(stored) !== JSON.stringify(normalizeRailPrefs(base))) {
        throw new Error("Your sidebar layout changed on another device. Review it and try again.");
      }
      return writeLayout(ownerId, row, projectReviewRailPrefs(next));
    },
    onSuccess: (acknowledged, { ownerId }) => qc.setQueryData(["rail-prefs", ownerId], acknowledged),
    onError: (_error, { ownerId }) => {
      void qc.invalidateQueries({ queryKey: ["rail-prefs", ownerId] });
    },
  });
  const prefs = useMemo(() => query.data ?? defaultRailPrefs(), [query.data]);
  const canSave = !!userId && query.isSuccess && !query.isFetching && !save.isPending;
  return {
    prefs,
    projectedPrefs: useMemo(() => projectReviewRailPrefs(prefs), [prefs]),
    ownerId: userId,
    loading: !!userId && query.isPending,
    error: query.error,
    retry: query.refetch,
    canSave,
    save: async (next: RailPrefs) => {
      if (!canSave || !userId) throw new Error("Load your saved sidebar layout before editing it.");
      return save.mutateAsync({ ownerId: userId, next, base: prefs });
    },
    saving: save.isPending,
  };
}
