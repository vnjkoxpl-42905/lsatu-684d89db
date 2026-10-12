import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { termCards } from '../content/termCards';
import './indicator-word-deck.css';

/** Prompt on the front, one line on the back. Tap the card to turn it, then move on. */
export function TermDeck() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = termCards[index];
  const go = (to: number) => { setIndex(to); setFlipped(false); };
  return <section className="iw-deck" aria-label="Key term flashcards">
    <p className="iw-count">Card {index + 1} of {termCards.length}</p>
    <div className="iw-stage">
      <button type="button" className="iw-card iw-term-card" data-flipped={flipped} aria-label={flipped ? `${card.front}. ${card.back}` : `${card.front}. Turn the card.`} onClick={() => setFlipped(value => !value)}>
        <span className="iw-face iw-front" aria-hidden="true"><span className="iw-word iw-term">{card.front}</span></span>
        <span className="iw-face iw-back" aria-hidden="true"><span className="iw-line">{card.back}</span></span>
      </button>
    </div>
    <div className="iw-nav">
      <button type="button" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden="true"/>Back</button>
      <button type="button" onClick={() => go(index + 1)} disabled={index === termCards.length - 1}>Next<ArrowRight size={16} aria-hidden="true"/></button>
    </div>
  </section>;
}
