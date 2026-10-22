import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
const mock = vi.hoisted(() => ({ fromTo: vi.fn(), entrance: vi.fn(), revert: vi.fn(), media: vi.fn() }));
vi.mock('gsap', () => ({ gsap: {
  registerPlugin: vi.fn(), context: (work: () => void) => { work(); return { revert: mock.revert }; },
  matchMedia: () => ({ add: (_: string, work: () => unknown) => { mock.media(work); return work(); }, revert: mock.revert }),
  timeline: () => ({ fromTo: mock.entrance, progress: vi.fn() }), fromTo: mock.fromTo,
} }));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));
import { classroomMotionKey, useClassroomMotion } from './useClassroomMotion';
afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); vi.restoreAllMocks(); });
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
describe('classroom motion safety', () => {
  function mount(content: string) {
    const root = document.createElement('div'); root.innerHTML = content; document.body.append(root);
    root.querySelectorAll<HTMLElement>('*').forEach(element => {
      element.getBoundingClientRect = () => ({ height: 100, top: element.hasAttribute('data-below') ? 2000 : 20 }) as DOMRect;
    });
    mock.fromTo.mockReturnValue({ progress: vi.fn(), scrollTrigger: { refresh: vi.fn(), kill: vi.fn() } });
    return { root, run: () => renderHook(() => useClassroomMotion({ current: root }, 'destination')) };
  }
  it('does not transform ancestors of skipped navigation or already focused controls', () => {
    const { root, run } = mount('<section data-motion-enter><nav data-motion-skip>Tabs</nav></section><section data-motion-enter><button>Focused</button></section>');
    root.querySelector('button')!.focus(); run();
    expect(mock.entrance).not.toHaveBeenCalled();
  });
  it('keeps below-fold content visible until its trigger and skips nested scroll containers', () => {
    const { root, run } = mount('<section data-motion-enter data-below>Later</section><div style="overflow-y:auto"><section data-motion-reveal data-below>Nested</section></div>');
    Object.defineProperties(root.querySelector('div')!, { scrollHeight: { value: 500 }, clientHeight: { value: 100 } });
    run();
    expect(mock.fromTo).toHaveBeenCalledTimes(1);
    expect(mock.fromTo.mock.calls[0][2]).toMatchObject({ immediateRender: false, scrollTrigger: { once: true } });
  });
  it('allows overflow-auto wrappers that do not actually scroll', () => {
    const { run } = mount('<div style="overflow-y:auto"><section data-motion-enter data-below>Later</section></div>');
    run(); expect(mock.fromTo).toHaveBeenCalledTimes(1);
  });
  it('does not replay an entrance when OS motion is enabled long after navigation', () => {
    const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
    const { run } = mount('<section data-motion-enter>Content</section>');
    run(); expect(mock.entrance).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(1000); mock.media.mock.calls[0][0]();
    expect(mock.entrance).toHaveBeenCalledTimes(1);
  });
  it('leaves persistent destination headings out of repeated entrances', () => {
    const { root, run } = mount('<header data-motion-skip>Practice</header><section data-motion-enter>Body</section>');
    run(); expect(mock.entrance.mock.calls[0][0]).toEqual([root.querySelector('section')]);
  });
});
