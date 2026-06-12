/**
 * PageTreeItem — one row in the sidebar nav tree. Recursively renders children.
 * Draggable (within its sibling group) via dnd-kit useSortable.
 */
import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  ChevronRight,
  FileText,
  Database,
  Plus,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TreeNode } from '../tree';

export interface PageTreeItemProps {
  node: TreeNode;
  selectedId: string | null;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}

export function PageTreeItem(props: PageTreeItemProps) {
  const { node, selectedId, expanded, onToggleExpand, onSelect, onAddChild, onDelete } = props;
  const { page, children, depth } = node;
  const isOpen = expanded.has(page.id);
  const hasChildren = children.length > 0;
  const isDatabase = page.type === 'database';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-md pr-1 transition-colors',
          selectedId === page.id ? 'bg-accent text-foreground' : 'hover:bg-accent/50',
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggleExpand(page.id)}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground',
            !hasChildren && 'invisible',
          )}
          aria-label={isOpen ? 'Collapse' : 'Expand'}
        >
          <ChevronRight
            className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')}
          />
        </button>

        <button
          type="button"
          onClick={() => onSelect(page.id)}
          {...attributes}
          {...listeners}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
        >
          <span className="shrink-0 text-muted-foreground">
            {page.icon ? (
              <span className="text-[14px] leading-none">{page.icon}</span>
            ) : isDatabase ? (
              <Database className="h-3.5 w-3.5" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="truncate text-[13px]">{page.title || 'Untitled'}</span>
        </button>

        {!isDatabase && (
          <button
            type="button"
            onClick={() => {
              onAddChild(page.id);
              if (!isOpen) onToggleExpand(page.id);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
            aria-label="Add sub-page"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
              aria-label="Page actions"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(page.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isOpen && hasChildren && (
        <SortableContext
          items={children.map((c) => c.page.id)}
          strategy={verticalListSortingStrategy}
        >
          {children.map((child) => (
            <PageTreeItem key={child.page.id} {...props} node={child} />
          ))}
        </SortableContext>
      )}
    </div>
  );
}
