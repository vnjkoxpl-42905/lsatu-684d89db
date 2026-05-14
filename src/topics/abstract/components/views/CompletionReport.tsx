import React from 'react';
import { useApp } from '../../store/AppContext';
import { LESSONS } from '../../data/mockData';
import { CheckCircle2, ChevronRight, Target, Brain, ArrowRight } from 'lucide-react';

export default function CompletionReport() {
  const { bootcampState, setCurrentView } = useApp();

  const lessonsCompleted = bootcampState.completedLessons.length;
  const drillsCompleted = bootcampState.completedDrills.length;
  const cardsReviewed = Object.values(bootcampState.cards as Record<string, import('../../types').CardReview>).filter(c => c.status !== 'unseen').length;
  
  const totalCorrect = Object.values(bootcampState.drillsStats).reduce((acc, curr: any) => acc + (curr?.correct || 0), 0);
  const totalAttempted = Object.values(bootcampState.drillsStats).reduce((acc, curr: any) => acc + (curr?.total || 0), 0);
  const accuracy = (totalAttempted as number) > 0 ? Math.round(((totalCorrect as number) / (totalAttempted as number)) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto py-16 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out z-10 relative">
      <div className="text-center mb-24">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-brutal-green border-4 border-brutal-ink brutal-shadow-lg mb-10 rotate-[-5deg]">
          <CheckCircle2 className="w-12 h-12 text-brutal-ink" />
        </div>
        <h1 className="text-7xl font-black tracking-tighter text-brutal-ink mb-6 uppercase italic leading-none">BOOTCAMP STATUS REPORT</h1>
        <p className="text-2xl text-brutal-ink font-bold max-w-2xl mx-auto leading-tight uppercase tracking-tight italic opacity-80 border-l-[12px] border-brutal-green pl-10">
          You are building the S + K method. Here is a snapshot of your progress and the exact skills you need to focus on next.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
        <div className="bg-white p-10 border-4 border-brutal-ink brutal-shadow-lg text-center flex flex-col justify-center gap-2">
          <p className="text-6xl font-black text-brutal-ink uppercase tracking-tighter">
            {lessonsCompleted}<span className="text-brutal-ink/30">/{LESSONS.length}</span>
          </p>
          <p className="text-xs font-black text-brutal-ink uppercase tracking-[0.3em] opacity-40">Lessons Completed</p>
        </div>
        <div className="bg-brutal-yellow p-10 border-4 border-brutal-ink brutal-shadow-lg text-center flex flex-col justify-center gap-2">
          <p className="text-6xl font-black text-brutal-ink uppercase tracking-tighter">{accuracy}%</p>
          <p className="text-xs font-black text-brutal-ink uppercase tracking-[0.3em] opacity-40">Drill Accuracy</p>
        </div>
        <div className="bg-white p-10 border-4 border-brutal-ink brutal-shadow-lg text-center flex flex-col justify-center gap-2">
          <p className="text-6xl font-black text-brutal-ink uppercase tracking-tighter">{cardsReviewed}</p>
          <p className="text-xs font-black text-brutal-ink uppercase tracking-[0.3em] opacity-40">Cards Reviewed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white border-4 border-brutal-ink brutal-shadow-lg p-12 w-full">
          <h2 className="text-3xl font-black text-brutal-ink mb-10 flex items-center gap-4 uppercase italic">
            <Target className="w-8 h-8 text-brutal-ink fill-brutal-cyan" /> Diagnosis
          </h2>
          <div className="space-y-10">
            <div>
              <h3 className="text-xs font-black text-brutal-ink uppercase tracking-widest mb-4 inline-block bg-brutal-green px-3 py-1 border-2 border-brutal-ink">Strongest Area</h3>
              <p className="text-xl font-bold text-brutal-ink leading-tight uppercase tracking-tight italic border-l-8 border-brutal-green pl-6">
                Keyword Extraction. You consistently identify the nouns and verbs correctly.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-black text-brutal-ink uppercase tracking-widest mb-4 inline-block bg-brutal-red text-white px-3 py-1 border-2 border-brutal-ink">Weakest Area</h3>
              <p className="text-xl font-bold text-brutal-ink leading-tight uppercase tracking-tight italic border-l-8 border-brutal-red pl-6">
                One-Word Traps. You frequently fall for "Scope Creep" when the verb is slightly too strong.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brutal-pink/20 border-4 border-brutal-ink brutal-shadow-lg p-12 w-full flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-black text-brutal-ink mb-10 flex items-center gap-4 uppercase italic">
              <Brain className="w-8 h-8 text-brutal-ink fill-brutal-yellow" /> Recommended Action
            </h2>
            <p className="text-2xl font-black text-brutal-ink leading-tight uppercase tracking-tighter italic border-b-8 border-white pb-10">
              Slow down your matching process. You are extracting the keywords correctly, but selecting answers that sound "about right" instead of strictly checking the structural verbs.
            </p>
          </div>
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="w-full bg-brutal-ink text-white font-black py-6 border-4 border-brutal-ink hover:bg-brutal-ink/90 transition-all flex items-center justify-center gap-4 brutal-shadow uppercase tracking-widest text-lg mt-10"
          >
            TARGET ONE-WORD TRAPS <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
