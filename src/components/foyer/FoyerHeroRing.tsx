import * as React from "react";

export type FoyerHeroRingProps = Record<string, never>;

export default function FoyerHeroRing(_props: FoyerHeroRingProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 500 500"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full max-w-[600px] max-h-[600px]"
      >
        <g fill="none" stroke="currentColor">
          <circle
            cx={250}
            cy={250}
            r={240}
            strokeOpacity={0.05}
            strokeWidth={0.5}
            strokeDasharray="2 12"
          />
          <circle cx={250} cy={250} r={215} strokeOpacity={0.14} strokeWidth={0.75} />
          <circle cx={250} cy={250} r={75} strokeOpacity={0.08} strokeWidth={0.75} />
        </g>
      </svg>
    </div>
  );
}
