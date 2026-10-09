import { useId, useState } from 'react';
import './sufficient-condition-experience.css';

const relationships = [
  {
    key: 'both', label: 'Enrolled in law school and a student', fits: true,
    result: 'These conditions belong together.',
    explanation: "The sentence guarantees student status whenever law-school enrollment is true. That's why the entire law-school group belongs inside the student group.",
    caption: 'Law-school enrollment always comes with student status.',
  },
  {
    key: 'contradiction', label: 'Enrolled in law school but not a student', fits: false,
    result: 'This would break the guarantee.',
    explanation: "The sufficient condition would be true, but the condition it guarantees would be false. That combination contradicts the sentence. No part of the law-school group can sit outside the student group.",
    caption: 'Law-school enrollment without student status is excluded.',
  },
  {
    key: 'other', label: 'A student, but not enrolled in law school', fits: true,
    result: 'The sentence allows this combination.',
    explanation: "Law-school enrollment is one way to satisfy the condition of being a student. It isn't the only way. Students studying other subjects can belong to the larger group too.",
    caption: 'The student group can include students outside law school.',
  },
] as const;

function StudentSymbol({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}>
    <circle cy="-10" r="7"/>
    <path d="M-12 15v-5a12 12 0 0 1 24 0v5Z"/>
  </g>;
}

export function SufficientConditionExperience() {
  const [selected, setSelected] = useState(0);
  const titleId = useId();
  const diagramId = useId();
  const readingId = useId();
  const current = relationships[selected];
  return <section className="sc-experience" aria-labelledby={titleId}>
    <header>
      <p className="sc-eyebrow">Picture the relationship</p>
      <h3 id={titleId}>Every law-school student is a student.</h3>
      <p>The smaller group fits entirely inside the larger one. Select a combination to see how it compares with the sentence.</p>
    </header>
    <figure className="sc-membership" data-case={current.key}>
      <div className="sc-group-visual">
        <div className="sc-group-label"><span>Students</span><span className="sc-group-note">The larger group</span></div>
        <svg className="sc-group-drawing" viewBox="0 0 600 250" role="img" aria-labelledby={diagramId}>
          <title id={diagramId}>The entire law-school group is inside the student group. Students in other subjects can be outside the law-school group while still inside Students.</title>
          <rect className="sc-student-boundary" x="8" y="8" width="584" height="234" rx="30"/>
          <rect className="sc-law-boundary" x="30" y="30" width="270" height="190" rx="24"/>
          <g className="sc-law-symbols" aria-hidden="true">
            <StudentSymbol x={86} y={88}/><StudentSymbol x={165} y={88}/><StudentSymbol x={244} y={88}/>
            <StudentSymbol x={86} y={162}/><StudentSymbol x={165} y={162}/><StudentSymbol x={244} y={162}/>
          </g>
          <g className="sc-other-symbols" aria-hidden="true">
            <StudentSymbol x={365} y={88}/><StudentSymbol x={445} y={88}/><StudentSymbol x={525} y={88}/>
            <StudentSymbol x={365} y={162}/><StudentSymbol x={445} y={162}/><StudentSymbol x={525} y={162}/>
          </g>
        </svg>
        <div className="sc-diagram-key" aria-hidden="true"><span><i/>Enrolled in law school</span><span><i/>Other students</span></div>
      </div>
      <figcaption>{current.caption} The groups illustrate the relationship, not how many people are enrolled.</figcaption>
    </figure>
    <div className="sc-case-controls" role="group" aria-label="Compare combinations with the conditional sentence">
      {relationships.map((relationship, index) => <button type="button" key={relationship.key} aria-pressed={selected === index} aria-controls={readingId} onClick={() => setSelected(index)}>{relationship.label}</button>)}
    </div>
    <div className="sc-case-reading" id={readingId} aria-live="polite" aria-atomic="true" data-fits={current.fits}>
      <p className="sc-case-verdict"><span aria-hidden="true">{current.fits ? '✓' : '×'}</span>{current.fits ? 'Fits the sentence' : 'Contradicts the sentence'}</p>
      <strong>{current.result}</strong>
      <p>{current.explanation}</p>
    </div>
  </section>;
}

const explanations = {
  trigger: {
    label: 'The sufficient condition',
    title: 'Enrollment is the condition that guarantees student status.',
    text: "The if-part names law-school enrollment. Whenever that condition is satisfied, the rule requires student status. That's the job of a sufficient condition. It establishes the other condition under this rule.",
  },
  result: {
    label: 'The stated outcome',
    title: 'Being a student is what the sentence guarantees.',
    text: "The outcome is not just a possibility. Whenever you're enrolled in law school, you have to be a student. A person who was enrolled but wasn't a student would be an exception to the sentence.",
  },
  connection: {
    label: 'The connection between them',
    title: 'The first condition guarantees the second.',
    text: "The sufficient condition is the trigger for this guarantee: if law-school enrollment is true, student status must be true too. ‘Trigger’ describes the logical connection. It doesn't mean that one event causes another or that the events happen in a particular order.",
  },
} as const;

export function SufficientReasoningWalkthrough() {
  const [selected, setSelected] = useState<keyof typeof explanations>('trigger');
  const headingId = useId();
  const explanationId = useId();
  const current = explanations[selected];
  return <section className="sc-walkthrough" aria-labelledby={headingId}>
    <header><p className="sc-eyebrow">Take the sentence apart</p><h3 id={headingId}>Which condition guarantees student status?</h3><p>Select either part of the sentence, then look at the connection between them.</p></header>
    <div className="sc-sentence-map" data-selected={selected} role="group" aria-label="Explore the two conditions and their connection">
      <button type="button" className="sc-sentence-part sc-trigger" aria-pressed={selected === 'trigger'} aria-controls={explanationId} onClick={() => setSelected('trigger')}>
        <span className="sc-clause-label">If</span>{' '}<strong>you're enrolled in law school</strong>{' '}<span className="sc-clause-role">Trigger · Sufficient condition</span>
      </button>
      <button type="button" className="sc-guarantee" aria-pressed={selected === 'connection'} aria-controls={explanationId} onClick={() => setSelected('connection')}><span>guarantees</span><i aria-hidden="true"/></button>
      <button type="button" className="sc-sentence-part sc-result" aria-pressed={selected === 'result'} aria-controls={explanationId} onClick={() => setSelected('result')}>
        <span className="sc-clause-label">Then</span>{' '}<strong>you're a student</strong>{' '}<span className="sc-clause-role">Stated outcome</span>
      </button>
    </div>
    <div id={explanationId} className="sc-walkthrough-comment" aria-live="polite" aria-atomic="true">
      <p className="sc-eyebrow">{current.label}</p><h4>{current.title}</h4><p>{current.text}</p>
    </div>
  </section>;
}
