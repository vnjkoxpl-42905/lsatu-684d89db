import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create('classroom-reference-out', '0,0,0.58,1');
export const CLASSROOM_REVEAL = { duration: 0.3, ease: 'classroom-reference-out', y: 14, opacity: 0, filter: 'blur(10px)' } as const;

// rct-page also names the instructions and picker; only rct-run is immersive work.
const EXCLUDED = '[data-motion="off"], [data-motion-skip], .rct-run';

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

/** Presentation only. Explicit items/ready gates support asynchronous page sections. */
export function useClassroomMotion(ref: RefObject<HTMLElement>, motionKey: string) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !motionKey || root.closest(EXCLUDED)) return;
    const enteredAt = performance.now();
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add('(prefers-reduced-motion: no-preference)', () => {
        if (performance.now() - enteredAt > 300) return;
        const scope = gsap.context(() => {}, root);
        const seen = new WeakSet<HTMLElement>();
        const completedIds = new Set<string>();
        const groups = new Map<string, number>();
        const identity = (element: Element): string => {
          const named = element.getAttribute('data-motion-id');
          if (named) return `id:${named}`;
          const parts: string[] = [];
          for (let node: Element | null = element; node && node !== root; node = node.parentElement) {
            // A replacement in the same rendered slot is a refresh, even if its tag changes.
            parts.unshift(String(Array.from(node.parentElement?.children ?? []).indexOf(node)));
          }
          return `slot:${parts.join('/')}`;
        };
        const pending = new Map<string, { element: HTMLElement; timer: ReturnType<typeof setTimeout>; index: number }>();
        const records: Array<{ element: HTMLElement; tween: gsap.core.Tween; scroller?: HTMLElement }> = [];
        const selector = '[data-motion-item], [data-motion-enter], [data-motion-reveal]';
        const eligible = (element: HTMLElement) => !element.closest(EXCLUDED) && !element.querySelector(EXCLUDED)
          && (!element.closest('.classroom-motion-local') || element.closest('.classroom-motion-local') === root)
          && !element.querySelector('.classroom-motion-local') && !element.contains(document.activeElement)
          && !element.matches('nav, script, style, [role="status"], [data-motion-loading]')
          && element.getBoundingClientRect().height > 0;
        const scrollContainer = (element: HTMLElement): HTMLElement | undefined | null => {
          for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
            const overflow = getComputedStyle(node).overflowY;
            if (/(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight) return node;
            if (/(hidden|clip)/.test(overflow) && node.scrollHeight > node.clientHeight) return null;
          }
          return undefined;
        };
        const viewport = (scroller?: HTMLElement) => ({ top: scroller?.getBoundingClientRect().top ?? 0, height: scroller?.clientHeight ?? window.innerHeight });
        const inView = (element: HTMLElement, scroller?: HTMLElement) => {
          const box = viewport(scroller), rect = element.getBoundingClientRect();
          return rect.top < box.top + box.height - 100 && rect.bottom > box.top;
        };
        const settle = ({ tween }: typeof records[number]) => { tween.scrollTrigger?.kill(); tween.progress(1); };
        const finishPending = (id: string) => {
          const waiting = pending.get(id);
          if (!waiting) return;
          clearTimeout(waiting.timer); pending.delete(id);
          completedIds.add(id); seen.add(waiting.element);
          gsap.set(waiting.element, { y: 0, opacity: 1, filter: 'blur(0px)', clearProps: 'transform,opacity,filter' });
        };
        let count = 0;
        const discover = (initial = false) => {
          let candidates = Array.from(root.querySelectorAll<HTMLElement>(selector));
          if (!candidates.length && initial) {
            let parent = root;
            for (let depth = 0; depth < 4; depth++) {
              const children = Array.from(parent.children).filter((node): node is HTMLElement => node instanceof HTMLElement && eligible(node));
              if (children.length !== 1 || children[0].matches('section, article, header')) break;
              parent = children[0];
            }
            candidates = Array.from(parent.children).filter((node): node is HTMLElement => node instanceof HTMLElement);
          }
          // A loaded pane may introduce granular items after its loading wrapper.
          // Release that wrapper before its children animate; never blur both levels.
          pending.forEach((waiting, id) => { if (waiting.element.querySelector('[data-motion-item]')) finishPending(id); });
          candidates = candidates.filter(element => !element.querySelector('[data-motion-item]'));
          candidates = candidates.filter(element => !candidates.some(other => other !== element && other.contains(element)));
          candidates.filter(element => element.contains(document.activeElement)).forEach(element => {
            const id = identity(element); finishPending(id); seen.add(element); completedIds.add(id);
          });
          candidates.filter(element => !seen.has(element) && !completedIds.has(identity(element)) && eligible(element)).forEach(element => {
            const id = identity(element);
            const group = element.closest('[data-motion-group]') ?? element.parentElement ?? root;
            const groupId = group === root ? 'root' : identity(group);
            const waiting = pending.get(id);
            const index = waiting?.index ?? groups.get(groupId) ?? 0;
            if (!waiting) {
              if (index >= 4 || count >= 24) { seen.add(element); completedIds.add(id); return; }
              groups.set(groupId, index + 1); count++;
            }
            const scroller = scrollContainer(element);
            if (scroller === null) { completedIds.add(id); return; }
            const box = viewport(scroller), rect = element.getBoundingClientRect();
            const below = rect.top >= box.top + box.height - 100;
            const maximum = scroller ? scroller.scrollHeight - scroller.clientHeight : Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
            const start = rect.top - box.top + (scroller?.scrollTop ?? window.scrollY) - box.height + 100;
            const reachable = below && maximum > 0 && start <= maximum;
            if (below && !reachable) { completedIds.add(id); return; }
            if (element.closest('[aria-busy="true"], [data-motion-ready="false"]')) {
              if (waiting) waiting.element = element;
              else pending.set(id, { element, index, timer: setTimeout(() => scope.add(() => finishPending(id)), 1000) });
              // Never paint an in-view loading target and then hide it when ready.
              gsap.set(element, { y: CLASSROOM_REVEAL.y, opacity: CLASSROOM_REVEAL.opacity, filter: CLASSROOM_REVEAL.filter });
              return;
            }
            if (waiting) { clearTimeout(waiting.timer); pending.delete(id); }
            seen.add(element); completedIds.add(id);
            const tween = gsap.fromTo(element,
              { y: CLASSROOM_REVEAL.y, opacity: CLASSROOM_REVEAL.opacity, filter: CLASSROOM_REVEAL.filter },
              { y: 0, opacity: 1, filter: 'blur(0px)', duration: CLASSROOM_REVEAL.duration, ease: CLASSROOM_REVEAL.ease,
                delay: 0.05 + (reachable ? 0 : 0.15 * index), clearProps: 'transform,opacity,filter',
                ...(reachable ? { immediateRender: true, scrollTrigger: { trigger: element, scroller, start: 'clamp(top bottom-=100)', once: true, toggleActions: 'play none none none' } } : {}),
              });
            records.push({ element, tween, scroller });
          });
        };
        scope.add(() => discover(true));
        let timer: ReturnType<typeof setTimeout> | undefined;
        const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => records.forEach(record => {
            if (!record.tween.scrollTrigger) return;
            if (inView(record.element, record.scroller)) settle(record);
            else record.tween.scrollTrigger.refresh();
          }), 100);
        });
        Array.from(root.children).forEach(element => resize?.observe(element));
        // New section nodes/readiness only. Text, timer ticks and animation styles never replay.
        const mutations = new MutationObserver(changes => {
          const relevant = changes.some(change => change.type === 'attributes' || Array.from(change.addedNodes).some(node => node instanceof HTMLElement && (node.matches(selector) || node.querySelector(selector))));
          if (relevant) scope.add(() => discover());
        });
        mutations.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-busy', 'data-motion-ready'] });
        const interact = (event: Event) => {
          if (!(event.target instanceof Node)) return;
          records.filter(record => record.element.contains(event.target as Node)).forEach(settle);
          pending.forEach((waiting, id) => { if (waiting.element.contains(event.target as Node)) scope.add(() => finishPending(id)); });
        };
        root.addEventListener('focusin', interact); root.addEventListener('pointerdown', interact);
        return () => {
          root.removeEventListener('focusin', interact); root.removeEventListener('pointerdown', interact);
          mutations.disconnect(); resize?.disconnect(); clearTimeout(timer);
          pending.forEach(waiting => clearTimeout(waiting.timer)); pending.clear(); scope.revert();
        };
      });
    }, root);
    return () => { media.revert(); context.revert(); };
  }, [ref, motionKey]);
}
