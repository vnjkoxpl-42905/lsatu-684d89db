import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Zap, ChevronLeft, ChevronRight, RotateCcw, Filter, CheckCircle2, Circle, ThumbsUp, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { mirroredSetItem } from '@/lib/cloudMirror';
import { flashcards, Flashcard } from '../data';

interface SrsEntry {
  ease: number;
  interval: number; // days
  due: string; // ISO date (YYYY-MM-DD)
  lastReviewed: string; // ISO date
}

const SRS_KEY = 'pf:flashcardSRS';
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + Math.max(1, Math.round(days)));
  return d.toISOString().slice(0, 10);
};

export default function FlashcardsView() {
  const reduceMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [mastered, setMastered] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('pf:flashcardMastery');
    return saved ? JSON.parse(saved) : {};
  });
  const [srs, setSrs] = useState<Record<string, SrsEntry>>(() => {
    const saved = localStorage.getItem(SRS_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  const filteredCards = useMemo(
    () => flashcards.filter((c) => filter === 'All' || c.topic === filter),
    [filter]
  );

  // Order: due-or-overdue first, unseen next, then future. Stable within groups.
  const orderedCards = useMemo(() => {
    const today = todayISO();
    const due: Flashcard[] = [];
    const unseen: Flashcard[] = [];
    const future: Flashcard[] = [];
    for (const c of filteredCards) {
      const entry = srs[c.id];
      if (!entry) unseen.push(c);
      else if (entry.due <= today) due.push(c);
      else future.push(c);
    }
    return [...due, ...unseen, ...future];
  }, [filteredCards, srs]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentCard = orderedCards[currentIndex];

  const dueTodayCount = useMemo(() => {
    const today = todayISO();
    return filteredCards.filter((c) => {
      const e = srs[c.id];
      return !e || e.due <= today;
    }).length;
  }, [filteredCards, srs]);

  useEffect(() => {
    mirroredSetItem('pf:flashcardMastery', JSON.stringify(mastered));
  }, [mastered]);

  useEffect(() => {
    mirroredSetItem(SRS_KEY, JSON.stringify(srs));
  }, [srs]);

  const toggleMastery = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMastered((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const advance = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (orderedCards.length === 0 ? 0 : (prev + 1) % orderedCards.length));
    }, 150);
  }, [orderedCards.length]);

  const nextCard = advance;

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) =>
        orderedCards.length === 0 ? 0 : (prev - 1 + orderedCards.length) % orderedCards.length
      );
    }, 150);
  }, [orderedCards.length]);

  const handleReset = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
  };

  const grade = useCallback(
    (gotIt: boolean) => {
      if (!currentCard) return;
      setSrs((prev) => {
        const existing = prev[currentCard.id] ?? { ease: 2.5, interval: 0, due: todayISO(), lastReviewed: todayISO() };
        let ease = existing.ease;
        let interval = existing.interval;
        if (gotIt) {
          ease = Math.min(3.0, ease + 0.1);
          interval = interval === 0 ? 2 : interval * ease;
        } else {
          ease = Math.max(1.3, ease - 0.2);
          interval = 1;
        }
        return {
          ...prev,
          [currentCard.id]: {
            ease,
            interval,
            due: addDays(todayISO(), interval),
            lastReviewed: todayISO(),
          },
        };
      });
      if (gotIt) setMastered((prev) => ({ ...prev, [currentCard.id]: true }));
      advance();
    },
    [currentCard, advance]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextCard();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevCard();
      } else if (e.key === '1') {
        grade(true);
      } else if (e.key === '2') {
        grade(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextCard, prevCard, grade]);

  // Reset index when filter changes empties or shifts the deck
  useEffect(() => {
    if (currentIndex >= orderedCards.length) setCurrentIndex(0);
  }, [orderedCards.length, currentIndex]);

  if (orderedCards.length === 0) {
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
        <div className="border-b border-zinc-900/50 pb-8">
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <Zap size={18} className="fill-current" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Knowledge Retrieval</h2>
          </div>
          <h1 className="text-5xl font-serif italic text-zinc-50 tracking-tight">Active Recall</h1>
        </div>
        <div className="p-20 rounded-[40px] border border-dashed border-zinc-900 bg-zinc-900/5 text-center space-y-3">
          <p className="text-zinc-300 font-serif italic text-xl">No cards match this filter.</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Try All to see the full deck.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-zinc-900/50 pb-8">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-2">
            <Zap size={18} className="fill-current" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Knowledge Retrieval</h2>
          </div>
          <h1 className="text-5xl font-serif italic text-zinc-50 tracking-tight">Active Recall</h1>
          <p className="text-zinc-500 mt-2 font-light">Don't recognize. Recite. <span className="text-zinc-700">Space flips · ←/→ navigates · 1 / 2 grades.</span></p>
          <div className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">Due today: {dueTodayCount}</span>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-2 bg-zinc-900/30 p-2 rounded-2xl border border-white/[0.03]">
          {['All', 'Flaw', 'Principle', 'Parallel', 'Review'].map(t => {
            const active = filter === t;
            return (
              <button
                key={t}
                onClick={() => { setFilter(t); setCurrentIndex(0); setIsFlipped(false); }}
                aria-pressed={active}
                className={`relative text-[10px] font-bold uppercase tracking-widest px-6 py-2.5 rounded-xl transition-colors ${active ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {active && (
                  <motion.span
                    layoutId="flashcardFilterIndicator"
                    className="absolute inset-0 rounded-xl bg-zinc-100 shadow-lg shadow-white/5"
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-12 py-10">
        <div 
          className="relative w-full max-w-2xl aspect-[4/3] cursor-pointer group"
          onClick={() => setIsFlipped(!isFlipped)}
          style={{ perspective: '2000px' }}
        >
          <motion.div
            className="w-full h-full relative preserve-3d"
            initial={false}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 20 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-zinc-900/40 rounded-[32px] border border-white/[0.05] p-12 flex flex-col justify-between shadow-2xl overflow-hidden group-hover:border-white/[0.08] transition-colors">
              <div className="absolute top-0 right-0 p-8">
                <Button 
                   variant="ghost" 
                   className={`rounded-full p-3 h-auto ${mastered[currentCard.id] ? 'bg-emerald-500/10 text-emerald-500' : 'bg-transparent text-zinc-700 hover:text-zinc-50'}`}
                   onClick={(e) => toggleMastery(currentCard.id, e)}
                >
                  {mastered[currentCard.id] ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </Button>
              </div>
              <div className="mt-8">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-4">{currentCard.topic} • {currentCard.tag}</span>
                <p className="text-3xl font-serif italic text-zinc-50 leading-tight">{currentCard.front}</p>
              </div>
              <div className="flex justify-center">
                 <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest animate-pulse">Click to Reveal</span>
              </div>
              
              {/* Subtle background glow */}
              <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full" />
            </div>

            {/* Back */}
            <div 
              className="absolute inset-0 backface-hidden bg-zinc-100 rounded-[32px] border border-white p-12 flex flex-col justify-center shadow-2xl"
              style={{ transform: 'rotateY(180) translateZ(1px)' }}
            >
              <div className="absolute top-0 right-0 p-8">
                 <span className="text-[10px] font-bold text-zinc-950/20 uppercase tracking-widest font-mono">Answer</span>
              </div>
              <p className="text-xl leading-relaxed text-zinc-900 font-medium">{currentCard.back}</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-12">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={prevCard} 
            className="w-16 h-16 rounded-full border border-zinc-900/50 hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-50 transition-colors active:scale-[0.93] transition-transform duration-100 shadow-xl"
          >
            <ChevronLeft size={32} />
          </Button>

          <div className="flex flex-col items-center gap-4 min-w-[120px]">
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">{currentIndex + 1} / {filteredCards.length}</span>
             <div className="w-full h-1 bg-zinc-900/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] origin-left"
                  style={{ width: '100%' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: (currentIndex + 1) / filteredCards.length }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                />
             </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={nextCard} 
            className="w-16 h-16 rounded-full border border-zinc-900/50 hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-50 transition-colors active:scale-[0.93] transition-transform duration-100 shadow-xl"
          >
            <ChevronRight size={32} />
          </Button>
        </div>

        <AnimatePresence>
          {isFlipped && (
            <motion.div
              key="srs-actions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-center gap-3"
            >
              <Button
                onClick={() => grade(true)}
                className="h-11 px-6 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2"
              >
                <ThumbsUp size={14} /> Got it <kbd className="text-[10.5px] font-bold opacity-60 ml-1">1</kbd>
              </Button>
              <Button
                onClick={() => grade(false)}
                variant="outline"
                className="h-11 px-6 border-rose-500/40 text-rose-300 hover:bg-rose-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest gap-2"
              >
                <RefreshCw size={14} /> Review again <kbd className="text-[10.5px] font-bold opacity-60 ml-1">2</kbd>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          onClick={handleReset}
          className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-300 gap-2"
        >
          <RotateCcw size={12} /> Restart Deck
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-zinc-900/50">
        <div className="space-y-4">
           <h3 className="text-sm font-serif italic text-zinc-300 px-2">Mastery Progress</h3>
           <div className="bg-zinc-900/20 rounded-[24px] border border-white/[0.03] p-8 flex items-center justify-between">
              <div>
                 <span className="text-4xl font-bold text-zinc-50 leading-none">
                    {Object.values(mastered).filter(Boolean).length}
                 </span>
                 <span className="text-zinc-600 font-bold text-[10px] uppercase tracking-widest ml-3">Cards Learned</span>
              </div>
              <div className="h-12 w-px bg-zinc-800" />
              <div className="text-right">
                 <span className="text-zinc-500 text-sm italic font-light">
                    {Math.round((Object.values(mastered).filter(Boolean).length / flashcards.length) * 100)}% Complete
                 </span>
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <h3 className="text-sm font-serif italic text-zinc-300 px-2">Efficiency Tip</h3>
           <div className="bg-zinc-900/20 rounded-[24px] border border-white/[0.03] p-8">
              <p className="text-xs text-zinc-500 font-light leading-relaxed italic">
                Active recall is the fastest way to solidify your logical tools. If you can't explain a concept in a dark room with no notes, you don't know it yet.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
