import React, { useState, useEffect } from 'react';
import { questionBank, practiceSets, QuestionRef, flashcards, StudyResource, scheduleData } from '../data';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Target, CheckCircle2, AlertCircle, ArrowRight, RotateCcw, ListChecks, HelpCircle, Zap, BookOpen, Clock, Copy, Check, PlayCircle, Lock } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import InlineQuestionViewer from './InlineQuestionViewer';
import { questionBank as lrBank } from '@/lib/questionLoader';
import { mirroredSetItem } from '@/lib/cloudMirror';
import { useQuestionBank } from '@/contexts/QuestionBankContext';

/**
 * Build the LSAT U canonical qid (PT{pt}-S{section}-Q{qnum}) for a PF ref.
 */
function pfQid(q: QuestionRef): string {
  return `PT${q.pt}-S${q.section}-Q${q.question}`;
}

const RESOURCE_TO_SET: Record<string, string> = {
  'flaw-worksheet': 'flaw-worksheet-set',
  'flaw-pm-1': 'flaw-l1-set',
  'flaw-pm-2': 'flaw-l2-set',
  'flaw-pm-3': 'flaw-l3-set',
  'flaw-pm-4': 'flaw-l4-set',
  'principle-strengthen-hw': 'prin-st-set',
  'strengthen-app-hw': 'str-app-set',
  'principle-conform-hw': 'prin-cf-set',
  'parallel-flaw-bridge': 'par-fl-bridge-set',
};

function OpenInlineButton({ q, onOpen, available }: { q: QuestionRef; onOpen: () => void; available: boolean }) {
  if (!available) {
    return (
      <span
        title="This question isn't in the LSAT U bank yet"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900/40 text-[10px] font-bold uppercase tracking-widest text-zinc-600 cursor-not-allowed"
      >
        <Lock size={12} aria-hidden="true" />
        Unavailable
      </span>
    );
  }
  return (
    <motion.button
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
      title="Open this question inline"
      aria-label="Open question"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] text-[10px] font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400/50 transition-colors"
    >
      <PlayCircle size={12} aria-hidden="true" />
      Open
    </motion.button>
  );
}

function CopyRefButton({ q }: { q: QuestionRef }) {
  const [copied, setCopied] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `PT ${q.pt}, S ${q.section}, Q ${q.question}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <motion.button
      onClick={onCopy}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
      title={copied ? 'Copied' : 'Copy reference'}
      aria-label={copied ? 'Reference copied' : 'Copy question reference'}
      className={`relative inline-flex items-center justify-center w-11 h-11 -m-2 rounded-md border border-transparent transition-colors ${copied ? 'text-emerald-400' : 'text-zinc-600 hover:text-emerald-400 hover:border-zinc-800'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            className="inline-flex"
          >
            <Check size={14} aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            className="inline-flex"
          >
            <Copy size={14} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

interface QuestionRowProps {
  q: QuestionRef;
  status: 'correct' | 'missed' | 'none';
  isRedo: boolean;
  onToggleStatus: (status: 'correct' | 'missed') => void;
  onToggleRedo: () => void;
  onOpen: () => void;
  available: boolean;
}

function QuestionRow({ q, status, isRedo, onToggleStatus, onToggleRedo, onOpen, available }: QuestionRowProps) {
  return (
    <div className={`p-4 rounded-2xl border transition-colors duration-200 ${!available ? 'opacity-70' : ''} ${status === 'correct' ? 'bg-emerald-500/[0.03] border-emerald-500/20' : status === 'missed' ? 'bg-rose-500/[0.03] border-rose-500/20' : 'bg-zinc-900/10 border-white/[0.03] hover:border-white/10'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-white/5 shadow-inner">
             <span className="text-[10px] text-zinc-600 font-bold leading-none mb-1">PT</span>
             <span className="text-sm text-zinc-200 font-mono font-bold leading-none">{q.pt}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Section {q.section} • Q{q.question}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                q.topic.includes('Principle') ? 'bg-blue-500/10 text-blue-500' :
                q.topic.includes('Parallel') ? 'bg-amber-500/10 text-amber-500' :
                'bg-emerald-500/10 text-emerald-500'
              }`}>{q.topic}</span>
              <CopyRefButton q={q} />
            </div>
            <p className="text-xs text-zinc-400 font-light italic leading-snug">{q.instructions}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <OpenInlineButton q={q} onOpen={onOpen} available={available} />

          <motion.button
            onClick={() => onToggleStatus('correct')}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
            className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-colors ${status === 'correct' ? 'bg-emerald-500 text-zinc-50 border-emerald-500' : 'bg-transparent text-zinc-600 border-zinc-800 hover:text-emerald-500 hover:border-emerald-500/30'}`}
          >
            Correct
          </motion.button>
          <motion.button
            onClick={() => onToggleStatus('missed')}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
            className={`px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-colors ${status === 'missed' ? 'bg-rose-500 text-zinc-50 border-rose-500' : 'bg-transparent text-zinc-600 border-zinc-800 hover:text-rose-500 hover:border-rose-500/30'}`}
          >
            Review
          </motion.button>
          <motion.button
            onClick={() => onToggleRedo()}
            whileTap={{ scale: 0.94 }}
            transition={{ duration: 0.12, ease: [0.25, 1, 0.5, 1] }}
            className={`p-2 rounded-xl border transition-colors ${isRedo ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'bg-transparent text-zinc-700 border-zinc-800 hover:text-amber-500'}`}
            aria-label={isRedo ? 'Remove from redo queue' : 'Add to redo queue'}
            aria-pressed={isRedo}
          >
            <RotateCcw size={16} aria-hidden="true" />
          </motion.button>
        </div>
      </div>
      {status === 'missed' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="mt-4 pt-4 border-t border-rose-500/10 origin-top"
        >
          <div className="flex items-start gap-3 bg-rose-500/[0.02] p-3 rounded-xl border border-rose-500/5">
             <AlertCircle size={14} className="text-rose-500 mt-0.5" />
             <p className="text-[11px] text-rose-300 leading-relaxed flex-1"><span className="font-bold uppercase tracking-widest text-[10.5px] mr-2">Review Prompt:</span> {q.reviewPrompt}</p>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('pf-prefill-review', {
                  detail: {
                    reference: `PT ${q.pt}, S ${q.section}, Q ${q.question}`,
                    type: q.topic.includes('Principle') ? 'Principle' : q.topic.includes('Parallel') ? 'Flaw' : 'Flaw',
                  },
                }));
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-emerald-500/30 transition-colors"
            >
              Log to Review Log
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default function Practice({ currentDay, onOpenResource }: { currentDay: number; onOpenResource: (r: Partial<StudyResource>) => void }) {
  const [view, setView] = useState<'sets' | 'redo'>('sets');
  const { isLoading: qbLoading } = useQuestionBank();
  const [viewer, setViewer] = useState<{ qid: string; queue: string[] } | null>(null);

  const isAvailable = React.useCallback((q: QuestionRef) => {
    if (qbLoading) return true; // optimistic while loading
    return !!lrBank.getQuestion(pfQid(q));
  }, [qbLoading]);

  const [qStatus, setQStatus] = useState<Record<string, 'correct' | 'missed' | 'none'>>(() => {
    const saved = localStorage.getItem('pf:questionStatus');
    return saved ? JSON.parse(saved) : {};
  });

  const [redoQueue, setRedoQueue] = useState<string[]>(() => {
    const saved = localStorage.getItem('pf:redoQueue');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    mirroredSetItem('pf:questionStatus', JSON.stringify(qStatus));
  }, [qStatus]);

  useEffect(() => {
    mirroredSetItem('pf:redoQueue', JSON.stringify(redoQueue));
  }, [redoQueue]);

  const toggleStatus = (id: string, status: 'correct' | 'missed') => {
    setQStatus(prev => {
      const current = prev[id];
      if (current === status) return { ...prev, [id]: 'none' };
      return { ...prev, [id]: status };
    });
  };

  const toggleRedo = (id: string) => {
    setRedoQueue(prev => {
      if (prev.includes(id)) return prev.filter(qId => qId !== id);
      return [...prev, id];
    });
  };

  const todaysSetIds = React.useMemo(() => {
    const day = scheduleData.find((item) => item.day === currentDay);
    return new Set((day?.do ?? []).map((resourceId) => RESOURCE_TO_SET[resourceId]).filter(Boolean));
  }, [currentDay]);

  const orderedPracticeSets = React.useMemo(() => {
    return [...practiceSets].sort((left, right) => {
      const leftToday = todaysSetIds.has(left.id);
      const rightToday = todaysSetIds.has(right.id);
      if (leftToday === rightToday) return 0;
      return leftToday ? -1 : 1;
    });
  }, [todaysSetIds]);

  const SetView = () => (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 gap-12">
        {orderedPracticeSets.map((set) => {
          const isToday = todaysSetIds.has(set.id);
          return (
          <section key={set.id} className="space-y-6" data-current-day-set={isToday ? 'true' : undefined}>
            <div className="flex items-end justify-between border-b border-zinc-900/50 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em]">{set.stage}</span>
                   <div className="w-1 h-1 rounded-full bg-zinc-800" />
                   <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{set.whenToDo}</span>
                   {isToday && (
                     <>
                       <div className="w-1 h-1 rounded-full bg-zinc-800" />
                       <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Day {currentDay}</span>
                     </>
                   )}
                </div>
                <h3 className="text-3xl font-serif italic text-zinc-50 leading-tight">{set.title}</h3>
                <p className="text-zinc-500 text-sm font-light italic">{set.purpose}</p>
              </div>
              <div className="hidden sm:block text-right">
                 <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest block mb-1">Pass Criteria</span>
                 <div className="flex gap-1 justify-end">
                    {set.completionCriteria.map((c, i) => (
                      <span key={i} className="text-[10.5px] text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded bg-zinc-950/50">{c}</span>
                    ))}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 space-y-3">
                  {set.questions.length > 0 ? (() => {
                    const refs = set.questions.map(qId => questionBank.find(qb => qb.id === qId)).filter(Boolean) as QuestionRef[];
                    const setQids = refs.filter(isAvailable).map(pfQid);
                    return refs.map(q => (
                      <QuestionRow
                        key={q.id}
                        q={q}
                        status={qStatus[q.id] || 'none'}
                        isRedo={redoQueue.includes(q.id)}
                        onToggleStatus={(s) => toggleStatus(q.id, s)}
                        onToggleRedo={() => toggleRedo(q.id)}
                        available={isAvailable(q)}
                        onOpen={() => setViewer({ qid: pfQid(q), queue: setQids })}
                      />
                    ));
                  })() : (
                    <div className="p-12 rounded-[32px] border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-4">
                       <Zap size={32} className="text-zinc-800" />
                       <div>
                         <p className="text-zinc-400 font-serif italic">Refer to physical resource/PDF for this drill.</p>
                         <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">{set.purpose}</p>
                       </div>
                    </div>
                  )}
               </div>

               <div className="space-y-6">
                  <div className="bg-zinc-900/20 rounded-[28px] border border-white/[0.03] p-6 space-y-6">
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                        <ListChecks size={14} /> Section Focus
                      </span>
                      <ul className="space-y-3">
                        {set.beforeYouStart.map((item, i) => (
                          <li key={i} className="flex gap-3 text-xs text-zinc-400 font-light leading-relaxed italic">
                            <div className="w-1 h-1 rounded-full bg-emerald-500/40 mt-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="h-px bg-zinc-800/50" />

                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={14} /> Review Protocol
                      </span>
                      <ul className="space-y-3">
                        {set.reviewInstructions.map((item, i) => (
                          <li key={i} className="flex gap-3 text-xs text-zinc-400 font-light leading-relaxed italic">
                            <div className="w-1 h-1 rounded-full bg-rose-500/40 mt-2 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
               </div>
            </div>
          </section>
        );
        })}
      </div>
    </div>
  );

  const RedoQueueView = () => {
    const redoQuestions = redoQueue.map(id => questionBank.find(q => q.id === id)).filter(Boolean) as QuestionRef[];

    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="space-y-2">
           <h3 className="text-3xl font-serif italic text-zinc-50">Redo Queue</h3>
           <p className="text-zinc-500 text-sm font-light italic">Mistakes happen. Forgetting them is the error.</p>
        </div>

        {redoQuestions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {redoQuestions.map(q => (
              <QuestionRow
                key={q.id}
                q={q}
                status={qStatus[q.id] || 'none'}
                isRedo={redoQueue.includes(q.id)}
                onToggleStatus={(s) => toggleStatus(q.id, s)}
                onToggleRedo={() => toggleRedo(q.id)}
                available={isAvailable(q)}
                onOpen={() => setViewer({ qid: pfQid(q), queue: redoQuestions.filter(isAvailable).map(pfQid) })}
              />
            ))}
          </div>
        ) : (
          <div className="p-20 rounded-[40px] border border-dashed border-zinc-900 bg-zinc-900/5 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-16 h-16 rounded-full bg-emerald-500/5 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={32} />
             </div>
             <div>
                <p className="text-xl font-serif italic text-zinc-300">Your queue is clear.</p>
                <p className="text-xs text-zinc-600 uppercase tracking-widest mt-2">Every redo completed is a permanent win.</p>
             </div>
          </div>
        )}

        <div className="bg-zinc-900/20 rounded-[32px] border border-white/[0.03] p-8 max-w-2xl">
           <div className="flex items-start gap-4">
              <Clock size={20} className="text-zinc-600 mt-1" />
              <div className="space-y-3">
                 <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">The 24-Hour Rule</h4>
                 <p className="text-xs text-zinc-500 font-light leading-relaxed italic">
                   Wait at least 24 hours before re-doing a question you missed. If you do it immediately, you're just using your short-term memory. You want to test your logical retrieval, not your recollection of the answer key.
                 </p>
              </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-serif italic text-zinc-50 tracking-tight">Active Work</h1>
          <p className="text-zinc-500 mt-2 italic font-light">Precision over speed. Accuracy over volume.</p>
        </div>
        
        <div className="relative flex gap-2 bg-zinc-900/40 p-1.5 rounded-2xl border border-white/[0.03] self-start sm:self-auto">
           {(['sets', 'redo'] as const).map((id) => {
             const active = view === id;
             const label = id === 'sets' ? 'Practice Sets' : 'Redo Queue';
             const Icon = id === 'sets' ? Target : RotateCcw;
             return (
               <button
                 key={id}
                 onClick={() => setView(id)}
                 className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors ${active ? 'text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
                 aria-pressed={active}
               >
                 {active && (
                   <motion.span
                     layoutId="practiceViewIndicator"
                     className="absolute inset-0 rounded-xl bg-zinc-100 shadow-lg shadow-white/5"
                     transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                   />
                 )}
                 <Icon size={14} aria-hidden="true" className="relative z-10" />
                 <span className="relative z-10">{label}</span>
                 {id === 'redo' && redoQueue.length > 0 && (
                   <span className="relative z-10 bg-amber-500 text-zinc-950 px-1.5 rounded-full text-[10px] font-black">{redoQueue.length}</span>
                 )}
               </button>
             );
           })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'sets' ? <SetView key="sets" /> : <RedoQueueView key="redo" />}
      </AnimatePresence>

      {viewer && (
        <InlineQuestionViewer
          initialQid={viewer.qid}
          queue={viewer.queue.length > 0 ? viewer.queue : [viewer.qid]}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
