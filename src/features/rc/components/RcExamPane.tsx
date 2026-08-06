import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The two-column exam body, replicating the LR player's OfficialQuestionPane
 * geometry exactly: a 53/47 grid with a hairline divider, both columns white,
 * each scrolling on its own.
 *
 * Colors come from --rc-bg / --rc-fg rather than Tailwind literals so the
 * accessibility schemes can repaint the reading surface without touching the
 * frame, toolbar or footer around it.
 */

interface Props {
  /** rc-scheme-* class, or empty for the default black-on-white. */
  schemeClassName: string;
  /** Passage Only View: the passage takes the full width and reflows. */
  passageOnly: boolean;
  passage: React.ReactNode;
  question: React.ReactNode;
}

export function RcExamPane({ schemeClassName, passageOnly, passage, question }: Props) {
  return (
    <div className={cn('rc-exam relative flex h-full min-h-0 flex-col', schemeClassName)}>
      <div
        className={cn(
          'grid min-h-0 flex-1 overflow-hidden',
          passageOnly
            ? 'grid-cols-1'
            : 'grid-cols-1 lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)]',
        )}
      >
        {passage}
        {!passageOnly && question}
      </div>
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
 * The LR player's type stack, scaled. Fraunces at 17/1.7 for the reading
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
      fontSize: `${17 * fontScale}px`,
      lineHeight: 1.7 + extraLeading,
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
