import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type NodeId = "smart" | "ask" | "resume";

interface NodeDef {
  id: NodeId;
  label: string;
  theta: number;
  anchor: "start" | "middle" | "end";
  labelOffsetX: number;
  labelOffsetY: number;
  onClick: () => void;
}

const VIEWBOX = 800;
const CENTER = 400;
const RADIUS = 320;
const INNER_R = 110;
const LABEL_FONT_PX = 11;
const LABEL_TRACKING_EM = 0.25;

function polar(theta: number, r = RADIUS) {
  return {
    x: CENTER + r * Math.cos(theta - Math.PI / 2),
    y: CENTER + r * Math.sin(theta - Math.PI / 2),
  };
}

function underlineLen(label: string): number {
  const perChar = LABEL_FONT_PX * (0.6 + LABEL_TRACKING_EM);
  return Math.max(label.length * perChar, 16);
}

export default function FoyerHeroRing() {
  const navigate = useNavigate();
  const [activeId, setActiveId] = React.useState<NodeId | null>(null);

  const nodes: NodeDef[] = React.useMemo(
    () => [
      {
        id: "smart",
        label: "SMART DRILL",
        theta: 0,
        anchor: "middle",
        labelOffsetX: 0,
        labelOffsetY: -28,
        onClick: () => navigate("/drill"),
      },
      {
        id: "ask",
        label: "ASK",
        theta: (2 * Math.PI) / 3,
        anchor: "start",
        labelOffsetX: 20,
        labelOffsetY: 6,
        onClick: () => toast.info("Your AI coach is coming soon"),
      },
      {
        id: "resume",
        label: "RESUME",
        theta: (4 * Math.PI) / 3,
        anchor: "end",
        labelOffsetX: -20,
        labelOffsetY: 6,
        // TODO(F-future): wire to useLastSession hook once built.
        onClick: () => navigate("/drill"),
      },
    ],
    [navigate],
  );

  const setActive = (id: NodeId) => setActiveId(id);
  const clearActive = (id: NodeId) =>
    setActiveId((cur) => (cur === id ? null : cur));

  return (
    <div className="relative flex w-full items-center justify-center">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="aspect-square w-full max-w-[640px] text-foreground"
        role="img"
        aria-label="Foyer actions"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          className="fill-none stroke-border"
          strokeWidth={1}
          strokeOpacity={0.4}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_R}
          className="fill-none stroke-border"
          strokeWidth={1}
          strokeOpacity={0.3}
        />

        {nodes.map((n) => {
          const p = polar(n.theta);
          const isActive = activeId === n.id;
          const labelX = p.x + n.labelOffsetX;
          const labelY = p.y + n.labelOffsetY;
          const uLen = underlineLen(n.label);
          const uY = labelY + 6;
          const uX1 =
            n.anchor === "middle"
              ? labelX - uLen / 2
              : n.anchor === "start"
                ? labelX
                : labelX - uLen;
          const uX2 = uX1 + uLen;

          return (
            <g
              key={n.id}
              tabIndex={0}
              role="button"
              aria-label={n.label}
              onClick={n.onClick}
              onMouseEnter={() => setActive(n.id)}
              onMouseLeave={() => clearActive(n.id)}
              onFocus={() => setActive(n.id)}
              onBlur={() => clearActive(n.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  n.onClick();
                }
              }}
              className="cursor-pointer outline-none"
            >
              {/* Invisible hit target widens the clickable area */}
              <circle
                cx={p.x}
                cy={p.y}
                r={44}
                fill="transparent"
                pointerEvents="all"
              />
              {/* Soft glow behind active dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={26}
                className="fill-primary"
                fillOpacity={isActive ? 0.18 : 0}
                style={{
                  filter: "blur(6px)",
                  transition: "fill-opacity 200ms ease",
                }}
                pointerEvents="none"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={6}
                className="fill-foreground"
                pointerEvents="none"
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor={n.anchor}
                className="fill-foreground"
                style={{
                  fontSize: LABEL_FONT_PX,
                  letterSpacing: `${LABEL_TRACKING_EM}em`,
                  textTransform: "uppercase",
                  fontWeight: 500,
                  userSelect: "none",
                }}
                pointerEvents="none"
              >
                {n.label}
              </text>
              <line
                x1={uX1}
                x2={uX2}
                y1={uY}
                y2={uY}
                className="stroke-primary"
                strokeWidth={1}
                style={{
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 200ms ease",
                }}
                pointerEvents="none"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
