import React from "react";

/**
 * Speedometer dial like Spreeder's Vital Stats gauges (0 to 2000): white face,
 * green arc, red needle, blue hub, value on the dial. Drawn from the live
 * screenshot; the original artwork was not extracted.
 */
export function SpeedGauge({ value, max = 2000, size = 84 }: { value: number; max?: number; size?: number }): React.ReactElement {
  const start = 135; // degrees, 0 at 3 o'clock, clockwise
  const sweep = 270;
  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  };
  const arc = (r: number, from: number, to: number) => {
    const [x1, y1] = pt(from, r);
    const [x2, y2] = pt(to, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const ratio = Math.min(1, Math.max(0, value / max));
  const needle = start + sweep * ratio;
  const [nx, ny] = pt(needle, 30);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${value} words per minute`}>
      <defs>
        <radialGradient id="rc-bezel" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#f5f5f5" />
          <stop offset="100%" stopColor="#9e9e9e" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#rc-bezel)" />
      <circle cx="50" cy="50" r="42" fill="#ffffff" />
      <path d={arc(36, start, start + sweep)} fill="none" stroke="#2e9a2e" strokeWidth="7" />
      {Array.from({ length: 11 }, (_, i) => {
        const d = start + (sweep * i) / 10;
        const [x1, y1] = pt(d, 31);
        const [x2, y2] = pt(d, 27);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#616161" strokeWidth="1" />;
      })}
      <line x1="50" y1="50" x2={nx} y2={ny} stroke="#e53935" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="50" r="5" fill="#3e92d7" />
      <text x="50" y="78" textAnchor="middle" fontSize="9" fill="#424242" fontFamily="Poppins, sans-serif">{value}</text>
    </svg>
  );
}
