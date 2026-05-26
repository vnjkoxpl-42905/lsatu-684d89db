import { useState } from 'react';
import { STRUCTURED_FLASHCARDS } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { Flashcard } from '@/bootcamps/main-conclusion/components/interactive-drills/Flashcard';

export function StructuredFlashcards() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleAction = (action: 'review' | 'got-it') => {
    // In a real app, track 'got-it' progress; here we just cycle
    setCurrentIndex((prev) => (prev + 1) % STRUCTURED_FLASHCARDS.length);
  };

  const card = STRUCTURED_FLASHCARDS[currentIndex];

  return (
    <article className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12">
      <div className="mb-12 text-center">
        <h1 className="font-mc-serif text-4xl text-ink">Indicator Word Deck</h1>
        <p className="mt-2 font-mc-mono text-sm uppercase tracking-widest text-ink-faint">
          {currentIndex + 1} of {STRUCTURED_FLASHCARDS.length} Cards
        </p>
      </div>

      <Flashcard card={card} onAction={handleAction} />
    </article>
  );
}
