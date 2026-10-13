import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The two-column exam body shared by the LR and RC players.
 *
 * Both players show a reading surface on the left and the question with its
 * answer choices on the right, each column scrolling on its own behind a
 * hairline divider. They drifted apart once already — the LR side lost its page
 * cap and the columns stopped lining up with the bottom bar — so the geometry
 * lives here and nowhere else. A spacing fix is made once.
 *
 * What stays configurable is the column ratio, the page cap, and whether the
 * right column is present at all (RC's Passage Only View, and the LR
 * pool-exhausted state, both render a single full-width pane).
 *
 * RC passes `passage-weighted` and LR passes `question-weighted`, both with no
 * page cap, so the defaults below are for other callers rather than for them. The doc used to
 * say LR split evenly and capped at max-w-7xl, which stopped being true when
 * the LR pane was rebuilt and was never corrected.
 */

export type DrillSplitRatio = 'even' | 'passage-weighted' | 'question-weighted';

const RATIO_CLASS: Record<DrillSplitRatio, string> = {
  even: 'grid-cols-1 lg:grid-cols-2',
  'passage-weighted': 'grid-cols-1 lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)]',
  // LR: the stimulus is short (868 characters at most) and capped at a 52ch
  // measure, so it never used a 53% column. The stem and five choices run to
  // 2,050 characters, and they are what fell below the fold. Give them the room.
  'question-weighted': 'grid-cols-1 lg:grid-cols-[minmax(0,42fr)_minmax(0,58fr)]',
};

interface Props {
  left: React.ReactNode;
  /** Omit for a single full-width column. */
  right?: React.ReactNode;
  ratio?: DrillSplitRatio;
  /** Tailwind cap for the page width, or null to fill the frame. */
  maxWidthClassName?: string | null;
  className?: string;
}

export function DrillSplit({
  left,
  right,
  ratio = 'even',
  maxWidthClassName = 'max-w-7xl',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 overflow-hidden',
        right ? RATIO_CLASS[ratio] : 'grid-cols-1',
        maxWidthClassName && `w-full ${maxWidthClassName} mx-auto`,
        className,
      )}
    >
      {left}
      {right}
    </div>
  );
}

export default DrillSplit;
