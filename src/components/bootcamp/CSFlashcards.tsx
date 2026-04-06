import React, { useState, useMemo, useEffect } from 'react';
import { FLASHCARD_DECKS } from '@/data/causationStation/constants';
import { Flashcard } from '@/types/causationStation';

const ArrowIcon: React.FC<{ direction: 'left' | 'right'; className?: string }> = ({ direction, className }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {direction === 'left' ? (
      <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const REVIEW_DECK_STORAGE_KEY = 'causationCoachReviewDeck';

const CSFlashcards: React.FC = () => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>(FLASHCARD_DECKS[0]?.id || '');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [isReviewMode, setIsReviewMode] = useState(false);

  useEffect(() => {
    try {
      const savedReviewCardsRaw = localStorage.getItem(REVIEW_DECK_STORAGE_KEY);
      if (savedReviewCardsRaw) {
        const savedCards = JSON.parse(savedReviewCardsRaw) as Flashcard[];
        setReviewCards(savedCards);
      }
    } catch (error) {
      console.error('Failed to parse review deck from localStorage:', error);
      localStorage.removeItem(REVIEW_DECK_STORAGE_KEY);
    }
  }, []);

  const updateReviewDeck = (newReviewCards: Flashcard[]) => {
    setReviewCards(newReviewCards);
    localStorage.setItem(REVIEW_DECK_STORAGE_KEY, JSON.stringify(newReviewCards));
  };

  const fullDeck = useMemo(() => FLASHCARD_DECKS.find(d => d.id === selectedDeckId), [selectedDeckId]);

  const activeDeck = useMemo(() => {
    if (isReviewMode) {
      return {
        id: 'review-deck',
        name: 'Review Deck',
        cards: reviewCards,
      };
    }
    return fullDeck;
  }, [isReviewMode, reviewCards, fullDeck]);

  const handleFlip = () => {
    if (isAnimating) return;
    setIsFlipped(prev => !prev);
  };

  const changeCard = (direction: 'next' | 'prev') => {
    if (!activeDeck || isAnimating || activeDeck.cards.length === 0) return;
    setIsAnimating(true);

    setTimeout(() => {
      setIsFlipped(false);
      if (direction === 'next') {
        setCurrentCardIndex(prev => (prev + 1) % activeDeck.cards.length);
      } else {
        setCurrentCardIndex(prev => (prev - 1 + activeDeck.cards.length) % activeDeck.cards.length);
      }
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  };

  const handleAddToReview = (card: Flashcard) => {
    if (!reviewCards.some(rc => rc.term === card.term)) {
      updateReviewDeck([...reviewCards, card]);
    }
    changeCard('next');
  };

  const handleGotIt = (card: Flashcard) => {
    const newReviewCards = reviewCards.filter(rc => rc.term !== card.term);
    updateReviewDeck(newReviewCards);

    if (isReviewMode && newReviewCards.length === 0) {
      setIsReviewMode(false);
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } else {
      changeCard('next');
    }
  };

  const toggleReviewMode = () => {
    setIsReviewMode(prev => !prev);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const currentCard = activeDeck?.cards[currentCardIndex];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div className="flex-grow">
          <h2 className="text-xl font-bold text-foreground mb-2">Flashcards</h2>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Drill the core concepts. The definitions here are tailored for the LSAT, focusing on the specific way these terms are used in logical reasoning.
          </p>
        </div>
        <button
          onClick={toggleReviewMode}
          disabled={reviewCards.length === 0 && !isReviewMode}
          className="flex-shrink-0 self-start sm:self-center inline-flex items-center rounded-lg border border-border text-foreground text-sm font-medium px-4 py-2 hover:bg-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isReviewMode ? 'Back to Full Deck' : `Review Cards (${reviewCards.length})`}
        </button>
      </div>

      {!activeDeck || activeDeck.cards.length === 0 ? (
        <div className="rounded-xl bg-card border border-border shadow-sm p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {isReviewMode
              ? 'Your review deck is empty. Mark some cards for review from the full deck.'
              : 'No flashcard deck found.'}
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto">
          <style>{`
            .cs-flashcard-container { perspective: 1000px; }
            .cs-flashcard {
              transform-style: preserve-3d;
              transition: transform 0.5s;
            }
            .cs-flashcard.is-flipped {
              transform: rotateY(180deg);
            }
            .cs-flashcard-face {
              backface-visibility: hidden;
              -webkit-backface-visibility: hidden;
            }
            .cs-flashcard-back {
              transform: rotateY(180deg);
            }
          `}</style>

          <div
            className={`cs-flashcard-container w-full h-80 ${!isFlipped ? 'cursor-pointer' : ''} ${isAnimating ? 'opacity-0 transition-opacity duration-200' : 'opacity-100'}`}
            onClick={!isFlipped ? handleFlip : undefined}
            role="button"
            aria-label={isFlipped ? 'Card definition' : 'Card term, click to flip'}
            tabIndex={!isFlipped ? 0 : -1}
            onKeyDown={(e) => { if (!isFlipped && (e.key === 'Enter' || e.key === ' ')) handleFlip(); }}
          >
            <div className={`relative w-full h-full cs-flashcard ${isFlipped ? 'is-flipped' : ''}`}>
              {/* Front */}
              <div className="absolute w-full h-full cs-flashcard-face">
                <div className="rounded-xl bg-card border border-border shadow-sm w-full h-full flex items-center justify-center p-8">
                  <h3 className="text-2xl font-bold text-foreground text-center">{currentCard?.term}</h3>
                </div>
              </div>
              {/* Back */}
              <div className="absolute w-full h-full cs-flashcard-face cs-flashcard-back">
                <div className="rounded-xl bg-card border border-border shadow-sm w-full h-full flex items-center justify-center p-8">
                  <p className="text-sm text-muted-foreground text-center leading-relaxed">{currentCard?.definition}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 min-h-[48px]">
            {isFlipped && currentCard ? (
              <div className="flex w-full justify-center gap-4">
                <button
                  onClick={() => handleAddToReview(currentCard)}
                  className="inline-flex items-center rounded-lg border border-border text-foreground text-sm font-medium px-4 py-2 hover:bg-accent transition-colors duration-150"
                >
                  Needs Review
                </button>
                <button
                  onClick={() => handleGotIt(currentCard)}
                  className="inline-flex items-center rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
                >
                  Got It
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => changeCard('prev')}
                  disabled={activeDeck.cards.length < 2}
                  aria-label="Previous card"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowIcon direction="left" className="w-5 h-5" />
                </button>
                <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-mono">
                  {currentCardIndex + 1} / {activeDeck.cards.length}
                </div>
                <button
                  onClick={() => changeCard('next')}
                  disabled={activeDeck.cards.length < 2}
                  aria-label="Next card"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowIcon direction="right" className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CSFlashcards;
