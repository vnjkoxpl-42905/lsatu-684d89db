export interface VideoAsset {
  id: string;
  url: string;
  title: string;
  description: string;
  type: 'global' | 'flaw-specific' | 'comparison';
  flawId?: string;
  relatedFlawIds?: string[];
  duration?: string;
  poster?: string;
}

// Launch policy: only videos with a real backing file under /public ship here.
// Cards without an asset are omitted entirely so VideoCard never renders its
// "Video unavailable" state. The only produced asset to date is the bootcamp
// overview video at public/fallacy-flaw/bootcamp-video.mp4. Re-add flaw-specific
// or comparison entries here as their files land in public/fallacy-flaw/.
export const VIDEO_ASSETS: VideoAsset[] = [
  {
    id: 'bootcamp-overview',
    url: '/fallacy-flaw/bootcamp-video.mp4',
    title: 'LSAT Flaws Bootcamp Overview',
    description: 'An optional deep dive into the philosophy of the bootcamp and what to expect.',
    type: 'global'
  }
];
