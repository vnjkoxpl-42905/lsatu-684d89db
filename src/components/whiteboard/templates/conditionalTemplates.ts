import type { WhiteboardTemplate, BuildContext, ExcalidrawSkeletonInsert } from './types';
import { rect, arrow, text } from './excalidrawBuilders';
import { parseSentenceForGroup, type ConditionalGroup } from './conditionalParse';

// Item C — four conditional-diagram templates. Each builds the same
// visual skeleton (antecedent box → arrow → consequent box) but parses
// the selected text differently based on indicator group.

function buildConditional(
  ctx: BuildContext,
  group: ConditionalGroup,
  groupLabel: string,
): ExcalidrawSkeletonInsert {
  const { origin, selectedText } = ctx;
  const { antecedent, consequent } = selectedText
    ? parseSentenceForGroup(selectedText, group)
    : { antecedent: '', consequent: '' };

  const BOX_W = 220;
  const BOX_H = 60;
  const GAP = 80;

  const leftX = origin.x - BOX_W - GAP / 2;
  const rightX = origin.x + GAP / 2;
  const y = origin.y - BOX_H / 2;

  const left = rect({ x: leftX, y, w: BOX_W, h: BOX_H, text: antecedent || 'antecedent' });
  const right = rect({ x: rightX, y, w: BOX_W, h: BOX_H, text: consequent || 'consequent' });
  const link = arrow({
    startX: leftX + BOX_W + 4,
    startY: y + BOX_H / 2,
    endX: rightX - 4,
    endY: y + BOX_H / 2,
  });
  const label = text({
    x: leftX,
    y: y - 28,
    w: 200,
    content: groupLabel,
    fontSize: 14,
    bold: true,
  });

  return { elements: [label, ...left, ...right, link] };
}

export const conditionalTemplates: WhiteboardTemplate[] = [
  {
    id: 'cond-group-1',
    label: 'Group 1',
    shortLabel: 'G1',
    category: 'conditional',
    description: 'Sufficient indicator (if / when / every). Select a sentence first to auto-fill.',
    build: (ctx) => buildConditional(ctx, 1, 'Group 1'),
  },
  {
    id: 'cond-group-2',
    label: 'Group 2',
    shortLabel: 'G2',
    category: 'conditional',
    description: 'Necessary indicator (only / only if). Indicator marks the consequent.',
    build: (ctx) => buildConditional(ctx, 2, 'Group 2'),
  },
  {
    id: 'cond-group-3',
    label: 'Group 3',
    shortLabel: 'G3',
    category: 'conditional',
    description: 'Negated sufficient (no / none / never). Consequent gets negation.',
    build: (ctx) => buildConditional(ctx, 3, 'Group 3'),
  },
  {
    id: 'cond-group-4',
    label: 'Group 4 — Unless',
    shortLabel: 'G4',
    category: 'conditional',
    description: '"Unless X, Y" rewrites to "¬X → Y".',
    build: (ctx) => buildConditional(ctx, 4, 'Group 4 (unless)'),
  },
];
