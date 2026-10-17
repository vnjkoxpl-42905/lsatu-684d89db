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
  annotationsDisabled?: boolean;
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
  /** Scroll position is kept per passage and layout so reflow cannot erase it. */
  scrollTop: number;
  onScroll: (top: number) => void;
  /** Fraunces type stack from rcTypeStyles. */
  textStyle: React.CSSProperties;
  /** Drops the divider and the reading-measure cap in Passage Only View. */
  passageOnly?: boolean;
  paragraphFocus?: boolean;
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
  annotationsDisabled = false,
  highlightMode,
  findQuery,
  findIndex,
  onFindCount,
  scrollTop,
  onScroll,
  textStyle,
  passageOnly,
  paragraphFocus = false,
  children,
}: Props) {
  const paneRef = React.useRef<HTMLDivElement>(null);
  const textRef = React.useRef<HTMLDivElement>(null);
  const [comparativeView, setComparativeView] = React.useState<'both' | 'A' | 'B'>('both');
  const [canSeparate, setCanSeparate] = React.useState(false);
  const sourceHeaders = React.useMemo(() => [...passage.text.matchAll(/^\s*\*{0,4}Passage ([AB])\*{0,4}\s*$/gm)].map(match => match[1]), [passage.text]);
  const comparative = sourceHeaders.length > 0 || /comparative/i.test(passage.format ?? '') && !/non-comparative/i.test(passage.format ?? '');
  React.useEffect(() => { setComparativeView('both'); }, [passage.passageId]);
  const effectiveView = findQuery.trim().length >= 2 ? 'both' : comparativeView;
  React.useLayoutEffect(() => {
    const elements = Array.from(textRef.current?.firstElementChild?.children ?? []) as HTMLElement[];
    const headers = elements.map((element, index) => ({ index, label: element.textContent?.trim().replace(/^\*+|\*+$/g, '') })).filter(entry => /^Passage [AB]$/.test(entry.label ?? ''));
    const reliable = sourceHeaders.join(',') === 'A,B' && headers.length === 2 && headers[0].label === 'Passage A' && headers[1].label === 'Passage B';
    setCanSeparate(reliable);
    for (let index = 0; index < elements.length; index++) {
      const part = reliable && index >= headers[0].index ? index >= headers[1].index ? 'B' : 'A' : null;
      // Keep every original text node mounted so stored annotation offsets do not change.
      elements[index].hidden = Boolean(part && effectiveView !== 'both' && effectiveView !== part);
    }
  }, [passage.passageId, passage.text, sourceHeaders, effectiveView]);
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

  // Restore after passage or layout changes. A wider layout can clamp the
  // scroll position, so the player remembers each layout separately.
  React.useLayoutEffect(() => {
    const el = paneRef.current;
    if (el) el.scrollTop = scrollTop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passage.passageId, passageOnly]);

  const surface = useRcMarkSurface({
    disabled: annotationsDisabled,    textRef,
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
        paragraphFocus && 'rc-paragraph-focus',
        passageOnly ? 'rc-passage-only' : 'border-slate-200 lg:border-r',
        // Cap the reading measure. 52ch in Fraunces measures ~68 real
        // characters, inside the 45-75 readable band. Passage-only reading
        // uses its own responsive measure in player.css.
        !passageOnly && '[&>*]:max-w-[52ch]',
      )}
      ref={paneRef}
      style={textStyle}
      onScroll={(e) => onScroll((e.target as HTMLDivElement).scrollTop)}
    >
      {comparative && <div className="sticky top-0 z-10 mb-3 rounded border bg-[var(--rc-bg)] p-2" role="group" aria-label="Comparative passage view">
        {(['both', 'A', 'B'] as const).map(view => <button type="button" key={view} aria-pressed={effectiveView === view}
          disabled={view !== 'both' && (!canSeparate || findQuery.trim().length >= 2)}
          className="min-h-11 rounded border px-3 py-2 disabled:opacity-50" onClick={() => { setComparativeView(view); if (paneRef.current) paneRef.current.scrollTop = 0; }}>
          {view === 'both' ? 'Both' : `Passage ${view}`}</button>)}
        {!canSeparate && <p className="text-sm">This passage is available in Both view only because its separate parts could not be verified.</p>}
        {findQuery.trim().length >= 2 && <p className="text-sm">Find searches both passages. Clear Find to view one passage.</p>}
      </div>}
      {passage.title && <h1 className="rc-passage-title">{passage.title}</h1>}
      <div className="rc-passage-text" ref={textRef}>
        <RcMarkdown>{passage.text}</RcMarkdown>
      </div>

      {children}

      <RcSelectionPopover
        anchor={annotationsDisabled ? null : anchor}
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
