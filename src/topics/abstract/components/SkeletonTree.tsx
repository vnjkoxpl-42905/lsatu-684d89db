import type { PlaygroundStimulus, SlotId } from "../types";
import { SLOT_LABELS } from "../types";

export interface SkeletonTreeProps {
  stimulus: PlaygroundStimulus;
}

// SkeletonTree: SVG visualisation of slot relationships in a stimulus.
// Lays slots vertically with arrows from supports to what they support.

const SLOT_ORDER: SlotId[] = [
  "opposing-conclusion",
  "opposing-evidence",
  "background",
  "concession",
  "authors-conclusion",
  "intermediate-conclusion",
  "authors-evidence",
];

// Where each slot's arrow points to (canonical relationships).
const EDGES: Partial<Record<SlotId, SlotId>> = {
  "opposing-evidence": "opposing-conclusion",
  "authors-evidence": "intermediate-conclusion",
  "intermediate-conclusion": "authors-conclusion",
  concession: "authors-conclusion",
};

export function SkeletonTree({ stimulus }: SkeletonTreeProps) {
  const presentSlots = new Set(stimulus.clauses.map((c) => c.slot));
  const slots = SLOT_ORDER.filter((s) => presentSlots.has(s));

  if (!slots.length) return null;

  const rowHeight = 56;
  const width = 460;
  const height = slots.length * rowHeight + 24;
  const positions: Record<string, { x: number; y: number }> = {};
  slots.forEach((s, i) => {
    positions[s] = { x: width / 2, y: i * rowHeight + 28 };
  });

  return (
    <svg
      role="img"
      aria-label="Slot relationship tree"
      viewBox={`0 0 ${width} ${height}`}
      className="skeleton-tree w-full max-w-md mx-auto text-foreground"
    >
      {slots.map((s) => {
        const target = EDGES[s];
        if (!target || !positions[target]) return null;
        const from = positions[s];
        const to = positions[target];
        return (
          <line
            key={`edge-${s}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="currentColor"
            strokeOpacity={0.4}
            strokeDasharray="3 4"
            strokeWidth={1}
            markerEnd="url(#skeleton-arrow)"
          />
        );
      })}
      <defs>
        <marker
          id="skeleton-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path
            d="M0,0 L10,5 L0,10 z"
            fill="currentColor"
            opacity={0.55}
          />
        </marker>
      </defs>
      {slots.map((s) => {
        const { x, y } = positions[s];
        return (
          <g key={`node-${s}`}>
            <rect
              x={x - 130}
              y={y - 16}
              width={260}
              height={32}
              rx={8}
              ry={8}
              fill="hsl(var(--card))"
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="currentColor"
            >
              {SLOT_LABELS[s]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
