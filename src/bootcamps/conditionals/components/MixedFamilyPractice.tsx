import { useId, useRef, useState } from 'react';
import { RuleDiagram } from './ConditionalReferenceSequence';

type MixedItem = {
  sentence: string;
  word: string;
  family: 'sufficient' | 'necessary';
  target: string;
  targetPrompt: string;
  targetFeedback: string;
  partial: string;
  other: string;
  left: string;
  right: string;
  partialFeedback: string;
  otherFeedback: string;
  reversed: string;
  why: string;
  readback: string;
};

// Original sentences. The families alternate and no label is shown until the
// learner has checked a translation. Do not promise an unpredictable order.
export const mixedFamilyItems: MixedItem[] = [
  {
    sentence: 'The match moves indoors if the forecast shows lightning.', word: 'if', family: 'sufficient',
    targetPrompt: 'What does the forecast have to show for the match to move indoors under this rule?', targetFeedback: 'You identified the forecast showing lightning.',
    target: 'the forecast shows lightning', partial: 'the forecast', other: 'the match moves indoors',
    left: 'Forecast shows lightning', right: 'Match moves indoors',
    partialFeedback: "The forecast alone isn't something that can be true or false. If refers to the whole clause: the forecast shows lightning.",
    otherFeedback: 'Moving indoors is what the rule establishes. If points to the clause after it: the forecast shows lightning.',
    reversed: 'Your arrow makes every indoor match proof of a lightning forecast. The match could move indoors because the pitch is flooded, and that case still fits the sentence.',
    why: "The if-clause comes last, but it's still the part that's enough. A lightning forecast establishes the move indoors.",
    readback: 'If the forecast shows lightning, the match moves indoors.',
  },
  {
    sentence: 'A student joins the choir trip only if a parent signs the consent form.', word: 'only if', family: 'necessary',
    targetPrompt: 'What does a student need in order to join the choir trip?', targetFeedback: 'You kept what the parent must do: sign the consent form.',
    target: 'a parent signs the consent form', partial: 'a parent', other: 'a student joins the choir trip',
    left: 'Joins choir trip', right: 'Parent signs consent form',
    partialFeedback: 'A parent alone drops what the parent has to do. The requirement is the signature: a parent signs the consent form.',
    otherFeedback: 'Joining the trip is the condition that carries the requirement. Only if points to what joining needs: a signed form.',
    reversed: "Your arrow promises a place on the trip to every student with a signed form. A student with a signed form who is ill on the day fits the sentence, so the signature isn't enough.",
    why: 'Only if names a requirement. Any student on the trip has a signed form. A signed form leaves the trip open.',
    readback: 'If a student joins the choir trip, a parent has signed the consent form.',
  },
  {
    sentence: 'Every bus leaving the depot after midnight stops at the hospital.', word: 'every', family: 'sufficient',
    targetPrompt: 'Which buses does the rule say stop at the hospital?', targetFeedback: 'You kept both restrictions: leaving the depot and after midnight.',
    target: 'bus leaving the depot after midnight', partial: 'bus', other: 'stops at the hospital',
    left: 'Bus leaves depot after midnight', right: 'Stops at hospital',
    partialFeedback: 'Bus alone would cover the daytime buses too. Every refers to buses leaving the depot after midnight, so keep the depot and the time.',
    otherFeedback: 'Stopping at the hospital is what the rule establishes. Every points to the group it covers: buses leaving the depot after midnight.',
    reversed: "Your arrow says any bus at the hospital left the depot after midnight. A morning bus stopping there fits the sentence, so the stop doesn't settle when the bus left the depot.",
    why: 'Every covers each bus leaving the depot after midnight. Pick one, and the rule tells you it stops at the hospital.',
    readback: 'If a bus leaves the depot after midnight, it stops at the hospital.',
  },
  {
    sentence: 'A booked table is required to eat on the terrace.', word: 'required', family: 'necessary',
    targetPrompt: 'What kind of table does someone need to eat on the terrace?', targetFeedback: "You kept booked. The sentence requires a booking, not just any table.",
    target: 'a booked table', partial: 'a table', other: 'eat on the terrace',
    left: 'Eats on terrace', right: 'Has booked table',
    partialFeedback: "A table drops booked, and booked is the requirement. The sentence doesn't ask for just any table; it asks for a booked one.",
    otherFeedback: 'Eating on the terrace is what needs the booking. Required refers back to the idea before it: a booked table.',
    reversed: 'Your arrow sends everyone with a booking to the terrace. A diner could book a table and eat inside, and the sentence allows that.',
    why: "Here the target comes before required. Eating on the terrace needs a booked table. A booking alone doesn't put you there.",
    readback: 'If someone eats on the terrace, they have a booked table.',
  },
  {
    sentence: 'The only phones placed in the same-day repair queue are phones that arrived with a cracked screen.', word: 'the only', family: 'sufficient',
    targetPrompt: 'Which phones does the rule say arrived with a cracked screen?', targetFeedback: 'The sentence covers phones in the same-day repair queue.',
    target: 'phones placed in the same-day repair queue', partial: 'phones', other: 'phones that arrived with a cracked screen',
    left: 'Phone in same-day repair queue', right: 'Arrived with cracked screen',
    partialFeedback: 'Phones alone would make a claim about every phone in the shop. The only refers to phones placed in the same-day repair queue.',
    otherFeedback: 'Arriving with a cracked screen is what every phone in that queue has in common. Ask the only what? Phones placed in the same-day repair queue.',
    reversed: 'Your arrow puts every phone that arrived with a cracked screen in the same-day repair queue. A phone that arrived cracked and was booked in for next week fits the sentence.',
    why: "The only introduces the group that's enough. Any phone placed in the same-day repair queue arrived with a cracked screen. Arriving with a cracked screen doesn't put a phone in that queue.",
    readback: 'If a phone is placed in the same-day repair queue, it arrived with a cracked screen.',
  },
  {
    sentence: 'Only stalls with a permit sell food at the festival.', word: 'only', family: 'necessary',
    targetPrompt: 'What must be true of a stall that sells food at the festival?', targetFeedback: 'Every stall selling food at the festival has a permit.',
    target: 'stalls with a permit', partial: 'stalls', other: 'sell food at the festival',
    left: 'Stall sells food at festival', right: 'Stall has permit',
    partialFeedback: 'Stalls alone loses the restriction. Only refers to stalls with a permit.',
    otherFeedback: 'Selling food is what the restriction limits. Only points to which stalls sell food under this statement: stalls with a permit.',
    reversed: 'Your arrow says every stall with a permit sells food. A permitted stall selling only crafts fits the sentence.',
    why: "Only limits food sellers to permitted stalls. A stall selling food has a permit. A permit doesn't tell you what the stall sells.",
    readback: 'If a stall sells food at the festival, it has a permit.',
  },
];

const targetOptions = (item: MixedItem, index: number) => {
  const options = [item.target, item.partial, item.other];
  return [...options.slice(index % 3), ...options.slice(0, index % 3)];
};
const sideOptions = (item: MixedItem, index: number) => index % 2 === 0 ? [item.right, item.left] : [item.left, item.right];

export function MixedItemCheck({ item, index, onChecked, onResult, embedded = false }: { item: MixedItem; index: number; onChecked: (checked: boolean) => void; onResult?: (result: { targetCorrect: boolean; targetIncomplete: boolean; sideCorrect: boolean } | null) => void; embedded?: boolean }) {
  const [draftDiagram, setDraftDiagram] = useState('');
  const [draftReadback, setDraftReadback] = useState('');
  const [comparing, setComparing] = useState(false);
  const draftQuestion = useId();
  const readbackQuestion = useId();
  const draftInput = useRef<HTMLTextAreaElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [left, setLeft] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const targetQuestion = useId();
  const sideQuestion = useId();
  const change = (update: () => void) => { update(); setChecked(false); onChecked(false); onResult?.(null); };
  const reset = () => { draftInput.current?.focus(); setComparing(false); setTarget(null); setLeft(null); setChecked(false); onChecked(false); onResult?.(null); };
  const targetCorrect = target === item.target;
  const sideCorrect = left === item.left;
  const number = index + 1;
  return <div className="co-lab co-check" data-mixed-item={number}>
    <blockquote>{item.sentence}</blockquote>
    <p>Write both sides of the arrow, keeping details such as who, when and where. Then write what your diagram says as an if/then sentence. Use full words or short labels you define.</p>
    <label htmlFor={draftQuestion}>{embedded ? 'Your diagram' : `Your diagram for sentence ${number}`}</label>
    <textarea ref={draftInput} id={draftQuestion} className="co-attempt-input" rows={3} value={draftDiagram} readOnly={comparing} onChange={event => setDraftDiagram(event.target.value)}/>
    <label htmlFor={readbackQuestion}>{embedded ? 'Read it in English' : `Your English readback for sentence ${number}`}</label>
    <textarea id={readbackQuestion} className="co-attempt-input" rows={3} value={draftReadback} readOnly={comparing} onChange={event => setDraftReadback(event.target.value)}/>
    {!comparing && <button type="button" className="co-primary" disabled={!draftDiagram.trim() || !draftReadback.trim()} onClick={() => setComparing(true)}>{embedded ? 'Compare with the choices' : `Compare my translation for sentence ${number}`}</button>}
    {comparing && <>
    <p>{embedded ? "Compare your diagram with the choices. Keep every detail that limits who or what the rule covers, and check which way the arrow points." : 'Your written answer stays here while you compare. The choices below check who or what the rule covers and the arrow direction; your written answer is not graded automatically.'}</p>
    <h3 id={targetQuestion}>{item.targetPrompt}</h3>
    <div className="co-choices" role="group" aria-labelledby={targetQuestion}>{targetOptions(item, index).map(option => <button type="button" key={option} aria-pressed={target === option} onClick={() => change(() => setTarget(option))}>{option}</button>)}</div>
    <h3 id={sideQuestion}>Which condition gives you enough to establish the other?</h3>
    <div className="co-choices" role="group" aria-labelledby={sideQuestion}>{sideOptions(item, index).map(option => <button type="button" key={option} aria-pressed={left === option} onClick={() => change(() => setLeft(option))}>{option}</button>)}</div>
    {left && <RuleDiagram left={left} right={left === item.left ? item.right : item.left} label={`Your diagram: ${left} implies ${left === item.left ? item.right : item.left}`}/>}
    <div className="cr-control-row"><button type="button" className="co-primary" disabled={target === null || left === null} onClick={() => { setChecked(true); onChecked(true); onResult?.({ targetCorrect, targetIncomplete: target === item.partial, sideCorrect }); }}>{embedded ? 'Check answer' : `Check sentence ${number}`}</button><button type="button" className="cr-reset" onClick={reset}>{embedded ? 'Revise my answer' : `Try sentence ${number} again`}</button></div>
    <div role="status">{checked && <div className={`co-feedback ${targetCorrect && sideCorrect ? 'co-correct' : ''}`}>
      {targetCorrect && sideCorrect ? <>
        <strong>Read it back: {item.readback}</strong>
        <p>{item.why}</p>
      </> : <>
      <strong>Revise the part described below.</strong>
      <p>{targetCorrect ? item.targetFeedback : target === item.partial ? item.partialFeedback : item.otherFeedback}</p>
      <p>{sideCorrect ? 'Your arrow keeps the direction the sentence gives.' : item.reversed}</p>
      <p>Here, <strong>{item.word}</strong> points to what is {item.family === 'sufficient' ? 'enough, so its target goes on the left' : 'required, so its target goes on the right'}. {item.why}</p>
      <p>Read it back: {item.readback}</p>
      </>}
    </div>}</div>
    </>}
    {!comparing && <button type="button" className="cr-reset" onClick={reset}>{embedded ? 'Revise my answer' : `Try sentence ${number} again`}</button>}
  </div>;
}

export function MixedFamilyPractice() {
  const [current, setCurrent] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(() => mixedFamilyItems.map(() => false));
  return <>
    <p>These sentences use both kinds of expression. The family name stays hidden until you check your choices. First translate each sentence yourself, without supplied condition labels. Then compare your work and check who or what the rule covers and the arrow direction before moving on.</p>
    <p className="co-kicker" role="status">Sentence {current + 1} of {mixedFamilyItems.length}</p>
    {mixedFamilyItems.map((item, index) => <div key={item.sentence} hidden={current !== index}><MixedItemCheck item={item} index={index} onChecked={value => setChecked(previous => previous.map((old, itemIndex) => itemIndex === index ? value : old))}/></div>)}
    <div className="co-choices"><button type="button" disabled={current === 0} onClick={() => setCurrent(current - 1)}>Previous mixed sentence</button><button type="button" disabled={current === mixedFamilyItems.length - 1 || !checked[current]} onClick={() => setCurrent(current + 1)}>Next mixed sentence</button></div>
    <p>Moving between sentences keeps your written attempt, choices, and feedback. Trying a sentence again keeps your writing so you can revise it, and hides the supplied labels until you compare again.</p>
  </>;
}
