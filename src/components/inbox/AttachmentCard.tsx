import { useEffect, useState } from 'react';
import { FileText, Download, Cloud, ExternalLink, Image as ImageIcon, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MessageAttachment, AttachmentSyncStatus } from '@/hooks/useInbox';

const SYNC_LABELS: Record<AttachmentSyncStatus, string> = {
  pending: 'Processing',
  synced: 'Synced',
  syncing: 'Updating',
  stale: 'Needs refresh',
  failed: 'Sync failed',
  permission_blocked: 'Permission needed',
  deleted_externally: 'File unavailable',
  needs_linking: 'Needs linking',
};

const DESTRUCTIVE_STATES = new Set<AttachmentSyncStatus>([
  'failed',
  'permission_blocked',
  'deleted_externally',
]);

const DISABLED_STATES = new Set<AttachmentSyncStatus>([
  'failed',
  'permission_blocked',
  'deleted_externally',
]);

const DISABLED_TOOLTIPS: Partial<Record<AttachmentSyncStatus, string>> = {
  failed: 'This attachment failed to sync. Retry from the admin tools.',
  permission_blocked: 'The connected account does not have permission to read this file.',
  deleted_externally: 'The original file has been removed from its source and is no longer available.',
};

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({ attachment }: { attachment: MessageAttachment }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (attachment.source !== 'lsat_u_upload' || !attachment.source_url) return;
    let cancelled = false;
    supabase.storage
      .from('message-attachments')
      .createSignedUrl(attachment.source_url, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.source, attachment.source_url]);

  const open = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={open}
      className="block max-w-xs mt-2 rounded-md border border-border bg-background/50 hover:bg-accent transition-colors overflow-hidden text-left"
      title={attachment.display_name}
    >
      {url ? (
        <img
          src={url}
          alt={attachment.display_name}
          className="block w-full max-h-64 object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center gap-2 px-3 py-3 text-[12px] text-muted-foreground font-normal">
          <ImageIcon className="w-4 h-4" /> Loading {attachment.display_name}…
        </div>
      )}
      <div className="px-3 py-1.5 border-t border-border flex flex-col gap-0.5">
        <div className="text-[13px] font-medium text-foreground truncate">{attachment.display_name}</div>
        <AttachmentMeta attachment={attachment} />
      </div>
    </button>
  );
}

function AttachmentMeta({ attachment }: { attachment: MessageAttachment }) {
  const size = formatSize(attachment.size_bytes);
  const badgeIsDestructive = DESTRUCTIVE_STATES.has(attachment.sync_status);
  // We hide the badge in the "happy path" (synced lsat_u_upload) since users
  // expect their own uploads to just work; surface it everywhere else.
  const showBadge = !(attachment.source === 'lsat_u_upload' && attachment.sync_status === 'synced');

  return (
    <div className="flex items-center gap-2">
      {size ? (
        <span className="text-[12px] font-normal text-muted-foreground">{size}</span>
      ) : null}
      {showBadge ? (
        <span
          className={cn(
            'text-[11px] font-medium',
            badgeIsDestructive ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {SYNC_LABELS[attachment.sync_status]}
        </span>
      ) : null}
    </div>
  );
}

export function AttachmentCard({ attachment }: { attachment: MessageAttachment }) {
  const isImage =
    attachment.source === 'lsat_u_upload' &&
    (attachment.mime_type ?? '').startsWith('image/') &&
    attachment.sync_status !== 'deleted_externally';

  if (isImage) {
    return <ImageAttachment attachment={attachment} />;
  }

  const disabled = DISABLED_STATES.has(attachment.sync_status);

  const open = async () => {
    if (disabled) return;
    if (attachment.source === 'lsat_u_upload') {
      if (!attachment.source_url) {
        toast.error('Attachment unavailable');
        return;
      }
      const { data, error } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(attachment.source_url, 60);
      if (error || !data?.signedUrl) {
        toast.error('Could not open attachment');
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    // google_drive / gmail_attachment: open the external link directly.
    if (!attachment.source_url) {
      toast.error('External link unavailable');
      return;
    }
    window.open(attachment.source_url, '_blank', 'noopener,noreferrer');
  };

  const Icon = pickIcon(attachment.source);
  const TrailingIcon = attachment.source === 'lsat_u_upload' ? Download : ExternalLink;

  const card = (
    <button
      onClick={open}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 w-full max-w-xs px-3 py-2 mt-2 rounded-md border border-border bg-background/50 text-left transition-colors',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent',
      )}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-muted shrink-0 relative">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {DESTRUCTIVE_STATES.has(attachment.sync_status) ? (
          <AlertTriangle className="absolute -top-1 -right-1 w-3.5 h-3.5 text-destructive bg-background rounded-full" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="text-[13px] font-medium text-foreground truncate">{attachment.display_name}</div>
        <AttachmentMeta attachment={attachment} />
        {attachment.sync_error ? (
          <div className="text-[12px] font-normal text-destructive truncate">{attachment.sync_error}</div>
        ) : null}
      </div>
      <TrailingIcon className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );

  const tooltip = DISABLED_TOOLTIPS[attachment.sync_status];
  if (disabled && tooltip) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{card}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return card;
}

function pickIcon(source: MessageAttachment['source']) {
  switch (source) {
    case 'google_drive':
      return Cloud;
    case 'gmail_attachment':
      return Mail;
    case 'lsat_u_upload':
    default:
      return FileText;
  }
}
