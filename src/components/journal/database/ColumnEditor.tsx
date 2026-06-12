/**
 * ColumnEditor — manage a database's columns: add, rename, retype, set select
 * options, delete. Driven from a popover in the DatabaseView toolbar.
 */
import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings2, Plus, Trash2 } from 'lucide-react';
import type { JournalColumn, JournalColumnType } from '@/lib/journalService';

const TYPES: { value: JournalColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
];

function uid(): string {
  return `col_${Math.random().toString(36).slice(2, 9)}`;
}

export function ColumnEditor({
  columns,
  onChange,
}: {
  columns: JournalColumn[];
  onChange: (columns: JournalColumn[]) => void;
}) {
  const update = (id: string, patch: Partial<JournalColumn>) =>
    onChange(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => onChange(columns.filter((c) => c.id !== id));
  const add = () =>
    onChange([...columns, { id: uid(), name: 'New column', type: 'text' }]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px]">
          <Settings2 className="h-3.5 w-3.5" />
          Properties
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="space-y-2">
          {columns.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-2">
              <div className="flex items-center gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => update(c.id, { name: e.target.value })}
                  className="h-7 text-[13px]"
                />
                <Select
                  value={c.type}
                  onValueChange={(v) => update(c.id, { type: v as JournalColumnType })}
                >
                  <SelectTrigger className="h-7 w-32 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-[12px]">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-destructive"
                  aria-label="Delete column"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {(c.type === 'select' || c.type === 'multi_select') && (
                <Input
                  value={(c.options ?? []).join(', ')}
                  onChange={(e) =>
                    update(c.id, {
                      options: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Options, comma-separated"
                  className="mt-2 h-7 text-[12px]"
                />
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={add} className="w-full gap-1.5 text-[12px]">
            <Plus className="h-3.5 w-3.5" />
            Add property
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
