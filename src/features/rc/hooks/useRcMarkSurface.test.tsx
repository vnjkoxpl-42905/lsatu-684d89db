import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRcMarkSurface, type RcMarkSurfaceHandle } from './useRcMarkSurface';
import type { RcHighlightMode } from '../lib/rcTypes';
const capture = vi.hoisted(() => vi.fn());
vi.mock('../lib/rcHighlightPaint', () => ({ RC_HIGHLIGHT_ATTR: 'data-rc-highlight', captureRenderedSelection: capture }));
afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks(); });
describe('annotation surface readiness', () => {
  it('blocks marking and erasing gestures and popovers while disabled', () => {
    const add = vi.fn(), remove = vi.fn(), range = vi.fn(), anchor = vi.fn();
    function Surface({ mode }: { mode: RcHighlightMode }) {
      const ref = React.useRef<HTMLDivElement>(null);
      useRcMarkSurface({ disabled: true, textRef: ref, paneRef: ref, highlightMode: mode, color: 'yellow', onAdd: add, onRemove: remove, onRemoveRange: range, onAnchor: anchor });
      return <div ref={ref}>Text</div>;
    }
    capture.mockReturnValue({ start: 0, end: 4 });
    const view = render(<Surface mode="yellow" />);
    fireEvent.mouseUp(screen.getByText('Text')); view.rerender(<Surface mode="erase" />); fireEvent.mouseUp(screen.getByText('Text'));
    expect(add).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled(); expect(range).not.toHaveBeenCalled();
    expect(anchor.mock.calls.every(([value]) => value === null)).toBe(true);
  });
  it('invalidates stale popover removal handles when readiness is lost', () => {
    const add = vi.fn(), remove = vi.fn(), anchor = vi.fn(); let handle!: RcMarkSurfaceHandle;
    function Surface({ disabled }: { disabled: boolean }) {
      const ref = React.useRef<HTMLDivElement>(null);
      handle = useRcMarkSurface({ disabled, textRef: ref, paneRef: ref, highlightMode: 'none', color: 'yellow', onAdd: add, onRemove: remove, onRemoveRange: vi.fn(), onAnchor: anchor });
      return <div ref={ref}><mark data-rc-highlight="true">Marked</mark></div>;
    }
    capture.mockReturnValue(null);
    const view = render(<Surface disabled={false} />); fireEvent.mouseUp(screen.getByText('Marked'));
    expect(anchor.mock.calls.some(([value]) => value?.mode === 'remove')).toBe(true);
    view.rerender(<Surface disabled />); handle.removePending(); handle.applyPending('pink');
    expect(remove).not.toHaveBeenCalled(); expect(add).not.toHaveBeenCalled();
    expect(handle.consumedLastMouseUp()).toBe(false);
  });
  it('invalidates a captured selection when readiness is lost before applying', () => {
    const add = vi.fn(), anchor = vi.fn(); let handle!: RcMarkSurfaceHandle;
    vi.spyOn(window, 'getSelection').mockReturnValue({ getRangeAt: () => ({ getBoundingClientRect: () => ({ left: 0, bottom: 20 }) }), removeAllRanges: vi.fn() } as unknown as Selection);
    function Surface({ disabled }: { disabled: boolean }) {
      const ref = React.useRef<HTMLDivElement>(null);
      handle = useRcMarkSurface({ disabled, textRef: ref, paneRef: ref, highlightMode: 'none', color: 'yellow', onAdd: add, onRemove: vi.fn(), onRemoveRange: vi.fn(), onAnchor: anchor });
      return <div ref={ref}>Selected text</div>;
    }
    capture.mockReturnValue({ start: 0, end: 4 });
    const view = render(<Surface disabled={false} />); fireEvent.mouseUp(screen.getByText('Selected text'));
    expect(anchor.mock.calls.some(([value]) => value?.mode === 'apply')).toBe(true);
    view.rerender(<Surface disabled />); handle.applyPending('pink');
    expect(add).not.toHaveBeenCalled();
  });
});
