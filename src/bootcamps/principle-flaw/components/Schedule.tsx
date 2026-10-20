import React, { useState } from 'react';
import { scheduleData, studyResources, StudyResource } from '../data';
import { Card, CardContent } from './ui/card';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, Target, ArrowRight, FileSearch, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';

export default function Schedule({ currentDay, setDay }: { currentDay: number, setDay: (d: number) => void }) {
  const [expandedDay, setExpandedDay] = useState<number | null>(currentDay);
  const [completedDays, setCompletedDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('pf:completedDays');
    return saved ? JSON.parse(saved) : [];
  });

  const resolveResource = (idOrName: string) => {
    return studyResources.find(r => r.id === idOrName) || {
      id: idOrName,
      title: idOrName,
      description: "",
      includedInApp: false
    } as Partial<StudyResource>;
  };

  const DayRow = ({ data }: { data: typeof scheduleData[0] }) => {
    const isExpanded = expandedDay === data.day;
    const isComplete = completedDays.includes(data.day);
    const isCurrent = currentDay === data.day;

    return (
      <div className={`group border-b border-zinc-900 last:border-0 transition-colors duration-200 ${isExpanded ? 'bg-zinc-900/10' : ''}`}>
        <button 
          onClick={() => setExpandedDay(isExpanded ? null : data.day)}
          className="w-full flex items-center justify-between p-6 hover:bg-zinc-900/20 transition-colors"
        >
          <div className="flex items-center gap-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-serif italic text-lg transition-colors duration-200 ${
              isComplete ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 
              isCurrent ? 'bg-zinc-100 border-zinc-100 text-zinc-950 shadow-xl shadow-white/5' : 
              'bg-zinc-950 border-white/[0.03] text-zinc-600'
            }`}>
              {data.day}
            </div>
            <div className="text-left space-y-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isCurrent ? 'text-emerald-500' : 'text-zinc-600'}`}>
                {data.label} {isCurrent && "• Current"}
              </span>
              <h3 className={`text-xl font-serif italic ${isComplete ? 'text-zinc-500' : 'text-zinc-50'}`}>{data.focus}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/50 border border-white/[0.03]">
              <div className={`w-1.5 h-1.5 rounded-full ${
                data.intensity === 'High' ? 'bg-rose-500' : data.intensity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{data.intensity}</span>
            </div>
            {isExpanded ? <ChevronUp size={20} className="text-zinc-700" /> : <ChevronDown size={20} className="text-zinc-700" />}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-8 pt-2 space-y-8 pl-24">
                 <div className="p-6 rounded-3xl bg-zinc-950/50 border border-white/[0.02] flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="flex-1 space-y-1">
                       <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">The Objective</span>
                       <p className="text-zinc-400 font-light text-lg leading-relaxed">{data.plainGoal}</p>
                    </div>
                    {isCurrent ? (
                      <Button onClick={() => setDay(data.day)} className="h-12 px-8 rounded-xl bg-zinc-100 text-zinc-950 text-[10px] font-bold uppercase tracking-widest gap-2 group flex-shrink-0">
                        Start Today <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <Button onClick={() => setDay(data.day)} variant="outline" className="h-12 px-8 rounded-xl border-white/[0.05] bg-zinc-950 text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex-shrink-0">
                        Jump to Day {data.day}
                      </Button>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StepSummary icon={FileSearch} label="Setup" title="Open" items={data.open} resolve={resolveResource} />
                    <StepSummary icon={BookOpen} label="Knowledge" title="Read" items={data.read} resolve={resolveResource} />
                    <StepSummary icon={Target} label="Execution" title="Do" items={data.do} resolve={resolveResource} />
                    <StepSummary icon={AlertCircle} label="Mastery" title="Think" items={data.review} resolve={resolveResource} />
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const StepSummary = ({ icon: Icon, label, title, items, resolve }: { icon: LucideIcon; label: string; title: string; items: string[]; resolve: (idOrName: string) => Partial<StudyResource> }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
         <Icon size={14} className="text-zinc-600" />
         <span className="text-[10.5px] font-bold text-zinc-600 uppercase tracking-widest">{label}: {title}</span>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const res = resolve(item);
          return (
            <div key={i} className="text-xs text-zinc-400 font-light leading-snug px-3 py-2 rounded-xl bg-zinc-900/30 border border-white/[0.02]">
              {res.title}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-zinc-900/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Sparkles size={14} className="animate-pulse" />
            <span className="font-bold text-[10px] uppercase tracking-[0.3em]">Curriculum Roadmap</span>
          </div>
          <h1 className="text-4xl font-serif italic text-zinc-50 tracking-tight">The 14-Day Path</h1>
        </div>
      </div>

      <div className="bg-zinc-950/20 rounded-[40px] border border-white/[0.02] overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex flex-col">
          {scheduleData.map((data) => (
            <DayRow key={data.day} data={data} />
          ))}
        </div>
      </div>
    </div>
  );
}
