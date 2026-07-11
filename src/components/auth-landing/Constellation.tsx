import * as React from 'react';

/**
 * Constellation — the twelve LR question types as a living 3D orbital system.
 *
 * Canvas 2D with true 3D math: three tilted elliptical rings rotate at
 * different speeds around a radiant core; the whole system eases toward the
 * cursor (camera tilt). Node labels are set in the page's mono, brightness
 * and scale keyed to depth. This is the product's orbital identity (Mainhub)
 * translated into deep space.
 *
 * - prefers-reduced-motion: draws one static frame; no rAF, no tilt.
 * - aria-hidden; the visible list of types for AT lives in the section copy.
 */

const TYPES = [
  'Necessary Assumption',
  'Strengthen',
  'Weaken',
  'Main Conclusion',
  'Flaw in the Reasoning',
  'Principle',
  'Parallel Reasoning',
  'Resolve the Paradox',
  'Inference',
  'Method of Reasoning',
  'Sufficient Assumption',
  'Role in Argument',
];

type Node = { label: string; ring: number; phase: number };

const RINGS = [
  { r: 1.0, tiltX: 1.12, tiltZ: 0.10, speed: 0.05 },
  { r: 1.45, tiltX: 1.22, tiltZ: -0.16, speed: -0.034 },
  { r: 1.9, tiltX: 1.05, tiltZ: 0.26, speed: 0.022 },
];

const NODES: Node[] = TYPES.map((label, i) => ({
  label,
  ring: i % 3,
  phase: (Math.floor(i / 3) / 4) * Math.PI * 2 + (i % 3) * 0.55,
}));

export default function Constellation({ height = 560 }: { height?: number }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let raf = 0;
    let running = true;
    let inView = true;
    let rotX = 0.0, rotY = 0.0, tRotX = 0.0, tRotY = 0.0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      W = Math.max(1, Math.floor(rect.width));
      H = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const project = (x: number, y: number, z: number, scale: number) => {
      // camera tilt
      const yy = y * Math.cos(rotX) - z * Math.sin(rotX);
      let zz = y * Math.sin(rotX) + z * Math.cos(rotX);
      const xx = x * Math.cos(rotY) + zz * Math.sin(rotY);
      zz = -x * Math.sin(rotY) + zz * Math.cos(rotY);
      const fov = 3.4;
      const s = fov / (fov + zz);
      return { sx: W / 2 + xx * scale * s, sy: H / 2 + yy * scale * s, s, z: zz };
    };

    const draw = (tms: number) => {
      const t = tms / 1000;
      rotX += (tRotX - rotX) * 0.04;
      rotY += (tRotY - rotY) * 0.04;
      ctx.clearRect(0, 0, W, H);
      const scale = Math.min(W, H) * 0.285;

      // Core — radiant heart.
      const pulse = reduced ? 1 : 0.92 + 0.08 * Math.sin(t * 1.1);
      const core = project(0, 0, 0, scale);
      const cr = 26 * pulse * core.s;
      let grad = ctx.createRadialGradient(core.sx, core.sy, 0, core.sx, core.sy, cr * 4.4);
      grad.addColorStop(0, 'rgba(255, 214, 150, 0.85)');
      grad.addColorStop(0.14, 'rgba(238, 170, 84, 0.42)');
      grad.addColorStop(0.5, 'rgba(160, 100, 40, 0.10)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(core.sx, core.sy, cr * 4.4, 0, Math.PI * 2);
      ctx.fill();
      grad = ctx.createRadialGradient(core.sx, core.sy, 0, core.sx, core.sy, cr);
      grad.addColorStop(0, 'rgba(255,244,224,1)');
      grad.addColorStop(0.55, 'rgba(255,203,124,0.95)');
      grad.addColorStop(1, 'rgba(210,140,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(core.sx, core.sy, cr, 0, Math.PI * 2);
      ctx.fill();

      // Rings — sampled ellipse paths, depth-faded.
      RINGS.forEach((ring) => {
        const a = reduced ? 0.6 : t * ring.speed;
        ctx.beginPath();
        const STEPS = 110;
        for (let i = 0; i <= STEPS; i++) {
          const th = (i / STEPS) * Math.PI * 2;
          const x = Math.cos(th + a) * ring.r;
          const z = Math.sin(th + a) * ring.r;
          const y = 0;
          // ring tilt
          const y1 = y * Math.cos(ring.tiltX) - z * Math.sin(ring.tiltX);
          const z1 = y * Math.sin(ring.tiltX) + z * Math.cos(ring.tiltX);
          const x2 = x * Math.cos(ring.tiltZ) - y1 * Math.sin(ring.tiltZ);
          const y2 = x * Math.sin(ring.tiltZ) + y1 * Math.cos(ring.tiltZ);
          const p = project(x2, y2, z1, scale);
          if (i === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = 'rgba(232, 190, 130, 0.13)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Nodes — depth-sorted so front labels paint over back ones.
      const drawn = NODES.map((node) => {
        const ring = RINGS[node.ring];
        const a = (reduced ? 0.6 : t * ring.speed) + node.phase;
        const x = Math.cos(a) * ring.r;
        const z = Math.sin(a) * ring.r;
        const y = 0;
        const y1 = y * Math.cos(ring.tiltX) - z * Math.sin(ring.tiltX);
        const z1 = y * Math.sin(ring.tiltX) + z * Math.cos(ring.tiltX);
        const x2 = x * Math.cos(ring.tiltZ) - y1 * Math.sin(ring.tiltZ);
        const y2 = x * Math.sin(ring.tiltZ) + y1 * Math.cos(ring.tiltZ);
        return { node, p: project(x2, y2, z1, scale) };
      }).sort((m, n) => n.p.z - m.p.z);

      // Narrow canvases can't fit twelve long labels: only the front-most
      // nodes keep their captions (the rest stay as anonymous points until
      // the rotation brings them forward).
      const labelBudget = W < 560 ? 5 : NODES.length;
      const labelled = new Set(drawn.slice(-labelBudget).map((d) => d.node));

      drawn.forEach(({ node, p }) => {
        // depth factor: z ranges roughly [-1.9, 1.9]; front = negative z
        const depth = Math.max(0, Math.min(1, (1.9 - p.z) / 3.8));
        const alpha = 0.22 + depth * 0.78;
        const r = (1.6 + depth * 1.9) * p.s;

        const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 3.4);
        g.addColorStop(0, `rgba(255, 210, 140, ${0.5 * alpha})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r * 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 226, 178, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();

        if (!labelled.has(node)) return;
        const fs = Math.round(9 + depth * 2.5);
        ctx.font = `500 ${fs}px "IBM Plex Mono", ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = node.label.toUpperCase();
        // Keep the caption inside the canvas on narrow screens.
        const half = ctx.measureText(label).width / 2;
        const lx = Math.max(half + 4, Math.min(W - half - 4, p.sx));
        ctx.fillStyle = `rgba(20, 16, 12, ${0.55 * alpha})`;
        ctx.fillText(label, lx + 1, p.sy + r + 7);
        ctx.fillStyle = `rgba(234, 227, 212, ${(0.28 + depth * 0.62)})`;
        ctx.fillText(label, lx, p.sy + r + 6);
      });
    };

    const loop = (tms: number) => {
      if (!running) return;
      if (inView) draw(tms);
      raf = requestAnimationFrame(loop);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      tRotY = nx * 0.5;
      tRotX = ny * -0.4;
    };
    const onLeave = () => { tRotX = 0; tRotY = 0; };

    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(9000); });
    ro.observe(wrap);

    const io = new IntersectionObserver((entries) => {
      inView = entries[0]?.isIntersecting ?? true;
    }, { rootMargin: '80px' });
    io.observe(wrap);

    if (reduced) {
      draw(9000);
    } else {
      wrap.addEventListener('pointermove', onPointer, { passive: true });
      wrap.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(loop);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      wrap.removeEventListener('pointermove', onPointer);
      wrap.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden="true" style={{ position: 'relative', width: '100%', height }}>
      <canvas ref={ref} style={{ position: 'absolute', inset: 0, display: 'block' }} />
    </div>
  );
}
