import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAttachment, type GmailAttachmentMeta } from "../api";

interface GmailAttachmentCardProps {
  messageId: string;
  attachment: GmailAttachmentMeta;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fileKindLabel(mimeType: string) {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("word") || mimeType.includes("document")) return "Document";
  return "File";
}

function base64ToObjectUrl(dataBase64: string, mimeType: string) {
  const bin = atob(dataBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType || "application/octet-stream" }));
}

export function GmailAttachmentCard({ messageId, attachment }: GmailAttachmentCardProps) {
  const isImage = attachment.mimeType.startsWith("image/");
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isImage);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    let nextUrl: string | null = null;
    setLoading(true);
    setLoadError(null);
    getAttachment(messageId, attachment.attachmentId)
      .then((data) => {
        if (cancelled) return;
        nextUrl = base64ToObjectUrl(data.dataBase64, attachment.mimeType);
        setObjectUrl(nextUrl);
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Could not load image");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [attachment.attachmentId, attachment.mimeType, isImage, messageId]);

  const meta = useMemo(
    () => `${formatBytes(attachment.size)} · ${fileKindLabel(attachment.mimeType)}`,
    [attachment.mimeType, attachment.size],
  );

  const openAttachment = async () => {
    if (objectUrl) {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const data = await getAttachment(messageId, attachment.attachmentId);
      const url = base64ToObjectUrl(data.dataBase64, attachment.mimeType);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open attachment");
    }
  };

  if (isImage) {
    return (
      <button
        type="button"
        onClick={openAttachment}
        className="block w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-background text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/20"
        title={`${attachment.filename} (${formatBytes(attachment.size)})`}
      >
        {loading ? (
          <div className="flex h-40 items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading image...
          </div>
        ) : objectUrl ? (
          <img
            src={objectUrl}
            alt={attachment.filename}
            className="block max-h-64 w-full object-contain bg-muted/30"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 px-4 text-center text-xs font-medium text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            {loadError ?? "Image preview unavailable"}
          </div>
        )}
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{attachment.filename}</span>
          <span className="shrink-0">· {meta}</span>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openAttachment}
      className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-background px-3.5 py-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-muted/20"
      title={`${attachment.filename} (${formatBytes(attachment.size)})`}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          attachment.mimeType === "application/pdf" ? "bg-red-50 text-red-600" : "bg-muted text-muted-foreground",
        )}
      >
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{attachment.filename}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
