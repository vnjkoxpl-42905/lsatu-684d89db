import { useState } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { type StructuredFlashcard } from '@/bootcamps/main-conclusion/data/structuredFlashcards';

interface FlashcardProps {
  card: StructuredFlashcard;
  className?: string;
}

export function Flashcard({ card, className }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className={cn("group h-[480px] w-full max-w-[600px] perspective-1200 cursor-pointer", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={cn(
        "relative h-full w-full transition-transform duration-700 preserve-3d",
        isFlipped ? "rotate-y-180" : ""
      )}>
        {/* Front */}
        <div className="absolute inset-0 backface-hidden rounded-[20px] bg-white p-10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-[rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center">
          <div className="font-mc-mono text-xs uppercase tracking-[0.2em] text-ink-faint mb-6">
            Concept Check
          </div>
          <h3 className="font-mc-serif text-3xl leading-snug text-ink">
            {card.front}
          </h3>
          <div className="absolute bottom-8 font-mc-mono text-sm text-ink-faint flex items-center gap-2">
            Click to flip
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
  );
}
