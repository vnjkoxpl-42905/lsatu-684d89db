/**
 * EmojiPicker — lightweight icon chooser for a page. A small curated palette in
 * a popover (no heavy emoji library). Click the swatch to open; pick or clear.
 */
import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJI = [
  '📓', '📘', '📕', '📗', '📙', '📔', '📝', '✏️', '🖊️', '🗒️',
  '⭐', '🔥', '💡', '🎯', '🧠', '⚖️', '🔍', '📌', '🏷️', '✅',
  '❌', '⚠️', '❓', '💬', '📊', '📈', '🗂️', '🧩', '🚀', '🌱',
  '☑️', '🔑', '🧾', '📚', '🎓', '🧮', '🔭', '⏱️', '🗓️', '💼',
];

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-lg border border-border text-2xl transition-colors hover:bg-accent',
            !value && 'text-muted-foreground',
          )}
          aria-label="Choose icon"
        >
          {value ?? <Smile className="h-5 w-5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e);
                setOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-accent"
            >
              {e}
            </button>
          ))}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md py-1 text-[12px] text-muted-foreground hover:bg-accent"
          >
            Remove icon
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
