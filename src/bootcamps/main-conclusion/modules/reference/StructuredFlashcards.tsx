import { useState, useEffect } from 'react';
import { STRUCTURED_FLASHCARDS } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { Flashcard } from '@/bootcamps/main-conclusion/components/interactive-drills/Flashcard';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const STORAGE_KEY = 'mc_bootcamp_flashcard_mastery';

export function StructuredFlashcards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredIds, setMasteredIds] = useState<number[]>([]);
  const [isLoaded, setIsVisible] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMasteredIds(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse flashcard mastery', e);
      }
    }
    setIsVisible(true);
  }, []);

  const saveMastery = (newMastered: number[]) => {
    setMasteredIds(newMastered);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newMastered));
  };

  const handleAction = (action: 'review' | 'got-it') => {
    if (action === 'got-it') {
      if (!masteredIds.includes(currentIndex)) {
        saveMastery([...masteredIds, currentIndex]);
      }
    }
    
    setCurrentIndex((prev) => (prev + 1) % STRUCTURED_FLASHCARDS.length);
  };

  const card = STRUCTURED_FLASHCARDS[currentIndex];
  const masteredCount = masteredIds.length;
  const totalCount = STRUCTURED_FLASHCARDS.length;
  const masteryPercent = Math.round((masteredCount / totalCount) * 100);

  if (!isLoaded) return null;

  return (
    <article className="min-h-screen bg-[oklch(0.98_0.005_60)] flex flex-col items-center pt-14 pb-16 px-5 sm:pt-20 sm:pb-20 sm:px-6">
      {/* Header Section */}
      <motion.div 
        initial={shouldReduceMotion ? false : { opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[620px] flex flex-col items-center text-center mb-10 sm:mb-12"
      >
        <div className="mb-5 inline-flex items-center rounded-full bg-[oklch(0.6_0.15_150/0.08)] px-4 py-1.5 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[oklch(0.46_0.12_150)]">
          Training
        </div>
        
        <h1 className="max-w-[13ch] text-balance font-mc-serif text-[clamp(2.3rem,5vw,3.55rem)] font-semibold italic leading-[1.04] tracking-[-0.018em] text-[oklch(0.15_0.01_60)] sm:max-w-none">
          Indicator Word Deck
        </h1>

        <div className="mt-7 w-full max-w-[520px] space-y-3" aria-label={`${masteryPercent}% mastered`}>
          <div className="flex items-baseline justify-center gap-2.5">
            <span className="font-mc-sans text-[clamp(1.85rem,4vw,2.45rem)] font-semibold tracking-[-0.025em] text-[oklch(0.48_0.14_255)] tabular-nums">{masteryPercent}%</span>
            <span className="font-mc-sans text-[0.66rem] font-bold uppercase tracking-[0.15em] text-[oklch(0.2_0.01_60/0.44)]">Mastered</span>
          </div>
          
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[oklch(0.2_0.01_60/0.065)]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${masteryPercent}%` }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-y-0 left-0 rounded-full bg-[oklch(0.48_0.14_255)]"
            />
          </div>
        </div>
      </motion.div>

      {/* Flashcard Component */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 1.015, y: -8 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[500px]"
        >
          <Flashcard card={card} onAction={handleAction} />
        </motion.div>
      </AnimatePresence>

      <div className="mt-9 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[oklch(0.2_0.01_60/0.32)] tabular-nums">
        Card {currentIndex + 1} of {totalCount}
      </div>
    </article>
  );
}
