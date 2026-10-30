/**
 * Shared wiring for Hard Sentences section pages: prev/next nav targets from
 * the module manifest plus mark-complete-on-continue.
 */

import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { prevOf, nextOf, type HardEntry } from '@/bootcamps/main-conclusion/modules/hard-sentences/hardSentencesNav';
import type { ShellNavTarget } from '@/bootcamps/main-conclusion/modules/hard-sentences/HardSentencesShell';

const KIND_NAV_LABEL: Record<HardEntry['kind'], string> = {
  note: 'Notes',
  lab: 'Guided lab',
  drill: 'Graded drill',
  capstone: 'Capstone',
};

function toTarget(entry: HardEntry | null, direction: 'prev' | 'next'): ShellNavTarget | null {
  if (!entry) return null;
  return {
    route: entry.route,
    title: entry.title,
    description: entry.description,
    label: direction === 'prev' ? `Previous: ${KIND_NAV_LABEL[entry.kind]}` : `Next: ${KIND_NAV_LABEL[entry.kind]}`,
  };
}

export function useHardSectionPage(sectionId: string): {
  prev: ShellNavTarget | null;
  next: ShellNavTarget | null;
  markComplete: () => void;
} {
  const user = useUser();
  const { markHardSectionComplete } = useModuleProgress(user?.id);
  return {
    prev: toTarget(prevOf(sectionId), 'prev'),
    next: toTarget(nextOf(sectionId), 'next'),
    markComplete: () => {
      // Fire and forget on navigation; the hook logs and rethrows on failure.
      void markHardSectionComplete(sectionId);
    },
  };
}
