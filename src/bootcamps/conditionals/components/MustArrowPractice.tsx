import { useEffect, useId, useRef, useState } from 'react';
import { indicatorFlashcards } from '../content/indicatorFlashcards';
import './must-arrow-practice.css';

const rule = 'Every folder marked complete contains a signed form.';
// These questions adapt the four reviewed foundation concepts. Keep their source explanations.
const questions = [
  {
    id: 'foundation-enough', rule,
    prompt: 'Which fact is enough to conclude that a folder contains a signed form?',
    options: ['The folder is marked complete.', 'The folder is not marked complete.', 'The folder has some unfinished work.'],
    feedback: [
      'The complete label gives us the left side of the rule. The signed form must follow.',
      'The rule tells us what follows when a folder is marked complete. If it is not marked complete, the rule leaves open whether it contains a signed form.',
      'Unfinished work does not tell us whether the folder contains a signed form. The fact that guarantees the form is the complete label.',
    ],
    correct: 0,
  },
  {
    id: 'foundation-required', rule,
    prompt: 'A folder is marked complete. What must be true?',
    options: ['Every folder with a signed form is marked complete.', 'This folder contains a signed form.', 'This folder contains no unsigned forms.'],
    feedback: [
      'That reverses the rule. A complete folder must contain a signed form, but a signed form does not guarantee the complete label.',
      'We know this folder is marked complete, so the rule requires it to contain a signed form.',
      'That adds a claim the rule does not make. A folder can contain a signed form and also contain unsigned forms.',
    ],
    correct: 1,
  },
  {
    id: 'foundation-reverse', rule,
    prompt: 'This folder contains a signed form. Do we know whether it is marked complete?',
    options: ['Yes. It must be marked complete.', 'Yes. It cannot be marked complete.', 'No. It could be marked complete, but we do not know.'],
    feedback: [
      'That moves backward from the right side to the left. Having the signed form does not prove that the folder is marked complete.',
      'A signed form does not rule out the complete label. In fact, every folder marked complete has one. The label is still unknown.',
      'The signed form fits either possibility: the folder may be marked complete, or it may still need other work.',
    ],
    correct: 2,
  },
  {
    id: 'foundation-rule-not-fact', rule,
    prompt: 'Does the rule tell us that any folder is actually marked complete?',
    options: ['Yes. At least one folder must be marked complete.', 'No. It tells us what follows if a folder is marked complete.', 'No. It tells us that no folders are marked complete.'],
    feedback: [
      'That turns a rule into a fact. The rule describes folders with the complete label; it does not tell us that any such folders exist.',
      'The rule gives a requirement for any folder with that label. It does not report whether any folder has the label.',
      'That also turns the rule into a fact. The rule does not say the complete label is absent. It leaves open whether any folders have it.',
    ],
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
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  const focusFeedback = useRef(false);
  const id = useId();
  const question = questions[index];
  const answer = answers[question.id];
  const answered = answer !== undefined;
  const count = Object.keys(answers).length;

  useEffect(() => {
    if (focusFeedback.current) {
      feedbackHeading.current?.focus();
      focusFeedback.current = false;
    }
  }, [answers]);

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
        if (choice !== null) {
          focusFeedback.current = true;
          setAnswers(items => ({ ...items, [question.id]: choice }));
        }
      }}>Check answer</button>}
      <div className="ma-question-practice-feedback" aria-live="polite" aria-atomic="true">
        {answered && <div className="ma-question-practice-explanation">
          <h4 ref={feedbackHeading} tabIndex={-1}>{answer === question.correct ? 'Correct.' : 'Not quite.'}</h4>
          <p>{question.feedback[answer]}</p>
          {answer !== question.correct && <p><strong>The answer: {question.options[question.correct]}</strong></p>}
          <p>{question.explanation}</p>
          {count === questions.length && <p className="ma-question-practice-finished">You've answered all {questions.length} questions. Review the explanations, then continue to the next drill.</p>}
        </div>}
      </div>
    </div>
    <div className="ma-question-practice-navigation">
      <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>Previous question</button>
      {index < questions.length - 1 && <button type="button" disabled={!answered} onClick={() => move(index + 1)}>Next question <span aria-hidden="true">→</span></button>}
    </div>
  </div>;
}
