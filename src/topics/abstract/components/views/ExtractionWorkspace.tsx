import React, { useState } from 'react';
import { MATCHING_ITEMS } from '../../data/mockData';
import { cn } from '../../lib/utils';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../../store/AppContext';

export default function ExtractionWorkspace() {
  const { setCurrentView } = useApp();
  const [currentItemIdx, setCurrentItemIdx] = useState(0);
  const [selections, setSelections] = useState<Record<number, 'match' | 'no-match' | 'unsure'>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoveredPartIdx, setHoveredPartIdx] = useState<number | null>(null);

  const currentItem = MATCHING_ITEMS[currentItemIdx];

  const handleSelection = (partIdx: number, value: 'match' | 'no-match' | 'unsure') => {
    if (isSubmitted) return;
    setSelections((prev) => ({ ...prev, [partIdx]: value }));
  };

  const renderStimulus = () => {
    if (!currentItem) return null;
    const text = currentItem.stimulus;
    if (hoveredPartIdx === null || !currentItem.parts[hoveredPartIdx]?.highlightText) {
      return text;
    }

    const highlight = currentItem.parts[hoveredPartIdx].highlightText!;
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));

    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={i} className="bg-brutal-yellow text-brutal-ink border-2 border-brutal-ink px-1 mx-0.5 font-black uppercase rotate-[-1deg] inline-block transition-transform duration-200">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentItemIdx < MATCHING_ITEMS.length - 1) {
      setCurrentItemIdx(currentItemIdx + 1);
      setSelections({});
      setIsSubmitted(false);
    } else {
      setCurrentView('dashboard');
    }
  };

  if (!currentItem) {
    return (
      <div className="p-8 text-center text-white/50">
        No matching exercises found.
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col lg:row-span-2 lg:flex-row gap-8 h-full max-w-[1440px] mx-auto w-full pb-8"
    >
      {/* Panel 1: Stimulus */}
      <div className="flex-1 bg-white border-4 border-brutal-ink brutal-shadow-lg p-10 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-2 mb-10">
          <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 1</span>
          <h3 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter italic leading-none">Read Stimulus</h3>
          <p className="text-brutal-ink opacity-70">Slow down. What actually happened?</p>
        </div>
        <p className="whitespace-pre-wrap text-2xl leading-tight text-brutal-ink font-bold uppercase tracking-tighter">{renderStimulus()}</p>
      </div>

      {/* Panel 2: Answer Choice Extraction */}
      <div className="flex-1 bg-white border-4 border-brutal-ink brutal-shadow-lg p-10 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-2 mb-10">
          <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 2</span>
          <h3 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter italic leading-none">Extract Keywords</h3>
          <p className="text-brutal-ink opacity-70">Break the choice into its controlling parts.</p>
        </div>
        
        <div className="bg-brutal-pink/20 border-4 border-brutal-ink p-10 brutal-shadow relative overflow-hidden group mb-12">
          <div className="absolute top-0 right-0 w-8 h-8 bg-brutal-ink flex items-center justify-center text-white font-black italic">?</div>
          <p className="text-2xl leading-tight text-brutal-ink font-black uppercase tracking-tighter italic">
            "{currentItem.answerChoice}"
          </p>
        </div>
        
        <div className="space-y-6 flex-1">
          <h4 className="text-[12px] font-black text-brutal-ink uppercase tracking-widest bg-white border-2 border-brutal-ink px-3 py-1 brutal-shadow-sm inline-block">Meaningful Parts</h4>
          <div className="flex flex-wrap gap-4">
            {currentItem.parts.map((p, i) => (
              <div 
                key={i} 
                onMouseEnter={() => setHoveredPartIdx(i)}
                onMouseLeave={() => setHoveredPartIdx(null)}
                className={cn(
                  "px-6 py-3 border-4 font-black transition-all duration-200 cursor-default uppercase tracking-tight text-lg",
                  hoveredPartIdx === i 
                    ? "bg-brutal-ink text-white border-brutal-ink translate-x-[2px] translate-y-[2px] shadow-none scale-[1.02]" 
                    : "bg-white border-brutal-ink text-brutal-ink brutal-shadow-sm opacity-90 hover:opacity-100"
                )}>
                {p.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel 3: Matching Test */}
      <div className="flex-1 bg-white border-4 border-brutal-ink brutal-shadow-lg p-10 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-2 mb-10">
          <span className="text-xs font-black text-brutal-ink opacity-30 uppercase tracking-[0.2em]">STEP 3</span>
          <h3 className="text-brutal-ink font-black text-4xl uppercase tracking-tighter italic leading-none">Test The Match</h3>
          <p className="text-brutal-ink opacity-70">Prove every part or kill the answer.</p>
        </div>
        
        <div className="flex-1 space-y-8 pr-2 custom-scrollbar">
          {currentItem.parts.map((part, i) => {
            const sel = selections[i];
            
            let containerClass = "bg-white border-brutal-ink";
            let headerClass = "text-brutal-ink";
            let icon = null;

            if (isSubmitted) {
                const isCorrect = (sel === 'match' && part.matches) || (sel === 'no-match' && !part.matches);
                if (sel === 'unsure') {
                    containerClass = "bg-brutal-yellow/10 border-brutal-yellow";
                    headerClass = "text-brutal-ink font-black";
                    icon = <HelpCircle className="w-8 h-8 text-brutal-yellow shrink-0 fill-brutal-ink" />;
                } else if (isCorrect) {
                    containerClass = "bg-brutal-green/10 border-brutal-green";
                    headerClass = "text-brutal-ink font-black";
                    icon = <CheckCircle2 className="w-8 h-8 text-brutal-green shrink-0 fill-brutal-ink" />;
                } else {
                    containerClass = "bg-brutal-red/10 border-brutal-red";
                    headerClass = "text-brutal-ink font-black";
                    icon = <XCircle className="w-8 h-8 text-brutal-red shrink-0 fill-white" />;
                }
            }
            
            return (
              <div 
                key={i} 
                onMouseEnter={() => setHoveredPartIdx(i)}
                onMouseLeave={() => setHoveredPartIdx(null)}
                className={cn(
                  "p-8 border-4 flex flex-col gap-6 transition-all duration-200 brutal-shadow-sm", 
                  containerClass,
                  hoveredPartIdx === i && "brutal-shadow"
                )}>
                 <div className="flex items-start gap-4">
                   {icon}
                   <span className={cn("text-xl font-black leading-none uppercase tracking-tighter italic flex-1", headerClass)}>
                     "{part.text}"
                   </span>
                 </div>
                 
                 <div className="flex flex-wrap gap-2 pt-2">
                   {['match', 'no-match', 'unsure'].map((opt) => (
                     <button 
                       key={opt}
                       onClick={() => handleSelection(i, opt as any)}
                       disabled={isSubmitted}
                       className={cn(
                         "px-4 py-2 border-2 font-black tracking-tight uppercase transition-all duration-100 text-xs", 
                         sel === opt 
                          ? "bg-brutal-ink text-white border-brutal-ink translate-x-[1px] translate-y-[1px] shadow-none" 
                          : "bg-white text-brutal-ink border-brutal-ink hover:bg-brutal-cyan/10 disabled:opacity-50 brutal-shadow-sm"
                       )}>
                       {opt.replace('-', ' ')}
                     </button>
                   ))}
                 </div>
                 
                 {isSubmitted && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       className="pt-6 border-t-2 border-brutal-ink mt-2"
                     >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black text-brutal-ink uppercase tracking-widest bg-white border border-brutal-ink px-2">Actual Match</span>
                            <span className={cn("text-xs font-black uppercase px-2", part.matches ? "bg-brutal-green" : "bg-brutal-red text-white")}>
                                {part.matches ? "MATCHES" : "DOES NOT MATCH"}
                            </span>
                          </div>
                          <p className="text-[15px] font-bold text-brutal-ink leading-tight">
                            {part.explanation}
                          </p>
                     </motion.div>
                 )}
              </div>
            )
          })}
        </div>
        
        <div className="mt-10 pt-10 border-t-4 border-brutal-ink shrink-0">
          {!isSubmitted ? (
            <button 
              onClick={handleSubmit}
              disabled={Object.keys(selections).length !== currentItem.parts.length}
              className="w-full py-6 bg-brutal-ink text-white border-4 border-brutal-ink font-black text-xl tracking-widest hover:bg-brutal-ink/90 transition-all uppercase brutal-shadow disabled:opacity-30 disabled:cursor-not-allowed">
              Submit Matches
            </button>
          ) : (
            <button 
              onClick={handleNext}
              className="w-full py-6 bg-brutal-pink text-brutal-ink border-4 border-brutal-ink font-black text-xl tracking-widest hover:bg-brutal-pink/90 transition-all uppercase brutal-shadow">
              {currentItemIdx < MATCHING_ITEMS.length - 1 ? 'Next Exercise' : 'Finish Workspace'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

