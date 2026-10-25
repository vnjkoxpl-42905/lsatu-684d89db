import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { andOrQuizzes, getAndOrDrill } from '../content/andOrItems';
import { answerLine, itemAtomIds, blankBuilder, checkBuild, choiceStep, expectedBuild, builtRule, type AndOrItem, type BuilderState, type ChoiceStep } from '../content/andOrTasks';
import { atomOf, ruleSentence, type Atom } from '../content/andOrLogic';
import { useCourseStep } from '../courseProgress';
import { DrillProgress } from './DrillProgress';
import { PopQuizTitle } from './ContrapositiveVisuals';
import { AndOrDiagram } from './AndOrVisuals';
import './and-or.css';

type Outcome = 'open' | 'correct' | 'revealed' | 'done';
/** `checked` is the arrangement the current `hint` was written about; a hint is stale once the builder no longer matches it. */
interface StepState { tried: number[]; outcome: Outcome; misses: number; hint: string; checked: string; everRevealed: boolean; builder: BuilderState }
interface ItemState { stepIndex: number; labels: Record<string, string>; steps: Record<string, StepState> }
interface Saved { version: 1; current: number; items: Record<string, ItemState> }

const blankStep = (): StepState => ({ tried: [], outcome: 'open', misses: 0, hint: '', checked: '', everRevealed: false, builder: blankBuilder() });
/** Order-independent fingerprint of an arrangement, so undoing an edit makes the old hint current again. */
export const builderSignature = (item: AndOrItem, builder: BuilderState) =>
  JSON.stringify([itemAtomIds(item).map(id => [builder.place[id] ?? '', !!builder.negated[id]]), builder.leftOp, builder.rightOp]);
/** Wording changed: the arrangement and its accepted or revealed grade no longer apply. Misses and the last hint are kept, marked as earlier feedback. */
export const invalidateArrangement = (step: StepState): StepState => ({ ...step, outcome: 'open', builder: blankBuilder() });
const blankItem = (): ItemState => ({ stepIndex: 0, labels: {}, steps: {} });
const stepKeys = (item: AndOrItem): string[] => item.task.kind !== 'build' ? ['answer'] : ['labels', 'diagram', ...(item.task.withContrapositive ? ['contra'] : [])];
const stepNames: Record<string, string> = { answer: 'Answer', labels: 'Short versions', diagram: 'Build the diagram', contra: 'Build the contrapositive' };
const stepOf = (state: ItemState, key: string): StepState => state.steps[key] ?? blankStep();
/** Every step has been answered, correctly or by an explicit reveal. */
const itemDone = (item: AndOrItem, state?: ItemState) => !!state && stepKeys(item).every(key => stepOf(state, key).outcome !== 'open');
/** Done without ever seeing a revealed answer, including one later cleared by an edit (`everRevealed` is history, not current state). */
const itemCorrect = (item: AndOrItem, state?: ItemState) => itemDone(item, state) && stepKeys(item).every(key => ['correct', 'done'].includes(stepOf(state!, key).outcome) && !stepOf(state!, key).everRevealed);

// Short versions are drafts for the learner's own use; they are checked for readability only.
const readable = (value: string) => /[A-Za-z]{3}/.test(value.trim()) && value.trim().length <= 80;
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const labelsValid = (item: AndOrItem, labels: Record<string, string>) => {
  const ids = itemAtomIds(item);
  return ids.every(id => readable(labels[id] ?? '')) && new Set(ids.map(id => normalized(labels[id]))).size === ids.length;
};
const labelledAtoms = (item: AndOrItem, labels: Record<string, string>): Atom[] => item.atoms.map(atom => ({ ...atom, short: readable(labels[atom.id] ?? '') ? labels[atom.id].trim() : atom.short }));

function cleanStep(raw: unknown): StepState {
  const step = (raw ?? {}) as Partial<StepState>;
  const builder = (step.builder ?? {}) as Partial<BuilderState>;
  return {
    tried: Array.isArray(step.tried) ? step.tried.filter(Number.isInteger) : [],
    outcome: ['open', 'correct', 'revealed', 'done'].includes(step.outcome as string) ? step.outcome as Outcome : 'open',
    misses: Number.isInteger(step.misses) ? step.misses! : 0, hint: typeof step.hint === 'string' ? step.hint : '', checked: typeof step.checked === 'string' ? step.checked : '',
    everRevealed: step.everRevealed === true || step.outcome === 'revealed',
    builder: {
      place: Object.fromEntries(Object.entries(builder.place ?? {}).filter(([, v]) => v === 'left' || v === 'right' || v === '')) as BuilderState['place'],
      negated: Object.fromEntries(Object.entries(builder.negated ?? {}).filter(([, v]) => typeof v === 'boolean')),
      leftOp: builder.leftOp === 'or' ? 'or' : 'and', rightOp: builder.rightOp === 'or' ? 'or' : 'and',
    },
  };
}
function readSaved(key: string, accountState?: unknown): Saved {
  try {
    const data = (accountState ?? JSON.parse(localStorage.getItem(key) ?? 'null')) as Partial<Saved> | null;
    if (!data || data.version !== 1 || !Number.isInteger(data.current) || !data.items || typeof data.items !== 'object') return { version: 1, current: 0, items: {} };
    const items: Record<string, ItemState> = {};
    for (const [id, raw] of Object.entries(data.items)) {
      const value = raw as Partial<ItemState>;
      items[id] = {
        stepIndex: Number.isInteger(value.stepIndex) ? value.stepIndex! : 0,
        labels: Object.fromEntries(Object.entries(value.labels ?? {}).filter(([, v]) => typeof v === 'string')) as Record<string, string>,
        steps: Object.fromEntries(Object.entries(value.steps ?? {}).map(([k, v]) => [k, cleanStep(v)])),
      };
    }
    return { version: 1, current: data.current!, items };
  } catch { return { version: 1, current: 0, items: {} }; }
}

// ---- One multiple-choice step -------------------------------------------------------------------

export interface ChoiceState { tried: number[]; outcome: Outcome }

/** The learner's attempt always comes first. The first miss gets a hint for that choice; a second miss unlocks the answer. */
export function ChoiceStepView({ item, step, state, onChange, idPrefix, concise = false }: { item: AndOrItem; step: ChoiceStep; state: ChoiceState; onChange: (next: ChoiceState) => void; idPrefix: string; concise?: boolean }) {
  // A Pop Quiz answers in one natural sentence. Practice keeps the full authored reasoning.
  const explanation = concise ? answerLine(item) : item.why;
  const feedback = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const misses = state.tried.filter(index => !step.options[index]?.correct).length;
  const lastMiss = [...state.tried].reverse().find(index => !step.options[index]?.correct);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    feedback.current?.focus({ preventScroll: true });
  }, [state.tried.length, state.outcome]);
  const pick = (index: number) => {
    if (state.outcome !== 'open' || state.tried.includes(index)) return;
    onChange({ tried: [...state.tried, index], outcome: step.options[index].correct ? 'correct' : 'open' });
  };
  return <>
    <p className="ao-prompt" id={`${idPrefix}-prompt`}>{step.prompt}</p>
    <ol className="ao-options" aria-labelledby={`${idPrefix}-prompt`}>{step.options.map((option, index) => {
      const tried = state.tried.includes(index);
      const status = state.outcome === 'correct' && option.correct && tried ? 'right' : state.outcome === 'revealed' && option.correct ? 'shown' : tried && !option.correct ? 'wrong' : 'open';
      return <li key={option.text}><button type="button" className="ao-option" data-state={status} disabled={state.outcome !== 'open' || tried} aria-disabled={state.outcome !== 'open' || tried} onClick={() => pick(index)}>
        <span>{option.text}</span>
        {status === 'right' && <span className="ao-mark" data-kind="right"><Check size={14} aria-hidden="true"/>Correct</span>}
        {status === 'wrong' && <span className="ao-mark" data-kind="wrong"><X size={14} aria-hidden="true"/>Not this one</span>}
        {status === 'shown' && <span className="ao-mark" data-kind="shown"><Check size={14} aria-hidden="true"/>Answer</span>}
      </button></li>;
    })}</ol>
    <div ref={feedback} tabIndex={-1} role="status" aria-live="polite">
      {state.outcome === 'open' && lastMiss !== undefined && <div className="ao-feedback" data-kind="hint"><strong>Not that one.</strong>{step.options[lastMiss].hint}</div>}
      {state.outcome === 'correct' && <div className="ao-feedback" data-kind="right"><strong>Yes.</strong>{explanation}</div>}
      {state.outcome === 'revealed' && <div className="ao-feedback" data-kind="shown"><strong>Here is the answer.</strong>{explanation} This question counts as completed, not as answered correctly.</div>}
    </div>
    {state.outcome === 'open' && misses >= 2 && <button type="button" className="ao-text-button" onClick={() => onChange({ ...state, outcome: 'revealed' })}>Show me the answer</button>}
  </>;
}

// ---- Pop Quiz inside a lesson ---------------------------------------------------------------------

/** Four items, one at a time. Nothing is saved: the quiz is a check on the lesson, not a record. */
export function AndOrQuiz({ quizId }: { quizId: string }) {
  const items = andOrQuizzes[quizId];
  const [index, setIndex] = useState(0);
  const [states, setStates] = useState<Record<string, ChoiceState>>({});
  const [finished, setFinished] = useState(false);
  if (!items) return null;
  const item = items[index];
  const step = choiceStep(item)!;
  const state = states[item.id] ?? { tried: [], outcome: 'open' as Outcome };
  const solved = items.filter(entry => (states[entry.id]?.outcome ?? 'open') !== 'open').length;
  return <section className="co-section" aria-label="Pop Quiz">
    <div className="co-section-heading"><PopQuizTitle/></div>
    <div className="ao-quiz">
      <div className="ao-count"><span>Question {index + 1} of {items.length}</span><span className="ao-dots" aria-hidden="true">{items.map((entry, i) => <i key={entry.id} data-state={(states[entry.id]?.outcome ?? 'open') !== 'open' ? 'done' : i === index ? 'now' : 'todo'}/>)}</span></div>
      {finished
        ? <div className="ao-feedback" data-kind="right"><strong>That is all four.</strong>You worked {solved} of {items.length} questions. <button type="button" className="ao-text-button" onClick={() => { setStates({}); setIndex(0); setFinished(false); }}>Try them again</button></div>
        : <>
          <ChoiceStepView key={item.id} item={item} step={step} state={state} idPrefix={`${quizId}-${item.id}`} concise onChange={next => setStates(previous => ({ ...previous, [item.id]: next }))}/>
          {state.outcome !== 'open' && (index === items.length - 1
            ? <button type="button" className="ao-action" onClick={() => setFinished(true)}>Finish the quiz</button>
            : <button type="button" className="ao-action" onClick={() => setIndex(index + 1)}>Next question<ArrowRight size={16} aria-hidden="true"/></button>)}
        </>}
    </div>
  </section>;
}

// ---- Build steps -----------------------------------------------------------------------------------

function Builder({ item, atoms, stage, state, onChange, disabled }: { item: AndOrItem; atoms: Atom[]; stage: 'diagram' | 'contra'; state: BuilderState; onChange: (next: BuilderState) => void; disabled: boolean }) {
  const ids = itemAtomIds(item);
  const placed = (where: 'left' | 'right') => ids.filter(id => state.place[id] === where).length;
  const built = builtRule(item, state);
  const connector = (where: 'left' | 'right') => placed(where) > 1 && <div className="ao-build-op" role="group" aria-label={`Connector for the ${where} side`}>
    <span>{where === 'left' ? 'Left' : 'Right'} side joins its conditions with</span>
    {(['and', 'or'] as const).map(op => <button type="button" key={op} disabled={disabled} aria-pressed={(where === 'left' ? state.leftOp : state.rightOp) === op} onClick={() => onChange({ ...state, [where === 'left' ? 'leftOp' : 'rightOp']: op })}>{op.toUpperCase()}</button>)}
  </div>;
  return <div className="ao-build">
    {ids.map(id => {
      const atom = atoms.find(entry => entry.id === id)!;
      return <div className="ao-build-row" key={id}>
        <strong title={atomOf(item.atoms, id).yes}>{atom.short}</strong>
        <fieldset><legend>{`Side for ${atom.short}`}</legend>
          {(['left', 'right'] as const).map(where => <button type="button" key={where} disabled={disabled} aria-pressed={state.place[id] === where} onClick={() => onChange({ ...state, place: { ...state.place, [id]: where } })}>{where === 'left' ? 'Left' : 'Right'}</button>)}
        </fieldset>
        <button type="button" disabled={disabled} aria-pressed={!!state.negated[id]} onClick={() => onChange({ ...state, negated: { ...state.negated, [id]: !state.negated[id] } })}>NOT{state.negated[id] ? ' on' : ' off'}</button>
      </div>;
    })}
    {connector('left')}{connector('right')}
    {built && <AndOrDiagram atoms={atoms} rule={built} title={stage === 'diagram' ? 'Your diagram' : 'Your contrapositive'}/>}
  </div>;
}

// ---- The practice run ---------------------------------------------------------------------------

export function AndOrDrill({ setId, run = false, startUrl, title, storageScope = 'preview' }: { setId: string; run?: boolean; startUrl?: string; title?: string; storageScope?: string }) {
  const set = getAndOrDrill(setId);
  if (!set) return <p>This practice set is unavailable.</p>;
  return <div className="opening-course-content"><AndOrRun key={`${storageScope}-${setId}`} set={set} run={run} startUrl={startUrl} title={title} storageScope={storageScope}/></div>;
}

function AndOrRun({ set, run, startUrl, title, storageScope }: { set: NonNullable<ReturnType<typeof getAndOrDrill>>; run: boolean; startUrl?: string; title?: string; storageScope: string }) {
  const storageKey = storageScope === 'preview' ? `conditional-and-or-v1:${set.id}` : `conditional-and-or-v1:${storageScope}:${set.id}`;
  const course = useCourseStep(set.id);
  const record = course?.record;
  const [saved, setSaved] = useState<Saved>(() => readSaved(storageKey, course?.saved?.state));
  const [started, setStarted] = useState(run);
  const [results, setResults] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const total = set.items.length;
  const current = Math.max(0, Math.min(saved.current, total - 1));
  const item = set.items[current];
  const state = saved.items[item.id] ?? blankItem();
  const keys = stepKeys(item);
  const stepIndex = Math.max(0, Math.min(state.stepIndex, keys.length - 1));
  const key = keys[stepIndex];
  const step = stepOf(state, key);
  const doneIndices = set.items.flatMap((entry, i) => itemDone(entry, saved.items[entry.id]) ? [i] : []);
  const doneCount = doneIndices.length;
  const correctCount = set.items.filter(entry => itemCorrect(entry, saved.items[entry.id])).length;

  useEffect(() => {
    if (started) record?.({ state: saved, done: doneCount, total, ...(doneCount === total ? { status: 'done' as const } : { reopen: true }) });
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); setStorageFailed(false); } catch { setStorageFailed(!record); }
  }, [saved, storageKey, record, started, doneCount, total]);
  useEffect(() => { if (started) heading.current?.focus({ preventScroll: true }); }, [current, started, results]);

  const patchItem = (patch: (value: ItemState) => ItemState) => setSaved(previous => ({ ...previous, items: { ...previous.items, [item.id]: patch(previous.items[item.id] ?? blankItem()) } }));
  const patchStep = (stepKey: string, patch: Partial<StepState>) => patchItem(value => ({ ...value, steps: { ...value.steps, [stepKey]: { ...stepOf(value, stepKey), ...patch } } }));
  const go = (index: number) => { setSaved(previous => ({ ...previous, current: index })); setResults(false); setStarted(true); };
  const atoms = labelledAtoms(item, state.labels);

  /** Editing wording reopens the labels step and clears the arrangement, NOT choices and any accepted or revealed grade built on it. The written text, the miss count and the last hint stay. */
  const setLabel = (id: string, value: string) => patchItem(prior => ({
    ...prior, labels: { ...prior.labels, [id]: value },
    steps: {
      ...prior.steps,
      labels: { ...stepOf(prior, 'labels'), outcome: 'open' },
      diagram: invalidateArrangement(stepOf(prior, 'diagram')),
      contra: invalidateArrangement(stepOf(prior, 'contra')),
    },
  }));

  if (!started) return <section className="ao-run"><h1>{title ?? set.title}</h1><p>{set.description}</p>{startUrl && <a className="ao-action" href={startUrl}>Start practice</a>}</section>;

  const choice = key === 'answer' ? choiceStep(item) : null;
  const buildStage = key === 'diagram' || key === 'contra' ? key : null;
  const checkStep = () => {
    if (!buildStage) return;
    const result = checkBuild(item, step.builder, buildStage);
    const checked = builderSignature(item, step.builder);
    if (!result.ready) { patchStep(key, { hint: result.hint, checked }); return; }
    if (result.correct) patchStep(key, { outcome: 'correct', hint: '', checked: '' });
    else patchStep(key, { misses: step.misses + 1, hint: result.hint, checked });
  };
  const nextStep = () => patchItem(value => ({ ...value, stepIndex: Math.min(keys.length - 1, stepIndex + 1) }));
  const finishedItem = itemDone(item, saved.items[item.id]);

  return <section className="ao-run" aria-label={set.title}>
    <DrillProgress completed={doneCount} total={total} current={current} completedIndices={doneIndices}/>
    <nav aria-label="Question map"><ol className="ao-map">{set.items.map((entry, i) => {
      const complete = itemDone(entry, saved.items[entry.id]);
      return <li key={entry.id}><button type="button" aria-current={i === current && !results ? 'step' : undefined} data-done={complete} aria-label={`Question ${i + 1}${complete ? ', completed' : ''}${i === current && !results ? ', current' : ''}`} onClick={() => go(i)}>{i + 1}{complete && <Check size={13} aria-hidden="true"/>}</button></li>;
    })}</ol></nav>
    {storageFailed && <p role="status" className="ao-storage-error">Your browser could not save this work. Keep this page open to retain your work.</p>}
    {results ? <div className="ao-results">
      <h2 ref={heading} tabIndex={-1}>{doneCount === total ? 'Every question completed.' : 'Your work so far.'}</h2>
      <p>{doneCount} of {total} questions completed. {correctCount} answered correctly without a reveal{doneCount > correctCount ? `; ${doneCount - correctCount} completed after seeing the answer` : ''}.</p>
      <p>Choose a question number above to go back to it.</p>
    </div> : <>
      <h2 className="ao-question-title" ref={heading} tabIndex={-1}>Question {current + 1} of {total}</h2>
      {item.task.kind === 'build' && <div className="ao-rule-card"><p>{item.statement}</p></div>}
      {keys.length > 1 && <ol className="ao-stage-rail" aria-label="Steps for this question">{keys.map((k, i) => <li key={k} aria-current={i === stepIndex ? 'step' : undefined}>
        <button type="button" className="ao-text-button" style={{ color: 'inherit', textDecoration: i === stepIndex ? 'underline' : 'none' }} disabled={i > stepIndex && stepOf(state, keys[i - 1]).outcome === 'open'} onClick={() => patchItem(value => ({ ...value, stepIndex: i }))}>{i + 1}. {stepNames[k]}{stepOf(state, k).outcome !== 'open' ? ' (done)' : ''}</button>
      </li>)}</ol>}
      {choice && <div className="ao-step"><ChoiceStepView key={item.id} item={item} step={choice} state={{ tried: step.tried, outcome: step.outcome }} idPrefix={`${set.id}-${item.id}`} onChange={next => patchStep('answer', { ...next, ...(next.outcome === 'revealed' ? { everRevealed: true } : {}) })}/></div>}
      {key === 'labels' && <div className="ao-step">
        <p className="ao-prompt">Write a short version of each condition. Keep who or what it concerns, every restriction, and any negative.</p>
        <div className="ao-labels">{itemAtomIds(item).map(id => <label key={id}><span style={{ color: '#cfe3ea' }}>{atomOf(item.atoms, id).yes}</span>
          <input value={state.labels[id] ?? ''} maxLength={80} aria-label={`Short version of: ${atomOf(item.atoms, id).yes}`} onChange={event => setLabel(id, event.target.value)}/></label>)}</div>
        {!labelsValid(item, state.labels) && Object.values(state.labels).some(Boolean) && <p className="ao-feedback" role="status">Use a meaningful phrase for each condition. A single letter does not keep its meaning, and no two conditions can share a phrase.</p>}
        {labelsValid(item, state.labels) && <div className="ao-feedback" role="status"><strong>Compare with ours.</strong>{itemAtomIds(item).map(id => `${state.labels[id].trim()} (ours: ${atomOf(item.atoms, id).short})`).join(' · ')}. These are your own drafts. The next steps check the arrangement, not your wording.</div>}
        <button type="button" className="ao-action" disabled={!labelsValid(item, state.labels)} onClick={() => { patchStep('labels', { outcome: 'done' }); nextStep(); }}>Next step<ArrowRight size={16} aria-hidden="true"/></button>
      </div>}
      {buildStage && <div className="ao-step">
        <p className="ao-prompt">{buildStage === 'diagram' ? 'Place each condition on a side of the arrow, set each connector, and mark any NOT the rule contains.' : 'Now build the contrapositive: switch the sides, put NOT on every member, and change each group’s connector.'}</p>
        <Builder item={item} atoms={atoms} stage={buildStage} state={step.builder} disabled={step.outcome !== 'open'} onChange={next => patchStep(key, { builder: next })}/>
        <div role="status" aria-live="polite">
          {step.outcome === 'open' && step.hint && (step.checked === builderSignature(item, step.builder)
            ? <div className="ao-feedback" data-kind="hint"><strong>Not yet.</strong>{step.hint}</div>
            : <div className="ao-feedback" data-kind="hint"><strong>Earlier feedback.</strong>You changed the arrangement after this was written, so it may no longer apply. Check this step again for a fresh answer. {step.hint}</div>)}
          {step.outcome === 'correct' && <div className="ao-feedback" data-kind="right"><strong>That works.</strong>{ruleSentence(item.atoms, expectedBuild(item, buildStage))}</div>}
          {step.outcome === 'revealed' && <div className="ao-feedback" data-kind="shown"><strong>Here is the arrangement.</strong>{ruleSentence(item.atoms, expectedBuild(item, buildStage))} This step counts as completed, not as built correctly.</div>}
        </div>
        {step.outcome === 'revealed' && <AndOrDiagram atoms={atoms} rule={expectedBuild(item, buildStage)} title="The arrangement"/>}
        {step.outcome === 'open' && <button type="button" className="ao-action" onClick={checkStep}>Check this step</button>}
        {step.outcome === 'open' && step.misses >= 2 && <button type="button" className="ao-text-button" onClick={() => patchStep(key, { outcome: 'revealed', everRevealed: true })}>Show me the arrangement</button>}
        {step.outcome !== 'open' && stepIndex < keys.length - 1 && <button type="button" className="ao-action" onClick={nextStep}>Next step<ArrowRight size={16} aria-hidden="true"/></button>}
      </div>}
      {finishedItem && item.task.kind === 'build' && <div className="ao-feedback" data-kind="right"><strong>Why it works.</strong>{item.why}</div>}
    </>}
    <nav className="ao-nav" aria-label="Question navigation">
      <button type="button" disabled={current === 0 && !results} onClick={() => results ? go(total - 1) : go(current - 1)}><ArrowLeft size={16} aria-hidden="true"/>Previous question</button>
      <button type="button" disabled={results || !finishedItem} onClick={() => current === total - 1 ? setResults(true) : go(current + 1)}>{current === total - 1 ? 'See results' : 'Next question'}<ArrowRight size={16} aria-hidden="true"/></button>
    </nav>
  </section>;
}
