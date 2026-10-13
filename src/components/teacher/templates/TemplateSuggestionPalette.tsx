import { useEffect, useRef } from 'react';
import { FileText, Mail, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageTemplate } from '@/lib/messageTemplates';

interface Props {
  open: boolean;
  templates: MessageTemplate[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (template: MessageTemplate) => void;
  onClose: () => void;
}

function iconFor(template: MessageTemplate) {
  if (template.template_type === 'email') return Mail;
  if (template.template_type === 'message') return MessageSquareText;
  return FileText;
}

export function TemplateSuggestionPalette({
  open,
  templates,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onClose,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (activeIndex >= templates.length && templates.length > 0) {
      onActiveIndexChange(0);
    }
  }, [activeIndex, templates.length, onActiveIndexChange]);

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.querySelector<HTMLLIElement>(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  if (!open || templates.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 z-40 mb-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl"
      role="listbox"
      aria-label="Saved templates"
      onMouseDown={(event) => event.preventDefault()}
    >
      <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
        {templates.map((template, index) => {
          const Icon = iconFor(template);
          const active = index === activeIndex;
          return (
            <li key={template.id} data-index={index} role="option" aria-selected={active}>
              <button
                type="button"
                onMouseEnter={() => onActiveIndexChange(index)}
                onClick={() => onSelect(template)}
                className={cn(
                  'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors',
                  active ? 'bg-zinc-800' : 'bg-transparent hover:bg-zinc-800/60',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                    active ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-300',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-zinc-100">
                    {template.title}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-400">
                    {template.subject || template.body}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3 border-t border-zinc-800 px-3 py-1.5 text-[10px] text-zinc-500">
        <span><kbd className="text-zinc-300">↑↓</kbd> nav</span>
        <span><kbd className="text-zinc-300">Tab</kbd>/<kbd className="text-zinc-300">Enter</kbd> insert</span>
        <button type="button" onMouseDown={onClose} className="ml-auto text-zinc-400 hover:text-zinc-200">
          Dismiss
        </button>
      </div>
    </div>
  );
}
