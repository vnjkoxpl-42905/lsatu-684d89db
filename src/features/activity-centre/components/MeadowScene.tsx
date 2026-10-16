import { useMemo, useRef } from "react";
import { motion, useInView, useReducedMotion, useTransform, type MotionValue } from "framer-motion";

/**
 * The dusk meadow behind the Read, Recall, Colour door.
 *
 * Painted, not photographed, and painted at render time: every ridge is a
 * seeded sum of sines, every blade of grass a seeded quadratic, so the scene
 * ships as geometry rather than as three PNGs that have to arrive. It is one
 * picture cut into five depth planes -- sky, far hills, mid hills, near hills,
 * foreground grass -- and each plane is its own layer so the door can move them
 * at different rates as she scrolls. The demo card sits BETWEEN the near hills
 * and the grass, which is what makes the grass pass in front of it.
 *
 * Palette is the runner's own indigo field lifted into a sky, so the door and
 * the drill room read as one evening.
 */

const W = 1600;
const H = 900;

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** A smooth ridge: a few sines summed, closed to the bottom edge. */
function ridge(seed: number, base: number, amp: number): string {
  const rng = mulberry32(seed);
  const waves = Array.from({ length: 4 }, (_, i) => ({
    f: (0.6 + rng() * 1.4) * (i + 1) * 0.0018,
    p: rng() * Math.PI * 2,
    a: amp / (i + 1.2),
  }));
  const pts: string[] = [];
  for (let x = -40; x <= W + 40; x += 16) {
    const y = waves.reduce((s, w) => s + w.a * Math.sin(w.f * x + w.p), base);
    pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  // Closed 700 units below the frame, not at its edge: the plane rises as she
  // scrolls, and the skirt is what keeps the ground beneath it painted.
  return `M -40 ${H + 700} L ${pts.join(" L ")} L ${W + 40} ${H + 700} Z`;
}

interface Blade {
  d: string;
  w: number;
  c: string;
  /** Seeded 0..4. Buckets the blade into a sway group, so neighbours drift apart. */
  delay: number;
}
interface Flower {
  x: number;
  y: number;
  r: number;
  c: string;
}

const GREENS = ["#4f6d55", "#5f7d64", "#6f8f74", "#7d9a80", "#8fa896"];
const FLOWERS = ["#f2b544", "#f7d27a", "#f6f3ea", "#c9c3ec", "#f3c9a0"];

function grass(seed: number, count: number): { blades: Blade[]; flowers: Flower[] } {
  const rng = mulberry32(seed);
  const blades: Blade[] = [];
  const flowers: Flower[] = [];
  for (let i = 0; i < count; i++) {
    const x = -20 + rng() * (W + 40);
    const h = 36 + rng() * 96;
    const lean = (rng() - 0.5) * 60;
    const y0 = H + 10;
    blades.push({
      d: `M ${x.toFixed(1)} ${y0} Q ${(x + lean * 0.35).toFixed(1)} ${(y0 - h * 0.62).toFixed(1)} ${(x + lean).toFixed(1)} ${(y0 - h).toFixed(1)}`,
      w: 2.5 + rng() * 4,
      c: GREENS[Math.floor(rng() * GREENS.length)],
      delay: rng() * 4,
    });
    if (rng() < 0.22) {
      flowers.push({
        x: x + lean,
        y: y0 - h - 3,
        r: 3 + rng() * 4.5,
        c: FLOWERS[Math.floor(rng() * FLOWERS.length)],
      });
    }
  }
  return { blades, flowers };
}

/**
 * The grass sways in six groups, not in one animation per blade.
 *
 * A keyframe on every `<path>` put 170 animations on the compositor and left
 * them running for as long as the tab was open, for a picture that is often
 * scrolled past. Six groups skewed about the ground line read the same at a
 * glance -- skew, not rotation, because it leans the tips and leaves every
 * base planted -- and cost the browser six. The negative delays start each
 * group part-way through its cycle so they are out of phase on the first
 * frame rather than a beat later.
 */
const SWAY = [
  { delay: -0.0, duration: 5.5 },
  { delay: -1.4, duration: 6.3 },
  { delay: -2.7, duration: 4.9 },
  { delay: -0.7, duration: 7.1 },
  { delay: -3.4, duration: 5.9 },
  { delay: -2.1, duration: 6.7 },
];

export interface MeadowSceneProps {
  /** 0 at the top of the hero, 1 when the hero has scrolled fully past. */
  progress: MotionValue<number>;
  /** Content drawn between the near hills and the foreground grass. */
  children?: React.ReactNode;
}

const SVG_PROPS = {
  viewBox: `0 0 ${W} ${H}`,
  preserveAspectRatio: "xMidYMax slice",
  "aria-hidden": true,
  focusable: false,
} as const;

export function MeadowScene({ progress, children }: MeadowSceneProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  // Nothing here is worth animating while the hero is off screen.
  const inView = useInView(rootRef);

  const far = useMemo(() => ridge(11, 545, 42), []);
  const mid = useMemo(() => ridge(23, 632, 58), []);
  const near = useMemo(() => ridge(37, 728, 46), []);
  const ground = useMemo(() => ridge(51, 862, 12), []);
  const { blades, flowers } = useMemo(() => grass(71, 170), []);
  const bladeGroups = useMemo(() => {
    const groups: Blade[][] = SWAY.map(() => []);
    for (const b of blades) groups[Math.min(SWAY.length - 1, Math.floor((b.delay / 4) * SWAY.length))].push(b);
    return groups;
  }, [blades]);

  // Each plane rides the scroll at its own rate. Negative is "up and away":
  // the foreground rises fastest so it crosses in front of whatever sits
  // behind it, which is the entire trick.
  const skyY = useTransform(progress, [0, 1], [0, 60]);
  const farY = useTransform(progress, [0, 1], [0, -40]);
  const midY = useTransform(progress, [0, 1], [0, -110]);
  const nearY = useTransform(progress, [0, 1], [0, -190]);
  const stageY = useTransform(progress, [0, 1], [0, -230]);
  const grassY = useTransform(progress, [0, 1], [0, -420]);

  const still = reduced ? { y: 0 } : undefined;

  return (
    <div className="mw" ref={rootRef} data-still={!inView || reduced || undefined} aria-hidden={children ? undefined : true}>
      <motion.svg {...SVG_PROPS} className="mw-layer mw-sky" style={still ?? { y: skyY }}>
        <defs>
          <linearGradient id="mw-sky-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#17132e" />
            <stop offset="0.34" stopColor="#352c6a" />
            <stop offset="0.56" stopColor="#675ba0" />
            <stop offset="0.66" stopColor="#a89fe0" />
            <stop offset="0.73" stopColor="#dcc5d6" />
            <stop offset="0.79" stopColor="#f6d6b3" />
            <stop offset="1" stopColor="#f3c9a0" />
          </linearGradient>
          <radialGradient id="mw-sun" cx="0.5" cy="0.66" r="0.45">
            <stop offset="0" stopColor="#fff2d9" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#f8d9b0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f3c9a0" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#mw-sky-g)" />
        <rect width={W} height={H} fill="url(#mw-sun)" />
      </motion.svg>

      <motion.svg {...SVG_PROPS} className="mw-layer mw-far" style={still ?? { y: farY }}>
        <defs>
          <linearGradient id="mw-far-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor="#b9b0dd" />
            <stop offset="1" stopColor="#d8cfe6" />
          </linearGradient>
          <filter id="mw-soft" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <path d={far} fill="url(#mw-far-g)" filter="url(#mw-soft)" />
      </motion.svg>

      <motion.svg {...SVG_PROPS} className="mw-layer mw-mid" style={still ?? { y: midY }}>
        <defs>
          <linearGradient id="mw-mid-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.65" stopColor="#9fb1a8" />
            <stop offset="1" stopColor="#c3cfbe" />
          </linearGradient>
          <filter id="mw-soft2" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        <path d={mid} fill="url(#mw-mid-g)" filter="url(#mw-soft2)" />
      </motion.svg>

      <motion.svg {...SVG_PROPS} className="mw-layer mw-near" style={still ?? { y: nearY }}>
        <defs>
          <linearGradient id="mw-near-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.75" stopColor="#8aa68f" />
            <stop offset="1" stopColor="#a9bfa4" />
          </linearGradient>
        </defs>
        <path d={near} fill="url(#mw-near-g)" />
      </motion.svg>

      {children && (
        <motion.div className="mw-stage" style={still ?? { y: stageY }}>
          {children}
        </motion.div>
      )}

      <motion.svg {...SVG_PROPS} className="mw-layer mw-grass" style={still ?? { y: grassY }}>
        <defs>
          <linearGradient id="mw-ground-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#5f7d64" />
            <stop offset="1" stopColor="#3f5a47" />
          </linearGradient>
        </defs>
        <path d={ground} fill="url(#mw-ground-g)" />
        <g className="mw-blades" fill="none" strokeLinecap="round">
          {bladeGroups.map((group, gi) => (
            <g
              key={gi}
              style={{
                transformOrigin: `0 ${H + 10}px`,
                animationDelay: `${SWAY[gi].delay}s`,
                animationDuration: `${SWAY[gi].duration}s`,
              }}
            >
              {group.map((b, i) => (
                <path key={i} d={b.d} stroke={b.c} strokeWidth={b.w} />
              ))}
            </g>
          ))}
        </g>
        <g className="mw-flowers">
          {flowers.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y} r={f.r} fill={f.c} />
          ))}
        </g>
      </motion.svg>

      <svg {...SVG_PROPS} className="mw-layer mw-grain" preserveAspectRatio="none">
        <filter id="mw-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width={W} height={H} filter="url(#mw-noise)" />
      </svg>
    </div>
  );
}
