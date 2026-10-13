import React, { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Measures the container and returns scale = width / baseWidth so children fit exactly. */
export function useFitScale(baseWidth: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / baseWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth]);

  return { ref, scale };
}

/**
 * Renders children at a fixed logical viewport size scaled down to fit the
 * container width — a non-interactive "thumbnail of a page". Used for both the
 * guided-drill launch iframe and live bootcamp component mounts.
 */
export function ScaledPreview({
  baseWidth = 1200,
  baseHeight = 900,
  className,
  children,
}: {
  baseWidth?: number;
  baseHeight?: number;
  className?: string;
  children: ReactNode;
}) {
  const { ref, scale } = useFitScale(baseWidth);

  return (
    <div
      ref={ref}
      className={cn(
        'relative aspect-[4/3] w-full overflow-hidden rounded border border-black/10 bg-white',
        className,
      )}
    >
      {scale > 0 && (
        <div
          style={{
            width: baseWidth,
            height: baseHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          {children}
        </div>
      )}
      {/* Click shield: previews are never interactive. */}
      <div className="absolute inset-0" aria-hidden />
    </div>
  );
}

export default ScaledPreview;
