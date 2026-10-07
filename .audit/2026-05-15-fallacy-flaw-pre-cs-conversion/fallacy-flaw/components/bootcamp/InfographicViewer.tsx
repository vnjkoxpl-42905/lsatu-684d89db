import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

const INFOGRAPHIC_SRC = '/fallacy-flaw/bootcamp-infographic.png';

export function InfographicViewer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <figure className="border border-rule bg-paper-bright/40">
      <header className="border-b border-rule px-5 py-3">
        <div className="protocol text-ink-mute">Visual map</div>
        <h3 className="display-title text-2xl text-ink">
          Flaws &amp; Fallacies Infographic
        </h3>
        <p className="mt-1 protocol text-xs text-ink-mute">
          One-page survey · click to expand
        </p>
      </header>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Expand infographic"
        className="block w-full bg-paper p-3 transition-colors hover:bg-paper-bright"
      >
        <img
          src={INFOGRAPHIC_SRC}
          alt="Flaws and Fallacies infographic — bootcamp visual map of strategic mindset, three languages, famous flaws, and trap answer patterns"
          className="h-auto w-full border border-rule"
          loading="lazy"
        />
      </button>
      <figcaption className="border-t border-rule px-5 py-3 protocol text-xs text-ink-mute">
        Source · NotebookLM artifact, generated from the master guide
      </figcaption>

      {mounted && open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Infographic full-size view"
              className={cn(
                'fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4',
                'cursor-zoom-out',
              )}
              onClick={() => setOpen(false)}
            >
              <img
                src={INFOGRAPHIC_SRC}
                alt="Flaws and Fallacies infographic, full size"
                className="max-h-full max-w-full object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
                className="absolute right-5 top-5 protocol border border-paper-bright/40 bg-paper px-3 py-1.5 text-xs text-ink hover:bg-paper-bright"
              >
                Close
              </button>
            </div>,
            document.body,
          )
        : null}
    </figure>
  );
}
