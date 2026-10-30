import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useNavigationType } from 'react-router-dom';
import { gsap } from 'gsap';
import '@/styles/note-reader-transition.css';

const readerId = (path: string) => {
  const match = /^\/classroom\/item\/([^/]+)$/.exec(path);
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
};

/** One owner for the real secondary rail, stage displacement and note reader. */
export function useNoteReaderTransition(rootRef: RefObject<HTMLElement>, pathname: string, navigationKey: string) {
  const navigationType = useNavigationType();
  const navigateRef = useRef<(path: string, key: string, type: string) => void>();
  const disposeRef = useRef<() => void>();
  const ownerRoot = useRef<HTMLElement | null>(null);
  const currentRoute = useRef({ pathname, navigationKey, navigationType });
  currentRoute.current = { pathname, navigationKey, navigationType };
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === ownerRoot.current) return;
    disposeRef.current?.();
    if (!root) return;
    ownerRoot.current = root;
    let scope: gsap.Context | undefined;
    let timeline: gsap.core.Timeline | undefined;
    let disposed = false;
    let expectedId: string | null = null;
    let currentKey = '';
    let playedKey = '';
    let shellKey = '';
    const railSeen = new WeakSet<HTMLElement>();
    let previousLeft: number | undefined;
    let previousRail = false;
    let lastWidth = 0;
    let viewportWidth = window.innerWidth;
    let fromLeft: number | undefined;
    let enteringRail = false;
    let scrollToReader = false;
    let animating = false;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)') ?? { matches: true, addEventListener: undefined, removeEventListener: undefined };
    const stage = () => root.querySelector<HTMLElement>('[data-note-transition-stage]');
    const rail = () => root.querySelector<HTMLElement>('[data-note-transition-rail]');
    const measure = () => {
      const rect = stage()?.getBoundingClientRect();
      previousLeft = rect?.left;
      lastWidth = rect?.width ?? 0;
      const currentRail = rail();
      previousRail = !!currentRail && currentRail.getBoundingClientRect().width > 0;
      viewportWidth = window.innerWidth;
    };
    const finish = () => { timeline?.progress(1); };
    const reset = () => { timeline?.kill(); timeline = undefined; scope?.revert(); scope = undefined; animating = false; root.removeAttribute('data-note-transition-active'); };
    const play = () => {
      if (disposed || !expectedId) return;
      const reader = Array.from(root.querySelectorAll<HTMLElement>('[data-note-reader]')).find(node => node.dataset.noteReader === expectedId);
      const main = stage();
      if (!main) return;
      const confirmed = !!reader || Array.from(rail()?.querySelectorAll<HTMLElement>('[data-note-target-id]') ?? []).some(node => node.dataset.noteTargetId === expectedId);
      if (!confirmed) {
        // Item routes also host homework and documents. An unresolved route is
        // not permission to animate their shell or rewind already painted rail.
        shellKey = currentKey; enteringRail = false; measure(); fromLeft = previousLeft;
        return;
      }
      const newShell = shellKey !== currentKey;
      const newReader = !!reader && playedKey !== currentKey;
      if (!newShell && !newReader) return;
      if (reader && scrollToReader) { window.scrollTo({ top: 0, behavior: 'instant' }); scrollToReader = false; }
      const immediate = media.matches || !!reader?.contains(document.activeElement);
      if (!immediate) root.setAttribute('data-note-transition-active', '');
      const paper = rail();
      const destination = main.getBoundingClientRect();
      const destinationLeft = destination.left - (scope ? Number(gsap.getProperty(main, 'x')) || 0 : 0);
      previousLeft = destinationLeft; lastWidth = destination.width;
      shellKey = currentKey;
      if (reader) playedKey = currentKey;
      if (immediate) return;
      const visibleRail = paper && paper.getBoundingClientRect().width > 0;
      const railItems = visibleRail ? Array.from(paper.querySelectorAll<HTMLElement>('.classroom-section-heading, .classroom-panel-item')).filter(node => {
        const rect = node.getBoundingClientRect(), bounds = paper.getBoundingClientRect();
        return !railSeen.has(node) && rect.height > 0 && rect.bottom > bounds.top && rect.top < Math.min(bounds.bottom, window.innerHeight);
      }) : [];
      const blocks = newReader && reader ? Array.from(reader.querySelectorAll<HTMLElement>('[data-note-reader-block]')).filter(node => node.getBoundingClientRect().height > 0) : [];
      const animate = () => {
        const shift = fromLeft !== undefined ? fromLeft - destinationLeft : 0;
        if (!(newShell && Math.abs(shift) > 1) && !(enteringRail && visibleRail) && !blocks.length) { root.removeAttribute('data-note-transition-active'); return; }
        animating = true;
        if (!timeline) timeline = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => { animating = false; root.removeAttribute('data-note-transition-active'); measure(); } });
        const at = newShell ? 0 : timeline.time();
        if (newShell && Math.abs(shift) > 1) timeline.fromTo(main, { x: shift }, { x: 0, duration: 0.52, clearProps: 'transform' }, 0);
        if (enteringRail && visibleRail) {
          if (newShell) timeline.fromTo(paper, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, clearProps: 'transform,opacity' }, 0);
          if (railItems.length) { railItems.forEach(node => railSeen.add(node)); timeline.fromTo(railItems, { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.34, stagger: Math.min(0.045, 0.24 / Math.max(1, railItems.length - 1)), clearProps: 'transform,opacity' }, at + 0.09); }
        }
        if (blocks.length) timeline.fromTo(blocks, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: Math.min(0.06, 0.24 / Math.max(1, blocks.length - 1)), clearProps: 'transform,opacity' }, at + (newShell && enteringRail && visibleRail ? 0.18 : 0));
        if (!newShell) timeline.play();
      };
      if (scope) scope.add(animate); else scope = gsap.context(animate, root);
    };
    const synchronizeGeometry = () => {
      const main = stage();
      if (!main) return;
      const currentRail = rail();
      const hasRail = !!currentRail && currentRail.getBoundingClientRect().width > 0;
      if (expectedId && !previousRail && hasRail) {
        // Permissions may mount the secondary rail after the route's first
        // commit. Invert from the last visual edge before the browser paints.
        const offset = scope ? Number(gsap.getProperty(main, 'x')) || 0 : 0;
        fromLeft = previousLeft === undefined ? undefined : previousLeft + offset;
        finish(); reset();
        enteringRail = true; previousRail = true; shellKey = '';
        play();
        return;
      }
      if (!animating) measure();
    };
    let observedStage: HTMLElement | null = null;
    let observedRail: HTMLElement | null = null;
    const observeGeometry = () => {
      const main = stage(), paper = rail();
      if (main === observedStage && paper === observedRail) return;
      observedStage = main; observedRail = paper;
      resize?.disconnect(); resize?.observe(root);
      if (main) resize?.observe(main);
      if (paper) resize?.observe(paper);
    };
    navigateRef.current = (path, key, type) => {
      if (currentKey === `${key}:${readerId(path) ?? ''}`) return;
      // Rebase an interrupted transition from its current visual stage position.
      const currentStage = stage();
      const offset = currentStage && scope ? Number(gsap.getProperty(currentStage, 'x')) || 0 : 0;
      fromLeft = previousLeft === undefined ? undefined : previousLeft + offset;
      reset();
      expectedId = readerId(path); currentKey = `${key}:${expectedId ?? ''}`;
      const currentRail = rail();
      const hasRail = !!currentRail && currentRail.getBoundingClientRect().width > 0;
      enteringRail = !!expectedId && !previousRail && hasRail;
      previousRail = hasRail;
      // Reader PUSH starts at the title. Archive POP/Back retains its own anchor.
      scrollToReader = !!expectedId && type === 'PUSH';
      measure();
      play();
      observeGeometry();
    };
    const mutations = new MutationObserver(() => { synchronizeGeometry(); observeGeometry(); play(); });
    mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-note-reader', 'data-note-target-id'] });
    const onResize = () => {
      const main = stage(), rect = main?.getBoundingClientRect();
      const width = rect?.width ?? 0;
      const offset = main && scope ? Number(gsap.getProperty(main, 'x')) || 0 : 0;
      const layoutLeft = rect ? rect.left - offset : undefined;
      const currentRail = rail();
      const hasRail = !!currentRail && currentRail.getBoundingClientRect().width > 0;
      if (window.innerWidth === viewportWidth) {
        const sameEdge = previousLeft === undefined || layoutLeft === undefined || Math.abs(layoutLeft - previousLeft) < 1;
        if (sameEdge && hasRail === previousRail) {
          // A classic scrollbar can narrow a newly loaded article without
          // moving its reading edge. Do not truncate that content's reveal.
          if (Math.abs(width - lastWidth) >= 1) lastWidth = width;
          if (!animating) measure();
          observeGeometry(); return;
        }
        if (expectedId && !previousRail && hasRail) { synchronizeGeometry(); observeGeometry(); return; }
      }
      finish(); reset(); measure();
      observeGeometry();
    };
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(onResize);
    observeGeometry(); window.addEventListener('resize', onResize);
    const focus = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('[data-note-reader], [data-note-transition-rail]')) finish();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Tab') finish(); };
    const reduce = () => { if (media.matches) { finish(); reset(); measure(); } };
    root.addEventListener('focusin', focus); root.addEventListener('keydown', key);
    media.addEventListener?.('change', reduce);
    disposeRef.current = () => {
      disposed = true; navigateRef.current = undefined;
      ownerRoot.current = null;
      mutations.disconnect(); resize?.disconnect(); window.removeEventListener('resize', onResize);
      root.removeEventListener('focusin', focus); root.removeEventListener('keydown', key);
      media.removeEventListener?.('change', reduce); reset();
    };
    // The root can mount later than the route (profile/auth readiness). Start
    // that newly mounted owner without making unrelated renders navigation.
    const route = currentRoute.current;
    navigateRef.current?.(route.pathname, route.navigationKey, route.navigationType);
  });
  useLayoutEffect(() => navigateRef.current?.(pathname, navigationKey, navigationType), [pathname, navigationKey, navigationType]);
  useLayoutEffect(() => () => disposeRef.current?.(), []);
}
