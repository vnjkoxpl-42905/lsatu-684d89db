import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkIndicatorSelection, getSourceWorksheetDrill, type SourceWorksheetDrillSet } from '../content/sourceWorksheetDrills';
import { checkConditionSpans, conditionAnswer, spanText } from '../content/conditionSpans';
import { useCourseStep } from '../courseProgress';
import './source-worksheet-drill.css';

type Stage = 'indicators' | 'conditions' | 'symbols' | 'diagram' | 'contra' | 'readback' | 'contra-readback' | 'review';
type Attempt = {
  groups: Record<string, string>; fingerprint: string; words: number[];
  left: string; right: string; contraLeft: string; contraRight: string;
  negateLeft: boolean; negateRight: boolean; writing: string; contraWriting: string;
  conditionOne: string; conditionTwo: string; symbolOne: string; symbolTwo: string; spans: number[][];
  stage: number; passed: Stage[]; revealed: boolean; review: 'matched' | 'revisit' | null;
};
const blank = (): Attempt => ({ groups: {}, fingerprint: '', words: [], left: '', right: '', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false, writing: '', contraWriting: '', conditionOne: '', conditionTwo: '', symbolOne: '', symbolTwo: '', spans: [], stage: 0, passed: [], revealed: false, review: null });
type Saved = { current: number; answers: Record<string, Attempt> };
const names: Record<Stage, string> = { indicators: 'Find the indicators', conditions: 'Keep the complete ideas', symbols: 'Define your symbols', diagram: 'Build the diagram', contra: 'Reverse and negate', readback: 'Read the original', 'contra-readback': 'Read the contrapositive', review: 'Bring it together' };
const stageInstructions: Partial<Record<Stage, string>> = {
  indicators: "Click the indicator: the word that tells you one condition is enough for, or required by, another. If the indicator is a phrase, like “only if,” click each word in it. Then choose its group.",
  conditions: "Highlight the two complete conditions in the rule. Click the first word of a condition, then its last word. Keep restrictions such as “within 30 days” and leave the indicator out.",
  symbols: "Give each condition its own letter. The letter stands for the whole idea, including every restriction.",
  diagram: "Use your letters to build the diagram. Put the sufficient condition on the left and the necessary condition on the right.",
  contra: "Reverse your two conditions, then negate each one. Turn NOT on for a side to negate it. Keep your letters’ meanings unchanged.",
  readback: "Start with the rule. Write its meaning in ordinary if/then language before you compare it with our version.",
  'contra-readback': 'Write the contrapositive in ordinary language, then compare the complete meaning.',
};
function stagesFor(kind: SourceWorksheetDrillSet['taskKind']): Stage[] {
  if (kind === 'indicators') return ['indicators', 'review'];
  if (kind === 'identify') return ['indicators', 'conditions', 'review'];
  if (kind === 'rephrase') return ['readback', 'indicators', 'diagram', 'review'];
  if (kind === 'contrapositive') return ['indicators', 'conditions', 'symbols', 'diagram', 'contra', 'readback', 'contra-readback', 'review'];
  return kind === 'forward' ? ['conditions', 'symbols', 'diagram', 'review'] : ['conditions', 'diagram', 'review'];
}
// Drill sets folded into another set. Their saved answers carry over by item id; the old record stays untouched.
const FOLDED_SETS: Record<string, string> = { 'source-intro-identify': 'source-indicators' };
const SYMBOL = /^[A-Za-z]{1,2}$/;
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
      answers[id] = { ...blank(), ...a, ...strings, revealed: a.revealed === true, negateLeft: a.negateLeft === true, negateRight: a.negateRight === true, spans: Array.isArray(a.spans) ? a.spans.filter(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && p[0] <= p[1]).slice(0, 2) : [], groups: a.groups && typeof a.groups === 'object' ? Object.fromEntries(Object.entries(a.groups).filter(([, value]) => value === '1' || value === '2')) : {}, stage: Number.isInteger(a.stage) ? a.stage! : 0, passed: Array.isArray(a.passed) ? a.passed.filter(s => typeof s === 'string' && s in names) : [], review: ['matched', 'revisit'].includes(a.review ?? '') ? a.review! : null };
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
        // The old set only had the indicator step. Keep that work; the conditions step is new, so the rule is not yet reviewed.
        const passed = attempt.passed.filter(s => s === 'indicators');
        restored.answers[id] = { ...attempt, passed, stage: passed.length ? 1 : 0, review: null, revealed: false };
      }
    }
    for (const item of set.items) {
      const a = restored.answers[item.id];
      if (a && (a.fingerprint !== fingerprint(item) || !a.passed.length)) {
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
  // Hints come first. After a second miss on the same step the student may ask to see the answer, then enters it themselves.
  const [misses, setMisses] = useState(0);
  const [shown, setShown] = useState(false);
  // First click of a highlight, waiting for its last word.
  const [pending, setPending] = useState<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const current = Math.max(0, Math.min(saved.current, set.items.length - 1));
  const item = set.items[current];
  const answer = saved.answers[item.id] ?? blank();
  const stageIndex = Math.max(0, Math.min(answer.stage, stages.length - 1));
  useEffect(() => { setMisses(0); setShown(false); setPending(null); }, [current, stageIndex]);
  const stage = stages[stageIndex];
  const reviewed = set.items.filter(i => saved.answers[i.id]?.review).length;
  const revisit = set.items.filter(i => saved.answers[i.id]?.review === 'revisit').length;
  const percent = Math.round(reviewed / set.items.length * 100);
  const tokens = item.statement.split(/\s+/);
  const phrases = answer.words.reduce<number[][]>((runs, word) => { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === word - 1) last.push(word); else runs.push([word]); return runs; }, []);
  const indicatorCheck = checkIndicatorSelection(item, phrases.map(p => ({ text: p.map(i => tokens[i]).join(' '), group: answer.groups[p.join('-')] ?? '' })));
  const indicatorsCorrect = indicatorCheck.correct;
  const production = set.taskKind === 'forward' || set.taskKind === 'contrapositive';
  // Production sets build the diagram from the learner's own highlighted conditions and symbols.
  const spanCheck = checkConditionSpans(item.statement, answer.spans);
  const sufficientKey = spanCheck.roles[0] === 'sufficient' ? '1' : '2';
  const necessaryKey = sufficientKey === '1' ? '2' : '1';
  const symbolFor = (key: string) => key === '1' ? answer.symbolOne.trim() : key === '2' ? answer.symbolTwo.trim() : '';
  const originalText = production && answer.left && answer.right ? `${symbolFor(answer.left)} → ${symbolFor(answer.right)}` : '';
  const contraText = production && answer.contraLeft && answer.contraRight ? `${answer.negateLeft ? 'NOT ' : ''}${symbolFor(answer.contraLeft)} → ${answer.negateRight ? 'NOT ' : ''}${symbolFor(answer.contraRight)}` : '';
  const placementCorrect = production ? answer.left === sufficientKey && answer.right === necessaryKey : answer.left === 'sufficient' && answer.right === 'necessary';
  const contraOrderCorrect = production ? answer.contraLeft === necessaryKey && answer.contraRight === sufficientKey : answer.contraLeft === 'necessary' && answer.contraRight === 'sufficient';
  const contraCorrect = contraOrderCorrect && answer.negateLeft && answer.negateRight;
  const contraHint = !contraOrderCorrect ? 'Start with the right side of your original diagram. It becomes the new left side.' : 'The order is right. Now negate each whole side once.';
  const symbolsValid = SYMBOL.test(answer.symbolOne.trim()) && SYMBOL.test(answer.symbolTwo.trim()) && answer.symbolOne.trim().toLowerCase() !== answer.symbolTwo.trim().toLowerCase();
  // The written readbacks are the only steps that wait for the end. Everything with one right answer is checked as it is built.
  const deferredComparison = stage === 'symbols' || set.taskKind === 'contrapositive' && ['readback', 'contra-readback'].includes(stage) || set.taskKind === 'rephrase' && stage === 'readback';
  const objective = ['indicators', 'conditions', 'diagram', 'contra'].includes(stage);
  const correct = stage === 'indicators' ? indicatorsCorrect : stage === 'conditions' ? spanCheck.correct : stage === 'diagram' ? placementCorrect : stage === 'contra' ? contraCorrect : true;
  const holdExplanation = set.taskKind === 'contrapositive' && ['diagram', 'contra'].includes(stage);
  const deferredNote = stage === 'symbols' ? '' : set.taskKind === 'contrapositive' ? 'You compare your wording with ours at the end.' : 'Our version stays hidden until you have completed the whole translation.';
  const ready = stage === 'indicators' ? phrases.length > 0 && phrases.every(p => !!answer.groups[p.join('-')]) : stage === 'conditions' ? answer.spans.length === 2 : stage === 'symbols' ? symbolsValid : stage === 'diagram' ? !!answer.left && !!answer.right : stage === 'contra' ? !!answer.contraLeft && !!answer.contraRight : stage === 'readback' ? !!answer.writing.trim() : stage === 'contra-readback' ? !!answer.contraWriting.trim() : true;
  const choices = current % 2 ? ['necessary', 'sufficient'] : ['sufficient', 'necessary'];
  const neutralConditions = current % 2 === 0 ? [item.necessary, item.sufficient] : [item.sufficient, item.necessary];
  const condition = (value: string) => value === 'sufficient' ? item.sufficient : item.necessary;

  const finishedItems = set.items.filter(entry => { const a = saved.answers[entry.id]; return !!a && stages.every(name => name === 'review' || a.passed.includes(name)); }).length;
  useEffect(() => {
    if (started) record?.({ state: saved, done: finishedItems, total: set.items.length, ...(finishedItems === set.items.length ? { status: 'done' as const } : {}) });
    try { localStorage.setItem(storageKey, JSON.stringify(saved)); setStorageFailed(false); } catch { setStorageFailed(!record); }
  }, [saved, storageKey, record, started, finishedItems, set.items.length]);
  useEffect(() => { if (started) heading.current?.focus({ preventScroll: true }); }, [current, stageIndex, started, results]);
  useEffect(() => { if (checked) feedback.current?.focus({ preventScroll: true }); }, [checked]);
  function update(patch: Partial<Attempt>) { setSaved(s => ({ ...s, answers: { ...s.answers, [item.id]: { ...(s.answers[item.id] ?? blank()), ...patch, fingerprint: fingerprint(item) } } })); }
  function edit(patch: Partial<Attempt>) { setChecked(false); update({ ...patch, revealed: false, review: null, passed: answer.passed.filter(s => stages.indexOf(s) < stageIndex) }); }
  function go(index: number) { setSaved(s => ({ ...s, current: index })); setChecked(false); setResults(false); setStarted(true); }
  function advance() { update({ stage: stageIndex + 1, passed: [...new Set([...answer.passed, stage])], revealed: false }); setChecked(false); }
  function setSpans(spans: number[][]) {
    const text = (i: number) => spans[i] ? spanText(item.statement, spans[i]) : '';
    // New highlights change what each letter means, so anything built on the old ones starts over.
    edit({ spans, conditionOne: text(0), conditionTwo: text(1), left: '', right: '', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false });
  }
  function pickWord(index: number) {
    const inside = answer.spans.findIndex(([from, to]) => index >= from && index <= to);
    if (pending === null) {
      if (inside >= 0) setSpans(answer.spans.filter((_, i) => i !== inside));
      else if (answer.spans.length < 2) setPending(index);
      return;
    }
    const from = Math.min(pending, index);
    const to = Math.max(pending, index);
    setPending(null);
    if (answer.spans.some(([a, b]) => from <= b && to >= a)) return;
    setSpans([...answer.spans, [from, to]].sort((x, y) => x[0] - y[0]));
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
    <header className="sw-header"><div><p className="sw-eyebrow">{set.shortTitle}</p><p>{reviewed ? `${reviewed} of ${set.items.length} reviewed` : 'Ready to begin'}</p></div>{reviewed > 0 && !results && <button className="sw-text-button" onClick={() => setResults(true)}>Review my work</button>}<strong className="sw-percent">{percent}<small>%</small></strong></header>
    <div role="progressbar" aria-label="Questions reviewed" aria-valuemin={0} aria-valuemax={set.items.length} aria-valuenow={reviewed} className="sw-progress"><span style={{ width: `${percent}%` }}/></div>
    {storageFailed && <p role="status" className="sw-storage-error">Your browser could not save this work. Keep this page open to retain your work.</p>}
    {results ? <div className="sw-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>{reviewed === set.items.length ? 'Every question reviewed.' : 'Your work so far.'}</h2><p>{revisit ? `${revisit} marked for another look.` : 'Written explanations are self-reviewed. Your marks are not an automatically graded score.'}</p><div className="sw-review-grid">{set.items.map((q, index) => <button key={q.id} onClick={() => go(index)}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{saved.answers[q.id]?.review === 'matched' ? 'Reasoning matched' : saved.answers[q.id]?.review === 'revisit' ? 'Another look' : 'Not reviewed'}</span><ArrowRight size={16}/></button>)}</div></div> : <>
      <div className="sw-question" key={item.id}><aside className="sw-rule"><div className="sw-rule-sticky"><p className="sw-eyebrow">Question {current + 1} of {set.items.length}</p><blockquote>{item.statement}</blockquote><ol className="sw-stage-rail" aria-label="Steps for this rule">{stages.map((s, i) => <li key={s} aria-current={i === stageIndex ? 'step' : undefined}><span>{answer.passed.includes(s) ? <Check size={14}/> : String(i + 1).padStart(2, '0')}</span><button disabled={i > stageIndex && !answer.passed.includes(stages[i - 1])} onClick={() => { update({ stage: i }); setChecked(false); }}>{stageName(s)}</button></li>)}</ol></div></aside>
      <div className="sw-work"><p className="sw-eyebrow">Step {stageIndex + 1} of {stages.length}</p><h2 ref={heading} tabIndex={-1}>{stageName(stage)}</h2>
      <div className="sw-active-task" key={stage}>
      {stage === 'indicators' && <><fieldset className="sw-tokens"><legend>Click the indicator in the rule.</legend>{tokens.map((word, index) => <button type="button" key={index} aria-pressed={answer.words.includes(index)} onClick={() => edit({ words: answer.words.includes(index) ? answer.words.filter(n => n !== index) : [...answer.words, index].sort((a, b) => a - b) })}>{word}</button>)}</fieldset>{phrases.length > 0 && <div className="sw-indicator-groups">{phrases.map(phrase => { const key = phrase.join('-'); const text = phrase.map(index => tokens[index]).join(' '); return <label className="sw-slot" key={key}><span>Which group: “{text}”?</span><select value={answer.groups[key] ?? ''} onChange={e => edit({ groups: { ...answer.groups, [key]: e.target.value } })}><option value="">Choose the group</option><option value="1">Group 1: sufficient-condition indicator</option><option value="2">Group 2: necessary-condition indicator</option></select></label>; })}</div>}</>}
      {stage === 'conditions' && <><fieldset className="sw-tokens sw-spans"><legend>Click the first and last word of each condition.</legend>{tokens.map((word, index) => { const mark = answer.spans.findIndex(([from, to]) => index >= from && index <= to); return <button type="button" key={index} aria-pressed={mark >= 0 || pending === index} data-span={mark >= 0 ? mark + 1 : pending === index ? 'start' : undefined} onClick={() => pickWord(index)}>{word}</button>; })}</fieldset><div className="sw-span-status" role="status">{pending !== null ? <p>Now click the last word of this condition.</p> : answer.spans.length === 0 ? <p>Nothing highlighted yet.</p> : answer.spans.map((span, i) => <p key={span.join('-')}><strong>Condition {i + 1}:</strong> {spanText(item.statement, span)}</p>)}{pending === null && answer.spans.length > 0 && <p className="sw-notation-help">Click a highlighted word to remove that highlight.</p>}</div></>}
      {stage === 'symbols' && <><div className="sw-symbol-grid"><label className="sw-writing"><strong>{answer.conditionOne}</strong><span>First condition’s symbol</span><input aria-label="First condition’s symbol" value={answer.symbolOne} maxLength={2} onChange={e => edit({ symbolOne: e.target.value })}/></label><label className="sw-writing"><strong>{answer.conditionTwo}</strong><span>Second condition’s symbol</span><input aria-label="Second condition’s symbol" value={answer.symbolTwo} maxLength={2} onChange={e => edit({ symbolTwo: e.target.value })}/></label></div>{(answer.symbolOne.trim() || answer.symbolTwo.trim()) && !symbolsValid && <p role="status">Use one or two letters for each condition, and a different one for each.</p>}</>}
      {production && ['diagram', 'contra', 'readback', 'contra-readback'].includes(stage) && <div className="sw-learner-legend"><span>Your letters</span><p><strong>{answer.symbolOne}</strong> = {answer.conditionOne}</p><p><strong>{answer.symbolTwo}</strong> = {answer.conditionTwo}</p></div>}
      {stage === 'diagram' && production && <><div className="sw-arrow-row">{symbolSlot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{symbolSlot('Right: necessary condition', 'right')}</div></>}
      {stage === 'diagram' && !production && <><div className="sw-arrow-row">{slot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{slot('Right: necessary condition', 'right')}</div></>}
      {stage === 'contra' && <><div className="sw-prior-rule"><span>Your original diagram</span><p>{originalText}</p></div><div className="sw-arrow-row"><div className="sw-slot-wrap">{symbolSlot('Left side', 'contraLeft')}<label className="sw-negation"><input type="checkbox" checked={answer.negateLeft} onChange={e => edit({ negateLeft: e.target.checked })}/>NOT on the left side</label></div><span className="sw-arrow" aria-label="requires">→</span><div className="sw-slot-wrap">{symbolSlot('Right side', 'contraRight')}<label className="sw-negation"><input type="checkbox" checked={answer.negateRight} onChange={e => edit({ negateRight: e.target.checked })}/>NOT on the right side</label></div></div></>}
      {(stage === 'readback' || stage === 'contra-readback') && <>{production ? <div className="sw-prior-rule"><span>{stage === 'readback' ? 'Your original diagram' : 'Your contrapositive diagram'}</span><p>{stage === 'readback' ? originalText : contraText}</p></div> : null}<label className="sw-writing">{stage === 'readback' ? 'Write this rule as an if/then sentence.' : 'Write the contrapositive in ordinary language.'}<textarea rows={4} value={stage === 'readback' ? answer.writing : answer.contraWriting} onChange={e => edit(stage === 'readback' ? { writing: e.target.value } : { contraWriting: e.target.value })} placeholder="If …, then …"/></label></>}
      {stage !== 'review' && deferredComparison && <>{deferredNote && <p className="sw-notation-help">{deferredNote}</p>}<button className="sw-primary" disabled={!ready} onClick={advance}>Save and continue<ArrowRight size={17}/></button></>}
      {stage !== 'review' && !deferredComparison && <>{!checked ? <button className="sw-primary" disabled={!ready} onClick={() => { setChecked(true); if (objective && !correct) setMisses(count => count + 1); }}>{objective ? 'Check this step' : 'Compare this step'}<ArrowRight size={17}/></button> : <section className={`sw-feedback ${objective && !correct ? 'sw-feedback-revise' : ''}`}><h3 ref={feedback} tabIndex={-1}>{objective ? correct ? 'That step works.' : 'Make one adjustment.' : 'Compare the complete meaning.'}</h3>{stage === 'indicators' && (indicatorsCorrect ? <><p>You found the indicators and their groups.</p><p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p></> : <p>{indicatorCheck.hint}</p>)}{stage === 'conditions' && (spanCheck.correct ? <><p>Both conditions are marked, restrictions included. Here they are in full.</p><ul className="sw-condition-model">{neutralConditions.map(text => <li key={text}>{text}</li>)}</ul></> : <p>{spanCheck.hint}</p>)}{stage === 'diagram' && <><p>{placementCorrect ? 'The sufficient condition points to what it requires.' : answer.left === answer.right ? 'You used the same condition twice. Each side needs a different complete condition.' : 'Which condition is enough to prove the other? That one goes on the left.'}</p>{placementCorrect && <p className="sw-answer-diagram">{item.diagram}</p>}</>}{stage === 'contra' && <>{objective && !correct ? <p>{contraHint}</p> : <><p>{objective ? 'Both sides switched, and both were negated. Compare with our version.' : 'Compare your contrapositive with ours. Different labels are fine; both sides must switch and both must be negated.'}</p><p className="sw-answer-diagram">{item.contrapositive}</p>{!production && <p>{item.contrapositiveWords}</p>}</>}</>}{stage === 'readback' && <p className="sw-model-writing">{item.ifThen}</p>}{stage === 'contra-readback' && <p className="sw-model-writing">{item.contrapositiveWords}</p>}{objective && !correct && misses >= 2 && ready && (shown ? <p className="sw-answer-diagram sw-shown">{stage === 'indicators' ? item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ') : stage === 'conditions' ? `${conditionAnswer(item.statement, 'sufficient')}; ${conditionAnswer(item.statement, 'necessary')}` : production ? stage === 'contra' ? `NOT ${symbolFor(sufficientKey === '1' ? '2' : '1')} → NOT ${symbolFor(sufficientKey)}` : `${symbolFor(sufficientKey)} → ${symbolFor(necessaryKey)}` : stage === 'contra' ? item.contrapositive : item.diagram}</p> : <button type="button" className="sw-text" onClick={() => setShown(true)}>Show me</button>)}{(!objective || correct) && !holdExplanation && <p>{item.explanation}</p>}{(!objective || correct) && <button className="sw-primary" onClick={advance}>{objective ? 'Continue' : 'I compared the meaning'}<ArrowRight size={17}/></button>}<button className="sw-text-button" onClick={() => setChecked(false)}>Revise this step</button></section>}</>}
      {stage === 'review' && <section className="sw-final-review"><div className="sw-finish-mark"><Check size={24}/></div><p>You worked through each operation. Read the rule once more.</p>{(production || stages.includes('indicators') || answer.writing) && <details className="sw-your-work" open><summary>Your translation</summary>{stages.includes('indicators') && <div className="sw-your-indicators"><strong>Your indicators and groups</strong><ul>{phrases.map(phrase => <li key={phrase.join('-')}>{phrase.map(i => tokens[i]).join(' ')}: Group {answer.groups[phrase.join('-')] ?? 'not selected'}</li>)}</ul></div>}{answer.conditionOne && <p>{answer.symbolOne && <><strong>{answer.symbolOne}</strong> = </>}{answer.conditionOne}</p>}{answer.conditionTwo && <p>{answer.symbolTwo && <><strong>{answer.symbolTwo}</strong> = </>}{answer.conditionTwo}</p>}{originalText && <p><strong>Original diagram: </strong>{originalText}</p>}{contraText && <p><strong>Contrapositive diagram: </strong>{contraText}</p>}{answer.writing && <p><strong>Original in words: </strong>{answer.writing}</p>}{answer.contraWriting && <p><strong>Contrapositive in words: </strong>{answer.contraWriting}</p>}</details>}<p className="sw-eyebrow">Compare with our version</p>{stages.includes('indicators') && stages.includes('diagram') && <p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p>}{stages.includes('diagram') ? <p className="sw-answer-diagram">{item.diagram}</p> : stages.includes('conditions') ? <ul className="sw-condition-model">{neutralConditions.map(text => <li key={text}>{text}</li>)}</ul> : <p>{item.indicators.map(i => `${i.text}: Group ${i.group}`).join(' · ')}</p>}{set.taskKind === 'rephrase' && <p className="sw-model-writing">{item.ifThen}</p>}{stages.includes('contra') && <><p className="sw-answer-diagram">{item.contrapositive}</p><p>{item.ifThen}</p><p>{item.contrapositiveWords}</p></>}<p>{item.explanation}</p><p className="sw-self-check">How did the reasoning compare? This records your review, not a grade for your writing.</p><div className="sw-review-actions"><button aria-pressed={answer.review === 'matched'} onClick={() => update({ review: 'matched', revealed: true })}><Check size={16}/>My reasoning matched</button><button aria-pressed={answer.review === 'revisit'} onClick={() => update({ review: 'revisit', revealed: true })}><RotateCcw size={16}/>Needs another look</button></div></section>}
      </div></div></div><nav className="sw-navigation" aria-label="Question navigation"><button disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous</button><label>Go to question<select value={current} onChange={e => go(Number(e.target.value))}>{set.items.map((q, i) => <option key={q.id} value={i}>{i + 1}{saved.answers[q.id]?.review ? ' · reviewed' : ''}</option>)}</select></label><button disabled={!answer.review} onClick={() => current === set.items.length - 1 ? setResults(true) : go(current + 1)}>{current === set.items.length - 1 ? 'Review this set' : 'Next'}<ArrowRight size={16}/></button></nav>
    </>}
  </section>;
}
