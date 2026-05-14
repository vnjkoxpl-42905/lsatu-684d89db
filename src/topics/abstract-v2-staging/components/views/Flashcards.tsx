import React, { useState } from 'react';
import { FLASHCARDS } from '../../data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCcw, Brain, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Flashcards: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = FLASHCARDS[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % FLASHCARDS.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + FLASHCARDS.length) % FLASHCARDS.length);
    }, 150);
  };

  return (
    <div id="flashcards-view" className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-16">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-brutal-ink p-1.5 border-2 border-brutal-ink rotate-[-5deg]">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-brutal-ink">Active Review</span>
          </div>
          <h2 className="text-6xl font-black tracking-tighter text-brutal-ink leading-none uppercase italic border-l-[12px] border-brutal-cyan pl-10">LSAT Key Concepts</h2>
          <p className="text-brutal-ink font-bold mt-4 uppercase tracking-tight opacity-70">Self-test on essential terminology and logical structures.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-4 border-brutal-ink brutal-shadow-sm self-start">
            <span className="text-sm font-black text-brutal-ink uppercase tracking-widest">
              Card <span className="bg-brutal-yellow px-2 border-2 border-brutal-ink mx-1">{currentIndex + 1}</span> of {FLASHCARDS.length}
            </span>
          </div>
          <div className="w-full h-8 bg-white border-4 border-brutal-ink brutal-shadow-sm overflow-hidden p-1">
            <div 
              className="h-full bg-brutal-ink transition-all duration-500" 
              style={{ width: `${((currentIndex + 1) / FLASHCARDS.length) * 100}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="relative perspective-1000 min-h-[450px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.05, rotate: 2 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-full h-full"
          >
            <div 
              id="flashcard-main"
              onClick={() => setIsFlipped(!isFlipped)}
              className={cn(
                "w-full h-[450px] cursor-pointer transition-all duration-500 preserve-3d relative",
                isFlipped ? "[transform:rotateY(180deg)]" : ""
              )}
            >
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-white border-8 border-brutal-ink brutal-shadow-lg p-16 flex flex-col items-center justify-center text-center group">
                <span className="absolute top-10 left-12 text-xs font-black uppercase tracking-[0.2em] text-white bg-brutal-ink px-4 py-1 rotate-[-2deg]">
                  {currentCard.category}
                </span>
                <p className="text-4xl font-black leading-tight text-brutal-ink max-w-2xl uppercase tracking-tighter italic border-b-4 border-brutal-cyan pb-6">
                  {currentCard.question}
                </p>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-xs font-black text-brutal-ink/40 uppercase tracking-[0.2em] flex items-center gap-3 bg-brutal-yellow/10 border-2 border-brutal-ink border-dashed px-6 py-2 group-hover:bg-brutal-yellow/20 transition-colors">
                  <RotateCcw className="w-5 h-5 text-brutal-ink" /> Click to reveal answer
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-brutal-cyan border-8 border-brutal-ink brutal-shadow-lg p-16 flex flex-col items-center justify-center text-center">
                <span className="absolute top-10 left-12 text-xs font-black uppercase tracking-[0.2em] text-white bg-brutal-ink px-4 py-1 rotate-[2deg]">
                  Definition / Answer
                </span>
                <div className="text-2xl font-black leading-tight text-brutal-ink max-w-2xl whitespace-pre-wrap uppercase tracking-tight italic bg-white p-10 border-4 border-brutal-ink brutal-shadow">
                  {currentCard.answer}
                </div>
                <div className="absolute bottom-10 flex flex-col items-center gap-2">
                  <div className="text-[10px] font-black text-brutal-ink uppercase tracking-[0.3em] opacity-40">Mastered this concept?</div>
                  <div className="h-1 w-20 bg-brutal-ink/20" />
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-10 mt-16">
        <button 
          id="prev-card-btn"
          onClick={handlePrev}
          className="w-20 h-20 bg-white border-4 border-brutal-ink brutal-shadow-sm flex items-center justify-center text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <ChevronLeft className="w-10 h-10" />
        </button>

        <button 
          id="mastered-btn"
          className="px-12 py-6 bg-brutal-green text-brutal-ink border-4 border-brutal-ink font-black text-xl uppercase tracking-widest brutal-shadow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_#000] transition-all flex items-center gap-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <CheckCircle2 className="w-8 h-8" />
          Mark as Mastered
        </button>

        <button 
          id="next-card-btn"
          onClick={handleNext}
          className="w-20 h-20 bg-white border-4 border-brutal-ink brutal-shadow-sm flex items-center justify-center text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-10 border-4 border-brutal-ink brutal-shadow-sm bg-white hover:bg-brutal-yellow transition-colors group">
          <h4 className="text-2xl font-black text-brutal-ink mb-4 uppercase tracking-tighter italic">Active Recall</h4>
          <p className="text-md text-brutal-ink/70 leading-tight font-bold uppercase tracking-tight">Don't just flip. Try to say the answer out loud before revealing it to strengthen neural pathways.</p>
        </div>
        <div className="p-10 border-4 border-brutal-ink brutal-shadow-sm bg-white hover:bg-brutal-cyan transition-colors group">
          <h4 className="text-2xl font-black text-brutal-ink mb-4 uppercase tracking-tighter italic">Category Focus</h4>
          <p className="text-md text-brutal-ink/70 leading-tight font-bold uppercase tracking-tight">Pay special attention to "Answer Phrasing" cards. They are the most common points of failure.</p>
        </div>
        <div className="p-10 border-4 border-brutal-ink brutal-shadow-sm bg-white hover:bg-brutal-pink transition-colors group">
          <h4 className="text-2xl font-black text-brutal-ink mb-4 uppercase tracking-tighter italic">Pattern Matching</h4>
          <p className="text-md text-brutal-ink/70 leading-tight font-bold uppercase tracking-tight">The LSAT uses a finite set of abstract descriptions. Master these cards to recognize them instantly.</p>
        </div>
      </div>
    </div>
  );
};
