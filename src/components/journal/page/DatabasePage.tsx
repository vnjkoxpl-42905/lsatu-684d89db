/**
 * DatabasePage — a database page: title/icon header + DatabaseView wired to the
 * journal hooks. Rows are child pages (parent_page_id = this page).
 */
import * as React from 'react';
import { EmojiPicker } from '../EmojiPicker';
import { DatabaseView } from '../database/DatabaseView';
import { rowsOf } from '../tree';
import {
  useDatabase,
  useViews,
  useUpdatePageMeta,
  useUpdateRowProperties,
  useUpdateColumns,
  useCreatePage,
  useCreateView,
  useUpdateView,
} from '@/hooks/useJournal';
import type { JournalPage, JournalViewKind } from '@/lib/journalService';

export function DatabasePage({
  page,
  allPages,
  onOpenRow,
}: {
  page: JournalPage;
  allPages: JournalPage[];
  onOpenRow: (id: string) => void;
}) {
  const [title, setTitle] = React.useState(page.title);
  const [activeViewId, setActiveViewId] = React.useState<string | null>(null);

  const { data: database } = useDatabase(page.id);
  const { data: views = [] } = useViews(page.id);

  const updateMeta = useUpdatePageMeta();
  const updateRow = useUpdateRowProperties();
  const updateColumns = useUpdateColumns();
  const createPage = useCreatePage();
  const createView = useCreateView();
  const updateView = useUpdateView(page.id);

  React.useEffect(() => setTitle(page.title), [page.id, page.title]);
  React.useEffect(() => {
    if (!activeViewId && views.length) setActiveViewId(views[0].id);
  }, [views, activeViewId]);

  const rows = React.useMemo(() => rowsOf(page.id, allPages), [page.id, allPages]);
  const columns = database?.columns ?? [];

  const commitTitle = () => {
    const next = title.trim() || 'Untitled';
    if (next !== page.title) updateMeta.mutate({ id: page.id, title: next });
  };

  const handleCell = (rowId: string, columnId: string, value: unknown) => {
    const row = rows.find((r) => r.id === rowId);
    const properties = { ...(row?.properties ?? {}), [columnId]: value };
    updateRow.mutate({ id: rowId, properties });
  };

  const handleAddRow = () => {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    createPage.mutate({
      parent_page_id: page.id,
      type: 'doc',
      title: 'Untitled',
      sort_order: maxOrder + 1,
    });
  };

  const handleAddView = (kind: JournalViewKind) =>
    createView.mutate(
      {
        database_id: page.id,
        kind,
        name: kind === 'board' ? 'Board' : kind === 'gallery' ? 'Gallery' : 'Table',
        sort_order: views.length,
      },
      { onSuccess: (v) => setActiveViewId(v.id) },
    );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
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
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder="Untitled database"
        className="mb-5 w-full bg-transparent text-3xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
      />

      <DatabaseView
        columns={columns}
        rows={rows}
        views={views}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onAddView={handleAddView}
        onUpdateView={(id, patch) => updateView.mutate({ id, ...patch })}
        onUpdateColumns={(cols) => updateColumns.mutate({ pageId: page.id, columns: cols })}
        onCellChange={handleCell}
        onOpenRow={onOpenRow}
        onAddRow={handleAddRow}
      />
    </div>
  );
}
