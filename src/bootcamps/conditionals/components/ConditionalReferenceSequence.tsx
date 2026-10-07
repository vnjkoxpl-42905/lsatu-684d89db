import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './reference-sequence.css';
import { NegativeCaseLab } from './CounterexampleLab';
import { StudyDeck } from './StudyDeck';
import type { LessonPage } from './LessonPages';

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
  return <div className="cr-question co-check"><h3 id={id}>{prompt}</h3><div className="cr-answer-options" role="group" aria-labelledby={id}>
    {options.map((option, index) => <button ref={index === 0 ? firstChoice : undefined} type="button" key={option} aria-pressed={choice === index} onClick={() => { setChoice(index); onAttempt?.(index); }}>{option}</button>)}
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
    <div className="cr-then"><span>THEN</span><strong>the other condition has to be true</strong><small>What the rule establishes</small></div>
    <figcaption>If the first condition is true, the other must be true. Imagining that case doesn't tell us it happened.</figcaption>
  </figure>;
}

type FamilyEntry = { word: string; sentence: string; explanation: string };
const sufficientFamily: FamilyEntry[] = [
  { word: 'if', sentence: 'If someone borrows a locker, they have a key.', explanation: 'Borrowing a locker is enough to establish that the person has a key.' },
  { word: 'when / whenever', sentence: 'Whenever someone borrows a locker, they have a key.', explanation: 'Whenever covers every occasion of borrowing. A report that something happened once when someone borrowed a locker would not establish this general rule.' },
  { word: 'any / anytime', sentence: 'Any person who borrows a locker has a key.', explanation: 'Pick any person meeting the borrowing condition. The rule gives that person a key. Anytime someone borrows a locker, they have a key expresses the same connection across occasions.' },
  { word: 'all', sentence: 'All people who borrow a locker have a key.', explanation: 'All covers every person in the described group. Keep who borrow a locker with people; the rule is not about everyone.' },
  { word: 'every / every time', sentence: 'Every person who borrows a locker has a key.', explanation: 'Every member of this group meets the other condition. Every time someone borrows a locker, they have a key preserves the relationship while speaking about occasions.' },
  { word: 'in order to', sentence: 'In order to borrow a locker, a person needs a key.', explanation: 'Borrowing the locker is the goal. Having a key is its requirement. This does not say that having a key is enough to borrow a locker.' },
  { word: 'people who', sentence: 'People who borrow a locker have a key.', explanation: 'People who borrow a locker names the complete group being described. For a person in that group, having a key follows.' },
  { word: 'each', sentence: 'Each person who borrows a locker has a key.', explanation: 'Each applies the statement to every individual locker borrower. We have changed the wording, not what borrowing establishes.' },
];
const necessaryFamily: FamilyEntry[] = [
  { word: 'then', sentence: 'If someone borrows a locker, then they have a key.', explanation: 'Then introduces what the borrowing condition establishes: the person has a key.' },
  { word: 'must', sentence: 'A person borrowing a locker must have a key.', explanation: 'Here we are describing a requirement under the stated rule. If must appears in an instruction instead, preserve that meaning: a required action is not proof that someone completed it.' },
  { word: 'necessary', sentence: 'Having a key is necessary for borrowing a locker.', explanation: 'Ask necessary for what? For borrowing a locker. Having a key is the requirement, not a promise that someone borrowed.' },
  { word: 'required', sentence: 'Having a key is required for borrowing a locker.', explanation: 'Required names the same relationship. Every locker borrower meets the key requirement.' },
  { word: 'only / only if', sentence: 'A person borrows a locker only if they have a key.', explanation: 'Only if makes having a key necessary. Only people with a key borrow a locker says the same thing. Neither gives a locker to every person with a key.' },
  { word: 'depends', sentence: 'Borrowing a locker depends on having a key.', explanation: 'Having a key is what the borrowing depends on. The sentence does not make the key enough by itself.' },
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
    <p className="cr-instruction">Choose an expression. Read its sentence before comparing the explanation.</p>
    <ol className="cr-family-list">{entries.map((entry, index) => <li key={entry.word}><button ref={index === 0 ? firstExpression : undefined} type="button" aria-pressed={selected === index} aria-controls={regionId} onClick={() => setSelected(index)}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{entry.word}</button></li>)}</ol>
    <div id={regionId} className="cr-family-reading" aria-live="polite">{selected === null ? <p>The words vary. We'll keep the same locker relationship while reading each one.</p> : <><p className="co-kicker">{entries[selected].word}</p><blockquote>{entries[selected].sentence}</blockquote><p>{entries[selected].explanation}</p><div className="cr-family-role"><span>{role === 'sufficient' ? 'Enough to establish the other condition' : 'Required for the other condition'}</span><strong>{role === 'sufficient' ? 'Borrows a locker' : 'Has a key'}</strong></div></>}</div>
    {selected !== null && <button type="button" className="cr-reset" onClick={() => { firstExpression.current?.focus(); setSelected(null); }}>Clear the example</button>}
  </div>;
}

const cases = [
  { label: 'Sufficient present', fact: 'You win the raffle.', question: 'What do we know about getting a bicycle?', options: ['You get a bicycle.', "You don't get a bicycle.", 'Getting a bicycle is not settled.'], correct: 0, reasoning: ['Winning meets the sufficient condition. Under the rule, you get a bicycle.', 'Winning without getting a bicycle would violate the rule. Winning establishes the promised result.', 'The rule covers you if you win. Getting a bicycle is settled here.'] },
  { label: 'Necessary absent', fact: "You don't get a bicycle.", question: 'What do we know about winning the raffle?', options: ['You win the raffle.', "You don't win the raffle.", 'Winning the raffle is not settled.'], correct: 1, reasoning: ['If you won, you would get a bicycle. That conflicts with the given outcome.', 'The missing requirement rules out winning. Winning without getting a bicycle cannot fit the rule.', "We can settle it. Winning would require getting a bicycle, and that result doesn't occur."] },
  { label: 'Sufficient absent', fact: "You don't win the raffle.", question: 'What do we know about getting a bicycle?', options: ['You get a bicycle.', "You don't get a bicycle.", 'Getting a bicycle is not settled.'], correct: 2, reasoning: ["You could get one by buying it or receiving a gift. But the rule doesn't establish that you do.", "You could buy a bicycle without winning. The rule hasn't made the raffle the only way to get one.", "Both getting a bicycle without winning and not getting one without winning fit the rule. Getting a bicycle remains open."] },
  { label: 'Necessary present', fact: 'You get a bicycle.', question: 'What do we know about winning the raffle?', options: ['You win the raffle.', "You don't win the raffle.", 'Winning the raffle is not settled.'], correct: 2, reasoning: ["You might get it by winning, but you could buy it or receive it as a gift. Getting a bicycle alone doesn't establish winning.", "You could win and get a bicycle. Nothing in the fact rules out winning.", 'You could get a bicycle with or without winning the raffle. Having the required result does not establish the sufficient condition.'] },
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
    <ReferenceQuestion prompt="Could Report K be in the published archive while this rule holds?" options={['Yes, its location is unrestricted.', 'No, it cannot be in that archive.', 'Yes, the missing stamp puts it in the archive.']} correct={1} onAttempt={choice => setAttempted(choice !== null)} feedback={['Its location is restricted by the rule. If K were in the archive, it would have a stamp, which conflicts with the given fact.', 'An archived K would have to have a stamp. K has no stamp, so it cannot be in the published archive under this rule.', 'The missing stamp rules out archive membership. It does not establish it.']}/>
    {attempted && <div className="cr-discovery-reasoning"><p>That way of using the rule is the <strong>contrapositive</strong>: when the necessary condition is absent, the sufficient condition cannot be present.</p>
      <p>It is the same relationship. We didn't add a second rule; we worked out a consequence already contained in the first one.</p>
      <blockquote>{raffleRule}</blockquote>
      <p>Here, “you don't get a bicycle” means you never receive the promised outcome. It does not mean you're still waiting for a prize that will arrive later.</p>
      <ReferenceQuestion prompt="You don't get a bicycle. What follows about winning the raffle?" options={["You don't win the raffle.", 'You win the raffle.', 'Nothing follows about winning.']} correct={0} feedback={['Winning would require getting a bicycle. Since that outcome does not occur, you cannot have won under the rule.', 'Winning without getting a bicycle would break the rule. The absent requirement excludes winning.', 'The missing requirement does give an inference. If you won, you would get a bicycle.']}/>
      <p>Don't confuse that with starting from a requirement that is present. You could get a bicycle as a gift without winning. Let's compare all four starting facts.</p>
    </div>}
  </div>;
}

export function RuleDiagram({ left, right, label }: { left: string; right: string; label?: string }) {
  return <div className="cr-diagram" role="img" aria-label={label || `${left} implies ${right}`}><strong>{left}</strong><span aria-hidden="true">→</span><strong>{right}</strong></div>;
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
    <div className="cr-writing-sheet" aria-label="Diagram construction"><span className="cr-paper-label">Our diagram</span>{step < 2 ? <p>The sentence is our starting point.</p> : <RuleDiagram left={step >= 3 ? 'Win' : 'Not placed yet'} right={step >= 4 ? 'Get bicycle' : 'Not placed yet'} />}</div>
    <div role="status">{step > 0 && <div className="cr-feedback"><strong>Step {step} of 4</strong><p>{writingSteps[step - 1].explanation}</p>{step === 4 && <p>Read it back: if you win the raffle, you get a bicycle. We shortened the words and kept the relationship.</p>}</div>}</div>
    <div className="cr-control-row">{step < 4 && <button type="button" className="cr-primary" onClick={() => { if (step === 3) resetControl.current?.focus(); setStep(step + 1); }}>{writingSteps[step].button}</button>}<button ref={resetControl} type="button" className="cr-reset" onClick={() => setStep(0)}>Reset the construction</button></div>
  </div>;
}

const signPatterns = [
  { label: 'Neither side negative', sentence: raffleRule, legend: 'W = win the raffle. B = get a bicycle.', original: 'W → B', options: ['B → W', '~B → ~W', '~W → ~B'], correct: 1, reading: "If you don't get a bicycle, you don't win the raffle.", wrongFeedback: ['Getting a bicycle as a gift without winning would fit the original. Your arrow makes every bicycle receipt proof of winning. Reverse both sides and negate both, not just reverse.', '', "You could buy a bicycle without winning. You negated the sides without reversing them. Start from not getting a bicycle, the missing required result."] },
  { label: 'Necessary side negative', sentence: 'If the machine is testing, its indicator is not lit.', legend: 'T = machine is testing. L = indicator is lit.', original: 'T → ~L', options: ['L → ~T', '~L → T', '~T → L'], correct: 0, reading: 'If its indicator is lit, the machine is not testing.', wrongFeedback: ['', 'An unlit indicator could occur while the machine is idle. You used the required not-lit condition to establish testing. Its absence is lit, and that rules out testing.', 'An idle machine could still have an unlit indicator. Not testing does not prove lit. Reverse the sides as well as negating them.'] },
  { label: 'Sufficient side negative', sentence: 'If the café is not closed, its doors are unlocked.', legend: 'C = café is closed. U = doors are unlocked.', original: '~C → U', options: ['U → ~C', 'C → ~U', '~U → C'], correct: 2, reading: 'If the doors are not unlocked, the café is closed.', wrongFeedback: ['A closed café could have unlocked doors without violating the original. You reversed the arrow unchanged. The missing requirement is not unlocked.', 'Closing the café does not establish its locks. You negated without reversing. Start from doors that are not unlocked; then the not-closed condition cannot hold.', ''] },
  { label: 'Both sides negative', sentence: 'If an item is not marked fragile, it is not on the glass shelf.', legend: 'F = item is marked fragile. G = item is on the glass shelf.', original: '~F → ~G', options: ['~G → ~F', 'G → F', 'F → G'], correct: 1, reading: 'If an item is on the glass shelf, it is marked fragile.', wrongFeedback: ['A fragile item on another shelf fits the original. Off the glass shelf does not mean not fragile. Reverse and negate both conditions, so both existing not-signs disappear.', '', 'A fragile item can be stored elsewhere. Your arrow gives every fragile item a place on this shelf. Negating both conditions without reversing them changes the rule.'] },
];
function SignPatterns() {
  return <div className="cr-pattern-grid">{signPatterns.map((item, index) => <div className="cr-pattern" key={item.label}><p className="co-kicker">{index + 1}. {item.label}</p><p>{item.sentence}</p><p className="cr-legend">{item.legend}</p><div className="cr-formula">{item.original}</div><ReferenceQuestion prompt={`Which is the contrapositive of ${item.original}?`} options={item.options} correct={item.correct} feedback={item.options.map((_, option) => option === item.correct ? `${item.reading} This is the same rule: the missing necessary condition rules out the sufficient one.` : item.wrongFeedback[option])}/></div>)}</div>;
}

type TargetExample = { label: string; before: string; target: string; after: string; options: string[]; correct: number; feedback: string[] };
export const targetExamples: TargetExample[] = [
  { label: 'Target after the indicator', before: 'Only ', target: 'reports with editor approval', after: ' are published.', options: ['reports', 'reports with editor approval', 'published'], correct: 1, feedback: ['Reports alone drops with editor approval. The statement restricts publication to that qualified group.', 'Only refers to reports with editor approval. Keep that qualification; it is the required idea.', 'Published is the other condition. Only limits which reports can meet it.'] },
  { label: 'Target before the indicator', before: '', target: 'Editor approval', after: ' is necessary for publication.', options: ['publication', 'editor approval'], correct: 1, feedback: ['Publication is what has the requirement. Editor approval is what the sentence calls necessary.', 'The target comes before necessary. Editor approval is the requirement for publication.'] },
  { label: 'The same word can move', before: 'Publication makes it necessary to have ', target: 'editor approval', after: '.', options: ['publication', 'editor approval'], correct: 1, feedback: ['Publication still needs something. Moving necessary earlier has not made publication the requirement.', 'Editor approval is still what publication requires. Here the target comes after necessary; in the previous sentence it came before.'] },
];
export function TargetReader({ item }: { item: TargetExample }) {
  const [choice, setChoice] = useState<number | null>(null);
  const correct = choice === item.correct;
  const id = useId();
  const firstTarget = useRef<HTMLButtonElement>(null);
  return <div className="cr-target co-lab"><p className="co-kicker">{item.label}</p><blockquote>{item.before}{correct ? <mark>{item.target}</mark> : item.target}{item.after}</blockquote><h3 id={id}>Which complete idea does the indicator refer to?</h3><div className="cr-answer-options" role="group" aria-labelledby={id}>{item.options.map((option, index) => <button ref={index === 0 ? firstTarget : undefined} key={option} type="button" aria-pressed={choice === index} onClick={() => setChoice(index)}>{option}</button>)}</div><div role="status">{choice !== null && <div className={`cr-feedback ${correct ? 'cr-correct' : 'cr-revise'}`}><strong>{correct ? 'Correct target.' : 'Not quite.'}</strong><p>{item.feedback[choice]}</p></div>}</div>{choice !== null && <button type="button" className="cr-reset" onClick={() => { firstTarget.current?.focus(); setChoice(null); }}>Clear the target</button>}</div>;
}

type PracticeItem = { sentence: string; left: string; right: string; leftCode: string; rightCode: string; leftNegated?: boolean; rightNegated?: boolean; originalPosition: number; contraPosition: number; why: string; readback: string; contraReadback: string };
export const referencePracticeItems: PracticeItem[] = [
  { sentence: 'If a parcel has a red tracking tag, its sender has paid for tracking.', left: 'Parcel has red tracking tag', right: 'Sender has paid for tracking', leftCode: 'RT', rightCode: 'PT', originalPosition: 1, contraPosition: 2, why: 'The if-clause is enough to establish payment. A sender who paid could have a parcel without this tag; payment alone does not settle the tag.', readback: 'If a parcel has a red tracking tag, its sender has paid for tracking.', contraReadback: 'If its sender has not paid for tracking, the parcel does not have a red tracking tag.' },
  { sentence: 'Every applicant who submits by Friday receives a confirmation.', left: 'Applicant submits by Friday', right: 'Applicant receives confirmation', leftCode: 'SF', rightCode: 'RC', originalPosition: 2, contraPosition: 0, why: 'Keep who submits by Friday with applicant. The rule gives those applicants confirmations; it does not restrict all confirmations to them.', readback: 'If an applicant submits by Friday, the applicant receives a confirmation.', contraReadback: 'If an applicant does not receive a confirmation, the applicant did not submit by Friday.' },
  { sentence: 'A document is stored in the archive only if it has a catalogue number.', left: 'Document stored in archive', right: 'Document has catalogue number', leftCode: 'A', rightCode: 'C', originalPosition: 0, contraPosition: 1, why: 'Only if identifies the catalogue number as required. A numbered document could remain outside the archive.', readback: 'If a document is stored in the archive, it has a catalogue number.', contraReadback: 'If a document has no catalogue number, it is not stored in the archive.' },
  { sentence: 'A backup copy is required for a file to be deleted.', left: 'File is deleted', right: 'File has backup copy', leftCode: 'D', rightCode: 'B', originalPosition: 1, contraPosition: 0, why: 'The requirement appears first in the sentence. Deletion requires the backup; having a backup does not establish deletion.', readback: 'If a file is deleted, it has a backup copy.', contraReadback: 'If a file has no backup copy, it is not deleted under this rule.' },
  { sentence: 'Only guests with prepaid tickets enter the balcony.', left: 'Guest enters balcony', right: 'Guest has prepaid ticket', leftCode: 'E', rightCode: 'P', originalPosition: 2, contraPosition: 1, why: 'Only restricts balcony entrants to guests with prepaid tickets. A ticketed guest can stay outside, so the ticket alone is not enough.', readback: 'If a guest enters the balcony, the guest has a prepaid ticket.', contraReadback: 'If a guest does not have a prepaid ticket, the guest does not enter the balcony.' },
  { sentence: 'The only recipes printed on the weekly menu are vegan recipes.', left: 'Recipe printed on weekly menu', right: 'Recipe is vegan', leftCode: 'M', rightCode: 'V', originalPosition: 0, contraPosition: 2, why: 'The only recipes printed on the weekly menu names the group whose recipes must be vegan. Other vegan recipes can be absent from the menu.', readback: 'If a recipe is printed on the weekly menu, it is vegan.', contraReadback: 'If a recipe is not vegan, it is not printed on the weekly menu.' },

  { sentence: 'If a parcel has not cleared customs, it stays in the holding room.', left: 'Parcel has cleared customs', right: 'Parcel stays in holding room', leftCode: 'C', rightCode: 'H', leftNegated: true, originalPosition: 2, contraPosition: 1, why: 'Not having cleared customs is enough to establish the holding room. A parcel outside that room cannot be one that has not cleared customs, so it has cleared customs. Negating not cleared removes the not.', readback: 'If a parcel has not cleared customs, it stays in the holding room.', contraReadback: 'If a parcel does not stay in the holding room, it has cleared customs.' },
  { sentence: 'If the display is active, its status light is not red.', left: 'Display is active', right: 'Status light is red', leftCode: 'A', rightCode: 'R', rightNegated: true, originalPosition: 1, contraPosition: 2, why: 'An active display requires a light that is not red. A red light is the absence of that requirement, so it rules out an active display. A light that is not red does not prove the display is active.', readback: 'If the display is active, its status light is not red.', contraReadback: 'If the status light is red, the display is not active.' },
  { sentence: 'If a room is not reserved, its door is not locked.', left: 'Room is reserved', right: 'Door is locked', leftCode: 'R', rightCode: 'L', leftNegated: true, rightNegated: true, originalPosition: 0, contraPosition: 1, why: 'The rule requires an unlocked door for a room that is not reserved. A locked door rules out that not-reserved condition, establishing a reservation. Reversing and negating removes both existing not-signs; it does not make reservation enough for locking.', readback: 'If a room is not reserved, its door is not locked.', contraReadback: 'If a room’s door is locked, the room is reserved.' },
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
    <fieldset><legend>Original diagram for item {number}</legend><div className="cr-answer-options cr-symbol-options">{practiceChoices(item, false).map((option, index) => <button key={option} type="button" aria-pressed={original === index} onClick={() => change(index, false)}>{option}</button>)}</div></fieldset>
    <fieldset><legend>Contrapositive for item {number}</legend><div className="cr-answer-options cr-symbol-options">{practiceChoices(item, true).map((option, index) => <button key={option} type="button" aria-pressed={contra === index} onClick={() => change(index, true)}>{option}</button>)}</div></fieldset>
    <div className="cr-control-row"><button type="button" className="cr-primary" disabled={original === null || contra === null} aria-label={`Check both diagrams for item ${number}`} onClick={() => { setChecked(true); onChecked?.(true); }}>Check both diagrams</button><button type="button" className="cr-reset" onClick={reset}>Try item {number} again</button></div>
    <div role="status">{checked && <div className={`cr-feedback ${correct ? 'cr-correct' : 'cr-revise'}`}><strong>{correct ? 'Both diagrams are correct.' : 'Review the relationship.'}</strong><p>{original === item.originalPosition ? 'Your original preserves the direction.' : 'Your original changes the direction or negates conditions the sentence did not negate.'} {contra === item.contraPosition ? 'Your contrapositive reverses and negates both complete conditions.' : 'Your contrapositive must start from the missing requirement and rule out the sufficient condition.'}</p><p>{item.why}</p><p className="cr-answer-key">Original: {practiceDiagrams(item).original}<br/>Contrapositive: {practiceDiagrams(item).contra}</p><p>Read the original: {item.readback}</p><p>Read its contrapositive: {item.contraReadback}</p></div>}</div>
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
      <p>Under this rule, winning the raffle makes getting a bicycle certain. Winning without getting one would break the stated relationship. That is what we mean by a <strong>guarantee</strong> here.</p>
      <p>Compare that with “If you win the raffle, you usually get a bicycle.” Usually allows an exception. Our rule does not. Take the stated rule as given; we are asking what it tells us, not whether a real organizer keeps a promise.</p>
      <ReferenceQuestion prompt="Does the rule itself tell us that you actually win the raffle?" options={['Yes, it says I win.', 'No, it tells me what follows if I win.']} correct={1} feedback={['You added a case fact. The rule has not reported a win; it tells you what getting one would establish.', 'Imagining a win helps us understand the rule. We need a separate fact to establish that you actually win.']}/>
      <p>Now let's take the two conditions one at a time.</p>
    </ReferenceStep>

    <ReferenceStep number={2} label="Sufficient means enough" title="One condition gives you enough">
      <blockquote>{raffleRule}</blockquote><p>The <strong>if-part</strong> is the <strong>sufficient condition</strong>. Sufficient means enough. Knowing you win is enough, under this rule, to know you get a bicycle.</p>
      <div className="cr-role-exhibit"><span>Sufficient</span><strong>Win the raffle</strong><p>Enough to establish getting a bicycle</p></div>
      <p>You might win. You might not. The rule has not settled that question.</p>
      <ReferenceQuestion prompt="You don't win the raffle. Could you still get a bicycle?" options={['Yes. Getting a bicycle is still possible.', 'No. Without winning, getting a bicycle is impossible.']} correct={0} feedback={['You could buy one or receive one as a gift. You could also not get one. Neither case creates a winner who fails to get a bicycle, so both fit the rule.', 'You made winning the only way to get a bicycle. The sentence gives one sufficient condition; it has not excluded other ways.']}/>
      <p>Now suppose a fact gives us the sufficient condition. That is when we can <strong>use</strong>, or activate, the rule in its stated direction.</p>
      <ReferenceQuestion prompt="You win the raffle. Do we need another fact to establish that you get a bicycle?" options={['Yes, we need another fact about the bicycle.', 'No, the rule and the win establish it.']} correct={1} feedback={['The rule already covers the case in which you win. That fact meets its sufficient condition.', 'Winning meets the sufficient condition. With the rule, that is enough to establish that you get a bicycle.']}/>
      <p>We'll now keep this job in mind while changing the wording.</p>
    </ReferenceStep>

    <ReferenceStep number={3} label="The sufficient family" title="Different words can preserve the same rule">
      <p>An <strong>indicator</strong> is an expression that helps you recognize a conditional relationship. These expressions can introduce an idea that is enough to establish another.</p>
      <p>For the next examples, use a different stated rule: anyone who borrows a locker has a key. We will express that same connection in several ways. We haven't said everyone with a key borrows a locker.</p>
      <WordFamily entries={sufficientFamily} role="sufficient"/>
      <p>When/whenever and any/anytime group related forms together. An ending changes the kind of case being discussed, but these examples keep the same connection. For example, every guest wearing a blue badge covers that whole group. Guest alone would include people without badges. Use the expression to find the group, then keep the words that limit it.</p>
      <ReferenceQuestion prompt="Every guest wearing a blue badge receives a lunch voucher. Which complete idea is enough?" options={['Guest', 'Guest wearing a blue badge', 'Receives a lunch voucher']} correct={1} feedback={['Guest alone drops the badge restriction and would make a claim about unbadged guests.', 'The rule gives a voucher to every guest wearing a blue badge. Keep that qualification with the person.', 'The voucher is what the rule establishes. It has not said every voucher recipient wears a blue badge.']}/>
      <details className="cr-extension"><summary>Two more Group 1 expressions</summary><p><strong>Where</strong> can state a relationship across locations: “Where a collection point operates, parcels can be returned.” An operating collection point establishes the availability of returns there. Availability is not proof that someone made a return.</p><p><strong>The only</strong> needs its complete phrase: “The only notebooks on this shelf are hardback.” A notebook on the shelf is hardback. The sentence does not put every hardback notebook there.</p><p>These are part of your Group 1 work. Understand what the full expression covers before using its group as a placement shortcut.</p></details>
      <p>We have seen what can be enough. Now let's name what that condition requires.</p>
    </ReferenceStep>

    <ReferenceStep number={4} label="Necessary means required" title="The other condition has to be there">
      <blockquote>{raffleRule}</blockquote><p>The <strong>then-part</strong> is the <strong>necessary condition</strong>. Necessary means required. Under this rule, if you win, getting a bicycle has to follow.</p>
      <div className="cr-role-exhibit cr-required"><span>Necessary</span><strong>Get a bicycle</strong><p>Required whenever you win the raffle</p></div>
      <p>Ask “required for what?” Here, a required result of winning under this rule. It is not a requirement you must satisfy before entering. The word necessary describes the relationship, not when the events occur.</p>
      <p>We're looking at the same rule from its other side. Winning is enough to establish getting a bicycle. Getting a bicycle is the result the rule requires whenever you win.</p>
      <ReferenceQuestion prompt="Under our rule, what has to follow if you win?" options={['You get a bicycle.', 'You ride the bicycle home.']} correct={0} feedback={['Getting a bicycle is the stated result. Winning without getting one would violate the rule.', 'Riding is not part of this rule. The sentence establishes that you get a bicycle, not what you do with it.']}/>
      <p>Necessary does not mean “the next event.” It means required by this relationship. A conditional need not tell you which event caused another, or when either happened.</p>
      <p>As with sufficient language, the wording can vary while the relationship stays the same.</p>
    </ReferenceStep>

    <ReferenceStep number={5} label="The necessary family" title="Listen for what the sentence needs">
      <p>Return to our locker rule. Borrowing a locker requires a key. The next expressions all identify that requirement in their complete sentences.</p>
      <WordFamily entries={necessaryFamily} role="necessary"/>
      <div className="cr-contrast"><div><h3>If</h3><p>“You borrow a locker <strong>if</strong> you have a key.”</p><p>Having a key is enough for borrowing under this sentence.</p></div><div><h3>Only if</h3><p>“You borrow a locker <strong>only if</strong> you have a key.”</p><p>Having a key is required. This sentence has not made it enough.</p></div></div>
      <ReferenceQuestion prompt="A guest enters the lounge only if the guest has a current pass. What does entering establish?" options={['The guest has a current pass.', 'Every guest with a pass enters.']} correct={0} feedback={['Only if identifies the current pass as required for entry. An entering guest therefore meets that requirement.', 'You made the requirement enough. A guest could have a current pass and remain outside without violating the sentence.']}/>
      <details className="cr-extension"><summary>More Group 2 forms, with the sentence intact</summary><p><strong>Only when</strong> and <strong>only where</strong> can restrict the occasions or places of an outcome: “The fountain runs only when its pump is on.” A running fountain requires an operating pump. The pump being on does not establish that the fountain runs.</p><p><strong>Requires</strong> directly names a requirement: “Entry requires a current pass.” Preserve current. <strong>Always</strong> needs the sentence's subject and scope: “The upstairs room is always quiet when the door is shut.” Here a shut door establishes quiet, not the other way around.</p><p><strong>Only</strong> and <strong>the only</strong> are different complete expressions. “Only people who get a bicycle win this raffle” and “The only people who win this raffle are people who get a bicycle” both preserve the rule: winning establishes getting a bicycle.</p></details>
      <p>We can now recognize both roles before writing any symbols. Next, let's see what happens when a requirement is missing.</p>
    </ReferenceStep>

    <ReferenceStep number={6} label="A missing requirement" title="What if the requirement is missing?" dark>
      <ContrapositiveDiscovery/>
    </ReferenceStep>

    <ReferenceStep number={7} label="The four situations" title="Keep what follows separate from what stays open">
      <p>Change the fact about your outcome while keeping the rule. Treat each fact as settled, not as a report that you are still waiting. Decide what it establishes before comparing the explanation.</p>
      <FourCaseExplorer/>
      <p>Starting from getting a bicycle and concluding that you win is the tempting <strong>reverse</strong>. Starting from not winning and concluding that you do not get a bicycle is the tempting <strong>inverse</strong>. Neither follows from this rule alone.</p>
      <p>The contrapositive starts from <strong>not getting a bicycle</strong> and establishes <strong>not winning the raffle</strong>. Its reasoning depends on the missing required result, not on reversing whichever words happen to appear.</p>
      <p>We now understand the relationship in words. Symbols will let us record that understanding without carrying every word of the sentence.</p>
    </ReferenceStep>

    <ReferenceStep number={8} label="Build the first diagram" title="Give the relationship a shorter form">
      <p>Put the sufficient condition on the <strong>left</strong>, the necessary condition on the <strong>right</strong>, and a <strong>must arrow</strong> between them.</p>
      <RuleDiagram left="Sufficient: enough" right="Necessary: required"/>
      <p>The arrow means the left condition requires the right. It does not mean the left caused the right, or that the right happens later.</p>
      <h3>Which idea goes on which side?</h3>
      <p>The indicator helps you find a condition's job. Once you've found that job, place the <strong>complete condition</strong> on its side of the arrow. We don't put the word if or only if in the diagram.</p>
      <div className="cr-contrast"><div><h3>Left: sufficient</h3><p>This is the condition that's enough to establish the other one. Group 1 expressions such as <strong>if, when, all, every</strong> and <strong>any</strong> can identify this condition.</p><p>“All people who borrow a locker have a key.” All refers to <strong>people who borrow a locker</strong>. For someone in that group, having a key follows. Borrowing goes left.</p></div><div><h3>Right: necessary</h3><p>This is what the sufficient condition requires. Group 2 expressions such as <strong>only if, requires</strong> and <strong>must</strong> can identify the requirement.</p><p>“Borrowing a locker requires a key.” What is required? <strong>Having a key.</strong> That condition goes right.</p></div></div>
      <RuleDiagram left="Borrows a locker" right="Has a key"/>
      <p>Read it back: if someone borrows a locker, they have a key. The arrow records that connection. It hasn't told us that everyone with a key borrows a locker.</p>
      <h3>The sentence can move. The roles stay the same.</h3>
      <p>Compare these two versions of our raffle rule. The indicator is bold; the complete idea it refers to is in brackets.</p>
      <div className="cr-language-pair"><p><strong>If</strong> [you win the raffle], you get a bicycle.</p><p>You get a bicycle <strong>if</strong> [you win the raffle].</p><span>If identifies the sufficient condition in both sentences.</span></div>
      <p>In the second sentence, if appears in the middle. Its condition comes last, but winning is still enough to establish getting a bicycle. That condition still goes left. Don't let the first phrase in English choose the first side of your diagram.</p>
      <RuleDiagram left="Win the raffle" right="Get a bicycle"/>
      <p>Now try the same move with a requirement.</p>
      <div className="cr-language-pair"><p><strong>Only</strong> [people with a key] borrow a locker.</p><p>A person borrows a locker <strong>only if</strong> [they have a key].</p><span>Only and only if identify the necessary condition here.</span></div>
      <p>Both sentences say locker borrowers have a key. In the first, only is at the beginning. In the second, only if is in the middle. Having a key is required in both, so it goes right. <strong>If</strong> and <strong>only if</strong> have different jobs; read only if as the whole expression.</p>
      <ReferenceQuestion prompt="A person borrows a locker only if they have a key. Which condition goes on the right?" options={['Borrows a locker', 'Has a key']} correct={1} feedback={['Borrowing is what has the requirement. Ask what a locker borrower must have: a key. Borrowing goes left; having a key goes right.', 'Having a key is required for borrowing. Only if appears in the middle, but it still identifies the necessary condition.']}/>
      <h3>The indicator can also follow its target</h3>
      <div className="cr-language-pair"><p>[Having a key] is <strong>required</strong> for borrowing a locker.</p><p>Borrowing a locker <strong>requires</strong> [having a key].</p><span>Having a key is the requirement in both sentences.</span></div>
      <p>The target is the complete idea the indicator refers to. It comes before required in the first sentence and after requires in the second. Having a key still goes right. We find it by asking what is required, not by taking whichever words come next.</p>
      <p>In your Group 1 and Group 2 lessons, compare what each expression tells you about the same case. If you know someone borrows a locker, a key follows. Knowing that person has a key leaves borrowing open. Different wording should preserve that distinction.</p>
      <p>Let's build an original diagram slowly. First find the indicator, then draw the arrow, place the complete idea it refers to, and fill the other side.</p>
      <IncrementalWriter/>
      <p>Now move the if-clause: “You get a bicycle if you win the raffle.” The winning condition comes last in English but still goes left in the diagram. Its job has not changed.</p>
      <ReferenceQuestion prompt="Which diagram preserves the moved if-clause?" options={['Get bicycle → Win', 'Win → Get bicycle']} correct={1} feedback={['You let sentence order choose the arrow. The if-clause still makes winning enough for getting a bicycle.', 'The sufficient condition is still winning. Where it appears in the sentence does not change what it establishes.']}/>
    </ReferenceStep>

    <ReferenceStep number={9} label="Write and read the contrapositive" title="Write the meaning you already understand">
      <p>Win means you win the raffle. Get bicycle means you get a bicycle. Our original is Win → Get bicycle.</p>
      <p>We already know that not getting a bicycle rules out winning. Write that as <strong>~Get bicycle → ~Win</strong>. The <strong>~</strong> sign means <strong>not</strong>. Not getting the outcome is different from not having received it yet.</p>
      <p>To write a contrapositive from a diagram, reverse the two sides and negate <strong>both complete conditions</strong>. A condition already containing not loses that not when we negate it. Let's try all four patterns.</p>
      <SignPatterns/>
      <div className="cr-method"><p className="co-kicker">The complete five-step routine</p><ol><li><strong>Find the indicator.</strong> Read its job in the whole sentence.</li><li><strong>Identify both complete ideas.</strong> Keep restrictions such as current or submitted by Friday.</li><li><strong>Place the roles.</strong> Sufficient goes left; necessary goes right. Choose labels you can read back.</li><li><strong>Write the contrapositive.</strong> Reverse the sides and negate both complete conditions.</li><li><strong>Read both in English.</strong> Compare them with what the original sentence actually requires.</li></ol></div>
      <p>The original and its contrapositive describe the same relationship. If writing both helps you see that relationship, write both. If you can read the contrapositive from the original when it is relevant, you needn't copy it merely to have a second line.</p>
      <p>Read an arrow forward to use its stated direction. To read its contrapositive, start from the right condition's absence and work back to the left condition's absence. That is a different move from reading the arrow backward unchanged.</p>
    </ReferenceStep>

    <ReferenceStep number={10} label="Practical diagramming questions" title="Use writing to make your reasoning easier to check">
      <div className="cr-faq">
        <details><summary>When should I diagram?</summary><p>While learning, write enough to make your choices visible. A difficult sentence, several rules or a connection you keep rereading can be a reason to put the relationship on paper. With practice, you may hold a simple rule mentally. Use the writing to help the reasoning.</p></details>
        <details><summary>How do I check whether my diagram is right?</summary><p>Read it back and compare the whole meaning. Did you keep each restriction? Does your arrow promise something the original leaves open? When a diagram is wrong, record the exact phrase and the mistake it produced. That gives you something specific to practice. Familiarity alone is not proof of correctness.</p></details>
        <details><summary>What if writing takes time?</summary><p>Start by producing a correct, readable diagram. Speed is a later practice goal. Writing can reduce rereading, but it does not save time in every case. Compare how it helps on the sentences you are actually working through. First make the relationship accurate. Work on speed once you can explain why the arrow follows. </p></details>
        <details><summary>Should I always write the contrapositive?</summary><p>You need to understand it every time. Write it when it helps you use the missing requirement, inspect your translation or connect rules. Otherwise, you may read that direction from the original. Extra notation should have a job.</p></details>
        <aside className="cr-training-note"><h3>Why this practice asks for both</h3><p>In the integrated drill, write or choose the original and the contrapositive. We're checking that you can produce both. Once that skill is reliable, a performance task need not require both lines for every rule.</p></aside>
        <details><summary>How should I abbreviate the conditions?</summary><p>Use short labels that bring back the complete idea. W might mean win this raffle. Current pass may be clearer than a single letter if you're tracking several kinds of pass. Shortening should save writing without losing meaning. There is no fixed letter limit.</p></details>
      </div>
      <ReferenceQuestion prompt="Only envelopes with a paid stamp go into this tray. Someone wrote Paid stamp → In tray. What needs repairing?" options={['The labels need to be longer.', 'The arrow makes the requirement enough.', 'Nothing; the first phrase always goes left.']} correct={1} feedback={['Longer labels would not repair the direction. The tray requires a paid stamp, but a stamped envelope can remain outside it.', 'Only restricts tray envelopes to ones with paid stamps. In tray → Paid stamp preserves that requirement; the proposed reverse promises tray placement to every stamped envelope.', 'Sentence order does not determine diagram order. Only identifies the paid stamp as required for tray placement.']}/>
      <p>That error came from the language. Let's inspect precisely which idea an indicator refers to.</p>
    </ReferenceStep>

    <ReferenceStep number={11} label="Find the target" title="Which reports can be published?">
      <p>An indicator's <strong>target</strong> is the complete word or phrase it refers to. In “All guests wearing blue badges receive vouchers,” all refers to guests wearing blue badges, not guests alone.</p>
      <p>In the first sentence below, only names reports with editor approval. In the next, editor approval comes before necessary. Choose the words that identify what publication requires in each sentence.</p>
      {targetExamples.map(item => <TargetReader item={item} key={item.label}/>)}
      <div className="cr-language-pair"><p>“Editor approval is required for publication.”</p><p>“Publication requires editor approval.”</p><span>Same requirement, different placement</span></div>
      <p>Publication needs editor approval in all three sentences. Approval can appear before or after the indicator without changing that requirement. Publication therefore goes on the left and editor approval on the right.</p>
      <p>When the wording still feels uncertain, we can test a proposed translation against an imagined case.</p>
    </ReferenceStep>

    <ReferenceStep number={12} label="Check an interpretation" title="Try the sentence from the inside">
      <p>A <strong>Personalized If/Then</strong> lets you test what a proposed sufficient condition would establish. First read the ordinary meaning. Propose the sufficient idea. Imagine a case meeting it. Ask what the sentence now requires.</p>
      <blockquote>Only people wearing helmets ride the studio bikes.</blockquote><p>The sentence restricts riders to people wearing helmets. Keep that meaning while trying each proposed starting point.</p>
      <div className="cr-personalized"><div><p className="co-kicker">First proposed starting point</p><ReferenceQuestion prompt="If I'm riding a studio bike, what does this sentence tell me?" options={['I am wearing a helmet.', 'The helmet question is open.']} correct={0} feedback={['The sentence puts every rider in the helmet-wearing group. Riding → Wearing helmet preserves that meaning.', 'Only restricts who rides. If you meet the riding condition, the sentence does settle helmet wearing.']}/></div><div><p className="co-kicker">Try the other starting point</p><ReferenceQuestion prompt="If I'm wearing a helmet, must I be riding a studio bike?" options={['Yes, the helmet proves riding.', 'No, I could wear one without riding.']} correct={1} feedback={['You gave every helmet wearer a ride. The sentence restricts riders; it does not make all helmet wearers riders.', 'A helmet wearer waiting beside a bike fits the sentence. Wearing helmet → Riding would add a promise the original did not make.']}/></div></div>
      <p>The first reading matches the sentence. The second proposed arrow fails because it rules out a case the original permits. Use the imagined situation to inspect meaning, not to supply extra facts from what usually happens.</p>
      <h3>Use the What Test beside it</h3><p>Only what? People wearing helmets. People alone would drop the helmet restriction. The complete phrase tells us which people can ride a studio bike. Riding establishes that the rider wears a helmet; wearing one still doesn't establish riding.</p>
      <p>The What Test keeps wearing a helmet attached to people. The Personalized If/Then lets you check the arrow: imagine you ride a studio bike, then ask what the sentence requires you to know. If your diagram instead promises a ride to everyone wearing a helmet, it has changed the rule.</p>
      <p>We've now read the relationship, understood its limits, written both directions and checked the language. Put those pieces together with fresh sentences.</p>
    </ReferenceStep>

    <ReferenceStep number={13} label="Use the whole process" title="Build an original and its contrapositive">
      <p>For each sentence, identify the indicator and both complete conditions. Choose the original diagram, then its contrapositive. Read both back before checking.</p>
      <p>You can look back. The job here is to produce and inspect the reasoning, not to prove you memorized every expression on the first reading. The labels below keep the complete ideas visible while you choose the directions.</p>
      <div className="cr-integrated-grid">{referencePracticeItems.map((item, index) => <IntegratedItem item={item} number={index + 1} key={item.sentence}/>)}</div>
      <p>If an answer needs revision, name the exact issue: lost qualification, wrong role, reversed arrow or incomplete negation. Then retry that item. Your targeted Group 1 and Group 2 work gives you more practice with individual expressions; this set checks whether the steps hold together.</p>
    </ReferenceStep>
    <section id="reference-boundary" className="cr-boundary co-section" data-reference-boundary data-toc data-toc-title="Permission and instructions">
      <p className="co-kicker">Before the attached practice</p><h2>Keep what the sentence actually gives you</h2>
      <p>The core process is now in place. One more distinction matters for the practice: a conditional can give permission or an instruction. Preserve that strength instead of turning it into a report of what someone did.</p>
      <blockquote>Every guest with a ticket may use the cloakroom.</blockquote><p>May use gives permission here. A ticketed guest is allowed to use the cloakroom. The guest could keep their coat on and never go inside.</p>
      <ReferenceQuestion prompt="Lena is a guest with a ticket. Do we know that she used the cloakroom?" options={['Yes, the ticket establishes that she used it.', 'No, we know she is allowed to use it.']} correct={1} feedback={['You turned permission into a completed action. Lena meets the condition for permission, but we have no fact reporting her use of the cloakroom.', 'The rule gives Lena permission because she is a guest with a ticket. Whether she used the cloakroom remains open.']}/>
      <p>Now compare an instruction. “If your coat is wet, hang it on the rack” tells you what to do with a wet coat. It does not report that someone followed the instruction.</p>
      <ReferenceQuestion prompt="The notice says: If a tray is empty, return it to the counter. This tray is empty. What does the instruction establish?" options={['The tray has been returned.', 'The instruction calls for returning the tray.', 'The tray cannot be returned.']} correct={1} feedback={['You turned an instruction into a completed action. The notice has not reported that anyone returned this tray.', 'The empty tray meets the condition in the instruction, so the notice calls for returning it. Whether someone returned it is a separate question.', 'The instruction asks for a return. It does not say a return is impossible.']}/>
      <p>Allowed to use isn't used. Told to return isn't returned. Your conclusion should keep the meaning the sentence actually gave you.</p>
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
      const sentenceMove = parts.findIndex(child => isValidElement<{children?: ReactNode}>(child) && child.type === 'h3' && child.props.children === 'The sentence can move. The roles stay the same.');
      const targetMove = parts.findIndex(child => isValidElement<{children?: ReactNode}>(child) && child.type === 'h3' && child.props.children === 'The indicator can also follow its target');
      return [
        { title: 'Build the first diagram: the two sides', content: <ReferenceStep number={8} label="Build the first diagram · 1 of 3" title="Give the relationship a shorter form">{parts.slice(0, sentenceMove)}</ReferenceStep> },
        { title: 'Build the first diagram: sentence order', content: <ReferenceStep number={8} part={2} label="Build the first diagram · 2 of 3" title="The sentence can move. The roles stay the same.">{parts.slice(sentenceMove + 1, targetMove)}</ReferenceStep> },
        { title: 'Build the first diagram: target and readback', content: <ReferenceStep number={8} part={3} label="Build the first diagram · 3 of 3" title="Find the target wherever it appears">{parts.slice(targetMove + 1)}</ReferenceStep> },
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
          <p>If an answer needs revision, name the exact issue: lost qualification, wrong role, reversed arrow or incomplete negation. Then retry that item. Your targeted Group 1 and Group 2 work gives you more practice with individual expressions; this set checks whether the steps hold together.</p>
        </ReferenceStep>,
      }));
    }
    return [{ title: node.props.title || node.props['data-toc-title'] || 'Keep the meaning', content: node }];
  });
}
