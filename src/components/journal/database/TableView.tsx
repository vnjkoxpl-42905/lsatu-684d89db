/** TableView — spreadsheet-style grid of rows × columns. */
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PropertyCell } from './PropertyCell';
import type { DatabaseRenderProps } from './types';

export function TableView({
  columns,
  rows,
  view,
  readOnly,
  onCellChange,
  onTitleChange,
  onOpenRow,
  onAddRow,
}: DatabaseRenderProps) {
  const visible = view.config.visibleColumns
    ? columns.filter((c) => view.config.visibleColumns!.includes(c.id))
    : columns;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="min-w-[220px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </th>
            {visible.map((c) => (
              <th
                key={c.id}
                className="min-w-[140px] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {c.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="group border-b border-border last:border-0 hover:bg-accent/30"
            >
              <td className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => onOpenRow?.(row.id)}
                  className="flex items-center gap-2 text-left"
                >
                  {row.icon && <span className="text-[14px]">{row.icon}</span>}
                  <span
                    className={cn(
                      'truncate text-[13px] font-medium',
                      onOpenRow && 'group-hover:underline underline-offset-2',
                    )}
                  >
                    {row.title || 'Untitled'}
                  </span>
                </button>
              </td>
              {visible.map((c) => (
                <td key={c.id} className="px-3 py-1.5">
                  <PropertyCell
                    column={c}
                    value={row.properties[c.id]}
                    readOnly={readOnly}
                    onChange={(v) => onCellChange?.(row.id, c.id, v)}
                  />
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={visible.length + 1}
                className="px-3 py-8 text-center text-[13px] text-muted-foreground"
              >
                No rows yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!readOnly && onAddRow && (
        <button
          type="button"
          onClick={onAddRow}
          className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New row
        </button>
      )}
    </div>
  );
}
