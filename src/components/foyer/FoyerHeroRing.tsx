import * as React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type NodeId = "smart" | "ask" | "resume";

interface NodeDef {
  id: NodeId;
  label: string;
  theta: number;
  onClick: () => void;
}

const VIEWBOX = 800;
const CENTER = 400;
const RADIUS = 300;
const INNER_R = 120;
const LABEL_OFFSET = 52; // perpendicular distance from ring to label baseline
const LABEL_FONT_PX = 10;
const LABEL_TRACKING_EM = 0.28;

function polar(theta: number, r: number) {
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
        onClick: () => navigate("/drill"),
      },
      {
        id: "ask",
        label: "ASK",
        theta: (2 * Math.PI) / 3,
        onClick: () => toast.info("Your AI coach is coming soon"),
      },
      {
        id: "resume",
        label: "RESUME",
        theta: (4 * Math.PI) / 3,
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
        className="aspect-square w-full max-w-[560px] text-foreground"
        role="img"
        aria-label="Foyer actions"
      >
        {/* Outer ghost ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          className="fill-none stroke-border"
          strokeWidth={1}
          strokeOpacity={0.25}
        />
        {/* Inner echo */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={INNER_R}
          className="fill-none stroke-border"
          strokeWidth={1}
          strokeOpacity={0.18}
        />

        {nodes.map((n) => {
          const dot = polar(n.theta, RADIUS);
          const labelPoint = polar(n.theta, RADIUS + LABEL_OFFSET);
          const isActive = activeId === n.id;

          // Anchor based on horizontal position
          const cos = Math.cos(n.theta - Math.PI / 2);
          let anchor: "start" | "middle" | "end" = "middle";
          if (cos > 0.3) anchor = "start";
          else if (cos < -0.3) anchor = "end";

          const labelX = labelPoint.x;
          const labelY = labelPoint.y + 3; // baseline nudge
          const uLen = underlineLen(n.label);
          const uY = labelY + 5;
          const uX1 =
            anchor === "middle"
              ? labelX - uLen / 2
              : anchor === "start"
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
              {/* Wide invisible hit target spanning dot + label */}
              <circle
                cx={(dot.x + labelX) / 2}
                cy={(dot.y + labelY) / 2}
                r={56}
                fill="transparent"
                pointerEvents="all"
              />
              {/* Soft halo behind active dot */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={22}
                className="fill-primary"
                fillOpacity={isActive ? 0.18 : 0}
                style={{
                  filter: "blur(6px)",
                  transition: "fill-opacity 200ms ease",
                }}
                pointerEvents="none"
              />
              {/* Dot anchor */}
              <circle
                cx={dot.x}
                cy={dot.y}
                r={isActive ? 5 : 3.5}
                className="fill-foreground"
                style={{ transition: "r 200ms ease" }}
                pointerEvents="none"
              />
              {/* Label */}
              <text
                x={labelX}
                y={labelY}
                textAnchor={anchor}
                className="fill-foreground"
                fillOpacity={isActive ? 1 : 0.7}
                style={{
                  fontSize: LABEL_FONT_PX,
                  letterSpacing: `${LABEL_TRACKING_EM}em`,
                  textTransform: "uppercase",
                  fontWeight: 500,
                  userSelect: "none",
                  transition: "fill-opacity 200ms ease",
                }}
                pointerEvents="none"
              >
                {n.label}
              </text>
              {/* Active underline */}
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
