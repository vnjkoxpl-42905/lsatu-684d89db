import { useState, type KeyboardEvent } from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { type StructuredFlashcard } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { useReducedMotion } from 'framer-motion';

interface FlashcardProps {
  card: StructuredFlashcard;
  onAction?: (action: 'review' | 'got-it') => void;
  className?: string;
}

export function Flashcard({ card, onAction, className }: FlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const numberedFunction = card.function.match(/^\d+\)/m)
    ? card.function.split(/\n+/).map((line) => line.replace(/^\d+\)\s*/, '').trim()).filter(Boolean)
    : null;
  const roleLabel = card.role === 'Conclusion Indicator' ? 'Conclusion Indicator' : card.role;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleFlipKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleFlip();
    }
  };

  const handleAction = (action: 'review' | 'got-it') => {
    setIsFlipped(false);
    onAction?.(action);
  };

  return (
    <div className={cn("flex flex-col items-center gap-8 sm:gap-10", className)}>
      <div 
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={isFlipped ? 'Hide flashcard answer' : 'Reveal flashcard answer'}
        className="group h-[min(410px,calc(100vh-292px))] min-h-[330px] w-full max-w-[500px] perspective-1200 cursor-pointer rounded-[24px] outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.48_0.14_255/0.35)] focus-visible:ring-offset-4 focus-visible:ring-offset-[oklch(0.98_0.005_60)]"
        onClick={handleFlip}
        onKeyDown={handleFlipKeyDown}
      >
        <div className={cn(
          "relative h-full w-full preserve-3d",
          shouldReduceMotion ? "transition-none" : "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front */}
          <div className="absolute inset-0 backface-hidden rounded-[24px] border border-[oklch(0.2_0.01_60/0.055)] bg-[oklch(0.995_0.004_60)] px-8 py-12 text-center shadow-[0_30px_76px_-30px_oklch(0.2_0.01_60/0.22)] transition-[box-shadow,transform,border-color] duration-300 ease-eased flex flex-col items-center justify-center group-hover:-translate-y-1 group-hover:border-[oklch(0.48_0.14_255/0.16)] group-hover:shadow-[0_44px_104px_-38px_oklch(0.2_0.01_60/0.28)] sm:px-12">
            <h3 className="max-w-[13em] text-balance font-mc-serif text-[clamp(1.62rem,3.8vw,2.22rem)] font-medium leading-[1.15] tracking-[-0.008em] text-[oklch(0.15_0.01_60)]">
              {card.front}
            </h3>
            <div className="absolute bottom-8 flex items-center gap-2 font-mc-sans text-[0.66rem] font-bold uppercase tracking-[0.15em] text-[oklch(0.2_0.01_60/0.38)]">
              <RotateCw className="h-3.5 w-3.5 opacity-55" aria-hidden="true" strokeWidth={2.4} />
              Flip card
            </div>
          </div>

          {/* Back */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-[24px] border border-[oklch(0.2_0.01_60/0.055)] bg-[oklch(0.995_0.004_60)] px-7 py-8 shadow-[0_30px_76px_-30px_oklch(0.2_0.01_60/0.22)] flex flex-col overflow-y-auto text-left sm:px-10 sm:py-9">
            <div className="mb-5 self-start rounded-full bg-[oklch(0.48_0.14_255/0.08)] px-3 py-1 font-mc-sans text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[oklch(0.38_0.12_255)]">
              {roleLabel}
            </div>
            {numberedFunction ? (
              <ol className="mb-6 space-y-4 font-mc-serif text-[clamp(1.02rem,2vw,1.18rem)] leading-[1.5] text-[oklch(0.15_0.01_60)]">
                {numberedFunction.map((item, index) => (
                  <li key={item} className="grid grid-cols-[2rem_1fr] gap-2">
                    <span className="font-mc-sans text-[0.72rem] font-bold tabular-nums text-[oklch(0.48_0.14_255)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mb-6 max-w-[32ch] whitespace-pre-wrap font-mc-serif text-[clamp(1.04rem,2vw,1.24rem)] leading-[1.58] text-[oklch(0.15_0.01_60)]">
                {card.function}
              </p>
            )}

            {card.example !== 'N/A' && (
              <div className="mb-6 rounded-[16px] border border-[oklch(0.2_0.01_60/0.045)] bg-[oklch(0.2_0.01_60/0.028)] px-5 py-4 sm:px-6">
                <p className="mb-2.5 text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[oklch(0.2_0.01_60/0.46)]">Example</p>
                <p className="font-mc-serif text-[clamp(0.98rem,1.9vw,1.08rem)] italic leading-[1.56] text-[oklch(0.2_0.01_60/0.82)]">
                  {card.example}
                </p>
              </div>
            )}

            <div className="mt-auto border-t border-[oklch(0.2_0.01_60/0.06)] pt-4 font-mc-sans text-[0.82rem] italic leading-[1.55] text-[oklch(0.2_0.01_60/0.58)]">
              <p>{card.note}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls - Only visible after flip */}
      <div className={cn(
        "flex flex-wrap justify-center gap-3 sm:gap-5 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        shouldReduceMotion && "transition-none",
        isFlipped ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95 pointer-events-none"
      )}>
        <button 
          onClick={() => handleAction('review')}
          className="min-h-11 rounded-full border border-[oklch(0.2_0.01_60/0.1)] bg-[oklch(0.995_0.004_60)] px-8 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[oklch(0.2_0.01_60/0.75)] transition-[background,border-color,box-shadow,transform] duration-220 ease-eased hover:-translate-y-0.5 hover:bg-[oklch(0.98_0.005_60)] hover:border-[oklch(0.2_0.01_60/0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2 active:translate-y-0"
        >
          Review Again
        </button>
        <button 
          onClick={() => handleAction('got-it')}
          className="min-h-11 rounded-full bg-[oklch(0.15_0.01_60)] px-10 py-3 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-[oklch(0.96_0.01_60)] shadow-[0_16px_34px_-20px_oklch(0.15_0.01_60/0.8)] transition-[background,box-shadow,transform] duration-220 ease-eased hover:-translate-y-0.5 hover:bg-[oklch(0.1_0.01_60)] hover:shadow-[0_22px_42px_-22px_oklch(0.15_0.01_60/0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.2_0.01_60/0.2)] focus-visible:ring-offset-2 active:translate-y-0"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
