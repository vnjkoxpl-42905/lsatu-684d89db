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

export const VIDEO_ASSETS: VideoAsset[] = [
  {
    id: 'argument-playbook',
    url: '/videos/The_Argument_Playbook__LSAT_Fallacies_Revealed.mp4',
    poster: '/videos/argument-playbook-poster.png',
    title: 'The Argument Playbook',
    description: 'A foundational look at how the LSAT tests logic and why most students get trapped.',
    type: 'global'
  },
  {
    id: 'bootcamp-overview',
    url: '/videos/LSAT_Flaws_Bootcamp.mp4',
    poster: '/videos/bootcamp-overview-poster.png',
    title: 'LSAT Flaws Bootcamp Overview',
    description: 'An optional deep dive into the philosophy of the bootcamp and what to expect.',
    type: 'global'
  },
  {
    id: 'necessary-vs-sufficient-video',
    url: '/videos/Necessary_vs.mp4',
    poster: '/videos/necessary-vs-sufficient-poster.png',
    title: 'Necessary vs. Sufficient',
    description: 'Learn the most common flaw on the LSAT: confusing a requirement with a guarantee.',
    type: 'flaw-specific',
    flawId: 'necessary-vs-sufficient'
  },
  {
    id: 'unproven-vs-proven-false-video',
    url: '/videos/Unproven_vs.mp4',
    poster: '/videos/unproven-vs-proven-false-poster.png',
    title: 'Unproven vs. Proven False',
    description: 'Understand why "not proven" does not mean "proven wrong" on the LSAT.',
    type: 'flaw-specific',
    flawId: 'unproven-vs-proven-false'
  },
  {
    id: 'sampling-vs-part-whole-video',
    url: '/videos/Sampling_vs.mp4',
    poster: '/videos/sampling-vs-part-whole-poster.png',
    title: 'Sampling vs. Part vs. Whole',
    description: 'A critical comparison of two major flaw types that students often mix up.',
    type: 'comparison',
    relatedFlawIds: ['sampling-fallacy', 'part-vs-whole']
  },
  {
    id: 'rarely-correct-video',
    url: '/videos/Rarely_Correct_Gallery.mp4',
    poster: '/videos/rarely-correct-poster.png',
    title: 'The "Rarely Correct" Gallery',
    description: 'A visual guide to the most common decoy answer choices on the LSAT.',
    type: 'comparison',
    relatedFlawIds: ['circular-reasoning', 'internal-contradiction', 'equivocation', 'inappropriate-appeal']
  }
];
