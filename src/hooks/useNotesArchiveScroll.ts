import { useCallback, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

/** Return to a mouse-opened note without taking over wheel or touch scrolling. */
export function useNotesArchiveScroll() {
  const active = useRef<gsap.core.Tween | null>(null);
  useEffect(() => () => { active.current?.kill(); }, []);
  return useCallback((target: HTMLElement, pointerReturn: boolean) => {
    active.current?.kill();
    active.current = null;
    const canAnimate = pointerReturn && !target.matches(':focus-visible') && typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
    if (!canAnimate) {
      target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      return;
    }
    const rect = target.getBoundingClientRect();
    if (rect.top >= 24 && rect.bottom <= window.innerHeight - 24) return;
    const destination = Math.max(0, window.scrollY + rect.top - Math.max(24, (window.innerHeight - rect.height) / 2));
    active.current = gsap.to(window, {
      scrollTo: { y: destination, autoKill: true },
      duration: 0.26,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }, []);
}
