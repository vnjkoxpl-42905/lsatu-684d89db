import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkIndicatorSelection, getSourceWorksheetDrill, type SourceWorksheetDrillSet } from '../content/sourceWorksheetDrills';
import { checkConditionSpans } from '../content/conditionSpans';
import { useCourseStep } from '../courseProgress';
import './source-worksheet-drill.css';
import { DrillProgress } from './DrillProgress';
import { gradeConditionalRewrite } from '@/lib/conditionalRewriteGrader';

type Stage = 'indicators' | 'conditions' | 'symbols' | 'diagram' | 'contra' | 'readback' | 'contra-readback' | 'review';
type Attempt = {
  groups: Record<string, string>; fingerprint: string; words: number[]; flowVersion: number;
  left: string; right: string; contraLeft: string; contraRight: string;
  negateLeft: boolean; negateRight: boolean; writing: string; contraWriting: string;
  conditionOne: string; conditionTwo: string; symbolOne: string; symbolTwo: string; spans: number[][];
  writingGrades?: Partial<Record<'readback' | 'contra-readback', { text: string; correct: boolean; feedback: string }>>;
  condensation?: { first: string; second: string; correct: boolean; feedback: string[] };
  stage: number; passed: Stage[]; revealed: boolean; review: 'matched' | 'revisit' | null;
};
const blank = (): Attempt => ({ flowVersion: 4, groups: {}, fingerprint: '', words: [], left: '', right: '', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false, writing: '', contraWriting: '', conditionOne: '', conditionTwo: '', symbolOne: '', symbolTwo: '', spans: [], stage: 0, passed: [], revealed: false, review: null });
type Saved = { current: number; answers: Record<string, Attempt> };
const names: Record<Stage, string> = { indicators: 'Find the indicators', conditions: 'Keep the complete ideas', symbols: 'Shorten the conditions', diagram: 'Build the diagram', contra: 'Reverse and negate', readback: 'Read the original', 'contra-readback': 'Read the contrapositive', review: 'Bring it together' };
const stageInstructions: Partial<Record<Stage, string>> = {
  indicators: "Click the indicator: the word that tells you one condition is enough for, or required by, another. If the indicator is a phrase, like “only if,” click each word in it. Then choose its group.",
  symbols: "Write a shorter version of each complete condition. Keep who or what it concerns, every restriction, and any negation.",
  diagram: "Use your short versions to build the diagram. Put the sufficient condition on the left and the necessary condition on the right.",
  contra: "Reverse your two conditions, then negate each one. Turn NOT on for a side to negate it. Keep the meaning of each complete condition unchanged.",
  readback: "Start with the rule. Write its meaning in ordinary if/then language before you compare it with our version.",
  'contra-readback': 'Write the contrapositive in ordinary language, then compare the complete meaning.',
};
function stagesFor(kind: SourceWorksheetDrillSet['taskKind'], legacy = false): Stage[] {
  const previous: Stage[] = kind === 'indicators' ? ['indicators', 'review']
    : kind === 'identify' ? ['indicators', 'conditions', 'review']
    : kind === 'rephrase' ? ['readback', 'indicators', 'diagram', 'review']
    : kind === 'contrapositive' ? ['indicators', 'conditions', 'symbols', 'diagram', 'contra', 'readback', 'contra-readback', 'review']
    : kind === 'forward' ? ['conditions', 'symbols', 'diagram', 'review']
    : ['conditions', 'diagram', 'review'];
  return legacy ? previous : previous.filter(stage => stage !== 'conditions');
}
// Drill sets folded into another set. Their saved answers carry over by item id; the old record stays untouched.
const FOLDED_SETS: Record<string, string> = { 'source-intro-identify': 'source-indicators' };
const normalizeCondition = (value: string) => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const readablePhrase = (value: string) => /[A-Za-z]{3}/.test(value.trim()) && value.trim().length <= 400;
function fingerprint(item: { statement: string; sufficient: string; necessary: string; indicators: unknown; contrapositiveWords: string }) {
  return JSON.stringify([item.statement, item.sufficient, item.necessary, item.indicators, item.contrapositiveWords]);
}
function readSaved(key: string, accountState?: unknown): Saved {
  try {
    const data = accountState ?? JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!data || !Number.isInteger(data.current) || !data.answers || typeof data.answers !== 'object') return { current: 0, answers: {} };
    const answers: Record<string, Attempt> = {};
    for (const [id, raw] of Object.entries(data.answers)) {
      const a = raw as Partial<Attempt>;
      if (!a || !Array.isArray(a.words) || !a.words.every(Number.isInteger) || !['left', 'right', 'contraLeft', 'contraRight', 'writing'].every(k => typeof a[k] === 'string')) continue;
      const strings = Object.fromEntries(['fingerprint', 'conditionOne', 'conditionTwo', 'symbolOne', 'symbolTwo', 'contraWriting'].map(key => [key, typeof a[key] === 'string' ? a[key] : '']));
      answers[id] = { ...blank(), ...a, ...strings, flowVersion: a.flowVersion === 4 ? 4 : a.flowVersion === 3 ? 3 : a.flowVersion === 2 ? 2 : 1, revealed: a.revealed === true, negateLeft: a.negateLeft === true, negateRight: a.negateRight === true, spans: Array.isArray(a.spans) ? a.spans.filter(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && p[0] <= p[1]).slice(0, 2) : [], groups: a.groups && typeof a.groups === 'object' ? Object.fromEntries(Object.entries(a.groups).filter(([, value]) => value === '1' || value === '2')) : {}, stage: Number.isInteger(a.stage) ? a.stage! : 0, passed: Array.isArray(a.passed) ? a.passed.filter(s => typeof s === 'string' && s in names) : [], review: ['matched', 'revisit'].includes(a.review ?? '') ? a.review! : null };
    }
    return { current: data.current, answers };
  } catch { return { current: 0, answers: {} }; }
}

export function SourceWorksheetDrill({ setId, run = false, startUrl, title, storageScope = 'preview' }: { setId: string; run?: boolean; startUrl?: string; title?: string; storageScope?: string }) {
  const set = getSourceWorksheetDrill(setId);
  if (!set) return <p>This practice set is unavailable.</p>;
  return <div className="opening-course-content"><WorksheetRun key={`${storageScope}-${setId}-${run}`} set={set} title={title} run={run} startUrl={startUrl} storageScope={storageScope}/></div>;
}

function WorksheetRun({ set, run, startUrl, title, storageScope }: { set: SourceWorksheetDrillSet; run: boolean; startUrl?: string; title?: string; storageScope: string }) {
  // The unscoped preview key belongs to the local dev preview. Signed-in routes pass their user id, so students on a shared device never share drafts.
  const storageKey = storageScope === 'preview' ? `conditional-worksheet-v1:${set.id}` : `conditional-worksheet-v1:${storageScope}:${set.id}`;
  const stages = stagesFor(set.taskKind);
  const stageName = (value: Stage) => set.taskKind === 'rephrase' && value === 'readback' ? 'Rewrite the rule' : names[value];
  const course = useCourseStep(set.id);
  const record = course?.record;
  const foldedId = FOLDED_SETS[set.id];
  const foldedCourse = useCourseStep(foldedId);
  const [saved, setSaved] = useState(() => {
    const restored = readSaved(storageKey, course?.saved?.state);
    if (foldedId) {
      const folded = readSaved(storageKey.slice(0, -set.id.length) + foldedId, foldedCourse?.saved?.state);
      for (const [id, attempt] of Object.entries(folded.answers)) {
        if (restored.answers[id] || !set.items.some(entry => entry.id === id)) continue;
        // Preserve the folded indicator work without claiming that its final review happened.
        const passed = attempt.passed.filter(s => s === 'indicators');
        restored.answers[id] = { ...attempt, passed, stage: passed.length ? 1 : 0, review: null, revealed: false };
      }
    }
    for (const item of set.items) {
      const a = restored.answers[item.id];
      if (a && a.flowVersion === 1) {
        // Numeric positions used to include highlighting. Resume by the old stage
        // name so saved symbol choices and writing cannot shift to another task.
        const previous = stagesFor(set.taskKind, true);
        const nextStage = previous.slice(a.stage).find(stage => stage !== 'conditions') ?? 'review';
        a.stage = Math.max(0, stages.indexOf(nextStage));
        a.flowVersion = 2;
      }
      if (a && a.flowVersion !== 4) {
        const condensationStage = stages.includes('symbols') ? stages.indexOf('symbols') : stages.indexOf('readback');
        if (condensationStage >= 0 && (a.stage >= condensationStage || a.passed.includes('symbols'))) {
          // Keep old letters and written drafts visible, but do not count symbol
          // assignment as practice shortening complete conditions.
          a.stage = condensationStage;
          a.passed = a.passed.filter(stage => stages.indexOf(stage) < condensationStage);
          a.review = null;
          a.revealed = false;
          a.condensation = undefined;
        }
        a.flowVersion = 4;
      }
      if (a && (a.fingerprint !== fingerprint(item) || !a.passed.length && a.stage === 0)) {
        // Keep earlier drafts. The new staged workflow asks the learner to check each operation again.
        a.revealed = false; a.review = null; a.stage = 0; a.passed = [];
      }
    }
    return restored;
  });
  const [started, setStarted] = useState(run);
  const [results, setResults] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradingError, setGradingError] = useState('');
  const gradingRequest = useRef(0);
  useEffect(() => () => { gradingRequest.current++; }, []);
  // Hints come first. After a second miss on the same step the student may ask to see the answer, then enters it themselves.
  const [misses, setMisses] = useState(0);
  const [shown, setShown] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const current = Math.max(0, Math.min(saved.current, set.items.length - 1));
  const item = set.items[current];
  const answer = saved.answers[item.id] ?? blank();
  const stageIndex = Math.max(0, Math.min(answer.stage, stages.length - 1));
  useEffect(() => { setMisses(0); setShown(false); gradingRequest.current++; setGrading(false); setGradingError(''); }, [current, stageIndex]);
  const stage = stages[stageIndex];
  const isFinished = (entry: typeof item) => {
    const a = saved.answers[entry.id];
    return !!a && stages.every(stage => stage === 'review' || a.passed.includes(stage));
  };
  const completedIndices = set.items.flatMap((entry, index) => isFinished(entry) ? [index] : []);
  const reviewed = completedIndices.length;
  const tokens = item.statement.split(/\s+/);
  const phrases = answer.words.reduce<number[][]>((runs, word) => { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === word - 1) last.push(word); else runs.push([word]); return runs; }, []);
  const indicatorCheck = checkIndicatorSelection(item, phrases.map(p => ({ text: p.map(i => tokens[i]).join(' '), group: answer.groups[p.join('-')] ?? '' })));
  const indicatorsCorrect = indicatorCheck.correct;
  const production = set.taskKind === 'forward' || set.taskKind === 'contrapositive';
  // New runs use the supplied complete conditions. A valid saved highlight keeps
  // its old symbol meanings; historical drafts remain stored without a task gate.
  const legacySpans = checkConditionSpans(item.statement, answer.spans);
  const keepsSavedConditions = legacySpans.correct && !!answer.conditionOne && !!answer.conditionTwo;
  const neutralConditions = current % 2 === 0 ? [item.necessary, item.sufficient] : [item.sufficient, item.necessary];
  const suppliedConditions = keepsSavedConditions ? [answer.conditionOne, answer.conditionTwo] : neutralConditions;
  const sufficientKey = keepsSavedConditions ? legacySpans.roles[0] === 'sufficient' ? '1' : '2' : current % 2 === 0 ? '2' : '1';
  const necessaryKey = sufficientKey === '1' ? '2' : '1';
  const symbolFor = (key: string) => key === '1' ? answer.symbolOne.trim() : key === '2' ? answer.symbolTwo.trim() : '';
  const originalText = production && answer.left && answer.right ? `${symbolFor(answer.left)} → ${symbolFor(answer.right)}` : '';
  const contraText = production && answer.contraLeft && answer.contraRight ? `${answer.negateLeft ? 'NOT ' : ''}${symbolFor(answer.contraLeft)} → ${answer.negateRight ? 'NOT ' : ''}${symbolFor(answer.contraRight)}` : '';
  const placementCorrect = production ? answer.left === sufficientKey && answer.right === necessaryKey : answer.left === 'sufficient' && answer.right === 'necessary';
  const contraOrderCorrect = production ? answer.contraLeft === necessaryKey && answer.contraRight === sufficientKey : answer.contraLeft === 'necessary' && answer.contraRight === 'sufficient';
  const contraCorrect = contraOrderCorrect && answer.negateLeft && answer.negateRight;
  const contraHint = !contraOrderCorrect ? 'Start with the right side of your original diagram. It becomes the new left side.' : 'The order is right. Now negate each whole side once.';
  const symbolsValid = readablePhrase(answer.symbolOne) && readablePhrase(answer.symbolTwo) && answer.symbolOne.trim().toLowerCase() !== answer.symbolTwo.trim().toLowerCase();
  const condensationCurrent = answer.condensation?.first === answer.symbolOne && answer.condensation?.second === answer.symbolTwo;
  const condensationAccepted = condensationCurrent && answer.condensation?.correct === true;
  // The written readbacks are the only steps that wait for the end. Everything with one right answer is checked as it is built.
  const writingStage = stage === 'readback' || stage === 'contra-readback';
  const objective = ['indicators', 'diagram', 'contra'].includes(stage);
  const correct = stage === 'indicators' ? indicatorsCorrect : stage === 'diagram' ? placementCorrect : stage === 'contra' ? contraCorrect : true;
  const holdExplanation = set.taskKind === 'contrapositive' && ['diagram', 'contra'].includes(stage);

  const ready = stage === 'indicators' ? phrases.length > 0 && phrases.every(p => !!answer.groups[p.join('-')]) : stage === 'symbols' ? condensationAccepted : stage === 'diagram' ? !!answer.left && !!answer.right : stage === 'contra' ? !!answer.contraLeft && !!answer.contraRight : stage === 'readback' ? !!answer.writing.trim() : stage === 'contra-readback' ? !!answer.contraWriting.trim() : true;
  const choices = current % 2 ? ['necessary', 'sufficient'] : ['sufficient', 'necessary'];
  const condition = (value: string) => value === 'sufficient' ? item.sufficient : item.necessary;

  const finishedItems = reviewed;
  useEffect(() => {
    if (started) record?.({ state: saved, done: finishedItems, total: set.items.length, ...(finishedItems === set.items.length ? { status: 'done' as const } : {}) });
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); setStorageFailed(false); } catch { setStorageFailed(!record); }
  }, [saved, storageKey, record, started, finishedItems, set.items.length]);
  useEffect(() => { if (started) heading.current?.focus({ preventScroll: true }); }, [current, stageIndex, started, results]);
  useEffect(() => { if (checked) feedback.current?.focus({ preventScroll: true }); }, [checked]);
  function update(patch: Partial<Attempt>) { setSaved(s => ({ ...s, answers: { ...s.answers, [item.id]: { ...(s.answers[item.id] ?? blank()), ...patch, fingerprint: fingerprint(item) } } })); }
  function edit(patch: Partial<Attempt>) { gradingRequest.current++; setGrading(false); setChecked(false); update({ ...patch, revealed: false, review: null, passed: answer.passed.filter(s => stages.indexOf(s) < stageIndex) }); }
  function go(index: number) { gradingRequest.current++; setGrading(false); setGradingError(''); setSaved(s => ({ ...s, current: index })); setChecked(false); setResults(false); setStarted(true); }
  function advance() { update({ stage: stageIndex + 1, passed: [...new Set([...answer.passed, stage])], revealed: false }); setChecked(false); }
  function nextQuestion() { if (current === set.items.length - 1) setResults(true); else go(current + 1); }
  async function checkCondensation() {
    const request = ++gradingRequest.current;
    setGrading(true); setGradingError('');
    try {
      const submissions = [answer.symbolOne, answer.symbolTwo];
      const grades = await Promise.all(submissions.map((studentResponse, index) => normalizeCondition(studentResponse) === normalizeCondition(suppliedConditions[index]) ? Promise.resolve({ correct: true }) : gradeConditionalRewrite({
        original: item.statement, expected: suppliedConditions[index], studentResponse, task: 'explanation',
        stagePrompt: 'Shorten this one condition while preserving its complete meaning. Compare the submitted phrase with the expected condition. Keep the same subject, qualifiers, deadlines, quantities, negation, permission, duty and timing. A short phrase is allowed; it does not need if/then syntax. Reject an arbitrary letter or code. Do not require a diagram or a counterexample explanation.',
      })));
      if (request !== gradingRequest.current) return;
      const accepted = grades.every(grade => grade.correct);
      update({ condensation: { first: submissions[0], second: submissions[1], correct: accepted, feedback: grades.map((grade, index) => grade.correct ? `Your short version keeps the meaning of “${suppliedConditions[index]}”.` : `Compare “${submissions[index]}” with “${suppliedConditions[index]}”. Keep the same complete condition, including every restriction.`) }, ...(accepted ? { stage: stageIndex + 1, passed: [...new Set([...answer.passed, stage])], revealed: false } : {}) });
    } catch { if (request === gradingRequest.current) setGradingError('Your short versions have not been checked. Try again.'); }
    finally { if (request === gradingRequest.current) setGrading(false); }
  }
  async function checkWriting() {
    if (stage !== 'readback' && stage !== 'contra-readback') return;
    const request = ++gradingRequest.current;
    const submission = stage === 'readback' ? answer.writing : answer.contraWriting;
    const expected = stage === 'readback' ? item.ifThen : item.contrapositiveWords;
    setGrading(true); setGradingError('');
    try {
      const grade = normalizeCondition(submission) === normalizeCondition(expected)
        ? { correct: true, feedback: 'Your sentence keeps the complete meaning.' }
        : await gradeConditionalRewrite({ original: item.statement, expected, studentResponse: submission, task: stage === 'readback' ? 'rewrite' : 'contrapositive', stagePrompt: stage === 'readback' ? 'Rewrite this conditional as if/then without changing its complete meaning.' : 'Write the contrapositive in ordinary language. Reverse and negate both complete conditions, preserving scope, timing and modality.' });
      if (request !== gradingRequest.current) return;
      update({ writingGrades: { ...answer.writingGrades, [stage]: { text: submission, ...grade } }, ...(grade.correct ? { stage: stageIndex + 1, passed: [...new Set([...answer.passed, stage])], revealed: false } : {}) });
    } catch { if (request === gradingRequest.current) setGradingError('Your sentence has not been checked. Try again.'); }
    finally { if (request === gradingRequest.current) setGrading(false); }
  }
  function symbolSlot(label: string, field: 'left' | 'right' | 'contraLeft' | 'contraRight') {
    const negated = field === 'contraLeft' && answer.negateLeft || field === 'contraRight' && answer.negateRight;
    const keys = current % 2 ? ['2', '1'] : ['1', '2'];
    return <fieldset className="sw-choice-slot sw-symbol-slot"><legend>{label}</legend>{keys.map(key => <button type="button" key={key} aria-pressed={answer[field] === key} onClick={() => edit({ [field]: key })}>{answer[field] === key && <Check size={17}/>}<span>{negated ? `NOT ${symbolFor(key)}` : symbolFor(key)}</span></button>)}</fieldset>;
  }
  function slot(label: string, field: 'left' | 'right' | 'contraLeft' | 'contraRight') {
    return <fieldset className="sw-choice-slot"><legend>{label}</legend>{choices.map(value => <button type="button" key={value} aria-pressed={answer[field] === value} onClick={() => edit({ [field]: value })}>{answer[field] === value && <Check size={17}/>}<span>{(field === 'contraLeft' && answer.negateLeft || field === 'contraRight' && answer.negateRight) ? `NOT (${condition(value)})` : condition(value)}</span></button>)}</fieldset>;
  }
  if (!started) return <section className="sw-entry"><div data-course-heading><p className="sw-eyebrow">{set.items.length} questions · One step at a time</p><h1>{title ?? set.title}</h1>{title && <h2>{set.title}</h2>}<p className="sw-entry-copy">{set.instructions}</p><ol className="sw-entry-steps">{stages.filter(stage => stageInstructions[stage]).map(stage => <li key={stage}><strong>{stageName(stage)}.</strong> {stageInstructions[stage]}</li>)}</ol>{startUrl ? <Link className="sw-primary" to={startUrl}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></Link> : <button className="sw-primary" onClick={() => setStarted(true)}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></button>}</div></section>;

  return <section className="sw-experience" aria-label={set.title}>
    <DrillProgress completed={reviewed} total={set.items.length} current={current} completedIndices={completedIndices}/>
    {storageFailed && <p role="status" className="sw-storage-error">Your browser could not save this work. Keep this page open to retain your work.</p>}
    {results ? <div className="sw-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>{reviewed === set.items.length ? 'Every question reviewed.' : 'Your work so far.'}</h2><p>The required checks for each completed question passed.</p><div className="sw-review-grid">{set.items.map((q, index) => <button key={q.id} onClick={() => go(index)}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{isFinished(q) ? 'Checks passed' : 'Not complete'}</span><ArrowRight size={16}/></button>)}</div></div> : <>
      <div className="sw-question" key={item.id}><aside className="sw-rule"><div className="sw-rule-sticky"><blockquote>{item.statement}</blockquote><ol className="sw-stage-rail" aria-label="Steps for this rule">{stages.map((s, i) => <li key={s} aria-current={i === stageIndex ? 'step' : undefined}><span>{answer.passed.includes(s) ? <Check size={14}/> : String(i + 1).padStart(2, '0')}</span><button disabled={i > stageIndex && !answer.passed.includes(stages[i - 1])} onClick={() => { update({ stage: i }); setChecked(false); }}>{stageName(s)}</button></li>)}</ol></div></aside>
      <div className="sw-work"><p className="sw-eyebrow">Step {stageIndex + 1} of {stages.length}</p><h2 ref={heading} tabIndex={-1}>{stageName(stage)}</h2>
      <div className="sw-active-task" key={stage}>
      {stage === 'indicators' && <><fieldset className="sw-tokens"><legend>Click the indicator in the rule.</legend>{tokens.map((word, index) => <button type="button" key={index} aria-pressed={answer.words.includes(index)} onClick={() => edit({ words: answer.words.includes(index) ? answer.words.filter(n => n !== index) : [...answer.words, index].sort((a, b) => a - b) })}>{word}</button>)}</fieldset>{phrases.length > 0 && <div className="sw-indicator-groups">{phrases.map(phrase => { const key = phrase.join('-'); const text = phrase.map(index => tokens[index]).join(' '); return <fieldset className="sw-group-picker" key={key}><legend>Which group: “{text}”?</legend><div className="sw-group-choices">{(['1', '2'] as const).map(group => <label className="sw-group-card" key={group}><input type="radio" aria-label={`Group ${group}: ${group === '1' ? 'sufficient-condition indicator' : 'necessary-condition indicator'}`} name={`${storageKey}-${item.id}-${key}`} value={group} checked={answer.groups[key] === group} onChange={() => edit({ groups: { ...answer.groups, [key]: group } })}/><span><strong>Group {group}</strong><span>{group === '1' ? 'Sufficient-condition indicator' : 'Necessary-condition indicator'}</span></span></label>)}</div></fieldset>; })}</div>}</>}
      {stage === 'symbols' && <>
        <div className="sw-symbol-grid">{suppliedConditions.map((condition, index) => <label className="sw-writing" key={condition}><strong>{condition}</strong><span>{index === 0 ? 'First' : 'Second'} condition’s short version</span><input aria-label={`${index === 0 ? 'First' : 'Second'} condition’s short version`} value={index === 0 ? answer.symbolOne : answer.symbolTwo} maxLength={400} disabled={grading} onChange={event => { setGradingError(''); edit({ [index === 0 ? 'symbolOne' : 'symbolTwo']: event.target.value, condensation: undefined, left: '', right: '', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false }); }}/></label>)}</div>
        {(answer.symbolOne.trim() || answer.symbolTwo.trim()) && !symbolsValid && <p role="status">Write a meaningful short phrase for each condition. A letter alone does not keep its meaning.</p>}
        {gradingError && <p role="alert">{gradingError}</p>}
        {condensationCurrent && <div className="sw-feedback">{answer.condensation?.feedback.map((text, index) => <p key={index}>{text}</p>)}</div>}
        {condensationAccepted ? <button className="sw-primary" onClick={advance}>Next step<ArrowRight size={17}/></button> : <button className="sw-primary" disabled={grading || !symbolsValid} onClick={() => void checkCondensation()}>{grading ? 'Checking short versions…' : 'Next step'}</button>}
      </>}
      {production && ['diagram', 'contra', 'readback', 'contra-readback'].includes(stage) && <details className="sw-learner-legend"><summary>See the complete conditions</summary><p><strong>{answer.symbolOne}</strong> = {suppliedConditions[0]}</p><p><strong>{answer.symbolTwo}</strong> = {suppliedConditions[1]}</p></details>}
      {stage === 'diagram' && production && <><div className="sw-arrow-row">{symbolSlot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{symbolSlot('Right: necessary condition', 'right')}</div></>}
      {stage === 'diagram' && !production && <><div className="sw-arrow-row">{slot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{slot('Right: necessary condition', 'right')}</div></>}
      {stage === 'contra' && <><div className="sw-prior-rule"><span>Your original diagram</span><p>{originalText}</p></div><div className="sw-arrow-row"><div className="sw-slot-wrap">{symbolSlot('Left side', 'contraLeft')}<label className="sw-negation"><input type="checkbox" checked={answer.negateLeft} onChange={e => edit({ negateLeft: e.target.checked })}/>NOT on the left side</label></div><span className="sw-arrow" aria-label="requires">→</span><div className="sw-slot-wrap">{symbolSlot('Right side', 'contraRight')}<label className="sw-negation"><input type="checkbox" checked={answer.negateRight} onChange={e => edit({ negateRight: e.target.checked })}/>NOT on the right side</label></div></div></>}
      {(stage === 'readback' || stage === 'contra-readback') && <>{production ? <div className="sw-prior-rule"><span>{stage === 'readback' ? 'Your original diagram' : 'Your contrapositive diagram'}</span><p>{stage === 'readback' ? originalText : contraText}</p></div> : null}<label className="sw-writing">{stage === 'readback' ? 'Write this rule as an if/then sentence.' : 'Write the contrapositive in ordinary language.'}<textarea rows={4} value={stage === 'readback' ? answer.writing : answer.contraWriting} onChange={e => edit(stage === 'readback' ? { writing: e.target.value } : { contraWriting: e.target.value })} placeholder="If …, then …"/></label></>}
      {writingStage && <>{gradingError && <p role="alert">{gradingError}</p>}{answer.writingGrades?.[stage as 'readback' | 'contra-readback']?.text === (stage === 'readback' ? answer.writing : answer.contraWriting) && <p role="status">{answer.writingGrades?.[stage as 'readback' | 'contra-readback']?.feedback}</p>}<button className="sw-primary" disabled={grading || !ready} onClick={() => void checkWriting()}>{grading ? 'Checking your sentence…' : 'Next step'}<ArrowRight size={17}/></button></>}
      {stage !== 'review' && stage !== 'symbols' && !writingStage && <>{!checked ? <button className="sw-primary" disabled={!ready} onClick={() => { setChecked(true); if (objective && !correct) setMisses(count => count + 1); }}>{objective ? 'Check this step' : 'Compare this step'}<ArrowRight size={17}/></button> : <section className={`sw-feedback ${objective && !correct ? 'sw-feedback-revise' : ''}`}><h3 ref={feedback} tabIndex={-1}>{objective ? correct ? 'That step works.' : 'Make one adjustment.' : 'Compare the complete meaning.'}</h3>{stage === 'indicators' && (indicatorsCorrect ? <><p>You found the indicators and their groups.</p><p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p></> : <p>{indicatorCheck.hint}</p>)}{stage === 'diagram' && <><p>{placementCorrect ? 'The sufficient condition points to what it requires.' : answer.left === answer.right ? 'You used the same condition twice. Each side needs a different complete condition.' : 'Which condition is enough to prove the other? That one goes on the left.'}</p>{placementCorrect && <p className="sw-answer-diagram">{item.diagram}</p>}</>}{stage === 'contra' && <>{objective && !correct ? <p>{contraHint}</p> : <><p>{objective ? 'Both sides switched, and both were negated. Compare with our version.' : 'Compare your contrapositive with ours. Different labels are fine; both sides must switch and both must be negated.'}</p><p className="sw-answer-diagram">{item.contrapositive}</p>{!production && <p>{item.contrapositiveWords}</p>}</>}</>}{objective && !correct && misses >= 2 && ready && (shown ? <p className="sw-answer-diagram sw-shown">{stage === 'indicators' ? item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ') : production ? stage === 'contra' ? `NOT ${symbolFor(sufficientKey === '1' ? '2' : '1')} → NOT ${symbolFor(sufficientKey)}` : `${symbolFor(sufficientKey)} → ${symbolFor(necessaryKey)}` : stage === 'contra' ? item.contrapositive : item.diagram}</p> : <button type="button" className="sw-text" onClick={() => setShown(true)}>Show me</button>)}{(!objective || correct) && !holdExplanation && <p>{item.explanation}</p>}{(!objective || correct) && <button className="sw-primary" onClick={advance}>{objective ? 'Next step' : 'I compared the meaning'}<ArrowRight size={17}/></button>}<button className="sw-text-button" onClick={() => setChecked(false)}>Revise this step</button></section>}</>}
      {stage === 'review' && <section className="sw-final-review">
        <div className="sw-finish-mark"><Check size={24}/></div><h3>{set.taskKind === 'forward' ? 'Your diagram keeps the rule.' : 'Checks passed.'}</h3>
        {stages.includes('diagram') && <p className="sw-answer-diagram">{originalText || item.diagram}</p>}
        {contraText && <p className="sw-answer-diagram">{contraText}</p>}
        {!stages.includes('diagram') && <p>{item.indicators.map(indicator => `${indicator.text}: Group ${indicator.group}`).join(' · ')}</p>}
        <p>{item.explanation}</p>
        <details className="sw-your-work"><summary>See complete wording</summary>
          {stages.includes('diagram') && <p>{item.diagram}</p>}
          {answer.writing && <p><strong>Your if/then sentence: </strong>{answer.writing}</p>}
          {answer.contraWriting && <p><strong>Your contrapositive: </strong>{answer.contraWriting}</p>}
          {stages.includes('contra') && <p>{item.contrapositive}</p>}
        </details>
      </section>}

      </div></div></div><nav className="sw-navigation" aria-label="Question navigation"><button disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous question</button><button disabled={!isFinished(item)} onClick={nextQuestion}>{current === set.items.length - 1 ? 'See results' : 'Next question'}<ArrowRight size={16}/></button></nav>
    </>}
  </section>;
}
