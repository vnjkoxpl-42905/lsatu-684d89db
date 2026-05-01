/**
 * Command Palette (Cmd+K).
 * Indexes every source-backed slot ID: lessons, drills, simulator questions,
 * references, named tools, trap traits, hard-sentences, diagnostics surfaces.
 *
 * Substring matcher (no fuzzy library — keeps bundle lean).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import lessons from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';
import namedTools from '@/bootcamps/main-conclusion/data/named-tools.generated.json';
import sim from '@/bootcamps/main-conclusion/data/simulator.generated.json';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { DRILLS } from '@/bootcamps/main-conclusion/modules/drills/DrillsIndex';
import { HARD_SECTIONS } from '@/bootcamps/main-conclusion/content/hard-sentences.source';
import { DIAG_SECTIONS } from '@/bootcamps/main-conclusion/modules/diagnostics/DiagnosticsIndex';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Item {
  id: string;
  title: string;
  group: 'Lesson' | 'Drill' | 'Reference' | 'Named tool' | 'Simulator' | 'Trap' | 'Hard Sentences' | 'Diagnostics';
  href: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function withPrefix(href: string): string {
  return href.startsWith('/bootcamp/intro-to-lr') ? href : `/bootcamp/intro-to-lr${href}`;
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [];
    for (const l of lessons as Array<{ id: string; number: string; title: string }>) {
      all.push({
        id: l.id,
        title: `${l.number} · ${l.title}`,
        group: 'Lesson',
        href: `/lessons/${l.number}`,
      });
    }
    for (const d of DRILLS) all.push({ id: d.id, title: `${d.number} · ${d.title}`, group: 'Drill', href: d.route });
    for (const r of refs as Array<{ id: string; title: string; route: string }>)
      all.push({ id: r.id, title: r.title, group: 'Reference', href: r.route });
    for (const nt of namedTools as Array<{ id: string; name: string }>)
      all.push({ id: nt.id, title: nt.name, group: 'Named tool', href: `/reference/named-tools/${nt.id}` });
    for (const q of sim as Array<{ id: string; number: number; title: string }>)
      all.push({ id: q.id, title: `Q${q.number} · ${q.title}`, group: 'Simulator', href: `/simulator/bank` });
    for (const t of traps as Array<{ id: string; name: string }>)
      all.push({ id: t.id, title: t.name, group: 'Trap', href: `/simulator/trap-master/${t.id}` });
    for (const h of HARD_SECTIONS)
      all.push({ id: h.id, title: `${h.number} · ${h.title}`, group: 'Hard Sentences', href: h.route });
    for (const s of DIAG_SECTIONS)
      all.push({ id: s.id, title: s.title, group: 'Diagnostics', href: s.route });
    return all;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items
      .filter((i) => i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
      .slice(0, 30);
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
    setHighlight(0);
    setQuery('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((h) => Math.min(filtered.length - 1, h + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      } else if (e.key === 'Enter') {
        const item = filtered[highlight];
        if (item) {
          navigate(withPrefix(item.href));
          onClose();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered, highlight, navigate, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close palette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className={cn(
              'relative w-[640px] max-w-[92vw] rounded-4 overflow-hidden',
              'bg-[image:var(--grad-surface-elev)]',
              'border border-[color:var(--border-accent-soft)]',
              'shadow-[var(--shadow-3),var(--glow-accent-soft)]',
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
            />

            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgb(var(--border)/0.10)]">
              <Search className="h-4 w-4 shrink-0 text-mc-accent" strokeWidth={2.2} aria-hidden="true" />
              <input
                ref={inputRef}
                placeholder="Type any inventory ID — MC-LSN-1.7, NT-FABS, T3, MC-SIM-Q11, MC-DRL-3.4 …"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                className={cn(
                  'w-full bg-transparent border-0 outline-none',
                  'font-mc-serif text-body-prose text-ink placeholder:text-ink-faint',
                  'focus:outline-none',
                )}
              />
              <KeyHint>esc</KeyHint>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1.5">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center font-mc-mono text-mono text-ink-faint">
                  No matches · try a different ID or surface name
                </li>
              ) : (
                filtered.map((item, i) => (
                  <li key={`${item.group}:${item.id}`}>
                    <button
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => {
                        navigate(withPrefix(item.href));
                        onClose();
                      }}
                      className={cn(
                        'relative w-full text-left px-4 py-2.5 flex items-center gap-3',
                        'transition-[background] duration-100',
                        i === highlight
                          ? 'bg-[rgb(var(--accent)/0.10)] text-ink'
                          : 'text-ink-soft hover:bg-[rgb(var(--surface-elev)/0.7)]',
                      )}
                    >
                      {i === highlight ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
                        />
                      ) : null}
                      <Chip tone="neutral" className="shrink-0">
                        {item.group}
                      </Chip>
                      <span className="font-mc-mono text-mono text-ink-faint w-32 shrink-0 truncate">{item.id}</span>
                      <span className="font-mc-serif text-body text-ink flex-1 truncate">{item.title}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="px-4 py-2.5 border-t border-[rgb(var(--border)/0.08)] flex items-center justify-between bg-[rgb(var(--surface)/0.4)] backdrop-blur-md">
              <div className="flex items-center gap-3 font-mc-mono text-mono text-ink-faint">
                <span className="inline-flex items-center gap-1.5">
                  <KeyHint>↑</KeyHint>
                  <KeyHint>↓</KeyHint>
                  <span>navigate</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <KeyHint>⏎</KeyHint>
                  <span>open</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <KeyHint>esc</KeyHint>
                  <span>close</span>
                </span>
              </div>
              <span className="font-mc-mono text-mono text-ink-faint">
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
              </span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function KeyHint({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-[5px] px-1',
        'bg-[rgb(var(--surface-elev))] border border-[rgb(var(--border)/0.14)]',
        'shadow-[inset_0_-1px_0_rgb(0_0_0/0.4),0_1px_0_rgb(255_255_255/0.04)]',
        'font-mc-mono text-[10px] font-semibold text-ink-soft',
      )}
    >
      {children}
    </kbd>
  );
}
