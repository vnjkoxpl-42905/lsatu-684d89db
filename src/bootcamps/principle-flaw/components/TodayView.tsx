import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Target, FileSearch, Sparkles, BookOpen, AlertCircle, ArrowRight, ExternalLink, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { mirroredSetItem } from '@/lib/cloudMirror';
import { scheduleData, studyResources, StudyResource, practiceSets, questionBank } from '../data';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { recordCompletionToday } from '../lib/streak';
import {
  dayHasGenerator,
  dayHomeworkCount,
  dayPracticeCount,
} from '../lib/dayQuestions';
import { useBootcampProgress } from '@/hooks/useBootcampProgress';
import { launchDrill } from '@/lib/drillLaunch';

const TOTAL_TASK_KEYS = ['open', 'read', 'do', 'review', 'log'];

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

type Tab = 'start' | 'today' | 'schedule' | 'learn' | 'practice' | 'flashcards' | 'review' | 'profile';

export default function TodayView({
  userName,
  day,
  setDay,
  onOpenResource,
  onJumpToTab,
}: {
  userName: string;
  day: number;
  setDay: (d: number) => void;
  onOpenResource: (r: Partial<StudyResource>) => void;
  onJumpToTab?: (tab: Tab) => void;
}) {
  const data = scheduleData.find(d => d.day === day) || scheduleData[0];
  
  const [completedDays, setCompletedDays] = useState<number[]>(() => {
    const saved = localStorage.getItem('pf:completedDays');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyChecklists, setDailyChecklists] = useState<Record<number, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('pf:dailyChecklists');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    mirroredSetItem('pf:completedDays', JSON.stringify(completedDays));
  }, [completedDays]);

  useEffect(() => {
    mirroredSetItem('pf:dailyChecklists', JSON.stringify(dailyChecklists));
  }, [dailyChecklists]);

  // Sync progress to the assigned classroom_items row so Joshua sees it.
  useBootcampProgress({
    bootcampId: 'principle-flaw',
    completedDays,
    totalDays: 14,
  });

  const toggleDayComplete = () => {
    if (completedDays.includes(day)) {
      setCompletedDays(completedDays.filter(d => d !== day));
    } else {
      setCompletedDays([...completedDays, day]);
    }
  };

  const toggleChecklistItem = (item: string) => {
    setDailyChecklists(prev => {
      const dayTasks = prev[day] || {};
      const newState = !dayTasks[item];
      return {
        ...prev,
        [day]: {
          ...dayTasks,
          [item]: newState
        }
      };
    });
  };

  const navigate = useNavigate();
  const dayTasks = dailyChecklists[day] || {};
  const isComplete = completedDays.includes(day);

  const hasGenerator = dayHasGenerator(day);
  const hwCount = dayHomeworkCount(day);
  const pCount = dayPracticeCount(day);

  const launchDayDrill = (part: 'homework' | 'practice') => {
    navigate(`/drill?${launchDrill({ kind: 'bootcamp-day', day, part })}`);
  };

  const todaysQuestions = (() => {
    const refs: { id: string; pt: string; section: string; question: string; topic: string; setTitle: string }[] = [];
    for (const item of data.do || []) {
      const setId = RESOURCE_TO_SET[item];
      if (!setId) continue;
      const set = practiceSets.find((s) => s.id === setId);
      if (!set) continue;
      for (const qid of set.questions) {
        const q = questionBank.find((qb) => qb.id === qid);
        if (q) refs.push({ id: q.id, pt: q.pt, section: q.section, question: q.question, topic: q.topic, setTitle: set.title });
      }
    }
    return refs;
  })();
  const doneCount = TOTAL_TASK_KEYS.filter((k) => !!dayTasks[k]).length;
  const totalCount = TOTAL_TASK_KEYS.length;
  const progressPct = (doneCount / totalCount) * 100;
  const allDone = doneCount === totalCount;

  useEffect(() => {
    if (allDone) {
      recordCompletionToday();
      window.dispatchEvent(new Event('pf-streak-updated'));
    }
  }, [allDone]);

  const resolveResource = (idOrName: string) => {
    return studyResources.find(r => r.id === idOrName) || {
      id: idOrName,
      title: idOrName,
      description: "",
      includedInApp: false
    } as Partial<StudyResource>;
  };

  const GuidedStep = ({
    num,
    title,
    label,
    items,
    icon: Icon,
    color,
    taskKey,
    stepIndex,
  }: {
    num: string,
    title: string,
    label: string,
    items: string[],
    icon: LucideIcon,
    color: string,
    taskKey: string,
    stepIndex: number,
  }) => {
    const isDone = !!dayTasks[taskKey];
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1], delay: stepIndex * 0.065 }}
        className={`relative flex gap-6 p-6 rounded-3xl border transition-colors duration-200 ${
          isDone
            ? 'bg-zinc-900/10 border-zinc-900 opacity-60'
            : 'bg-zinc-900/30 border-white/[0.03] shadow-xl shadow-black/20'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-serif italic text-xl transition-colors duration-200 ${
            isDone ? 'bg-zinc-950 border-zinc-800 text-zinc-600' : `${color} border-current bg-current/10`
          }`}>
            {num}
          </div>
          {!isDone && <div className="w-0.5 flex-1 bg-gradient-to-b from-zinc-800 to-transparent rounded-full" />}
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isDone ? 'text-zinc-600' : 'text-zinc-400'}`}>{label}</span>
              <h4 className={`text-xl font-serif italic ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{title}</h4>
            </div>
            <motion.button
              onClick={() => toggleChecklistItem(taskKey)}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.14, ease: [0.25, 1, 0.5, 1] }}
              aria-label={isDone ? `Mark ${title} as not done` : `Mark ${title} as done`}
              aria-pressed={isDone}
              className={`p-2.5 rounded-xl border transition-colors ${
                isDone
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                  : 'bg-zinc-950/50 border-white/[0.05] text-zinc-700 hover:border-emerald-500/50 hover:text-emerald-500'
              }`}
            >
              <CheckCircle2 size={24} aria-hidden="true" />
            </motion.button>
          </div>

          {!isDone && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
              {items.map((item, i) => {
                const res = resolveResource(item);
                return (
                  <div key={i} className="group/item flex items-center justify-between p-4 rounded-2xl bg-zinc-950/50 border border-white/[0.02] hover:border-white/10 transition-colors duration-150">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center flex-shrink-0">
                        <Icon size={16} className={isDone ? 'text-zinc-600' : 'text-zinc-400'} />
                      </div>
                      <div>
                        <span className="text-sm text-zinc-200 font-light block">{res.title}</span>
                        {res.description && <span className="text-[10px] text-zinc-600 font-medium block mt-0.5">{res.description}</span>}
                      </div>
                    </div>
                    {res.includedInApp && (
                      <Button 
                        onClick={() => onOpenResource(res)}
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 rounded-lg bg-zinc-50/5 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-950 text-[10px] uppercase font-bold tracking-widest gap-2"
                      >
                        Open <ExternalLink size={10} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (day > 14) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-2xl mx-auto text-center">
        <div className="p-16 rounded-[40px] border border-dashed border-zinc-900 bg-zinc-900/5 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-3xl font-serif italic text-zinc-50">All 14 days complete.</h1>
          <p className="text-zinc-500 font-light text-sm">Reset from Profile to start a fresh cycle, or revisit any day from the Schedule.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-[350ms] pb-20 max-w-2xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col gap-5">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-500">
            <Sparkles size={13} className="animate-pulse" />
            <span className="font-bold text-[10.5px] uppercase tracking-[0.3em]">Day {day} &middot; {data.label}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif italic text-zinc-50 tracking-tight leading-tight">
            {data.focus}
          </h1>
          <p className="text-sm text-zinc-500 font-light leading-relaxed">
            {data.plainGoal}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-white/[0.05]">
            <Clock size={13} className="text-zinc-600" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{data.time}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/50 border border-white/[0.05]">
            <Target size={13} className="text-zinc-600" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{data.intensity}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-zinc-500">Today's progress</span>
          <span className="text-emerald-500">{doneCount}/{totalCount} steps</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 origin-left"
            style={{ width: '100%' }}
            initial={false}
            animate={{ scaleX: progressPct / 100 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          />
        </div>
      </div>

      {hasGenerator && (
        <div className="space-y-3">
          <span className="text-[10.5px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Today's Drill</span>
          <button
            onClick={() => launchDayDrill('homework')}
            className="group w-full flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-colors px-5 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <span className="flex items-center gap-3">
              <Play className="h-4 w-4 text-emerald-500" aria-hidden />
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold text-zinc-50">Start homework</span>
                <span className="text-[11px] text-zinc-500">{hwCount} questions, auto-picked for today</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
          </button>
          <button
            onClick={() => launchDayDrill('practice')}
            className="text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Or a longer practice set ({pCount} questions) →
          </button>
        </div>
      )}

      {/* Today's questions — surface PT/S/Q for the day's drill */}
      {todaysQuestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Today's Questions</span>
            <span className="text-[10px] text-zinc-500">Open your PT alongside the app.</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {todaysQuestions.map((q) => (
              <button
                key={q.id}
                onClick={() => onJumpToTab?.('practice')}
                className="text-left p-3 rounded-xl border border-white/[0.03] bg-zinc-900/30 hover:border-white/10 hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-200">PT {q.pt}, S {q.section}, Q {q.question}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${q.topic.includes('Principle') ? 'bg-blue-500/10 text-blue-500' : q.topic.includes('Parallel') ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>{q.topic}</span>
                </div>
                <span className="text-[10px] text-zinc-600 italic">{q.setTitle}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The Path */}
      <div className="space-y-8 relative">
        <div className="absolute left-[30px] top-10 bottom-10 w-px bg-zinc-900" />
        
        <GuidedStep
          num="1"
          label="Setup"
          title="Open This"
          items={data.open}
          icon={FileSearch}
          color="text-emerald-500"
          taskKey="open"
          stepIndex={0}
        />

        <GuidedStep
          num="2"
          label="Knowledge"
          title="Read This"
          items={data.read}
          icon={BookOpen}
          color="text-emerald-500"
          taskKey="read"
          stepIndex={1}
        />

        <GuidedStep
          num="3"
          label="Execution"
          title="Do This"
          items={data.do}
          icon={Target}
          color="text-emerald-500"
          taskKey="do"
          stepIndex={2}
        />

        <GuidedStep
          num="4"
          label="Mastery"
          title="Think About This"
          items={data.review}
          icon={AlertCircle}
          color="text-emerald-500"
          taskKey="review"
          stepIndex={3}
        />

        <motion.div
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1], delay: 4 * 0.065 }}
          className={`relative flex gap-6 p-6 rounded-3xl border transition-colors duration-200 ${
            dayTasks['log']
              ? 'bg-zinc-900/10 border-zinc-900 opacity-60'
              : 'bg-zinc-900/30 border-white/[0.03] shadow-xl shadow-black/20'
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border font-serif italic text-xl transition-colors duration-200 ${
              dayTasks['log'] ? 'bg-zinc-950 border-zinc-800 text-zinc-600' : 'text-emerald-500 border-current bg-current/10'
            }`}>
              5
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${dayTasks['log'] ? 'text-zinc-600' : 'text-zinc-400'}`}>Conclusion</span>
                <h4 className={`text-xl font-serif italic ${dayTasks['log'] ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>Write & Prep</h4>
              </div>
              <button
                onClick={() => toggleChecklistItem('log')}
                aria-label={dayTasks['log'] ? 'Mark Write & Prep as not done' : 'Mark Write & Prep as done'}
                aria-pressed={!!dayTasks['log']}
                className={`p-2.5 rounded-xl border transition-colors duration-150 active:scale-[0.92] ${
                  dayTasks['log']
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                    : 'bg-zinc-950/50 border-white/[0.05] text-zinc-700 hover:border-emerald-500/50 hover:text-emerald-500'
                }`}
              >
                <CheckCircle2 size={24} aria-hidden="true" />
              </button>
            </div>
            {!dayTasks['log'] && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-zinc-950/50 border border-white/[0.02] space-y-3">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Deliverable</span>
                    <p className="text-sm text-zinc-400 font-light italic leading-relaxed">
                      "{data.deliverable}"
                    </p>
                  </div>
                  {data.bring && data.bring.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-white/[0.02]">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Prep for Tutoring</span>
                      <ul className="space-y-1">
                        {data.bring.map((item, i) => (
                           <li key={i} className="text-sm text-zinc-300 font-light flex gap-2 items-start">
                             <span aria-hidden className="w-1.5 h-1.5 mt-2 rounded-full bg-zinc-500 shrink-0" />
                             <span>{item}</span>
                           </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button
                    onClick={() => onJumpToTab?.('review')}
                    className="w-full h-12 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-widest gap-2 mt-4"
                  >
                    Update Review Log <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Final Action */}
      <AnimatePresence>
        {(isComplete || Object.values(dayTasks).every(Boolean)) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.25, 1, 0.5, 1] }}
            className="pt-12 text-center space-y-6"
          >
            <div className="inline-flex flex-col items-center gap-2">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1], delay: 0.05 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-2"
              >
                <CheckCircle2 size={40} aria-hidden="true" />
              </motion.div>
              <h3 className="text-2xl font-serif italic text-zinc-50 uppercase tracking-tight">Day {day} Complete</h3>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto">{14 - day > 0 ? `${14 - day} day${14 - day === 1 ? '' : 's'} left.` : 'All 14 days done.'}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                variant="outline" 
                className="h-16 px-10 rounded-2xl border-white/[0.05] bg-zinc-950/50 text-xs font-bold uppercase tracking-widest text-zinc-400 flex-1 sm:max-w-xs"
                onClick={() => setDay(day > 1 ? day - 1 : 1)}
              >
                Previous Day
              </Button>
              <Button 
                className="h-16 px-10 rounded-2xl bg-zinc-100 text-zinc-950 text-xs font-bold uppercase tracking-widest flex-1 sm:max-w-xs group shadow-2xl shadow-white/5"
                onClick={() => setDay(day < 14 ? day + 1 : 14)}
              >
                Next Day: {scheduleData.find(d => d.day === day + 1)?.focus || "Finish"}
                <ArrowRight size={18} className="ml-3 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

