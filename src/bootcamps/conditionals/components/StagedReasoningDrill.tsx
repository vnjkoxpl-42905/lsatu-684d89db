import { DrillProgress } from './DrillProgress';
import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { Check, X } from 'lucide-react';
import { referencePracticeItems } from './ConditionalReferenceSequence';
import { OpeningMixedDrill } from './OpeningMixedDrill';
import { useCourseStep } from '../courseProgress';
import { gradeConditionalRewrite } from '@/lib/conditionalRewriteGrader';
import { contextualRewriteFeedback } from '@/lib/conditionalRewriteFeedback';
import './staged-reasoning-drill.css';

type Stage = { name: string; prompt: string; options?: string[]; correct?: number; explanation: string; model?: string; hints?: string[]; label?: string };
type Item = { sentence: string; stages: Stage[] };
type Answer = { choice: number | null; writing: string; checked: boolean; accepted: boolean; grade?: { submission: string; correct: boolean; feedback: string } };
const empty = (): Answer => ({ choice: null, writing: '', checked: false, accepted: false });
const not = (text: string, negative?: boolean) => negative ? `NOT (${text})` : text;
const RIGHT: Record<string, string> = { 'Find the indicator': 'Right indicator.', 'Find the condition': 'Right condition.', 'Build the diagram': 'Correct diagram.', 'Reverse and negate': 'Right contrapositive.', 'Original rule': 'Right rule.' };
function rightHeading(name: string) { return RIGHT[name] ?? "That's right."; }
function choices(name: string, prompt: string, options: string[], correct: number, explanation: string, hints?: string[]): Stage { return { name, prompt, options, correct, explanation, hints }; }
const REQUIRE_WORD = (pick: string) => `“${pick}” introduces what is required, not what is enough. Look for the word that introduces the guarantee.`;
const FROM_REQUIREMENT = 'That is what the rule requires. Which condition is enough to guarantee it?';
const BACKWARDS = 'That arrow starts from the requirement. Start from the condition that guarantees the result.';
function hintFor(stage: Stage, choice: number) { return stage.hints?.[choice] || 'Not this one. Reread the rule and ask what it guarantees.'; }
function reading(model: string, explanation: string): Stage { return { name: 'Write it in English', prompt: 'Rewrite this conditional as if/then.', explanation, model, label: 'Your rewrite' }; }

/** One fresh everyday sentence per Group 1 indicator. None repeats a lesson example. */
type IndicatorItem = { word: string; sentence: string; left: string; right: string; partial?: string; readback: string; why: string; indicators: string[]; indicatorHints: Record<string, string> };
const RESULT_WORD = (pick: string, what: string) => `“${pick}” belongs to the result: ${what}. Look for the word that introduces the condition that is enough.`;
const PART_OF_GROUP = (pick: string) => `“${pick}” is part of the group the rule covers. Look for the word that tells you the rule applies to that whole group.`;
const PARTIAL = 'That drops part of the condition. Keep every word that limits it.';
const indicatorItems: IndicatorItem[] = [
  { word: 'if', sentence: 'Mia takes the bus if it is raining.', left: 'It is raining', right: 'Mia takes the bus', readback: 'If it is raining, then Mia takes the bus.',
    why: "If what? It is raining. The condition comes last in the rule, but rain is enough to put Mia on the bus, so it goes left. Seeing Mia on the bus doesn't prove it is raining. She could take the bus on a dry day too.",
    indicators: ['if', 'only if', 'takes'], indicatorHints: { 'only if': REQUIRE_WORD('only if'), takes: RESULT_WORD('takes', 'what Mia does') } },
  { word: 'when', sentence: 'When the kettle boils, it clicks off.', left: 'Kettle boils', right: 'Kettle clicks off', readback: 'If the kettle boils, then it clicks off.',
    why: "When what? The kettle boils. Boiling is enough for the click. A click alone doesn't prove the water boiled. Someone could switch the kettle off by hand.",
    indicators: ['clicks', 'when', 'must'], indicatorHints: { clicks: RESULT_WORD('clicks', 'what the kettle does'), must: REQUIRE_WORD('must') } },
  { word: 'whenever', sentence: 'Whenever Sam bakes bread, the kitchen smells of yeast.', left: 'Sam bakes bread', right: 'Kitchen smells of yeast', readback: 'If Sam bakes bread, then the kitchen smells of yeast.',
    why: "Whenever what? Sam bakes bread. Every time he bakes, the kitchen smells of yeast. The smell alone doesn't prove Sam baked. Someone else could be making pizza dough.",
    indicators: ['always', 'smells', 'whenever'], indicatorHints: { always: REQUIRE_WORD('always'), smells: RESULT_WORD('smells', 'what happens in the kitchen') } },
  { word: 'where', sentence: 'Where the sidewalk is icy, the city spreads salt.', left: 'Sidewalk is icy', right: 'City spreads salt there', readback: 'If a sidewalk is icy, then the city spreads salt there.',
    why: "Where what? The sidewalk is icy. Ice on a stretch of sidewalk is enough for salt there. Salt alone doesn't prove the sidewalk was icy. The city might salt a dry stretch before a storm.",
    indicators: ['where', 'requires', 'icy'], indicatorHints: { requires: REQUIRE_WORD('requires'), icy: '“Icy” is part of the condition itself. Look for the word that introduces that whole condition.' } },
  { word: 'all', sentence: 'All dogs at the park must be on a leash.', left: 'Dog is at the park', right: 'Dog must be on a leash', partial: 'Dog', readback: 'If a dog is at the park, then it must be on a leash.',
    why: "All what? Dogs at the park. Keep at the park. The rule says nothing about dogs at home. A dog on a leash could be anywhere, so the leash doesn't prove the dog is at the park.",
    indicators: ['must', 'all', 'park'], indicatorHints: { must: '“Must” is in this rule, but it marks what is required: being on a leash. Look for the word that introduces the group the rule covers.', park: PART_OF_GROUP('park') } },
  { word: 'every', sentence: 'Every guest at the wedding gets a slice of cake.', left: 'Guest at the wedding', right: 'Gets a slice of cake', partial: 'Guest', readback: 'If someone is a guest at the wedding, then that person gets a slice of cake.',
    why: "Every what? Guest at the wedding. Each one gets cake. Someone holding a slice could be a waiter, so the cake doesn't prove that person is a guest.",
    indicators: ['gets', 'necessary', 'every'], indicatorHints: { gets: RESULT_WORD('gets', 'what each guest receives'), necessary: REQUIRE_WORD('necessary') } },
  { word: 'each', sentence: 'Each player on the team gets a numbered jersey.', left: 'Player on the team', right: 'Gets a numbered jersey', partial: 'Player', readback: 'If someone is a player on the team, then that person gets a numbered jersey.',
    why: "Each what? Player on the team. Every single player gets a numbered jersey. A fan can buy a numbered jersey too, so the jersey doesn't prove someone plays.",
    indicators: ['each', 'team', 'only'], indicatorHints: { team: PART_OF_GROUP('team'), only: REQUIRE_WORD('only') } },
  { word: 'any', sentence: 'Any car parked in the fire lane gets towed.', left: 'Car parked in the fire lane', right: 'Car gets towed', partial: 'Car is parked', readback: 'If a car is parked in the fire lane, then it gets towed.',
    why: "Any what? Car parked in the fire lane. Keep in the fire lane. The rule is not about every parked car. A towed car could have been parked somewhere else, so towing doesn't prove the fire lane.",
    indicators: ['need', 'any', 'towed'], indicatorHints: { need: REQUIRE_WORD('need'), towed: RESULT_WORD('towed', 'what happens to the car') } },
  { word: 'the only', sentence: 'The only shoes allowed on the gym floor are sneakers.', left: 'Shoes allowed on the gym floor', right: 'Shoes are sneakers', partial: 'Shoes', readback: 'If shoes are allowed on the gym floor, then they are sneakers.',
    why: "The only what? Shoes allowed on the gym floor. Every pair allowed there is a pair of sneakers. The rule doesn't say every pair of sneakers is allowed. Muddy sneakers could still be kept off the floor.",
    indicators: ['only', 'the only', 'allowed'], indicatorHints: { only: 'Only on its own marks a requirement. Here it comes right after “the,” and the whole phrase does a different job. Read the two words together.', allowed: '“Allowed” is part of the group the rule covers. Look for the phrase that introduces that whole group.' } },
  { word: 'people who', sentence: 'People who order the lunch special get a free drink.', left: 'Person orders the lunch special', right: 'Person gets a free drink', readback: 'If a person orders the lunch special, then that person gets a free drink.',
    why: "People who what? Order the lunch special. Ordering it is enough for a free drink. A free drink doesn't prove someone ordered the special. It could be a birthday treat.",
    indicators: ['people who', 'depends on', 'free'], indicatorHints: { 'depends on': REQUIRE_WORD('depends on'), free: '“Free” describes the drink, which is the result. Look for the words that introduce the group the rule covers.' } },
];

export const sufficientStagedItems: Item[] = [
  ...indicatorItems.map((item, index) => {
    const ideas = [item.left, item.right, ...(item.partial ? [item.partial] : [])];
    const options = [...ideas.slice(index % ideas.length), ...ideas.slice(0, index % ideas.length)];
    const hint = (option: string) => option === item.left ? '' : option === item.partial ? PARTIAL : `${FROM_REQUIREMENT} Ask: ${item.word} what?`;
    return { sentence: item.sentence, stages: [
      choices('Find the indicator', item.word.includes(' ') ? 'Which word or phrase indicates a conditional relationship?' : 'Which word indicates a conditional relationship?', item.indicators, item.indicators.indexOf(item.word), `Read “${item.word}” with the complete condition it refers to. ${item.why}`, item.indicators.map(word => word === item.word ? '' : item.indicatorHints[word])),
      choices('Find the condition', `What complete condition does “${item.word}” identify?`, options, options.indexOf(item.left), item.why, options.map(hint)),
      choices('Build the diagram', 'Which diagram matches this rule?', index % 2 ? [`${item.right} → ${item.left}`, `${item.left} → ${item.right}`] : [`${item.left} → ${item.right}`, `${item.right} → ${item.left}`], index % 2, item.why, index % 2 ? [BACKWARDS, ''] : ['', BACKWARDS]),
      reading(item.readback, 'Compare the condition on each side. Keep every restriction and do not turn the requirement into a guarantee.'),
    ] };
  }),
  { sentence: 'A package ships the same day if it is ordered before 2 p.m.', stages: [choices('Keep the condition', 'Which condition is enough for same-day shipping?', ['Package is ordered', 'Package is ordered before 2 p.m.', 'Package ships the same day'], 1, 'Before 2 p.m. limits the rule. A package ordered at five does not meet the condition.', [PARTIAL, '', 'That is the result. Which condition guarantees it?']), choices('Keep the meaning', 'Which sentence says the same thing?', ['If a package ships the same day, it was ordered before 2 p.m.', 'If a package is ordered before 2 p.m., it ships the same day.'], 1, 'Ordering before 2 p.m. is sufficient. Same-day shipping alone does not prove when the order came in.', ['That rule starts from the shipping. Start from what guarantees the shipping.', ''])] },
  { sentence: 'The only cookies left in the jar are oatmeal.', stages: [choices('Build the diagram', 'Which diagram matches this rule?', ['Cookie is oatmeal → Cookie is left in the jar', 'Cookie is left in the jar → Cookie is oatmeal'], 1, 'Every cookie left in the jar is oatmeal. An oatmeal cookie can still be on a plate.', [BACKWARDS + ' The only what? Cookies left in the jar.', '']), reading('If a cookie is left in the jar, it is oatmeal.', 'The only cookies left in the jar names the group the rule covers.')] },
  { sentence: 'Every key on the red ring opens a classroom.', stages: [choices('Build a case', 'Someone claims every key that opens a classroom is on the red ring. Which key fits our rule but disproves that claim?', ['On the red ring; opens a classroom', 'Not on the red ring; opens a classroom', 'On the red ring; opens no classroom', 'Not on the red ring; opens no classroom'], 1, 'A classroom key on another ring fits the rule. It disproves the reversed claim without breaking the original.', ['That key agrees with the claim. You need a classroom key the claim gets wrong.', '', 'That key breaks our rule. Every key on the red ring opens a classroom.', 'That key opens no classroom, so the claim says nothing about it.']), { name: 'Explain the limit', prompt: 'Why does your key disprove the reverse while keeping the rule true?', model: 'The rule says every key on the red ring opens a classroom. It does not say every key that opens a classroom is on the red ring.', explanation: 'Your example is a possible case, not a claim that this key actually exists.' }] },
];

const SIGNS = 'That changes the negations. Keep each condition exactly as the rule states it.';
const NO_NEGATE = 'You reversed the sides but did not negate them. A contrapositive also negates both.';
const NO_REVERSE = 'You negated both sides but kept their order. A contrapositive also reverses them.';
export const contrapositiveStagedItems: Item[] = referencePracticeItems.map((item, index) => {
  const left = not(item.left, item.leftNegated), right = not(item.right, item.rightNegated);
  const notLeft = not(item.left, !item.leftNegated), notRight = not(item.right, !item.rightNegated);
  return { sentence: item.sentence, stages: [
    choices('Original rule', 'Which original arrow keeps the complete conditions?', index % 2 ? [`${right} → ${left}`, `${left} → ${right}`, `${notLeft} → ${notRight}`] : [`${left} → ${right}`, `${right} → ${left}`, `${notLeft} → ${notRight}`], index % 2, item.why, index % 2 ? [BACKWARDS, '', SIGNS] : ['', BACKWARDS, SIGNS]),
    choices('Reverse and negate', 'Which diagram is the contrapositive?', index % 2 ? [`${notRight} → ${notLeft}`, `${right} → ${left}`, `${notLeft} → ${notRight}`] : [`${right} → ${left}`, `${notRight} → ${notLeft}`, `${notLeft} → ${notRight}`], index % 2 ? 0 : 1, 'Reverse the conditions and negate each whole condition. Negating a condition that already says NOT removes that negation.', index % 2 ? ['', NO_NEGATE, NO_REVERSE] : [NO_NEGATE, '', NO_REVERSE]),
    // A sentence already in if/then form would only be copied back word for word.
    ...(item.readback === item.sentence ? [] : [reading(item.readback, item.why)]),
    { name: 'Read the contrapositive', prompt: 'Now write the contrapositive in ordinary English.', model: item.contraReadback, explanation: item.why, label: 'Your rewrite' },
  ] };
});

export function StagedReasoningDrill({ mode, storageScope }: { mode: 'sufficient' | 'contrapositive' | 'mixed'; storageScope?: string }) {
  if (mode === 'mixed') return <div className="sr-mixed"><OpeningMixedDrill stepId="mixed-practice"/></div>;
  return <StagedRun key={`${storageScope ?? "legacy"}:${mode}`} stepId={`${mode}-practice`} storageKey={storageScope ? `conditional-staged-v1:${storageScope}:${mode}` : `conditional-staged-v1:${mode}`} items={mode === 'sufficient' ? sufficientStagedItems : contrapositiveStagedItems}/>;
}

/** Short content fingerprint: a changed item set invalidates earlier checks. */
function itemsFingerprint(items: Item[]) {
  const text = JSON.stringify(items);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = (hash * 33 ^ text.charCodeAt(i)) >>> 0;
  return `v2:${text.length}:${hash.toString(36)}`;
}
type Archived = { fingerprint?: unknown; index?: unknown; step?: unknown; answers: unknown };
/**
 * Answers are keyed by item and step position. When the item set changes, the
 * old answers would land on different sentences, so they are kept in the saved
 * record under `archived` (latest three sets) and the run starts fresh.
 */
function restore(storageKey: string, items: Item[], accountState?: unknown) {
  const fallback = { index: 0, step: 0, answers: {} as Record<string, Answer>, archived: [] as Archived[] };
  try {
    const data = (accountState ?? JSON.parse(localStorage.getItem(storageKey) ?? 'null'));
    if (!data || typeof data !== 'object') return fallback;
    const archived: Archived[] = Array.isArray(data.archived) ? data.archived.slice(-3) : [];
    if (!data.answers || typeof data.answers !== 'object') return { ...fallback, archived };
    const current = data.fingerprint === itemsFingerprint(items) || data.fingerprint === JSON.stringify(items);
    if (!current) return Object.keys(data.answers).length ? { ...fallback, archived: [...archived, { fingerprint: data.fingerprint, index: data.index, step: data.step, answers: data.answers }].slice(-3) } : { ...fallback, archived };
    const index = Number.isInteger(data.index) && data.index >= 0 && data.index < items.length ? data.index : 0;
    const step = Number.isInteger(data.step) && data.step >= 0 && data.step < items[index].stages.length ? data.step : 0;
    const answers: Record<string, Answer> = {};
    for (const [key, value] of Object.entries(data.answers)) {
      const a = value as Answer;
      const [i, s] = key.split(':').map(Number);
      if (!items[i]?.stages[s] || !a || typeof a.writing !== 'string' || !(a.choice === null || Number.isInteger(a.choice)) || typeof a.checked !== 'boolean' || typeof a.accepted !== 'boolean') continue;
      const stage = items[i].stages[s];
      if (a.choice !== null && (!stage.options || a.choice < 0 || a.choice >= stage.options.length)) continue;
      const validGrade = !!a.grade && a.grade.submission === a.writing && typeof a.grade.correct === 'boolean' && typeof a.grade.feedback === 'string';
      const checked = a.checked && (!!stage.options || validGrade);
      answers[key] = { ...a, checked, accepted: checked && a.accepted && (stage.options ? a.choice === stage.correct : validGrade && a.grade!.correct) };
    }
    const firstUnfinished = items[index].stages.findIndex((_, s) => !answers[`${index}:${s}`]?.accepted);
    return { index, step: firstUnfinished < 0 ? step : Math.min(step, firstUnfinished), answers, archived };
  } catch { return fallback; }
}

function StagedRun({ items, storageKey, stepId }: { items: Item[]; storageKey: string; stepId?: string }) {
  const course = useCourseStep(stepId);
  const record = course?.record;
  const [initial] = useState(() => restore(storageKey, items, course?.saved?.state));
  const [index, setIndex] = useState(initial.index);
  const [step, setStep] = useState(initial.step);
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial.answers);
  const [storageFailed, setStorageFailed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const item = items[index], stage = item.stages[step], key = `${index}:${step}`;
  const answer = answers[key] ?? empty();
  const objective = !!stage.options;
  const explanationTask = !objective && !stage.label;
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
  useEffect(() => {
    const snapshot = { index, step, answers, fingerprint: itemsFingerprint(items), ...(initial.archived.length ? { archived: initial.archived } : {}) };
    record?.({ state: snapshot, done: completed, total: items.length, ...(completed === items.length ? { status: 'done' as const } : {}) });
    try { localStorage.setItem(storageKey, JSON.stringify(snapshot)); setStorageFailed(false); } catch { setStorageFailed(!record); }
  }, [index, step, answers, items, storageKey, record, completed, initial.archived]);
  useEffect(() => { setGradingError(''); heading.current?.focus({ preventScroll: true }); }, [step, index, finished]);
  useEffect(() => { if (!answer.checked) return; const el = feedback.current; el?.focus({ preventScroll: true }); el?.scrollIntoView?.({ behavior: matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }, [answer.checked]);
  async function checkWriting() {
    setGrading(true); setGradingError('');
    const submission = answer.writing;
    try {
      const request = { original: item.sentence, expected: stage.model ?? '', studentResponse: submission, task: explanationTask ? 'explanation' as const : stage.name === 'Read the contrapositive' ? 'contrapositive' as const : 'rewrite' as const, stagePrompt: stage.prompt };
      const result = contextualRewriteFeedback(request, await gradeConditionalRewrite(request));
      update({ checked: true, accepted: result.correct, grade: { submission, ...result } });
    } catch (error) { setGradingError(error instanceof Error ? error.message : 'Your rewrite could not be checked. Try again.'); }
    finally { setGrading(false); }
  }
  function move(i: number) { setGradingError(''); setIndex(i); setStep(0); setFinished(false); }
  function next() { if (step < item.stages.length - 1) setStep(step + 1); else if (index < items.length - 1) move(index + 1); else setFinished(true); }
  return <section className="sr-run" aria-label="Step-by-step reasoning practice">
    {storageFailed && <p role="status" className="sr-storage-error">Your browser could not save this practice. Keep this page open to retain your work.</p>}
    <DrillProgress completed={completed} total={items.length} current={index} completedIndices={items.flatMap((q, i) => q.stages.every((_, stage) => answers[`${i}:${stage}`]?.accepted) ? [i] : [])} label="Questions completed"/>

    {finished ? <div className="sr-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>You worked through the set.</h2><p>{completed} of {items.length} questions completed. Your written rewrites were checked for their meaning.</p><div className="sr-review">{items.map((q, i) => <button key={i} onClick={() => move(i)}>Question {i + 1}</button>)}</div></div> : <>
    <div className="sr-scene"><aside className="sr-statement"><blockquote>{item.sentence}</blockquote></aside>
    <div className="sr-work"><ol className="sr-stages" aria-label="Steps for this rule" style={{ '--sr-p': step / Math.max(1, item.stages.length - 1) } as React.CSSProperties}>{item.stages.map((s, i) => <li key={i} aria-current={step === i ? 'step' : undefined} data-done={answers[`${index}:${i}`]?.accepted}><span>{answers[`${index}:${i}`]?.accepted ? <Check size={13}/> : i + 1}</span>{s.name}</li>)}</ol>
    <div className="sr-active" key={key}><p className="sr-step-label">STEP {step + 1} OF {item.stages.length}</p><h2 ref={heading} tabIndex={-1}>{stage.prompt}</h2>
    {objective ? <div className="sr-options" role="group" aria-label="Answer choices">{stage.options!.map((option, i) => <button key={i} aria-pressed={answer.choice === i} data-state={answer.checked ? (answer.choice === i ? (correct ? 'right' : 'wrong') : 'dim') : undefined} disabled={answer.checked} onClick={() => update({ choice: i, checked: false, accepted: false })}><span>{answer.checked && answer.choice === i ? (correct ? <Check size={14} aria-hidden/> : <X size={14} aria-hidden/>) : String.fromCharCode(65 + i)}</span>{option}</button>)}</div> : <label className="sr-writing">{stage.label ?? 'Your explanation'}<textarea rows={4} value={answer.writing} disabled={answer.checked || grading} onChange={e => { setGradingError(''); update({ writing: e.target.value, accepted: false, grade: undefined }); }}/></label>}
    {gradingError && <p role="alert" className="sr-storage-error">{gradingError}</p>}
    {!answer.checked ? <button className="sr-primary" disabled={grading || (objective ? answer.choice === null : !answer.writing.trim())} onClick={() => objective ? update({ checked: true, accepted: correct }) : void checkWriting()}>{grading ? 'Checking your answer…' : objective ? 'Check this step' : explanationTask ? 'Check my explanation' : 'Check my rewrite'}</button> : <div className="sr-feedback" data-result={objective ? (correct ? 'right' : 'wrong') : answer.accepted ? 'right' : 'wrong'} role="status"><h3 ref={feedback} tabIndex={-1}>{(objective ? correct : answer.accepted) ? <Check size={20} aria-hidden/> : <X size={20} aria-hidden/>}{objective ? correct ? rightHeading(stage.name) : 'Not quite. Try again.' : answer.accepted ? explanationTask ? 'Your explanation works.' : 'Your rewrite keeps the meaning.' : explanationTask ? 'Revise your explanation.' : 'Revise your rewrite.'}</h3><p>{objective ? !correct && answer.choice !== null ? hintFor(stage, answer.choice) : stage.explanation : answer.grade?.feedback}</p><div className="sr-feedback-actions">{answer.accepted && <button className="sr-continue" onClick={next}>Continue</button>}{!answer.accepted && <button className="sr-text" onClick={() => update({ checked: false, accepted: false })}>{objective ? 'Try again' : 'Revise my answer'}</button>}</div></div>}

    </div></div></div>
    <nav className="sr-navigation" aria-label="Practice navigation"><button disabled={grading || (index === 0 && step === 0)} onClick={() => step ? setStep(step - 1) : move(index - 1)}>Previous</button><button className="sr-primary" disabled={grading || !answer.accepted} onClick={next}>{step < item.stages.length - 1 ? 'Next step' : index < items.length - 1 ? 'Next question' : 'Review this set'}</button></nav></>}
  </section>;
}

