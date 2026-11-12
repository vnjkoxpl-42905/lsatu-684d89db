import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTAStudents, type TAStudentRow } from "@/hooks/useTAStudents";
import { getCurrentComposerToken } from "./composerTokens";

interface Props {
  value: string;
  caret: number;
  open: boolean;
  activeIndex: number;
  onActiveIndexChange: (i: number) => void;
  onSelect: (student: TAStudentRow) => void;
  onClose: () => void;
}

function studentLabel(student: TAStudentRow): string {
  return student.display_name?.trim() || "Unnamed student";
}

export default function MentionStudentPalette({
  value,
  caret,
  open,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onClose,
}: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const { data = [], isLoading, error } = useTAStudents();

  const query = useMemo(() => {
    const token = getCurrentComposerToken(value, caret);
    return token.text.startsWith("@") ? token.text.slice(1).toLowerCase() : "";
  }, [value, caret]);

  const filtered = useMemo(() => {
    const named = data.filter((student) => student.display_name?.trim());
    if (!query) return named.slice(0, 8);
    return named
      .filter((student) => studentLabel(student).toLowerCase().includes(query))
      .slice(0, 8);
  }, [data, query]);

  useEffect(() => {
    if (activeIndex >= filtered.length && filtered.length > 0) {
      onActiveIndexChange(0);
    }
  }, [activeIndex, filtered.length, onActiveIndexChange]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden z-40"
          role="listbox"
          aria-label="Students"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="px-3 py-2 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              Mention a student
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading students…
            </div>
          ) : error ? (
            <div className="px-3 py-4 text-sm text-red-400">
              Failed to load students.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-500">
              No matching students.
            </div>
          ) : (
            <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
              {filtered.map((student, i) => {
                const isActive = i === activeIndex;
                return (
                  <li key={student.class_id} data-index={i} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onMouseEnter={() => onActiveIndexChange(i)}
                      onClick={() => onSelect(student)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        isActive ? "bg-zinc-800" : "bg-transparent hover:bg-zinc-800/60",
                      )}
                    >
                      <span
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0",
                          isActive ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-300",
                        )}
                      >
                        <User className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-100">
                        {studentLabel(student)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-3 py-1.5 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center gap-3">
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
