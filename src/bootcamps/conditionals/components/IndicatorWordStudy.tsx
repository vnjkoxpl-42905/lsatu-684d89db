import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { displayWord, groupSentence, indicatorWordCards, type IndicatorGroup } from '../content/indicatorWordCards';
import './indicator-word-deck.css';

/** One group's words, turned over at the student's own pace. No scoring: the quiz lives in the mixed deck. */
export function IndicatorWordStudy({ group }: { group: IndicatorGroup }) {
  const cards = indicatorWordCards.filter(card => card.group === group);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];
  const go = (to: number) => { setIndex(to); setFlipped(false); };
  return <section className="iw-deck" aria-label={`Group ${group} word flashcards`}>
    <p className="iw-count">Card {index + 1} of {cards.length}</p>
    <div className="iw-stage">
      <div className="iw-card" data-flipped={flipped}>
        <div className="iw-face iw-front" aria-hidden={flipped}>
          <span className="iw-eyebrow">Group {group} word</span>
          <span className="iw-word">{displayWord(card.word)}</span>
        </div>
        <div className="iw-face iw-back" aria-hidden={!flipped}>
          <span className="iw-line"><strong>{displayWord(card.word)}.</strong> {groupSentence(card.group)}</span>
        </div>
      </div>
    </div>
    <div className="iw-nav">
      <button type="button" onClick={() => go(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden="true"/>Back</button>
      <button type="button" className="iw-primary" onClick={() => setFlipped(value => !value)}>{flipped ? 'Show the word' : 'Turn card'}</button>
      <button type="button" onClick={() => go(index + 1)} disabled={index === cards.length - 1}>Next<ArrowRight size={16} aria-hidden="true"/></button>
    </div>
  </section>;
}
