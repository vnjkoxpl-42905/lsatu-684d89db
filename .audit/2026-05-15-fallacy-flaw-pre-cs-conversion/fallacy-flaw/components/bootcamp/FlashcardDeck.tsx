

import { useState } from 'react';
import { getFlashcards } from '../../content/bootcamp/flashcards';
import type { DayId } from '../../lib/store';
import { cn } from '../../lib/utils';

/**
 * Flashcard deck · per-day. Click the card to flip front↔back. Prev/Next
 * navigates through the deck. Counter + shuffle in the header. Editorial
 * frame matches the bootcamp visual language (full-rule borders, mono-set
 * protocol labels, ink-on-paper).
 */
export function FlashcardDeck({ day }: { day: DayId }) {
  const initial = getFlashcards(day);
  const [cards, setCards] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) return null;

  const card = cards[idx];

  const advance = (delta: number) => {
    setFlipped(false);
    setIdx((i) => {
      const next = i + delta;
      if (next < 0) return cards.length - 1;
      if (next >= cards.length) return 0;
      return next;
    });
  };

  const shuffle = () => {
    const next = [...cards].sort(() => Math.random() - 0.5);
    setCards(next);
    setIdx(0);
    setFlipped(false);
  };

  const reset = () => {
    setCards(initial);
    setIdx(0);
    setFlipped(false);
  };

  return (
    <section
      aria-labelledby={`flashcards-day-${day}`}
      className="my-10 border border-rule bg-paper-bright/40"
    >
      <header className="flex items-center justify-between border-b border-rule px-5 py-3">
        <div>
          <div className="protocol text-ink-mute">Fallacy Flashcards</div>
          <h3
            id={`flashcards-day-${day}`}
            className="display-title text-xl text-ink"
          >
            Day {String(day).padStart(2, '0')} · {cards.length} cards
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="protocol text-ink-mute">
            {String(idx + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={shuffle}
            className="protocol border border-rule bg-paper px-2 py-1 text-xs text-ink-soft hover:bg-paper-bright"
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={reset}
            className="protocol border border-rule bg-paper px-2 py-1 text-xs text-ink-soft hover:bg-paper-bright"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="px-5 py-6">
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          className={cn(
            'group relative block w-full min-h-[12rem] border border-rule bg-paper px-6 py-8 text-left transition-colors',
            'hover:bg-paper-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-verdigris-deep',
          )}
        >
          <div className="protocol mb-3 text-ink-mute">
            {flipped ? 'Back · the answer' : 'Front · click to flip'}
          </div>
          <p
            className={cn(
              'text-lg leading-relaxed',
              flipped ? 'text-ink' : 'text-ink',
            )}
          >
            {flipped ? card.back : card.front}
          </p>
          {!flipped && (
            <span className="protocol absolute bottom-3 right-5 text-xs text-ink-mute group-hover:text-verdigris-deep">
              Reveal →
            </span>
          )}
        </button>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => advance(-1)}
            className="protocol border border-rule bg-paper px-3 py-1.5 text-xs text-ink-soft hover:bg-paper-bright"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className="protocol text-xs text-ink-mute underline-offset-4 hover:text-verdigris-deep hover:underline"
          >
            {flipped ? 'Hide answer' : 'Show answer'}
          </button>
          <button
            type="button"
            onClick={() => advance(1)}
            className="protocol border border-rule bg-paper px-3 py-1.5 text-xs text-ink-soft hover:bg-paper-bright"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}
