import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EXCLUDED = '[data-motion="off"], [data-motion-skip], .rct-page';

export function classroomMotionKey(pathname: string, search: string) {
  const practice = pathname === '/practice/drills' || pathname === '/classroom/drill';
  if (!practice) {
    if (/^\/(?:drill|rc\/drill|testing|reading-center|guided|activities|quick-drills|conditional-indicators-refresher)(?:\/|$)/.test(pathname)
      || /^\/classroom\/ta\//.test(pathname)
      || /^\/classroom\/[^/]+$/.test(pathname) && !['/classroom/admissions'].includes(pathname)) return '';
    if (/^\/inbox(?:\/|$)/.test(pathname)) return '/inbox';
    if (/^\/teacher\/inbox(?:\/|$)/.test(pathname)) return '/teacher/inbox';
    const studentRoom = /^\/teacher\/students\/([^/]+)/.exec(pathname);
    if (studentRoom) return `/teacher/students/${studentRoom[1]}`;
    return pathname;
  }
  const params = new URLSearchParams(search);
  if (!params.has('section')) return ''; // The hub first resolves remembered section.
  const section = params.get('section') === 'rc' ? 'rc' : 'lr';
  const view = ['in-progress', 'completed', 'saved'].includes(params.get('view') ?? '') ? params.get('view') : 'create';
  const stage = ['analytics', 'type-drill'].includes(params.get('stage') ?? '') ? params.get('stage') : 'default';
  const builder = params.has('builder') || stage === 'type-drill' || ['saved', 'passages', 'count', 'timing', 'secondsPerPassage', 'reveal', 'start', 'assignment', 'assignmentId', 'ptRun', 'ptLeg', 'timedSection'].some(key => params.has(key));
  const mode = params.get('builder') === 'manual' || (!params.has('builder') && params.has('passages')) ? 'manual' : 'automatic';
  return `${pathname}|${section}|${view}|${section === 'rc' ? stage === 'analytics' ? 'analytics' : builder ? `builder:${mode}` : 'landing' : stage}`;
}

/** Presentation only: motionKey must describe navigation, never session/data updates. */
export function useClassroomMotion(ref: RefObject<HTMLElement>, motionKey: string) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !motionKey || root.closest(EXCLUDED)) return;
    const enteredAt = performance.now();
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add('(prefers-reduced-motion: no-preference)', () => {
        // Turning motion back on later must not replay an already-read page.
        if (performance.now() - enteredAt > 300) return;
        const eligible = (element: HTMLElement) => !element.closest(EXCLUDED) && !element.querySelector(EXCLUDED)
          && (!element.closest('.classroom-motion-local') || element.closest('.classroom-motion-local') === root)
          && !element.querySelector('.classroom-motion-local')
          && !element.contains(document.activeElement)
          && element.getBoundingClientRect().height > 0
          && !['SCRIPT', 'STYLE', 'NAV'].includes(element.tagName);
        // Explicit targets take precedence; never animate both an ancestor and its child.
        const explicit = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-enter]'));
        let parent = root;
        for (let depth = 0; !explicit.length && depth < 4; depth++) {
          const children = Array.from(parent.children).filter((node): node is HTMLElement => node instanceof HTMLElement && eligible(node));
          if (children.length !== 1 || children[0].matches('section, article, header, [data-motion-reveal]')) break;
          parent = children[0];
        }
        const candidates = (explicit.length ? explicit : Array.from(parent.children).filter((node): node is HTMLElement => node instanceof HTMLElement))
          .filter(eligible);
        const topLevel = candidates.filter(element => !candidates.some(other => other !== element && other.contains(element)));
        // Read all geometry before writing animation styles.
        const positions = topLevel.map(element => ({ element, top: element.getBoundingClientRect().top }));
        const entering = positions.filter(row => row.top < window.innerHeight).slice(0, 6).map(row => row.element);
        const belowFold = positions.filter(row => row.top >= window.innerHeight).map(row => row.element);
        const markedReveals = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-reveal]')).filter(eligible)
          .filter(element => !topLevel.some(other => other.contains(element)))
          .filter(element => element.getBoundingClientRect().top >= window.innerHeight);
        const revealCandidates = [...new Set([...belowFold, ...markedReveals])];
        const reveals = revealCandidates.filter(element => !revealCandidates.some(other => other !== element && other.contains(element))).slice(0, 12);
        const entrance = gsap.timeline();
        if (entering.length) entrance.fromTo(entering, { y: 10, opacity: 0.15 }, {
          y: 0, opacity: 1, duration: 0.45, ease: 'power3.out',
          stagger: entering.length > 1 ? 0.16 / (entering.length - 1) : 0,
          clearProps: 'transform,opacity',
        });
        const documentScrolled = (element: HTMLElement) => {
          for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
            const overflow = getComputedStyle(ancestor).overflowY;
            if (/(hidden|clip)/.test(overflow) || /(auto|scroll)/.test(overflow) && ancestor.scrollHeight > ancestor.clientHeight) return false;
          }
          return true;
        };
        // Below-fold content keeps its normal styles until a reachable trigger fires.
        const scrollTweens = reveals.filter(documentScrolled).map(element => ({ element, tween: gsap.fromTo(element,
          { y: 10, opacity: 0.15 },
          { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out', clearProps: 'transform,opacity', immediateRender: false,
            scrollTrigger: { trigger: element, start: 'clamp(top 94%)', once: true, toggleActions: 'play none none none' } },
        ) }));
        let refreshTimer: ReturnType<typeof setTimeout> | undefined;
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
          clearTimeout(refreshTimer);
          refreshTimer = setTimeout(() => scrollTweens.forEach(({ element, tween }) => {
            if (element.getBoundingClientRect().top < window.innerHeight) {
              // Async layout already exposed this section. Settle without a new fade.
              tween.scrollTrigger?.kill(); tween.progress(1);
            } else tween.scrollTrigger?.refresh();
          }), 100);
        });
        // display:contents has no measured box; watch its actual content instead.
        Array.from(root.children).forEach(element => observer?.observe(element));
        // Keyboard focus makes its destination fully visible immediately.
        const onFocus = (event: FocusEvent) => {
          if (!(event.target instanceof Node)) return;
          if (entering.some(element => element.contains(event.target as Node))) entrance.progress(1);
          scrollTweens.forEach(({ element, tween }) => {
            if (element.contains(event.target as Node)) { tween.progress(1); tween.scrollTrigger?.kill(); }
          });
        };
        root.addEventListener('focusin', onFocus);
        return () => { root.removeEventListener('focusin', onFocus); observer?.disconnect(); clearTimeout(refreshTimer); };
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, [ref, motionKey]);
}
