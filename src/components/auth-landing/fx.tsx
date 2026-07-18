import * as React from 'react';

/**
 * fx — the Academy's instrument layer.
 *
 * Everything here is decorative machinery layered over the page:
 *   - AcaPreloader: an engraved seal that draws itself, then parts like a curtain
 *   - AcaDust:      a 2D-canvas mote field (hero drift / final-CTA embers)
 *   - AcaPlumb:     a fixed plumb line on the right edge; Roman markers light
 *                   as their section crosses the viewport, click to travel
 *   - GoldSeam:     a kintsugi crack that draws across section boundaries
 *   - useMagnetic:  CTA magnetism, transform-only, spring-lerped
 *
 * All of it obeys prefers-reduced-motion, pauses off screen, caps DPR, and
 * renders nothing on coarse pointers where it would be noise.
 */

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ── Preloader — the seal ─────────────────────────────────────────────────────
// Once per browser session. Draws a circle-in-square seal with XII ticks,
// flashes the wordmark, then splits open. Total ~1.7s; reduced motion skips.
export const AcaPreloader = () => {
  const [phase, setPhase] = React.useState<'draw' | 'part' | 'gone'>(() =>
    typeof window === 'undefined' || sessionStorage.getItem('aca_seal') || reducedMotion() ? 'gone' : 'draw');

  // Mount-once: both timers are scheduled together. Depending on `phase`
  // here would let the draw→part re-run's cleanup cancel the second timer
  // and strand the overlay at 'part' forever.
  React.useEffect(() => {
    if (phase !== 'draw') return;
    sessionStorage.setItem('aca_seal', '1');
    const t1 = window.setTimeout(() => setPhase('part'), 1500);
    const t2 = window.setTimeout(() => setPhase('gone'), 2450);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'gone') return null;
  const parting = phase === 'part';
  return (
    <div className={`aca-seal${parting ? ' is-parting' : ''}`} aria-hidden="true">
      <div className="aca-seal-half top" />
      <div className="aca-seal-half bottom" />
      <div className="aca-seal-core">
        <svg viewBox="0 0 120 120" width="96" height="96">
          <rect className="aca-seal-draw" x="18" y="18" width="84" height="84" fill="none"
            stroke="rgba(198,164,103,0.55)" strokeWidth="1" style={{ ['--len' as string]: 336 }} />
          <circle className="aca-seal-draw" cx="60" cy="60" r="42" fill="none"
            stroke="rgba(234,229,218,0.75)" strokeWidth="1" style={{ ['--len' as string]: 264, animationDelay: '120ms' }} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = 60 + Math.cos(a) * 42, y1 = 60 + Math.sin(a) * 42;
            const x2 = 60 + Math.cos(a) * 37, y2 = 60 + Math.sin(a) * 37;
            return <line key={i} className="aca-seal-tick" x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(138,216,226,0.7)" strokeWidth="1" style={{ animationDelay: `${420 + i * 55}ms` }} />;
          })}
        </svg>
        <span className="aca-seal-word">LSAT&thinsp;U</span>
      </div>
    </div>
  );
};

// ── Dust — drifting motes / rising embers on a 2D canvas ────────────────────
// mode "drift": hero. Slow gold motes with cursor parallax.
// mode "rise":  final CTA. Embers float upward and gutter out.
export const AcaDust = ({ mode = 'drift', count = 70 }: { mode?: 'drift' | 'rise'; count?: number }) => {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas || reducedMotion()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coarse = !finePointer();
    const N = Math.round(count * (coarse ? 0.5 : 1));
    type P = { x: number; y: number; z: number; vx: number; vy: number; r: number; a: number; tw: number; hue: number };
    let pts: P[] = [];
    let w = 0, h = 0, raf = 0, running = false;
    let mx = 0.5, my = 0.5, smx = 0.5, smy = 0.5;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const spawn = (i: number, fresh = false): P => {
      const z = 0.35 + Math.random() * 0.65;
      return mode === 'drift'
        ? { x: Math.random() * w, y: Math.random() * h, z, vx: (Math.random() - 0.5) * 0.05, vy: -0.02 - Math.random() * 0.05, r: (0.6 + Math.random() * 1.5) * z, a: 0.12 + Math.random() * 0.4, tw: Math.random() * Math.PI * 2, hue: Math.random() }
        : { x: Math.random() * w, y: fresh ? h + 6 : Math.random() * h, z, vx: (Math.random() - 0.5) * 0.12, vy: -(0.22 + Math.random() * 0.5) * z, r: (0.5 + Math.random() * 1.6) * z, a: 0.15 + Math.random() * 0.5, tw: Math.random() * Math.PI * 2, hue: Math.random() };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!pts.length) pts = Array.from({ length: N }, (_, i) => spawn(i));
    };

    const onPointer = (e: PointerEvent) => {
      mx = e.clientX / window.innerWidth; my = e.clientY / window.innerHeight;
    };

    let t = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      t += 0.016;
      smx += (mx - smx) * 0.03; smy += (my - smy) * 0.03;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pts) {
        p.x += p.vx + Math.sin(t * 0.6 + p.tw) * 0.05 * p.z;
        p.y += p.vy;
        const px = p.x + (smx - 0.5) * 26 * p.z * (mode === 'drift' ? 1 : 0.3);
        const py = p.y + (smy - 0.5) * 14 * p.z * (mode === 'drift' ? 1 : 0.3);
        if (p.y < -8 || p.x < -8 || p.x > w + 8) Object.assign(p, spawn(0, mode === 'rise'));
        const flicker = 0.65 + Math.sin(t * (1.2 + p.z) + p.tw) * 0.35;
        const alpha = p.a * flicker * (mode === 'rise' ? Math.min(1, (p.y / h) * 1.6 + 0.15) : 1);
        // Bone-gold majority with a rare cyan instrument mote.
        const cyan = p.hue > 0.94;
        ctx.fillStyle = cyan
          ? `rgba(138,216,226,${alpha * 0.8})`
          : `rgba(226,196,138,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    };

    const start = () => { if (!running) { running = true; resize(); raf = requestAnimationFrame(step); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '60px 0px' });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', resize);
    if (!coarse && mode === 'drift') window.addEventListener('pointermove', onPointer, { passive: true });

    return () => {
      stop(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [mode, count]);

  return <canvas ref={ref} className="aca-dust" aria-hidden="true" />;
};

// ── Plumb line — fixed scroll rail with Roman section markers ───────────────
export type PlumbStop = { id: string; label: string; numeral: string };

export const AcaPlumb = ({ stops }: { stops: PlumbStop[] }) => {
  const [active, setActive] = React.useState(0);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        let idx = 0;
        for (let i = 0; i < stops.length; i++) {
          const el = document.getElementById(stops[i].id);
          if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) idx = i;
        }
        setActive(idx);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [stops]);

  return (
    <nav className="aca-plumb" aria-label="Page sections">
      <div className="aca-plumb-rail" aria-hidden="true">
        <div className="aca-plumb-fill" style={{ transform: `scaleY(${progress})` }} />
      </div>
      {stops.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`aca-plumb-stop${i === active ? ' is-active' : ''}`}
          aria-label={s.label}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' })}
        >
          <span className="aca-plumb-numeral" aria-hidden="true">{s.numeral}</span>
          <span className="aca-plumb-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  );
};

// ── Gold seam — a kintsugi vein drawn across a section boundary ─────────────
// Each variant is a different fracture; the vein draws in when scrolled into
// view (the parent must carry .vr so is-in cascades).
const SEAMS = [
  'M0 26 L 190 22 L 285 34 L 420 12 L 560 30 L 705 18 L 830 38 L 990 16 L 1120 28 L 1240 20 L 1440 26',
  'M0 20 L 160 30 L 330 14 L 470 34 L 610 22 L 780 36 L 905 12 L 1080 30 L 1230 18 L 1440 24',
  'M0 32 L 140 18 L 310 30 L 465 14 L 640 34 L 800 20 L 950 34 L 1130 14 L 1290 30 L 1440 22',
];

export const GoldSeam = ({ variant = 0 }: { variant?: 0 | 1 | 2 }) => {
  const grad = `acaSeamGrad${variant}`;
  return (
    <div className="aca-seam vr" aria-hidden="true">
      <svg viewBox="0 0 1440 48" preserveAspectRatio="none">
        <defs>
          <linearGradient id={grad} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(198,164,103,0)" />
            <stop offset="0.18" stopColor="rgba(198,164,103,0.55)" />
            <stop offset="0.5" stopColor="rgba(232,207,150,0.95)" />
            <stop offset="0.82" stopColor="rgba(198,164,103,0.55)" />
            <stop offset="1" stopColor="rgba(198,164,103,0)" />
          </linearGradient>
        </defs>
        <path className="aca-seam-path aca-seam-glow" stroke={`url(#${grad})`} d={SEAMS[variant]} pathLength={1000} />
        <path className="aca-seam-path" stroke={`url(#${grad})`} d={SEAMS[variant]} pathLength={1000} />
      </svg>
    </div>
  );
};

// ── Magnetism — pull a CTA toward a nearby cursor, transform-only ───────────
export function useMagnetic<T extends HTMLElement>(strength = 0.28, radius = 110) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !finePointer() || reducedMotion()) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0, engaged = false;

    const loop = () => {
      cx += (tx - cx) * 0.16; cy += (ty - cy) * 0.16;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(cx - tx) > 0.1 || Math.abs(cy - ty) > 0.1) raf = requestAnimationFrame(loop);
      else if (!engaged && tx === 0 && ty === 0) { el.style.transform = ''; raf = 0; }
      else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      const reach = Math.max(r.width, r.height) / 2 + radius;
      if (dist < reach) {
        engaged = true;
        const pull = 1 - dist / reach;
        tx = dx * strength * pull; ty = dy * strength * pull;
      } else if (engaged) {
        engaged = false; tx = 0; ty = 0;
      } else return;
      kick();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); el.style.transform = ''; };
  }, [strength, radius]);
  return ref;
}

// ── Styles for the instrument layer ──────────────────────────────────────────
export const FX_CSS = `
  /* Preloader */
  .aca-seal { position: fixed; inset: 0; z-index: 90; pointer-events: none; }
  .aca-seal-half { position: absolute; left: 0; right: 0; height: 50.5%; background: #070606; transition: transform 900ms cubic-bezier(0.76, 0, 0.24, 1); }
  .aca-seal-half.top { top: 0; }
  .aca-seal-half.bottom { bottom: 0; }
  .aca-seal.is-parting .aca-seal-half.top { transform: translateY(-101%); }
  .aca-seal.is-parting .aca-seal-half.bottom { transform: translateY(101%); }
  .aca-seal-core { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; transition: opacity 340ms ease; }
  .aca-seal.is-parting .aca-seal-core { opacity: 0; }
  .aca-seal-draw { stroke-dasharray: var(--len); stroke-dashoffset: var(--len); animation: acaSealDraw 1050ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes acaSealDraw { to { stroke-dashoffset: 0; } }
  .aca-seal-tick { opacity: 0; animation: acaSealTick 260ms ease forwards; }
  @keyframes acaSealTick { to { opacity: 1; } }
  .aca-seal-word { font-family: "Cinzel", serif; font-weight: 500; font-size: 13px; letter-spacing: 0.5em; text-indent: 0.5em; color: #C6A467; opacity: 0; animation: acaSealTick 500ms ease 700ms forwards; }

  /* Dust */
  .aca-dust { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

  /* Plumb line */
  .aca-plumb { position: fixed; right: 26px; top: 50%; transform: translateY(-50%); z-index: 45; display: flex; flex-direction: column; align-items: center; gap: 20px; }
  .aca-plumb-rail { position: absolute; top: -34px; bottom: -34px; width: 1px; background: rgba(234,229,218,0.10); }
  .aca-plumb-fill { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(198,164,103,0.0), rgba(198,164,103,0.8)); transform-origin: top; transform: scaleY(0); }
  .aca-plumb-stop { position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 22px; background: none; border: 0; cursor: pointer; padding: 0; }
  .aca-plumb-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(234,229,218,0.28); transition: background 300ms ease, transform 300ms ease, box-shadow 300ms ease; }
  .aca-plumb-numeral { position: absolute; right: 26px; top: 50%; transform: translateY(-50%) translateX(6px); font-family: "Cinzel", serif; font-size: 10px; letter-spacing: 0.22em; color: #C6A467; opacity: 0; transition: opacity 260ms ease, transform 260ms ease; white-space: nowrap; pointer-events: none; }
  .aca-plumb-stop.is-active .aca-plumb-dot { background: #8AD8E2; transform: scale(1.5); box-shadow: 0 0 12px rgba(138,216,226,0.7); }
  .aca-plumb-stop:hover .aca-plumb-dot { background: rgba(232,207,150,0.9); }
  .aca-plumb-stop:hover .aca-plumb-numeral, .aca-plumb-stop:focus-visible .aca-plumb-numeral { opacity: 1; transform: translateY(-50%) translateX(0); }
  .aca-plumb-stop:focus-visible { outline: 2px solid #8AD8E2; outline-offset: 2px; border-radius: 2px; }
  @media (max-width: 1100px) { .aca-plumb { display: none; } }

  /* Gold seam */
  .aca-seam { position: relative; max-width: 1200px; margin: 0 auto; height: 48px; opacity: 0.9; }
  .aca-seam svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .aca-seam-path { fill: none; stroke-width: 1; stroke-dasharray: 1000; stroke-dashoffset: 1000; }
  .aca-seam.is-in .aca-seam-path { animation: acaSeam 2100ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .aca-seam-glow { stroke-width: 2.5; filter: blur(3px); opacity: 0.55; }
  @keyframes acaSeam { to { stroke-dashoffset: 0; } }

  @media (prefers-reduced-motion: reduce) {
    .aca-seal { display: none; }
    .aca-seam-path { stroke-dashoffset: 0; animation: none; }
    .aca-plumb-dot, .aca-plumb-numeral { transition: none; }
  }
`;
