import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { diagramExamples, flashcardExamples, translationExamples } from './ConditionalOpeningLesson';
import { referencePracticeItems } from './ConditionalReferenceSequence';
import { OpeningMixedDrill } from './OpeningMixedDrill';
import './staged-reasoning-drill.css';

type Stage = { name: string; prompt: string; options?: string[]; correct?: number; explanation: string; model?: string };
type Item = { sentence: string; stages: Stage[] };
type Answer = { choice: number | null; writing: string; checked: boolean; accepted: boolean };
const empty = (): Answer => ({ choice: null, writing: '', checked: false, accepted: false });
const not = (text: string, negative?: boolean) => negative ? `NOT (${text})` : text;
const RIGHT: Record<string, string> = { 'Find the indicator': 'Right indicator.', 'Find the condition': 'Right condition.', 'Build the arrow': 'Right direction.', 'Reverse and negate': 'Right contrapositive.', 'Original rule': 'Right rule.' };
function rightHeading(name: string) { return RIGHT[name] ?? 'That's right.'; }
function choices(name: string, prompt: string, options: string[], correct: number, explanation: string): Stage { return { name, prompt, options, correct, explanation }; }
function reading(model: string, explanation: string): Stage { return { name: 'Write it in English', prompt: 'Read your arrow as an if/then sentence.', explanation, model }; }

export const sufficientStagedItems: Item[] = [
  ...[...translationExamples['group-1'], ...diagramExamples['group-1'], ...flashcardExamples['group-1']].map((item, index) => {
    const options = index % 2 ? [item.right, item.left] : [item.left, item.right];
    return { sentence: item.sentence, stages: [
      choices('Find the indicator', 'Which indicator introduces the sufficient condition?', index % 2 ? ['only if', item.word, 'requires'] : [item.word, 'only if', 'requires'], index % 2, `Read “${item.word}” with the complete condition it refers to. ${item.why}`),
      choices('Find the condition', `What complete condition does “${item.word}” identify?`, options, options.indexOf(item.left), item.why),
      choices('Build the arrow', 'Which direction keeps the original rule?', index % 2 ? [`${item.right} → ${item.left}`, `${item.left} → ${item.right}`] : [`${item.left} → ${item.right}`, `${item.right} → ${item.left}`], index % 2, item.why),
      reading(item.readback, 'Compare the condition on each side. Keep every restriction and do not turn the requirement into a guarantee.'),
    ] };
  }),
  { sentence: 'A report is reviewed if it is submitted before noon.', stages: [choices('Keep the condition', 'Which condition is enough for review?', ['Report is submitted', 'Report is submitted before noon', 'Report is reviewed'], 1, 'Before noon limits the rule. A report arriving at four does not meet the condition.'), choices('Keep the meaning', 'Which sentence says the same thing?', ['If reviewed, the report was submitted before noon.', 'If submitted before noon, the report is reviewed.'], 1, 'Submission before noon is sufficient. Review alone does not prove when the report arrived.')] },
  { sentence: 'The only notebooks kept on this shelf are hardback.', stages: [choices('Build the arrow', 'Which arrow keeps the rule?', ['Hardback → Kept on shelf', 'Kept on shelf → Hardback'], 1, 'Every notebook kept here is hardback. A hardback notebook can still be on another shelf.'), reading('If a notebook is kept on this shelf, it is hardback.', 'The only notebooks kept on this shelf names the group the rule covers.')] },
  { sentence: 'Every ticket in Drawer R has a blue border.', stages: [choices('Build a case', 'Someone claims every blue-bordered ticket is in Drawer R. Which ticket fits our rule but disproves that claim?', ['Inside Drawer R; blue border', 'Outside Drawer R; blue border', 'Inside Drawer R; no blue border', 'Outside Drawer R; no blue border'], 1, 'A blue-bordered ticket outside Drawer R fits the rule. It disproves the reversed claim without breaking the original.'), { name: 'Explain the limit', prompt: 'Why does your ticket disprove the reverse while keeping the rule true?', model: 'The rule requires a blue border for tickets inside Drawer R. It does not require every blue-bordered ticket to be inside Drawer R.', explanation: 'Your example is a possible case, not a claim that this ticket actually exists.' }] },
];

export const contrapositiveStagedItems: Item[] = referencePracticeItems.map((item, index) => {
  const left = not(item.left, item.leftNegated), right = not(item.right, item.rightNegated);
  const notLeft = not(item.left, !item.leftNegated), notRight = not(item.right, !item.rightNegated);
  return { sentence: item.sentence, stages: [
    choices('Original rule', 'Which original arrow keeps the complete conditions?', index % 2 ? [`${right} → ${left}`, `${left} → ${right}`, `${notLeft} → ${notRight}`] : [`${left} → ${right}`, `${right} → ${left}`, `${notLeft} → ${notRight}`], index % 2, item.why),
    choices('Reverse and negate', 'Which diagram is the contrapositive?', index % 2 ? [`${notRight} → ${notLeft}`, `${right} → ${left}`, `${notLeft} → ${notRight}`] : [`${right} → ${left}`, `${notRight} → ${notLeft}`, `${notLeft} → ${notRight}`], index % 2 ? 0 : 1, 'Reverse the conditions and negate each whole condition. Negating a condition that already says NOT removes that negation.'),
    reading(item.readback, item.why),
    { name: 'Read the contrapositive', prompt: 'Now write the contrapositive in ordinary English.', model: item.contraReadback, explanation: item.why },
  ] };
});

export function StagedReasoningDrill({ mode }: { mode: 'sufficient' | 'contrapositive' | 'mixed' }) {
  if (mode === 'mixed') return <div className="sr-mixed"><OpeningMixedDrill/></div>;
  return <StagedRun key={mode} storageKey={`conditional-staged-v1:${mode}`} items={mode === 'sufficient' ? sufficientStagedItems : contrapositiveStagedItems}/>;
}

function restore(storageKey: string, items: Item[]) {
  const fallback = { index: 0, step: 0, answers: {} as Record<string, Answer> };
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!data || !data.answers || typeof data.answers !== 'object') return fallback;
    const index = Number.isInteger(data.index) && data.index >= 0 && data.index < items.length ? data.index : 0;
    const step = Number.isInteger(data.step) && data.step >= 0 && data.step < items[index].stages.length ? data.step : 0;
    const answers: Record<string, Answer> = {};
    for (const [key, value] of Object.entries(data.answers)) {
      const a = value as Answer;
      const [i, s] = key.split(':').map(Number);
      if (!items[i]?.stages[s] || !a || typeof a.writing !== 'string' || !(a.choice === null || Number.isInteger(a.choice)) || typeof a.checked !== 'boolean' || typeof a.accepted !== 'boolean') continue;
      const stage = items[i].stages[s];
      if (a.choice !== null && (!stage.options || a.choice < 0 || a.choice >= stage.options.length)) continue;
      const checked = data.fingerprint === JSON.stringify(items) && a.checked;
      answers[key] = { ...a, checked, accepted: checked && a.accepted && (stage.options ? a.choice === stage.correct : !!a.writing.trim()) };
    }
    const firstUnfinished = items[index].stages.findIndex((_, s) => !answers[`${index}:${s}`]?.accepted);
    return { index, step: firstUnfinished < 0 ? step : Math.min(step, firstUnfinished), answers };
  } catch { return fallback; }
}

function StagedRun({ items, storageKey }: { items: Item[]; storageKey: string }) {
  const [initial] = useState(() => restore(storageKey, items));
  const [index, setIndex] = useState(initial.index);
  const [step, setStep] = useState(initial.step);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial.answers);
  const [storageFailed, setStorageFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const item = items[index], stage = item.stages[step], key = `${index}:${step}`;
  const answer = answers[key] ?? empty();
  const objective = !!stage.options;
  const correct = answer.choice === stage.correct;
  const completed = items.filter((q, i) => q.stages.every((_, s) => answers[`${i}:${s}`]?.accepted)).length;
  function update(patch: Partial<Answer>) { setAnswers(old => {
    const next = { ...old, [key]: { ...(old[key] ?? empty()), ...patch } };
    if (patch.accepted === false) for (let s = step + 1; s < item.stages.length; s++) {
      const later = `${index}:${s}`;
      if (next[later]) next[later] = { ...next[later], checked: false, accepted: false };
    }
    return next;
  }); }
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify({ index, step, answers, fingerprint: JSON.stringify(items) })); setStorageFailed(false); } catch { setStorageFailed(true); } }, [index, step, answers, items, storageKey]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, index, finished]);
  useEffect(() => { if (answer.checked) feedback.current?.focus({ preventScroll: true }); }, [answer.checked]);
  function move(i: number) { setIndex(i); setStep(0); setFinished(false); }
  function next() { if (step < item.stages.length - 1) setStep(step + 1); else if (index < items.length - 1) move(index + 1); else setFinished(true); }
  return <section className="sr-run" aria-label="Step-by-step reasoning practice">
    {storageFailed && <p role="status" className="sr-storage-error">Your browser could not save this practice. Keep this page open to retain your work.</p>}
    <header className="sr-header"><span>YOUR PROGRESS</span><strong>{Math.round(completed / items.length * 100)}<small>%</small></strong><div role="progressbar" aria-label="Sentences completed" aria-valuenow={completed} aria-valuemin={0} aria-valuemax={items.length}><i style={{ width: `${completed / items.length * 100}%` }}/></div></header>
    {finished ? <div className="sr-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>You worked through the set.</h2><p>{completed} of {items.length} sentences completed. Your written explanations were self-reviewed, not automatically graded.</p><div className="sr-review">{items.map((q, i) => <button key={i} onClick={() => move(i)}>Sentence {i + 1}<ArrowRight size={16}/></button>)}</div></div> : <>
    <div className="sr-scene"><aside className="sr-statement"><span>SENTENCE {index + 1} OF {items.length}</span><blockquote>{item.sentence}</blockquote><div className="sr-mini-arrow" aria-hidden="true"><span>Enough</span><b>→</b><span>Required</span></div></aside>
    <div className="sr-work"><ol className="sr-stages" aria-label="Steps for this sentence">{item.stages.map((s, i) => <li key={i} aria-current={step === i ? 'step' : undefined} data-done={answers[`${index}:${i}`]?.accepted}><span>{answers[`${index}:${i}`]?.accepted ? <Check size={13}/> : i + 1}</span>{s.name}</li>)}</ol>
    <div className="sr-active" key={key}><p className="sr-step-label">STEP {step + 1} OF {item.stages.length}</p><h2 ref={heading} tabIndex={-1}>{stage.prompt}</h2>
    {objective ? <div className="sr-options" role="group" aria-label="Answer choices">{stage.options!.map((option, i) => <button key={i} aria-pressed={answer.choice === i} disabled={answer.checked} onClick={() => update({ choice: i, checked: false, accepted: false })}><span>{String.fromCharCode(65 + i)}</span>{option}</button>)}</div> : <label className="sr-writing">Your explanation<textarea rows={4} value={answer.writing} disabled={answer.checked} onChange={e => update({ writing: e.target.value, accepted: false })}/></label>}
    {!answer.checked ? <button className="sr-primary" disabled={objective ? answer.choice === null : !answer.writing.trim()} onClick={() => update({ checked: true, accepted: objective && correct })}>{objective ? 'Check this step' : 'Compare my explanation'}<ArrowRight size={17}/></button> : <div className="sr-feedback"><h3 ref={feedback} tabIndex={-1}>{objective ? correct ? rightHeading(stage.name) : 'Not quite. Try again.' : 'Compare the meaning.'}</h3>{stage.model && <p className="sr-model">{stage.model}</p>}<p>{stage.explanation}</p>{!objective && <button className="sr-self-check" aria-pressed={answer.accepted} onClick={() => update({ accepted: !answer.accepted })}><Check size={16}/>I compared the direction and complete conditions</button>}<button className="sr-text" onClick={() => update({ checked: false, accepted: false })}>Revise my answer</button></div>}
    </div></div></div>
    <nav className="sr-navigation" aria-label="Practice navigation"><button disabled={index === 0 && step === 0} onClick={() => step ? setStep(step - 1) : move(index - 1)}><ArrowLeft size={16}/>Previous</button><button className="sr-primary" disabled={!answer.accepted} onClick={next}>{step < item.stages.length - 1 ? 'Next step' : index < items.length - 1 ? 'Next sentence' : 'Review this set'}<ArrowRight size={16}/></button></nav></>}
  </section>;
}

