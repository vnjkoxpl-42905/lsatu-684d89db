/**
 * Renders a guided-drill premium launch page in a full-screen iframe and wires
 * its in-page controls back to React. Used for both curated HTML pages (via
 * `src`) and data-driven pages built from a drill's instruction_card (via
 * `html`/srcDoc). The page's `data-start-drill` and `data-return` buttons are
 * intercepted in the capture phase so React owns the navigation.
 */

import React from 'react';

interface GuidedDrillLaunchFrameProps {
  /** URL of a curated static launch page. */
  src?: string;
  /** Inline launch page HTML (srcDoc) built from drill data. */
  html?: string;
  title: string;
  onStart: () => void;
  onReturn: () => void;
  /**
   * Shown as an overlay strip above the launch page when the student has an
   * unfinished run of this drill, so pressing Start is not a gamble on whether
   * their earlier answers survived. Rendered outside the iframe on purpose —
   * curated launch pages are static assets we do not rewrite at runtime.
   */
  resumeNotice?: string;
}

export function GuidedDrillLaunchFrame({
  src,
  html,
  title,
  onStart,
  onReturn,
  resumeNotice,
}: GuidedDrillLaunchFrameProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const cleanupRef = React.useRef<(() => void) | null>(null);

  const onStartRef = React.useRef(onStart);
  const onReturnRef = React.useRef(onReturn);
  React.useEffect(() => {
    onStartRef.current = onStart;
    onReturnRef.current = onReturn;
  }, [onStart, onReturn]);

  const wireControls = React.useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;

    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest('[data-start-drill="true"]')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onStartRef.current();
        return;
      }

      if (target.closest('[data-return="true"]')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        onReturnRef.current();
      }
    };

    doc.addEventListener('click', onClick, true);
    cleanupRef.current = () => doc.removeEventListener('click', onClick, true);
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Accept same-origin (curated pages) AND "null" origin (srcDoc launch
      // pages have an opaque origin). Payload is harmless metadata.
      if (event.origin !== window.location.origin && event.origin !== 'null') return;
      if (event.data?.type === 'lsatu:start-guided-drill') onStartRef.current();
      if (event.data?.type === 'lsatu:return-guided-drill') onReturnRef.current();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  React.useEffect(() => () => cleanupRef.current?.(), []);

  const frame = (
    <iframe
      ref={iframeRef}
      src={src}
      srcDoc={html}
      title={`${title} launch page`}
      className="block h-screen w-full border-0 bg-background"
      onLoad={wireControls}
    />
  );

  if (!resumeNotice) return frame;

  return (
    <div className="relative">
      <div
        role="status"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4 pt-4"
      >
        <span className="rounded-full bg-foreground/90 px-4 py-2 text-xs font-medium text-background shadow-lg backdrop-blur">
          {resumeNotice}
        </span>
      </div>
      {frame}
    </div>
  );
}
