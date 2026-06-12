/**
 * Journal — the student's notes + databases workspace (Notion-style).
 * The Wrong Answers feed lives inside as a pinned read-only smart database.
 * Lazy-loaded so the heavy TipTap editor stays out of the main bundle.
 */
import { JournalWorkspace } from '@/components/journal/JournalWorkspace';

export default function Journal() {
  return <JournalWorkspace />;
}
