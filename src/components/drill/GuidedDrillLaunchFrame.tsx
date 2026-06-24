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
}

export function GuidedDrillLaunchFrame({
  src,
  html,
  title,
  onStart,
  onReturn,
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
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  React.useEffect(() => () => cleanupRef.current?.(), []);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      srcDoc={html}
      title={`${title} launch page`}
      className="block h-screen w-full border-0 bg-background"
      onLoad={wireControls}
    />
  );
}
