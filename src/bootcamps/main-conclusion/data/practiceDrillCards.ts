import {
  MessageSquareWarning,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

import {
  MAIN_CONCLUSION_PRACTICE_POOLS,
  type PracticePool,
} from '@/bootcamps/main-conclusion/data/practiceDrillPools';

export interface PracticeDrillCardDefinition {
  pool: PracticePool;
  description: string;
  constraint: string;
  badge: string;
  featureLabel: string;
  questionTypeLabel: string;
  Icon: LucideIcon;
}

export const MAIN_CONCLUSION_PRACTICE_CARDS: readonly PracticeDrillCardDefinition[] = [
  {
    pool: MAIN_CONCLUSION_PRACTICE_POOLS['first-sentence-conclusions'],
    description:
      'Practice Main Conclusion questions where the author’s conclusion appears in the first sentence.',
    constraint:
      'The conclusion appears in the first sentence, but you still must confirm it with support.',
    badge: 'Main Conclusion',
    featureLabel: 'First Sentence',
    questionTypeLabel: 'Main Conclusion',
    Icon: Sparkles,
  },
  {
    pool: MAIN_CONCLUSION_PRACTICE_POOLS['rebuttal-conclusions'],
    description:
      'Practice Main Conclusion questions where the author responds to or rejects another view.',
    constraint:
      'Find the author’s own conclusion, not the view the author is rejecting.',
    badge: 'Main Conclusion',
    featureLabel: 'Rebuttal',
    questionTypeLabel: 'Main Conclusion',
    Icon: MessageSquareWarning,
  },
] as const;

export function buildPracticeDrillHref(pool: PracticePool): string {
  return `/guided-drills/${pool.slug}?returnTo=${encodeURIComponent(pool.returnTo)}`;
}

export function buildPracticeDrillLinkState(pool: PracticePool) {
  return { bootcampOverride: pool };
}
