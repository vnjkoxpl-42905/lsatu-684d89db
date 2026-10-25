import * as React from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Filled portion. */
  value: number;
  /** Denominator. A total of 0 renders an empty ring rather than dividing by zero. */
  total: number;
  /** Circle radius in px. 56 is the hero ring, 28 the inline one. */
  radius?: number;
  strokeWidth?: number;
  /** Tailwind text-* class driving the arc color via currentColor. */
  arcClassName?: string;
  /** Tailwind text-* class driving the unfilled track. */
  trackClassName?: string;
  /** Centre content. Defaults to the value over its total. */
  children?: React.ReactNode;
  /** Hover tooltip copy. Omit for no tooltip. */
  tooltip?: string;
  /** Tightens the tooltip for the inline ring size. */
  compact?: boolean;
  className?: string;
}

/**
 * The results donut, extracted from LRSectionResults where it had been written
 * out three times. Geometry is unchanged: the box is the diameter plus one
 * stroke width of slack on each side, which is what produced the original
 * 128px/r=56/stroke=8 and 64px/r=28/stroke=4 rings.
 *
 * The fill is a dashoffset tween, not a keyframe animation. First paint renders
 * the arc empty and a rAF flips `mounted` on the next frame, so the transition
 * has two values to move between.
 */
export default function ScoreRing({
  value,
  total,
  radius = 56,
  strokeWidth = 8,
  arcClassName = "text-primary",
  trackClassName = "text-muted",
  children,
  tooltip,
  compact,
  className,
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const size = radius * 2 + strokeWidth * 2;
  const centre = size / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = total > 0 ? value / total : 0;

  return (
    <div
      className={cn("group relative", className)}
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={trackClassName}
        />
        <circle
          cx={centre}
          cy={centre}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${circumference * (mounted ? 1 - filled : 1)}`}
          className={cn("transition-all duration-500 ease-out", arcClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">/{total}</div>
          </>
        )}
      </div>
      {tooltip && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full px-2 py-1 rounded-md bg-foreground text-background font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md",
            compact ? "-top-2 text-[11px]" : "-top-3 text-xs",
          )}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
