import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

let scrollLocks = 0;
let previousOverflow = '';

function lockBodyScroll() {
  if (scrollLocks++ === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  return () => {
    if (--scrollLocks === 0) document.body.style.overflow = previousOverflow;
  };
}

/** Keep modal semantics mounted until the panel's exit has actually finished. */
export function useClassroomOverlayMotion(open: boolean, side: 'left' | 'right') {
  const [present, setPresent] = useState(open);
  const ref = useRef<HTMLDivElement>(null);
  const latestOpen = useRef(open);
  const reduced = useRef(false);
  const generation = useRef(0);
  const context = useRef<gsap.Context>();
  const timeline = useRef<gsap.core.Timeline>();
  const mounted = useRef(false);
  latestOpen.current = open;

  useLayoutEffect(() => {
    mounted.current = true;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = preference.matches;
    const settle = () => {
      reduced.current = preference.matches;
      if (!preference.matches) return;
      generation.current++;
      timeline.current?.kill();
      if (!latestOpen.current) {
        setPresent(false);
      } else if (ref.current) {
        const panel = ref.current.querySelector('aside');
        const backdrop = ref.current.querySelector('.classroom-overlay-backdrop');
        context.current?.add(() => gsap.set([panel, backdrop].filter(Boolean), { clearProps: 'transform,opacity' }));
      }
    };
    preference.addEventListener('change', settle);
    return () => {
      mounted.current = false;
      generation.current++;
      preference.removeEventListener('change', settle);
      timeline.current?.kill();
      context.current?.revert();
      context.current = undefined;
    };
  }, []);

  useLayoutEffect(() => {
    if (!present) return;
    return lockBodyScroll();
  }, [present]);

  useLayoutEffect(() => {
    const run = ++generation.current;
    timeline.current?.kill();
    if (open && !present) {
      setPresent(true);
      return;
    }
    if (!present) {
      context.current?.revert();
      context.current = undefined;
      return;
    }
    const root = ref.current;
    const panel = root?.querySelector<HTMLElement>('aside');
    const backdrop = root?.querySelector<HTMLElement>('.classroom-overlay-backdrop');
    if (!root || !panel || !backdrop) {
      if (!open) setPresent(false);
      return;
    }
    const fresh = !context.current;
    if (fresh) context.current = gsap.context(() => {}, root);
    const finishExit = () => {
      if (mounted.current && generation.current === run && !latestOpen.current) setPresent(false);
    };
    if (reduced.current) {
      context.current!.add(() => gsap.set([panel, backdrop], { clearProps: 'transform,opacity' }));
      if (!open) finishExit();
      return;
    }
    try {
      context.current!.add(() => {
        if (fresh) {
          gsap.set(panel, { xPercent: side === 'left' ? -100 : 100 });
          gsap.set(backdrop, { opacity: 0 });
        }
        timeline.current = gsap.timeline({ onComplete: open ? undefined : finishExit });
        timeline.current.to(panel, {
          xPercent: open ? 0 : side === 'left' ? -100 : 100,
          duration: open ? 0.3 : 0.18,
          ease: open ? 'power3.out' : 'power2.in',
          overwrite: true,
        }, 0).to(backdrop, {
          opacity: open ? 1 : 0, duration: open ? 0.24 : 0.18,
          ease: open ? 'power2.out' : 'power2.in', overwrite: true,
        }, 0);
      });
    } catch {
      // A motion failure must leave a usable open modal or remove a closed one.
      timeline.current?.kill();
      context.current?.revert();
      context.current = undefined;
      if (!open) finishExit();
    }
    return () => { generation.current++; timeline.current?.kill(); };
  }, [open, present, side]);

  return { ref, present };
}
