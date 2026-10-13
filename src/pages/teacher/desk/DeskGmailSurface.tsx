import { GmailPane } from '@/features/admin-inbox/gmail/components/GmailPane';

/**
 * Gmail inside the Teacher Desk. A thin full-height container around the shared
 * GmailPane, which reads its own state (folder, thread, label, category, query)
 * straight from the URL search params. Deep-link params like `t` are preserved
 * by the desk routing, so the pane needs no props.
 */
export function DeskGmailSurface() {
  return (
    <section aria-label="Gmail" className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-white text-foreground">
      <GmailPane />
    </section>
  );
}

export default DeskGmailSurface;
