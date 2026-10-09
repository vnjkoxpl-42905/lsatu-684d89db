import { useId, useRef, useState } from 'react';
import './sufficient-condition-experience.css';

const examples = [
  { key: 'enrolled', label: 'Enrolled in law school', fact: 'Maya is enrolled in law school.', result: 'Maya is a student.', explanation: "The law-school group sits entirely inside the student group. Knowing Maya belongs to the smaller group settles whether she belongs to the larger one.", caption: 'One known position. Student status is guaranteed.' },
  { key: 'student', label: 'Only student status is known', fact: 'Maya is a student.', result: "We don't know whether Maya is enrolled in law school.", explanation: "She could be in law school, or she could be studying another subject. Both fit the rule. Being a student doesn't tell us which group she's in.", caption: 'Two possible positions. Neither is established.' },
  { key: 'not-enrolled', label: 'Not enrolled in law school', fact: "Maya isn't enrolled in law school.", result: "We don't know whether Maya is a student.", explanation: "She could be studying history, or she could be out of school. The rule still holds in either case. Not meeting the sufficient condition doesn't settle the other condition.", caption: 'Outside law school. Student status remains open.' },
] as const;

export function SufficientConditionExperience() {
  const [selected, setSelected] = useState(0);
  const titleId = useId();
  const resultId = useId();
  const current = examples[selected];
  return <section className="sc-experience" aria-labelledby={titleId}>
    <header><p className="sc-eyebrow">Keep the rule. Change what you know.</p><h3 id={titleId}>Enough doesn't mean the only way</h3><p>Choose a fact about Maya. Watch what it lets us conclude.</p></header>
    <div className="sc-case-controls" role="group" aria-label="Choose what is known about Maya">{examples.map((example, index) => <button type="button" key={example.key} aria-pressed={selected === index} aria-controls={resultId} onClick={() => setSelected(index)}>{example.label}</button>)}</div>
    <figure className="sc-membership" data-case={current.key}>
      <svg viewBox="0 0 640 340" role="img" aria-label={current.caption}>
        <rect className="sc-students-area" x="24" y="26" width="592" height="250" rx="22" />
        <text className="sc-group-label" x="48" y="64">Students</text>
        <rect className="sc-law-area" x="48" y="94" width="258" height="156" rx="16" />
        <text className="sc-law-label" x="70" y="126">Enrolled in law school</text>
        <text className="sc-other-label" x="341" y="125">Other students</text>
        <text className="sc-outside-label" x="341" y="312">Not a student</text>
        <g className="sc-position sc-position-law"><circle cx="169" cy="183" r="25"/><text x="169" y="189">M</text><text className="sc-position-label" x="169" y="230">{selected === 0 ? 'Maya' : 'Possible'}</text></g>
        <g className="sc-position sc-position-other"><circle cx="460" cy="183" r="25"/><text x="460" y="189">M</text><text className="sc-position-label" x="460" y="230">Possible</text></g>
        <g className="sc-position sc-position-outside"><circle cx="270" cy="309" r="20"/><text x="270" y="315">M</text></g>
      </svg>
      <figcaption>{current.caption} {selected !== 0 && 'The markers show alternatives, not two Mayas.'}</figcaption>
    </figure>
    <div className="sc-case-reading" id={resultId} aria-live="polite" aria-atomic="true" key={current.key}>
      <p className="sc-eyebrow">Given: {current.fact}</p><strong>{current.result}</strong><p>{current.explanation}</p>
    </div>
  </section>;
}

const reasoning = [
  { label: 'The rule', text: "If you're enrolled in law school, you're a student.", explanation: "This gives us the connection. It doesn't tell us whether Maya is enrolled." },
  { label: 'The fact', text: 'Maya is enrolled in law school.', explanation: 'Now we know Maya meets the condition the rule describes.' },
  { label: 'What follows', text: 'Maya is a student.', explanation: "The rule covers Maya. We don't need another fact to establish student status." },
];

export function SufficientReasoningWalkthrough() {
  const [step, setStep] = useState(0);
  const headingId = useId();
  const replay = useRef<HTMLButtonElement>(null);
  return <section className="sc-walkthrough" aria-labelledby={headingId}>
    <header><p className="sc-eyebrow">Follow the reasoning</p><h3 id={headingId}>A rule becomes useful when we know a fact</h3></header>
    <ol className="sc-reasoning-lines">{reasoning.map((item, index) => <li key={item.label} data-current={index === step} data-revealed={index <= step}><span>{item.label}</span><p>{index <= step ? item.text : index === 1 ? 'Next, add what we know about Maya.' : 'Then ask what the rule establishes.'}</p></li>)}</ol>
    <div className="sc-walkthrough-comment" role="status" aria-live="polite"><p key={step}>{reasoning[step].explanation}</p></div>
    <div className="sc-walkthrough-controls"><button type="button" className="sc-continue" disabled={step === 2} onClick={() => { if (step === 1) replay.current?.focus(); setStep(value => Math.min(value + 1, 2)); }}>{step === 0 ? 'Add the fact' : step === 1 ? 'See what follows' : 'Reasoning complete'}</button><button type="button" ref={replay} onClick={() => { setStep(0); }}>Replay</button><span aria-label={`Explanation step ${step + 1} of 3`} className="sc-step-dots" aria-hidden="true">{reasoning.map((item, index) => <i key={item.label} data-active={index <= step}/>)}</span></div>
  </section>;
}
