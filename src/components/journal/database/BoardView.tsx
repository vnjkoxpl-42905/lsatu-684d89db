/**
 * BoardView — Kanban grouped by a select column (view.config.groupBy). Cards
 * drag between columns via dnd-kit; dropping sets the group property.
 */
import * as React from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PropertyCell } from './PropertyCell';
import type { DatabaseRenderProps } from './types';

const NONE = '__none__';

export function BoardView(props: DatabaseRenderProps) {
  const { columns, rows, view, readOnly, onCellChange, onOpenRow } = props;
  const groupColId = view.config.groupBy;
  const groupCol = columns.find((c) => c.id === groupColId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  if (!groupCol || (groupCol.type !== 'select' && groupCol.type !== 'multi_select')) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-[13px] text-muted-foreground">
        Choose a “Select” column to group by in the view settings to use the board.
      </div>
    );
  }

  const groups = [...(groupCol.options ?? []), NONE];
  const otherCols = columns.filter((c) => c.id !== groupCol.id).slice(0, 3);

  const rowsInGroup = (g: string) =>
    rows.filter((r) => {
      const v = r.properties[groupCol.id];
      return g === NONE ? v == null || v === '' : v === g;
    });

  const onDragEnd = (e: DragEndEvent) => {
    if (readOnly) return;
    const rowId = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    if (!target) return;
    onCellChange?.(rowId, groupCol.id, target === NONE ? null : target);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {groups.map((g) => (
          <BoardColumn
            key={g}
            id={g}
            label={g === NONE ? 'No value' : g}
            count={rowsInGroup(g).length}
          >
            {rowsInGroup(g).map((row) => (
              <BoardCard key={row.id} id={row.id} readOnly={readOnly}>
                <button
                  type="button"
                  onClick={() => onOpenRow?.(row.id)}
                  className="mb-1.5 flex items-center gap-2 text-left"
                >
                  {row.icon && <span className="text-[14px]">{row.icon}</span>}
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {row.title || 'Untitled'}
                  </span>
                </button>
                <div className="space-y-1">
                  {otherCols.map((c) => (
                    <PropertyCell
                      key={c.id}
                      column={c}
                      value={row.properties[c.id]}
                      readOnly
                    />
                  ))}
                </div>
              </BoardCard>
            ))}
          </BoardColumn>
        ))}
      </div>
    </DndContext>
  );
}

function BoardColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl border border-border bg-muted/30 p-2 transition-colors',
        isOver && 'border-accent-bronze/40 bg-accent/30',
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[12px] font-semibold text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{count}</span>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function BoardCard({
  id,
  readOnly,
  children,
}: {
  id: string;
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: readOnly,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border border-border bg-card p-2.5 shadow-sm"
    >
      {children}
    </div>
  );
}
