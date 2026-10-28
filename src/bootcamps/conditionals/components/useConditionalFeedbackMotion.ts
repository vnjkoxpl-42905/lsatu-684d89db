import { useEffect, type RefObject } from 'react';

/** Only newly requested feedback moves. Questions and keyboard actions stay immediate. */
export function useConditionalFeedbackMotion(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const surface = root.current;
    if (!surface || typeof window.matchMedia !== 'function') return;
    let dispose: (() => void) | undefined;
    let stopped = false;
    let pointer = false;
    const onPointer = () => { pointer = true; surface.dataset.pointer = 'true'; };
    const onKeyboard = () => { pointer = false; delete surface.dataset.pointer; };
    surface.addEventListener('pointerdown', onPointer, true);
    surface.addEventListener('keydown', onKeyboard, true);
    void import('gsap').then(({ gsap }) => {
      if (stopped) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const active = new Set<ReturnType<typeof gsap.fromTo>>();
        const shown = new WeakMap<Element, string>();
        const selector = '.cir-reveal, .cir-feedback, .cir-answer-feedback, .conditional-feedback, [role="alert"]';
        surface.querySelectorAll(selector).forEach(node => shown.set(node, node.textContent ?? ''));
        const observer = new MutationObserver(records => {
          if (!pointer) return;
          const changed = new Set<Element>();
          for (const record of records) {
            const parent = record.target instanceof Element ? record.target : record.target.parentElement;
            const containing = parent?.closest(selector);
            if (containing) changed.add(containing);
            for (const added of record.addedNodes) if (added instanceof Element) {
              if (added.matches(selector)) changed.add(added);
              added.querySelectorAll(selector).forEach(node => changed.add(node));
            }
          }
          for (const node of changed) {
              const text = node.textContent ?? '';
              if (!text.trim() || shown.get(node) === text || !node.isConnected) continue;
              shown.set(node, text);
              const tween = gsap.fromTo(node, { y: 4, opacity: .65 }, { y: 0, opacity: 1, duration: .18, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform,opacity', onComplete: () => { active.delete(tween); } });
              active.add(tween);
          }
        });
        observer.observe(surface, { childList: true, characterData: true, subtree: true });
        return () => {
          observer.disconnect();
          active.forEach(tween => { gsap.set(tween.targets(), { clearProps: 'transform,opacity' }); tween.kill(); });
          active.clear();
        };
      }, surface);
      dispose = () => media.revert();
    });
    return () => {
      stopped = true;
      dispose?.();
      surface.removeEventListener('pointerdown', onPointer, true);
      surface.removeEventListener('keydown', onKeyboard, true);
    };
  }, [root]);
}
