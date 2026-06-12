/** GalleryView — card grid. Shows a few properties per card. */
import { Plus } from 'lucide-react';
import { PropertyCell } from './PropertyCell';
import type { DatabaseRenderProps } from './types';

export function GalleryView({
  columns,
  rows,
  view,
  readOnly,
  onCellChange,
  onOpenRow,
  onAddRow,
}: DatabaseRenderProps) {
  const visible = (
    view.config.visibleColumns
      ? columns.filter((c) => view.config.visibleColumns!.includes(c.id))
      : columns
  ).slice(0, 4);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => onOpenRow?.(row.id)}
              className="mb-2 flex items-center gap-2 text-left"
            >
              {row.icon && <span className="text-[15px]">{row.icon}</span>}
              <span className="truncate text-[14px] font-semibold text-foreground">
                {row.title || 'Untitled'}
              </span>
            </button>
            <div className="space-y-1.5">
              {visible.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] uppercase tracking-wide text-muted-foreground">
                    {c.name}
                  </span>
                  <div className="min-w-0 flex-1">
                    <PropertyCell
                      column={c}
                      value={row.properties[c.id]}
                      readOnly={readOnly}
                      onChange={(v) => onCellChange?.(row.id, c.id, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && (
        <p className="py-8 text-center text-[13px] text-muted-foreground">No rows yet.</p>
      )}
      {!readOnly && onAddRow && (
        <button
          type="button"
          onClick={onAddRow}
          className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          New row
        </button>
      )}
    </div>
  );
}
