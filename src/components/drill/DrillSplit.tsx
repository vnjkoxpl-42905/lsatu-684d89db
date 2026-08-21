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
 * What stays configurable is only what the two players genuinely disagree on:
 * the column ratio (LR splits evenly, RC gives the passage the extra room), the
 * page cap (LR caps at the bottom bar's max-w-7xl, RC fills its frame), and
 * whether the right column is present at all (RC's Passage Only View, and the
 * LR pool-exhausted state, both render a single full-width pane).
 */

export type DrillSplitRatio = 'even' | 'passage-weighted';

const RATIO_CLASS: Record<DrillSplitRatio, string> = {
  even: 'grid-cols-1 lg:grid-cols-2',
  'passage-weighted': 'grid-cols-1 lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)]',
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
