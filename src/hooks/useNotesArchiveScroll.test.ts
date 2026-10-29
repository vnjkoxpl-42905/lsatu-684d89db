import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
const animation = vi.hoisted(() => ({ to: vi.fn(), kill: vi.fn() }));
vi.mock('gsap', () => ({ gsap: { registerPlugin: vi.fn(), to: animation.to } }));
vi.mock('gsap/ScrollToPlugin', () => ({ ScrollToPlugin: {} }));
import { useNotesArchiveScroll } from './useNotesArchiveScroll';

function note(top = 1200) {
  const target = document.createElement('a');
  target.scrollIntoView = vi.fn();
  vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({ top, bottom: top + 100, height: 100 } as DOMRect);
  return target;
}
beforeEach(() => {
  animation.to.mockReset().mockReturnValue({ kill: animation.kill });
  animation.kill.mockReset();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('teaching archive return scrolling', () => {
  it('keeps keyboard and legacy returns immediate', () => {
    const { result } = renderHook(useNotesArchiveScroll);
    const target = note();
    result.current(target, false);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' });
    expect(animation.to).not.toHaveBeenCalled();
  });
  it('keeps reduced-motion or coarse-pointer returns immediate', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
    const { result } = renderHook(useNotesArchiveScroll);
    const target = note();
    result.current(target, true);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(animation.to).not.toHaveBeenCalled();
  });
  it('keeps a keyboard-focused return immediate even after a mouse-opened note', () => {
    const { result } = renderHook(useNotesArchiveScroll);
    const target = note();
    vi.spyOn(target, 'matches').mockImplementation((selector) => selector === ':focus-visible');
    result.current(target, true);
    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(animation.to).not.toHaveBeenCalled();
  });
  it('smoothly returns an offscreen mouse-opened note with user interruption enabled', () => {
    const { result } = renderHook(useNotesArchiveScroll);
    result.current(note(), true);
    expect(animation.to).toHaveBeenCalledWith(window, expect.objectContaining({
      duration: 0.26, scrollTo: expect.objectContaining({ autoKill: true }),
    }));
    expect(window.matchMedia).toHaveBeenCalledWith('(pointer: fine) and (prefers-reduced-motion: no-preference)');
  });
  it('does not move a note that is already comfortably visible', () => {
    const { result } = renderHook(useNotesArchiveScroll);
    result.current(note(100), true);
    expect(animation.to).not.toHaveBeenCalled();
  });
  it('cancels its own scroll tween on unmount', () => {
    const { result, unmount } = renderHook(useNotesArchiveScroll);
    result.current(note(), true);
    unmount();
    expect(animation.kill).toHaveBeenCalledOnce();
  });
});
