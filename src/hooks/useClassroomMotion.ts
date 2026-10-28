import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create('classroom-reference-out', '0,0,0.58,1');
export const CLASSROOM_LIST_REVEAL = { duration: 0.24, ease: 'power3.out', y: 8, opacity: 0 } as const;
export const CLASSROOM_REVEAL = { duration: 0.3, ease: 'classroom-reference-out', y: 14, opacity: 0, filter: 'blur(10px)' } as const;

// rct-page also names the instructions and picker; only rct-run is immersive work.
const EXCLUDED = '[data-motion="off"], [data-motion-skip], .rct-run';
export type ClassroomListIntent = 'filter' | 'restore' | 'paginate';
const listOwners = new WeakMap<HTMLElement, (intent: ClassroomListIntent) => void>();

/** Resolve the first actual owner, including a reduced-motion owner, across portals via the caller's page ref. */
export function notifyClassroomListIntent(element: HTMLElement | null, intent: ClassroomListIntent) {
  for (let node = element; node; node = node.parentElement) {
    const owner = listOwners.get(node);
    if (owner) { owner(intent); return; }
  }
}

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
    let handleIntent = (_intent: ClassroomListIntent) => {};
    const owner = (intent: ClassroomListIntent) => {
      handleIntent(intent);
      if (intent === 'restore') queueMicrotask(() => {
        // A child's layout restore may reach the outgoing owner. Leave the
        // marker for its replacement's first discovery before cleaning it up.
        if (listOwners.get(root) === owner) consumeRestore();
      });
    };
    listOwners.set(root, owner);
    const consumeRestore = () => {
      let restored = false;
      root.querySelectorAll<HTMLElement>('[data-motion-list-restore]').forEach(marker => {
        for (let node: HTMLElement | null = marker; node; node = node.parentElement) {
          const registered = listOwners.get(node);
          if (!registered) continue;
          if (registered === owner) { marker.removeAttribute('data-motion-list-restore'); restored = true; }
          break;
        }
      });
      return restored;
    };
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
        const records: Array<{ element: HTMLElement; tween: gsap.core.Tween; scroller?: HTMLElement; list: boolean; listEntry: { entered: boolean } }> = [];
        let listInteraction = consumeRestore();
        let keyboardInteraction = false;
        const selector = '[data-motion-item], [data-motion-enter], [data-motion-reveal]';
        const listOnly = (element: HTMLElement) => !!element.closest('[data-motion-policy="list-only"]');
        const eligible = (element: HTMLElement) => !element.closest(EXCLUDED) && !element.querySelector(EXCLUDED)
          && (!listOnly(element) || !!element.closest('[data-motion-list]'))
          && !element.querySelector('[data-motion-policy="list-only"]')
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
        const entering = new Map<gsap.core.Tween, HTMLElement>();
        let revealFrame: number | undefined;
        const queueListEntry = (tween: gsap.core.Tween, element: HTMLElement) => {
          entering.set(tween, element);
          if (revealFrame !== undefined) return;
          revealFrame = requestAnimationFrame(() => {
            revealFrame = undefined;
            const batch = [...entering.entries()].sort((a, b) => {
              const order = a[1].compareDocumentPosition(b[1]);
              return order & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : order & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
            });
            entering.clear();
            const stagger = Math.min(0.05, 0.15 / Math.max(1, batch.length - 1));
            batch.forEach(([animation], index) => animation.delay(index * stagger).restart(true));
          });
        };
        const settle = (record: typeof records[number]) => { if (record.list) record.listEntry.entered = true; entering.delete(record.tween); record.tween.scrollTrigger?.kill(); record.tween.progress(1); };
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
          records.filter(record => record.element.querySelector('[data-motion-list] [data-motion-item]')
            || record.element.closest('[data-motion-policy="list-only"]') && record.element.querySelector('[data-motion-item]')).forEach(settle);
          candidates = candidates.filter(element => !element.querySelector('[data-motion-item]'));
          candidates = candidates.filter(element => !candidates.some(other => other !== element && other.contains(element)));
          // Child layout restoration can focus a cached row before this parent
          // owner registers. Suppress the whole list before any first-paint tween.
          if (initial && candidates.some(element => element.closest('[data-motion-list]') && element.contains(document.activeElement))) {
            listInteraction = true;
            records.filter(record => record.list).forEach(settle);
          }
          candidates.filter(element => element.contains(document.activeElement)).forEach(element => {
            const id = identity(element); finishPending(id); seen.add(element); completedIds.add(id);
          });
          candidates.filter(element => !seen.has(element) && !completedIds.has(identity(element)) && eligible(element)).forEach(element => {
            const id = identity(element);
            const list = !!element.closest('[data-motion-list]');
            if (list && listInteraction) { seen.add(element); completedIds.add(id); return; }
            const preset = list ? CLASSROOM_LIST_REVEAL : CLASSROOM_REVEAL;
            const group = element.closest('[data-motion-group], [data-motion-list]') ?? element.parentElement ?? root;
            const groupId = group === root ? 'root' : identity(group);
            const waiting = pending.get(id);
            const index = waiting?.index ?? groups.get(groupId) ?? 0;
            if (!waiting) {
              if (!list && (index >= 4 || count >= 24)) { seen.add(element); completedIds.add(id); return; }
              groups.set(groupId, index + 1); if (!list) count++;
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
              gsap.set(element, { y: preset.y, opacity: preset.opacity, ...(list ? {} : { filter: CLASSROOM_REVEAL.filter }) });
              return;
            }
            if (waiting) { clearTimeout(waiting.timer); pending.delete(id); }
            seen.add(element); completedIds.add(id);
            // Capture before GSAP construction: onEnter can run synchronously.
            const listEntry = { entered: false };
            const tween = gsap.fromTo(element,
              { y: preset.y, opacity: preset.opacity, ...(list ? {} : { filter: CLASSROOM_REVEAL.filter }) },
              { y: 0, opacity: 1, ...(list ? {} : { filter: 'blur(0px)' }), duration: preset.duration, ease: preset.ease,
                delay: list ? 0 : 0.05 + (reachable ? 0 : 0.15 * index), ...(list ? { paused: true } : {}), clearProps: 'transform,opacity,filter',
                ...(reachable ? { immediateRender: true, scrollTrigger: {
                  trigger: element, scroller, start: 'clamp(top bottom-=100)', once: true,
                  toggleActions: list ? 'none none none none' : 'play none none none',
                  ...(list ? { onEnter: (trigger: ScrollTrigger) => { if (trigger.animation) { listEntry.entered = true; queueListEntry(trigger.animation as gsap.core.Tween, element); } } } : {}),
                } } : {}),
              });
            records.push({ element, tween, scroller, list, listEntry });
            if (list && !reachable) { listEntry.entered = true; queueListEntry(tween, element); }
          });
        };
        scope.add(() => discover(true));
        let timer: ReturnType<typeof setTimeout> | undefined;
        const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => records.forEach(record => {
            if (!record.tween.scrollTrigger) return;
            if (record.list && record.listEntry.entered) return;
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
        // Once someone starts using a list, filtering and keyboard travel must stay immediate.
        const settleLists = () => {
          listInteraction = true;
          records.filter(record => record.list).forEach(settle);
          pending.forEach((waiting, id) => { if (waiting.element.closest('[data-motion-list]')) scope.add(() => finishPending(id)); });
        };
        handleIntent = intent => {
          if (intent === 'paginate') { if (!keyboardInteraction) listInteraction = false; return; }
          settleLists();
        };
        const useList = (event: Event) => {
          if (event instanceof KeyboardEvent && ['Meta', 'Control', 'Shift', 'Alt', 'Escape'].includes(event.key)) return;
          keyboardInteraction = true; settleLists();
        };
        root.addEventListener('keydown', useList); root.addEventListener('input', useList); root.addEventListener('change', useList);
        root.addEventListener('focusin', interact); root.addEventListener('pointerdown', interact);
        window.addEventListener('beforeprint', settleLists);
        return () => {
          root.removeEventListener('keydown', useList); root.removeEventListener('input', useList); root.removeEventListener('change', useList);
          root.removeEventListener('focusin', interact); root.removeEventListener('pointerdown', interact);
          window.removeEventListener('beforeprint', settleLists);
          mutations.disconnect(); resize?.disconnect(); clearTimeout(timer);
          if (revealFrame !== undefined) cancelAnimationFrame(revealFrame); entering.clear();
          pending.forEach(waiting => clearTimeout(waiting.timer)); pending.clear(); scope.revert();
          handleIntent = () => {};
        };
      });
    }, root);
    consumeRestore(); // Reduced-motion owners consume markers without animating.
    return () => { media.revert(); context.revert(); if (listOwners.get(root) === owner) listOwners.delete(root); };
  }, [ref, motionKey]);
}
