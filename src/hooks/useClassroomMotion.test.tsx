import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mock = vi.hoisted(() => ({ fromTo: vi.fn(), set: vi.fn(), revert: vi.fn(), media: vi.fn(), reduced: false }));
vi.mock('gsap', () => ({ gsap: {
  registerPlugin: vi.fn(),
  context: (work: () => void) => { work(); return { add: (callback: () => void) => callback(), revert: mock.revert }; },
  matchMedia: () => {
    const cleanups: Array<() => void> = [];
    return { add: (_: string, work: () => unknown) => { mock.media(work); if (!mock.reduced) { const dispose = work(); if (typeof dispose === 'function') cleanups.push(dispose as () => void); } }, revert: () => { cleanups.forEach(dispose => dispose()); mock.revert(); } };
  },
  fromTo: mock.fromTo, set: mock.set,
} }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));
vi.mock('gsap/CustomEase', () => ({ CustomEase: { create: vi.fn() } }));
vi.mock('@/hooks/useUserPermissions', () => ({ useUserPermissions: () => ({ loading: false, is_admin: true }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: false, isPending: false }) }));
import { classroomMotionKey, CLASSROOM_REVEAL, notifyClassroomListIntent, useClassroomMotion } from './useClassroomMotion';
import { StudentDestination } from '@/pages/StudentDestination';
import { ClassroomMotionContent } from '@/components/classroom/shell/ClassroomMotionContent';
import { TeachingNotesArchive } from '@/components/my-work/TeachingNotesArchive';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import MyWorkPage from '@/pages/MyWorkPage';
import { ClassroomItemView } from '@/components/classroom/ClassroomRouteViews';
const archiveFixture = vi.hoisted(() => ({ data: [] as ClassroomItem[], loading: false }));
const workFixture = vi.hoisted(() => ({ rows: [] as any[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'motion-student' } }) }));
vi.mock('@/hooks/useClassroomItems', () => ({ useClassroomItems: () => ({ data: archiveFixture.data, isLoading: archiveFixture.loading, error: null }) }));
vi.mock('@/hooks/useAssignedTodoFeed', () => ({ useAssignedTodoFeed: () => ({ rows: workFixture.rows, loading: false, failed: false, retry: vi.fn() }), routeWithReturnTo: (route: string, returnTo: string) => `${route}?returnTo=${encodeURIComponent(returnTo)}` }));
vi.mock('@/components/classroom/PrescribedWeek', () => ({ default: () => null }));
vi.mock('@/hooks/useStudentAssignments', () => ({ useStudentAssignment: vi.fn(), useStudentTAAssignment: vi.fn(), markTAAssignmentCompleted: vi.fn(), markTAAssignmentViewed: vi.fn() }));
vi.mock('@/hooks/useExternalWorkUploads', () => ({ useStudentExternalUploads: vi.fn() }));
vi.mock('@/hooks/useHomeworkSets', () => ({ useHomeworkSet: vi.fn() }));
vi.mock('@/components/classroom/StructuredTAAssignmentWorkspace', () => ({ default: () => null }));
vi.mock('@/components/classroom/ClassroomMarkdown', () => ({ default: () => null }));
vi.mock('@/lib/markNoteRead', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/markNoteRead')>(), markNoteRead: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/drillLaunch', () => ({ launchDrill: vi.fn() }));
afterEach(() => { cleanup(); sessionStorage.clear(); document.body.innerHTML = ''; mock.reduced = false; vi.useRealTimers(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('classroom motion navigation identity', () => {
  it('waits for remembered section resolution and normalizes legacy RC setup', () => {
    expect(classroomMotionKey('/practice/drills', '')).toBe('');
    expect(classroomMotionKey('/practice/drills', '?section=rc&stage=type-drill&passages=12'))
      .toBe(classroomMotionKey('/practice/drills', '?section=rc&builder=manual&passages=12&view=create'));
  });
  it('distinguishes actual stages while ignoring finder and filter-only parameters', () => {
    const key = (search: string) => classroomMotionKey('/practice/drills', search);
    expect(key('?section=lr&stage=type-drill')).not.toBe(key('?section=lr'));
    expect(key('?section=rc&saved=one')).not.toBe(key('?section=rc'));
    expect(key('?section=rc&builder=automatic&finder=open')).toBe(key('?section=rc&builder=automatic'));
  });
  it('permits ordinary library destinations and excludes active sessions', () => {
    expect(classroomMotionKey('/library/activities', '')).toBe('/library/activities');
    expect(classroomMotionKey('/rc/drill', '?sessionId=one')).toBe('');
    expect(classroomMotionKey('/testing/test/one', '')).toBe('');
    expect(classroomMotionKey('/quick-drills/unless-drill', '')).toBe('');
    expect(classroomMotionKey('/conditional-indicators-refresher', '')).toBe('');
    expect(classroomMotionKey('/classroom/ta/assigned', '')).toBe('');
    expect(classroomMotionKey('/classroom/assigned', '')).toBe('');
  });
  it('keeps master/detail message and student rooms on one entrance identity', () => {
    expect(classroomMotionKey('/inbox/abc', '')).toBe(classroomMotionKey('/inbox', ''));
    expect(classroomMotionKey('/teacher/inbox/abc', '')).toBe(classroomMotionKey('/teacher/inbox', ''));
    expect(classroomMotionKey('/teacher/students/one/notes', '')).toBe(classroomMotionKey('/teacher/students/one/progress', ''));
  });
});

describe('reference motion safety', () => {
  function geometry(element: HTMLElement, top = 20) {
    element.getBoundingClientRect = () => ({ height: 100, top, bottom: top + 100 }) as DOMRect;
  }
  function mount(content: string) {
    const root = document.createElement('div'); root.innerHTML = content; document.body.append(root);
    root.querySelectorAll<HTMLElement>('*').forEach(element => geometry(element, element.hasAttribute('data-below') ? 1400 : 20));
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 4000 });
    mock.set.mockImplementation((element: HTMLElement, vars: Record<string, unknown>) => {
      if (vars.clearProps) { element.style.opacity = ''; element.style.filter = ''; }
      else { element.style.opacity = String(vars.opacity); element.style.filter = String(vars.filter); }
    });
    mock.fromTo.mockImplementation(() => { const animation = { delay: vi.fn(), play: vi.fn(), restart: vi.fn(), progress: vi.fn(), kill: vi.fn(), scrollTrigger: { refresh: vi.fn(), kill: vi.fn() } }; animation.delay.mockReturnValue(animation); return animation; });
    return { root, run: () => renderHook(() => useClassroomMotion({ current: root }, 'destination')) };
  }
  it('uses the verified uniform preset and bounds a group to four blocks', () => {
    const { run } = mount('<div data-motion-group>'+Array.from({ length: 7 }, (_, i) => `<section data-motion-item>Block ${i}</section>`).join('')+'</div>');
    run(); expect(mock.fromTo).toHaveBeenCalledTimes(4);
    expect(CLASSROOM_REVEAL).toMatchObject({ duration: 0.3, y: 14, opacity: 0, filter: 'blur(10px)' });
    expect(mock.fromTo.mock.calls[0][2]).toMatchObject({ delay: 0.05, filter: 'blur(0px)' });
    expect(mock.fromTo.mock.calls[3][2].delay).toBeCloseTo(0.5);
  });
  it('opts reading lists into crisp bounded stagger beyond the ordinary group and page caps', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 90; });
    const { run } = mount('<div data-motion-list>'+Array.from({ length: 30 }, (_, i) => `<a data-motion-item data-motion-id="note:${i}">Note ${i}</a>`).join('')+'</div>');
    run(); expect(mock.fromTo).toHaveBeenCalledTimes(30);
    expect(mock.fromTo.mock.calls[0][1]).toEqual({ y: 8, opacity: 0 });
    expect(mock.fromTo.mock.calls[0][2]).toMatchObject({ duration: 0.24, delay: 0 });
    expect(mock.fromTo.mock.calls[29][2]).toMatchObject({ delay: 0, paused: true });
    frame!(0);
    const delays = mock.fromTo.mock.results.map(result => result.value.delay.mock.calls[0][0]);
    expect(new Set(delays).size).toBe(30);
    expect(delays[29]).toBeCloseTo(0.15);
    expect(mock.fromTo.mock.calls[0][2].filter).toBeUndefined();
  });
  it('reveals offscreen list rows once at the scroll boundary and settles keyboard travel immediately', () => {
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-motion-id="note:one" data-below>Later note</a></div>');
    run(); expect(mock.fromTo.mock.calls[0][2]).toMatchObject({ delay: 0, scrollTrigger: { once: true } });
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(mock.fromTo.mock.results[0].value.progress).toHaveBeenCalledWith(1);
  });
  it('staggers actual same-frame scroll entries in DOM order across former index wrap boundaries', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 91; });
    const { root, run } = mount('<div data-motion-list>'+Array.from({ length: 5 }, (_, i) => `<a data-motion-item data-motion-id="note:${i}" ${i >= 3 ? 'data-below' : ''}>Note ${i}</a>`).join('')+'</div>');
    run();
    frame!(0); // Initial visible rows are a separate entry frame.
    const fourth = mock.fromTo.mock.results[3].value, fifth = mock.fromTo.mock.results[4].value;
    // Simulate callbacks arriving in reverse order during one scroll frame.
    mock.fromTo.mock.calls[4][2].scrollTrigger.onEnter({ animation: fifth });
    mock.fromTo.mock.calls[3][2].scrollTrigger.onEnter({ animation: fourth });
    expect(fourth.restart).not.toHaveBeenCalled(); frame!(0);
    expect(fourth.delay).toHaveBeenCalledWith(0);
    expect(fifth.delay).toHaveBeenCalledWith(0.05);
    expect(fourth.restart).toHaveBeenCalledWith(true); expect(fifth.restart).toHaveBeenCalledWith(true);
    expect(root.querySelectorAll('[data-motion-item]')).toHaveLength(5);
  });
  it('distributes larger scroll batches across 150ms without identical trailing delays', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 92; });
    const { run } = mount('<div data-motion-list>'+Array.from({ length: 8 }, (_, i) => `<a data-motion-item data-motion-id="note:${i}" data-below>Note ${i}</a>`).join('')+'</div>');
    run();
    mock.fromTo.mock.calls.forEach((call, index) => call[2].scrollTrigger.onEnter({ animation: mock.fromTo.mock.results[index].value }));
    frame!(0);
    const delays = mock.fromTo.mock.results.map(result => result.value.delay.mock.calls[0][0] as number);
    expect(new Set(delays).size).toBe(8);
    expect(delays[0]).toBe(0); expect(delays[7]).toBeCloseTo(0.15);
    expect(delays.every((delay, index) => index === 0 || delay > delays[index - 1])).toBe(true);
  });
  it('does not replay filtered list identities or animate new results after input', async () => {
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-motion-id="note:one">One</a></div>');
    run(); const group = root.firstElementChild!;
    const replacement = document.createElement('a'); replacement.dataset.motionItem = ''; replacement.dataset.motionId = 'note:one'; geometry(replacement);
    group.replaceChildren(replacement); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    root.dispatchEvent(new Event('input', { bubbles: true }));
    const result = document.createElement('a'); result.dataset.motionItem = ''; result.dataset.motionId = 'note:two'; geometry(result);
    group.replaceChildren(result); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it('batches visible rows across semantic groups and gives async additions a fresh batch', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 93; });
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-motion-id="one">One</a></div><div data-motion-list><a data-motion-item data-motion-id="two">Two</a></div>');
    run(); frame!(0);
    expect(mock.fromTo.mock.results[0].value.delay).toHaveBeenCalledWith(0);
    expect(mock.fromTo.mock.results[1].value.delay).toHaveBeenCalledWith(0.05);
    const added = document.createElement('a'); added.dataset.motionItem = ''; added.dataset.motionId = 'three'; geometry(added);
    root.lastElementChild!.append(added); await Promise.resolve(); frame!(0);
    expect(mock.fromTo.mock.results[2].value.delay).toHaveBeenCalledWith(0);
  });
  it('drops removed queued rows before computing the connected DOM-order batch', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 99; });
    const { root, run } = mount('<ul data-motion-list><li data-motion-item data-motion-id="one">One</li><li data-motion-item data-motion-id="removed">Removed</li><li data-motion-item data-motion-id="three">Three</li></ul>'); run();
    root.querySelectorAll('li')[1].remove(); frame!(0);
    const [first, removed, third] = mock.fromTo.mock.results.map(result => result.value);
    expect(first.delay).toHaveBeenCalledWith(0); expect(third.delay).toHaveBeenCalledWith(0.05);
    expect(removed.restart).not.toHaveBeenCalled(); expect(removed.kill).toHaveBeenCalledOnce();
  });
  it('prunes removed list records before resize/filter and keeps reinserted identities visible without replay', async () => {
    vi.useFakeTimers(); let resized: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
    const { root, run } = mount('<ul data-motion-list><li data-motion-item data-motion-id="one" data-below>One</li></ul>'); run();
    const row = root.querySelector('li')!, tween = mock.fromTo.mock.results[0].value;
    row.style.opacity = '0'; row.remove(); await Promise.resolve();
    expect(tween.kill).toHaveBeenCalledOnce(); expect(tween.scrollTrigger.kill).toHaveBeenCalledOnce();
    resized(); vi.advanceTimersByTime(100); notifyClassroomListIntent(root, 'filter');
    expect(tween.progress).not.toHaveBeenCalled(); expect(tween.scrollTrigger.refresh).not.toHaveBeenCalled();
    root.firstElementChild!.append(row); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1); expect(row.style.opacity).toBe('');
  });
  it('settles explicit portal/filter intent, cancels queued entries, and permits pointer pagination later', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 94; });
    const { root, run } = mount('<button>Filter</button><div data-motion-list><a data-motion-item data-motion-id="one">One</a></div>');
    run(); const tween = mock.fromTo.mock.results[0].value;
    notifyClassroomListIntent(root.querySelector('button'), 'filter'); frame!(0);
    expect(tween.progress).toHaveBeenCalledWith(1); expect(tween.restart).not.toHaveBeenCalled();
    const result = document.createElement('a'); result.dataset.motionItem = ''; result.dataset.motionId = 'two'; geometry(result);
    root.lastElementChild!.append(result); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    notifyClassroomListIntent(root, 'paginate');
    const more = document.createElement('a'); more.dataset.motionItem = ''; more.dataset.motionId = 'three'; geometry(more);
    root.lastElementChild!.append(more); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(2); frame!(0);
    expect(mock.fromTo.mock.results[1].value.restart).toHaveBeenCalledWith(true);
  });
  it('keeps keyboard settlement sticky even after pointer pagination and restore settlements', async () => {
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-motion-id="one">One</a></div>'); run();
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    notifyClassroomListIntent(root, 'paginate');
    const more = document.createElement('a'); more.dataset.motionItem = ''; more.dataset.motionId = 'two'; geometry(more);
    root.firstElementChild!.append(more); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    notifyClassroomListIntent(root, 'restore');
    expect(mock.fromTo.mock.results[0].value.progress).toHaveBeenCalledWith(1);
  });
  it.each(['Meta', 'Control', 'Shift', 'Alt', 'Escape'])('does not make %s keydown suppress later pointer pagination', async (key) => {
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-motion-id="one">One</a></div>'); run();
    notifyClassroomListIntent(root, 'filter');
    root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    notifyClassroomListIntent(root, 'paginate');
    const more = document.createElement('a'); more.dataset.motionItem = ''; more.dataset.motionId = 'two'; geometry(more);
    root.firstElementChild!.append(more); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(2);
    expect(mock.fromTo.mock.calls[1][2]).toMatchObject({ paused: true });
  });
  it.each(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])('keeps queued scroll reveals and pointer pagination after %s on a pointer-focused button', async (key) => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 101; });
    const { root, run } = mount('<button>Load more</button><ul data-motion-list><li data-motion-item data-motion-id="one" data-below>One</li></ul>'); run();
    const button = root.querySelector('button')!; button.focus();
    const tween = mock.fromTo.mock.results[0].value;
    mock.fromTo.mock.calls[0][2].scrollTrigger.onEnter({ animation: tween });
    button.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(tween.progress).not.toHaveBeenCalled(); frame!(0);
    expect(tween.restart).toHaveBeenCalledWith(true);
    notifyClassroomListIntent(root, 'paginate');
    const more = document.createElement('li'); more.dataset.motionItem = ''; more.dataset.motionId = 'two'; geometry(more);
    root.querySelector('ul')!.append(more); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(2);
  });
  it.each([...['PageDown', 'ArrowDown', 'Home', 'End', 'PageUp', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].map(key => ({ key, shiftKey: false })), { key: ' ', shiftKey: false }, { key: ' ', shiftKey: true }, { key: 'Spacebar', shiftKey: false }])('preserves pointer pagination after $key shift=$shiftKey on an archive-restored ordinary card link', async ({ key, shiftKey }) => {
    const { root, run } = mount('<ul data-motion-list><li data-motion-item data-motion-id="one"><a href="#one">One</a></li></ul>'); run();
    const link = root.querySelector('a')!; link.focus();
    notifyClassroomListIntent(root, 'restore');
    link.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
    notifyClassroomListIntent(root, 'paginate');
    const more = document.createElement('li'); more.dataset.motionItem = ''; more.dataset.motionId = 'two'; geometry(more);
    root.querySelector('ul')!.append(more); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(2);
    expect(mock.fromTo.mock.calls[1][2]).toMatchObject({ paused: true });
  });
  it.each([
    ['Tab', 'button'], ['Enter', 'button'], [' ', 'button'], ['Enter', 'a'],
    ['ArrowLeft', 'input'], ['x', 'textarea'], ['End', '[contenteditable]'], ['ArrowDown', '[role="combobox"]'],
  ])('keeps meaningful %s interaction on %s immediate and sticky', async (key, selector) => {
    const { root, run } = mount('<button>Control</button><input /><textarea></textarea><div contenteditable="true"></div><div role="combobox" tabindex="0"></div><ul data-motion-list><li data-motion-item data-motion-id="one"><a href="#one">One</a></li></ul>'); run();
    const target = root.querySelector(selector)!;
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    expect(mock.fromTo.mock.results[0].value.progress).toHaveBeenCalledWith(1);
    notifyClassroomListIntent(root, 'paginate');
    const more = document.createElement('li'); more.dataset.motionItem = ''; more.dataset.motionId = 'two'; geometry(more);
    root.querySelector('ul')!.append(more); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it('resolves only the nearest registered owner, including reduced-motion owners, and unregisters', () => {
    const outer = mount('<div data-motion-list><a data-motion-item>Outer</a></div><div class="classroom-motion-local"><div data-motion-list><a data-motion-item>Inner</a></div></div>');
    outer.run(); const outside = mock.fromTo.mock.results[0].value;
    const innerRoot = outer.root.lastElementChild as HTMLElement;
    const inner = renderHook(() => useClassroomMotion({ current: innerRoot }, 'inner'));
    const inside = mock.fromTo.mock.results[1].value;
    notifyClassroomListIntent(innerRoot.firstElementChild as HTMLElement, 'filter');
    expect(inside.progress).toHaveBeenCalledWith(1); expect(outside.progress).not.toHaveBeenCalled();
    inner.unmount(); mock.reduced = true;
    const reduced = renderHook(() => useClassroomMotion({ current: innerRoot }, 'reduced'));
    notifyClassroomListIntent(innerRoot.firstElementChild as HTMLElement, 'restore');
    expect(outside.progress).not.toHaveBeenCalled();
    reduced.unmount(); notifyClassroomListIntent(innerRoot, 'restore');
    expect(outside.progress).toHaveBeenCalledWith(1);
  });
  it.each([false, true])('cleans delayed restore markers after the registered owner handles them, reduced=%s', async (reduced) => {
    mock.reduced = reduced;
    const { root, run } = mount('<section><div data-motion-list><a data-motion-item>Row</a></div></section>'); run();
    const archive = root.firstElementChild as HTMLElement;
    archive.setAttribute('data-motion-list-restore', '');
    notifyClassroomListIntent(archive, 'restore');
    expect(archive).toHaveAttribute('data-motion-list-restore');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(archive).not.toHaveAttribute('data-motion-list-restore');
  });
  it('preserves an outgoing owner restore marker for replacement discovery before microtask cleanup', async () => {
    const { root } = mount('<section data-motion-policy="list-only"><h2 tabindex="-1">Archive</h2><div data-motion-list><a data-motion-item>Row</a></div></section>');
    const ref = { current: root };
    const hook = renderHook(({ key }) => useClassroomMotion(ref, key), { initialProps: { key: 'old' } });
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    const archive = root.firstElementChild as HTMLElement;
    archive.setAttribute('data-motion-list-restore', ''); root.querySelector('h2')!.focus();
    notifyClassroomListIntent(archive, 'restore');
    hook.rerender({ key: 'new' });
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    expect(archive).not.toHaveAttribute('data-motion-list-restore');
    await new Promise<void>(resolve => queueMicrotask(resolve));
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it.each(['Loading your work…', 'Could not load', 'Nothing assigned', 'No matches', 'Loading notes', 'Notes unavailable', 'No notes', 'Personal notes'])('keeps list-only %s content immediate, including generic fallback', (text) => {
    const { root, run } = mount(`<div data-motion-policy="list-only"><section data-motion-item>${text}</section></div>`);
    run(); expect(mock.fromTo).not.toHaveBeenCalled();
    expect(root.querySelector('section')?.style.opacity).toBe('');
  });
  it('allows explicit nested list rows within list-only content while keeping generic content immediate', () => {
    const { run } = mount('<div data-motion-policy="list-only" data-motion-enter><header>Notes</header><section data-motion-item>Empty state</section><div data-motion-list><a data-motion-item>Actual note</a></div></div>');
    run(); expect(mock.fromTo).toHaveBeenCalledTimes(1);
    expect(mock.fromTo.mock.calls[0][0].textContent).toBe('Actual note');
    expect(mock.fromTo.mock.calls[0][1].filter).toBeUndefined();
  });
  it.each(['assigned loading', 'assigned error', 'assigned empty', 'assigned no-match', 'notes loading', 'notes error', 'notes empty', 'Personal notes'])('composes the real My Work policy with %s without a content entrance', (state) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 100, top: 20, bottom: 120 } as DOMRect);
    function Shell() {
      const ref = useRef<HTMLDivElement>(null); useClassroomMotion(ref, '/my-work/notes');
      return <div ref={ref}><Routes><Route element={<StudentDestination destination="my-work" />}><Route path="/my-work/notes" element={<section className="my-work-notes-page"><p role={state.includes('loading') ? 'status' : undefined}>{state}</p></section>} /></Route></Routes></div>;
    }
    render(<MemoryRouter initialEntries={['/my-work/notes']}><Shell /></MemoryRouter>);
    const content = document.querySelector('.student-destination-content')!;
    expect(content).toHaveAttribute('data-motion-policy', 'list-only');
    expect(mock.fromTo.mock.calls.filter(([element]) => content === element || content.contains(element))).toHaveLength(0);
  });
  it('prefers items over panes and protects navigation, local boundaries, focus and active runners', () => {
    const { root, run } = mount('<header data-motion-skip>Practice</header><div data-motion-enter><section data-motion-item>Body</section></div><main class="rct-run" data-motion-item>Recording</main><div class="classroom-motion-local"><section data-motion-item>Room</section></div><section data-motion-item><button>Focused</button></section>');
    root.querySelector('button')!.focus(); run();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    expect(mock.fromTo.mock.calls[0][0]).toBe(root.querySelector('section'));
  });
  it('uses the actual nested scroller and keeps unreachable sections visible', () => {
    const { root, run } = mount('<div style="overflow-y:auto"><section data-motion-item data-below>Later</section></div>');
    const scroller = root.firstElementChild as HTMLElement;
    Object.defineProperties(scroller, { scrollHeight: { value: 4000 }, clientHeight: { value: 600 } });
    run(); expect(mock.fromTo.mock.calls[0][2].scrollTrigger).toMatchObject({ scroller, once: true, start: 'clamp(top bottom-=100)' });
    mock.fromTo.mockClear();
    const unreachable = mount('<section data-motion-item data-below>Unreachable</section>');
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 0 });
    unreachable.run(); expect(mock.fromTo).not.toHaveBeenCalled();
  });
  it('queues paused opted-in list entries from their actual nested overflow scroller in DOM order', () => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 95; });
    const { root, run } = mount('<div style="overflow-y:auto"><ul data-motion-list><li data-motion-item data-below>First nested row</li><li data-motion-item data-below>Second nested row</li></ul></div>');
    const scroller = root.firstElementChild as HTMLElement;
    Object.defineProperties(scroller, { scrollHeight: { value: 4000 }, clientHeight: { value: 600 } });
    run();
    expect(mock.fromTo).toHaveBeenCalledTimes(2);
    mock.fromTo.mock.calls.forEach(call => expect(call[2]).toMatchObject({ paused: true, scrollTrigger: { scroller, once: true, start: 'clamp(top bottom)', toggleActions: 'none none none none' } }));
    const first = mock.fromTo.mock.results[0].value, second = mock.fromTo.mock.results[1].value;
    mock.fromTo.mock.calls[1][2].scrollTrigger.onEnter({ animation: second });
    mock.fromTo.mock.calls[0][2].scrollTrigger.onEnter({ animation: first });
    expect(first.restart).not.toHaveBeenCalled(); expect(second.restart).not.toHaveBeenCalled();
    frame!(0);
    expect(first.delay).toHaveBeenCalledWith(0); expect(second.delay).toHaveBeenCalledWith(0.05);
    expect(first.restart).toHaveBeenCalledWith(true); expect(second.restart).toHaveBeenCalledWith(true);
  });
  it('settles only opted-in list rows before printing and removes the print listener on unmount', () => {
    const { run } = mount('<section data-motion-item>Ordinary block</section><ul data-motion-list><li data-motion-item data-below>Offscreen list row</li></ul>');
    const hook = run();
    const block = mock.fromTo.mock.results[0].value, row = mock.fromTo.mock.results[1].value;
    window.dispatchEvent(new Event('beforeprint'));
    expect(row.progress).toHaveBeenCalledWith(1); expect(row.scrollTrigger.kill).toHaveBeenCalledOnce();
    expect(block.progress).not.toHaveBeenCalled();
    hook.unmount(); row.progress.mockClear();
    window.dispatchEvent(new Event('beforeprint'));
    expect(row.progress).not.toHaveBeenCalled();
  });
  it('waits for explicit asynchronous readiness and does not replay text updates', async () => {
    const { root, run } = mount('<section data-motion-item data-motion-ready="false" aria-busy="true">Loading</section>');
    run(); expect(mock.fromTo).not.toHaveBeenCalled();
    const section = root.firstElementChild as HTMLElement;
    expect(section.style.opacity).toBe('0');
    expect(section.style.filter).toBe('blur(10px)');
    section.textContent = 'Loaded content'; section.setAttribute('data-motion-ready', 'true'); section.setAttribute('aria-busy', 'false');
    await waitFor(() => expect(mock.fromTo).toHaveBeenCalledTimes(1));
    section.textContent = 'A later counter update';
    await Promise.resolve(); expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it('animates newly mounted marked sections without replaying existing blocks', async () => {
    const { root, run } = mount('<section data-motion-item>First</section>'); run();
    const added = document.createElement('section'); added.dataset.motionItem = ''; geometry(added); root.append(added);
    await waitFor(() => expect(mock.fromTo).toHaveBeenCalledTimes(2));
  });
  it('fast-forwards focused or pressed content and avoids late reduced-motion replay', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const { root, run } = mount('<section data-motion-item><button>Open</button></section>'); run();
    const tween = mock.fromTo.mock.results[0].value;
    root.querySelector('button')!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(tween.progress).toHaveBeenCalledWith(1);
    clock.mockReturnValue(1000); mock.media.mock.calls[0][0]();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it('does not hide anything when reduced motion is enabled', () => {
    mock.reduced = true; const { run } = mount('<section data-motion-item>Content</section>'); run();
    expect(mock.fromTo).not.toHaveBeenCalled();
  });
  it('settles slow readiness after one second and never hides that slot again', async () => {
    vi.useFakeTimers();
    const { root, run } = mount('<section data-motion-item data-motion-id="summary" data-motion-ready="false">Loading</section>');
    run(); const section = root.firstElementChild as HTMLElement;
    expect(section.style.opacity).toBe('0');
    vi.advanceTimersByTime(1000); expect(section.style.opacity).toBe('');
    section.setAttribute('data-motion-ready', 'true'); await Promise.resolve();
    expect(mock.fromTo).not.toHaveBeenCalled();
    expect(section.style.opacity).toBe('');
  });
  it('does not replay refreshed marked identities, but animates a genuinely new late section', async () => {
    const { root, run } = mount('<section data-motion-item data-motion-id="summary">First</section>'); run();
    const replacement = document.createElement('section'); replacement.dataset.motionItem = ''; replacement.dataset.motionId = 'summary'; geometry(replacement);
    root.firstElementChild!.replaceWith(replacement); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    const late = document.createElement('section'); late.dataset.motionItem = ''; late.dataset.motionId = 'late'; geometry(late); root.append(late);
    await waitFor(() => expect(mock.fromTo).toHaveBeenCalledTimes(2));
    expect(mock.fromTo.mock.calls[1][2].delay).toBeCloseTo(0.2);
  });
  it('settles an entering parent when asynchronous granular rows take ownership', async () => {
    const { root, run } = mount('<section data-motion-enter>Loading pane</section>'); run();
    const parentTween = mock.fromTo.mock.results[0].value;
    const group = document.createElement('div'); group.dataset.motionList = '';
    const item = document.createElement('a'); item.dataset.motionItem = ''; item.dataset.motionId = 'note:loaded'; geometry(item); group.append(item);
    root.firstElementChild!.replaceChildren(group);
    await waitFor(() => expect(mock.fromTo).toHaveBeenCalledTimes(2));
    expect(parentTween.progress).toHaveBeenCalledWith(1);
    expect(mock.fromTo.mock.calls[1][1].filter).toBeUndefined();
  });
  it('does not fast-forward a generic entering parent when non-list children are inserted', async () => {
    const { root, run } = mount('<section data-motion-enter>Generic pane</section>'); run();
    const parentTween = mock.fromTo.mock.results[0].value;
    const child = document.createElement('article'); child.dataset.motionItem = ''; geometry(child);
    root.firstElementChild!.append(child); await Promise.resolve();
    expect(parentTween.progress).not.toHaveBeenCalled();
  });
  it('uses rendered slots to avoid refresh replays without an explicit id', async () => {
    const { root, run } = mount('<section data-motion-item>First</section>'); run();
    const replacement = document.createElement('div'); replacement.dataset.motionItem = ''; geometry(replacement);
    root.firstElementChild!.replaceWith(replacement); await Promise.resolve();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it('releases a loading wrapper when its loaded granular items take ownership', async () => {
    const { root, run } = mount('<section data-motion-enter data-motion-ready="false">Loading</section>'); run();
    const wrapper = root.firstElementChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('0');
    const item = document.createElement('div'); item.dataset.motionItem = ''; geometry(item);
    wrapper.replaceChildren(item); wrapper.dataset.motionReady = 'true';
    await waitFor(() => expect(mock.fromTo).toHaveBeenCalledTimes(1));
    expect(wrapper.style.opacity).toBe('');
    expect(mock.fromTo.mock.calls[0][0]).toBe(item);
  });
  it('keeps group limits across discovery and starts independently scrolled sections at 50ms', async () => {
    const { root, run } = mount('<div data-motion-group><section data-motion-item>First</section><section data-motion-item data-below>Below</section></div>'); run();
    expect(mock.fromTo.mock.calls[1][2].delay).toBe(0.05);
    const group = root.firstElementChild!;
    for (let i = 0; i < 4; i++) { const node = document.createElement('section'); node.dataset.motionItem = ''; geometry(node); group.append(node); }
    await waitFor(() => expect(mock.fromTo).toHaveBeenCalledTimes(4));
    expect(mock.fromTo.mock.calls[2][2].delay).toBeCloseTo(0.35);
    expect(mock.fromTo.mock.calls[3][2].delay).toBeCloseTo(0.5);
  });
  it('keeps the minus-100px reveal boundary on initial resize and settles async-visible content', () => {
    vi.useFakeTimers();
    let resized: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resized = callback; }
      observe() {} disconnect() {}
    });
    const { root, run } = mount('<section data-motion-item>Later</section>');
    const section = root.firstElementChild as HTMLElement;
    geometry(section, window.innerHeight - 50); run();
    const tween = mock.fromTo.mock.results[0].value;
    resized(); vi.advanceTimersByTime(100);
    expect(tween.progress).not.toHaveBeenCalled();
    expect(tween.scrollTrigger.refresh).toHaveBeenCalledTimes(1);
    geometry(section, 100); resized(); vi.advanceTimersByTime(100);
    expect(tween.progress).toHaveBeenCalledWith(1);
    expect(tween.scrollTrigger.kill).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])('does not snap a list reveal on resize after entry, frame started=%s', (started) => {
    vi.useFakeTimers();
    let resized: () => void = () => {}, frame: FrameRequestCallback | undefined;
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 97; });
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-below>Entering row</a></div>'); run();
    const tween = mock.fromTo.mock.results[0].value;
    geometry(root.querySelector('a')!, 100);
    mock.fromTo.mock.calls[0][2].scrollTrigger.onEnter({ animation: tween });
    if (started) frame!(0);
    resized(); vi.advanceTimersByTime(100);
    expect(tween.progress).not.toHaveBeenCalled();
    expect(tween.scrollTrigger.refresh).not.toHaveBeenCalled();
    if (!started) { frame!(0); expect(tween.restart).toHaveBeenCalledWith(true); }
  });
  it('still settles an untriggered list row pushed into view by layout', () => {
    vi.useFakeTimers(); let resized: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
    const { root, run } = mount('<div data-motion-list><a data-motion-item data-below>Untriggered row</a></div>'); run();
    const tween = mock.fromTo.mock.results[0].value;
    geometry(root.querySelector('a')!, 100); resized(); vi.advanceTimersByTime(100);
    expect(tween.progress).toHaveBeenCalledWith(1);
    expect(tween.scrollTrigger.kill).toHaveBeenCalledOnce();
  });
  it.each([false, true])('immediately batches a partly visible list row in the bottom viewport band, nested=%s', (nested) => {
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 98; });
    const { root, run } = mount(nested ? '<div style="overflow-y:auto"><ul data-motion-list><li data-motion-item>Bottom band</li></ul></div>' : '<ul data-motion-list><li data-motion-item>Bottom band</li></ul>');
    if (nested) {
      const scroller = root.firstElementChild as HTMLElement;
      Object.defineProperties(scroller, { scrollHeight: { value: 4000 }, clientHeight: { value: 600 } });
      geometry(scroller, 200); geometry(root.querySelector('li')!, 750);
    } else geometry(root.querySelector('li')!, window.innerHeight - 50);
    run(); const call = mock.fromTo.mock.calls[0];
    expect(call[2].scrollTrigger).toBeUndefined(); expect(call[2].paused).toBe(true);
    frame!(0); expect(mock.fromTo.mock.results[0].value.restart).toHaveBeenCalledWith(true);
  });
});

describe('real notes archive motion composition', () => {
  function setup(path = '/my-work/notes', work = false, returning: string | false = false, empty = false) {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 100, top: 20, bottom: 120 } as DOMRect);
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.setPointerCapture = () => undefined;
    HTMLElement.prototype.releasePointerCapture = () => undefined;
    HTMLElement.prototype.scrollIntoView = () => undefined;
    archiveFixture.loading = false;
    archiveFixture.data = Array.from({ length: 28 }, (_, index) => ({ id: `real-${index}`, title: `Real note ${index}`, type: index % 2 ? 'note' : 'session_recap', created_at: `2026-10-${String(28 - index).padStart(2, '0')}T12:00:00Z`, status: 'assigned', metadata_json: index % 3 ? {} : { read_at: '2026-10-27' } } as ClassroomItem));
    if (empty) archiveFixture.data = [];
    mock.fromTo.mockImplementation((element: HTMLElement, from: Record<string, unknown>) => {
      element.style.opacity = String(from.opacity);
      const animation = { delay: vi.fn(), restart: vi.fn(), progress: vi.fn(), kill: vi.fn(), scrollTrigger: { refresh: vi.fn(), kill: vi.fn() } };
      animation.delay.mockReturnValue(animation);
      animation.progress.mockImplementation(() => { element.style.opacity = ''; return animation; });
      animation.restart.mockImplementation(() => { element.style.opacity = ''; return animation; });
      return animation;
    });
    const view = render(<MemoryRouter initialEntries={[returning ? { pathname: path, state: { notesArchiveReturn: returning } } : path]}><ClassroomMotionContent><Routes><Route element={<StudentDestination destination="my-work" />}><Route path={work ? '/my-work/to-do' : '/my-work/notes'} element={work ? <MyWorkPage completed={false} /> : <TeachingNotesArchive />} /></Route></Routes></ClassroomMotionContent></MemoryRouter>);
    return { ...view, flush: () => { frames.splice(0).forEach(frame => frame(0)); }, rowCalls: () => mock.fromTo.mock.calls.filter(([element]) => element.matches('.teaching-note-card')) };
  }
  it.each(['type', 'unread'])('settles real pointer %s filtering and reveals new pointer Load more rows in order', async (filter) => {
    const view = setup();
    expect(view.rowCalls()).toHaveLength(12);
    const initialRows = new Set(view.rowCalls().map(([element]) => element));
    if (filter === 'type') {
      const trigger = screen.getByRole('combobox', { name: 'Type' });
      const down = new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false });
      Object.defineProperty(down, 'pointerType', { value: 'mouse' }); fireEvent(trigger, down);
      const option = await screen.findByRole('option', { name: 'Session recaps' });
      expect(document.querySelector('.teaching-notes-home')?.contains(option)).toBe(false);
      fireEvent.click(option, { detail: 1 });
    } else fireEvent.click(screen.getByRole('button', { name: 'Unread' }), { detail: 1 });
    await waitFor(() => expect(screen.getByRole('button', { name: /Load more notes/ })).toBeInTheDocument());
    expect(view.rowCalls()).toHaveLength(12);
    const oldRowTweens = mock.fromTo.mock.results.filter((_result, index) => initialRows.has(mock.fromTo.mock.calls[index][0]));
    oldRowTweens.forEach(result => expect(result.value.progress).toHaveBeenCalledWith(1));
    view.flush();
    document.querySelectorAll<HTMLElement>('.teaching-note-card').forEach(row => expect(row.style.opacity).not.toBe('0'));
    fireEvent.click(screen.getByRole('button', { name: /Load more notes/ }), { detail: 1 });
    await waitFor(() => expect(view.rowCalls().length).toBeGreaterThan(12));
    const addedCalls = view.rowCalls().slice(12);
    addedCalls.forEach(([, , vars]) => expect(vars.paused).toBe(true));
    view.flush();
    const addedTweens = addedCalls.map(call => mock.fromTo.mock.results[mock.fromTo.mock.calls.indexOf(call)].value);
    expect(addedTweens[0].delay).toHaveBeenCalledWith(0);
    const delays = addedTweens.map(tween => tween.delay.mock.calls[0][0]);
    expect(delays.every((delay, index) => index === 0 || delay > delays[index - 1])).toBe(true);
  });
  it('restores cached focus in the first layout commit without hiding surrounding rows', () => {
    sessionStorage.setItem('my-work-notes-anchor:motion-student:/my-work/notes', JSON.stringify({ id: 'real-4', ids: ['real-3', 'real-4', 'real-5'], pointer: true }));
    const view = setup('/my-work/notes', false, 'real-4');
    expect(screen.getByRole('link', { name: /Read Real note 4\./ })).toHaveFocus();
    expect(view.rowCalls()).toHaveLength(0);
    document.querySelectorAll<HTMLElement>('.teaching-note-card').forEach(row => expect(row.style.opacity).not.toBe('0'));
    expect(screen.getByRole('link', { name: /Read Real note 4\./ })).toHaveAccessibleName(/Shared/);
  });
  it('leaves marked cached reader blocks to their dedicated motion owner', () => {
    const setupView = setup(); setupView.unmount(); mock.fromTo.mockClear();
    archiveFixture.data = [{ id: 'cached-reader', title: 'Cached teaching note', type: 'note', created_at: '2026-10-27T12:00:00Z', description: 'A standfirst.', content_html: '<p>Authored lesson content.</p>', metadata_json: {}, status: 'assigned' } as ClassroomItem];
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/cached-reader']}><ClassroomMotionContent><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></ClassroomMotionContent></MemoryRouter></QueryClientProvider>);
    const wrapper = document.querySelector('.classroom-note-reader')!;
    expect(wrapper.tagName).toBe('DIV');
    const targets = mock.fromTo.mock.calls.map(([element]) => element as HTMLElement);
    expect(targets).toEqual([]);
    expect(wrapper).toHaveClass('classroom-motion-local');
    expect(wrapper.querySelectorAll('[data-note-reader-block]')).toHaveLength(5);
    expect(targets).not.toContain(wrapper);
    expect(targets.some(element => element.contains(screen.getByRole('button', { name: 'Back to notes' })))).toBe(false);
  });
  it('consumes a scoped cached restore marker when no anchored row survives and focus falls back to the heading', async () => {
    sessionStorage.setItem('my-work-notes-anchor:motion-student:/my-work/notes', JSON.stringify({ id: 'removed', ids: ['removed'], pointer: true }));
    const view = setup('/my-work/notes', false, 'removed', true);
    expect(screen.getByRole('heading', { name: 'Teaching notes' })).toHaveFocus();
    expect(view.rowCalls()).toHaveLength(0);
    expect(document.querySelector('[data-motion-list-restore]')).toBeNull();
    archiveFixture.data = [{ id: 'arrived', title: 'Newly arrived note', type: 'note', created_at: '2026-10-27T12:00:00Z', metadata_json: {}, status: 'assigned' } as ClassroomItem];
    view.rerender(<MemoryRouter initialEntries={['/my-work/notes']}><ClassroomMotionContent><Routes><Route element={<StudentDestination destination="my-work" />}><Route path="/my-work/notes" element={<TeachingNotesArchive />} /></Route></Routes></ClassroomMotionContent></MemoryRouter>);
    await Promise.resolve();
    expect(screen.getByText('Newly arrived note')).toBeInTheDocument();
    expect(view.rowCalls()).toHaveLength(0);
    document.querySelectorAll<HTMLElement>('.teaching-note-card').forEach(row => expect(row.style.opacity).not.toBe('0'));
  });
  it('settles actual assigned-work portal filtering through its section ref without animating newly matched rows', async () => {
    workFixture.rows = [
      { key: 'practice', title: 'Practice assignment', kind: 'homework', status: 'assigned', sourceTable: 'homework', workSection: 'lr', route: '/practice-one', createdAt: '2026-10-20' },
      { key: 'guided', title: 'Guided assignment', kind: 'guided', status: 'in_progress', sourceTable: 'guided', workSection: 'rc', route: '/guided-one', createdAt: '2026-10-21' },
    ];
    const view = setup('/my-work/to-do', true);
    const workCalls = () => mock.fromTo.mock.calls.filter(([element]) => element.matches('li[data-motion-item]'));
    expect(workCalls()).toHaveLength(2);
    const initial = workCalls().map(call => mock.fromTo.mock.results[mock.fromTo.mock.calls.indexOf(call)].value);
    const trigger = screen.getByRole('combobox', { name: /^Assignment type\b/ });
    const down = new MouseEvent('pointerdown', { bubbles: true, button: 0, ctrlKey: false });
    Object.defineProperty(down, 'pointerType', { value: 'mouse' }); fireEvent(trigger, down);
    const option = await screen.findByRole('option', { name: 'Guided drill' });
    expect(document.querySelector('.my-work-organized')?.contains(option)).toBe(false);
    fireEvent.click(option, { detail: 1 });
    initial.forEach(tween => expect(tween.progress).toHaveBeenCalledWith(1));
    expect(screen.queryByText('Practice assignment')).not.toBeInTheDocument();
    expect(screen.getByText('Guided assignment')).toBeInTheDocument();
    expect(workCalls()).toHaveLength(2); view.flush();
    // A new identity arriving during this filtered visit must remain immediate.
    workFixture.rows = [...workFixture.rows, { ...workFixture.rows[1], key: 'guided-new', title: 'New guided assignment' }];
    view.rerender(<MemoryRouter initialEntries={['/my-work/to-do']}><ClassroomMotionContent><Routes><Route element={<StudentDestination destination="my-work" />}><Route path="/my-work/to-do" element={<MyWorkPage completed={false} />} /></Route></Routes></ClassroomMotionContent></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('New guided assignment')).toBeInTheDocument());
    expect(workCalls()).toHaveLength(2);
    expect(screen.getByText('New guided assignment').closest('li')?.style.opacity).not.toBe('0');
  });
});
