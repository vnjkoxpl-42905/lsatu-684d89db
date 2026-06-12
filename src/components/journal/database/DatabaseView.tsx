/**
 * DatabaseView — presentational orchestrator: view tabs + active view + (when
 * editable) a toolbar (properties, group-by, add view). Reused by the
 * read-only Wrong Answers smart view.
 */
import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Table, Columns3, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalColumn, JournalView, JournalViewKind } from '@/lib/journalService';
import { TableView } from './TableView';
import { BoardView } from './BoardView';
import { GalleryView } from './GalleryView';
import { ColumnEditor } from './ColumnEditor';
import type { DatabaseRow, DatabaseViewHandlers } from './types';

const KIND_ICON: Record<JournalViewKind, typeof Table> = {
  table: Table,
  board: Columns3,
  gallery: LayoutGrid,
};

export interface DatabaseViewProps extends DatabaseViewHandlers {
  columns: JournalColumn[];
  rows: DatabaseRow[];
  views: JournalView[];
  activeViewId: string | null;
  onSelectView?: (id: string) => void;
  onAddView?: (kind: JournalViewKind) => void;
  onUpdateView?: (id: string, patch: { config?: JournalView['config']; name?: string }) => void;
  onUpdateColumns?: (columns: JournalColumn[]) => void;
}

export function DatabaseView(props: DatabaseViewProps) {
  const {
    columns,
    rows,
    views,
    activeViewId,
    onSelectView,
    onAddView,
    onUpdateView,
    onUpdateColumns,
    readOnly,
    ...rowHandlers
  } = props;

  const active = views.find((v) => v.id === activeViewId) ?? views[0];
  if (!active) return null;

  const Body = active.kind === 'board' ? BoardView : active.kind === 'gallery' ? GalleryView : TableView;
  const selectCols = columns.filter((c) => c.type === 'select' || c.type === 'multi_select');

  return (
    <div className="space-y-3">
      {/* Toolbar: view tabs + controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          {views.map((v) => {
            const Icon = KIND_ICON[v.kind];
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelectView?.(v.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors',
                  v.id === active.id
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {v.name}
              </button>
            );
          })}
          {!readOnly && onAddView && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent/50"
                  aria-label="Add view"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => onAddView('table')}>
                  <Table className="mr-2 h-3.5 w-3.5" /> Table
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddView('board')}>
                  <Columns3 className="mr-2 h-3.5 w-3.5" /> Board
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAddView('gallery')}>
                  <LayoutGrid className="mr-2 h-3.5 w-3.5" /> Gallery
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex-1" />

        {!readOnly && active.kind === 'board' && (
          <Select
            value={active.config.groupBy ?? ''}
            onValueChange={(v) =>
              onUpdateView?.(active.id, { config: { ...active.config, groupBy: v } })
            }
          >
            <SelectTrigger className="h-7 w-40 text-[12px]">
              <SelectValue placeholder="Group by…" />
            </SelectTrigger>
            <SelectContent>
              {selectCols.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-[12px]">
                  Group by {c.name}
                </SelectItem>
              ))}
              {selectCols.length === 0 && (
                <div className="px-2 py-1.5 text-[12px] text-muted-foreground">
                  Add a Select column first
                </div>
              )}
            </SelectContent>
          </Select>
        )}

        {!readOnly && onUpdateColumns && (
          <ColumnEditor columns={columns} onChange={onUpdateColumns} />
        )}
      </div>

      <Body columns={columns} rows={rows} view={active} readOnly={readOnly} {...rowHandlers} />
    </div>
  );
}
