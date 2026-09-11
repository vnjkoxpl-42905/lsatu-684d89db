import * as React from 'react';
import { cn } from '@/lib/utils';
import { RcMarkdown } from './RcMarkdown';
import { RcSelectionPopover, type RcSelectionAnchor } from './RcSelectionPopover';
import { useRcMarkSurface } from '../hooks/useRcMarkSurface';
import {
  RC_FIND_ATTR,
  findMatches,
  paintRanges,
  paintRcAnnotations,
  scrollToMatch,
} from '../lib/rcHighlightPaint';
import type {
  RcAnnotationKind,
  RcHighlight,
  RcHighlightColor,
  RcHighlightMode,
  RcPassage,
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

  // The passage's own marks, kept as the same array while they are the same
  // marks. The store hands over one array per passage, so a mark on a stem or
  // a choice makes a new array too; without this the passage would be
  // repainted (and the find marks with it) for every mark made anywhere.
  const filtered = React.useMemo(
    () => highlights.filter((h) => h.target === 'passage'),
    [highlights],
  );
  const stable = React.useRef(filtered);
  if (
    stable.current !== filtered &&
    (stable.current.length !== filtered.length ||
      stable.current.some((h, i) => h !== filtered[i]))
  ) {
    stable.current = filtered;
  }
  const passageHighlights = stable.current;

  // Repaint highlights whenever the passage or the stored ranges change. Find
  // marks are painted after, so a search sits on top of the student's colors.
  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (el) paintRcAnnotations(el, passageHighlights);
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

  const surface = useRcMarkSurface({
    textRef,
    paneRef,
    highlightMode,
    color,
    onAdd: onAddHighlight,
    onRemove: onRemoveHighlight,
    onRemoveRange,
    onAnchor: (next) => setAnchor(next),
  });

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
        onApply={surface.applyPending}
        onRemove={surface.removePending}
        onDismiss={() => setAnchor(null)}
      />
    </div>
  );
}

export default RcPassagePane;
