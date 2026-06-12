/**
 * PageTree — the sidebar nav tree. Owns the dnd-kit context for reordering
 * pages within a sibling group. Reorder writes a fractional sort_order via
 * useMovePage. Re-parenting by drag is intentionally out of scope (use the
 * "+" affordance to add sub-pages); cross-group drops snap back.
 */
import * as React from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildTree, midpoint, type TreeNode } from '../tree';
import type { JournalPage } from '@/lib/journalService';
import { useMovePage } from '@/hooks/useJournal';
import { PageTreeItem } from './PageTreeItem';

export interface PageTreeProps {
  pages: JournalPage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

export function PageTree({ pages, selectedId, onSelect, onAddChild, onDelete }: PageTreeProps) {
  const tree = React.useMemo(() => buildTree(pages), [pages]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const movePage = useMovePage();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const findSiblings = (id: string): TreeNode[] | null => {
    const walk = (nodes: TreeNode[]): TreeNode[] | null => {
      if (nodes.some((n) => n.page.id === id)) return nodes;
      for (const n of nodes) {
        const found = walk(n.children);
        if (found) return found;
      }
      return null;
    };
    return walk(tree);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;

    const siblings = findSiblings(activeId);
    // Only allow reorder within the same sibling group (over must be a sibling).
    if (!siblings || !siblings.some((n) => n.page.id === overId)) return;

    const ordered = siblings.map((n) => n.page);
    const overIndex = ordered.findIndex((p) => p.id === overId);
    const activeIndex = ordered.findIndex((p) => p.id === activeId);
    if (overIndex < 0 || activeIndex < 0) return;

    // Compute neighbors at the drop slot (excluding the dragged item).
    const without = ordered.filter((p) => p.id !== activeId);
    const targetIndex = without.findIndex((p) => p.id === overId);
    const insertAt = activeIndex < overIndex ? targetIndex + 1 : targetIndex;
    const before = insertAt > 0 ? without[insertAt - 1].sort_order : null;
    const after = insertAt < without.length ? without[insertAt].sort_order : null;

    const parentId = ordered[activeIndex].parent_page_id ?? null;
    movePage.mutate({ id: activeId, parentId, sortOrder: midpoint(before, after) });
  };

  return (
    <ScrollArea className="flex-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={tree.map((n) => n.page.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="px-2 py-1">
            {tree.map((node) => (
              <PageTreeItem
                key={node.page.id}
                node={node}
                selectedId={selectedId}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onDelete={onDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </ScrollArea>
  );
}
