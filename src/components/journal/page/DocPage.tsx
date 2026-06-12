/**
 * DocPage — a single free-form document: emoji picker + title + block editor.
 * Autosaves the body on a debounce; the title saves on blur (optimistic).
 */
import * as React from 'react';
import { JournalEditor } from '../editor/JournalEditor';
import { EmojiPicker } from '../EmojiPicker';
import { SaveStatus, type SaveState } from '../SaveStatus';
import { useUpdatePageBody, useUpdatePageMeta } from '@/hooks/useJournal';
import type { JournalPage, TiptapDoc } from '@/lib/journalService';

export function DocPage({ page }: { page: JournalPage }) {
  const [title, setTitle] = React.useState(page.title);
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const updateBody = useUpdatePageBody();
  const updateMeta = useUpdatePageMeta();

  // Keep local title in sync when switching pages.
  React.useEffect(() => setTitle(page.title), [page.id, page.title]);

  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const handleBody = React.useCallback(
    (doc: TiptapDoc) => {
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        updateBody.mutate(
          { id: page.id, body: doc },
          {
            onSuccess: () => setSaveState('saved'),
            onError: () => setSaveState('error'),
          },
        );
      }, 700);
    },
    [page.id, updateBody],
  );

  const commitTitle = () => {
    const next = title.trim() || 'Untitled';
    if (next !== page.title) updateMeta.mutate({ id: page.id, title: next });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <div className="mb-2 flex items-center justify-end">
        <SaveStatus state={saveState} />
      </div>

      <div className="mb-3 flex items-center gap-3">
        <EmojiPicker
          value={page.icon}
          onChange={(icon) => updateMeta.mutate({ id: page.id, icon })}
        />
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Untitled"
        className="mb-2 w-full bg-transparent text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
      />

      <JournalEditor
        key={page.id}
        docKey={page.id}
        value={page.body}
        onChange={handleBody}
      />
    </div>
  );
}
