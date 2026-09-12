import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { classifyInboxAttachmentMime } from '@/lib/inboxAttachments';
import type { MessageAttachment } from '@/hooks/useInbox';

interface Props {
  attachment: MessageAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttachmentPreviewSheet({ attachment, open, onOpenChange }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previewKind = classifyInboxAttachmentMime(attachment?.mime_type);

  useEffect(() => {
    if (!open || !attachment?.storage_path) {
      setSignedUrl(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.storage
      .from('message-attachments')
      .createSignedUrl(attachment.storage_path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment, open]);

  const openInNewTab = () => {
    if (!signedUrl) return;
    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0">
        <div className="flex h-full flex-col bg-white">
          <SheetHeader className="border-b border-slate-200 px-6 py-5 pr-14">
            <SheetTitle className="truncate text-left text-base text-slate-900">
              {attachment?.file_name ?? 'Attachment preview'}
            </SheetTitle>
            <SheetDescription className="text-left text-xs text-slate-500">
              Preview the file here, or open it in a full tab if you need more room.
            </SheetDescription>
            <div className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                disabled={!signedUrl}
                className="h-8 text-xs"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open in new tab
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto bg-slate-50">
            {loading ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading preview...
              </div>
            ) : !signedUrl ? (
              <div className="flex h-full min-h-[320px] items-center justify-center px-6 text-center text-sm text-slate-500">
                This attachment preview is unavailable right now.
              </div>
            ) : previewKind === 'image' ? (
              <div className="flex min-h-full items-center justify-center p-6">
                <img
                  src={signedUrl}
                  alt={attachment?.file_name ?? 'Attachment preview'}
                  className="max-h-full max-w-full rounded-2xl border border-slate-200 bg-white object-contain shadow-sm"
                />
              </div>
            ) : previewKind === 'pdf' ? (
              <iframe
                title={attachment?.file_name ?? 'PDF preview'}
                src={signedUrl}
                className="h-full min-h-[70vh] w-full bg-white"
              />
            ) : previewKind === 'video' ? (
              <div className="flex min-h-full items-center justify-center bg-black p-6">
                <video controls playsInline autoPlay className="max-h-full max-w-full rounded-xl">
                  <source src={signedUrl} type={attachment?.mime_type ?? undefined} />
                </video>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">No inline preview for this file type</div>
                  <div className="mt-1 text-sm text-slate-500">Use “Open in new tab” to inspect the full file.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
