/**
 * journalService — data layer for the Notion-style Journal workspace.
 *
 * All journal_* tables are USER-scoped (RLS: auth.uid() = user_id). This is a
 * DIFFERENT id space from `wrong_answer_journal`, which is CLASS-scoped
 * (class_id). Never cross the streams: never pass a class_id to a journal_*
 * query, and never pass a user_id to a wrong_answer_journal query. The only
 * bridge is getWrongAnswerSmartRows(), which reads the class-scoped feed and
 * maps it into the read-only "smart" database surface.
 *
 * Errors are never swallowed: every call throws on failure so callers can
 * surface a toast. (See repo rule: no silent console.error.)
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { getWAJEntries, type WAJEntry } from '@/lib/wajService';
import { getNotesForClass, type WAJNote, type ReviewStatus } from '@/lib/wajNotesService';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JournalPageType = 'doc' | 'database';
export type JournalColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url';
export type JournalViewKind = 'table' | 'board' | 'gallery';

/** Minimal TipTap/ProseMirror document shape. Stored verbatim in journal_pages.body. */
export interface TiptapDoc {
  type: 'doc';
  content?: unknown[];
}

export const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [] };

export interface JournalPage {
  id: string;
  user_id: string;
  parent_page_id: string | null;
  title: string;
  icon: string | null;
  type: JournalPageType;
  body: TiptapDoc;
  /** Row values for database rows, keyed by column id. Empty for docs/databases. */
  properties: Record<string, unknown>;
  sort_order: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface JournalColumn {
  id: string;
  name: string;
  type: JournalColumnType;
  /** For select / multi_select. */
  options?: string[];
}

export interface JournalDatabase {
  page_id: string;
  user_id: string;
  columns: JournalColumn[];
  created_at: string;
  updated_at: string;
}

export interface JournalViewConfig {
  /** Column ids in display order; absent → all columns. */
  visibleColumns?: string[];
  /** Column id to group by (board view). */
  groupBy?: string;
  /** Column id used as the gallery/board card cover. */
  coverColumn?: string;
  sort?: { columnId: string; direction: 'asc' | 'desc' };
}

export interface JournalView {
  id: string;
  database_id: string;
  user_id: string;
  name: string;
  kind: JournalViewKind;
  config: JournalViewConfig;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mappers (DB row → typed domain object)
// ─────────────────────────────────────────────────────────────────────────────

function toPage(row: Record<string, unknown>): JournalPage {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    parent_page_id: (row.parent_page_id as string | null) ?? null,
    title: (row.title as string) ?? 'Untitled',
    icon: (row.icon as string | null) ?? null,
    type: (row.type as JournalPageType) ?? 'doc',
    body: (row.body as TiptapDoc) ?? EMPTY_DOC,
    properties: (row.properties as Record<string, unknown>) ?? {},
    sort_order: (row.sort_order as number) ?? 0,
    is_archived: !!row.is_archived,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toDatabase(row: Record<string, unknown>): JournalDatabase {
  return {
    page_id: row.page_id as string,
    user_id: row.user_id as string,
    columns: (row.columns as JournalColumn[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function toView(row: Record<string, unknown>): JournalView {
  return {
    id: row.id as string,
    database_id: row.database_id as string,
    user_id: row.user_id as string,
    name: (row.name as string) ?? 'Table',
    kind: (row.kind as JournalViewKind) ?? 'table',
    config: (row.config as JournalViewConfig) ?? {},
    sort_order: (row.sort_order as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Resolve the current authenticated user id, required for inserts (RLS). */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pages
// ─────────────────────────────────────────────────────────────────────────────

/** All non-archived pages for the current user (the full tree + all rows). */
export async function listPages(): Promise<JournalPage[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('journal_pages')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toPage);
}

export async function getPage(id: string): Promise<JournalPage | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('journal_pages')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? toPage(data) : null;
}

export async function createPage(input: {
  parent_page_id?: string | null;
  title?: string;
  icon?: string | null;
  type?: JournalPageType;
  body?: TiptapDoc;
  properties?: Record<string, unknown>;
  sort_order?: number;
}): Promise<JournalPage> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('journal_pages')
    .insert({
      user_id,
      parent_page_id: input.parent_page_id ?? null,
      title: input.title ?? 'Untitled',
      icon: input.icon ?? null,
      type: input.type ?? 'doc',
      body: (input.body ?? EMPTY_DOC) as unknown as Json,
      properties: (input.properties ?? {}) as unknown as Json,
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toPage(data);
}

export async function updatePageBody(id: string, body: TiptapDoc): Promise<void> {
  const { error } = await supabase
    .from('journal_pages')
    .update({ body: body as unknown as Json })
    .eq('id', id);
  if (error) throw error;
}

export async function updatePageMeta(
  id: string,
  meta: { title?: string; icon?: string | null },
): Promise<void> {
  const { error } = await supabase.from('journal_pages').update(meta).eq('id', id);
  if (error) throw error;
}

/** Save a student's plain-text note in one write, scoped to the signed-in owner. */
export async function updateMyNotePage(id: string, title: string, body: TiptapDoc, expectedUpdatedAt?: string): Promise<JournalPage> {
  const userId = await requireUserId();
  let request = supabase
    .from('journal_pages')
    .update({ title, body: body as unknown as Json })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('type', 'doc');
  if (expectedUpdatedAt) request = request.eq('updated_at', expectedUpdatedAt);
  const { data, error } = await request.select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(expectedUpdatedAt ? 'This note changed in your account. Save again to choose which version to keep.' : 'This note could not be saved to your account.');
  return toPage(data);
}

/** Move/reorder a page: set its parent and a fractional sort_order. */
export async function movePage(
  id: string,
  parent_page_id: string | null,
  sort_order: number,
): Promise<void> {
  const { error } = await supabase
    .from('journal_pages')
    .update({ parent_page_id, sort_order })
    .eq('id', id);
  if (error) throw error;
}

/** Update a database row's property values (merge by column id). */
export async function updateRowProperties(
  id: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('journal_pages')
    .update({ properties: properties as unknown as Json })
    .eq('id', id);
  if (error) throw error;
}

/** Soft-delete (archive). Children cascade visually via the is_archived filter. */
export async function archivePage(id: string): Promise<void> {
  const { error } = await supabase
    .from('journal_pages')
    .update({ is_archived: true })
    .eq('id', id);
  if (error) throw error;
}

/** Hard delete a page (DB cascade removes children, sidecar, views). */
export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase.from('journal_pages').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Databases (sidecar config for type='database' pages)
// ─────────────────────────────────────────────────────────────────────────────

export async function getDatabase(pageId: string): Promise<JournalDatabase | null> {
  const { data, error } = await supabase
    .from('journal_databases')
    .select('*')
    .eq('page_id', pageId)
    .maybeSingle();
  if (error) throw error;
  return data ? toDatabase(data) : null;
}

/**
 * Create a database page plus its sidecar config and a default table view, in
 * one logical operation. Returns the new database page.
 */
export async function createDatabase(input: {
  parent_page_id?: string | null;
  title?: string;
  icon?: string | null;
  columns: JournalColumn[];
  sort_order?: number;
}): Promise<JournalPage> {
  const user_id = await requireUserId();
  const page = await createPage({
    parent_page_id: input.parent_page_id ?? null,
    title: input.title ?? 'Untitled database',
    icon: input.icon ?? null,
    type: 'database',
    sort_order: input.sort_order,
  });

  const { error: dbErr } = await supabase.from('journal_databases').insert({
    page_id: page.id,
    user_id,
    columns: input.columns as unknown as Json,
  });
  if (dbErr) throw dbErr;

  await createView({ database_id: page.id, name: 'Table', kind: 'table', sort_order: 0 });
  return page;
}

export async function updateColumns(
  pageId: string,
  columns: JournalColumn[],
): Promise<void> {
  const { error } = await supabase
    .from('journal_databases')
    .update({ columns: columns as unknown as Json })
    .eq('page_id', pageId);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Views
// ─────────────────────────────────────────────────────────────────────────────

export async function listViews(databaseId: string): Promise<JournalView[]> {
  const { data, error } = await supabase
    .from('journal_views')
    .select('*')
    .eq('database_id', databaseId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toView);
}

export async function createView(input: {
  database_id: string;
  name?: string;
  kind?: JournalViewKind;
  config?: JournalViewConfig;
  sort_order?: number;
}): Promise<JournalView> {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from('journal_views')
    .insert({
      database_id: input.database_id,
      user_id,
      name: input.name ?? 'Table',
      kind: input.kind ?? 'table',
      config: (input.config ?? {}) as unknown as Json,
      sort_order: input.sort_order ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toView(data);
}

export async function updateView(
  id: string,
  patch: { name?: string; kind?: JournalViewKind; config?: JournalViewConfig },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.kind !== undefined) payload.kind = patch.kind;
  if (patch.config !== undefined) payload.config = patch.config as unknown as Json;
  const { error } = await supabase.from('journal_views').update(payload as any).eq('id', id);
  if (error) throw error;
}

export async function deleteView(id: string): Promise<void> {
  const { error } = await supabase.from('journal_views').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrong-answers "smart" database (read-only bridge into the class-scoped feed)
// ─────────────────────────────────────────────────────────────────────────────

/** A synthetic, read-only row for the Wrong Answers smart database view. */
export interface WrongAnswerSmartRow {
  /** Source WAJ entry id. */
  id: string;
  qid: string;
  label: string; // "PT80–S2–Q14"
  qtype: string;
  level: number;
  status: 'wrong' | 'right';
  attempts: number;
  first_missed: string; // ISO
  last_attempted: string | null; // ISO — most recent history item
  last_chosen: string | null;
  last_correct: string | null;
  /** User-scoped reflection note, if any. */
  note: WAJNote | null;
  /** The original entry, for the detail sheet + reattempt. */
  entry: WAJEntry;
}

export type { WAJNote, ReviewStatus };

/**
 * Reads the class-scoped wrong_answer_journal via wajService and maps entries
 * into smart-database rows, merging in user-scoped reflection notes.
 * classId is resolved by the caller via the useClassId() hook.
 */
export async function getWrongAnswerSmartRows(
  classId: string,
  filters?: { qtype?: string; level?: number; pt?: number; last_status?: 'wrong' | 'right' },
): Promise<WrongAnswerSmartRow[]> {
  const [entries, notesMap] = await Promise.all([
    getWAJEntries(classId, filters),
    getNotesForClass(classId),
  ]);

  return (entries ?? []).map((e) => {
    const history = Array.isArray(e.history_json) ? e.history_json : [];
    const last = history.length > 0 ? history[history.length - 1] : null;
    return {
      id: e.id,
      qid: e.qid,
      label: `PT${e.pt}–S${e.section}–Q${e.qnum}`,
      qtype: e.qtype,
      level: e.level,
      status: e.last_status === 'right' ? 'right' : 'wrong',
      attempts: e.revisit_count + 1,
      first_missed: e.first_wrong_at_iso,
      last_attempted: last?.attempt_at_iso ?? null,
      last_chosen: last?.chosen_answer ?? null,
      last_correct: last?.correct_answer ?? null,
      note: notesMap.get(e.qid) ?? null,
      entry: e,
    };
  });
}
