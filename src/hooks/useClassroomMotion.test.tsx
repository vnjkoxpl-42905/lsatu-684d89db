import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ fromTo: vi.fn(), set: vi.fn(), revert: vi.fn(), media: vi.fn(), reduced: false }));
vi.mock('gsap', () => ({ gsap: {
  registerPlugin: vi.fn(),
  context: (work: () => void) => { work(); return { add: (callback: () => void) => callback(), revert: mock.revert }; },
  matchMedia: () => ({ add: (_: string, work: () => unknown) => { mock.media(work); if (!mock.reduced) return work(); }, revert: mock.revert }),
  fromTo: mock.fromTo, set: mock.set,
} }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));
vi.mock('gsap/CustomEase', () => ({ CustomEase: { create: vi.fn() } }));
import { classroomMotionKey, CLASSROOM_REVEAL, useClassroomMotion } from './useClassroomMotion';
afterEach(() => { document.body.innerHTML = ''; mock.reduced = false; vi.useRealTimers(); vi.clearAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
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
    mock.fromTo.mockImplementation(() => { const animation = { delay: vi.fn(), play: vi.fn(), restart: vi.fn(), progress: vi.fn(), scrollTrigger: { refresh: vi.fn(), kill: vi.fn() } }; animation.delay.mockReturnValue(animation); return animation; });
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
    const { run } = mount('<div data-motion-list>'+Array.from({ length: 30 }, (_, i) => `<a data-motion-item data-motion-id="note:${i}">Note ${i}</a>`).join('')+'</div>');
    run(); expect(mock.fromTo).toHaveBeenCalledTimes(30);
    expect(mock.fromTo.mock.calls[0][1]).toEqual({ y: 8, opacity: 0 });
    expect(mock.fromTo.mock.calls[0][2]).toMatchObject({ duration: 0.24, delay: 0 });
    expect(mock.fromTo.mock.calls[27][2].delay).toBeCloseTo(0.15);
    expect(mock.fromTo.mock.calls[29][2].delay).toBe(0.15);
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
});
