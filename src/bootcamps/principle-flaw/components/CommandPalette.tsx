import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Zap, Target, FileText } from 'lucide-react';
import { flawHubData, principleHubData, flashcards, questionBank } from '../data';
import type { Tab } from '../PrincipleFlawApp';

type Result = {
  id: string;
  label: string;
  hint: string;
  category: 'Flaw' | 'Principle' | 'Flashcard' | 'Question';
  tab: Tab;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: Tab) => void;
}

export default function CommandPalette({ isOpen, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const index: Result[] = useMemo(() => {
    const items: Result[] = [];
    for (const s of flawHubData.styles) {
      items.push({ id: `flaw-${s.id}`, label: s.style, hint: s.meaning, category: 'Flaw', tab: 'learn' });
    }
    for (const t of flawHubData.famousFlaws ?? []) {
      items.push({ id: `flaw-map-${t.flaw}`, label: t.flaw, hint: t.meaning, category: 'Flaw', tab: 'learn' });
    }
    for (const v of principleHubData.varieties ?? []) {
      items.push({ id: `principle-${v.t}`, label: v.t, hint: v.d, category: 'Principle', tab: 'learn' });
    }
    for (const c of flashcards) {
      items.push({ id: `card-${c.id}`, label: c.front, hint: c.back.slice(0, 80), category: 'Flashcard', tab: 'flashcards' });
    }
    for (const q of questionBank) {
      items.push({
        id: `q-${q.id}`,
        label: `PT ${q.pt}, S ${q.section}, Q ${q.question}`,
        hint: `${q.topic} · ${q.set}`,
        category: 'Question',
        tab: 'practice',
      });
    }
    return items;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return index.slice(0, 10);
    return index
      .filter((r) => r.label.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, index]);

  const choose = (r: Result) => {
    onNavigate(r.tab);
    onClose();
  };

  const iconFor = (c: Result['category']) => {
    if (c === 'Flaw') return <BookOpen size={14} className="text-emerald-500" />;
    if (c === 'Principle') return <FileText size={14} className="text-blue-400" />;
    if (c === 'Flashcard') return <Zap size={14} className="text-amber-500" />;
    return <Target size={14} className="text-zinc-400" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#030303]/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
              <Search size={16} className="text-zinc-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search flaws, principles, flashcards, questions…"
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
              {results.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-500 italic">No matches.</div>
              ) : (
                <ul className="py-2">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => choose(r)}
                        className="w-full flex items-start gap-3 text-left px-4 py-2.5 hover:bg-zinc-800/60 focus:bg-zinc-800/60 focus:outline-none transition-colors"
                      >
                        <div className="mt-0.5">{iconFor(r.category)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-zinc-100 truncate">{r.label}</div>
                          <div className="text-[11px] text-zinc-500 italic truncate">{r.hint}</div>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-2 mt-1">{r.category}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
