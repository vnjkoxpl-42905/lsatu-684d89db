import { MODE_META, type DeskMode } from './deskTasks';

// Point-up isometric hexagon (the cube silhouette). Center at (100, 96),
// circumradius 64. Internal edges run from the center to the top and the two
// lower-side vertices, giving the classic cube read.
const CX = 100;
const CY = 96;
const R = 64;
const SIN = R * 0.5;
const COS = R * 0.8660254;

const V = {
  top: [CX, CY - R],
  upperRight: [CX + COS, CY - SIN],
  lowerRight: [CX + COS, CY + SIN],
  bottom: [CX, CY + R],
  lowerLeft: [CX - COS, CY + SIN],
  upperLeft: [CX - COS, CY - SIN],
} as const;

const OUTLINE = [V.top, V.upperRight, V.lowerRight, V.bottom, V.lowerLeft, V.upperLeft]
  .map((p) => p.join(','))
  .join(' ');

// Tick angle around the orbit ellipse per mode (degrees, 0 = right, CCW).
const TICK_ANGLE: Record<DeskMode, number> = { reply: 250, review: 290, assign: 210 };

// The cube vertex that lights up per mode, so the cube communicates state.
const NODE: Record<DeskMode, readonly [number, number]> = {
  reply: V.top,
  review: V.upperRight,
  assign: V.lowerLeft,
};

/**
 * Persistent wireframe cube. Thin black linework, an orbit ellipse with a
 * tick that moves per mode, and a lit vertex node when a task is selected.
 * Readout below mirrors the reference's "Rotation / 35deg" treatment.
 */
export function DeskCube({ mode, hasTask }: { mode: DeskMode; hasTask: boolean }) {
  const node = NODE[mode];
  const angle = (TICK_ANGLE[mode] * Math.PI) / 180;
  const ellipseRx = 96;
  const ellipseRy = 30;
  const orbitCy = CY + R + 6;
  const tickInner = 0.84;
  const tickOuter = 1.08;
  const tx1 = CX + Math.cos(angle) * ellipseRx * tickInner;
  const ty1 = orbitCy - Math.sin(angle) * ellipseRy * tickInner;
  const tx2 = CX + Math.cos(angle) * ellipseRx * tickOuter;
  const ty2 = orbitCy - Math.sin(angle) * ellipseRy * tickOuter;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 196" className="h-[228px] w-[232px] max-w-full" role="img" aria-label="Mode indicator">
        {/* orbit ellipse */}
        <ellipse cx={CX} cy={orbitCy} rx={ellipseRx} ry={ellipseRy} fill="none" stroke="rgba(13,19,22,0.16)" strokeWidth={1} />
        {/* orbit tick */}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="rgba(13,19,22,0.85)" strokeWidth={3} strokeLinecap="round" />

        {/* cube outline */}
        <polygon points={OUTLINE} fill="none" stroke="#0d1316" strokeWidth={1.6} strokeLinejoin="round" />
        {/* internal edges to center */}
        <line x1={CX} y1={CY} x2={V.top[0]} y2={V.top[1]} stroke="rgba(13,19,22,0.5)" strokeWidth={1} />
        <line x1={CX} y1={CY} x2={V.lowerLeft[0]} y2={V.lowerLeft[1]} stroke="rgba(13,19,22,0.5)" strokeWidth={1} />
        <line x1={CX} y1={CY} x2={V.lowerRight[0]} y2={V.lowerRight[1]} stroke="rgba(13,19,22,0.5)" strokeWidth={1} />

        {/* lit vertex node for the selected mode */}
        <circle cx={node[0]} cy={node[1]} r={4} fill={hasTask ? '#0d1316' : 'rgba(13,19,22,0.2)'} />
      </svg>

      <div className="mt-1 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-black/38">Current mode</div>
        <div className="text-2xl font-semibold tracking-tight">{MODE_META[mode].label}</div>
      </div>
    </div>
  );
}
