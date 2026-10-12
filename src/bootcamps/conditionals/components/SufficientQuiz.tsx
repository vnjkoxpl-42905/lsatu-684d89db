import { useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Pill } from './ContrapositiveVisuals';

type Option = { text: string; tone?: 'amber' | 'teal'; reason?: string };
type Item = { rule: string; question: string; options: Option[]; correct: number; answer: string };

const items: Item[] = [
  {
    rule: 'Every applicant invited to an interview receives an email.',
    question: 'Which idea is enough to guarantee the email?',
    options: [
      { text: 'Invited to an interview', tone: 'amber' },
      { text: 'Any applicant', tone: 'amber', reason: 'The rule covers invited applicants, not every applicant.' },
      { text: 'Receives an email', tone: 'teal', reason: 'That is what the rule guarantees, not what guarantees it.' },
    ],
    correct: 0,
    answer: 'If an applicant is invited to an interview, then the applicant gets an email.',
  },
  {
    rule: 'Whenever it rains on match day, the match is cancelled.',
    question: 'Which idea is enough to cancel the match?',
    options: [
      { text: 'It is match day', tone: 'amber', reason: 'Match day alone is not enough. The rule needs rain too.' },
      { text: 'It rains on match day', tone: 'amber' },
      { text: 'The match is cancelled', tone: 'teal', reason: 'That is the result, not the idea that guarantees it.' },
    ],
    correct: 1,
    answer: 'If it rains on match day, then the match is cancelled.',
  },
  {
    rule: 'Every applicant invited to an interview receives an email.',
    question: 'An applicant is not invited. What does the rule say about an email?',
    options: [
      { text: 'No email.', reason: 'The rule never says only invited applicants get emails.' },
      { text: 'Nothing. They might or might not get one.' },
      { text: 'They get one anyway.', reason: 'The rule does not promise that either.' },
    ],
    correct: 1,
    answer: 'If an applicant is not invited, the rule says nothing about an email.',
  },
  {
    rule: "If you're enrolled in law school, you're a student.",
    question: 'Dana is a student. What does the rule say about law school?',
    options: [
      { text: 'She is enrolled.', reason: 'Being a student is not enough to prove enrollment.' },
      { text: 'She is not enrolled.', reason: 'The rule does not rule enrollment out.' },
      { text: 'Nothing. She might be studying something else.' },
    ],
    correct: 2,
    answer: 'If someone is a student, the rule says nothing about law school.',
  },
];

/** Four questions, one at a time, each answered with one tap. The sufficient-condition twin of the contrapositive quiz. */
export function SufficientQuiz() {
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState<number | null>(null);
  const item = items[step];
  const last = step === items.length - 1;
  const lastWrong = wrong.length ? item.options[wrong[wrong.length - 1]] : null;
  const message = solved !== null ? item.answer : lastWrong ? `Not that one. ${lastWrong.reason}` : 'Pick the answer the rule supports.';
  const next = () => { setStep(value => value + 1); setWrong([]); setSolved(null); };
  const restart = () => { setStep(0); setWrong([]); setSolved(null); };
  return <div className="ct-drill" data-step={step}>
    <div className="ct-drill-top">
      <p className="ct-picker-kicker">Your turn</p>
      <p className="ct-drill-count">Question {step + 1} of {items.length}<span className="ct-drill-dots" aria-hidden="true">{items.map((entry, index) => <i key={index} data-state={index < step ? 'done' : index === step ? 'now' : 'todo'}/>)}</span></p>
    </div>
    <p className="ct-drill-sentence">{item.rule}</p>
    <p className="ct-picker-question" id={`sq-q-${step}`}>{item.question}</p>
    <div className="ct-drill-options" role="group" aria-labelledby={`sq-q-${step}`}>
      {item.options.map((option, index) => {
        const state = solved === index ? 'right' : wrong.includes(index) ? 'wrong' : 'open';
        return <button key={option.text} type="button" className="ct-drill-option" data-state={state} disabled={solved !== null && solved !== index} onClick={() => { if (solved !== null) return; if (index === item.correct) setSolved(index); else setWrong(list => list.includes(index) ? list : [...list, index]); }}>
          {option.tone ? <Pill text={option.text} tone={option.tone} negated={false}/> : <span className="sq-option-text">{option.text}</span>}
          {state === 'right' && <span className="ct-drill-mark" data-kind="right"><Check size={16} strokeWidth={3} aria-hidden="true"/>Yes</span>}
          {state === 'wrong' && <span className="ct-drill-mark" data-kind="wrong"><X size={16} strokeWidth={3} aria-hidden="true"/>No</span>}
        </button>;
      })}
    </div>
    <p className="ct-picker-message" role="status" data-solved={solved !== null}>{message}</p>
    {solved !== null && (last
      ? <div className="ct-drill-end"><strong>That is all four.</strong><button type="button" className="ct-drill-next" onClick={restart}><RotateCcw size={15} aria-hidden="true"/>Try them again</button></div>
      : <button type="button" className="ct-drill-next" onClick={next}>Next question</button>)}
  </div>;
}
