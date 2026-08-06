import * as React from 'react';
import { cn } from '@/lib/utils';
import { RcMarkdown } from './RcMarkdown';
import { RcSelectionPopover, type RcSelectionAnchor } from './RcSelectionPopover';
import {
  RC_FIND_ATTR,
  RC_HIGHLIGHT_ATTR,
  captureRenderedSelection,
  findMatches,
  paintRanges,
  scrollToMatch,
} from '../lib/rcHighlightPaint';
import {
  rcHighlightColor,
  type RcAnnotationKind,
  type RcHighlight,
  type RcHighlightColor,
  type RcHighlightMode,
  type RcPassage,
} from '../lib/rcTypes';

interface Props {
  passage: RcPassage;
  highlights: RcHighlight[];
  color: RcHighlightColor;
  onColorChange: (c: RcHighlightColor) => void;
  onAddHighlight: (
    start: number,
    end: number,
    color: RcHighlightColor,
    kind: RcAnnotationKind,
  ) => void;
  onRemoveHighlight: (offset: number) => void;
  onRemoveRange: (start: number, end: number) => void;
  /** Active toolbar tool. 'none' hands the interaction to the popover. */
  highlightMode: RcHighlightMode;
  findQuery: string;
  findIndex: number;
  onFindCount: (count: number) => void;
  /** Scroll position is kept per passage so switching back lands where they left. */
  scrollTop: number;
  onScroll: (top: number) => void;
  /** Fraunces type stack from rcTypeStyles. */
  textStyle: React.CSSProperties;
  /** Drops the divider and the reading-measure cap in Passage Only View. */
  passageOnly?: boolean;
  children?: React.ReactNode;
}

export function RcPassagePane({
  passage,
  highlights,
  color,
  onColorChange,
  onAddHighlight,
  onRemoveHighlight,
  onRemoveRange,
  highlightMode,
  findQuery,
  findIndex,
  onFindCount,
  scrollTop,
  onScroll,
  textStyle,
  passageOnly,
  children,
}: Props) {
  const paneRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState<RcSelectionAnchor | null>(null);
  const pending = React.useRef<{ start: number; end: number } | null>(null);
  const removeOffset = React.useRef<number | null>(null);

  const passageHighlights = React.useMemo(
    () => highlights.filter((h) => h.target === 'passage'),
    [highlights],
  );

  // Repaint highlights whenever the passage or the stored ranges change. Find
  // marks are painted after, so a search sits on top of the student's colors.
  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    paintRanges(
      el,
      passageHighlights.map((h) => ({
        start: h.start,
        end: h.end,
        color: h.color,
        kind: h.kind ?? 'highlight',
      })),
      RC_HIGHLIGHT_ATTR,
      (r) =>
        r.kind === 'underline'
          ? {
              backgroundColor: 'transparent',
              textDecoration: 'underline',
              textDecorationColor: 'currentColor',
              textDecorationThickness: '2px',
              textUnderlineOffset: '3px',
            }
          : {
              backgroundColor: rcHighlightColor(r.color),
              // Multiply keeps the text readable through the wash, and matches
              // how the LR player renders its markers.
              mixBlendMode: 'multiply',
            },
    );
  }, [passage.passageId, passage.text, passageHighlights]);

  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const matches = findQuery.trim().length >= 2 ? findMatches(el, findQuery) : [];
    paintRanges(el, matches, RC_FIND_ATTR);
    onFindCount(matches.length);
    if (matches.length > 0) scrollToMatch(el, Math.min(findIndex, matches.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findQuery, findIndex, passage.passageId, passageHighlights]);

  // Restore this passage's scroll position when it becomes the current one.
  React.useLayoutEffect(() => {
    const el = paneRef.current;
    if (el) el.scrollTop = scrollTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.passageId]);

  /** Rendered-text offset of the first character inside a painted mark. */
  const offsetOfMark = (el: HTMLElement, mark: Element): number => {
    const before = document.createRange();
    before.selectNodeContents(el);
    before.setEnd(mark, 0);
    return before.toString().length;
  };

  const handleMouseUp = (event: React.MouseEvent) => {
    const el = textRef.current;
    if (!el) return;

    const target = event.target as HTMLElement;
    const mark = target.closest(`mark[${RC_HIGHLIGHT_ATTR}]`);
    const selection = captureRenderedSelection(el);

    // With the eraser active, a click clears the mark under it and a drag
    // clears everything the sweep touches. No popover either way.
    if (highlightMode === 'erase') {
      if (selection) {
        onRemoveRange(selection.start, selection.end);
        window.getSelection()?.removeAllRanges();
      } else if (mark) {
        onRemoveHighlight(offsetOfMark(el, mark));
      }
      setAnchor(null);
      return;
    }

    // A marker or the underline is active: apply on release, like the official
    // interface, rather than asking again through the popover.
    if (highlightMode !== 'none' && selection) {
      const kind: RcAnnotationKind = highlightMode === 'underline' ? 'underline' : 'highlight';
      onAddHighlight(
        selection.start,
        selection.end,
        kind === 'underline' ? color : (highlightMode as RcHighlightColor),
        kind,
      );
      window.getSelection()?.removeAllRanges();
      setAnchor(null);
      return;
    }

    if (!selection && mark) {
      // Clicking an existing highlight offers to remove it.
      removeOffset.current = offsetOfMark(el, mark);
      const rect = mark.getBoundingClientRect();
      const paneRect = paneRef.current!.getBoundingClientRect();
      setAnchor({
        x: rect.left - paneRect.left,
        y: rect.bottom - paneRect.top + 6,
        mode: 'remove',
      });
      return;
    }

    if (!selection) {
      setAnchor(null);
      return;
    }

    pending.current = { start: selection.start, end: selection.end };
    const range = window.getSelection()?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    const paneRect = paneRef.current!.getBoundingClientRect();
    if (rect) {
      setAnchor({
        x: rect.left - paneRect.left,
        y: rect.bottom - paneRect.top + 6,
        mode: 'apply',
      });
    }
  };

  return (
    <div
      className={cn(
        'rc-exam-col rc-passage-col relative min-w-0 overflow-y-auto px-6 pb-7 pt-6 sm:pl-9 sm:pr-8',
        // Fraunces is high-contrast; grayscale smoothing thins its hairlines.
        'subpixel-antialiased selection:bg-blue-100',
        passageOnly ? 'rc-passage-only' : 'border-slate-200 lg:border-r',
        // Cap the reading measure. 52ch in Fraunces measures ~68 real
        // characters, inside the 45-75 readable band. Two-column reflow sets
        // its own measure, so the cap comes off there.
        !passageOnly && '[&>*]:max-w-[52ch]',
      )}
      ref={paneRef}
      style={textStyle}
      onScroll={(e) => onScroll((e.target as HTMLDivElement).scrollTop)}
      onMouseUp={handleMouseUp}
    >
      {passage.title && <h1 className="rc-passage-title">{passage.title}</h1>}
      <div className="rc-passage-text" ref={textRef}>
        <RcMarkdown>{passage.text}</RcMarkdown>
      </div>

      {children}

      <RcSelectionPopover
        anchor={anchor}
        color={color}
        onColorChange={onColorChange}
        onApply={(chosen) => {
          if (pending.current) {
            onAddHighlight(pending.current.start, pending.current.end, chosen, 'highlight');
          }
          window.getSelection()?.removeAllRanges();
          setAnchor(null);
        }}
        onRemove={() => {
          if (removeOffset.current != null) onRemoveHighlight(removeOffset.current);
          setAnchor(null);
        }}
        onDismiss={() => setAnchor(null)}
      />
    </div>
  );
}

export default RcPassagePane;
