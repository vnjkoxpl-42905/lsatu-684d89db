import type { LucideIcon } from "lucide-react";
import { MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FoyerHeroRingProps {
  onSmartDrill: () => void;
  onAskJoshua?: () => void; // undefined → dim
  smartDrillIcon?: LucideIcon;
  askJoshuaIcon?: LucideIcon;
  // Optional center focus card. Rendered only when focusHeadline is truthy.
  focusLabel?: string;
  focusHeadline?: string;
  focusSubline?: string;
  focusCtaLabel?: string;
  onFocusCta?: () => void;
}

type NodePos = { angleDeg: number; x: number; y: number };

// 500x500 viewBox; center at (250, 250), radius 215.
const CX = 250;
const CY = 250;
const R = 215;

function pos(angleDeg: number): NodePos {
  const rad = (angleDeg * Math.PI) / 180;
  return { angleDeg, x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

const TOP = pos(-90); // Smart Drill — 12 o'clock
const BOTTOM = pos(90); // Ask Joshua — 6 o'clock

function NodeButton({
  label,
  icon: Icon,
  x,
  y,
  enabled,
  pulse,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  x: number;
  y: number;
  enabled: boolean;
  pulse?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={onClick}
      aria-label={label}
      className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
      style={{
        left: `${(x / 500) * 100}%`,
        top: `${(y / 500) * 100}%`,
      }}
    >
      <div className="relative flex flex-col items-center gap-2">
        <div className="relative">
          {enabled && (
            <div
              className="absolute inset-0 -z-10 rounded-full bg-foreground/10 blur-md scale-150"
              aria-hidden
            />
          )}
          {enabled && pulse && (
            <div
              className="absolute inset-0 -z-10 rounded-full bg-foreground/20 opacity-20 animate-ping"
              aria-hidden
            />
          )}
          <div
            className={[
              "relative w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              enabled
                ? "border-border/80 bg-background/80 backdrop-blur-sm text-foreground hover:border-foreground hover:shadow-lg hover:shadow-foreground/10"
                : "border-border/30 bg-background/40 text-muted-foreground/40 cursor-not-allowed",
            ].join(" ")}
          >
            <Icon size={18} aria-hidden />
          </div>
        </div>
        <div
          className={[
            "uppercase font-semibold whitespace-nowrap",
            enabled ? "text-muted-foreground" : "text-muted-foreground/40",
          ].join(" ")}
          style={{ fontSize: 10, letterSpacing: "0.22em" }}
        >
          {label}
        </div>
      </div>
    </button>
  );
}

export default function FoyerHeroRing({
  onSmartDrill,
  onAskJoshua,
  smartDrillIcon = Zap,
  askJoshuaIcon = MessageCircle,
  focusLabel,
  focusHeadline,
  focusSubline,
  focusCtaLabel,
  onFocusCta,
}: FoyerHeroRingProps) {
  const askEnabled = !!onAskJoshua;
  const hasFocus = !!focusHeadline;

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
            <circle cx={CX} cy={CY} r={140} strokeOpacity={0.08} strokeWidth={0.75} />
          </g>
        </svg>

        <NodeButton
          label="Smart Drill"
          icon={smartDrillIcon}
          x={TOP.x}
          y={TOP.y}
          enabled
          pulse
          onClick={onSmartDrill}
        />
        <NodeButton
          label="Ask Joshua"
          icon={askJoshuaIcon}
          x={BOTTOM.x}
          y={BOTTOM.y}
          enabled={askEnabled}
          onClick={onAskJoshua}
        />

        {hasFocus && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm px-5 py-4 text-center max-w-[220px] shadow-sm">
              {focusLabel && (
                <div
                  className="uppercase text-muted-foreground"
                  style={{ fontSize: 10, letterSpacing: "0.22em" }}
                >
                  {focusLabel}
                </div>
              )}
              <div className="mt-1 text-base font-semibold text-foreground">
                {focusHeadline}
              </div>
              {focusSubline && (
                <div className="mt-0.5 text-xs text-muted-foreground">{focusSubline}</div>
              )}
              {focusCtaLabel && onFocusCta && (
                <Button
                  size="sm"
                  onClick={onFocusCta}
                  className="mt-3"
                  aria-label={focusCtaLabel}
                >
                  {focusCtaLabel}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
