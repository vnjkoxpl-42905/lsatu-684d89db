/**
 * Command Palette (Cmd+K).
 * Indexes every source-backed slot ID: lessons, drills, simulator questions,
 * references, named tools, trap traits, hard-sentences, diagnostics surfaces.
 *
 * Substring matcher (no fuzzy library — keeps bundle lean).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import lessons from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import refs from '@/bootcamps/main-conclusion/data/references.generated.json';
import namedTools from '@/bootcamps/main-conclusion/data/named-tools.generated.json';
import sim from '@/bootcamps/main-conclusion/data/simulator.generated.json';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { DRILLS } from '@/bootcamps/main-conclusion/modules/drills/DrillsIndex';
import { HARD_SECTIONS } from '@/bootcamps/main-conclusion/content/hard-sentences.source';
import { DIAG_SECTIONS } from '@/bootcamps/main-conclusion/modules/diagnostics/DiagnosticsIndex';
import { Input } from '@/bootcamps/main-conclusion/components/primitives/Input';
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

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const all: Item[] = [];
    for (const l of lessons as Array<{ id: string; number: string; title: string }>) {
      all.push({ id: l.id, title: `${l.number} · ${l.title}`, group: 'Lesson', href: `/lessons/${l.number}` });
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
          const dest = item.href.startsWith('/bootcamp/structure') ? item.href : `/bootcamp/structure${item.href}`;
          navigate(dest);
          onClose();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, filtered, highlight, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      <button onClick={onClose} aria-label="Close palette" className="absolute inset-0 bg-black/50 cursor-default" />
      <div className="relative w-[640px] max-w-[92vw] bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.12)] rounded-4 shadow-2xl">
        <div className="px-4 py-3 border-b border-[rgb(var(--border)/0.10)]">
          <Input
            ref={inputRef}
            placeholder="Type any inventory ID — MC-LSN-1.7, NT-FABS, T3, MC-SIM-Q11, MC-DRL-3.4 …"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            className="border-0 bg-transparent focus:outline-none"
          />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 font-mc-mono text-mono text-ink-faint">No matches.</li>
          ) : (
            filtered.map((item, i) => (
              <li key={`${item.group}:${item.id}`}>
                <button
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    const dest = item.href.startsWith('/bootcamp/structure') ? item.href : `/bootcamp/structure${item.href}`;
                    navigate(dest);
                    onClose();
                  }}
                  className={cn(
                    'w-full text-left px-4 py-2 flex items-center gap-3 transition-colors duration-100',
                    i === highlight ? 'bg-[rgb(var(--accent)/0.10)]' : 'hover:bg-[rgb(var(--surface-elev))]',
                  )}
                >
                  <Chip tone="neutral">{item.group}</Chip>
                  <span className="font-mc-mono text-mono text-ink-faint w-32 shrink-0">{item.id}</span>
                  <span className="font-mc-serif text-body text-ink flex-1">{item.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="px-4 py-2 border-t border-[rgb(var(--border)/0.08)] flex justify-between text-mono font-mc-mono text-ink-faint">
          <span>↑↓ navigate · Enter open · Esc close</span>
          <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
}
