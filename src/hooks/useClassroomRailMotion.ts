import { useLayoutEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';

const ACTIVE = '.classroom-nav-active, .classroom-nav-active-white';
type Box = { x: number; y: number; width: number; height: number };

/** Move only the rail's background. Routing, focus and button geometry stay native. */
export function useClassroomRailMotion(ref: RefObject<HTMLElement>, navigationKey: string) {
  const update = useRef<(animate: boolean) => void>();

  useLayoutEffect(() => {
    const root = ref.current;
    const marker = root?.querySelector<HTMLElement>('[data-rail-marker]');
    if (!root || !marker) return;

    const context = gsap.context(() => {}, root);
    const media = gsap.matchMedia();
    let reduced = true;
    let target: HTMLElement | null = null;
    let previous: Box | undefined;
    let base: { width: number; height: number } | undefined;
    let tween: gsap.core.Tween | undefined;
    let frame = 0;
    let disposed = false;

    const position = (animate: boolean, force = false) => {
      if (disposed) return;
      const active = root.querySelector<HTMLElement>(ACTIVE);
      const bounds = active?.getBoundingClientRect();
      if (!active || !bounds?.width || !bounds.height) {
        tween?.kill();
        delete root.dataset.railMarkerReady;
        marker.style.visibility = 'hidden';
        target = null;
        previous = undefined;
        return;
      }
      const origin = root.getBoundingClientRect();
      const next = {
        x: bounds.left - origin.left + root.scrollLeft - root.clientLeft,
        y: bounds.top - origin.top + root.scrollTop - root.clientTop,
        width: bounds.width,
        height: bounds.height,
      };
      const sameBox = previous && (Object.keys(next) as (keyof Box)[])
        .every(key => Math.abs(next[key] - previous![key]) < 0.5);
      if (!force && active === target && sameBox) return;

      const canAnimate = animate && !reduced && !!target && !!base;
      const activeStyle = getComputedStyle(active);
      const white = active.classList.contains('classroom-nav-active-white');
      root.style.setProperty('--classroom-rail-marker-fill', white
        ? activeStyle.getPropertyValue('--classroom-surface') || '#fff'
        : '#252B26');
      marker.style.borderRadius = activeStyle.borderRadius;
      tween?.kill();

      // Width/height are measured and written once, never on an animation frame.
      if (!canAnimate) base = { width: next.width, height: next.height };
      context.add(() => {
        if (!canAnimate) {
          gsap.set(marker, {
            width: base!.width, height: base!.height,
            x: next.x, y: next.y, scaleX: 1, scaleY: 1,
            transformOrigin: '0 0', visibility: 'visible',
          });
        } else {
          tween = gsap.to(marker, {
            x: next.x, y: next.y,
            scaleX: next.width / base!.width,
            scaleY: next.height / base!.height,
            duration: 0.38, ease: 'power3.out', overwrite: true,
          });
        }
      });
      root.dataset.railMarkerReady = 'true';
      target = active;
      previous = next;
    };

    update.current = animate => position(animate);
    media.add({ all: 'all', reduce: '(prefers-reduced-motion: reduce)' }, mediaContext => {
      reduced = !!mediaContext.conditions?.reduce;
      position(false, true);
      return () => tween?.kill();
    });

    const schedule = (animate: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => position(animate));
    };
    const resize = typeof ResizeObserver === 'undefined' ? null
      : new ResizeObserver(() => schedule(false));
    const observeButtons = () => {
      resize?.disconnect();
      resize?.observe(root);
      root.querySelectorAll<HTMLElement>('.classroom-nav').forEach(button => resize?.observe(button));
    };
    observeButtons();
    const mutation = new MutationObserver(records => {
      if (records.some(record => record.type === 'childList')) observeButtons();
      schedule(true);
    });
    mutation.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
    const onScroll = () => position(false);
    const scrollRoot = root.closest('.classroom-sidebar-card');
    root.addEventListener('scroll', onScroll, { passive: true });
    scrollRoot?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      disposed = true;
      update.current = undefined;
      cancelAnimationFrame(frame);
      mutation.disconnect();
      resize?.disconnect();
      root.removeEventListener('scroll', onScroll);
      scrollRoot?.removeEventListener('scroll', onScroll);
      tween?.kill();
      media.revert();
      context.revert();
      delete root.dataset.railMarkerReady;
      root.style.removeProperty('--classroom-rail-marker-fill');
      marker.style.removeProperty('border-radius');
    };
  }, [ref]);

  useLayoutEffect(() => update.current?.(true), [navigationKey]);
}
