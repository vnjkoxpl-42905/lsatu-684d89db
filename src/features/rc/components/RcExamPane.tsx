import * as React from 'react';
import { cn } from '@/lib/utils';
import { DrillSplit } from '@/components/drill/DrillSplit';

/**
 * The RC exam body: the shared DrillSplit primitive at the passage-weighted
 * 53/47 ratio, filling its frame rather than taking the LR player's page cap.
 * The column geometry itself lives in DrillSplit so RC and LR cannot drift.
 *
 * Colors come from --rc-bg / --rc-fg rather than Tailwind literals so the
 * accessibility schemes can repaint the reading surface without touching the
 * frame, toolbar or footer around it.
 */

interface Props {
  /** rc-scheme-* class, or empty for the default black-on-white. */
  schemeClassName: string;
  responsive?: boolean;
  passageFocusKey?: string;
  onPaneMode?: (mode: 'passage' | 'question' | 'shared') => void;
  /** Passage Only View: the passage takes the full width and reflows. */
  passageOnly: boolean;
  passage: React.ReactNode;
  question: React.ReactNode;
}

export function RcExamPane({ schemeClassName, passageOnly, passage, question, responsive = false, passageFocusKey = '', onPaneMode }: Props) {
  const container = React.useRef<HTMLDivElement>(null);
  const [compact, setCompact] = React.useState(() => typeof window !== 'undefined' && window.innerWidth < 900);
  const [focusedPane, setFocusedPane] = React.useState<'passage' | 'question'>('passage');
  React.useEffect(() => {
    const element = container.current;
    if (!responsive || !element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => { const width = entries[0]?.contentRect.width; if (width > 0) setCompact(width < 900); });
    observer.observe(element);
    return () => observer.disconnect();
  }, [responsive]);
  React.useEffect(() => { if (passageFocusKey) setFocusedPane('passage'); }, [passageFocusKey]);
  const compactLayout = responsive && compact && !passageOnly;
  React.useEffect(() => { onPaneMode?.(passageOnly ? 'passage' : compactLayout ? focusedPane : 'shared'); }, [passageOnly, compactLayout, focusedPane, onPaneMode]);
  return (
    <div ref={container} className={cn('rc-exam relative flex h-full min-h-0 flex-col', schemeClassName)}>
      {compactLayout && <div role="group" aria-label="Reader pane" className="flex gap-2 border-b bg-[var(--rc-bg)] p-2 text-[var(--rc-fg)]">
        <button type="button" aria-pressed={focusedPane === 'passage'} className="min-h-11 rounded border px-3" onClick={() => setFocusedPane('passage')}>Passage</button>
        <button type="button" aria-pressed={focusedPane === 'question'} className="min-h-11 rounded border px-3" onClick={() => setFocusedPane('question')}>Questions</button>
      </div>}
      <DrillSplit
        ratio="passage-weighted"
        maxWidthClassName={null}
        className={responsive && !compact && !passageOnly ? '!grid-cols-[minmax(0,53fr)_minmax(0,47fr)]' : undefined}
        left={compactLayout && focusedPane === 'question' ? question : passage}
        right={passageOnly || compactLayout ? undefined : question}
      />
    </div>
  );
}

export interface RcTypeStyles {
  passage: React.CSSProperties;
  question: React.CSSProperties;
  choiceText: React.CSSProperties;
  choiceBadge: React.CSSProperties;
}

/**
 * The LR player's type stack, scaled. Fraunces at 18/1.6 for the reading
 * surface and Helvetica Neue at 16/1.6 for stem and choices; `extraLeading` is
 * added on top of both so the accessibility control cannot flatten the
 * difference between them.
 *
 * Fraunces is a variable font with an optical-size axis. Left on `auto` the
 * browser picks the cut from the rendered px size, which drifts as the student
 * changes the scale, so it is pinned to the text-optimised end.
 */
export function rcTypeStyles(fontScale: number, extraLeading: number): RcTypeStyles {
  const base = 16 * fontScale;
  return {
    passage: {
      color: 'var(--rc-fg)',
      fontFamily: 'Fraunces, ui-serif, Georgia, serif',
      fontSize: `${18 * fontScale}px`,
      lineHeight: 1.6 + extraLeading,
      fontWeight: 400,
      fontOpticalSizing: 'none',
      fontVariationSettings: '"opsz" 14',
    },
    question: {
      color: 'var(--rc-fg)',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: `${base}px`,
      lineHeight: 1.6 + extraLeading,
      fontWeight: 400,
    },
    choiceText: { fontSize: `${base}px` },
    choiceBadge: { fontSize: `${base * 0.78}px` },
  };
}

export default RcExamPane;
