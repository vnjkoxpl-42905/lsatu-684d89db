import { useId, useRef, useState } from 'react';
import { indicatorFlashcards } from '../content/indicatorFlashcards';
import './must-arrow-practice.css';

const rule = 'Every folder marked complete contains a signed form.';
// These questions adapt the four reviewed foundation concepts. Keep their source explanations.
const questions = [
  {
    id: 'foundation-enough', rule,
    prompt: 'Which fact is enough to conclude that a folder contains a signed form?',
    options: ['The folder is marked complete.', 'The folder is not marked complete.', 'The folder has some unfinished work.'],
    correct: 0,
  },
  {
    id: 'foundation-required', rule,
    prompt: 'A folder is marked complete. What must be true?',
    options: ['Every folder with a signed form is marked complete.', 'This folder contains a signed form.', 'This folder contains no unsigned forms.'],
    correct: 1,
  },
  {
    id: 'foundation-reverse', rule,
    prompt: 'This folder contains a signed form. Do we know whether it is marked complete?',
    options: ['Yes. It must be marked complete.', 'Yes. It cannot be marked complete.', 'No. It could be marked complete, but we do not know.'],
    correct: 2,
  },
  {
    id: 'foundation-rule-not-fact', rule,
    prompt: 'Does the rule tell us that any folder is actually marked complete?',
    options: ['Yes. At least one folder must be marked complete.', 'No. It tells us what follows if a folder is marked complete.', 'No. It tells us that no folders are marked complete.'],
    correct: 1,
  },
].map(question => ({
  ...question,
  explanation: indicatorFlashcards.find(item => item.id === question.id)!.back,
}));

export function MustArrowPractice() {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [choice, setChoice] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const question = questions[index];
  const answer = answers[question.id];
  const answered = answer !== undefined;
  const count = Object.keys(answers).length;

  function move(next: number) {
    setIndex(next);
    setChoice(null);
    heading.current?.focus();
  }

  return <div className="ma-question-practice">
    <div className="ma-question-practice-progress">
      <span id={`${id}-progress`}>{count} of {questions.length} questions answered</span>
      <progress aria-labelledby={`${id}-progress`} value={count} max={questions.length}/>
    </div>
    <div className="ma-question-practice-question">
      <h3 ref={heading} tabIndex={-1}>Question {index + 1} of {questions.length}</h3>
      <p className="ma-question-practice-rule">{question.rule}</p>
      <fieldset className="ma-question-practice-choices" disabled={answered}>
        <legend className="ma-question-practice-prompt">{question.prompt}</legend>
        {question.options.map((option, optionIndex) => <label key={option} className={(answered ? answer : choice) === optionIndex ? 'is-selected' : undefined}>
          <input type="radio" name={`${id}-${question.id}`} checked={(answered ? answer : choice) === optionIndex}
            onChange={() => setChoice(optionIndex)}/>
          <span>{option}</span>
        </label>)}
      </fieldset>
      {!answered && <button type="button" disabled={choice === null} onClick={() => {
        if (choice !== null) setAnswers(items => ({ ...items, [question.id]: choice }));
      }}>Check answer</button>}
      <div className="ma-question-practice-feedback" aria-live="polite" aria-atomic="true">
        {answered && <div className="ma-question-practice-explanation">
          <h4>{answer === question.correct ? 'Correct.' : 'Not quite.'}</h4>
          {answer !== question.correct && <p><strong>The answer: {question.options[question.correct]}</strong></p>}
          <p>{question.explanation}</p>
        </div>}
      </div>
    </div>
    <div className="ma-question-practice-navigation">
      <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>Previous question</button>
      {index < questions.length - 1 && <button type="button" disabled={!answered} onClick={() => move(index + 1)}>Next question <span aria-hidden="true">→</span></button>}
    </div>
    {count === questions.length && <p className="ma-question-practice-finished" role="status">You've answered all {questions.length} questions. Review the explanations, then continue to the next drill.</p>}
  </div>;
}
