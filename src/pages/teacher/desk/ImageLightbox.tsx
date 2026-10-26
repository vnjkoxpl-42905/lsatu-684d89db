import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

/**
 * Click-to-enlarge preview for an attached screenshot. Used by the composer
 * preview chips and the transcript thumbnails so a thumbnail opens the full
 * image in a centered popup (ChatGPT-style), rather than only ever showing the
 * tiny chip.
 */
export function ImageLightbox({
  src,
  alt,
  open,
  onOpenChange,
}: {
  src: string | null;
  alt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
        <DialogTitle className="sr-only">{alt || 'Attached image preview'}</DialogTitle>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] w-full rounded-lg object-contain shadow-2xl"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
