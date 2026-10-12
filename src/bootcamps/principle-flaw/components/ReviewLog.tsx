import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Filter, BookOpen, AlertCircle, HelpCircle, CheckCircle2, Download, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { mirroredSetItem } from '@/lib/cloudMirror';
import { questionBank } from '../data';

interface LogEntry {
  id: string;
  reference: string; // e.g. PT 104 S2 Q15
  type: 'Flaw' | 'Principle' | 'Timed LR' | 'RC';
  picked: string;
  correct: string;
  // Structured for Flaw
  conclusion?: string;
  evidence?: string;
  assumption?: string;
  plainEnglishFlaw?: string;
  // Structured for Principle
  rule?: string;
  trigger?: string;
  application?: string;
  outcome?: string;
  // Common
  whyMissed: string;
  noticeNext: string;
  confidence: 'Low' | 'Medium' | 'High';
  redoLater: boolean;
  date: string;
}

function parseLogDate(d: string): number {
  const ms = Date.parse(d);
  return Number.isNaN(ms) ? 0 : ms;
}

function formatLogDate(d: string): string {
  const ms = Date.parse(d);
  if (Number.isNaN(ms)) return d;
  const date = new Date(ms);
  // Detect time presence — only ISO strings include 'T'
  if (d.includes('T')) {
    return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }
  return date.toLocaleDateString();
}

export default function ReviewLog() {
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('pf:reviewLogs');
    const parsed: LogEntry[] = saved ? JSON.parse(saved) : [];
    return parsed.slice().sort((a, b) => parseLogDate(b.date) - parseLogDate(a.date));
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState<Partial<LogEntry>>({
    type: 'Flaw',
    confidence: 'Medium',
    redoLater: false,
  });
  const [filterType, setFilterType] = useState('All');
  const [downloadStatus, setDownloadStatus] = useState('');

  useEffect(() => {
    mirroredSetItem('pf:reviewLogs', JSON.stringify(logs));
  }, [logs]);

  // Listen for prefill events fired by Practice's "Log to Review Log" button.
  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<{ reference?: string; type?: LogEntry['type'] }>).detail || {};
      setNewLog((prev) => ({
        ...prev,
        reference: detail.reference || prev.reference || '',
        type: detail.type || prev.type || 'Flaw',
      }));
      setIsAdding(true);
    };
    window.addEventListener('pf-prefill-review', onPrefill);
    return () => window.removeEventListener('pf-prefill-review', onPrefill);
  }, []);

  // Mirror redoLater entries into lsatRedoQueue when the reference matches a
  // questionBank id (parsed as "PT X SY QZ"). Practice resolves the queue by id;
  // entries without a matching id are not added.
  useEffect(() => {
    try {
      const queueRaw = localStorage.getItem('pf:redoQueue');
      const existing: string[] = queueRaw ? JSON.parse(queueRaw) : [];
      const next = new Set(existing);
      const refToId = (ref: string): string | null => {
        const m = ref.match(/PT\s*(\d+)[^\d]+S?(\d+)[^\d]+Q?(\d+)/i);
        if (!m) return null;
        const [, pt, s, q] = m;
        const found = questionBank.find((qb) => qb.pt === pt && qb.section === s && qb.question === q);
        return found?.id ?? null;
      };
      for (const entry of logs) {
        const id = refToId(entry.reference);
        if (!id) continue;
        if (entry.redoLater) next.add(id);
      }
      mirroredSetItem('pf:redoQueue', JSON.stringify(Array.from(next)));
    } catch { /* ignore */ }
  }, [logs]);

  const handleAdd = () => {
    if (!newLog.reference) return;
    const entry: LogEntry = {
      id: Date.now().toString(),
      reference: newLog.reference || '',
      type: newLog.type || 'Flaw',
      picked: newLog.picked || '',
      correct: newLog.correct || '',
      whyMissed: newLog.whyMissed || '',
      noticeNext: newLog.noticeNext || '',
      confidence: newLog.confidence || 'Medium',
      redoLater: newLog.redoLater || false,
      date: new Date().toISOString(),
      // Optional structured fields
      conclusion: newLog.conclusion,
      evidence: newLog.evidence,
      assumption: newLog.assumption,
      plainEnglishFlaw: newLog.plainEnglishFlaw,
      rule: newLog.rule,
      trigger: newLog.trigger,
      application: newLog.application,
      outcome: newLog.outcome
    };
    setLogs([entry, ...logs]);
    setNewLog({ type: 'Flaw', confidence: 'Medium', redoLater: false });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setLogs(logs.filter(l => l.id !== id));
  };

  const downloadCSV = () => {
    const headers = ['Date', 'Ref', 'Type', 'Confidence', 'Picked', 'Correct', 'Takeaway'];
    const rows = logs.map(l => [formatLogDate(l.date), l.reference, l.type, l.confidence, l.picked, l.correct, l.noticeNext]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `lsat-review-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.download = filename;
    a.click();
    setDownloadStatus(`Downloaded ${filename}.`);
    setTimeout(() => setDownloadStatus(''), 4000);
  };

  const filteredLogs = logs.filter(log => filterType === 'All' || log.type === filterType);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-zinc-900/50">
        <div>
          <div className="flex items-center gap-2 text-rose-500 mb-2">
            <BookOpen size={18} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Critical Analysis</h2>
          </div>
          <h1 className="text-5xl font-serif italic text-zinc-50 tracking-tight">Review Log</h1>
          <p className="text-zinc-500 mt-2 font-light">Don't just record mistakes, solve them.</p>
          <ul className="mt-4 space-y-1 text-[11px] text-zinc-500 leading-relaxed max-w-xl">
            <li>1. Reference (PT, Section, Question), and the type.</li>
            <li>2. For Flaw: name the conclusion, evidence, assumption, and flaw in plain English.</li>
            <li>3. For Principle: name the rule, trigger, application, and outcome.</li>
            <li>4. Always end with one sentence on why your answer was tempting and one on what you'll notice next time.</li>
            <li>5. Mark Redo if you'd miss it again tomorrow. Practice's Redo Queue picks it up.</li>
          </ul>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={downloadCSV} className="rounded-xl border border-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-50">
            <Download size={14} className="mr-2" aria-hidden="true" /> Export CSV
          </Button>
          <span role="status" aria-live="polite" className="sr-only">{downloadStatus}</span>
          <Button onClick={() => setIsAdding(!isAdding)} className="rounded-xl h-12 px-8 bg-zinc-100 text-zinc-950 hover:bg-zinc-50 font-bold uppercase tracking-widest text-[10px] gap-2">
            {isAdding ? "Cancel" : <><Plus size={18} /> Log Mistake</>}
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-zinc-950/50 border border-white/[0.05] rounded-[32px] p-10 space-y-10 shadow-2xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Ref (e.g. PT 104 S2 Q15)</label>
                <input 
                  autoFocus
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-4 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/50 font-mono text-sm"
                  value={newLog.reference || ''}
                  onChange={e => setNewLog({...newLog, reference: e.target.value})}
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Type</label>
                <select 
                  className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-4 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/50 appearance-none cursor-pointer text-sm"
                  value={newLog.type || 'Flaw'}
                  onChange={e => setNewLog({...newLog, type: e.target.value as LogEntry['type']})}
                >
                  <option>Flaw</option>
                  <option>Principle</option>
                  <option>Timed LR</option>
                  <option>RC</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">My Ans / Correct</label>
                <div className="flex gap-2">
                  <input aria-label="My answer (single letter)" maxLength={1} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-4 text-center text-zinc-200 font-bold uppercase" value={newLog.picked || ''} onChange={e => setNewLog({...newLog, picked: e.target.value.toUpperCase()})} />
                  <input aria-label="Correct answer (single letter)" maxLength={1} className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-4 text-center text-emerald-500 font-bold uppercase" value={newLog.correct || ''} onChange={e => setNewLog({...newLog, correct: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="md:col-span-1">
                <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Confidence</label>
                <select 
                   className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-4 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500/50 appearance-none cursor-pointer text-sm"
                   value={newLog.confidence || 'Medium'}
                   onChange={e => setNewLog({...newLog, confidence: e.target.value as LogEntry['confidence']})}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {newLog.type === 'Flaw' ? (
                 <div className="space-y-6">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.2em] block mb-2">Step 1: Argument Structure</span>
                    <div className="space-y-4">
                       <textarea aria-label="Conclusion" rows={2} placeholder="Conclusion" className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.conclusion || ''} onChange={e => setNewLog({...newLog, conclusion: e.target.value})} />
                       <textarea rows={2} placeholder="Evidence" className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.evidence || ''} onChange={e => setNewLog({...newLog, evidence: e.target.value})} />
                       <textarea rows={2} placeholder="Assumption/Gap" className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.assumption || ''} onChange={e => setNewLog({...newLog, assumption: e.target.value})} />
                    </div>
                 </div>
               ) : newLog.type === 'Principle' ? (
                 <div className="space-y-6">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] block mb-2">Step 1: Rule Mapping</span>
                    <div className="space-y-4">
                       <textarea rows={2} placeholder="Rule (If... then...)" className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.rule || ''} onChange={e => setNewLog({...newLog, rule: e.target.value})} />
                       <textarea rows={2} placeholder="Trigger" className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.trigger || ''} onChange={e => setNewLog({...newLog, trigger: e.target.value})} />
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] block mb-2">Analysis</span>
                    <textarea rows={6} placeholder="Describe exactly why you missed this and what the structural error was." className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.whyMissed || ''} onChange={e => setNewLog({...newLog, whyMissed: e.target.value})} />
                 </div>
               )}

               <div className="space-y-6 border-l border-white/5 pl-12">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-[0.2em] block mb-2">Step 2: Takeaway</span>
                  <div className="space-y-6">
                    <div>
                       <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Why was my answer tempting?</label>
                       <textarea rows={3} placeholder="Trap language? Misread conclusion?" className="w-full bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-sm font-light italic" value={newLog.whyMissed || ''} onChange={e => setNewLog({...newLog, whyMissed: e.target.value})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Next time I need to notice...</label>
                       <input className="w-full bg-zinc-900/30 border border-emerald-500/20 rounded-xl p-4 text-sm italic text-zinc-200" value={newLog.noticeNext || ''} onChange={e => setNewLog({...newLog, noticeNext: e.target.value})} />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer group p-4 bg-zinc-950/50 rounded-xl border border-white/5">
                      <input type="checkbox" className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-rose-500" checked={newLog.redoLater || false} onChange={e => setNewLog({...newLog, redoLater: e.target.checked})} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-200 transition-colors">Mark for re-do later</span>
                    </label>
                  </div>
               </div>
            </div>

            <div className="flex justify-end gap-4 pt-10 border-t border-white/5">
               <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
               <Button onClick={handleAdd} className="px-12 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-zinc-50 font-bold uppercase tracking-widest text-[10px]" disabled={!newLog.reference}>Save Review</Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-4 bg-zinc-900/30 p-2 rounded-2xl border border-white/[0.03] w-fit">
              {['All', 'Flaw', 'Principle', 'Timed LR', 'RC'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`text-[10.5px] font-bold uppercase tracking-widest px-6 py-2 rounded-xl transition-colors duration-150 active:scale-[0.96] transition-transform ${filterType === t ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {filteredLogs.length > 0 ? (
              <div className="grid grid-cols-1 gap-8">
                <AnimatePresence initial={false}>
                {filteredLogs.map(log => (
                  <motion.div
                    key={log.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
                  >
                  <Card className="bg-zinc-900/30 border-white/[0.05] group overflow-hidden rounded-[32px]">
                    <div className="p-10 flex flex-col md:flex-row gap-12 relative">
                      <button aria-label="Delete this log entry" onClick={() => handleDelete(log.id)} className="absolute top-8 right-8 text-zinc-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"><Trash2 size={20} aria-hidden="true" /></button>
                      
                      <div className="flex-1 space-y-8">
                        <div className="flex items-center gap-4">
                           <div className="px-4 py-2 bg-zinc-950/50 border border-white/5 rounded-xl font-mono text-sm text-zinc-100">{log.reference}</div>
                           <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${log.type === 'Flaw' ? 'text-rose-500' : 'text-blue-500'}`}>{log.type}</span>
                           <div className="w-1 h-1 rounded-full bg-zinc-800" />
                           <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{formatLogDate(log.date)}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                           <div className="space-y-6">
                              {log.type === 'Flaw' && log.conclusion && (
                                <div className="space-y-4">
                                   <div className="space-y-1">
                                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Logic Structure</span>
                                      <div className="p-4 bg-zinc-950/30 rounded-2xl border border-white/5 space-y-3">
                                         <p className="text-xs text-zinc-400 italic leading-relaxed"><span className="text-rose-500 not-italic mr-2 font-bold pointer-events-none">C:</span> {log.conclusion}</p>
                                         <p className="text-xs text-zinc-400 italic leading-relaxed"><span className="text-zinc-500 not-italic mr-2 font-bold pointer-events-none">E:</span> {log.evidence}</p>
                                      </div>
                                   </div>
                                </div>
                              )}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">The Trap</span>
                                <p className="text-sm text-zinc-300 font-light leading-relaxed italic">{log.whyMissed}</p>
                              </div>
                           </div>

                           <div className="space-y-6 border-l border-white/5 pl-10">
                              <div className="flex items-center gap-4">
                                 <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest block">Wrong</span>
                                    <span className="text-2xl font-bold text-rose-600 font-mono leading-none">{log.picked}</span>
                                 </div>
                                 <ChevronRight size={16} className="text-zinc-800 mt-4" />
                                 <div className="space-y-1">
                                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Right</span>
                                    <span className="text-2xl font-bold text-emerald-500 font-mono leading-none">{log.correct}</span>
                                 </div>
                                 <div className="ml-auto text-right">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Confidence</span>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${log.confidence === 'High' ? 'text-emerald-500 bg-emerald-500/10' : log.confidence === 'Medium' ? 'text-amber-500 bg-amber-500/10' : 'text-rose-500 bg-rose-500/10'}`}>{log.confidence}</span>
                                 </div>
                              </div>

                              <div className="bg-emerald-500/[0.03] p-6 rounded-[24px] border border-emerald-500/10">
                                 <span className="text-[10.5px] font-bold text-emerald-500 uppercase tracking-[0.2em] block mb-3">Key Takeaway</span>
                                 <p className="text-zinc-100 font-medium italic text-sm leading-relaxed">"{log.noticeNext}"</p>
                              </div>

                              {log.redoLater && (
                                <div className="flex items-center gap-2 text-rose-500 bg-rose-500/5 px-4 py-2 rounded-xl border border-rose-500/20 w-fit">
                                   <RotateCcw size={12} />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">Added to Redo Queue</span>
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                  </motion.div>
                ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="p-32 rounded-[48px] border border-dashed border-zinc-900 bg-zinc-900/5 flex flex-col items-center justify-center text-center space-y-8">
                 <AlertCircle size={48} className="text-zinc-800" />
                 <div className="space-y-2">
                    <p className="text-2xl font-serif italic text-zinc-400">Your log is clean.</p>
                    <p className="text-xs text-zinc-600 uppercase tracking-widest">Mistakes are information. Capture them.</p>
                 </div>
                 <Button onClick={() => setIsAdding(true)} variant="outline" className="rounded-xl border-zinc-800 text-zinc-500 hover:text-zinc-50">Start Logging</Button>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
