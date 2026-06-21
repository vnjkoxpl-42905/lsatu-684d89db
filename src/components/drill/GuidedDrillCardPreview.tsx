import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  findGuidedDrillHtmlByDrill,
  findGuidedDrillHtmlBySlug,
} from '@/data/guidedDrillHtmlManifest';
import { buildGuidedDrillLaunchHtml } from '@/lib/guidedDrillLaunch';
import type { GuidedDrill } from '@/lib/guidedDrills';
import { cn } from '@/lib/utils';

/** Logical desktop viewport the launch page is rendered at, then scaled down to fit the card. */
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 900;

/** Measures the container and returns scale = width / BASE_WIDTH so the iframe fits exactly. */
function useFitScale(baseWidth: number) {
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
 * Non-interactive, always-open thumbnail of a guided drill's launch page.
 * Mirrors the resolution in GuidedDrillStart: a curated static HTML page when one
 * exists (iframe src), otherwise the identical premium launch page built from the
 * drill's instruction_card (iframe srcDoc). The desktop layout is rendered at a
 * fixed logical size and scaled to fit the card.
 */
export function GuidedDrillCardPreview({
  drill,
  questionCount,
  className,
}: {
  drill: GuidedDrill;
  questionCount: number;
  className?: string;
}) {
  const { ref, scale } = useFitScale(BASE_WIDTH);

  const launchPage = useMemo(
    () => findGuidedDrillHtmlByDrill(drill) ?? findGuidedDrillHtmlBySlug(drill.slug),
    [drill],
  );

  const srcDoc = useMemo(() => {
    if (launchPage) return undefined;
    return buildGuidedDrillLaunchHtml({
      title: drill.title,
      estimatedMinutes: drill.estimated_minutes,
      questionCount,
      leftMd: drill.instruction_card?.left_md ?? null,
      rightMd: drill.instruction_card?.right_md ?? null,
    });
  }, [launchPage, drill, questionCount]);

  return (
    <div
      ref={ref}
      className={cn(
        'relative aspect-[4/3] w-full overflow-hidden rounded border border-black/10 bg-white',
        className,
      )}
    >
      {scale > 0 && (
        <iframe
          src={launchPage?.htmlPath}
          srcDoc={srcDoc}
          title={`${drill.title} preview`}
          aria-hidden
          tabIndex={-1}
          loading="lazy"
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 0,
            pointerEvents: 'none',
          }}
        />
      )}
      {/* Click shield: the preview is never interactive. */}
      <div className="absolute inset-0" aria-hidden />
    </div>
  );
}

export default GuidedDrillCardPreview;
