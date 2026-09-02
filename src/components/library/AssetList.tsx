import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useTeachingAssets,
  useDeleteTeachingAsset,
  type AssetType,
  type TeachingAsset,
} from "@/hooks/useTeachingAssets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AssetEditDialog from "./AssetEditDialog";

interface Props {
  search: string;
  typeFilter: AssetType | null;
}

function typeBadge(type: AssetType) {
  const map: Record<AssetType, string> = {
    pdf: "bg-red-500/15 text-red-300",
    document: "bg-blue-500/15 text-blue-300",
    question_set: "bg-emerald-500/15 text-emerald-300",
    drill: "bg-purple-500/15 text-purple-300",
    curriculum: "bg-amber-500/15 text-amber-300",
    notes: "bg-zinc-500/15 text-zinc-300",
  };
  return map[type] ?? "bg-zinc-500/15 text-zinc-300";
}

export default function AssetList({ search, typeFilter }: Props) {
  const { data, isLoading, error } = useTeachingAssets(search, typeFilter);
  const del = useDeleteTeachingAsset();

  const [editTarget, setEditTarget] = useState<TeachingAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeachingAsset | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await del.mutateAsync({
        id: deleteTarget.id,
        file_path: deleteTarget.file_path,
      });
      toast.success("Deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-12 text-center text-red-400">
        Failed to load library.
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-zinc-500">
        {search || typeFilter
          ? "No matching assets."
          : "No assets yet. Click Upload to add one."}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border border-zinc-800 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/50 text-zinc-400">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Title</th>
              <th className="text-left font-medium px-4 py-2.5">Type</th>
              <th className="text-left font-medium px-4 py-2.5">Updated</th>
              <th className="text-right font-medium px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {data.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-900/30">
                <td className="px-4 py-2.5">
                  <div className="text-zinc-100">{a.title}</div>
                  {a.description && (
                    <div className="text-xs text-zinc-500 line-clamp-1">
                      {a.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Badge className={typeBadge(a.asset_type)} variant="secondary">
                    {a.asset_type.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-zinc-400">
                  {formatDistanceToNow(new Date(a.updated_at), {
                    addSuffix: true,
                  })}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="inline-flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditTarget(a)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => setDeleteTarget(a)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AssetEditDialog
        asset={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !del.isPending && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes "{deleteTarget?.title}" and its uploaded file. This can't
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={del.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
