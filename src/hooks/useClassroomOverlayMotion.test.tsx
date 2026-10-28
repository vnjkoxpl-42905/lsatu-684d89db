import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useClassroomOverlayMotion } from './useClassroomOverlayMotion';
import { useDialogOverlay } from '@/components/classroom/shell/useDialogOverlay';
import { gsap } from 'gsap';

const mocks = vi.hoisted(() => ({
  timelines: [] as { complete?: () => void; kill: ReturnType<typeof vi.fn> }[],
  revert: vi.fn(), set: vi.fn(),
}));
vi.mock('gsap', () => ({ gsap: {
  context: () => ({ add: (work: () => void) => work(), revert: mocks.revert }),
  set: mocks.set,
  timeline: ({ onComplete }: { onComplete?: () => void }) => {
    const timeline = { complete: onComplete, kill: vi.fn(), to: vi.fn() };
    timeline.to.mockReturnValue(timeline);
    mocks.timelines.push(timeline);
    return timeline;
  },
} }));

let preference: { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn> };
const close = vi.fn();
function Harness({ open }: { open: boolean }) {
  const motion = useClassroomOverlayMotion(open, 'left');
  const dialog = useDialogOverlay({ open: motion.present, onClose: close, label: 'Sample menu' });
  return <><button>Trigger</button>{motion.present && <div ref={motion.ref}>
    <button className="classroom-overlay-backdrop" tabIndex={-1}>Backdrop</button>
    <aside {...dialog}><button>First</button><button>Last</button></aside>
  </div>}</>;
}

beforeEach(() => {
  vi.useFakeTimers();
  preference = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preference);
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function () { return this.parentElement; });
});
afterEach(() => {
  cleanup();
  mocks.timelines.length = 0;
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.style.overflow = '';
});

describe('classroom overlay presence', () => {
  it('keeps focus trapping and scroll locking through exit, then restores the trigger', () => {
    const view = render(<Harness open={false} />);
    screen.getByText('Trigger').focus();
    view.rerender(<Harness open />);
    act(() => vi.runAllTimers());
    expect(document.activeElement).toBe(screen.getByText('First'));
    view.rerender(<Harness open={false} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    screen.getByText('Last').focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByText('First'));
    act(() => mocks.timelines.at(-1)!.complete!());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(screen.getByText('Trigger'));
  });

  it('ignores stale exit completion after rapid reopen', () => {
    const view = render(<Harness open />);
    view.rerender(<Harness open={false} />);
    const exit = mocks.timelines.at(-1)!;
    view.rerender(<Harness open />);
    act(() => exit.complete!());
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    expect(exit.kill).toHaveBeenCalled();
  });

  it('settles a mid-exit reduced-motion change immediately', () => {
    const view = render(<Harness open />);
    view.rerender(<Harness open={false} />);
    preference.matches = true;
    act(() => preference.addEventListener.mock.calls[0][1]());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not animate with initial reduced motion and cleans up after unmount', () => {
    preference.matches = true;
    const view = render(<Harness open />);
    expect(mocks.timelines).toHaveLength(0);
    expect(screen.getByRole('dialog')).toBeTruthy();
    view.unmount();
    expect(document.body.style.overflow).toBe('');
    expect(preference.removeEventListener).toHaveBeenCalled();
    expect(mocks.revert).toHaveBeenCalled();
  });

  it('invalidates completion callbacks when unmounted during exit', () => {
    const view = render(<Harness open />);
    view.rerender(<Harness open={false} />);
    const exit = mocks.timelines.at(-1)!;
    view.unmount();
    act(() => exit.complete!());
    expect(exit.kill).toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not leave a blocking overlay behind when exit animation fails', () => {
    const view = render(<Harness open />);
    vi.spyOn(gsap, 'timeline').mockImplementationOnce(() => { throw new Error('Motion unavailable'); });
    view.rerender(<Harness open={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});
