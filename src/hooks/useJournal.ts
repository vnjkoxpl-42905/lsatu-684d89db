/**
 * useJournal — TanStack Query hooks for the Journal workspace.
 *
 * All journal_* data is user-scoped (see journalService header). Mutations
 * surface a toast on error (never swallow) and invalidate the relevant queries.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as journal from '@/lib/journalService';
import type {
  JournalColumn,
  JournalPage,
  JournalPageType,
  JournalViewConfig,
  JournalViewKind,
  TiptapDoc,
} from '@/lib/journalService';

const KEYS = {
  pages: ['journal', 'pages'] as const,
  page: (id: string) => ['journal', 'page', id] as const,
  database: (pageId: string) => ['journal', 'database', pageId] as const,
  views: (databaseId: string) => ['journal', 'views', databaseId] as const,
};

export function useJournalPages() {
  return useQuery({
    queryKey: KEYS.pages,
    queryFn: journal.listPages,
    staleTime: 30_000,
  });
}

export function usePage(id: string | null) {
  return useQuery({
    queryKey: id ? KEYS.page(id) : ['journal', 'page', 'none'],
    queryFn: () => (id ? journal.getPage(id) : Promise.resolve(null)),
    enabled: !!id,
  });
}

export function useDatabase(pageId: string | null) {
  return useQuery({
    queryKey: pageId ? KEYS.database(pageId) : ['journal', 'database', 'none'],
    queryFn: () => (pageId ? journal.getDatabase(pageId) : Promise.resolve(null)),
    enabled: !!pageId,
  });
}

export function useViews(databaseId: string | null) {
  return useQuery({
    queryKey: databaseId ? KEYS.views(databaseId) : ['journal', 'views', 'none'],
    queryFn: () => (databaseId ? journal.listViews(databaseId) : Promise.resolve([])),
    enabled: !!databaseId,
  });
}

export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof journal.createPage>[0]) => journal.createPage(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.pages }),
    onError: (e) => toast.error('Could not create page', { description: msg(e) }),
  });
}

export function useCreateDatabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof journal.createDatabase>[0]) =>
      journal.createDatabase(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.pages }),
    onError: (e) => toast.error('Could not create database', { description: msg(e) }),
  });
}

export function useUpdatePageMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...meta }: { id: string; title?: string; icon?: string | null }) =>
      journal.updatePageMeta(id, meta),
    onMutate: async ({ id, title, icon }) => {
      await qc.cancelQueries({ queryKey: KEYS.pages });
      const prev = qc.getQueryData<JournalPage[]>(KEYS.pages);
      qc.setQueryData<JournalPage[]>(KEYS.pages, (old) =>
        (old ?? []).map((p) =>
          p.id === id
            ? { ...p, title: title ?? p.title, icon: icon !== undefined ? icon : p.icon }
            : p,
        ),
      );
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.pages, ctx.prev);
      toast.error('Could not rename page', { description: msg(e) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.pages }),
  });
}

export function useUpdatePageBody() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TiptapDoc }) =>
      journal.updatePageBody(id, body),
    // Body autosaves silently; only surface failures.
    onError: (e) => toast.error('Changes did not save', { description: msg(e) }),
  });
}

export function useMovePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      parentId,
      sortOrder,
    }: {
      id: string;
      parentId: string | null;
      sortOrder: number;
    }) => journal.movePage(id, parentId, sortOrder),
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.pages }),
    onError: (e) => toast.error('Could not move page', { description: msg(e) }),
  });
}

export function useArchivePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journal.archivePage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.pages }),
    onError: (e) => toast.error('Could not delete page', { description: msg(e) }),
  });
}

export function useUpdateRowProperties() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, properties }: { id: string; properties: Record<string, unknown> }) =>
      journal.updateRowProperties(id, properties),
    onMutate: async ({ id, properties }) => {
      await qc.cancelQueries({ queryKey: KEYS.pages });
      const prev = qc.getQueryData<JournalPage[]>(KEYS.pages);
      qc.setQueryData<JournalPage[]>(KEYS.pages, (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, properties } : p)),
      );
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(KEYS.pages, ctx.prev);
      toast.error('Could not update cell', { description: msg(e) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.pages }),
  });
}

export function useUpdateColumns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pageId, columns }: { pageId: string; columns: JournalColumn[] }) =>
      journal.updateColumns(pageId, columns),
    onSuccess: (_d, { pageId }) =>
      qc.invalidateQueries({ queryKey: KEYS.database(pageId) }),
    onError: (e) => toast.error('Could not update columns', { description: msg(e) }),
  });
}

export function useCreateView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof journal.createView>[0]) => journal.createView(input),
    onSuccess: (_d, { database_id }) =>
      qc.invalidateQueries({ queryKey: KEYS.views(database_id) }),
    onError: (e) => toast.error('Could not add view', { description: msg(e) }),
  });
}

export function useUpdateView(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: {
      id: string;
      name?: string;
      kind?: JournalViewKind;
      config?: JournalViewConfig;
    }) => journal.updateView(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.views(databaseId) }),
    onError: (e) => toast.error('Could not update view', { description: msg(e) }),
  });
}

export function useDeleteView(databaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journal.deleteView(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.views(databaseId) }),
    onError: (e) => toast.error('Could not delete view', { description: msg(e) }),
  });
}

/** Type helper: page type literal re-export for callers building create inputs. */
export type { JournalPageType };

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Please try again.';
}
