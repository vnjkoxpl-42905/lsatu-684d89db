// ScreenshotContextCard — renders a Help-flow screenshot message as a polished,
// published-looking card: a framed tap-to-zoom preview plus a context card that
// names what the screenshot points at and links straight there via a natural-
// language "Smart Click" button. Replaces the raw file chip + leaked context
// text that the old render produced.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Loader2, ZoomIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  helpSnapshotHeading,
  smartClickLabel,
  type HelpSnapshot,
} from '@/lib/helpContextBus';
import type { MessageAttachment } from '@/hooks/useInbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function useSignedUrl(storagePath: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    supabase.storage
      .from('message-attachments')
      .createSignedUrl(storagePath, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);
  return url;
}

function useHelpSnapshot(storagePath: string | null): HelpSnapshot | null {
  const [snap, setSnap] = useState<HelpSnapshot | null>(null);
  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage
        .from('message-attachments')
        .createSignedUrl(storagePath, 60 * 60);
      if (cancelled || !data?.signedUrl) return;
      try {
        const res = await fetch(data.signedUrl);
        const json = (await res.json()) as HelpSnapshot;
        if (!cancelled) setSnap(json);
      } catch {
        /* malformed / missing context — card degrades to image-only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storagePath]);
  return snap;
}

export function ScreenshotContextCard({
  image,
  context,
}: {
  image: MessageAttachment;
  context: MessageAttachment;
}) {
  const navigate = useNavigate();
  const imageUrl = useSignedUrl(image.storage_path);
  const snap = useHelpSnapshot(context.storage_path);
  const [zoomed, setZoomed] = useState(false);

  const heading = snap ? helpSnapshotHeading(snap) : 'Screenshot';
  const captured = relativeTime(snap?.capturedAt);

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#decdb7] bg-[#fffaf1] shadow-[0_12px_28px_rgba(86,61,32,0.10)]">
      {/* Framed, tap-to-zoom preview */}
      <button
        type="button"
        onClick={() => imageUrl && setZoomed(true)}
        className="group relative block w-full"
        aria-label="Zoom screenshot"
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={heading}
            className="block max-h-64 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center gap-2 px-3 py-8 text-xs font-semibold text-[#7a6b58]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading screenshot…
          </div>
        )}
        {imageUrl ? (
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">
            <ZoomIn className="h-3 w-3" /> Zoom
          </span>
        ) : null}
      </button>

      {/* Context card */}
      <div className="flex flex-col gap-2.5 border-t border-[#eadfcf] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#efe4d3]">
            <Compass className="h-4 w-4 text-[#8b5b42]" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-black leading-tight text-[#211b16]">
              {heading}
            </div>
            {captured ? (
              <div className="text-[11px] font-semibold text-[#a89a88]">
                captured {captured}
              </div>
            ) : null}
          </div>
        </div>

        {snap?.path ? (
          <button
            type="button"
            onClick={() => navigate(snap.path)}
            className={cn(
              'group inline-flex w-full items-center justify-between gap-2 rounded-full',
              'bg-[#8b5b42] px-4 py-2.5 text-[13px] font-bold text-white',
              'shadow-sm transition hover:bg-[#734730] active:scale-[0.99]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5b42]/40 focus-visible:ring-offset-2',
            )}
          >
            <span className="truncate">{smartClickLabel(snap)}</span>
            <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
          </button>
        ) : null}
      </div>

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{heading}</DialogTitle>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={heading}
              className="mx-auto max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
