import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mock = vi.hoisted(() => ({
  set: vi.fn(), to: vi.fn(), kill: vi.fn(), revert: vi.fn(), mediaRevert: vi.fn(), media: vi.fn(),
}));
vi.mock('gsap', () => ({ gsap: {
  context: () => ({ add: (work: () => void) => work(), revert: mock.revert }),
  matchMedia: () => ({
    add: (_: unknown, work: (context: unknown) => void) => {
      mock.media(work);
      work({ conditions: { reduce: false } });
    },
    revert: mock.mediaRevert,
  }),
  set: mock.set,
  to: (...args: unknown[]) => { mock.to(...args); return { kill: mock.kill }; },
} }));
import { useClassroomRailMotion } from './useClassroomRailMotion';

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

function mountRail() {
  const root = document.createElement('nav');
  root.innerHTML = '<span data-rail-marker></span><button class="classroom-nav classroom-nav-active">Home</button><button class="classroom-nav">Practice</button>';
  document.body.append(root);
  const [home, practice] = Array.from(root.querySelectorAll('button'));
  root.getBoundingClientRect = () => ({ left: 100, top: 50, width: 200, height: 200 }) as DOMRect;
  home.getBoundingClientRect = () => ({ left: 110, top: 70, width: 180, height: 44 }) as DOMRect;
  practice.getBoundingClientRect = () => ({ left: 110, top: 120, width: 180, height: 44 }) as DOMRect;
  root.scrollTop = 15;
  const ref = { current: root };
  const hook = renderHook(({ key }) => useClassroomRailMotion(ref, key), { initialProps: { key: 'home' } });
  const activatePractice = () => {
    home.classList.remove('classroom-nav-active');
    practice.classList.add('classroom-nav-active');
    hook.rerender({ key: 'practice' });
  };
  return { root, hook, activatePractice };
}

describe('classroom rail motion', () => {
  it('uses nav-relative scroll coordinates and transforms without animating layout', () => {
    const { root, activatePractice, hook } = mountRail();
    expect(mock.set.mock.calls[0][1]).toMatchObject({ x: 10, y: 35, width: 180, height: 44 });
    expect(root.dataset.railMarkerReady).toBe('true');
    activatePractice();
    expect(mock.to.mock.calls[0][1]).toMatchObject({ x: 10, y: 85, scaleX: 1, scaleY: 1 });
    expect(mock.to.mock.calls[0][1]).not.toHaveProperty('width');
    expect(mock.to.mock.calls[0][1]).not.toHaveProperty('height');
    hook.unmount();
  });

  it('settles immediately when reduced motion changes during a glide', () => {
    const { hook, activatePractice } = mountRail();
    activatePractice();
    act(() => mock.media.mock.calls[0][0]({ conditions: { reduce: true } }));
    expect(mock.kill).toHaveBeenCalled();
    expect(mock.set.mock.lastCall?.[1]).toMatchObject({ x: 10, y: 85 });
    expect(mock.to).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('restores the CSS fallback for absent destinations and cleans up on unmount', () => {
    const { root, hook } = mountRail();
    root.querySelector('.classroom-nav-active')!.classList.remove('classroom-nav-active');
    hook.rerender({ key: 'unlisted' });
    expect(root.dataset.railMarkerReady).toBeUndefined();
    hook.unmount();
    expect(mock.mediaRevert).toHaveBeenCalled();
    expect(mock.revert).toHaveBeenCalled();
    expect(root.style.getPropertyValue('--classroom-rail-marker-fill')).toBe('');
  });
});
