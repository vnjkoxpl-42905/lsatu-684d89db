export interface FoyerHeroRingProps {
  onSmartDrill: () => void;
  onResume?: () => void; // undefined → dim
  onAskJoshua?: () => void; // undefined → dim
  resumeLabel?: string; // optional secondary label shown when Resume is enabled
}

type NodePos = { angleDeg: number; x: number; y: number };

// 500x500 viewBox; center at (250, 250), radius 215 (matches Push-1 ring shell)
const CX = 250;
const CY = 250;
const R = 215;

function pos(angleDeg: number): NodePos {
  const rad = (angleDeg * Math.PI) / 180;
  return { angleDeg, x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

const TOP = pos(-90); // Smart Drill
const RIGHT = pos(0); // Resume
const LEFT = pos(180); // Ask Joshua

function NodeButton({
  label,
  sub,
  x,
  y,
  enabled,
  onClick,
}: {
  label: string;
  sub?: string;
  x: number;
  y: number;
  enabled: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center focus:outline-none"
      style={{
        left: `${(x / 500) * 100}%`,
        top: `${(y / 500) * 100}%`,
      }}
    >
      <div
        className={[
          "uppercase font-semibold transition-colors",
          enabled
            ? "text-foreground hover:text-foreground"
            : "text-muted-foreground/40 cursor-not-allowed",
        ].join(" ")}
        style={{ fontSize: 12, letterSpacing: "0.24em" }}
      >
        {label}
      </div>
      {sub ? (
        <div
          className={enabled ? "text-muted-foreground mt-1" : "text-muted-foreground/30 mt-1"}
          style={{ fontSize: 10 }}
        >
          {sub}
        </div>
      ) : null}
    </button>
  );
}

export default function FoyerHeroRing({
  onSmartDrill,
  onResume,
  onAskJoshua,
  resumeLabel,
}: FoyerHeroRingProps) {
  const resumeEnabled = !!onResume;
  const askEnabled = !!onAskJoshua;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full h-full max-w-[600px] max-h-[600px] aspect-square">
        <svg
          viewBox="0 0 500 500"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 w-full h-full"
        >
          <g fill="none" stroke="currentColor">
            <circle
              cx={CX}
              cy={CY}
              r={240}
              strokeOpacity={0.05}
              strokeWidth={0.5}
              strokeDasharray="2 12"
            />
            <circle cx={CX} cy={CY} r={R} strokeOpacity={0.14} strokeWidth={0.75} />
            <circle cx={CX} cy={CY} r={75} strokeOpacity={0.08} strokeWidth={0.75} />
          </g>
        </svg>
        <NodeButton label="Smart Drill" x={TOP.x} y={TOP.y} enabled onClick={onSmartDrill} />
        <NodeButton
          label="Resume"
          sub={resumeEnabled ? resumeLabel : undefined}
          x={RIGHT.x}
          y={RIGHT.y}
          enabled={resumeEnabled}
          onClick={onResume}
        />
        <NodeButton
          label="Ask Joshua"
          x={LEFT.x}
          y={LEFT.y}
          enabled={askEnabled}
          onClick={onAskJoshua}
        />
      </div>
    </div>
  );
}
