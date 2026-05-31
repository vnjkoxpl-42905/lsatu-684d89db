import { useState, useEffect } from 'react';
import { STRUCTURED_FLASHCARDS } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { Flashcard } from '@/bootcamps/main-conclusion/components/interactive-drills/Flashcard';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'mc_bootcamp_flashcard_mastery';

export function StructuredFlashcards() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [masteredIds, setMasteredIds] = useState<number[]>([]);
  const [isLoaded, setIsVisible] = useState(false);

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
    
    // Cycle to next card
    setCurrentIndex((prev) => (prev + 1) % STRUCTURED_FLASHCARDS.length);
  };

  const card = STRUCTURED_FLASHCARDS[currentIndex];
  const masteredCount = masteredIds.length;
  const totalCount = STRUCTURED_FLASHCARDS.length;
  const masteryPercent = Math.round((masteredCount / totalCount) * 100);

  if (!isLoaded) return null;

  return (
    <article className="min-h-screen bg-[oklch(0.98_0.005_60)] flex flex-col items-center pt-24 pb-20 px-6">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[500px] flex flex-col items-center text-center mb-16"
      >
        <div className="mb-8 inline-flex items-center px-4 py-1.5 rounded-full bg-[oklch(0.6_0.15_150/0.08)] text-[oklch(0.6_0.15_150)] text-[10px] font-bold uppercase tracking-[0.2em]">
          Training
        </div>
        
        <h1 className="font-mc-serif italic text-5xl text-[oklch(0.15_0.01_60)] tracking-tight mb-8">
          Indicator Word Deck
        </h1>

        <div className="w-full space-y-4">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-[#3B82F6] tracking-tighter">{masteryPercent}%</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)]">Mastered</span>
          </div>
          
          <div className="relative w-full h-2 bg-[oklch(0.2_0.01_60/0.06)] rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${masteryPercent}%` }}
              className="absolute inset-0 bg-[#3B82F6]"
            />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.4)]">
            {masteredCount} of {totalCount} cards mastered
          </p>
        </div>
      </motion.div>

      {/* Flashcard Component */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.02, y: -10 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-[500px]"
        >
          <Flashcard card={card} onAction={handleAction} />
        </motion.div>
      </AnimatePresence>

      <div className="mt-12 text-[10px] font-bold uppercase tracking-[0.2em] text-[oklch(0.2_0.01_60/0.3)]">
        Card {currentIndex + 1} of {totalCount}
      </div>
    </article>
  );
}
