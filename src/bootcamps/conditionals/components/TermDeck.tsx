import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { termCards } from '../content/termCards';
import './indicator-word-deck.css';

const boldParts = (text: string) => text.split('**').map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part);

/** Question on the front, answer and a short note on the back. Tap the card to turn it, then move on. */
export function TermDeck({ storageScope, initialCardId }: { storageScope?: string; initialCardId?: string }) {
  if (initialCardId && !termCards.some(card => card.id === initialCardId)) return <p role="alert">This card is not available in this set.</p>;
  return <TermDeckRun key={storageScope} storageScope={storageScope} initialCardId={initialCardId}/>;
}
function TermDeckRun({ storageScope, initialCardId }: { storageScope?: string; initialCardId?: string }) {
  const storageKey = storageScope ? `conditional-term-cards-v2:${storageScope}` : undefined;
  const [index, setIndex] = useState(() => {
    try { const saved = JSON.parse((storageKey ? localStorage.getItem(storageKey) : null) ?? 'null'); const i = termCards.findIndex(card => card.id === saved?.cardId); if (i >= 0) return i; } catch { /* Start with the requested card below. */ }
    return Math.max(0, termCards.findIndex(card => card.id === initialCardId));
  });
  const [flipped, setFlipped] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const card = termCards[index];
  const go = (to: number) => {
    setIndex(to); setFlipped(false);
    if (storageKey) {
      try { localStorage.setItem(storageKey, JSON.stringify({ cardId: termCards[to].id })); setSaveFailed(false); }
      catch { setSaveFailed(true); }
    }
  };
  return <section className="iw-deck" aria-label="Key term flashcards">
    {initialCardId && termCards[index].id !== initialCardId && <p>Your saved place takes priority over the card in this link.</p>}
    <p>{saveFailed ? 'Your place could not be saved. You can keep practising here.' : storageKey ? 'Your place in these cards is saved in this browser as you move through them.' : 'Your place is kept while this activity is open.'}</p>
    <p className="iw-count">Card {index + 1} of {termCards.length}</p>
    <div className="iw-stage">
      <button type="button" className="iw-card iw-term-card" data-flipped={flipped} aria-label={flipped ? `${card.answer} ${card.note.split("**").join("")}` : `${card.front} Turn the card.`} onClick={() => setFlipped(value => !value)}>
        <span className="iw-face iw-front" aria-hidden="true"><span className="iw-question">{card.front}</span></span>
        <span className="iw-face iw-back" aria-hidden="true"><span className="iw-word iw-term">{card.answer}</span><span className="iw-back-kind">{boldParts(card.note)}</span></span>
      </button>
    </div>
    <div className="iw-nav">
      <button type="button" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden="true"/>Back</button>
      <button type="button" onClick={() => go(index + 1)} disabled={index === termCards.length - 1}>Next<ArrowRight size={16} aria-hidden="true"/></button>
    </div>
  </section>;
}
