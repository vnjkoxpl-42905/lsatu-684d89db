import { ExternalLink } from 'lucide-react';
import { type WorkspaceKey } from './deskTasks';

const PLACEHOLDER_COPY: Record<'inbox' | 'library', { title: string; body: string; href: string }> = {
  inbox: {
    title: 'Inbox',
    body: 'Inbox is coming into the desk. Use the full message workspace for now.',
    href: '/teacher/conversations',
  },
  library: {
    title: 'Library',
    body: 'Library is coming into the desk. Use the full library workspace for now.',
    href: '/teacher/library',
  },
};

export function DeskWorkspacePlaceholder({ workspace }: { workspace: Extract<WorkspaceKey, 'inbox' | 'library'> }) {
  const copy = PLACEHOLDER_COPY[workspace];

  return (
    <section className="flex h-full w-full max-w-3xl items-center justify-center">
      <div className="w-full border border-black/12 bg-white/25 px-8 py-10 text-center shadow-[0_20px_80px_rgba(17,24,28,0.10)] backdrop-blur">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-black/40">Workspace</div>
        <h2 className="mt-3 text-2xl font-semibold text-black">{copy.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">{copy.body}</p>
        <a
          href={copy.href}
          className="mt-6 inline-flex items-center gap-2 border border-black/15 px-3 py-2 text-xs font-semibold text-black/60 transition hover:border-black/40 hover:text-black"
        >
          Open full page
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
        </a>
      </div>
    </section>
  );
}
