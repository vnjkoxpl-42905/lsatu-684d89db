import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { DRILLS } from '../../data/mockData';
import { ConfidenceLevel, DrillType } from '../../types';
import { cn } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DrillRunner() {
  const { markDrillComplete } = useApp();
  
  const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
  const currentDrill = DRILLS[currentDrillIndex];

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCorrect = selectedOption === currentDrill.correctOptionIndex;

  const handleSubmit = () => {
    setIsSubmitted(true);
    markDrillComplete(currentDrill.id, currentDrill.type, isCorrect);
  };

  const handleNext = () => {
    if (currentDrillIndex < DRILLS.length - 1) {
      setCurrentDrillIndex(prev => prev + 1);
      setSelectedOption(null);
      setConfidence(null);
      setIsSubmitted(false);
    }
  };

  if (!currentDrill) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-4xl mx-auto py-12 z-10 relative px-6"
    >
      <header className="mb-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <h1 className="text-5xl font-black tracking-tighter text-brutal-ink leading-none uppercase italic border-b-4 border-brutal-pink pb-2 inline-block">Targeted Drills</h1>
          <span className="text-sm font-black px-4 py-2 bg-brutal-cyan text-brutal-ink border-4 border-brutal-ink brutal-shadow-sm uppercase tracking-widest rotate-[2deg]">
            {currentDrill.type.replace('_', ' ')}
          </span>
        </div>
        <p className="text-brutal-ink font-black text-xl uppercase tracking-tight opacity-40">Drill {currentDrillIndex + 1} of {DRILLS.length}</p>
      </header>

      <div className="bg-white border-4 border-brutal-ink brutal-shadow-lg mb-12 overflow-hidden">
        <div className="p-10 bg-brutal-cyan/10 border-b-4 border-brutal-ink">
          <p className="text-2xl font-black text-brutal-ink leading-tight uppercase tracking-tight italic">
            {currentDrill.stimulus}
          </p>
        </div>
        
        <div className="p-10">
          <p className="text-3xl font-black text-brutal-ink mb-10 uppercase leading-none tracking-tighter italic border-l-[8px] border-brutal-ink pl-8 underline decoration-brutal-cyan decoration-4 underline-offset-8">{currentDrill.question}</p>
          
          <div className="space-y-6">
            {currentDrill.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              let btnClass = "border-brutal-ink bg-white text-brutal-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000]";
              
              if (isSelected && !isSubmitted) {
                btnClass = "bg-brutal-ink text-white border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none";
              } else if (isSubmitted) {
                if (idx === currentDrill.correctOptionIndex) {
                  btnClass = "bg-brutal-green border-brutal-ink brutal-shadow-sm text-brutal-ink scale-[1.01] z-10";
                } else if (isSelected) {
                  btnClass = "bg-brutal-red text-white border-brutal-ink brutal-shadow-sm";
                } else {
                  btnClass = "border-brutal-ink opacity-30 bg-white/50 grayscale";
                }
              }

              return (
                <div key={idx} className="space-y-4">
                  <button
                    disabled={isSubmitted}
                    onClick={() => setSelectedOption(idx)}
                    className={cn(
                      "w-full text-left p-8 border-4 transition-all duration-100 relative group flex items-start gap-6",
                      btnClass
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 flex items-center justify-center border-4 font-black text-xl shrink-0 transition-colors shadow-none",
                      isSelected && !isSubmitted ? "bg-white text-brutal-ink border-white" : "bg-brutal-ink text-white border-brutal-ink"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="block font-black text-xl leading-none uppercase tracking-tight italic py-2">{option.text}</span>
                  </button>
                  {isSubmitted && (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "text-lg pl-10 font-bold uppercase tracking-tight italic leading-tight border-l-4 py-2",
                        idx === currentDrill.correctOptionIndex ? "text-brutal-green border-brutal-green" : "text-brutal-ink/40 border-brutal-ink/20"
                      )}
                    >
                      {option.explanation}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!isSubmitted ? (
        <div className="bg-white border-4 border-brutal-ink p-10 brutal-shadow-lg mb-16">
          <p className="text-xs font-black text-brutal-ink uppercase tracking-[0.3em] mb-8 bg-brutal-yellow px-3 py-1 border-2 border-brutal-ink inline-block">How confident are you?</p>
          <div className="flex flex-wrap gap-4 mb-10">
            {(['Guessing', 'Unsure', 'Pretty sure', 'Confident'] as ConfidenceLevel[]).map(level => (
              <button
                key={level}
                onClick={() => setConfidence(level)}
                className={cn(level === 'Guessing' ? 'rotate-[-1deg]' : level === 'Unsure' ? 'rotate-[1deg]' : level === 'Pretty sure' ? 'rotate-[-2deg]' : 'rotate-[2deg]',
                  "flex-1 py-4 text-xs font-black border-4 transition-all uppercase tracking-widest",
                  confidence === level
                    ? "bg-brutal-ink border-brutal-ink text-white brutal-shadow-sm scale-105"
                    : "bg-white border-brutal-ink text-brutal-ink hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000]"
                )}
              >
                {level}
              </button>
            ))}
          </div>
          <button
            disabled={selectedOption === null || !confidence}
            onClick={handleSubmit}
            className="w-full bg-brutal-ink text-white font-black py-6 border-4 border-brutal-ink text-2xl uppercase tracking-widest hover:bg-brutal-ink/90 transition-all brutal-shadow disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SUBMIT ANSWER
          </button>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-4 border-brutal-ink p-10 brutal-shadow-lg mb-16 relative"
        >
          <div className="mb-10">
            <h3 className={cn(
              "text-5xl font-black mb-6 uppercase tracking-tighter italic border-b-8 pb-4 inline-block",
              isCorrect ? "text-brutal-green border-brutal-green" : "text-brutal-red border-brutal-red"
            )}>
              {isCorrect ? 'Correct Mismatch' : 'Incorrect Match'}
            </h3>
            <p className="text-2xl font-black text-brutal-ink leading-tight uppercase tracking-tighter italic mb-8">{currentDrill.explanation}</p>
            {!isCorrect && currentDrill.trapTag && (
              <div className="mt-8 inline-flex items-center px-6 py-3 bg-brutal-red text-white border-4 border-brutal-ink font-black uppercase tracking-widest rotate-[-1deg] brutal-shadow-sm">
                TRAP FALLEN FOR: {currentDrill.trapTag.replace('_', ' ')}
              </div>
            )}
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentDrillIndex === DRILLS.length - 1}
            className="w-full bg-brutal-pink text-brutal-ink font-black py-6 border-4 border-brutal-ink text-2xl uppercase tracking-widest hover:bg-brutal-pink/90 transition-all brutal-shadow flex justify-center items-center gap-4 disabled:opacity-30"
          >
            {currentDrillIndex === DRILLS.length - 1 ? 'END OF DRILLS' : 'NEXT DRILL'} <ChevronRight className="w-8 h-8"/>
          </button>
        </motion.div>
      )}

    </motion.div>
  );
}
