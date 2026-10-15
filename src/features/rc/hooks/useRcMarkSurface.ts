import * as React from 'react';
import type { RcSelectionAnchor } from '../components/RcSelectionPopover';
import { RC_HIGHLIGHT_ATTR, captureRenderedSelection } from '../lib/rcHighlightPaint';
import type { RcAnnotationKind, RcHighlightColor, RcHighlightMode } from '../lib/rcTypes';

/**
 * The mouse-up ladder for one markable surface: the passage, a question stem,
 * or an answer choice. Every surface runs the same ladder so the toolbar tools,
 * the eraser and the selection popover behave identically wherever the student
 * releases the mouse.
 *
 *   erase          -> drag clears the sweep, click clears the mark under it
 *   tool active    -> a selection is applied on release, no popover
 *   click on mark  -> "Remove highlight" popover
 *   selection      -> "Highlight" popover
 *
 * The surface listens on the document, not on its own element. A drag that
 * runs past the end of a choice is released on the row's padding, and a drag
 * from the stem into a choice is released on the choice; either way the
 * surface still owns the part of the selection that fell inside it, and it
 * takes exactly that part (captureRenderedSelection clips to the surface).
 * A release with no selection anywhere puts every popover away, so two panes
 * never show one each.
 *
 * The popover itself belongs to the pane, since a pane with several surfaces
 * (a stem and five choices) shows one popover. `onAnchor` hands the pane the
 * position together with a handle back to the surface that asked, so the
 * popover's buttons act on the right text.
 */

export interface RcMarkSurfaceHandle {
  /** Popover "Highlight": paint the selection the last mouse-up captured. */
  applyPending: (chosen: RcHighlightColor) => void;
  /** Popover "Remove highlight": drop the mark the last mouse-up landed on. */
  removePending: () => void;
  /**
   * Whether the most recent mouse-up on the document was a marking gesture
   * on this surface (a mark applied, erased, or offered for removal). The
   * click that follows such a mouse-up is not a pick.
   */
  consumedLastMouseUp: () => boolean;
}

export interface RcMarkSurfaceOptions {
  /** Annotation hydration/read failure gates marks independently of answers. */
  disabled?: boolean;
  /** The element whose rendered text the offsets are measured against. */
  textRef: React.RefObject<HTMLElement | null>;
  /** The positioned, scrolling ancestor the popover is anchored inside. */
  paneRef: React.RefObject<HTMLElement | null>;
  highlightMode: RcHighlightMode;
  color: RcHighlightColor;
  onAdd: (start: number, end: number, color: RcHighlightColor, kind: RcAnnotationKind) => void;
  onRemove: (offset: number) => void;
  onRemoveRange: (start: number, end: number) => void;
  onAnchor: (anchor: RcSelectionAnchor | null, surface: RcMarkSurfaceHandle) => void;
}

/** Rendered-text offset of the first character inside a painted mark. */
function offsetOfMark(el: HTMLElement, mark: Element): number {
  const before = document.createRange();
  before.selectNodeContents(el);
  before.setEnd(mark, 0);
  return before.toString().length;
}

export function useRcMarkSurface(options: RcMarkSurfaceOptions): RcMarkSurfaceHandle {
  // The handle is created once and read by the pane's popover later, so it
  // reads the options through a ref rather than closing over one render's.
  const latest = React.useRef(options);
  latest.current = options;

  const pending = React.useRef<{ start: number; end: number } | null>(null);
  const removeOffset = React.useRef<number | null>(null);
  const consumed = React.useRef(false);

  const handle = React.useMemo<RcMarkSurfaceHandle>(() => {
    const self: RcMarkSurfaceHandle = {
      applyPending: (chosen) => {
        if (!latest.current.disabled && pending.current) {
          latest.current.onAdd(pending.current.start, pending.current.end, chosen, 'highlight');
          pending.current = null;
        }
        window.getSelection()?.removeAllRanges();
        latest.current.onAnchor(null, self);
      },
      removePending: () => {
        if (!latest.current.disabled && removeOffset.current != null) latest.current.onRemove(removeOffset.current);
        removeOffset.current = null;
        latest.current.onAnchor(null, self);
      },
      consumedLastMouseUp: () => consumed.current,
    };
    return self;
  }, []);

  React.useEffect(() => {
    if (!options.disabled) return;
    pending.current = null;
    removeOffset.current = null;
    consumed.current = false;
    latest.current.onAnchor(null, handle);
  }, [options.disabled, handle]);

  React.useEffect(() => {
    /**
     * Popover position, in the pane's content coordinates. The pane scrolls and
     * the popover is positioned inside it, so the scroll offset is added back:
     * client rects are measured against the viewport, not the scrolled content.
     */
    const anchorFor = (rect: DOMRect, mode: RcSelectionAnchor['mode']): RcSelectionAnchor => {
      const pane = latest.current.paneRef.current!;
      const paneRect = pane.getBoundingClientRect();
      return {
        x: rect.left - paneRect.left + pane.scrollLeft,
        y: rect.bottom - paneRect.top + 6 + pane.scrollTop,
        mode,
      };
    };

    const onMouseUp = (event: MouseEvent) => {
      if (latest.current.disabled) {
        pending.current = null;
        removeOffset.current = null;
        consumed.current = false;
        latest.current.onAnchor(null, handle);
        return;
      }
      const { textRef, highlightMode, color, onAdd, onRemove, onRemoveRange, onAnchor } =
        latest.current;
      const el = textRef.current;
      if (!el) return;

      const target = event.target as HTMLElement | null;
      // A release on the popover's own buttons is the click that is about to
      // fire. Treating it as a release on the text would dismiss the popover
      // first, and the button would be gone before its click arrived.
      if (target?.closest?.('.rc-selection-popover')) return;

      // Every mouse-up starts clean: what the last one left pending is stale.
      consumed.current = false;
      pending.current = null;
      removeOffset.current = null;

      // Only a mark inside this surface counts as this surface's mark.
      const markHit = target?.closest?.(`mark[${RC_HIGHLIGHT_ATTR}]`) ?? null;
      const mark = markHit && el.contains(markHit) ? markHit : null;
      const selection = captureRenderedSelection(el);

      // With the eraser active, a click clears the mark under it and a drag
      // clears everything the sweep touches. No popover either way.
      if (highlightMode === 'erase') {
        if (selection) {
          onRemoveRange(selection.start, selection.end);
          window.getSelection()?.removeAllRanges();
          consumed.current = true;
        } else if (mark) {
          onRemove(offsetOfMark(el, mark));
          consumed.current = true;
        }
        onAnchor(null, handle);
        return;
      }

      // A marker or the underline is active: apply on release, like the official
      // interface, rather than asking again through the popover.
      if (highlightMode !== 'none' && selection) {
        const kind: RcAnnotationKind = highlightMode === 'underline' ? 'underline' : 'highlight';
        onAdd(
          selection.start,
          selection.end,
          kind === 'underline' ? color : (highlightMode as RcHighlightColor),
          kind,
        );
        window.getSelection()?.removeAllRanges();
        consumed.current = true;
        onAnchor(null, handle);
        return;
      }

      if (!selection && mark) {
        // Clicking an existing highlight offers to remove it.
        removeOffset.current = offsetOfMark(el, mark);
        consumed.current = true;
        onAnchor(anchorFor(mark.getBoundingClientRect(), 'remove'), handle);
        return;
      }

      if (!selection) {
        onAnchor(null, handle);
        return;
      }

      pending.current = { start: selection.start, end: selection.end };
      consumed.current = true;
      const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
      if (rect) onAnchor(anchorFor(rect, 'apply'), handle);
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [handle]);

  return handle;
}

export type RcMarkSurface = ReturnType<typeof useRcMarkSurface>;
