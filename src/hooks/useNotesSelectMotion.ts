import { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/** The menu alone moves. Keyboard selection and reduced-motion remain immediate. */
export function useNotesSelectMotion(open: boolean, modality: 'pointer' | 'keyboard') {
  const media = useRef<ReturnType<typeof gsap.matchMedia> | null>(null);
  const cleanup = useCallback(() => { media.current?.revert(); media.current = null; }, []);
  useEffect(() => cleanup, [cleanup]);
  return useCallback((node: HTMLDivElement | null) => {
    cleanup();
    if (!node || !open || modality === 'keyboard') return;
    const mm = gsap.matchMedia();
    media.current = mm;
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(node,
        { opacity: 0.6, scale: 0.98, y: node.dataset.side === 'top' ? -4 : 4 },
        { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform,opacity' },
      );
    });
  }, [open, modality, cleanup]);
}
