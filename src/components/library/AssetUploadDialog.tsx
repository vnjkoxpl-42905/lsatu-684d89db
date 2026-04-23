import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { extractPdfText } from "@/lib/pdfExtract";
import type { AssetType } from "@/hooks/useTeachingAssets";
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

// Cap single-upload file size at 25MB. PDFs with more than this tend to stall
// the client-side text extractor and push content_text past the 200KB cap.
const MAX_FILE_BYTES = 25 * 1024 * 1024;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AssetUploadDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("pdf");
  const [tagsRaw, setTagsRaw] = useState("");

  const reset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setAssetType("pdf");
    setTagsRaw("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = (picked: File | null) => {
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      toast.error(`File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(picked);
    if (!title) setTitle(picked.name.replace(/\.[^.]+$/, ""));
    if (picked.type === "application/pdf") setAssetType("pdf");
    else if (picked.name.endsWith(".md") || picked.name.endsWith(".txt"))
      setAssetType("notes");
  };

  const upload = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!title.trim()) throw new Error("Title is required");

      // 1. Extract text (if a file is attached).
      let contentText = "";
      if (file) {
        if (file.type === "application/pdf") {
          contentText = await extractPdfText(file);
        } else {
          contentText = (await file.text()).slice(0, 200_000);
        }
      }

      const metadata: Record<string, unknown> = {};
      const tags = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length) metadata.tags = tags;

      // 2. Insert row first to get the asset_id.
      const { data: inserted, error: insertError } = await (supabase as any)
        .from("teaching_assets")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          asset_type: assetType,
          content_text: contentText || null,
          metadata,
          created_by: user.id,
          file_path: null,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      const assetId = inserted.id as string;

      // 3. Upload file to storage (if present) and update the row with path.
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${assetId}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("teaching-assets")
          .upload(path, file, { upsert: false });
        if (uploadError) {
          // Roll back the row so we never have a dangling asset.
          await (supabase as any).from("teaching_assets").delete().eq("id", assetId);
          throw uploadError;
        }
        const { error: updateError } = await (supabase as any)
          .from("teaching_assets")
          .update({ file_path: path })
          .eq("id", assetId);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success("Asset uploaded");
      qc.invalidateQueries({ queryKey: ["teaching-assets"] });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (upload.isPending) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload teaching asset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
            />
            {file && (
              <p className="text-xs text-zinc-500">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. LR Strengthen guide"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short summary to help search"
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
                placeholder="LR, strengthen, causal"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={upload.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => upload.mutate()}
            disabled={upload.isPending || !title.trim()}
          >
            {upload.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
