/**
 * PropertyCell — renders and edits a single database cell, dispatched by the
 * column type. Read-only mode renders a static value (used by the smart view).
 */
import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JournalColumn } from '@/lib/journalService';

export interface PropertyCellProps {
  column: JournalColumn;
  value: unknown;
  readOnly?: boolean;
  onChange?: (value: unknown) => void;
}

export function PropertyCell({ column, value, readOnly, onChange }: PropertyCellProps) {
  switch (column.type) {
    case 'number':
      return (
        <TextLike
          value={value == null ? '' : String(value)}
          readOnly={readOnly}
          type="number"
          onCommit={(v) => onChange?.(v === '' ? null : Number(v))}
        />
      );
    case 'url':
      return readOnly ? (
        value ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noreferrer"
            className="truncate text-[13px] text-accent-bronze underline underline-offset-2"
          >
            {String(value)}
          </a>
        ) : (
          <Empty />
        )
      ) : (
        <TextLike
          value={value == null ? '' : String(value)}
          type="url"
          onCommit={(v) => onChange?.(v || null)}
        />
      );
    case 'checkbox':
      return (
        <input
          type="checkbox"
          checked={!!value}
          disabled={readOnly}
          onChange={(e) => onChange?.(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-[rgb(197_160_89)]"
        />
      );
    case 'date':
      return readOnly ? (
        value ? <span className="text-[13px]">{String(value)}</span> : <Empty />
      ) : (
        <input
          type="date"
          value={value ? String(value) : ''}
          onChange={(e) => onChange?.(e.target.value || null)}
          className="w-full bg-transparent text-[13px] focus:outline-none"
        />
      );
    case 'select':
      return (
        <SelectCell
          options={column.options ?? []}
          value={value == null ? null : String(value)}
          readOnly={readOnly}
          onChange={(v) => onChange?.(v)}
        />
      );
    case 'multi_select':
      return (
        <MultiSelectCell
          options={column.options ?? []}
          value={Array.isArray(value) ? (value as string[]) : []}
          readOnly={readOnly}
          onChange={(v) => onChange?.(v)}
        />
      );
    default:
      return (
        <TextLike
          value={value == null ? '' : String(value)}
          readOnly={readOnly}
          onCommit={(v) => onChange?.(v || null)}
        />
      );
  }
}

function Empty() {
  return <span className="text-[13px] text-muted-foreground/40">—</span>;
}

function TextLike({
  value,
  onCommit,
  readOnly,
  type = 'text',
}: {
  value: string;
  onCommit?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);
  if (readOnly) {
    return value ? <span className="truncate text-[13px]">{value}</span> : <Empty />;
  }
  return (
    <input
      type={type}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => local !== value && onCommit?.(local)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="w-full bg-transparent text-[13px] focus:outline-none"
    />
  );
}

function selectTone(option: string, options: string[]): string {
  const palette = [
    'bg-accent-bronze/15 text-accent-bronze ring-accent-bronze/25',
    'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20',
    'bg-sky-500/10 text-sky-500 ring-sky-500/20',
    'bg-violet-500/10 text-violet-500 ring-violet-500/20',
    'bg-rose-500/10 text-rose-500 ring-rose-500/20',
    'bg-amber-500/10 text-amber-500 ring-amber-500/20',
  ];
  const i = Math.max(0, options.indexOf(option)) % palette.length;
  return palette[i];
}

function Chip({ label, options }: { label: string; options: string[] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1',
        selectTone(label, options),
      )}
    >
      {label}
    </span>
  );
}

function SelectCell({
  options,
  value,
  readOnly,
  onChange,
}: {
  options: string[];
  value: string | null;
  readOnly?: boolean;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  if (readOnly) return value ? <Chip label={value} options={options} /> : <Empty />;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center">
          {value ? <Chip label={value} options={options} /> : <Empty />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              onChange(o === value ? null : o);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-accent"
          >
            <Chip label={o} options={options} />
            {value === o && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ))}
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">No options yet</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MultiSelectCell({
  options,
  value,
  readOnly,
  onChange,
}: {
  options: string[];
  value: string[];
  readOnly?: boolean;
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  const chips = value.length ? (
    <span className="flex flex-wrap gap-1">
      {value.map((v) => (
        <Chip key={v} label={v} options={options} />
      ))}
    </span>
  ) : (
    <Empty />
  );
  if (readOnly) return chips;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex w-full items-center text-left">
          {chips}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 hover:bg-accent"
          >
            <Chip label={o} options={options} />
            {value.includes(o) && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
        ))}
        {options.length === 0 && (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">No options yet</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
