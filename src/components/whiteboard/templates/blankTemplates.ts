import type { WhiteboardTemplate, BuildContext, ExcalidrawSkeletonInsert } from './types';
import { rect } from './excalidrawBuilders';

function buildBlankSlot(ctx: BuildContext): ExcalidrawSkeletonInsert {
  return {
    elements: rect({
      x: ctx.origin.x - 110,
      y: ctx.origin.y - 30,
      w: 220,
      h: 60,
      text: 'Slot',
    }),
  };
}

function buildBlankRow(ctx: BuildContext): ExcalidrawSkeletonInsert {
  const W = 180;
  const H = 60;
  const GAP = 16;
  const totalW = W * 3 + GAP * 2;
  const startX = ctx.origin.x - totalW / 2;
  const y = ctx.origin.y - H / 2;
  return {
    elements: [
      ...rect({ x: startX, y, w: W, h: H, text: 'Slot 1' }),
      ...rect({ x: startX + W + GAP, y, w: W, h: H, text: 'Slot 2' }),
      ...rect({ x: startX + (W + GAP) * 2, y, w: W, h: H, text: 'Slot 3' }),
    ],
  };
}

export const blankTemplates: WhiteboardTemplate[] = [
  {
    id: 'blank-slot',
    label: 'Blank slot',
    shortLabel: '☐',
    category: 'blank',
    description: 'A single labeled box to fill in.',
    build: buildBlankSlot,
  },
  {
    id: 'blank-row',
    label: 'Blank row · 3 slots',
    shortLabel: '☐ ☐ ☐',
    category: 'blank',
    description: 'Three labeled boxes side by side for ad-hoc structures.',
    build: buildBlankRow,
  },
];
