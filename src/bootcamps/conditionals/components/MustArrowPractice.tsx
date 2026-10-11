import { useEffect, useId, useRef, useState } from 'react';
import './must-arrow-practice.css';

// Practice follows the lesson's source-supported sufficient-to-necessary convention.
const questions = [
  {
    id: 'arrow-left',
    rule: 'If you are enrolled in law school, then you are a student.',
    prompt: 'Which complete condition belongs on the left side of the arrow?',
    options: ['You are enrolled in law school.', 'You are a student.', 'If.'],
    feedback: [
      'Enrollment is enough to prove that you are a student. It is the sufficient condition, so it goes on the left.',
      'Being a student is the necessary condition in this rule. It belongs on the right, because enrollment requires it.',
      'If points to the sufficient condition, but it is not itself a condition. Keep the whole idea it introduces: you are enrolled in law school.',
    ],
    explanation: 'Read from the sufficient condition toward the necessary condition: You are enrolled in law school → You are a student.',
    correct: 0,
  },
  {
    id: 'arrow-right',
    rule: 'If you are enrolled in law school, then you are a student.',
    prompt: 'Which complete condition belongs on the right side of the arrow?',
    options: ['You are enrolled in law school.', 'You are a student.', 'Law school.'],
    feedback: [
      'Enrollment is the sufficient condition. It belongs on the left, where we start reading this rule.',
      'Being a student is required whenever you are enrolled in law school. It is the necessary condition, so it goes on the right.',
      'Law school names a place, not a complete condition. Keep the whole idea: you are a student. That is what enrollment requires.',
    ],
    explanation: 'The arrow points to what must be true if the left side is true. Enrollment on the left requires being a student on the right.',
    correct: 1,
  },
  {
    id: 'arrow-reading',
    rule: 'This folder is marked complete → This folder contains a signed form',
    prompt: 'How do you read this arrow?',
    options: [
      'If this folder contains a signed form, it must be marked complete.',
      'This folder is marked complete and contains a signed form.',
      'If this folder is marked complete, it must contain a signed form.',
    ],
    feedback: [
      'That reads the arrow backward. Start with this folder is marked complete on the left, then follow the arrow to the signed form on the right.',
      'That treats both sides as facts. The arrow tells us what must follow if the left side is true; it does not say either side is actually true.',
      'That follows the arrow from left to right and keeps the requirement: if this folder is marked complete, the signed form must be there.',
    ],
    explanation: 'Read the arrow as must: if the left side is true, the right side must be true.',
    correct: 2,
  },
  {
    id: 'arrow-clause-order',
    rule: 'The library extends your loan if you renew online.',
    prompt: 'Which arrow keeps the meaning of this rule?',
    options: [
      'The library extends your loan → You renew online',
      'You renew online → The library extends your loan',
      'If → The library extends your loan',
    ],
    feedback: [
      'That follows the rule order but reverses the requirement. Renewing online is enough to prove that the library extends your loan, even though renewing appears last.',
      'Renewing online is the sufficient condition. If introduces it at the end of this rule, so it still belongs on the left of the arrow.',
      'If is an indicator, not a complete condition. Put the idea it introduces on the left: you renew online.',
    ],
    explanation: 'This has the same meaning as If you renew online, the library extends your loan. Moving the words does not change which condition is sufficient or necessary.',
    correct: 1,
  },
];

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
      <span id={`${id}-progress`}>{count} answered · {questions.length - count} remaining</span>
      <progress aria-labelledby={`${id}-progress`} value={count} max={questions.length}/>
    </div>
    <div className="ma-question-practice-question">
      <h4 ref={heading} tabIndex={-1}>Question {index + 1} of {questions.length}</h4>
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
      <div className="ma-question-practice-feedback">
        {answered && <div className="ma-question-practice-explanation">
          <h5 ref={feedbackHeading} tabIndex={-1}>{answer === question.correct ? 'Correct.' : 'Not quite.'}</h5>
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
