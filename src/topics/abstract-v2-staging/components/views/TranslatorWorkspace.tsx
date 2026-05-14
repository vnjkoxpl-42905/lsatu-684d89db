import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TRANSLATION_EXERCISES = [
  {
    abstract: "It is used to illustrate the general principle that the argument presupposes.",
    target: "This statement is an example of a broad rule that the argument needs in order to work.",
    keywords: ["illustrate", "general principle", "presupposes"]
  },
  {
    abstract: "It describes a phenomenon for which the argument's conclusion is offered as an explanation.",
    target: "This statement gives the observed result, and the author's conclusion gives the proposed cause.",
    keywords: ["describes", "phenomenon", "conclusion", "explanation"]
  }
];

export default function TranslatorWorkspace() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const exercise = TRANSLATION_EXERCISES[currentIndex];
  
  const [translation, setTranslation] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex < TRANSLATION_EXERCISES.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setTranslation('');
      setIsSubmitted(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto py-12 z-10 relative px-6"
    >
      <header className="mb-16 border-l-[12px] border-brutal-yellow pl-10">
        <h1 className="text-7xl font-black tracking-tighter text-brutal-ink leading-none uppercase italic mb-4">Abstract Translator</h1>
        <p className="text-brutal-ink font-bold text-2xl uppercase tracking-tight opacity-70">Translate the abstract answer choice into plain English.</p>
      </header>

      <div className="space-y-12">
        <div className="bg-white border-4 border-brutal-ink brutal-shadow-lg p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-12 h-12 bg-brutal-ink flex items-center justify-center text-white font-black italic shadow-none">!</div>
          <h2 className="text-xs font-black text-brutal-ink uppercase tracking-[0.3em] mb-8 bg-brutal-cyan px-3 py-1 border-2 border-brutal-ink inline-block">The Abstract</h2>
          <p className="text-4xl font-black text-brutal-ink leading-tight uppercase tracking-tighter italic border-b-8 border-brutal-cyan pb-8">
            "{exercise.abstract}"
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {exercise.keywords.map(kw => (
              <span key={kw} className="px-4 py-2 bg-white text-brutal-ink border-2 border-brutal-ink font-black uppercase text-sm brutal-shadow-sm rotate-[1deg]">
                {kw}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border-4 border-brutal-ink brutal-shadow-lg p-10">
          <h2 className="text-xs font-black text-brutal-ink uppercase tracking-[0.3em] mb-8 bg-brutal-pink text-white px-3 py-1 border-2 border-brutal-ink inline-block">Your Plain English Translation</h2>
          <textarea
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            disabled={isSubmitted}
            placeholder="Type your translation here..."
            className="w-full h-48 px-8 py-6 bg-white border-4 border-brutal-ink text-2xl font-black text-brutal-ink uppercase tracking-tight placeholder:opacity-20 focus:outline-none brutal-shadow-sm transition-shadow disabled:opacity-50 italic leading-tight"
          />
          
          {!isSubmitted ? (
            <button
              disabled={translation.trim().length === 0}
              onClick={handleSubmit}
              className="mt-10 w-full bg-brutal-ink text-white font-black py-6 border-4 border-brutal-ink text-2xl uppercase tracking-widest hover:bg-brutal-ink/90 transition-all brutal-shadow disabled:opacity-30 disabled:cursor-not-allowed"
            >
              CHECK TRANSLATION
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 pt-12 border-t-4 border-brutal-ink relative"
            >
              <div className="flex flex-col md:flex-row items-start gap-10 mb-10">
                <div className="w-20 h-20 bg-brutal-yellow border-4 border-brutal-ink brutal-shadow flex items-center justify-center shrink-0 rotate-[-5deg]">
                  <Sparkles className="w-10 h-10 text-brutal-ink" />
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-black text-brutal-ink uppercase tracking-tighter italic mb-4 border-b-4 border-brutal-yellow pb-2 inline-block">Coach Feedback</h3>
                  <p className="text-xl font-bold text-brutal-ink leading-tight uppercase tracking-tight italic mb-10 opacity-80">
                    Good attempt. You caught the core parts but watch out for adding meaning not present in the original.
                  </p>
                  <div className="bg-brutal-cyan/20 border-4 border-brutal-ink p-10 brutal-shadow-sm relative">
                    <span className="absolute top-0 right-0 bg-brutal-ink text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest">Ideal Translation</span>
                    <p className="text-2xl font-black text-brutal-ink italic leading-tight uppercase tracking-tighter">"{exercise.target}"</p>
                  </div>
                </div>
              </div>
              <button
                onClick={handleNext}
                disabled={currentIndex === TRANSLATION_EXERCISES.length - 1}
                className="w-full bg-brutal-pink text-brutal-ink font-black py-6 border-4 border-brutal-ink text-2xl uppercase tracking-widest hover:bg-brutal-pink/90 transition-all brutal-shadow flex justify-center items-center gap-4 disabled:opacity-30"
              >
                {currentIndex === TRANSLATION_EXERCISES.length - 1 ? 'END OF EXERCISE' : 'NEXT TRANSLATION'} <ChevronRight className="w-8 h-8"/>
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
