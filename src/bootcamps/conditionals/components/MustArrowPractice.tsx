import { useId, useRef, useState } from 'react';
import { indicatorFlashcards } from '../content/indicatorFlashcards';
import './must-arrow-practice.css';

const questions = indicatorFlashcards.filter(item => item.group === 'foundation');

export function MustArrowPractice() {
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState<string[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const explanationId = useId();
  const question = questions[index];
  const revealed = viewed.includes(question.id);
  const ruleEnd = question.front.indexOf('.') + 1;

  function move(next: number) {
    setIndex(next);
    heading.current?.focus();
  }

  return <div className="ma-question-practice">
    <div className="ma-question-practice-progress">
      <span id={`${explanationId}-progress`}>{viewed.length} of {questions.length} explanations viewed</span>
      <progress aria-labelledby={`${explanationId}-progress`} value={viewed.length} max={questions.length}/>
    </div>
    <div className="ma-question-practice-question">
      <h3 ref={heading} tabIndex={-1}>Question {index + 1} of {questions.length}</h3>
      <p className="ma-question-practice-rule">{question.front.slice(0, ruleEnd)}</p>
      <p className="ma-question-practice-prompt">{question.front.slice(ruleEnd).trim()}</p>
      <button type="button" aria-expanded={revealed} aria-controls={explanationId}
        onClick={() => setViewed(items => items.includes(question.id) ? items : [...items, question.id])}>
        {revealed ? 'Explanation shown' : 'Show explanation'}
      </button>
      <div id={explanationId} hidden={!revealed} className="ma-question-practice-explanation" aria-live="polite">
        {revealed && <><h4>Explanation</h4><p>{question.back}</p></>}
      </div>
    </div>
    <div className="ma-question-practice-navigation">
      <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>Previous question</button>
      {index < questions.length - 1 && <button type="button" disabled={!revealed} onClick={() => move(index + 1)}>Next question <span aria-hidden="true">→</span></button>}
    </div>
    {viewed.length === questions.length && <p className="ma-question-practice-finished" role="status">You've viewed all four explanations. Continue to the next drill to use the rule yourself.</p>}
  </div>;
}
