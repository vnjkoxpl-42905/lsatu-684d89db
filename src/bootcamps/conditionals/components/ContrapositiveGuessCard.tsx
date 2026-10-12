import { useId, useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import './contrapositive-card.css';

/** A thought experiment the student answers before seeing the solution. The guess is typed on the front; turning the card shows the answer on the back. */
export function ContrapositiveGuessCard({ story, question, answer }: { story: ReactNode; question: ReactNode; answer: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const [guess, setGuess] = useState('');
  const fieldId = useId();
  return <div className="cg-stage">
    <div className="cg-card" data-flipped={flipped}>
      <div className="cg-face cg-front" aria-hidden={flipped}>
        <span className="cg-eyebrow">Thought experiment</span>
        {story}
        <div className="cg-question">{question}</div>
        <label className="cg-guess" htmlFor={fieldId}>Put your guess here
          <textarea id={fieldId} rows={2} value={guess} tabIndex={flipped ? -1 : 0} onChange={event => setGuess(event.target.value)}/>
        </label>
        <p className="cg-hint">Try to answer before you turn the card.</p>
        <button type="button" className="cg-turn" tabIndex={flipped ? -1 : 0} onClick={() => setFlipped(true)}>Turn the card</button>
      </div>
      <div className="cg-face cg-back" aria-hidden={!flipped}>
        <span className="cg-eyebrow">The answer</span>
        {answer}
        {guess.trim() && <p className="cg-yours"><strong>Your guess:</strong> {guess.trim()}</p>}
        <button type="button" className="cg-turn" tabIndex={flipped ? 0 : -1} onClick={() => setFlipped(false)}><RotateCcw size={16} aria-hidden="true"/>Turn back</button>
      </div>
    </div>
  </div>;
}
