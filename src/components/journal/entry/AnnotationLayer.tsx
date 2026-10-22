/**
 * AnnotationLayer — a dependency-free freehand pen overlay drawn over the
 * journal question. Strokes are stored in NORMALIZED coordinates (0..1 of the
 * container box) so they reload correctly at any size. When `active`, the layer
 * captures pointer events and draws; when inactive it's click-through and just
 * renders the saved strokes.
 *
 * Persistence is the parent's job: `onChange` fires (debounced upstream) with
 * the full stroke list whenever a stroke completes.
 *
 * Robustness notes:
 *  - The in-progress stroke lives in a ref (not state) so rapid pointermove
 *    events never read a stale closure and never drop points. A `tick` state
 *    forces the live-preview re-render.
 *  - Pointer capture is taken on the container element itself (stable across
 *    re-renders), not on the event target child, so the move/up stream can't be
 *    lost mid-stroke on real trackpad/mouse input.
 */
import * as React from 'react';
import { Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationStroke } from '@/lib/wajNotesService';

/** Palette of pen colors. First entry is the default. */
const PALETTE: { name: string; value: string }[] = [
  { name: 'Amber', value: '#fbbf24' },
  { name: 'Emerald', value: '#34d399' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Violet', value: '#a78bfa' },
];
const PEN_SIZE = 2.5;
/** Erase radius in normalized (0..1) units — a stroke with any point within this
 *  distance of the pointer is removed. */
const ERASE_RADIUS = 0.02;

function strokeToPath(points: number[], w: number, h: number): string {
  if (points.length < 4) {
    // a dot
    const x = (points[0] ?? 0) * w;
    const y = (points[1] ?? 0) * h;
    return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
  }
  let d = `M ${points[0] * w} ${points[1] * h}`;
  for (let i = 2; i < points.length - 2; i += 2) {
    const x0 = points[i] * w;
    const y0 = points[i + 1] * h;
    const x1 = points[i + 2] * w;
    const y1 = points[i + 3] * h;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    d += ` Q ${x0} ${y0} ${mx} ${my}`;
  }
  return d;
}

interface Props {
  active: boolean;
  strokes: AnnotationStroke[];
  onChange: (strokes: AnnotationStroke[]) => void;
}

export function AnnotationLayer({ active, strokes, onChange }: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ w: 1, h: 1 });
  const [color, setColor] = React.useState(PALETTE[0].value);
  const [tool, setTool] = React.useState<'pen' | 'eraser'>('pen');

  // In-progress stroke kept in a ref so pointermove never reads a stale value
  // and never drops points; `tick` only drives the live-preview re-render.
  const drawingRef = React.useRef<number[] | null>(null);
  const [, setTick] = React.useState(0);
  const renderTick = () => setTick((t) => t + 1);

  // Track container size so normalized points map to pixels.
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth || 1, h: el.clientHeight || 1 });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // If the layer goes inactive mid-stroke, abandon the in-progress stroke.
  React.useEffect(() => {
    if (!active && drawingRef.current) {
      drawingRef.current = null;
      renderTick();
    }
  }, [active]);

  const pointFromEvent = (e: React.PointerEvent): [number, number] => {
    const el = ref.current;
    if (!el) return [0, 0];
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / (rect.width || 1);
    const y = (e.clientY - rect.top) / (rect.height || 1);
    return [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))];
  };

  // Remove any stroke that passes within ERASE_RADIUS of (x, y). Returns true if
  // something was erased.
  const eraseAt = (x: number, y: number): boolean => {
    const next = strokes.filter((s) => {
      const pts = s.points;
      for (let i = 0; i < pts.length - 1; i += 2) {
        const dx = pts[i] - x;
        const dy = pts[i + 1] - y;
        if (dx * dx + dy * dy <= ERASE_RADIUS * ERASE_RADIUS) return false;
      }
      return true;
    });
    if (next.length !== strokes.length) {
      onChange(next);
      return true;
    }
    return false;
  };

  const handleDown = (e: React.PointerEvent) => {
    if (!active) return;
    e.preventDefault();
    // Capture on the stable container, not the (child) event target.
    ref.current?.setPointerCapture?.(e.pointerId);
    const [x, y] = pointFromEvent(e);
    if (tool === 'eraser') {
      drawingRef.current = [x, y]; // marks an active erase gesture
      eraseAt(x, y);
      return;
    }
    drawingRef.current = [x, y];
    renderTick();
  };

  const handleMove = (e: React.PointerEvent) => {
    if (!active || !drawingRef.current) return;
    const [x, y] = pointFromEvent(e);
    if (tool === 'eraser') {
      eraseAt(x, y);
      return;
    }
    drawingRef.current.push(x, y);
    renderTick();
  };

  const handleUp = () => {
    const drawing = drawingRef.current;
    if (!active || !drawing) return;
    drawingRef.current = null;
    if (tool === 'eraser') return;
    if (drawing.length >= 2) {
      onChange([...strokes, { points: drawing, color, size: PEN_SIZE }]);
    } else {
      renderTick();
    }
  };

  const drawing = drawingRef.current;

  return (
    <div
      ref={ref}
      className="absolute inset-0 z-20"
      style={{
        pointerEvents: active ? 'auto' : 'none',
        cursor: active ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
        touchAction: active ? 'none' : 'auto',
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {/* Color palette — only while annotating. Sits above the canvas and
          stops pointer events from starting a stroke when picking a color. */}
      {active && (
        <div
          className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background/95 px-2.5 py-1.5 shadow-lg backdrop-blur"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              aria-label={`Pen color ${c.name}`}
              aria-pressed={tool === 'pen' && color === c.value}
              onClick={() => {
                setColor(c.value);
                setTool('pen');
              }}
              className={cn(
                'h-5 w-5 rounded-full transition-transform hover:scale-110',
                tool === 'pen' && color === c.value
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                  : 'ring-1 ring-border',
              )}
              style={{ backgroundColor: c.value }}
            />
          ))}
          <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
          <button
            type="button"
            title="Eraser"
            aria-label="Eraser"
            aria-pressed={tool === 'eraser'}
            onClick={() => setTool('eraser')}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
              tool === 'eraser'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Eraser size={14} />
          </button>
        </div>
      )}

      <svg className="h-full w-full" width={size.w} height={size.h}>
        {strokes.map((s, i) => (
          <path
            key={i}
            d={strokeToPath(s.points, size.w, size.h)}
            fill="none"
            stroke={s.color ?? PALETTE[0].value}
            strokeWidth={s.size ?? PEN_SIZE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {drawing && tool === 'pen' && (
          <path
            d={strokeToPath(drawing, size.w, size.h)}
            fill="none"
            stroke={color}
            strokeWidth={PEN_SIZE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
