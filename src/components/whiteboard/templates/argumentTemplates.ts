import type { WhiteboardTemplate, BuildContext, ExcalidrawSkeletonInsert } from './types';
import { rect, separator } from './excalidrawBuilders';

// Item D — proof-skeleton templates. Stacked premise boxes, a horizontal
// inference line, then the conclusion. Tutor types into each box.

function buildArgumentSkeleton(
  ctx: BuildContext,
  premises: number,
): ExcalidrawSkeletonInsert {
  const { origin } = ctx;
  const BOX_W = 320;
  const BOX_H = 56;
  const GAP_Y = 12;
  const SEP_GAP = 18;

  const totalRows = premises + 1; // +1 for the conclusion
  const totalH = totalRows * BOX_H + (totalRows - 1) * GAP_Y + SEP_GAP * 2;
  const startX = origin.x - BOX_W / 2;
  const startY = origin.y - totalH / 2;

  const elements = [];
  let y = startY;

  for (let i = 1; i <= premises; i++) {
    elements.push(
      ...rect({ x: startX, y, w: BOX_W, h: BOX_H, text: `Premise ${i}` }),
    );
    y += BOX_H + GAP_Y;
  }

  // Inference bar
  y += SEP_GAP - GAP_Y;
  elements.push(separator({ x: startX, y, width: BOX_W }));
  y += SEP_GAP;

  elements.push(
    ...rect({ x: startX, y, w: BOX_W, h: BOX_H, text: 'Conclusion' }),
  );

  return { elements };
}

export const argumentTemplates: WhiteboardTemplate[] = [
  {
    id: 'arg-skeleton-3',
    label: 'Argument · 3 premises',
    shortLabel: 'P1 P2 P3 ∴ C',
    category: 'argument',
    description: 'Three premise boxes, an inference line, then a conclusion box. Tutor fills each in.',
    build: (ctx) => buildArgumentSkeleton(ctx, 3),
  },
  {
    id: 'arg-skeleton-2',
    label: 'Argument · 2 premises',
    shortLabel: 'P1 P2 ∴ C',
    category: 'argument',
    description: 'Two premise boxes, an inference line, then a conclusion box.',
    build: (ctx) => buildArgumentSkeleton(ctx, 2),
  },
];
