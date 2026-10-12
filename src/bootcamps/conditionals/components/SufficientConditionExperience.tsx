import { useId, useRef, useState } from 'react';
import './sufficient-condition-experience.css';

const relationships = [
  {
    key: 'both', label: 'Enrolled and a student', fits: true,
    result: 'If someone is enrolled in law school, then they are a student.',
  },
  {
    key: 'contradiction', label: 'Enrolled, but not a student', fits: false,
    result: 'Enrolled but not a student can\'t happen.',
  },
  {
    key: 'other', label: 'A student outside law school', fits: true,
    result: "If someone isn't enrolled in law school, they might or might not be a student.",
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
      <h3 id={titleId}>Test the rule</h3>
      <p className="sc-rule-line">If you're enrolled in law school, you're a student.</p>
      <p>Click a combination to check it against the rule.</p>
    </header>
    <figure className="sc-membership" data-case={current.key}>
      <div className="sc-group-visual">
        <div className="sc-group-label"><span>Students</span><span className="sc-group-note">The larger group</span></div>
        <svg className="sc-group-drawing" viewBox="0 0 600 310" role="img" aria-labelledby={diagramId}>
          <title id={diagramId}>{current.key === 'contradiction' ? 'An enrolled person outside the student group is crossed out: this combination breaks the guarantee.' : current.key === 'other' ? 'Students outside law school are highlighted inside the student group: one allowed possibility. Someone outside law school could also be outside both groups.' : 'The entire law-school group is highlighted inside the student group.'}</title>
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
    </figure>
    <div className="sc-case-controls" role="group" aria-label="Compare combinations with this conditional">
      {relationships.map((relationship, index) => <button type="button" key={relationship.key} aria-pressed={selected === index} aria-controls={readingId} onClick={() => setSelected(index)}>{relationship.label}</button>)}
    </div>
    <div className="sc-case-reading" id={readingId} aria-live="polite" aria-atomic="true" data-fits={current.fits}>
      <p className="sc-case-verdict"><span aria-hidden="true">{current.fits ? '✓' : '×'}</span>{current.fits ? 'Allowed by this conditional' : 'Breaks the guarantee'}</p>
      <strong>{current.result}</strong>
    </div>
  </section>;
}

const explanations = {
  trigger: {
    label: 'Sufficient condition',
    title: 'Enrollment is enough on its own.',
    text: "Knowing that someone is enrolled in law school is enough to know they're a student. You don't need another fact about them.",
  },
  result: {
    label: 'What must be true',
    title: 'Being a student is guaranteed.',
    text: 'Once enrollment is proven, being a student is certain. It is more than a possibility or a likely outcome.',
  },
  connection: {
    label: 'The guarantee',
    title: 'The guarantee runs in one direction.',
    text: "Follow it from being enrolled in law school to being a student. Starting with being a student doesn't tell you whether someone is enrolled in law school; they could study history instead.",
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
