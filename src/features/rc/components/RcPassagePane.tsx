import * as React from 'react';
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
import { RC_HIGHLIGHT_COLORS, type RcHighlight, type RcHighlightColor, type RcPassage } from '../lib/rcTypes';

interface Props {
  passage: RcPassage;
  highlights: RcHighlight[];
  color: RcHighlightColor;
  onColorChange: (c: RcHighlightColor) => void;
  onAddHighlight: (start: number, end: number, color: RcHighlightColor) => void;
  onRemoveHighlight: (offset: number) => void;
  findQuery: string;
  findIndex: number;
  onFindCount: (count: number) => void;
  /** Scroll position is kept per passage so switching back lands where they left. */
  scrollTop: number;
  onScroll: (top: number) => void;
  children?: React.ReactNode;
}

export function RcPassagePane({
  passage,
  highlights,
  color,
  onColorChange,
  onAddHighlight,
  onRemoveHighlight,
  findQuery,
  findIndex,
  onFindCount,
  scrollTop,
  onScroll,
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
      passageHighlights.map((h) => ({ start: h.start, end: h.end, color: h.color })),
      RC_HIGHLIGHT_ATTR,
      (r) => ({ backgroundColor: RC_HIGHLIGHT_COLORS[(r.color ?? 'yellow') as RcHighlightColor] }),
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

  const handleMouseUp = (event: React.MouseEvent) => {
    const el = textRef.current;
    if (!el) return;

    const target = event.target as HTMLElement;
    const mark = target.closest(`mark[${RC_HIGHLIGHT_ATTR}]`);
    const selection = captureRenderedSelection(el);

    if (!selection && mark) {
      // Clicking an existing highlight offers to remove it.
      const before = document.createRange();
      before.selectNodeContents(el);
      before.setEnd(mark, 0);
      removeOffset.current = before.toString().length;
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
      className="rc-pane rc-pane-passage"
      ref={paneRef}
      style={{ position: 'relative' }}
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
          if (pending.current) onAddHighlight(pending.current.start, pending.current.end, chosen);
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
