/**
 * Journal — the Wrong Answer Journal: a focused, LSAT-Journal-style 3-pane
 * deep-review surface (entries / full question / autosaving review form).
 * Replaces the prior Notion-style workspace.
 */
import { JournalEntrySurface } from '@/components/journal/entry/JournalEntrySurface';

export default function Journal() {
  return <JournalEntrySurface embedded />;
}
