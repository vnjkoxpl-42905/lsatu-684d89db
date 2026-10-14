import { useState, type ReactNode } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Pill, PopQuizTitle, PulseWord } from './ContrapositiveVisuals';
import { QuickQuiz, type QuizItem } from './SufficientQuiz';
import { SufficientConditionFilm } from './SufficientConditionFilm';
import { necessaryConditionFilms } from '../content/necessaryConditionFilms';
import './necessary-note.css';

type Part = string | { text: string; role: 'sufficient' | 'necessary' };
type FindDemo = { label: string; parts: Part[]; ifIdea: string; thenIdea: string; result: string; captions: [string, string, string] };

const lawSchool: FindDemo = {
  label: 'Find the requirement in the law-school rule',
  parts: ['You have to be ', { text: 'a student', role: 'necessary' }, ' to be ', { text: 'enrolled in law school', role: 'sufficient' }, '.'],
  ifIdea: 'Enrolled in law school',
  thenIdea: 'A student',
  result: 'If you’re enrolled in law school, then you’re a student.',
  captions: ['This is the rule. Click Step 1.', 'Being a student is what the rule requires. Now click Step 2.', 'The requirement goes after “then.” What requires it goes after “if.”'],
};

const fuel: FindDemo = {
  label: 'A rule that names the requirement first',
  parts: [{ text: 'Fuel', role: 'necessary' }, ' is necessary for ', { text: 'the car to start', role: 'sufficient' }, '.'],
  ifIdea: 'The car starts',
  thenIdea: 'It has fuel',
  result: 'If the car starts, then it has fuel.',
  captions: ['This rule names the requirement first. Click Step 1.', 'Fuel is the requirement, even though it comes first. Now click Step 2.', 'Fuel still goes after “then.” Its place in the sentence doesn’t decide its role.'],
};

/** Step 1 sweeps a highlight across the requirement in the sentence. Step 2 drops both ideas into an if-then frame. */
function FindTheRequirement({ label, parts, ifIdea, thenIdea, result, captions }: FindDemo) {
  const [stage, setStage] = useState(0);
  return <div className="ns-find" data-stage={stage} role="group" aria-label={label}>
    <p className="ns-find-rule"><span>The rule</span>{parts.map((part, index) => typeof part === 'string' ? part : <mark key={index} className="ns-mark" data-role={part.role} data-lit={part.role === 'necessary' ? stage >= 1 : stage >= 2}>{part.text}</mark>)}</p>
    <div className="ns-frame" data-show={stage >= 2} aria-hidden={stage < 2}>
      <span className="ns-frame-word">If</span><span className="ns-slot" data-role="sufficient">{ifIdea}</span>
      <span className="ns-frame-word">then</span><span className="ns-slot" data-role="necessary">{thenIdea}</span>
    </div>
    {stage >= 2 && <p className="ns-find-result"><span>Read it as</span>{result}</p>}
    <p className="ns-find-caption" role="status">{captions[stage]}</p>
    <div className="ct-flip-controls">
      <button type="button" className="ct-step" data-ready={stage === 0} data-done={stage >= 1} disabled={stage !== 0} onClick={() => setStage(1)}><b aria-hidden="true">{stage >= 1 ? <Check size={16} strokeWidth={3}/> : 1}</b>Step 1. Click here to find the requirement</button>
      <button type="button" className="ct-step" data-ready={stage === 1} data-done={stage >= 2} disabled={stage !== 1} onClick={() => setStage(2)}><b aria-hidden="true">{stage >= 2 ? <Check size={16} strokeWidth={3}/> : 2}</b>Step 2. Click here to put it after “then”</button>
      {stage > 0 && <button type="button" className="ct-flip-reset" onClick={() => setStage(0)}><RotateCcw size={15} aria-hidden="true"/>Start over</button>}
    </div>
  </div>;
}

const groupTwoWords = ['only', 'only if', 'only when', 'only where', 'always', 'requires', 'must'];

/** The one look-alike that fails beside the reading that holds. */
function RequiredNotEnough() {
  const cards: { verdict: 'wrong' | 'right'; how: string; left: string; leftTone: 'amber' | 'teal'; right: string; rightTone: 'amber' | 'teal' }[] = [
    { verdict: 'wrong', how: 'Treat the requirement as enough.', left: 'Student', leftTone: 'teal', right: 'Enrolled', rightTone: 'amber' },
    { verdict: 'right', how: 'Enrollment guarantees the requirement.', left: 'Enrolled', leftTone: 'amber', right: 'Student', rightTone: 'teal' },
  ];
  return <div className="ns-cards">{cards.map(card => <article key={card.verdict} className="ct-move" data-verdict={card.verdict}>
    <p className="ct-move-badge">{card.verdict === 'right' ? <Check size={16} strokeWidth={3} aria-hidden="true"/> : <X size={16} strokeWidth={3} aria-hidden="true"/>}{card.verdict === 'right' ? 'Right' : 'Wrong'}</p>
    <p className="ct-move-how">{card.how}</p>
    <p className="ct-move-diagram" aria-label={`${card.left} → ${card.right}`}><Pill text={card.left} tone={card.leftTone} negated={false}/><span aria-hidden="true">→</span><Pill text={card.right} tone={card.rightTone} negated={false}/></p>
  </article>)}</div>;
}

const quiz: QuizItem[] = [
  {
    rule: 'Every bike in the race has working brakes.',
    question: 'Which idea is required?',
    options: [
      { text: 'In the race', tone: 'amber', reason: 'Being in the race guarantees the brakes. It isn’t the requirement.' },
      { text: 'Working brakes', tone: 'teal' },
      { text: 'Any bike', tone: 'amber', reason: 'The rule only covers bikes in the race.' },
    ],
    correct: 1,
    answer: 'If a bike is in the race, then it has working brakes.',
  },
  {
    rule: 'Every bike in the race has working brakes.',
    question: 'Kai’s bike has working brakes. Is it in the race?',
    options: [
      { text: 'Yes, it’s in the race.', reason: 'Brakes are required, not enough. Plenty of bikes with good brakes never race.' },
      { text: 'No, it isn’t.', reason: 'The rule doesn’t rule the race out either.' },
      { text: 'Nothing settles it. It may or may not be in the race.' },
    ],
    correct: 2,
    answer: 'If a bike has working brakes, the rule doesn’t say whether it’s in the race.',
  },
  {
    rule: 'You must show a passport to board the flight.',
    question: 'Which idea is required?',
    options: [
      { text: 'Show a passport', tone: 'teal' },
      { text: 'Board the flight', tone: 'amber', reason: 'Boarding is what needs the passport.' },
    ],
    correct: 0,
    answer: 'If you board the flight, then you showed a passport.',
  },
  {
    rule: 'Flour is necessary to bake this bread.',
    question: 'Which idea goes after “then”?',
    options: [
      { text: 'Bake this bread', tone: 'amber', reason: 'Baking is what needs the flour, so it goes after “if.”' },
      { text: 'Flour', tone: 'teal' },
    ],
    correct: 1,
    answer: 'If you bake this bread, then you have flour.',
  },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="co-section"><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

/** The Necessary Condition page, built to the Contrapositive page's shape. */
export function NecessaryNote() {
  return <>
    <Section title="What a necessary condition is">
      <p className="ct-definition"><strong>A necessary condition is a requirement. It has to be met, but meeting it might not be enough.</strong></p>
      <p>You have to be a student to be enrolled in law school. Being a student is <strong>necessary</strong> for law-school enrollment. But being a student doesn’t prove you’re enrolled. You could be studying history.</p>
    </Section>
    <Section title="Where the certainty is">
      <p><strong>The necessary condition is what you can guarantee will occur if the sufficient condition happens.</strong></p>
      <p>Look at the name. It's called necessary because it is necessary. If someone is enrolled in law school, being a student has to be true.</p>
      <p>The sufficient condition opens the door. Once it's open, the necessary condition is guaranteed to be on the other side. That makes it <PulseWord>the place of certainty.</PulseWord> It's what you can prove.</p>
    </Section>
    <Section title="Watch the lesson">
      <SufficientConditionFilm assets={necessaryConditionFilms} title="Why the requirement is not enough" ariaLabel="Short explanation of necessity"/>
    </Section>
    <Section title="How to find it">
      <ol className="ct-moves">
        <li><strong>Step 1: Find the requirement.</strong> Ask what has to be true if the other idea happens.</li>
        <li><strong>Step 2: Put it after “then.”</strong> The idea that requires it goes after “if.”</li>
      </ol>
      <FindTheRequirement {...lawSchool}/>
      <p>Same two steps when the rule names the requirement first:</p>
      <FindTheRequirement {...fuel}/>
    </Section>
    <Section title="Words that mark the requirement">
      <p>In the fuel rule, <strong>necessary</strong> marked the requirement. These Group 2 words and phrases mark it too:</p>
      <ul className="ns-words">{groupTwoWords.map(word => <li key={word}>{word}</li>)}</ul>
      <p>The indicator is the word. The necessary condition is the whole idea it points to.</p>
    </Section>
    <Section title="What it is not">
      <p>A requirement is not a guarantee. Wrong answer choices count on you forgetting that.</p>
      <RequiredNotEnough/>
    </Section>
    <Section title="Picture it on its own">
      <p>When you find the requirement, picture it true while the other idea is false. A history student. A car with fuel and a dead battery. If that picture fits the rule, you have a requirement, and it proves nothing by itself.</p>
    </Section>
    <section className="co-section"><div className="co-section-heading"><PopQuizTitle/></div><QuickQuiz items={quiz} idPrefix="nq"/></section>
  </>;
}
