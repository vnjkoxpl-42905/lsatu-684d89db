import { useState } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { type StructuredFlashcard } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

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
    <div className={cn("flex flex-col items-center gap-8", className)}>
      <div 
        className="group h-[500px] w-full max-w-[500px] perspective-1200 cursor-pointer"
        onClick={handleFlip}
      >
        <div className={cn(
          "relative h-full w-full transition-transform duration-700 preserve-3d",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-[20px] bg-white p-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(0,0,0,0.04)] flex flex-col items-center justify-center text-center">
            <div className="font-mc-sans text-xs font-semibold uppercase tracking-[0.1em] text-mc-accent mb-6">
              Concept Check
            </div>
            <h3 className="font-mc-serif text-[28px] leading-[1.3] text-ink font-medium">
              {card.front}
            </h3>
            <div className="absolute bottom-8 font-mc-sans text-sm text-ink-faint flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-50"><path d="M17 11l-5-5-5 5M12 18V6"/></svg>
              Tap to reveal
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[20px] bg-white p-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-[rgba(0,0,0,0.04)] flex flex-col text-left overflow-y-auto">
            <div className="inline-block self-start bg-mc-accent/10 text-mc-accent text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-full mb-6">
              {card.role.replace(/_/g, ' ')}
            </div>
            <p className="font-mc-serif text-[18px] leading-relaxed text-ink mb-6">
              {card.function}
            </p>
            {card.example !== 'N/A' && (
              <div className="bg-[rgba(0,0,0,0.03)] px-5 py-4 rounded-[12px] mb-6 italic text-ink-soft border border-[rgba(0,0,0,0.05)]">
                {card.example}
              </div>
            )}
            <div className="flex gap-3 text-[14px] text-ink-faint font-mc-sans leading-relaxed">
              <span className="opacity-50 mt-0.5">💡</span>
              <p>{card.note}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls - Only visible after flip */}
      <div className={cn(
        "flex gap-4 transition-all duration-300",
        isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <Button variant="subtle" className="px-8 py-2.5 rounded-full" onClick={() => handleAction('review')}>
          Review Again
        </Button>
        <Button variant="primary" className="px-10 py-2.5 rounded-full" onClick={() => handleAction('got-it')}>
          Got It
        </Button>
      </div>
    </div>
  );
}
