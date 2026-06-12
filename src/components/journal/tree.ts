/**
 * tree — helpers to derive the sidebar nav tree from the flat page list.
 *
 * The flat list contains docs, databases, AND database rows. Rows (pages whose
 * parent is a database) are NOT nav nodes — they live inside the database view.
 * Nav nodes are docs/databases nested under doc parents.
 */
import type { JournalPage } from '@/lib/journalService';

export interface TreeNode {
  page: JournalPage;
  children: TreeNode[];
  depth: number;
}

function isRow(page: JournalPage, byId: Map<string, JournalPage>): boolean {
  if (!page.parent_page_id) return false;
  const parent = byId.get(page.parent_page_id);
  return parent?.type === 'database';
}

export function buildTree(pages: JournalPage[]): TreeNode[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const navPages = pages.filter((p) => !isRow(p, byId));
  const childrenOf = (parentId: string | null, depth: number): TreeNode[] =>
    navPages
      .filter((p) => (p.parent_page_id ?? null) === parentId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((page) => ({
        page,
        depth,
        // Databases never show child nav nodes (their children are rows).
        children: page.type === 'database' ? [] : childrenOf(page.id, depth + 1),
      }));
  return childrenOf(null, 0);
}

/** All database rows for a given database page. */
export function rowsOf(databaseId: string, pages: JournalPage[]): JournalPage[] {
  return pages
    .filter((p) => p.parent_page_id === databaseId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Midpoint sort_order to drop an item between two siblings (fractional indexing).
 * before/after are the neighbor sort_orders (null = open end).
 */
export function midpoint(before: number | null, after: number | null): number {
  if (before == null && after == null) return 0;
  if (before == null) return (after as number) - 1;
  if (after == null) return before + 1;
  return (before + after) / 2;
}
