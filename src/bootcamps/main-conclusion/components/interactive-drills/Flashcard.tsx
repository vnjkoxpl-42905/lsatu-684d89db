import { useState } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { type StructuredFlashcard } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { motion } from 'framer-motion';

interface FlashcardProps {
  card: StructuredFlashcard;
  onAction?: (action: 'review' | 'got-it') => void;
  className?: string;
}

export function Flashcard({ card, onAction, className }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAction = (action: 'review' | 'got-it') => {
    setIsFlipped(false);
    onAction?.(action);
  };

  return (
    <div className={cn("flex flex-col items-center gap-12", className)}>
      <div 
        className="group h-[420px] w-full max-w-[500px] perspective-1200 cursor-pointer"
        onClick={handleFlip}
      >
        <div className={cn(
          "relative h-full w-full transition-transform duration-700 preserve-3d",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-[32px] bg-white p-12 shadow-[0_32px_80px_-20px_oklch(0.2_0.01_60/0.08)] border border-[oklch(0.2_0.01_60/0.04)] flex flex-col items-center justify-center text-center transition-all duration-500 group-hover:shadow-[0_48px_96px_-24px_oklch(0.2_0.01_60/0.12)]">
            <div className="text-[#3B82F6] text-[10px] font-bold uppercase tracking-[0.2em] mb-12">
              Concept Check
            </div>
            <h3 className="font-mc-serif text-[32px] leading-tight text-[oklch(0.15_0.01_60)] font-medium">
              {card.front}
            </h3>
            <div className="absolute bottom-10 font-mc-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.3)] flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><path d="M12 20V4M5 11l7-7 7 7"/></svg>
              Tap to reveal
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[32px] bg-white p-12 shadow-[0_32px_80px_-20px_oklch(0.2_0.01_60/0.08)] border border-[oklch(0.2_0.01_60/0.04)] flex flex-col text-left overflow-y-auto">
            <div className="inline-flex self-start bg-[oklch(0.6_0.15_150/0.08)] text-[oklch(0.6_0.15_150)] text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-10">
              {card.role}
            </div>
            
            <p className="font-mc-serif text-[20px] leading-relaxed text-[oklch(0.15_0.01_60)] mb-8 whitespace-pre-wrap">
              {card.function}
            </p>

            {card.example !== 'N/A' && (
              <div className="bg-[oklch(0.2_0.01_60/0.03)] px-6 py-5 rounded-[18px] mb-8 border border-[oklch(0.2_0.01_60/0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)] mb-3">Example</p>
                <p className="font-mc-serif italic text-[17px] leading-relaxed text-[oklch(0.2_0.01_60/0.8)]">
                  {card.example}
                </p>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-[oklch(0.2_0.01_60/0.06)] flex gap-3 text-[13px] text-[oklch(0.2_0.01_60/0.5)] font-mc-sans leading-relaxed italic">
              <span className="opacity-40">💡</span>
              <p>{card.note}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls - Only visible after flip */}
      <div className={cn(
        "flex gap-6 transition-all duration-500",
        isFlipped ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none"
      )}>
        <button 
          onClick={() => handleAction('review')}
          className="rounded-full border border-[oklch(0.2_0.01_60/0.1)] bg-white px-10 py-3.5 text-[12px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60)] transition-all duration-300 ease-eased hover:bg-[oklch(0.98_0.005_60)] hover:border-[oklch(0.2_0.01_60/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
        >
          Review Again
        </button>
        <button 
          onClick={() => handleAction('got-it')}
          className="rounded-full bg-[oklch(0.15_0.01_60)] px-12 py-3.5 text-[12px] font-bold uppercase tracking-[0.2em] text-[oklch(0.96_0.01_60)] transition-all duration-300 ease-eased hover:bg-[oklch(0.1_0.01_60)] shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
