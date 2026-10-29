import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
const state = vi.hoisted(() => ({ type: 'PUSH', reduced: false, timelines: [] as any[], contexts: [] as any[] }));
vi.mock('react-router-dom', () => ({ useNavigationType: () => state.type }));
vi.mock('gsap', () => ({ gsap: {
  getProperty: (element: HTMLElement) => Number(element.dataset.x ?? 0),
  context: (work: () => void, root: HTMLElement) => { work(); const context = { add: (callback: () => void) => callback(), revert: vi.fn(() => root.querySelectorAll<HTMLElement>('[data-note-transition-stage]').forEach(node => { delete node.dataset.x; })) }; state.contexts.push(context); return context; },
  timeline: (options: { onComplete: () => void }) => { const timeline = { fromTo: vi.fn(), progress: vi.fn((value: number) => { if (value === 1) options.onComplete(); }), kill: vi.fn(), time: vi.fn(() => 0.5), play: vi.fn(), complete: options.onComplete }; timeline.fromTo.mockReturnValue(timeline); state.timelines.push(timeline); return timeline; },
} }));
import { useNoteReaderTransition } from './useNoteReaderTransition';

afterEach(() => { cleanup(); document.body.innerHTML = ''; state.timelines = []; state.contexts = []; state.reduced = false; state.type = 'PUSH'; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function fixture(withRoot = true) {
  vi.stubGlobal('matchMedia', () => ({ matches: state.reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const root = document.createElement('div'); root.innerHTML = '<aside class="primary">Navigation</aside><main data-note-transition-stage><div class="classroom-column"></div></main>'; document.body.append(root);
  const main = root.querySelector('main')!;
  let left = 280, width = 1000;
  main.getBoundingClientRect = () => ({ left: left + Number(main.dataset.x ?? 0), top: 0, width, height: 900, bottom: 900 }) as DOMRect;
  const ref = { current: withRoot ? root : null as HTMLElement | null };
  const hook = renderHook(({ path, key }) => useNoteReaderTransition(ref, path, key), { initialProps: { path: '/my-work/notes', key: 'archive' } });
  function reader(id: string, visibleRail = true, content = true, confirmed = true) {
    left = visibleRail ? 600 : 280; width = visibleRail ? 680 : 1000;
    root.querySelector('[data-note-transition-rail]')?.remove();
    const rail = document.createElement('aside'); rail.dataset.noteTransitionRail = ''; rail.innerHTML = '<header class="classroom-section-heading">Notes</header><button class="classroom-panel-item">First</button><button class="classroom-panel-item">Second</button>'; root.insertBefore(rail, main);
    if (confirmed) rail.querySelector('button')!.dataset.noteTargetId = id;
    rail.getBoundingClientRect = () => ({ width: visibleRail ? 320 : 0, height: 900, top: 0, bottom: 900 }) as DOMRect;
    rail.querySelectorAll<HTMLElement>('*').forEach(element => { element.getBoundingClientRect = () => ({ width: 200, height: 50, top: 100, bottom: 150 }) as DOMRect; });
    const column = main.firstElementChild!;
    column.innerHTML = content ? `<div data-note-reader="${id}">${Array.from({ length: 6 }, (_, index) => `<section data-note-reader-block>Block ${index}</section>`).join('')}</div>` : '<p role="status">Loading</p>';
    column.querySelectorAll<HTMLElement>('[data-note-reader-block]').forEach(element => { element.getBoundingClientRect = () => ({ height: 60, top: 50, bottom: 110 }) as DOMRect; });
  }
  return { root, main, ref, hook, reader, layout: (nextLeft: number, nextWidth = width) => { left = nextLeft; width = nextWidth; } };
}
describe('coordinated note-reader entrance', () => {
  it('coordinates the 320px stage displacement, paper, visible rail rows and crisp reader blocks', () => {
    const view = fixture(); view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    const timeline = state.timelines[0];
    expect(timeline.fromTo.mock.calls[0]).toMatchObject([view.main, { x: -320 }, { x: 0, duration: 0.52 }, 0]);
    expect(timeline.fromTo.mock.calls).toHaveLength(4);
    expect(timeline.fromTo.mock.calls[3][1]).toEqual({ y: 20, opacity: 0 });
    expect(timeline.fromTo.mock.calls[3][2]).toMatchObject({ duration: 0.4, stagger: 0.048 });
    expect(timeline.fromTo.mock.calls.flat().some(value => value === view.root.querySelector('.primary'))).toBe(false);
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
  it('animates note-to-note content alone and returns to archive without an exit delay', () => {
    const view = fixture(); view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.reader('two'); view.hook.rerender({ path: '/classroom/item/two', key: 'two' });
    expect(state.timelines[1].fromTo.mock.calls).toHaveLength(1);
    state.type = 'POP'; view.root.querySelector('[data-note-transition-rail]')?.remove(); view.hook.rerender({ path: '/my-work/notes', key: 'archive' });
    expect(state.timelines).toHaveLength(2); expect(state.timelines[1].kill).toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledTimes(2);
  });
  it('moves incoming chrome before async note readiness and reveals only the matching reader later', async () => {
    const view = fixture(); view.reader('one', true, false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines[0].fromTo.mock.calls).toHaveLength(3); expect(window.scrollTo).not.toHaveBeenCalled();
    view.reader('stale'); await Promise.resolve(); expect(window.scrollTo).not.toHaveBeenCalled();
    view.reader('one'); await Promise.resolve();
    expect(state.timelines[0].fromTo.mock.calls.at(-1)[1]).toEqual({ y: 20, opacity: 0 });
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
  it('does not scroll a non-note item with no owned reader marker', () => {
    const view = fixture(); view.reader('activity', true, false, false); view.hook.rerender({ path: '/classroom/item/activity', key: 'activity' });
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(state.timelines).toHaveLength(0);
    expect(view.root).not.toHaveAttribute('data-note-transition-active');
  });
  it('waits for unknown item confirmation without rewinding chrome already painted at its new edge', async () => {
    const view = fixture(); view.reader('one', true, false, false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines).toHaveLength(0);
    view.reader('one', true, true); await Promise.resolve();
    expect(state.timelines[0].fromTo.mock.calls).toHaveLength(1);
    expect(state.timelines[0].fromTo.mock.calls[0][1]).toEqual({ y: 20, opacity: 0 });
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
  it('coordinates an initially unknown note once confirmation and delayed rail arrive together', async () => {
    const view = fixture(); view.reader('one', false, false, false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines).toHaveLength(0);
    view.reader('one', true, true); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    await Promise.resolve();
    expect(state.timelines[0].fromTo.mock.calls[0]).toMatchObject([view.main, { x: -320 }, { x: 0 }, 0]);
  });
  it('keeps reduced-motion content immediate and supports a root mounted after profile readiness', () => {
    state.reduced = true; const view = fixture(false); view.ref.current = view.root; view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines).toHaveLength(0);
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
  it('omits desktop rail motion below the breakpoint and cleans its owned timeline on unmount', () => {
    const view = fixture(); view.reader('one', false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines[0].fromTo.mock.calls).toHaveLength(1);
    view.hook.unmount(); expect(state.timelines[0].kill).toHaveBeenCalled(); expect(state.contexts[0].revert).toHaveBeenCalled();
  });
  it('rebases rapid note changes from the current visual stage offset without replaying the rail', () => {
    const view = fixture(); view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.main.dataset.x = '-120'; view.reader('two'); view.hook.rerender({ path: '/classroom/item/two', key: 'two' });
    expect(state.timelines[0].kill).toHaveBeenCalled();
    expect(state.timelines[1].fromTo.mock.calls[0]).toMatchObject([view.main, { x: -120 }, { x: 0 }, 0]);
    expect(state.timelines[1].fromTo.mock.calls).toHaveLength(2);
  });
  it('finishes and cleans a transition when the viewport changes or keyboard focus enters', () => {
    const view = fixture(); view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.root.querySelector('[data-note-reader-block]')!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(state.timelines[0].progress).toHaveBeenCalledWith(1);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: window.innerWidth - 50 });
    window.dispatchEvent(new Event('resize'));
    expect(state.timelines[0].kill).toHaveBeenCalled(); expect(state.contexts[0].revert).toHaveBeenCalled();
  });
  it('does not animate non-item rail toggles or archive Back, and reopens from the true archive edge', () => {
    const view = fixture(); view.reader('unused'); view.hook.rerender({ path: '/flagged', key: 'flagged' });
    view.root.querySelector('[data-note-transition-rail]')!.remove(); view.layout(280, 1000);
    view.hook.rerender({ path: '/review', key: 'review' });
    expect(state.timelines).toHaveLength(0); expect(window.scrollTo).not.toHaveBeenCalled();
    view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.main.dataset.x = '-120'; view.root.querySelector('[data-note-transition-rail]')!.remove(); view.layout(280, 1000);
    state.type = 'POP'; view.hook.rerender({ path: '/my-work/notes', key: 'archive' });
    expect(state.timelines).toHaveLength(1); expect(state.timelines[0].kill).toHaveBeenCalled();
    state.type = 'PUSH'; view.reader('two'); view.hook.rerender({ path: '/classroom/item/two', key: 'two' });
    expect(state.timelines[1].fromTo.mock.calls[0][1]).toEqual({ x: -320 });
  });
  it('tracks a rail opened in place so selecting a note does not replay its paper or invent a stage move', async () => {
    const observe = vi.fn(); vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect() {} });
    const view = fixture(); view.hook.rerender({ path: '/classroom', key: 'room' });
    view.reader('unused', true, false); view.hook.rerender({ path: '/classroom', key: 'room' });
    await Promise.resolve();
    expect(state.timelines).toHaveLength(0);
    view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines[0].fromTo.mock.calls).toHaveLength(1);
    expect(state.timelines[0].fromTo.mock.calls[0][1]).toEqual({ y: 20, opacity: 0 });
    expect(observe).toHaveBeenCalledWith(view.main);
    expect(observe).toHaveBeenCalledWith(view.root.querySelector('[data-note-transition-rail]'));
  });
  it('coordinates a permission-delayed rail under the same key without replaying an already visible reader', async () => {
    const view = fixture(); view.reader('one', false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(state.timelines[0].fromTo.mock.calls).toHaveLength(1);
    view.reader('one', true); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    await Promise.resolve();
    expect(state.timelines[1].fromTo.mock.calls).toHaveLength(3);
    expect(state.timelines[1].fromTo.mock.calls[0]).toMatchObject([view.main, { x: -320 }, { x: 0 }, 0]);
    expect(state.timelines[1].fromTo.mock.calls.some(call => call[1].y === 20)).toBe(false);
  });
  it('releases geometry suppression on completion and reset', () => {
    const view = fixture(); view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(view.root).toHaveAttribute('data-note-transition-active');
    state.timelines[0].complete(); expect(view.root).not.toHaveAttribute('data-note-transition-active');
    view.reader('two'); view.hook.rerender({ path: '/classroom/item/two', key: 'two' });
    expect(view.root).toHaveAttribute('data-note-transition-active');
    view.hook.rerender({ path: '/my-work/notes', key: 'archive' });
    expect(view.root).not.toHaveAttribute('data-note-transition-active');
  });
  it('keeps same-key permission-delayed rails immediate under reduced motion', async () => {
    state.reduced = true; const view = fixture(); view.reader('one', false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.reader('one', true); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    await Promise.resolve();
    expect(state.timelines).toHaveLength(0); expect(view.root).not.toHaveAttribute('data-note-transition-active');
    expect(window.scrollTo).toHaveBeenCalledOnce();
  });
  it('does not read layout again on an unrelated same-route render', () => {
    const view = fixture();
    const stageRead = vi.spyOn(view.main, 'getBoundingClientRect');
    view.hook.rerender({ path: '/my-work/notes', key: 'archive' });
    expect(stageRead).not.toHaveBeenCalled();
    view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    stageRead.mockClear();
    const railRead = vi.spyOn(view.root.querySelector<HTMLElement>('[data-note-transition-rail]')!, 'getBoundingClientRect');
    view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    expect(stageRead).not.toHaveBeenCalled(); expect(railRead).not.toHaveBeenCalled();
  });
  it('preserves a delayed-reader stagger when a classic scrollbar narrows its stage without moving its layout edge', async () => {
    let resized: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
    const view = fixture(); view.reader('one', true, false); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.main.dataset.x = '-120'; view.reader('one'); await Promise.resolve();
    const timeline = state.timelines[0];
    expect(timeline.fromTo.mock.calls.at(-1)[1]).toEqual({ y: 20, opacity: 0 });
    view.layout(600, 665); resized();
    expect(timeline.progress).not.toHaveBeenCalled(); expect(timeline.kill).not.toHaveBeenCalled();
    expect(view.root).toHaveAttribute('data-note-transition-active');
  });
  it('still finishes an active transition when the untransformed stage edge changes', () => {
    let resized: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect() {} });
    const view = fixture(); view.reader('one'); view.hook.rerender({ path: '/classroom/item/one', key: 'one' });
    view.main.dataset.x = '-120'; view.layout(620, 680); resized();
    expect(state.timelines[0].progress).toHaveBeenCalledWith(1); expect(state.timelines[0].kill).toHaveBeenCalled();
  });
});
