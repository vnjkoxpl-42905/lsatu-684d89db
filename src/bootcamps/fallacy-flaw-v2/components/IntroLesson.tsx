import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [step]);

  const methodSteps = [
    { title: "1. Find the conclusion", subtitle: "What is the author trying to prove?", isActive: step === 0, isCompleted: step >= 1 },
    { title: "2. Find the support", subtitle: "What evidence is supposed to prove it?", isActive: step === 1, isCompleted: step >= 2 },
    { title: "3. Find the gap", subtitle: "Why is that evidence not enough?", isActive: step === 2 || step === 3, isCompleted: step >= 4 },
    { title: "4. Match the answer", subtitle: "Which answer choice describes that exact mistake?", isActive: step === 4, isCompleted: step === 5 }
  ];

  return (
    <div className="flex-1 flex justify-center items-start h-full overflow-y-auto custom-scrollbar pt-2 pb-12">
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-10 lg:gap-16">
        
        {/* Left Side: Method Rail */}
        <div className="w-full md:w-[40%] flex flex-col shrink-0">
          <h2 className="text-4xl font-serif tracking-tighter mb-2">The Core Method</h2>
          <p className="text-sm font-medium uppercase tracking-[0.1em] text-[#1a1a1a]/50 mb-6">
            Before you can name the flaw, you have to see the jump.
          </p>
          <p className="text-[15px] font-light text-[#1a1a1a]/80 mb-6 leading-relaxed">
            Every flaw question starts the same way: separate the conclusion from the support, then ask where the support stops short.
          </p>
          <div className="bg-[#1a1a1a] text-[#f5f2ed] p-5 text-sm font-serif italic mb-6 shadow-sm">
            "A flaw is the gap between what the evidence proves and what the author concludes."
          </div>
          <p className="text-[13px] font-medium text-[#1a1a1a]/70 mb-6 uppercase tracking-wider">
            Use the steps below to break down the argument on the right.
          </p>

          <div className="space-y-6">
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
        <div className="w-full md:w-[60%] flex flex-col bg-white border border-[#1a1a1a]/10 shadow-sm p-8 lg:p-10" ref={containerRef}>
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
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pb-6 border-b border-[#1a1a1a]/10 overflow-hidden"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 block mb-2">Conclusion</span>
                  <p className="font-medium text-[#1a1a1a] text-[15px]">The lucky socks cause the team to win.</p>
                </motion.div>
              )}

              {step >= 2 && (
                <motion.div
                  key="support"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pb-6 border-b border-[#1a1a1a]/10 overflow-hidden"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 block mb-2">Support</span>
                  <p className="text-[#1a1a1a]/80 text-[15px]">The team wins whenever the socks are worn.</p>
                </motion.div>
              )}

              {step >= 3 && (
                <motion.div
                  key="gap"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pb-6 border-b border-[#1a1a1a]/10 overflow-hidden"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 block mb-2">Gap</span>
                  <p className="text-[#1a1a1a]/80 text-[15px]">The author assumes that because two things happen together, one caused the other.</p>
                </motion.div>
              )}

              {step >= 4 && (
                <motion.div
                  key="counter"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pb-6 border-b border-[#1a1a1a]/10 overflow-hidden"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 block mb-2">Counter-question</span>
                  <p className="font-serif italic text-[#1a1a1a]/90 text-[16px]">What if the team was already likely to win for another reason?</p>
                </motion.div>
              )}

              {step >= 5 && (
                <motion.div
                  key="flaw"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="pb-6 overflow-hidden"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/50 block mb-2">Flaw Move</span>
                  <p className="font-serif italic text-2xl text-[#1a1a1a] mb-3">Causal Flaw</p>
                  <p className="text-[14px] text-[#1a1a1a]/80 leading-relaxed bg-[#f5f2ed] p-4 border-l-2 border-[#1a1a1a]">
                    The author treats a repeated pattern as proof of causation without ruling out other explanations.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 pt-6 bg-white shrink-0 sticky bottom-0">
             {step === 0 && (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-[#1a1a1a]">Start here: What is the author trying to prove?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-6 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors">
                    Reveal conclusion
                  </button>
                </div>
             )}
             {step === 1 && (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-[#1a1a1a]">What evidence does the author give?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-6 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors">
                    Reveal support
                  </button>
                </div>
             )}
             {step === 2 && (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-[#1a1a1a]">Why is that evidence not enough?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-6 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors">
                    Reveal gap
                  </button>
                </div>
             )}
             {step === 3 && (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-[#1a1a1a]">What counter-question exposes the flaw?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-6 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors">
                    Reveal counter-question
                  </button>
                </div>
             )}
             {step === 4 && (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-[#1a1a1a]">What flaw move does this show?</p>
                  <button onClick={handleNext} className="w-full md:w-auto px-6 py-3 bg-[#1a1a1a] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/90 transition-colors">
                    Reveal flaw
                  </button>
                </div>
             )}
             {step === 5 && (
                <div className="flex flex-col items-start gap-3">
                  <button onClick={handleNext} className="w-full md:w-auto px-6 py-3 border border-[#1a1a1a] text-[#1a1a1a] text-[11px] font-bold uppercase tracking-widest hover:bg-[#1a1a1a]/5 transition-colors">
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


