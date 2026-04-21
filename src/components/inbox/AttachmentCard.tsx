import { FileText, Download, Cloud, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MessageAttachment } from '@/hooks/useInbox';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  const isDrive = attachment.kind === 'drive';

  const open = async () => {
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
      className="flex items-center gap-3 w-full max-w-xs px-3 py-2 mt-2 rounded-md border border-border bg-background/50 hover:bg-accent transition-colors text-left"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted shrink-0">
        {isDrive ? (
          <Cloud className="w-4 h-4 text-muted-foreground" />
        ) : (
          <FileText className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{attachment.file_name}</div>
        <div className="text-xs text-muted-foreground">
          {isDrive ? 'Google Drive' : `${formatSize(attachment.file_size)} · PDF`}
        </div>
      </div>
      {isDrive ? (
        <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
      ) : (
        <Download className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}
