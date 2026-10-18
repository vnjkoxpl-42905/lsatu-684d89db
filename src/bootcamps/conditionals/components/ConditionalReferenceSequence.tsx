import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './reference-sequence.css';
import { NegativeCaseLab } from './CounterexampleLab';
import { StudyDeck } from './StudyDeck';
import type { LessonPage } from './LessonPages';
import { SufficientConditionExperience } from './SufficientConditionExperience';
import { SufficientQuiz } from './SufficientQuiz';
import { SufficientConditionFilm } from './SufficientConditionFilm';
import { necessaryConditionFilms } from '../content/necessaryConditionFilms';
import { NecessaryConditionExperience } from './NecessaryConditionExperience';
import { NecessaryConditionStatement } from './NecessaryConditionStatement';
import { NecessaryIndicatorExplorer } from './NecessaryIndicatorExplorer';
import { Neg, Notation, PopQuizTitle } from './ContrapositiveVisuals';

const raffleRule = 'If you win the raffle, you get a bicycle.';

function ReferenceStep({ number, title, label, children, dark = false, part }: { part?: number; number: number; title: string; label: string; children: ReactNode; dark?: boolean }) {
  return <section id={`reference-step-${number}${part ? `-${part}` : ''}`} data-reference-step={number} data-toc data-toc-title={label} className={`cr-step co-section ${dark ? 'cr-dark' : ''}`}>
    <header className="cr-step-heading"><span className="cr-number" aria-hidden="true">{String(number).padStart(2, '0')}</span><div><p className="co-kicker">{label}</p><h2>{title}</h2></div></header>
    <div className="cr-step-body">{children}</div>
  </section>;
}

export function ReferenceQuestion({ prompt, options, correct, feedback, onAttempt }: { prompt: string; options: string[]; correct: number; feedback: string[]; onAttempt?: (choice: number | null) => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const id = useId();
  const firstChoice = useRef<HTMLButtonElement>(null);
  return <div className="cr-question co-check"><h3 id={id}><Notation text={prompt}/></h3><div className="cr-answer-options" role="group" aria-labelledby={id}>
    {options.map((option, index) => <button ref={index === 0 ? firstChoice : undefined} type="button" key={option} aria-pressed={choice === index} onClick={() => { setChoice(index); onAttempt?.(index); }}><Notation text={option}/></button>)}
  </div><div role="status" aria-live="polite">{choice !== null && <div className={`cr-feedback ${choice === correct ? 'cr-correct' : 'cr-revise'}`}><strong>{choice === correct ? 'Correct.' : 'Not quite.'}</strong><p>{feedback[choice]}</p></div>}</div>
    {choice !== null && <button className="cr-reset" type="button" onClick={() => { firstChoice.current?.focus(); setChoice(null); onAttempt?.(null); }}>Try again</button>}
  </div>;
}

function HypotheticalFigure() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .35 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <figure className="cr-hypothetical co-if-connection" ref={ref} data-in-view={inView}>
    <div className="cr-if"><span>IF</span><strong>this condition is true</strong><small>A case to imagine</small></div>
    <div className="cr-connection" aria-hidden="true"><i/><i/><i/></div>
    <div className="cr-then"><span>THEN</span><strong>the other condition has to be true</strong><small>What the rule proves</small></div>
    <figcaption>If the first condition is true, the other must be true. Imagining that case doesn't tell us it happened.</figcaption>
  </figure>;
}

type FamilyEntry = { word: string; sentence: string; explanation: string };
const sufficientFamily: FamilyEntry[] = [
  { word: 'if', sentence: 'If someone borrows a locker, they have a key.', explanation: 'Borrowing a locker is enough to prove that the person has a key.' },
  { word: 'when / whenever', sentence: 'Whenever someone borrows a locker, they have a key.', explanation: 'Whenever covers every occasion of borrowing. A report that something happened once when someone borrowed a locker would not prove this general rule.' },
  { word: 'any / anytime', sentence: 'Any person who borrows a locker has a key.', explanation: 'Pick any person meeting the borrowing condition. The rule gives that person a key. Anytime someone borrows a locker, they have a key expresses the same connection across occasions.' },
  { word: 'all', sentence: 'All people who borrow a locker have a key.', explanation: 'All covers every person in the described group. Keep who borrow a locker with people; the rule is not about everyone.' },
  { word: 'every / every time', sentence: 'Every person who borrows a locker has a key.', explanation: 'Every member of this group meets the other condition. Every time someone borrows a locker, they have a key keeps the rule while speaking about occasions.' },
  { word: 'in order to', sentence: 'In order to borrow a locker, a person needs a key.', explanation: 'Borrowing the locker is the goal. Having a key is its requirement. This does not say that having a key is enough to borrow a locker.' },
  { word: 'people who', sentence: 'People who borrow a locker have a key.', explanation: 'People who borrow a locker names the complete group being described. For a person in that group, having a key follows.' },
  { word: 'each', sentence: 'Each person who borrows a locker has a key.', explanation: 'Each applies the statement to every individual locker borrower. We have changed the wording, not what borrowing proves.' },
];
const necessaryFamily: FamilyEntry[] = [
  { word: 'then', sentence: 'If someone borrows a locker, then they have a key.', explanation: 'Then introduces what the borrowing condition proves: the person has a key.' },
  { word: 'must', sentence: 'A person borrowing a locker must have a key.', explanation: 'Here we are describing a requirement under the stated rule. If must appears in an instruction instead, keep that meaning: a required action is not proof that someone completed it.' },
  { word: 'necessary', sentence: 'Having a key is necessary for borrowing a locker.', explanation: 'Ask necessary for what? For borrowing a locker. Having a key is the requirement, not a promise that someone borrowed.' },
  { word: 'required', sentence: 'Having a key is required for borrowing a locker.', explanation: 'Required names the same rule. Every locker borrower meets the key requirement.' },
  { word: 'only / only if', sentence: 'A person borrows a locker only if they have a key.', explanation: 'Only if makes having a key necessary. Only people with a key borrow a locker says the same thing. Neither gives a locker to every person with a key.' },
  { word: 'depends', sentence: 'Borrowing a locker depends on having a key.', explanation: 'Having a key is what the borrowing depends on. The rule does not make the key enough by itself.' },
  { word: 'need / need to', sentence: 'A person needs a key to borrow a locker.', explanation: 'What does the person need? A key. A person needs to have a key to borrow a locker expresses the same requirement.' },
  { word: 'have to', sentence: 'A person has to have a key to borrow a locker.', explanation: 'Having a key is required for borrowing. Read have to have a key as one complete requirement.' },
  { word: 'essential', sentence: 'Having a key is essential for borrowing a locker.', explanation: 'Essential for borrowing names the requirement. The borrowing cannot meet this rule without the key.' },
  { word: 'precondition', sentence: 'Having a key is a precondition for borrowing a locker.', explanation: 'A precondition is something the other condition requires. Do not infer that the requirement was sufficient, or invent a timeline from the label.' },
];

export function WordFamily({ entries, role }: { entries: FamilyEntry[]; role: 'sufficient' | 'necessary' }) {
  const [selected, setSelected] = useState<number | null>(null);
  const regionId = useId();
  const firstExpression = useRef<HTMLButtonElement>(null);
  return <div className={`cr-family co-lab cr-family-${role}`}>
    <p className="cr-instruction">Choose an indicator. Read its sentence before comparing the explanation.</p>
    <ol className="cr-family-list">{entries.map((entry, index) => <li key={entry.word}><button ref={index === 0 ? firstExpression : undefined} type="button" aria-pressed={selected === index} aria-controls={regionId} onClick={() => setSelected(index)}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{entry.word}</button></li>)}</ol>
    <div id={regionId} className="cr-family-reading" aria-live="polite">{selected === null ? <p>The words vary. We'll keep the same locker rule while reading each one.</p> : <><p className="co-kicker">{entries[selected].word}</p><blockquote>{entries[selected].sentence}</blockquote><p>{entries[selected].explanation}</p><div className="cr-family-role"><span>{role === 'sufficient' ? 'Enough to prove the other condition' : 'Required for the other condition'}</span><strong>{role === 'sufficient' ? 'Borrows a locker' : 'Has a key'}</strong></div></>}</div>
    {selected !== null && <button type="button" className="cr-reset" onClick={() => { firstExpression.current?.focus(); setSelected(null); }}>Clear the example</button>}
  </div>;
}

const cases = [
  { label: 'Sufficient present', fact: 'You win the raffle.', question: 'What do we know about getting a bicycle?', options: ['You get a bicycle.', "You don't get a bicycle.", 'Getting a bicycle is not settled.'], correct: 0, reasoning: ['Winning meets the sufficient condition. Under the rule, you get a bicycle.', 'Winning without getting a bicycle would violate the rule. Winning proves that you get a bicycle.', 'The rule covers you if you win. Getting a bicycle is settled here.'] },
  { label: 'Necessary absent', fact: "You don't get a bicycle.", question: 'What do we know about winning the raffle?', options: ['You win the raffle.', "You don't win the raffle.", 'Winning the raffle is not settled.'], correct: 1, reasoning: ['If you won, you would get a bicycle. That conflicts with the given outcome.', 'The missing requirement rules out winning. Winning without getting a bicycle cannot fit the rule.', "We can settle it. Winning would require getting a bicycle, and that result doesn't occur."] },
  { label: 'Sufficient absent', fact: "You don't win the raffle.", question: 'What do we know about getting a bicycle?', options: ['You get a bicycle.', "You don't get a bicycle.", 'Getting a bicycle is not settled.'], correct: 2, reasoning: ["You could get one by buying it or receiving a gift. But the rule doesn't prove that you do.", "You could buy a bicycle without winning. The rule hasn't made the raffle the only way to get one.", "Both getting a bicycle without winning and not getting one without winning fit the rule. Getting a bicycle remains open."] },
  { label: 'Necessary present', fact: 'You get a bicycle.', question: 'What do we know about winning the raffle?', options: ['You win the raffle.', "You don't win the raffle.", 'Winning the raffle is not settled.'], correct: 2, reasoning: ["You might get it by winning, but you could buy it or receive it as a gift. Getting a bicycle alone doesn't prove winning.", "You could win and get a bicycle. Nothing in the fact rules out winning.", 'You could get a bicycle with or without winning the raffle. Having the required result does not prove the sufficient condition.'] },
];
function FourCaseExplorer() {
  const [selected, setSelected] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const current = cases[selected];
  const answer = answers[selected];
  return <div className="cr-cases co-lab"><p className="co-kicker">One rule. Four starting facts.</p><blockquote>{raffleRule}</blockquote>
    <div className="cr-case-tabs" role="group" aria-label="Choose a starting fact">{cases.map((item, index) => <button type="button" key={item.label} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</button>)}</div>
    <div className="cr-case-fact"><span>Given</span><strong>{current.fact}</strong></div><h3>{current.question}</h3>
    <div className="cr-answer-options" role="group" aria-label="Choose what follows">{current.options.map((option, index) => <button type="button" key={option} aria-pressed={answer === index} onClick={() => setAnswers({ ...answers, [selected]: index })}>{option}</button>)}</div>
    <div role="status">{answer !== undefined && <div className={`cr-feedback ${answer === current.correct ? 'cr-correct' : 'cr-revise'}`}><strong>{answer === current.correct ? 'Correct.' : 'Not quite.'}</strong><p>{current.reasoning[answer]}</p></div>}</div>
    {Object.keys(answers).length === 4 && <div className="cr-case-review"><h3>Keep these four distinctions</h3><dl>{cases.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.options[item.correct]}</dd></div>)}</dl><p>The rule still holds in all four cases. Two facts give an inference; two leave the other condition open.</p></div>}
    <button type="button" className="cr-reset" onClick={() => { setAnswers({}); setSelected(0); }}>Reset the four cases</button>
  </div>;
}

function ContrapositiveDiscovery() {
  const [attempted, setAttempted] = useState(false);
  return <div className="cr-discovery"><p>Use this stated rule for a different case.</p><blockquote>If a report is in the published archive, it has an approval stamp.</blockquote>
    <p>A report in that archive has to carry the stamp. Now you inspect Report K. It has no approval stamp.</p>
    <ReferenceQuestion prompt="Could Report K be in the published archive while this rule holds?" options={['Yes, its location is unrestricted.', 'No, it cannot be in that archive.', 'Yes, the missing stamp puts it in the archive.']} correct={1} onAttempt={choice => setAttempted(choice !== null)} feedback={['Its location is restricted by the rule. If K were in the archive, it would have a stamp, which conflicts with the given fact.', 'An archived K would have to have a stamp. K has no stamp, so it cannot be in the published archive under this rule.', 'The missing stamp rules out archive membership. It does not prove it.']}/>
    {attempted && <div className="cr-discovery-reasoning"><p>That way of using the rule is the <strong>contrapositive</strong>: when the necessary condition is absent, the sufficient condition cannot be present.</p>
      <p>It is the same rule. We didn't add a second rule; we worked out a consequence already contained in the first one.</p>
      <blockquote>{raffleRule}</blockquote>
      <p>Here, “you don't get a bicycle” means you never receive the promised outcome. It does not mean you're still waiting for a prize that will arrive later.</p>
      <ReferenceQuestion prompt="You don't get a bicycle. What follows about winning the raffle?" options={["You don't win the raffle.", 'You win the raffle.', 'Nothing follows about winning.']} correct={0} feedback={['Winning would require getting a bicycle. Since that outcome does not occur, you cannot have won under the rule.', 'Winning without getting a bicycle would break the rule. The absent requirement excludes winning.', 'The missing requirement does give an inference. If you won, you would get a bicycle.']}/>
      <p>Don't confuse that with starting from a requirement that is present. You could get a bicycle as a gift without winning. Let's compare all four starting facts.</p>
    </div>}
  </div>;
}

export function RuleDiagram({ left, right, label, leftNot, rightNot }: { left: string; right: string; label?: string; leftNot?: boolean; rightNot?: boolean }) {
  const side = (text: string, negated?: boolean) => negated ? <Neg>{text}</Neg> : text;
  return <div className="cr-diagram" role="img" aria-label={label || `${leftNot ? 'not ' : ''}${left} implies ${rightNot ? 'not ' : ''}${right}`}><strong>{side(left, leftNot)}</strong><span aria-hidden="true">→</span><strong>{side(right, rightNot)}</strong></div>;
}
const writingSteps = [
  { button: 'Find the indicator', explanation: 'I see if. It introduces the sufficient condition: you win the raffle.' },
  { button: 'Draw the must arrow', explanation: 'The arrow connects the sufficient condition to the necessary condition. It means that when the left holds, the right has to hold.' },
  { button: 'Put winning on the left', explanation: 'Win the raffle is the complete sufficient condition. I shorten it to Win and put it on the left. Win means winning this raffle, not any other contest.' },
  { button: 'Fill the remaining condition', explanation: 'The other condition is that you get a bicycle. I shorten it to Get bicycle and put it on the right. Keep getting a bicycle distinct from merely owning one already.' },
];
export function IncrementalWriter() {
  const [step, setStep] = useState(0);
  const resetControl = useRef<HTMLButtonElement>(null);
  return <div className="cr-writer co-lab"><blockquote>{step > 0 ? <><mark>If</mark> you win the raffle, you get a bicycle.</> : raffleRule}</blockquote>
    <div className="cr-writing-sheet" aria-label="Diagram construction"><span className="cr-paper-label">Our diagram</span>{step < 2 ? <p>The rule is our starting point.</p> : <RuleDiagram left={step >= 3 ? 'Win' : 'Not placed yet'} right={step >= 4 ? 'Get bicycle' : 'Not placed yet'} />}</div>
    <div role="status">{step > 0 && <div className="cr-feedback"><strong>Step {step} of 4</strong><p>{writingSteps[step - 1].explanation}</p>{step === 4 && <p>Read it back: if you win the raffle, you get a bicycle. We shortened the words and kept the rule.</p>}</div>}</div>
    <div className="cr-control-row">{step < 4 && <button type="button" className="cr-primary" onClick={() => { if (step === 3) resetControl.current?.focus(); setStep(step + 1); }}>{writingSteps[step].button}</button>}<button ref={resetControl} type="button" className="cr-reset" onClick={() => setStep(0)}>Reset the construction</button></div>
  </div>;
}

const signPatterns = [
  { label: 'Neither side negative', sentence: raffleRule, legend: 'W = win the raffle. B = get a bicycle.', original: 'W → B', options: ['B → W', '~B → ~W', '~W → ~B'], correct: 1, reading: "If you don't get a bicycle, you don't win the raffle.", wrongFeedback: ['Getting a bicycle as a gift without winning would fit the original. Your arrow makes every bicycle receipt proof of winning. Reverse both sides and negate both, not just reverse.', '', "You could buy a bicycle without winning. You negated the sides without reversing them. Start from not getting a bicycle, the missing required result."] },
  { label: 'Necessary side negative', sentence: 'If the machine is testing, its indicator is not lit.', legend: 'T = machine is testing. L = indicator is lit.', original: 'T → ~L', options: ['L → ~T', '~L → T', '~T → L'], correct: 0, reading: 'If its indicator is lit, the machine is not testing.', wrongFeedback: ['', 'An unlit indicator could occur while the machine is idle. You used the required not-lit condition to prove testing. Its absence is lit, and that rules out testing.', 'An idle machine could still have an unlit indicator. Not testing does not prove lit. Reverse the sides as well as negating them.'] },
  { label: 'Sufficient side negative', sentence: 'If the café is not closed, its doors are unlocked.', legend: 'C = café is closed. U = doors are unlocked.', original: '~C → U', options: ['U → ~C', 'C → ~U', '~U → C'], correct: 2, reading: 'If the doors are not unlocked, the café is closed.', wrongFeedback: ['A closed café could have unlocked doors without violating the original. You reversed the arrow unchanged. The missing requirement is not unlocked.', 'Closing the café does not prove its locks. You negated without reversing. Start from doors that are not unlocked; then the not-closed condition cannot hold.', ''] },
  { label: 'Both sides negative', sentence: 'If an item is not marked fragile, it is not on the glass shelf.', legend: 'F = item is marked fragile. G = item is on the glass shelf.', original: '~F → ~G', options: ['~G → ~F', 'G → F', 'F → G'], correct: 1, reading: 'If an item is on the glass shelf, it is marked fragile.', wrongFeedback: ['A fragile item on another shelf fits the original. Off the glass shelf does not mean not fragile. Reverse and negate both conditions, so both existing not-signs disappear.', '', 'A fragile item can be stored elsewhere. Your arrow gives every fragile item a place on this shelf. Negating both conditions without reversing them changes the rule.'] },
];
function SignPatterns() {
  return <div className="cr-pattern-grid">{signPatterns.map((item, index) => <div className="cr-pattern" key={item.label}><p className="co-kicker">{index + 1}. {item.label}</p><p>{item.sentence}</p><p className="cr-legend">{item.legend}</p><div className="cr-formula"><Notation text={item.original}/></div><ReferenceQuestion prompt={`Which is the contrapositive of ${item.original}?`} options={item.options} correct={item.correct} feedback={item.options.map((_, option) => option === item.correct ? `${item.reading} This is the same rule: the missing necessary condition rules out the sufficient one.` : item.wrongFeedback[option])}/></div>)}</div>;
}

type TargetExample = { label: string; before: string; target: string; after: string; options: string[]; correct: number; feedback: string[] };
export const targetExamples: TargetExample[] = [
  { label: 'Group after the indicator', before: 'Only ', target: 'reports with editor approval', after: ' are published.', options: ['reports', 'reports with editor approval', 'published'], correct: 1, feedback: ['Reports alone drops with editor approval. The statement restricts publication to that qualified group.', 'Only refers to reports with editor approval. Keep that qualification; it is the required idea.', 'Published is the other condition. Only limits which reports can meet it.'] },
  { label: 'Group before the indicator', before: '', target: 'Editor approval', after: ' is necessary for publication.', options: ['publication', 'editor approval'], correct: 1, feedback: ['Publication is what has the requirement. Editor approval is what the rule calls necessary.', 'The group comes before necessary. Editor approval is the requirement for publication.'] },
  { label: 'The same word can move', before: 'Publication makes it necessary to have ', target: 'editor approval', after: '.', options: ['publication', 'editor approval'], correct: 1, feedback: ['Publication still needs something. Moving necessary earlier has not made publication the requirement.', 'Editor approval is still what publication requires. Here the group comes after necessary; in the previous sentence it came before.'] },
];
export function TargetReader({ item }: { item: TargetExample }) {
  const [choice, setChoice] = useState<number | null>(null);
  const correct = choice === item.correct;
  const id = useId();
  const firstTarget = useRef<HTMLButtonElement>(null);
  return <div className="cr-target co-lab"><p className="co-kicker">{item.label}</p><blockquote>{item.before}{correct ? <mark>{item.target}</mark> : item.target}{item.after}</blockquote><h3 id={id}>Which complete idea does the indicator refer to?</h3><div className="cr-answer-options" role="group" aria-labelledby={id}>{item.options.map((option, index) => <button ref={index === 0 ? firstTarget : undefined} key={option} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)}>{option}</button>)}</div><div role="status">{choice !== null && <div className={`cr-feedback ${correct ? 'cr-correct' : 'cr-revise'}`}><strong>{correct ? 'Correct group.' : 'Not quite.'}</strong><p>{item.feedback[choice]}</p></div>}</div>{choice !== null && <button type="button" className="cr-reset" onClick={() => { firstTarget.current?.focus(); setChoice(null); }}>Clear the group</button>}</div>;
}

type PracticeItem = { sentence: string; left: string; right: string; leftCode: string; rightCode: string; leftNegated?: boolean; rightNegated?: boolean; originalPosition: number; contraPosition: number; why: string; readback: string; contraReadback: string };
export const referencePracticeItems: PracticeItem[] = [
  { sentence: 'If a parcel has a red tracking tag, its sender has paid for tracking.', left: 'Parcel has red tracking tag', right: 'Sender has paid for tracking', leftCode: 'RT', rightCode: 'PT', originalPosition: 1, contraPosition: 2, why: 'The if-clause is enough to prove payment. A sender who paid could have a parcel without this tag; payment alone does not settle the tag.', readback: 'If a parcel has a red tracking tag, its sender has paid for tracking.', contraReadback: 'If its sender has not paid for tracking, the parcel does not have a red tracking tag.' },
  { sentence: 'Every applicant who submits by Friday receives a confirmation.', left: 'Applicant submits by Friday', right: 'Applicant receives confirmation', leftCode: 'SF', rightCode: 'RC', originalPosition: 2, contraPosition: 0, why: 'Keep who submits by Friday with applicant. The rule gives those applicants confirmations; it does not restrict all confirmations to them.', readback: 'If an applicant submits by Friday, the applicant receives a confirmation.', contraReadback: 'If an applicant does not receive a confirmation, the applicant did not submit by Friday.' },
  { sentence: 'A document is stored in the archive only if it has a catalogue number.', left: 'Document stored in archive', right: 'Document has catalogue number', leftCode: 'A', rightCode: 'C', originalPosition: 0, contraPosition: 1, why: 'Only if identifies the catalogue number as required. A numbered document could remain outside the archive.', readback: 'If a document is stored in the archive, it has a catalogue number.', contraReadback: 'If a document has no catalogue number, it is not stored in the archive.' },
  { sentence: 'A backup copy is required for a file to be deleted.', left: 'File is deleted', right: 'File has backup copy', leftCode: 'D', rightCode: 'B', originalPosition: 1, contraPosition: 0, why: 'The requirement appears first in the rule. Deletion requires the backup; having a backup does not prove deletion.', readback: 'If a file is deleted, it has a backup copy.', contraReadback: 'If a file has no backup copy, it is not deleted under this rule.' },
  { sentence: 'Only guests with prepaid tickets enter the balcony.', left: 'Guest enters balcony', right: 'Guest has prepaid ticket', leftCode: 'E', rightCode: 'P', originalPosition: 2, contraPosition: 1, why: 'Only restricts balcony entrants to guests with prepaid tickets. A ticketed guest can stay outside, so the ticket alone is not enough.', readback: 'If a guest enters the balcony, the guest has a prepaid ticket.', contraReadback: 'If a guest does not have a prepaid ticket, the guest does not enter the balcony.' },
  { sentence: 'The only recipes printed on the weekly menu are vegan recipes.', left: 'Recipe printed on weekly menu', right: 'Recipe is vegan', leftCode: 'M', rightCode: 'V', originalPosition: 0, contraPosition: 2, why: 'The only recipes printed on the weekly menu names the group whose recipes must be vegan. Other vegan recipes can be absent from the menu.', readback: 'If a recipe is printed on the weekly menu, it is vegan.', contraReadback: 'If a recipe is not vegan, it is not printed on the weekly menu.' },

  { sentence: 'If a parcel has not cleared customs, it stays in the holding room.', left: 'Parcel has cleared customs', right: 'Parcel stays in holding room', leftCode: 'C', rightCode: 'H', leftNegated: true, originalPosition: 2, contraPosition: 1, why: 'Not having cleared customs is enough to prove the holding room. A parcel outside that room cannot be one that has not cleared customs, so it has cleared customs. Negating not cleared removes the not.', readback: 'If a parcel has not cleared customs, it stays in the holding room.', contraReadback: 'If a parcel does not stay in the holding room, it has cleared customs.' },
  { sentence: 'If the display is active, its status light is not red.', left: 'Display is active', right: 'Status light is red', leftCode: 'A', rightCode: 'R', rightNegated: true, originalPosition: 1, contraPosition: 2, why: 'An active display requires a light that is not red. A red light is the absence of that requirement, so it rules out an active display. A light that is not red does not prove the display is active.', readback: 'If the display is active, its status light is not red.', contraReadback: 'If the status light is red, the display is not active.' },
  { sentence: 'If a room is not reserved, its door is not locked.', left: 'Room is reserved', right: 'Door is locked', leftCode: 'R', rightCode: 'L', leftNegated: true, rightNegated: true, originalPosition: 0, contraPosition: 1, why: 'The rule requires an unlocked door for a room that is not reserved. A locked door rules out that not-reserved condition, proving a reservation. Reversing and negating removes both existing not-signs; it does not make reservation enough for locking.', readback: 'If a room is not reserved, its door is not locked.', contraReadback: 'If a room’s door is locked, the room is reserved.' },
];
function practiceDiagrams(item: PracticeItem) {
  const left = `${item.leftNegated ? '~' : ''}${item.leftCode}`;
  const right = `${item.rightNegated ? '~' : ''}${item.rightCode}`;
  const notLeft = `${item.leftNegated ? '' : '~'}${item.leftCode}`;
  const notRight = `${item.rightNegated ? '' : '~'}${item.rightCode}`;
  return { original: `${left} → ${right}`, contra: `${notRight} → ${notLeft}`, reverse: `${right} → ${left}`, inverse: `${notLeft} → ${notRight}` };
}
function practiceChoices(item: PracticeItem, contrapositive: boolean) {
  const diagrams = practiceDiagrams(item);
  const correct = contrapositive ? diagrams.contra : diagrams.original;
  const wrong = [diagrams.reverse, diagrams.inverse];
  const position = contrapositive ? item.contraPosition : item.originalPosition;
  const options = [...wrong];
  options.splice(position, 0, correct);
  return options;
}
export function IntegratedItem({ item, number, onChecked }: { item: PracticeItem; number: number; onChecked?: (checked: boolean) => void }) {
  const [original, setOriginal] = useState<number | null>(null);
  const [contra, setContra] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = original === item.originalPosition && contra === item.contraPosition;
  const labels = [{ code: item.leftCode, meaning: item.left }, { code: item.rightCode, meaning: item.right }];
  if (number % 2 === 0) labels.reverse();
  const change = (value: number, isContra: boolean) => { setChecked(false); onChecked?.(false); if (isContra) setContra(value); else setOriginal(value); };
  const reset = () => { setOriginal(null); setContra(null); setChecked(false); onChecked?.(false); };
  return <div className="cr-integrated-item co-check" data-reference-practice={number}><header><span className="cr-item-number">{String(number).padStart(2, '0')}</span><h3>{item.sentence}</h3></header><dl className="cr-practice-legend">{labels.map(label => <div key={label.code}><dt>{label.code}</dt><dd>{label.meaning}</dd></div>)}</dl>
    <fieldset><legend>Original diagram for item {number}</legend><div className="cr-answer-options cr-symbol-options">{practiceChoices(item, false).map((option, index) => <button key={option} type="button" aria-pressed={original === index} onClick={() => change(index, false)}><Notation text={option}/></button>)}</div></fieldset>
    <fieldset><legend>Contrapositive for item {number}</legend><div className="cr-answer-options cr-symbol-options">{practiceChoices(item, true).map((option, index) => <button key={option} type="button" aria-pressed={contra === index} onClick={() => change(index, true)}><Notation text={option}/></button>)}</div></fieldset>
    <div className="cr-control-row"><button type="button" className="cr-primary" disabled={original === null || contra === null} aria-label={`Check both diagrams for item ${number}`} onClick={() => { setChecked(true); onChecked?.(true); }}>Check both diagrams</button><button type="button" className="cr-reset" onClick={reset}>Try item {number} again</button></div>
    <div role="status">{checked && <div className={`cr-feedback ${correct ? 'cr-correct' : 'cr-revise'}`}><strong>{correct ? 'Both diagrams are correct.' : 'Review the rule.'}</strong><p>{original === item.originalPosition ? 'Your original keeps the direction.' : 'Your original changes the direction or negates conditions the rule did not negate.'} {contra === item.contraPosition ? 'Your contrapositive reverses and negates both complete conditions.' : 'Your contrapositive must start from the missing requirement and rule out the sufficient condition.'}</p><p>{item.why}</p><p className="cr-answer-key">Original: <Notation text={practiceDiagrams(item).original}/><br/>Contrapositive: <Notation text={practiceDiagrams(item).contra}/></p><p>Read the original: {item.readback}</p><p>Read its contrapositive: {item.contraReadback}</p></div>}</div>
  </div>;
}

export function conditionalReferenceContent() {
  return <div className="cr-sequence">
    <ReferenceStep number={1} label="Start with meaning" title="What does a conditional tell you?">
      <p>A <strong>condition</strong> is an idea that can be true or false. You win a raffle. You get a bicycle. We can ask whether either condition holds in a particular case.</p>
      <p>A <strong>conditional statement</strong> tells us that if one condition is true, another has to be true too. It gives us a rule we can use, even before we know whether either condition is true in a particular case.</p>
      <p className="co-if-inline">We aren't saying the first condition happened. We're asking what would follow <strong>if</strong> it did.</p>
      <HypotheticalFigure/>
      <h3>Why learn this?</h3><p>On the LSAT, you need to distinguish what the information proves from what it leaves open. A conditional rule can help you prove a conclusion. An argument can also misuse the rule and reach a conclusion it hasn't proved. We'll practice telling those apart.</p>
      <p>Let's read one rule.</p><blockquote>{raffleRule}</blockquote>
      <p>Under this rule, winning the raffle makes getting a bicycle certain. Winning without getting one would break the stated rule. That is what we mean by a <strong>guarantee</strong> here.</p>
      <p>Compare that with “If you win the raffle, you usually get a bicycle.” Usually allows an exception. Our rule does not. Take the stated rule as given; we are asking what it tells us, not whether a real organizer keeps a promise.</p>
      <ReferenceQuestion prompt="Does the rule itself tell us that you actually win the raffle?" options={['Yes, it says you win.', 'No, it tells you what follows if you win.']} correct={1} feedback={['You added a case fact. The rule has not reported a win; it tells you what getting one would prove.', 'Imagining a win helps us understand the rule. We need a separate fact to prove that you actually win.']}/>
      <p>Now let's take the two conditions one at a time.</p>
    </ReferenceStep>

    <ReferenceStep number={2} label="The sufficient condition" title="Sufficient means enough">
      <div className="cr-sufficiency">
        <p className="cr-sufficiency-lead"><strong>A sufficient condition is the “if” part of a rule. When it is true, the “then” part has to be true too.</strong></p>
        <p>For example, in the rule below, being enrolled in law school is the <strong>sufficient condition</strong>. Being a student is the “then” part. It's what the rule guarantees.</p>
        <blockquote><strong>If</strong> you're enrolled in law school, <strong>then</strong> you're a student.</blockquote>
        <p>Someone might be enrolled. Someone might not. The rule doesn't say which. It only says what follows if they are.</p>
        <p>Nothing else has to be true for the guarantee to hold. If someone is enrolled in law school, they have to be a student.</p>
        <p>If they aren't enrolled, the rule says nothing. They might be a student or they might not.</p>
        <p className="nc-takeaway"><strong>Being enrolled is enough. If it's true, being a student has to be true.</strong></p>

        <section className="cr-sufficient-explanation sc-indicator-list" aria-label="Group 1 indicator words">
          <h3>Group 1: Sufficient-condition indicators</h3>
          <p>In our rule, <strong>if</strong> is the indicator and <strong>being enrolled in law school</strong> is the sufficient condition. These words and phrases point to it too:</p>
          <ul>{sufficientFamily.map(entry => <li key={entry.word}>{entry.word}</li>)}</ul>
          <p>The indicator is the word. The sufficient condition is the whole idea it points to.</p>
        </section>

        <SufficientConditionExperience/>

        <SufficientConditionFilm key="sufficient-definition"/>

        <section className="cr-sufficient-explanation cr-sufficient-checks" aria-label="Pop Quiz on sufficiency">
          <div className="co-section-heading"><PopQuizTitle/></div>
          <SufficientQuiz/>
        </section>
        <aside className="cr-sufficient-bridge"><h3>Next: The Necessary Condition</h3><p>Now look at the rule from the other side. Being a student is the <strong>necessary condition</strong>, the part that must be true. That's next.</p></aside>
      </div>
      <p>Next, we'll examine what the sufficient condition requires.</p>
    </ReferenceStep>

    <ReferenceStep number={3} label="The sufficient family" title="Different words can keep the same rule">
      <p>An <strong>indicator</strong> is a word or phrase that helps you recognize a conditional rule. These indicators can introduce an idea that is enough to prove another.</p>
      <p>For the next examples, use a different stated rule: anyone who borrows a locker has a key. We will express that same connection in several ways. We haven't said everyone with a key borrows a locker.</p>
      <WordFamily entries={sufficientFamily} role="sufficient"/>
      <p>When/whenever and any/anytime group related forms together. An ending changes the kind of case being discussed, but these examples keep the same connection. For example, every guest wearing a blue badge covers that whole group. Guest alone would include people without badges. Use the indicator to find the group, then keep the words that limit it.</p>
      <ReferenceQuestion prompt="Every guest wearing a blue badge receives a lunch voucher. Which complete idea is enough?" options={['Guest', 'Guest wearing a blue badge', 'Receives a lunch voucher']} correct={1} feedback={['Guest alone drops the badge restriction and would make a claim about unbadged guests.', 'The rule gives a voucher to every guest wearing a blue badge. Keep that qualification with the person.', 'The voucher is what the rule proves. It has not said every voucher recipient wears a blue badge.']}/>
      <details className="cr-extension"><summary>Two more Group 1 indicators</summary><p><strong>Where</strong> can state a rule across locations: “Where a collection point operates, parcels can be returned.” An operating collection point proves the availability of returns there. Availability is not proof that someone made a return.</p><p><strong>The only</strong> needs its complete phrase: “The only notebooks on this shelf are hardback.” A notebook on the shelf is hardback. The rule does not put every hardback notebook there.</p><p>These are part of your Group 1 work. Understand what the full phrase covers before using its group as a placement shortcut.</p></details>
      <p>We have seen what can be enough. Now let's name what that condition requires.</p>
    </ReferenceStep>

    <ReferenceStep number={4} label="The necessary condition" title="Necessary means required">
      <div className="cr-sufficiency nc-lesson">
        <p className="cr-sufficiency-lead"><strong>A necessary condition is a requirement. It has to be met, but meeting it might not be enough.</strong></p>
        <p>For example, you have to be a student to be enrolled in law school. That makes being a student <strong>necessary for law-school enrollment</strong>.</p>
        <NecessaryConditionStatement/>
        <p>But being a student doesn’t mean you’re enrolled in law school. You could be studying history instead.</p>
        <p className="nc-takeaway"><strong>Being a student is required. It doesn’t prove enrollment on its own.</strong></p>
        <NecessaryConditionExperience/>
        <section className="cr-sufficient-explanation" aria-label="Why a requirement is not necessarily enough">
          <h3>Two roles in the same rule</h3>
          <p>Compare the two roles: <strong>being enrolled is enough to prove being a student; being a student is required for being enrolled.</strong> These describe the same rule from different sides.</p>
          <p>Whenever the sufficient condition is true, the necessary condition must be true too. The rule does not tell us that either condition is actually true of a particular person.</p>
          <details className="cr-extension"><summary>Can a condition be both necessary and sufficient?</summary><p>Yes, when the rule supports both directions. Necessary means required; it doesn't mean never enough. Our rule tells us that enrollment requires being a student. It doesn't say that being a student is enough to prove enrollment.</p></details>
        </section>
        <SufficientConditionFilm key="necessary-definition" assets={necessaryConditionFilms} title="Why the requirement is not enough here" ariaLabel="Short explanation of necessity"/>
        <section className="cr-sufficient-explanation sc-indicator-list" aria-label="Group 2 indicator words">
          <h3>Group 2: Necessary-condition indicators</h3>
          <p>These words and phrases help you identify the <strong>necessary condition</strong>. Read the whole rule, then identify <strong>what is required and what requires it</strong>.</p>
          <NecessaryIndicatorExplorer/>
          <h3>Why only if is different from if</h3>
          <div className="nc-role-comparison">
            <div><h4>If you are enrolled in law school, you are a student.</h4><p><strong>If</strong> identifies enrollment as enough. This is our original rule.</p></div>
            <div><h4>You are enrolled in law school only if you are a student.</h4><p><strong>Only if</strong> identifies being a student as required. This keeps that same rule.</p></div>
          </div>
          <p>Now remove only from the second sentence: “You are enrolled in law school <strong>if</strong> you are a student.” That would make being a student enough for law-school enrollment. A history student who is not enrolled in law school shows why that is a different claim.</p>
          <p>Ask <strong>what the rule requires</strong>. Identify the complete condition, including any restrictions. The next example gives you a new rule to check.</p>
        </section>
        <section className="cr-sufficient-explanation nc-checks" aria-label="Apply the necessary condition to a new rule">
          <h3>Find the requirement in a new rule</h3>
          <blockquote>An application is accepted for review only if it includes a current reference letter.</blockquote>
          <ReferenceQuestion prompt="What is required for an application to be accepted for review?" options={['Including a current reference letter.', 'Including any reference letter, even an outdated one.', 'Being accepted for review.']} correct={0} feedback={['Only if identifies including a current reference letter as required. An application accepted for review cannot be missing that current letter.', 'Current matters. An outdated letter does not meet the requirement in this rule. Keep that word when you identify what is required.', 'Acceptance is the condition that requires the letter. Including a current reference letter is the requirement. You have swapped the two roles.']}/>
          <h3>Does meeting the requirement guarantee acceptance?</h3>
          <ReferenceQuestion prompt="Does including a current reference letter guarantee that the application is accepted for review?" options={['Yes. The letter is all the application needs.', 'No. The letter is required, but the rule does not say it is enough.']} correct={1} feedback={['You turned a requirement into a guarantee. The rule tells us that accepted applications include a current letter, not that every application with one is accepted.', 'An application with a current letter could be accepted or not accepted. Both fit the rule. Having the required letter alone does not prove acceptance.']}/>
        </section>
        <aside className="cr-sufficient-bridge"><h3>Next: Put the rule into a diagram</h3><p>We now have both roles: the condition that guarantees, and the condition it requires. Next, we'll use an arrow to record that connection.</p></aside>
      </div>
      <p>Next, record the rule with the must arrow.</p>
    </ReferenceStep>

    <ReferenceStep number={5} label="The necessary family" title="Listen for what the rule needs">
      <p>Return to our locker rule. Borrowing a locker requires a key. The next indicators all identify that requirement in their complete sentences.</p>
      <WordFamily entries={necessaryFamily} role="necessary"/>
      <div className="cr-contrast"><div><h3>If</h3><p>“You borrow a locker <strong>if</strong> you have a key.”</p><p>Having a key is enough for borrowing under this rule.</p></div><div><h3>Only if</h3><p>“You borrow a locker <strong>only if</strong> you have a key.”</p><p>Having a key is required. This rule has not made it enough.</p></div></div>
      <ReferenceQuestion prompt="A guest enters the lounge only if the guest has a current pass. What does entering prove?" options={['The guest has a current pass.', 'Every guest with a pass enters.']} correct={0} feedback={['Only if identifies the current pass as required for entry. An entering guest therefore meets that requirement.', 'You made the requirement enough. A guest could have a current pass and remain outside without violating the rule.']}/>
      <details className="cr-extension"><summary>More Group 2 forms, with the rule intact</summary><p><strong>Only when</strong> and <strong>only where</strong> can restrict the occasions or places of an outcome: “The fountain runs only when its pump is on.” A running fountain requires an operating pump. The pump being on does not prove that the fountain runs.</p><p><strong>Requires</strong> directly names a requirement: “Entry requires a current pass.” Keep current. <strong>Always</strong> needs the rule's subject and scope: “The upstairs room is always quiet when the door is shut.” Here a shut door proves quiet, not the other way around.</p><p><strong>Only</strong> and <strong>the only</strong> are different complete indicators. “Only people who get a bicycle win this raffle” and “The only people who win this raffle are people who get a bicycle” both keep the rule: winning proves getting a bicycle.</p></details>
      <p>We can now recognize both roles before writing any symbols. Next, let's see what happens when a requirement is missing.</p>
    </ReferenceStep>

    <ReferenceStep number={6} label="A missing requirement" title="What if the requirement is missing?" dark>
      <ContrapositiveDiscovery/>
    </ReferenceStep>

    <ReferenceStep number={7} label="The four situations" title="Keep what follows separate from what stays open">
      <p>Keep the raffle rule. Choose a fact, then decide what it lets you conclude.</p>
      <FourCaseExplorer/>
      <h3>Return to the law-school rule</h3>
      <p>Watch how the same law-school rule handles different facts about Maya.</p>
      <div className="cr-sufficiency"><SufficientConditionFilm/></div>
      <p>Starting from getting a bicycle and concluding that you win is the tempting <strong>reverse</strong>. Starting from not winning and concluding that you do not get a bicycle is the tempting <strong>inverse</strong>. Neither follows from this rule alone.</p>
      <p>The contrapositive starts from <strong>not getting a bicycle</strong> and proves <strong>not winning the raffle</strong>. Its reasoning depends on the missing required result, not on reversing whichever words happen to appear.</p>
      <p>We now understand the rule in words. Symbols will let us record that understanding without carrying every word of the rule.</p>
    </ReferenceStep>

    <ReferenceStep number={8} label="Build the first diagram" title="Give the rule a shorter form">
      <p>Put the sufficient condition on the <strong>left</strong>, the necessary condition on the <strong>right</strong>, and a <strong>must arrow</strong> between them.</p>
      <RuleDiagram left="Sufficient: enough" right="Necessary: required"/>
      <p>The arrow means the left condition requires the right. It does not mean the left caused the right, or that the right happens later.</p>
      <h3>Which idea goes on which side?</h3>
      <p>The indicator helps you find a condition's job. Once you've found that job, place the <strong>complete condition</strong> on its side of the arrow. We don't put the word if or only if in the diagram.</p>
      <div className="cr-contrast"><div><h3>Left: sufficient</h3><p>This is the condition that's enough to prove the other one. Group 1 indicators such as <strong>if, when, all, every</strong> and <strong>any</strong> can identify this condition.</p><p>“All people who borrow a locker have a key.” All refers to <strong>people who borrow a locker</strong>. For someone in that group, having a key follows. Borrowing goes left.</p></div><div><h3>Right: necessary</h3><p>This is what the sufficient condition requires. Group 2 indicators such as <strong>only if, requires</strong> and <strong>must</strong> can identify the requirement.</p><p>“Borrowing a locker requires a key.” What is required? <strong>Having a key.</strong> That condition goes right.</p></div></div>
      <RuleDiagram left="Borrows a locker" right="Has a key"/>
      <p>Read it back: if someone borrows a locker, they have a key. The arrow records that connection. It hasn't told us that everyone with a key borrows a locker.</p>
      <h3>The rule can move. The roles stay the same.</h3>
      <p>Compare these two versions of our raffle rule. The indicator is bold; the complete idea it refers to is in brackets.</p>
      <div className="cr-language-pair"><p><strong>If</strong> [you win the raffle], you get a bicycle.</p><p>You get a bicycle <strong>if</strong> [you win the raffle].</p><span>If identifies the sufficient condition in both sentences.</span></div>
      <p>In the second sentence, if appears in the middle. Its condition comes last, but winning is still enough to prove getting a bicycle. That condition still goes left. Don't let the first phrase in English choose the first side of your diagram.</p>
      <RuleDiagram left="Win the raffle" right="Get a bicycle"/>
      <p>Now try the same move with a requirement.</p>
      <div className="cr-language-pair"><p><strong>Only</strong> [people with a key] borrow a locker.</p><p>A person borrows a locker <strong>only if</strong> [they have a key].</p><span>Only and only if identify the necessary condition here.</span></div>
      <p>Both sentences say locker borrowers have a key. In the first, only is at the beginning. In the second, only if is in the middle. Having a key is required in both, so it goes right. <strong>If</strong> and <strong>only if</strong> have different jobs; read only if as the whole phrase.</p>
      <ReferenceQuestion prompt="A person borrows a locker only if they have a key. Which condition goes on the right?" options={['Borrows a locker', 'Has a key']} correct={1} feedback={['Borrowing is what has the requirement. Ask what a locker borrower must have: a key. Borrowing goes left; having a key goes right.', 'Having a key is required for borrowing. Only if appears in the middle, but it still identifies the necessary condition.']}/>
      <h3>The indicator can also follow its group</h3>
      <div className="cr-language-pair"><p>[Having a key] is <strong>required</strong> for borrowing a locker.</p><p>Borrowing a locker <strong>requires</strong> [having a key].</p><span>Having a key is the requirement in both sentences.</span></div>
      <p>It points to the complete idea the indicator refers to. It comes before required in the first sentence and after requires in the second. Having a key still goes right. We find it by asking what is required, not by taking whichever words come next.</p>
      <p>In your Group 1 and Group 2 lessons, compare what each indicator tells you about the same case. If you know someone borrows a locker, a key follows. Knowing that person has a key leaves borrowing open. Different wording should keep that distinction.</p>
      <p>Let's build an original diagram slowly. First find the indicator, then draw the arrow, place the complete idea it refers to, and fill the other side.</p>
      <IncrementalWriter/>
      <p>Now move the if-clause: “You get a bicycle if you win the raffle.” The winning condition comes last in English but still goes left in the diagram. Its job has not changed.</p>
      <ReferenceQuestion prompt="Which diagram keeps the moved if-clause?" options={['Get bicycle → Win', 'Win → Get bicycle']} correct={1} feedback={['You let sentence order choose the arrow. The if-clause still makes winning enough for getting a bicycle.', 'The sufficient condition is still winning. Where it appears in the rule does not change what it proves.']}/>
    </ReferenceStep>

    <ReferenceStep number={9} label="Write and read the contrapositive" title="Write the meaning you already understand">
      <p>Win means you win the raffle. Get bicycle means you get a bicycle. Our original is Win → Get bicycle.</p>
      <p>We already know that not getting a bicycle rules out winning. Write that as <strong><Neg>Get bicycle</Neg> → <Neg>Win</Neg></strong>. A line through an idea means <strong>not</strong>. Not getting the outcome is different from not having received it yet.</p>
      <p>To write a contrapositive from a diagram, reverse the two sides and negate <strong>both complete conditions</strong>. A condition already containing not loses that not when we negate it. Let's try all four patterns.</p>
      <SignPatterns/>
      <div className="cr-method"><p className="co-kicker">The complete five-step routine</p><ol><li><strong>Find the indicator.</strong> Read its job in the whole rule.</li><li><strong>Identify both complete ideas.</strong> Keep restrictions such as current or submitted by Friday.</li><li><strong>Place the roles.</strong> Sufficient goes left; necessary goes right. Choose labels you can read back.</li><li><strong>Write the contrapositive.</strong> Reverse the sides and negate both complete conditions.</li><li><strong>Read both in English.</strong> Compare them with what the original sentence actually requires.</li></ol></div>
      <p>The original and its contrapositive describe the same rule. If writing both helps you see that rule, write both. If you can read the contrapositive from the original when it is relevant, you needn't copy it merely to have a second line.</p>
      <p>Read an arrow forward to use its stated direction. To read its contrapositive, start from the right condition's absence and work back to the left condition's absence. That is a different move from reading the arrow backward unchanged.</p>
    </ReferenceStep>

    <ReferenceStep number={10} label="Practical diagramming questions" title="Use writing to make your reasoning easier to check">
      <div className="cr-faq">
        <details><summary>When should I diagram?</summary><p>While learning, write enough to make your choices visible. A difficult sentence, several rules or a connection you keep rereading can be a reason to put the rule on paper. With practice, you may hold a simple rule mentally. Use the writing to help the reasoning.</p></details>
        <details><summary>How do I check whether my diagram is right?</summary><p>Read it back and compare the whole meaning. Did you keep each restriction? Does your arrow promise something the original leaves open? When a diagram is wrong, record the exact phrase and the mistake it produced. That gives you something specific to practice. Familiarity alone is not proof of correctness.</p></details>
        <details><summary>What if writing takes time?</summary><p>Start by producing a correct, readable diagram. Speed is a later practice goal. Writing can reduce rereading, but it does not save time in every case. Compare how it helps on the rules you are actually working through. First make the rule accurate. Work on speed once you can explain why the arrow follows. </p></details>
        <details><summary>Should I always write the contrapositive?</summary><p>You need to understand it every time. Write it when it helps you use the missing requirement, inspect your translation or connect rules. Otherwise, you may read that direction from the original. Extra notation should have a job.</p></details>
        <aside className="cr-training-note"><h3>Why this practice asks for both</h3><p>In the integrated drill, write or choose the original and the contrapositive. We're checking that you can produce both. Once that skill is reliable, a performance task need not require both lines for every rule.</p></aside>
        <details><summary>How should I abbreviate the conditions?</summary><p>Use short phrases that bring back the complete idea. Guest on the list keeps the subject and the requirement in view. Current pass keeps the restriction that an expired pass would miss. Shortening should save writing without losing meaning.</p></details>
      </div>
      <ReferenceQuestion prompt="Only envelopes with a paid stamp go into this tray. Someone wrote Paid stamp → In tray. What needs repairing?" options={['The labels need to be longer.', 'The arrow makes the requirement enough.', 'Nothing; the first phrase always goes left.']} correct={1} feedback={['Longer labels would not repair the direction. The tray requires a paid stamp, but a stamped envelope can remain outside it.', 'Only restricts tray envelopes to ones with paid stamps. In tray → Paid stamp keeps that requirement; the proposed reverse promises tray placement to every stamped envelope.', 'Sentence order does not determine diagram order. Only identifies the paid stamp as required for tray placement.']}/>
      <p>That error came from the language. Let's inspect precisely which idea an indicator refers to.</p>
    </ReferenceStep>

    <ReferenceStep number={11} label="Find the group" title="Which reports can be published?">
      <p>An indicator's <strong>target</strong> is the complete word or phrase it refers to. In “All guests wearing blue badges receive vouchers,” all refers to guests wearing blue badges, not guests alone.</p>
      <p>In the first sentence below, only names reports with editor approval. In the next, editor approval comes before necessary. Choose the words that identify what publication requires in each rule.</p>
      {targetExamples.map(item => <TargetReader item={item} key={item.label}/>)}
      <div className="cr-language-pair"><p>“Editor approval is required for publication.”</p><p>“Publication requires editor approval.”</p><span>Same requirement, different placement</span></div>
      <p>Publication needs editor approval in all three sentences. Approval can appear before or after the indicator without changing that requirement. Publication therefore goes on the left and editor approval on the right.</p>
      <p>When the wording still feels uncertain, we can test a proposed translation against an imagined case.</p>
    </ReferenceStep>

    <ReferenceStep number={12} label="Check an interpretation" title="Try the rule from the inside">
      <p>A <strong>“Put yourself in it”</strong> lets you test what a proposed sufficient condition would prove. First read the ordinary meaning. Propose the sufficient idea. Imagine a case meeting it. Ask what the rule now requires.</p>
      <blockquote>Only people wearing helmets ride the studio bikes.</blockquote><p>The rule restricts riders to people wearing helmets. Keep that meaning while trying each proposed starting point.</p>
      <div className="cr-personalized"><div><p className="co-kicker">First proposed starting point</p><ReferenceQuestion prompt="If I'm riding a studio bike, what does this rule tell me?" options={['I am wearing a helmet.', 'The helmet question is open.']} correct={0} feedback={['The rule puts every rider in the helmet-wearing group. Riding → Wearing helmet keeps that meaning.', 'Only restricts who rides. If you meet the riding condition, the rule does settle helmet wearing.']}/></div><div><p className="co-kicker">Try the other starting point</p><ReferenceQuestion prompt="If I'm wearing a helmet, must I be riding a studio bike?" options={['Yes, the helmet proves riding.', 'No, I could wear one without riding.']} correct={1} feedback={['You gave every helmet wearer a ride. The rule restricts riders; it does not make all helmet wearers riders.', 'A helmet wearer waiting beside a bike fits the rule. Wearing helmet → Riding would add a promise the original did not make.']}/></div></div>
      <p>The first reading matches the rule. The second proposed arrow fails because it rules out a case the original permits. Use the imagined situation to inspect meaning, not to supply extra facts from what usually happens.</p>
      <h3>Use the What Test beside it</h3><p>Only what? People wearing helmets. People alone would drop the helmet restriction. The complete phrase tells us which people can ride a studio bike. Riding proves that the rider wears a helmet; wearing one still doesn't prove riding.</p>
      <p>The What Test keeps wearing a helmet attached to people. The “Put yourself in it” lets you check the arrow: imagine you ride a studio bike, then ask what the rule requires you to know. If your diagram instead promises a ride to everyone wearing a helmet, it has changed the rule.</p>
      <p>We've now read the rule, understood its limits, written both directions and checked the language. Put those pieces together with fresh sentences.</p>
    </ReferenceStep>

    <ReferenceStep number={13} label="Use the whole process" title="Build an original and its contrapositive">
      <p>For each rule, identify the indicator and both complete conditions. Choose the original diagram, then its contrapositive. Read both back before checking.</p>
      <p>You can look back. The job here is to produce and inspect the reasoning, not to prove you memorized every indicator on the first reading. The labels below keep the complete ideas visible while you choose the directions.</p>
      <div className="cr-integrated-grid">{referencePracticeItems.map((item, index) => <IntegratedItem item={item} number={index + 1} key={item.sentence}/>)}</div>
      <p>If an answer needs revision, name the exact issue: lost qualification, wrong role, reversed arrow or incomplete negation. Then retry that item. Your targeted Group 1 and Group 2 work gives you more practice with individual indicators; this set checks whether the steps hold together.</p>
    </ReferenceStep>
    <section id="reference-boundary" className="cr-boundary co-section" data-reference-boundary data-toc data-toc-title="Permission and instructions">
      <p className="co-kicker">Before the attached practice</p><h2>Keep what the rule actually gives you</h2>
      <p>The core process is now in place. One more distinction matters for the practice: a conditional can give permission or an instruction. Keep that strength instead of turning it into a report of what someone did.</p>
      <blockquote>Every guest with a ticket may use the cloakroom.</blockquote><p>May use gives permission here. A ticketed guest is allowed to use the cloakroom. The guest could keep their coat on and never go inside.</p>
      <ReferenceQuestion prompt="Lena is a guest with a ticket. Do we know that she used the cloakroom?" options={['Yes, the ticket proves that she used it.', 'No, we know she is allowed to use it.']} correct={1} feedback={['You turned permission into a completed action. Lena meets the condition for permission, but we have no fact reporting her use of the cloakroom.', 'The rule gives Lena permission because she is a guest with a ticket. Whether she used the cloakroom remains open.']}/>
      <p>Now compare an instruction. “If your coat is wet, hang it on the rack” tells you what to do with a wet coat. It does not report that someone followed the instruction.</p>
      <ReferenceQuestion prompt="The notice says: If a tray is empty, return it to the counter. This tray is empty. What does the instruction prove?" options={['The tray has been returned.', 'The instruction calls for returning the tray.', 'The tray cannot be returned.']} correct={1} feedback={['You turned an instruction into a completed action. The notice has not reported that anyone returned this tray.', 'The empty tray meets the condition in the instruction, so the notice calls for returning it. Whether someone returned it is a separate question.', 'The instruction asks for a return. It does not say a return is impossible.']}/>
      <p>Allowed to use isn't used. Told to return isn't returned. Your conclusion should keep the meaning the rule actually gave you.</p>
    </section>
  </div>;
}

export function ConditionalReferenceSequence() { return conditionalReferenceContent(); }

// A long stage can contain several reading pages without changing the source order.
export function conditionalReferencePages(): LessonPage[] {
  return Children.toArray(conditionalReferenceContent().props.children).flatMap(node => {
    if (!isValidElement<{number?: number; title?: string; children?: ReactNode; 'data-toc-title'?: string}>(node)) return [];
    if (node.props.number === 8) {
      const parts = Children.toArray(node.props.children);
      const sentenceMove = parts.findIndex(child => isValidElement<{children?: ReactNode}>(child) && child.type === 'h3' && child.props.children === 'The rule can move. The roles stay the same.');
      const targetMove = parts.findIndex(child => isValidElement<{children?: ReactNode}>(child) && child.type === 'h3' && child.props.children === 'The indicator can also follow its group');
      return [
        { title: 'Build the first diagram: the two sides', content: <ReferenceStep number={8} label="Build the first diagram · 1 of 3" title="Give the rule a shorter form">{parts.slice(0, sentenceMove)}</ReferenceStep> },
        { title: 'Build the first diagram: sentence order', content: <ReferenceStep number={8} part={2} label="Build the first diagram · 2 of 3" title="The rule can move. The roles stay the same.">{parts.slice(sentenceMove + 1, targetMove)}</ReferenceStep> },
        { title: 'Build the first diagram: group and readback', content: <ReferenceStep number={8} part={3} label="Build the first diagram · 3 of 3" title="Find the group wherever it appears">{parts.slice(targetMove + 1)}</ReferenceStep> },
        { title: 'Recall enough and required', content: <section className="co-section"><h2>Recall enough and required</h2><p>Put the worked examples aside. Read each new rule, say your answer, and then turn the card to compare your reasoning.</p><StudyDeck group="foundation"/></section> },
      ];
    }
    if (node.props.number === 9) {
      return [
        { title: node.props.title!, content: node },
        { title: 'Two possible rooms, one limit', content: <section className="co-section"><h2>Two possible rooms, one limit</h2><NegativeCaseLab/></section> },
      ];
    }
    if (node.props.number === 13) {
      return referencePracticeItems.map((item, index) => ({
        title: `Use the whole process: sentence ${index + 1}`,
        content: <ReferenceStep number={13} part={index > 0 ? index + 1 : undefined} label={`Use the whole process · ${index + 1} of ${referencePracticeItems.length}`} title="Build an original and its contrapositive">
          {index === 0 && <p>For each new sentence, identify the indicator and both complete conditions. Choose the original diagram, then its contrapositive. Read both back before checking. You can return to any earlier page.</p>}
          <IntegratedItem item={item} number={index + 1}/>
          <p>If an answer needs revision, name the exact issue: lost qualification, wrong role, reversed arrow or incomplete negation. Then retry that item. Your targeted Group 1 and Group 2 work gives you more practice with individual indicators; this set checks whether the steps hold together.</p>
        </ReferenceStep>,
      }));
    }
    return [{ title: node.props.title || node.props['data-toc-title'] || 'Keep the meaning', content: node }];
  });
}
