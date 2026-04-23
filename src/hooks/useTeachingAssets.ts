import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AssetType =
  | "pdf"
  | "document"
  | "question_set"
  | "drill"
  | "curriculum"
  | "notes";

export interface TeachingAsset {
  id: string;
  title: string;
  description: string | null;
  asset_type: AssetType;
  content_text: string | null;
  file_path: string | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Cast until Lovable regenerates src/integrations/supabase/types.ts.
const assetsTable = () => (supabase as any).from("teaching_assets");

export function useTeachingAssets(search: string, typeFilter: AssetType | null) {
  return useQuery<TeachingAsset[]>({
    queryKey: ["teaching-assets", search, typeFilter],
    queryFn: async () => {
      let q = assetsTable()
        .select("*")
        .order("updated_at", { ascending: false });
      if (typeFilter) q = q.eq("asset_type", typeFilter);
      const trimmed = search.trim();
      if (trimmed) {
        const esc = trimmed.replace(/[%,]/g, " ");
        q = q.or(`title.ilike.%${esc}%,description.ilike.%${esc}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TeachingAsset[];
    },
  });
}

export function useDeleteTeachingAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (asset: Pick<TeachingAsset, "id" | "file_path">) => {
      if (asset.file_path) {
        const { error: storageError } = await supabase.storage
          .from("teaching-assets")
          .remove([asset.file_path]);
        if (storageError) throw storageError;
      }
      const { error } = await assetsTable().delete().eq("id", asset.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teaching-assets"] }),
  });
}

export interface AssetUpdateInput {
  id: string;
  title: string;
  description: string | null;
  asset_type: AssetType;
  metadata: Record<string, unknown>;
}

export function useUpdateTeachingAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssetUpdateInput) => {
      const { id, ...rest } = input;
      const { error } = await assetsTable().update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teaching-assets"] }),
  });
}
