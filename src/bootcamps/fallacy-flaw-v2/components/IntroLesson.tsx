import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VIDEO_ASSETS } from '../data/videoAssets';
import { VideoCard } from './VideoCard';

type RevealStep = 0 | 1 | 2 | 3 | 4 | 5;

export function IntroLesson({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState<RevealStep>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleNext = () => {
    if (step < 5) {
      setStep((prev) => (prev + 1) as RevealStep);
    } else {
      onFinish();
    }
  };

  useEffect(() => {
    if (containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [step]);

  const methodSteps = [
    { title: "1. Find the conclusion", subtitle: "Isolate the author’s main point.", isActive: step === 0, isCompleted: step >= 1 },
    { title: "2. Find the support", subtitle: "Identify the evidence or \"curious facts\".", isActive: step === 1, isCompleted: step >= 2 },
    { title: "3. Find the gap", subtitle: "Why does the support not guarantee the conclusion?", isActive: step === 2, isCompleted: step >= 3 },
    { title: "4. Ask the counter-question", subtitle: "Challenge the argument conversationally.", isActive: step === 3, isCompleted: step >= 4 },
    { title: "5. Match the answer choice", subtitle: "Translate LSAT-speak back to your counter-question.", isActive: step === 4, isCompleted: step === 5 }
  ];

  return (
    <div className="flex-1 flex justify-center items-start h-full overflow-y-auto custom-scrollbar pt-2 pb-12" ref={containerRef}>
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-10 lg:gap-16 px-4">
        
        {/* Left Side: Method Rail */}
        <div className="w-full md:w-[40%] flex flex-col shrink-0 md:sticky md:top-10 h-fit">
          <h2 className="text-4xl font-serif tracking-tighter mb-2">The Repeatable Flaw Routine</h2>
          <p className="text-sm font-medium uppercase tracking-[0.1em] text-[#1a1a1a]/50 mb-6 font-mono">
            Spot the Gap. Name the Foul.
          </p>
          
          <div className="bg-[#1a1a1a] text-[#f5f2ed] p-6 text-sm mb-8 shadow-xl relative">
            <div className="absolute top-0 right-0 p-2 opacity-10 text-3xl font-serif italic">!</div>
            <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] mb-2 text-white/50">The Opposing Counsel Mindset</h3>
            <p className="font-serif italic leading-relaxed">
              "View every stimulus as a courtroom exchange. You are the defense against a sucking argument. Your job is to shout 'Objection, Your Honor!' the moment a logical foul is committed."
            </p>
          </div>

          <p className="text-[15px] font-light text-[#1a1a1a]/80 mb-8 leading-relaxed">
            Logical Reasoning isn't about "feeling" like an argument is weak. It's about knowing exactly why it's broken. Use this routine to strip every argument down to its logical skeleton.
          </p>

          <div className="space-y-6 mb-12">
            {methodSteps.map((s, idx) => (
              <div 
                key={idx} 
                className={`flex gap-4 transition-all duration-300 ${s.isActive ? 'opacity-100' : s.isCompleted ? 'opacity-60' : 'opacity-80'}`}
              >
                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${s.isCompleted ? 'bg-green-600 text-white' : s.isActive ? 'bg-[#1a1a1a] text-white' : 'border border-[#1a1a1a]/30 text-[#1a1a1a]/60'}`}>
                  {s.isCompleted ? '✓' : idx + 1}
                </div>
                <div>
                  <h4 className={`text-sm font-bold tracking-wider ${s.isActive ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]/70'}`}>
                    {s.title}
                  </h4>
                  <p className={`text-xs mt-1 ${s.isActive ? 'text-[#1a1a1a]/80 font-medium' : 'text-[#1a1a1a]/60'}`}>
                    {s.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Active Workspace */}
        <div className="w-full md:w-[60%] flex flex-col bg-white border border-[#1a1a1a]/10 shadow-sm p-8 lg:p-10">
          <div className="border-b border-[#1a1a1a]/10 pb-6 mb-6">
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/40 block mb-4">Argument Breakdown</span>
            <p className="font-serif text-[1.25rem] leading-relaxed text-[#1a1a1a]">
              "Every time I wear my lucky socks, my team wins. So my lucky socks must be causing the team to win."
            </p>
          </div>

          <div className="space-y-6 flex-1">
            <AnimatePresence initial={false}>
              {step >= 1 && (
                <motion.div
                  key="conclusion"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-4 bg-[#f9f8f6] border border-[#1a1a1a]/5 p-5 rounded-sm shadow-sm relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-700 block mb-2">Conclusion</span>
                  <p className="font-semibold text-[#1a1a1a] text-[16px]">The lucky socks cause the team to win.</p>
                </motion.div>
              )}

              {step >= 2 && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-4 bg-[#f9f8f6] border border-[#1a1a1a]/5 p-5 rounded-sm shadow-sm relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-blue-700 block mb-2">Support</span>
                  <p className="font-medium text-[#1a1a1a]/90 text-[16px]">The team wins whenever the socks are worn.</p>
                </motion.div>
              )}

              {step >= 3 && (
                <motion.div
                  key="gap"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-4 bg-[#1a1a1a] text-white p-5 rounded-sm shadow-sm relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-300 block mb-2">The Gap</span>
                  <p className="font-medium text-white/90 text-[16px]">The author assumes that because two things happen together, one caused the other.</p>
                </motion.div>
              )}

              {step >= 4 && (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-4 bg-red-50 border border-red-100 p-5 rounded-sm shadow-sm relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-700 block mb-2">Counter-question</span>
                  <p className="font-serif italic text-red-900 text-[18px]">What if the team was already likely to win for another reason?</p>
                </motion.div>
              )}

              {step >= 5 && (
                <motion.div
                  key="flaw"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  className="mb-6 overflow-hidden mt-8"
                >
                  <div className="inline-block bg-[#1a1a1a] text-white px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold mb-3 rounded-sm">
                    Flaw Move
                  </div>
                  <p className="font-serif italic text-3xl text-[#1a1a1a] mb-4">Causal Flaw</p>
                  <p className="text-[15px] text-[#1a1a1a]/80 leading-relaxed bg-[#f5f2ed] border border-[#1a1a1a]/10 p-5 rounded-sm">
                    The author treats a repeated pattern as proof of causation without ruling out other explanations.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 pt-6 shrink-0 border-t border-[#1a1a1a]/10">
             {step === 0 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f9f8f6] border border-[#1a1a1a]/10 p-5 rounded-sm">
                  <p className="text-sm font-semibold text-[#1a1a1a]">Start here: What is the author trying to prove?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a]/90 transition-colors shadow-sm">
                    Reveal conclusion
                  </button>
                </div>
             )}
             {step === 1 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f9f8f6] border border-[#1a1a1a]/10 p-5 rounded-sm">
                  <p className="text-sm font-semibold text-[#1a1a1a]">What evidence does the author give?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a]/90 transition-colors shadow-sm">
                    Reveal support
                  </button>
                </div>
             )}
             {step === 2 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f9f8f6] border border-[#1a1a1a]/10 p-5 rounded-sm">
                  <p className="text-sm font-semibold text-[#1a1a1a]">Why is that evidence not enough?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a]/90 transition-colors shadow-sm">
                    Reveal gap
                  </button>
                </div>
             )}
             {step === 3 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f9f8f6] border border-[#1a1a1a]/10 p-5 rounded-sm">
                  <p className="text-sm font-semibold text-[#1a1a1a]">What counter-question exposes the flaw?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a]/90 transition-colors shadow-sm">
                    Reveal counter-question
                  </button>
                </div>
             )}
             {step === 4 && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f9f8f6] border border-[#1a1a1a]/10 p-5 rounded-sm">
                  <p className="text-sm font-semibold text-[#1a1a1a]">What flaw move does this show?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a]/90 transition-colors shadow-sm">
                    Reveal flaw
                  </button>
                </div>
             )}
             {step === 5 && (
                <div className="flex flex-col items-center gap-3">
                  <button onClick={handleNext} className="w-full md:w-auto px-8 py-4 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-[#1a1a1a]/90 transition-colors shadow-sm">
                    Explore Famous Flaws →
                  </button>
                </div>
             )}
          </div>

        </div>

      </div>
    </div>
  );
}


