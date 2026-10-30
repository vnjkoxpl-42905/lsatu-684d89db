/**
 * Modal wrapper around <GuidedDrillIntroCard> for the in-drill Info button.
 * Renders the same instruction content the student saw before starting,
 * read-only (no Start CTA).
 */

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { GuidedDrillIntroCard } from './GuidedDrillIntroCard';
import type { HomeworkSet } from '@/hooks/useHomeworkSets';

interface Props {
  set: Parameters<typeof GuidedDrillIntroCard>[0]['set'] | (HomeworkSet | null);
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GuidedDrillIntroModal({ set, open, onOpenChange }: Props) {
  if (!set) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <VisuallyHidden>
          <DialogTitle>{(set as { title?: string }).title || 'Drill instructions'}</DialogTitle>
        </VisuallyHidden>
        <GuidedDrillIntroCard
          set={set as Parameters<typeof GuidedDrillIntroCard>[0]['set']}
          onStart={() => onOpenChange(false)}
          readOnly
        />
      </DialogContent>
    </Dialog>
  );
}
