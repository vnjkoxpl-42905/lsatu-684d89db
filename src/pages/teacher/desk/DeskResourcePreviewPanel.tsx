import { ExternalLink, RotateCw, X } from 'lucide-react';
import { useState } from 'react';

export interface DeskResourcePreview {
  title: string;
  kindLabel: string;
  url: string;
}

function absolutePreviewUrl(url: string) {
  if (url.startsWith('/')) return `${window.location.origin}${url}`;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

export function DeskResourcePreviewPanel({
  resource,
  onClose,
}: {
  resource: DeskResourcePreview;
  onClose: () => void;
}) {
  const [frameKey, setFrameKey] = useState(0);
  const src = absolutePreviewUrl(resource.url);

  return (
    <section
      aria-label="Resource preview"
      className="relative flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#11181c] text-zinc-100 shadow-[0_28px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex min-h-14 items-center gap-3 border-b border-white/10 px-5 text-sm">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{resource.kindLabel}</div>
          <h2 className="truncate font-medium text-zinc-100">{resource.title}</h2>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFrameKey((current) => current + 1)}
            aria-label="Reload preview"
            title="Reload preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCw className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label="Open preview in a new tab"
            title="Open in a new tab"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 bg-white">
        <iframe
          key={frameKey}
          title={`${resource.title} preview`}
          src={src}
          className="h-full min-h-[500px] w-full border-0 bg-white"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      </div>
    </section>
  );
}
