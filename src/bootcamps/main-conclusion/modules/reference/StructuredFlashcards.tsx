import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STRUCTURED_FLASHCARDS } from '@/bootcamps/main-conclusion/data/structuredFlashcards';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Flashcard } from '@/bootcamps/main-conclusion/components/interactive-drills/Flashcard';

export function StructuredFlashcards() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const moveSelection = (direction: -1 | 1) => {
    setCurrentIndex((prev) => (prev + direction + STRUCTURED_FLASHCARDS.length) % STRUCTURED_FLASHCARDS.length);
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

      <Flashcard card={card} />

      <div className="mt-12 flex items-center gap-4">
        <Button
          variant="subtle"
          size="lg"
          leftIcon={<ChevronLeft className="h-5 w-5" />}
          onClick={() => moveSelection(-1)}
        >
          Previous
        </Button>
        <Button
          variant="subtle"
          size="lg"
          rightIcon={<ChevronRight className="h-5 w-5" />}
          onClick={() => moveSelection(1)}
        >
          Next
        </Button>
      </div>
    </article>
  );
}
