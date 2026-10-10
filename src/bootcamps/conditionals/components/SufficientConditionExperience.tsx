import { useId, useRef, useState } from 'react';
import './sufficient-condition-experience.css';

const relationships = [
  {
    key: 'both', label: 'Enrolled and a student', fits: true,
    result: 'Being enrolled in law school guarantees being a student.',
    explanation: "Anyone enrolled in law school is a student. That's why the whole law-school group sits inside the student group.",
    caption: 'Everyone enrolled in law school belongs inside Students.',
  },
  {
    key: 'contradiction', label: 'Enrolled, but not a student', fits: false,
    result: 'The guarantee does not allow this.',
    explanation: "This conditional guarantees that anyone enrolled in law school is a student. A person who was enrolled but wasn't a student would contradict it.",
    caption: 'An enrolled person outside Students would break the rule.',
  },
  {
    key: 'other', label: 'A student outside law school', fits: true,
    result: 'You can be a student without being in law school.',
    explanation: "This conditional tells us about people enrolled in law school. It doesn't say every student is enrolled there. Someone studying history could be a student too.",
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
      <h3 id={titleId}>Law-school students belong inside the student group.</h3>
      <p>Everyone enrolled in law school has to fit inside Students. Try the combinations below and see which ones this conditional allows.</p>
    </header>
    <figure className="sc-membership" data-case={current.key}>
      <div className="sc-group-visual">
        <div className="sc-group-label"><span>Students</span><span className="sc-group-note">The larger group</span></div>
        <svg className="sc-group-drawing" viewBox="0 0 600 310" role="img" aria-labelledby={diagramId}>
          <title id={diagramId}>{current.key === 'contradiction' ? 'An enrolled person outside the student group is crossed out: this combination breaks the guarantee.' : current.key === 'other' ? 'Students outside law school are highlighted inside the student group. This conditional allows this.' : 'The entire law-school group is highlighted inside the student group.'}</title>
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
          {current.key === 'contradiction' && <g className="sc-excluded-person" aria-hidden="true">
            <path d="M165 220v42h165" className="sc-exclusion-guide"/>
            <StudentSymbol x={370} y={275}/>
            <circle cx="370" cy="275" r="29"/>
            <path d="m350 255 40 40"/>
            <text x="415" y="279">Excluded</text>
          </g>}
          {current.key !== 'contradiction' && <g className="sc-diagram-annotation" aria-hidden="true">
            <path d={current.key === 'other' ? 'M445 190v63' : 'M165 190v63'}/>
            <text x={current.key === 'other' ? 445 : 165} y="279" textAnchor="middle">{current.key === 'other' ? 'Allowed too' : 'Always inside'}</text>
          </g>}
        </svg>
        <div className="sc-diagram-key" aria-hidden="true"><span><i/>Enrolled in law school</span><span><i/>Other students</span></div>
      </div>
      <figcaption>{current.caption} Figures show the groups.</figcaption>
    </figure>
    <div className="sc-case-controls" role="group" aria-label="Compare combinations with this conditional">
      {relationships.map((relationship, index) => <button type="button" key={relationship.key} aria-pressed={selected === index} aria-controls={readingId} onClick={() => setSelected(index)}>{relationship.label}</button>)}
    </div>
    <div className="sc-case-reading" id={readingId} aria-live="polite" aria-atomic="true" data-fits={current.fits}>
      <p className="sc-case-verdict"><span aria-hidden="true">{current.fits ? '✓' : '×'}</span>{current.fits ? 'Allowed by this conditional' : 'Breaks the guarantee'}</p>
      <strong>{current.result}</strong>
      <p>{current.explanation}</p>
    </div>
  </section>;
}

const explanations = {
  trigger: {
    label: 'Sufficient condition',
    title: 'Being enrolled in law school is enough to guarantee being a student.',
    text: 'The word “if” introduces being enrolled in law school. That whole idea is the sufficient condition. “If” helps us recognize it; the word itself isn’t the condition.',
  },
  result: {
    label: 'What must be true',
    title: 'Anyone enrolled in law school has to be a student.',
    text: 'This is what the first part guarantees. This conditional doesn’t say you’re probably a student. It says you’re a student.',
  },
  connection: {
    label: 'The guarantee',
    title: 'You cannot have the first condition without the second.',
    text: "If you're enrolled in law school, you have to be a student too. That's the relationship this conditional guarantees.",
  },
} as const;

export function SufficientReasoningWalkthrough() {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<keyof typeof explanations>('trigger');
  const triggerButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const relationshipId = useId();
  const explanationId = useId();
  const current = explanations[selected];
  return <section className="sc-walkthrough" aria-labelledby={headingId}>
    <header><p className="sc-eyebrow">Start with the sufficient condition</p><h3 id={headingId}>What does being enrolled in law school guarantee?</h3><p>Click the sufficient condition to reveal what must follow.</p></header>
    <div className="sc-sentence-map" data-selected={selected} data-revealed={revealed} role="group" aria-label="Explore the sufficient condition and its guarantee">
      <button ref={triggerButton} type="button" className="sc-sentence-part sc-trigger" aria-pressed={revealed && selected === 'trigger'} aria-expanded={revealed} aria-controls={`${relationshipId} ${explanationId}`} onClick={() => { setRevealed(true); setSelected(revealed ? 'trigger' : 'connection'); }}>
        <strong>Being enrolled in law school</strong><span className="sc-clause-role">Sufficient condition</span>
      </button>
      <div id={relationshipId} className="sc-revealed-relationship" hidden={!revealed}>
        <button type="button" className="sc-guarantee" aria-pressed={selected === 'connection'} aria-controls={explanationId} onClick={() => setSelected('connection')}><span>guarantees</span><i aria-hidden="true"/></button>
        <button type="button" className="sc-sentence-part sc-result" aria-pressed={selected === 'result'} aria-controls={explanationId} onClick={() => setSelected('result')}>
          <strong>Being a student</strong><span className="sc-clause-role">What must be true</span>
        </button>
      </div>
    </div>
    <div id={explanationId} className={revealed ? "sc-walkthrough-comment" : undefined} aria-live="polite" aria-atomic="true">
      {revealed && <><p className="sc-eyebrow">{current.label}</p><h4>{current.title}</h4><p>{current.text}</p></>}
    </div>
    {revealed && <button type="button" className="sc-restart" onClick={() => { setRevealed(false); setSelected('trigger'); triggerButton.current?.focus(); }}>Start again</button>}
  </section>;
}
