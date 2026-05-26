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
        className="group h-[480px] w-full max-w-[600px] perspective-1200 cursor-pointer"
        onClick={handleFlip}
      >
        <div className={cn(
          "relative h-full w-full transition-transform duration-700 preserve-3d",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-[20px] bg-white p-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-[rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center">
            <div className="font-mc-mono text-xs uppercase tracking-[0.2em] text-mc-accent mb-6">
              Concept Check
            </div>
            <h3 className="font-mc-serif text-3xl leading-snug text-ink">
              {card.front}
            </h3>
            <div className="absolute bottom-8 font-mc-mono text-sm text-ink-faint flex items-center gap-2">
              Tap to reveal
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[20px] bg-white p-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-[rgba(0,0,0,0.03)] flex flex-col text-left overflow-y-auto">
            <div className="font-mc-mono text-xs uppercase tracking-[0.2em] text-mc-accent mb-4">
              {card.role}
            </div>
            <p className="font-mc-serif text-lg leading-relaxed text-ink mb-6">
              {card.function}
            </p>
            {card.example !== 'N/A' && (
              <div className="bg-[rgba(0,0,0,0.03)] p-4 rounded-[12px] mb-6 italic text-ink-soft border-l-4 border-l-ink-faint">
                {card.example}
              </div>
            )}
            <p className="text-sm text-ink-faint font-mc-sans leading-relaxed italic">
              {card.note}
            </p>
          </div>
        </div>
      </div>

      {/* Controls - Only visible after flip */}
      <div className={cn(
        "flex gap-4 transition-all duration-300",
        isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <Button variant="subtle" onClick={() => handleAction('review')}>
          Review Again
        </Button>
        <Button variant="primary" onClick={() => handleAction('got-it')}>
          Got It
        </Button>
      </div>
    </div>
  );
}
