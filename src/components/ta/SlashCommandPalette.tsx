import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  SLASH_COMMANDS,
  filterSlashCommands,
  type SlashCommand,
} from "./slashCommands";

interface Props {
  /** Full textarea value. Palette opens when the *current* token starts with `/`. */
  value: string;
  open: boolean;
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

/**
 * Floating command palette anchored above the textarea. Visibility and
 * keyboard navigation are driven by the parent (TAChatView) so that the
 * single keydown path handles both palette nav and "Cmd+Enter send".
 */
export default function SlashCommandPalette({
  value,
  open,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onClose,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    // Parse the trailing `/token`. Palette only reads the last run after a
    // leading `/` at position 0 (simplest rule, matches roadmap: "admin types /").
    if (!value.startsWith("/")) return SLASH_COMMANDS;
    const q = value.slice(1).split(/\s/)[0] ?? "";
    return filterSlashCommands(q);
  }, [value]);

  useEffect(() => {
    // Keep active index in range when filter narrows.
    if (activeIndex >= filtered.length && filtered.length > 0) {
      onActiveIndexChange(0);
    }
  }, [filtered.length, activeIndex, onActiveIndexChange]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  return (
    <AnimatePresence>
      {open && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden z-40"
          role="listbox"
          aria-label="Slash commands"
          onMouseDown={(e) => {
            // Prevent the textarea from losing focus when clicking an item.
            e.preventDefault();
          }}
        >
          <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {filtered.map((cmd, i) => {
              const Icon = cmd.icon;
              const isActive = i === activeIndex;
              return (
                <li
                  key={cmd.id}
                  data-index={i}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onMouseEnter={() => onActiveIndexChange(i)}
                    onClick={() => onSelect(cmd)}
                    className={cn(
                      "w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-zinc-800"
                        : "bg-transparent hover:bg-zinc-800/60"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0",
                        isActive ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-300"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-zinc-100">
                        {cmd.label}
                      </div>
                      <div className="text-[11px] text-zinc-400 line-clamp-1">
                        {cmd.description}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-3 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center gap-3">
            <span>
              <kbd className="text-zinc-300">↑↓</kbd> nav
            </span>
            <span>
              <kbd className="text-zinc-300">Tab</kbd>/<kbd className="text-zinc-300">Enter</kbd> select
            </span>
            <span>
              <kbd className="text-zinc-300">Esc</kbd> close
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="ml-auto text-zinc-400 hover:text-zinc-200"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
