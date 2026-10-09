import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useUpdateTeachingAsset,
  type AssetType,
  type TeachingAsset,
} from "@/hooks/useTeachingAssets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "document", label: "Document" },
  { value: "question_set", label: "Question set" },
  { value: "drill", label: "Drill" },
  { value: "curriculum", label: "Curriculum" },
  { value: "notes", label: "Notes" },
];

interface Props {
  asset: TeachingAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function tagsFromMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "";
  const tags = (metadata as { tags?: unknown }).tags;
  if (!Array.isArray(tags)) return "";
  return tags.filter((t) => typeof t === "string").join(", ");
}

export default function AssetEditDialog({ asset, open, onOpenChange }: Props) {
  const update = useUpdateTeachingAsset();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("pdf");
  const [tagsRaw, setTagsRaw] = useState("");

  useEffect(() => {
    if (!asset) return;
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setAssetType(asset.asset_type);
    setTagsRaw(tagsFromMetadata(asset.metadata));
  }, [asset]);

  const handleSave = async () => {
    if (!asset) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const metadata = { ...(asset.metadata ?? {}), tags };
    try {
      await update.mutateAsync({
        id: asset.id,
        title: title.trim(),
        description: description.trim() || null,
        asset_type: assetType,
        metadata,
      });
      toast.success("Saved");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (update.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Type</label>
              <Select
                value={assetType}
                onValueChange={(v) => setAssetType(v as AssetType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Tags (comma)</label>
              <Input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={update.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
