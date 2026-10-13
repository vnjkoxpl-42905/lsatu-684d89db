import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { termCards } from '../content/termCards';
import { useCourseStep } from '../courseProgress';
import './indicator-word-deck.css';

const boldParts = (text: string) => text.split('**').map((part, i) => i % 2 ? <strong key={i}>{part}</strong> : part);

/** Question on the front, answer and a short note on the back. Tap the card to turn it, then move on. */
export function TermDeck() {
  const course = useCourseStep('flashcards-foundation');
  const record = course?.record;
  const [restored] = useState(() => {
    const saved = course?.saved?.state as { index?: unknown; flipped?: unknown; seen?: unknown } | undefined;
    const index = Number.isInteger(saved?.index) && Number(saved.index) >= 0 && Number(saved.index) < termCards.length ? Number(saved.index) : 0;
    const seen = Array.isArray(saved?.seen) ? saved.seen.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < termCards.length) : [];
    return { index, flipped: saved?.flipped === true, seen: [...new Set(seen)] };
  });
  const [index, setIndex] = useState(restored.index);
  const [flipped, setFlipped] = useState(restored.flipped);
  const [seen, setSeen] = useState(restored.seen);
  useEffect(() => {
    if (seen.length || index > 0) record?.({ state: { index, flipped, seen }, done: seen.length, total: termCards.length, ...(seen.length === termCards.length ? { status: 'done' as const } : {}) });
  }, [index, flipped, seen, record]);
  const card = termCards[index];
  const go = (to: number) => { setIndex(to); setFlipped(false); };
  return <section className="iw-deck" aria-label="Key term flashcards">
    <p className="iw-count">Card {index + 1} of {termCards.length}</p>
    <div className="iw-stage">
      <button type="button" className="iw-card iw-term-card" data-flipped={flipped} aria-label={flipped ? `${card.answer} ${card.note.split("**").join("")}` : `${card.front} Turn the card.`} onClick={() => { setFlipped(value => !value); setSeen(previous => previous.includes(index) ? previous : [...previous, index]); }}>
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
