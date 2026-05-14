import React from 'react';
import { useApp } from '../../store/AppContext';
import { BookOpen, Target, FileText, ArrowRight, BookMarked, Play, PenTool, Brain, Library } from 'lucide-react';
import { LESSONS } from '../../data/mockData';

import { motion, type Variants } from 'framer-motion';

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

export default function Dashboard() {
  const { bootcampState, setCurrentView } = useApp();

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12 z-10 relative pb-20"
    >
      <motion.header variants={item} className="space-y-4">
        <div className="inline-block bg-brutal-yellow px-4 py-1 border-2 border-brutal-ink brutal-shadow-sm rotate-[-1deg] mb-2">
          <span className="text-xs font-black uppercase tracking-widest">Training Module v1.0</span>
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-brutal-ink leading-[0.9] uppercase bg-brutal-bg">
          Abstract <br />
          Reasoning <span className="text-brutal-red italic">Bootcamp</span>
        </h1>
        <p className="text-lg font-bold text-brutal-ink max-w-2xl leading-tight border-l-4 border-brutal-ink pl-4 mt-6">
          DECODE ABSTRACT LSAT ANSWER CHOICES BY EXTRACTING KEYWORDS, TRANSLATING THEM INTO PLAIN ENGLISH, AND MATCHING EACH DESCRIPTION AGAINST THE ARGUMENT.
        </p>
      </motion.header>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-brutal-cyan p-6 border-4 border-brutal-ink brutal-shadow transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] duration-200 cursor-default">
          <div className="flex items-center gap-3 text-brutal-ink mb-4">
            <BookOpen className="w-6 h-6" />
            <h3 className="font-black text-sm tracking-widest uppercase">LESSONS</h3>
          </div>
          <p className="text-5xl font-black leading-none">{bootcampState.completedLessons.length}<span className="text-brutal-ink/30 text-2xl font-black">/{LESSONS.length}</span></p>
        </div>
        
        <div className="bg-brutal-pink p-6 border-4 border-brutal-ink brutal-shadow transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] duration-200 cursor-default">
          <div className="flex items-center gap-3 text-brutal-ink mb-4">
            <Target className="w-6 h-6" />
            <h3 className="font-black text-sm tracking-widest uppercase">DRILLS</h3>
          </div>
          <p className="text-5xl font-black leading-none">{bootcampState.completedDrills.length}</p>
        </div>

        <div className="bg-brutal-green p-6 border-4 border-brutal-ink brutal-shadow transition-transform hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] duration-200 cursor-default">
          <div className="flex items-center gap-3 text-brutal-ink mb-4">
            <BookMarked className="w-6 h-6" />
            <h3 className="font-black text-sm tracking-widest uppercase">CARDS</h3>
          </div>
          <p className="text-5xl font-black leading-none">{Object.values(bootcampState.cards as Record<string, import('../../types').CardReview>).filter(c => c.status !== 'unseen').length}</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="bg-white border-4 border-brutal-ink brutal-shadow-lg p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brutal-yellow border-l-4 border-b-4 border-brutal-ink translate-x-12 translate-y-[-12px] rotate-12 group-hover:rotate-6 transition-transform"></div>
        
        <div className="relative z-10 max-w-2xl space-y-6">
          <h2 className="text-4xl font-black text-brutal-ink leading-none uppercase italic">Continue your training</h2>
          <p className="text-brutal-ink text-lg font-bold leading-tight">
            {bootcampState.completedLessons.length === 0 
              ? "Start with the fundamentals. Learn why abstract answer choices break down even the best test-takers."
              : "Keep building the S + K method. Translate abstract language into concrete claims."}
          </p>
          <button 
            onClick={() => setCurrentView('lesson')}
            className="px-8 py-4 bg-brutal-ink text-white border-4 border-brutal-ink font-black text-lg inline-flex items-center gap-3 brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase tracking-tighter"
          >
            <Play className="w-6 h-6 fill-white" />
            {bootcampState.completedLessons.length === 0 ? 'START BOOTCAMP' : 'CONTINUE TRAINING'}
          </button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <button 
          onClick={() => setCurrentView('extraction_workspace')}
          className="group text-left bg-white p-8 border-4 border-brutal-ink brutal-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] transition-all flex flex-col items-start gap-6"
        >
          <div className="w-16 h-16 bg-brutal-yellow border-4 border-brutal-ink flex items-center justify-center group-hover:rotate-6 transition-transform brutal-shadow-sm">
            <PenTool className="w-8 h-8 text-brutal-ink" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl text-brutal-ink uppercase tracking-tighter">Extraction Workspace</h3>
            <p className="text-brutal-ink font-bold text-sm leading-snug">Practice taking abstract answer choices apart and matching them to the stimulus.</p>
            <div className="pt-4 flex items-center text-xs font-black text-brutal-ink uppercase tracking-widest bg-brutal-cyan px-3 py-1 border-2 border-brutal-ink group-hover:bg-brutal-green transition-colors">
              Enter Workspace <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </button>

        <button 
          onClick={() => setCurrentView('flashcards')}
          className="group text-left bg-white p-8 border-4 border-brutal-ink brutal-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] transition-all flex flex-col items-start gap-6"
        >
          <div className="w-16 h-16 bg-brutal-pink border-4 border-brutal-ink flex items-center justify-center group-hover:rotate-6 transition-transform brutal-shadow-sm">
            <Brain className="w-8 h-8 text-brutal-ink" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl text-brutal-ink uppercase tracking-tighter">Review Flashcards</h3>
            <p className="text-brutal-ink font-bold text-sm leading-snug">Active recall on key terms, question stems, and logical distinctions.</p>
            <div className="pt-4 flex items-center text-xs font-black text-brutal-ink uppercase tracking-widest bg-brutal-cyan px-3 py-1 border-2 border-brutal-ink group-hover:bg-brutal-green transition-colors">
              Start Session <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </button>

        <button 
          onClick={() => setCurrentView('methods_library')}
          className="group text-left bg-white p-8 border-4 border-brutal-ink brutal-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] transition-all flex flex-col items-start gap-6"
        >
          <div className="w-16 h-16 bg-brutal-green border-4 border-brutal-ink flex items-center justify-center group-hover:rotate-6 transition-transform brutal-shadow-sm">
            <Library className="w-8 h-8 text-brutal-ink" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl text-brutal-ink uppercase tracking-tighter">Methods Library</h3>
            <p className="text-brutal-ink font-bold text-sm leading-snug">Reference center for S+K patterns, term definitions, and trap answer types.</p>
            <div className="pt-4 flex items-center text-xs font-black text-brutal-ink uppercase tracking-widest bg-brutal-cyan px-3 py-1 border-2 border-brutal-ink group-hover:bg-brutal-green transition-colors">
              Browse Library <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </button>

        <button 
          onClick={() => setCurrentView('drill')}
          className="group text-left bg-white p-8 border-4 border-brutal-ink brutal-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] transition-all flex flex-col items-start gap-6"
        >
          <div className="w-16 h-16 bg-brutal-red border-4 border-brutal-ink flex items-center justify-center group-hover:rotate-6 transition-transform brutal-shadow-sm text-white">
            <Target className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl text-brutal-ink uppercase tracking-tighter">Targeted Drills</h3>
            <p className="text-brutal-ink font-bold text-sm leading-snug">Focus on specific failure points like one-word traps and structural mismatches.</p>
            <div className="pt-4 flex items-center text-xs font-black text-brutal-ink uppercase tracking-widest bg-brutal-cyan px-3 py-1 border-2 border-brutal-ink group-hover:bg-brutal-green transition-colors">
              View Drills <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </button>
      </motion.div>
    </motion.div>
  );
}
