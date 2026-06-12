/**
 * SlashMenu — the popup list shown when the user types "/" in the editor.
 * Rendered by the SlashCommand suggestion extension via ReactRenderer.
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SlashItem } from './slashItems';

export interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export interface SlashMenuRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashMenu = React.forwardRef<SlashMenuRef, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = React.useState(0);

    React.useEffect(() => setSelected(0), [items]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command(item);
    };

    React.useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === 'ArrowDown') {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === 'Enter') {
          select(selected);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="w-72 rounded-xl border border-border bg-popover p-2 shadow-lg">
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">No matching blocks</p>
        </div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className="w-72 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg"
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              onMouseEnter={() => setSelected(index)}
              onClick={() => select(index)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors',
                index === selected ? 'bg-accent' : 'hover:bg-accent/50',
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground/80">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-foreground">{item.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </button>
          );
        })}
      </motion.div>
    );
  },
);

SlashMenu.displayName = 'SlashMenu';
