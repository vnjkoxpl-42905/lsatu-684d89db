import { useEffect, useId, useState } from 'react';
import { indicatorFlashcards } from '../content/indicatorFlashcards';

export function StudyDeck({ group, selectedCard, onCardChange, choices }: { group: string; selectedCard?: string; onCardChange?: (id: string) => void; choices?: { id: string; label: string }[] }) {
  const cards = indicatorFlashcards.filter(card => card.group === group).sort((a, b) => choices ? choices.findIndex(item => item.id === a.id) - choices.findIndex(item => item.id === b.id) : 0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [revisit, setRevisit] = useState<string[]>([]);
  const label = useId();
  useEffect(() => setFlipped(false), [selectedCard]);
  const focused = !!choices;
  const activeIndex = focused ? Math.max(0, cards.findIndex(item => item.id === selectedCard)) : index;
  const card = cards[activeIndex];
  if (!card) return null;
  const move = (next: number) => { setIndex(next); onCardChange?.(cards[next].id); setFlipped(false); };
  return <div className={`co-study-deck${focused ? " co-focused-deck" : ""}`}>
    {choices && <label className="co-expression-picker">{group === 'foundation' ? 'Choose a concept' : 'Choose an indicator'}<select value={card.id} onChange={event => move(cards.findIndex(item => item.id === event.target.value))}>{choices.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
    <div className="co-deck-meta"><span id={label}>{focused ? "Example" : "Recall card"} {activeIndex + 1} of {cards.length}</span><span>{focused ? "" : "Think before you turn"}</span></div>
    <button type="button" className="co-study-card" data-flipped={flipped} aria-describedby={label} aria-expanded={flipped} onClick={() => setFlipped(!flipped)}>
      <span className="co-card-eyebrow">{focused ? (flipped ? 'Explanation' : 'Your question') : (flipped ? 'Compare your reasoning' : 'Explain it in your own words')}</span>
      <span className="co-card-text" key={`${card.id}-${flipped}`}>{flipped ? card.back : card.front}</span>
      <span className="co-card-turn">{focused ? (flipped ? 'Show question' : 'Show explanation') : (flipped ? 'Turn back to the question' : 'Turn to the explanation')} <span aria-hidden="true">↻</span></span>
    </button>
    <div className="co-deck-controls">
      <button type="button" disabled={activeIndex === 0} onClick={() => move(activeIndex - 1)}>{focused ? "Previous example" : "Previous card"}</button>
      {!focused && <button type="button" aria-pressed={revisit.includes(card.id)} onClick={() => setRevisit(items => items.includes(card.id) ? items.filter(id => id !== card.id) : [...items, card.id])}>{revisit.includes(card.id) ? 'Saved to revisit' : 'Revisit this card'}</button>}
      <button type="button" disabled={activeIndex === cards.length - 1} onClick={() => move(activeIndex + 1)}>{focused ? "Next example" : "Next card"}</button>
    </div>
    {revisit.length > 0 && <div className="co-revisit"><p>{revisit.length} {revisit.length === 1 ? 'card' : 'cards'} to revisit. Try again after another page.</p><button type="button" onClick={() => move(cards.findIndex(item => revisit.includes(item.id)))}>Return to a saved card</button></div>}
  </div>;
}
