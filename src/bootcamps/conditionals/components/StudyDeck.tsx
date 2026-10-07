import { useId, useState } from 'react';
import { indicatorFlashcards } from '../content/indicatorFlashcards';

export function StudyDeck({ group }: { group: string }) {
  const cards = indicatorFlashcards.filter(card => card.group === group);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revisit, setRevisit] = useState<string[]>([]);
  const label = useId();
  const card = cards[index];
  if (!card) return null;
  const move = (next: number) => { setIndex(next); setFlipped(false); };
  return <div className="co-study-deck">
    <div className="co-deck-meta"><span id={label}>Recall card {index + 1} of {cards.length}</span><span>Think before you turn</span></div>
    <button type="button" className="co-study-card" data-flipped={flipped} aria-describedby={label} aria-expanded={flipped} onClick={() => setFlipped(!flipped)}>
      <span className="co-card-eyebrow">{flipped ? 'Compare your reasoning' : 'Explain it in your own words'}</span>
      <span className="co-card-text" key={`${card.id}-${flipped}`}>{flipped ? card.back : card.front}</span>
      <span className="co-card-turn">{flipped ? 'Turn back to the question' : 'Turn to the explanation'} <span aria-hidden="true">↻</span></span>
    </button>
    <div className="co-deck-controls">
      <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>Previous card</button>
      <button type="button" aria-pressed={revisit.includes(card.id)} onClick={() => setRevisit(items => items.includes(card.id) ? items.filter(id => id !== card.id) : [...items, card.id])}>{revisit.includes(card.id) ? 'Saved to revisit' : 'Revisit this card'}</button>
      <button type="button" disabled={index === cards.length - 1} onClick={() => move(index + 1)}>Next card</button>
    </div>
    {revisit.length > 0 && <div className="co-revisit"><p>{revisit.length} {revisit.length === 1 ? 'card' : 'cards'} to revisit. Try again after another page.</p><button type="button" onClick={() => move(cards.findIndex(item => revisit.includes(item.id)))}>Return to a saved card</button></div>}
  </div>;
}
