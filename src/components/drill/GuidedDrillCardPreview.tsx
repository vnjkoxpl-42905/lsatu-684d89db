import { useMemo } from 'react';
import {
  findGuidedDrillHtmlByDrill,
  findGuidedDrillHtmlBySlug,
} from '@/data/guidedDrillHtmlManifest';
import { buildGuidedDrillLaunchHtml } from '@/lib/guidedDrillLaunch';
import type { GuidedDrill } from '@/lib/guidedDrills';
import { ScaledPreview } from './ScaledPreview';

/**
 * Non-interactive, always-open thumbnail of a guided drill's launch page.
 * Mirrors the resolution in GuidedDrillStart: a curated static HTML page when
 * one exists (iframe src), otherwise the identical premium launch page built
 * from the drill's instruction_card (iframe srcDoc), scaled to fit the card.
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
    <ScaledPreview className={className}>
      <iframe
        src={launchPage?.htmlPath}
        srcDoc={srcDoc}
        title={`${drill.title} preview`}
        loading="lazy"
        style={{ width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
      />
    </ScaledPreview>
  );
}

export default GuidedDrillCardPreview;
