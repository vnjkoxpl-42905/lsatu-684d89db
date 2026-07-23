import { useEffect, useState } from 'react';
import { FileText, Download, Cloud, ExternalLink, Eye, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MessageAttachment } from '@/hooks/useInbox';
import { HELP_SCREENSHOT_FILE_NAME } from '@/lib/inboxAttachments';
import { cn } from '@/lib/utils';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileKindLabel(mimeType: string) {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
  if (mimeType.startsWith('text/')) return 'Text';
  return 'File';
}

function ImageAttachment({
  attachment,
  onPreview,
}: {
  attachment: MessageAttachment;
  onPreview?: (attachment: MessageAttachment) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!attachment.storage_path) return;
    let cancelled = false;
    supabase.storage
      .from('message-attachments')
      .createSignedUrl(attachment.storage_path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.storage_path]);

  const view = () => {
    if (onPreview) {
      onPreview(attachment);
      return;
    }
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const download = async () => {
    if (!attachment.storage_path) {
      toast.error('Attachment unavailable');
      return;
    }
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(attachment.storage_path, 60 * 60, { download: attachment.file_name });
    if (error || !data?.signedUrl) {
      toast.error('Could not download image');
      return;
    }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div
      className="group relative mt-2 block max-w-sm overflow-hidden rounded-2xl border border-[#decdb7] bg-[#fffaf1] text-left shadow-[0_12px_28px_rgba(86,61,32,0.10)] transition hover:border-[#a14f43]/45 hover:bg-white"
      title={attachment.file_name}
    >
      {/* Whole image is clickable = View, so touch devices (no hover) keep working. */}
      <button type="button" onClick={view} className="block w-full">
        {url ? (
          <img
            src={url}
            alt={attachment.file_name}
            className="block max-h-64 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center gap-2 px-3 py-3 text-xs font-semibold text-[#7a6b58]">
            <ImageIcon className="w-4 h-4" /> Loading {attachment.file_name}…
          </div>
        )}
      </button>

      {url ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end gap-2 bg-gradient-to-b from-black/45 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={view}
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#211b16] shadow-sm transition hover:bg-white"
          >
            <Eye className="h-3.5 w-3.5" /> View
          </button>
          <button
            type="button"
            onClick={download}
            className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#211b16] shadow-sm transition hover:bg-white"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      ) : null}

      {attachment.file_name !== HELP_SCREENSHOT_FILE_NAME ? (
        <div className="flex items-center gap-1.5 border-t border-[#eadfcf] px-3 py-2 text-[11px] font-bold text-[#6f6253]">
          <ImageIcon className="h-3.5 w-3.5 text-[#8b5b42]" />
          <span className="truncate">{attachment.file_name}</span>
          <span className="shrink-0 text-[#a89a88]">· {formatSize(attachment.file_size)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function AttachmentCard({
  attachment,
  onPreview,
}: {
  attachment: MessageAttachment;
  onPreview?: (attachment: MessageAttachment) => void;
}) {
  const isDrive = attachment.kind === 'drive';
  const isImage = !isDrive && (attachment.mime_type ?? '').startsWith('image/');
  if (isImage) {
    return <ImageAttachment attachment={attachment} onPreview={onPreview} />;
  }

  const open = async () => {
    if (!isDrive && onPreview) {
      onPreview(attachment);
      return;
    }
    if (isDrive) {
      if (!attachment.web_view_link) {
        toast.error('Drive link unavailable');
        return;
      }
      window.open(attachment.web_view_link, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!attachment.storage_path) {
      toast.error('Attachment unavailable');
      return;
    }
    const { data, error } = await supabase.storage
      .from('message-attachments')
      .createSignedUrl(attachment.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Could not open attachment');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={open}
      className="mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[#decdb7] bg-[#fffaf1] px-3.5 py-3 text-left shadow-[0_12px_28px_rgba(86,61,32,0.10)] transition hover:border-[#a14f43]/45 hover:bg-white"
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
          isDrive ? 'bg-[#e6eef5]' : 'bg-[#efe4d3]',
        )}
      >
        {isDrive ? (
          <Cloud className="h-5 w-5 text-[#356385]" />
        ) : (
          <FileText className="h-5 w-5 text-[#8b5b42]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-black text-[#211b16]">{attachment.file_name}</div>
        <div className="mt-0.5 text-xs font-semibold text-[#7a6b58]">
          {isDrive ? 'Google Drive' : `${formatSize(attachment.file_size)} · ${fileKindLabel(attachment.mime_type ?? '')}`}
        </div>
      </div>
      {isDrive ? (
        <ExternalLink className="h-4 w-4 shrink-0 text-[#7a6b58]" />
      ) : (
        <Download className="h-4 w-4 shrink-0 text-[#7a6b58]" />
      )}
    </button>
  );
}
