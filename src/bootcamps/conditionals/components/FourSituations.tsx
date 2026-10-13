import { useEffect, useRef, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { Pill, PulseWord } from './ContrapositiveVisuals';
import { QuickQuiz, type QuizItem } from './SufficientQuiz';
import './four-situations.css';

type Situation = { key: string; idea: string; tone: 'amber' | 'teal'; present: boolean; follows: string; example: string; tag: string; settled: boolean };

// Source: the activation chart in raw/sources/conditional-reasoning-voice-standard/conditional_reasoning_transcription.html.
// Same four rows in the same order; the example is original.
const situations: Situation[] = [
  { key: 'sufficient-present', idea: 'Sufficient', tone: 'amber', present: true, follows: 'The necessary condition must be present.', example: 'The pool is open, so a lifeguard must be on duty.', tag: 'The original rule', settled: true },
  { key: 'necessary-absent', idea: 'Necessary', tone: 'teal', present: false, follows: 'The sufficient condition can’t be present.', example: 'No lifeguard is on duty, so the pool can’t be open.', tag: 'The contrapositive', settled: true },
  { key: 'sufficient-absent', idea: 'Sufficient', tone: 'amber', present: false, follows: 'Nothing!', example: 'The pool is closed. A lifeguard may or may not be on duty.', tag: 'The rule is silent', settled: false },
  { key: 'necessary-present', idea: 'Necessary', tone: 'teal', present: true, follows: 'Nothing!', example: 'A lifeguard is on duty. The pool may or may not be open.', tag: 'The rule is silent', settled: false },
];

/** The four-situation chart. Rows rise in one after another when the chart scrolls into view;
 *  the two that settle something get a green check, the two that settle nothing go quiet. */
function SituationChart() {
  const ref = useRef<HTMLTableElement>(null);
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { setInView(true); observer.disconnect(); } }, { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <table ref={ref} className="fs-chart" data-in-view={inView}>
    <caption className="fs-chart-rule"><span>The rule</span>If the pool is open, then a lifeguard is on duty.</caption>
    <thead><tr><th scope="col">Situation</th><th scope="col">What follows?</th><th scope="col">The pool rule</th></tr></thead>
    <tbody>
      {situations.map((row, index) => <tr key={row.key} data-settled={row.settled} style={{ animationDelay: `${index * 0.14}s` }}>
        <th scope="row" data-label="Situation"><span className="fs-situation"><Pill text={row.idea} tone={row.tone} negated={false}/>{' '}<span>{row.present ? 'present' : 'absent'}</span></span></th>
        <td data-label="What follows?"><span className="fs-follows">{row.settled ? <Check size={18} strokeWidth={3} aria-hidden="true"/> : <Minus size={18} strokeWidth={3} aria-hidden="true"/>}{row.follows}</span></td>
        <td data-label="The pool rule"><span className="fs-tag">{row.tag}</span><span className="fs-example">{row.example}</span></td>
      </tr>)}
    </tbody>
  </table>;
}

const quiz: QuizItem[] = [
  {
    rule: 'If a library book is overdue, the borrower gets a reminder text.',
    question: 'Sam’s book is overdue. What follows?',
    options: [
      { text: 'Nothing. Sam may or may not get a text.', reason: 'An overdue book is the sufficient condition, so the rule applies. Sam gets the text.' },
      { text: 'Sam gets a reminder text.' },
      { text: 'Sam returns the book soon.', reason: 'The rule says nothing about returning the book.' },
    ],
    correct: 1,
    answer: 'Sam’s book is overdue, so Sam gets a reminder text.',
  },
  {
    rule: 'If a library book is overdue, the borrower gets a reminder text.',
    question: 'Lena got a reminder text. What follows about her book?',
    options: [
      { text: 'Her book is overdue.', reason: 'The text could be about something else, like a hold that is ready.' },
      { text: 'Her book is not overdue.', reason: 'A text doesn’t rule out an overdue book either.' },
      { text: 'Nothing. Her book may or may not be overdue.' },
    ],
    correct: 2,
    answer: 'A reminder text is the necessary condition, so it tells you nothing about Lena’s book.',
  },
  {
    rule: 'If a library book is overdue, the borrower gets a reminder text.',
    question: 'Omar got no reminder text. What follows about his book?',
    options: [
      { text: 'His book is not overdue.' },
      { text: 'Nothing. His book may or may not be overdue.', reason: 'An overdue book would have brought a text. No text rules that out.' },
      { text: 'His book is overdue.', reason: 'An overdue book would have brought a text, and Omar got none.' },
    ],
    correct: 0,
    answer: 'Omar got no reminder text, so his book isn’t overdue.',
  },
  {
    rule: 'If a library book is overdue, the borrower gets a reminder text.',
    question: 'Priya’s book is not overdue. What follows?',
    options: [
      { text: 'She gets a reminder text.', reason: 'Nothing in the rule requires a text here.' },
      { text: 'Nothing. She may or may not get a text.' },
      { text: 'She gets no reminder text.', reason: 'She could still get a text for another reason.' },
    ],
    correct: 1,
    answer: 'The rule only speaks when a book is overdue, so it says nothing about Priya.',
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="co-section"><div className="co-section-heading"><h2>{title}</h2></div>{children}</section>;
}

export function FourSituationsNote() {
  return <>
    <Section title="All a rule gives you">
      <p className="ct-definition"><strong>A conditional tells you two things: the original rule and its contrapositive. That is all it tells you.</strong></p>
      <p>Take this rule: <strong>If the pool is open, then a lifeguard is on duty.</strong></p>
      <p>The original: if the pool is open, a lifeguard must be on duty. The contrapositive: <strong>if no lifeguard is on duty, the pool can’t be open.</strong> The rule says nothing else.</p>
    </Section>
    <Section title="Don’t fall for the necessary condition">
      <p>The LSAT will give you a rule, then tell you the necessary condition is present. A lifeguard is on duty! You’ll want to conclude the pool is open. Don’t. The lifeguard could be there for a training session with the pool closed.</p>
      <p>When the necessary condition is present, <PulseWord>the rule tells you nothing</PulseWord>. Set it aside.</p>
    </Section>
    <Section title="Four situations">
      <p>Any fact about a rule puts you in one of four situations. Two of them settle something. Two settle nothing.</p>
      <SituationChart/>
    </Section>
    <Section title="Ask where the fact lands">
      <p>When a rule comes with a fact, check which side the fact is about. Sufficient present or necessary absent, and the rule settles something. Sufficient absent or necessary present, and it settles nothing, so look for help somewhere else in the argument.</p>
    </Section>
  </>;
}

export function FourSituationsQuiz() {
  return <QuickQuiz items={quiz} idPrefix="fs"/>;
}
