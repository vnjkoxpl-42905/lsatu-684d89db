import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { checkIndicatorSelection, getSourceWorksheetDrill, type SourceWorksheetDrillSet } from '../content/sourceWorksheetDrills';
import { useCourseStep } from '../courseProgress';
import './source-worksheet-drill.css';

type Stage = 'indicators' | 'conditions' | 'symbols' | 'diagram' | 'contra' | 'readback' | 'contra-readback' | 'review';
type Attempt = {
  groups: Record<string, string>; fingerprint: string; words: number[];
  left: string; right: string; contraLeft: string; contraRight: string;
  negateLeft: boolean; negateRight: boolean; writing: string; contraWriting: string;
  conditionOne: string; conditionTwo: string; symbolOne: string; symbolTwo: string; originalDraft: string; contraDraft: string;
  stage: number; passed: Stage[]; revealed: boolean; review: 'matched' | 'revisit' | null;
};
const blank = (): Attempt => ({ groups: {}, fingerprint: '', words: [], left: '', right: '', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false, writing: '', contraWriting: '', conditionOne: '', conditionTwo: '', symbolOne: '', symbolTwo: '', originalDraft: '', contraDraft: '', stage: 0, passed: [], revealed: false, review: null });
type Saved = { current: number; answers: Record<string, Attempt> };
const names: Record<Stage, string> = { indicators: 'Find the indicators', conditions: 'Keep the complete ideas', symbols: 'Define your symbols', diagram: 'Build the diagram', contra: 'Reverse and negate', readback: 'Read the original', 'contra-readback': 'Read the contrapositive', review: 'Bring it together' };
function stagesFor(kind: SourceWorksheetDrillSet['taskKind']): Stage[] {
  if (kind === 'indicators') return ['indicators', 'review'];
  if (kind === 'identify') return ['indicators', 'conditions', 'review'];
  if (kind === 'rephrase') return ['readback', 'indicators', 'diagram', 'review'];
  if (kind === 'contrapositive') return ['indicators', 'conditions', 'symbols', 'diagram', 'contra', 'readback', 'contra-readback', 'review'];
  return kind === 'forward' ? ['conditions', 'symbols', 'diagram', 'review'] : ['conditions', 'diagram', 'review'];
}
// Drill sets folded into another set. Their saved answers carry over by item id; the old record stays untouched.
const FOLDED_SETS: Record<string, string> = { 'source-intro-identify': 'source-indicators' };
type Side = { core: string; negated: boolean };
// Reads a learner's own "A → B" diagram so the contrapositive can be checked against it, whatever symbols they chose.
function diagramSides(text: string): [Side, Side] | null {
  const parts = text.split(/→|->|=>/);
  if (parts.length !== 2) return null;
  const side = (raw: string): Side | null => {
    let core = raw.toLowerCase().replace(/[()\s]/g, '');
    let negated = false;
    for (let match = core.match(/^(not|~|¬)/); match; match = core.match(/^(not|~|¬)/)) { core = core.slice(match[0].length); negated = !negated; }
    return core ? { core, negated } : null;
  };
  const left = side(parts[0]);
  const right = side(parts[1]);
  return left && right ? [left, right] : null;
}
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
      const strings = Object.fromEntries(['fingerprint', 'conditionOne', 'conditionTwo', 'symbolOne', 'symbolTwo', 'originalDraft', 'contraDraft', 'contraWriting'].map(key => [key, typeof a[key] === 'string' ? a[key] : '']));
      answers[id] = { ...blank(), ...a, ...strings, revealed: a.revealed === true, negateLeft: a.negateLeft === true, negateRight: a.negateRight === true, groups: a.groups && typeof a.groups === 'object' ? Object.fromEntries(Object.entries(a.groups).filter(([, value]) => value === '1' || value === '2')) : {}, stage: Number.isInteger(a.stage) ? a.stage! : 0, passed: Array.isArray(a.passed) ? a.passed.filter(s => typeof s === 'string' && s in names) : [], review: ['matched', 'revisit'].includes(a.review ?? '') ? a.review! : null };
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
        // The old set only had the indicator step. Keep that work; the conditions step is new, so the sentence is not yet reviewed.
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
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const current = Math.max(0, Math.min(saved.current, set.items.length - 1));
  const item = set.items[current];
  const answer = saved.answers[item.id] ?? blank();
  const stageIndex = Math.max(0, Math.min(answer.stage, stages.length - 1));
  useEffect(() => { setMisses(0); setShown(false); }, [current, stageIndex]);
  const stage = stages[stageIndex];
  const reviewed = set.items.filter(i => saved.answers[i.id]?.review).length;
  const revisit = set.items.filter(i => saved.answers[i.id]?.review === 'revisit').length;
  const percent = Math.round(reviewed / set.items.length * 100);
  const tokens = item.statement.split(/\s+/);
  const phrases = answer.words.reduce<number[][]>((runs, word) => { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === word - 1) last.push(word); else runs.push([word]); return runs; }, []);
  const indicatorCheck = checkIndicatorSelection(item, phrases.map(p => ({ text: p.map(i => tokens[i]).join(' '), group: answer.groups[p.join('-')] ?? '' })));
  const indicatorsCorrect = indicatorCheck.correct;
  const placementCorrect = answer.left === 'sufficient' && answer.right === 'necessary';
  const production = set.taskKind === 'forward' || set.taskKind === 'contrapositive';
  // In production sets the contrapositive is checked against the learner's own diagram, so any symbols work.
  const ownOriginal = diagramSides(answer.originalDraft);
  const ownContra = diagramSides(answer.contraDraft);
  const contraOrderCorrect = !!ownOriginal && !!ownContra && ownContra[0].core === ownOriginal[1].core && ownContra[1].core === ownOriginal[0].core;
  const contraCorrect = production
    ? contraOrderCorrect && ownContra![0].negated !== ownOriginal![1].negated && ownContra![1].negated !== ownOriginal![0].negated
    : answer.contraLeft === 'necessary' && answer.contraRight === 'sufficient' && answer.negateLeft && answer.negateRight;
  const contraHint = production
    ? !ownContra ? 'Write one arrow with a condition on each side, such as NOT B → NOT A.' : !contraOrderCorrect ? 'Start with the right side of your original diagram. It becomes the new left side.' : 'The order is right. Now negate each whole side once.'
    : answer.contraLeft !== 'necessary' || answer.contraRight !== 'sufficient' ? 'Start with the original right-hand condition. It becomes the new left. Then negate both.' : 'The order is right. Now negate both whole conditions, not just one.';
  // Contrapositive sets compare the diagram and the contrapositive as soon as each is built; only the written readbacks wait for the end.
  const deferredComparison = set.taskKind === 'contrapositive' && ['conditions', 'symbols', 'readback', 'contra-readback'].includes(stage) || set.taskKind === 'rephrase' && stage === 'readback';
  const objective = stage === 'indicators' || !production && ['diagram', 'contra'].includes(stage) || production && stage === 'contra' && !!ownOriginal;
  const correct = stage === 'indicators' ? indicatorsCorrect : stage === 'diagram' ? production || placementCorrect : stage === 'contra' ? contraCorrect : true;
  const holdExplanation = set.taskKind === 'contrapositive' && ['diagram', 'contra'].includes(stage);
  const deferredNote = set.taskKind === 'contrapositive' ? ['conditions', 'symbols'].includes(stage) ? 'You compare with our version once you build the diagram.' : 'You compare your wording with ours at the end.' : 'Our version stays hidden until you have completed the whole translation.';
  const ready = stage === 'indicators' ? phrases.length > 0 && phrases.every(p => !!answer.groups[p.join('-')]) : stage === 'conditions' ? !!answer.conditionOne.trim() && !!answer.conditionTwo.trim() : stage === 'symbols' ? !!answer.symbolOne.trim() && !!answer.symbolTwo.trim() && answer.symbolOne.trim().toLowerCase() !== answer.symbolTwo.trim().toLowerCase() : stage === 'diagram' ? production ? !!answer.originalDraft.trim() : !!answer.left && !!answer.right : stage === 'contra' ? production ? !!answer.contraDraft.trim() : !!answer.contraLeft && !!answer.contraRight : stage === 'readback' ? !!answer.writing.trim() : stage === 'contra-readback' ? !!answer.contraWriting.trim() : true;
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
  function slot(label: string, field: 'left' | 'right' | 'contraLeft' | 'contraRight') {
    return <fieldset className="sw-choice-slot"><legend>{label}</legend>{choices.map(value => <button type="button" key={value} aria-pressed={answer[field] === value} onClick={() => edit({ [field]: value })}>{answer[field] === value && <Check size={17}/>}<span>{(field === 'contraLeft' && answer.negateLeft || field === 'contraRight' && answer.negateRight) ? `NOT (${condition(value)})` : condition(value)}</span></button>)}</fieldset>;
  }
  const phaseSummary = stages.filter(s => s !== 'review');
  if (!started) return <section className="sw-entry"><div className="sw-entry-art" aria-hidden="true"><span>Enough</span><i>→</i><span>Required</span></div><div data-course-heading><p className="sw-eyebrow">{set.items.length} sentences · One step at a time</p><h1>{title ?? set.title}</h1>{title && <h2>{set.title}</h2>}<p className="sw-entry-copy">{set.instructions}</p><ol>{phaseSummary.map(s => <li key={s}>{stageName(s)}.</li>)}</ol>{startUrl ? <Link className="sw-primary" to={startUrl}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></Link> : <button className="sw-primary" onClick={() => setStarted(true)}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></button>}</div></section>;

  return <section className="sw-experience" aria-label={set.title}>
    <header className="sw-header"><div><p className="sw-eyebrow">{set.shortTitle}</p><p>{reviewed ? `${reviewed} of ${set.items.length} reviewed` : 'Ready to begin'}</p></div>{reviewed > 0 && !results && <button className="sw-text-button" onClick={() => setResults(true)}>Review my work</button>}<strong className="sw-percent">{percent}<small>%</small></strong></header>
    <div role="progressbar" aria-label="Sentences reviewed" aria-valuemin={0} aria-valuemax={set.items.length} aria-valuenow={reviewed} className="sw-progress"><span style={{ width: `${percent}%` }}/></div>
    {storageFailed && <p role="status" className="sw-storage-error">Your browser could not save this work. Keep this page open to retain your work.</p>}
    {results ? <div className="sw-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>{reviewed === set.items.length ? 'Every sentence reviewed.' : 'Your work so far.'}</h2><p>{revisit ? `${revisit} marked for another look.` : 'Written explanations are self-reviewed. Your marks are not an automatically graded score.'}</p><div className="sw-review-grid">{set.items.map((q, index) => <button key={q.id} onClick={() => go(index)}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{saved.answers[q.id]?.review === 'matched' ? 'Reasoning matched' : saved.answers[q.id]?.review === 'revisit' ? 'Another look' : 'Not reviewed'}</span><ArrowRight size={16}/></button>)}</div></div> : <>
      <div className="sw-question" key={item.id}><aside className="sw-rule"><div className="sw-rule-sticky"><p className="sw-eyebrow">Sentence {current + 1} of {set.items.length}</p><blockquote>{item.statement}</blockquote><p className="sw-rule-caption">Keep this rule in view. Each step works with the same rule.</p><ol className="sw-stage-rail" aria-label="Steps for this sentence">{stages.map((s, i) => <li key={s} aria-current={i === stageIndex ? 'step' : undefined}><span>{answer.passed.includes(s) ? <Check size={14}/> : String(i + 1).padStart(2, '0')}</span><button disabled={i > stageIndex && !answer.passed.includes(stages[i - 1])} onClick={() => { update({ stage: i }); setChecked(false); }}>{stageName(s)}</button></li>)}</ol></div></aside>
      <div className="sw-work"><p className="sw-eyebrow">Step {stageIndex + 1} of {stages.length}</p><h2 ref={heading} tabIndex={-1}>{stageName(stage)}</h2>
      <div className="sw-active-task" key={stage}>
      {stage === 'indicators' && <><p>Select the conditional indicator. If it is a phrase, such as “only if,” select each word in it.</p><fieldset className="sw-tokens"><legend>Click the indicator in the sentence.</legend>{tokens.map((word, index) => <button type="button" key={index} aria-pressed={answer.words.includes(index)} onClick={() => edit({ words: answer.words.includes(index) ? answer.words.filter(n => n !== index) : [...answer.words, index].sort((a, b) => a - b) })}>{word}</button>)}</fieldset>{phrases.length > 0 && <div className="sw-indicator-groups">{phrases.map(phrase => { const key = phrase.join('-'); const text = phrase.map(index => tokens[index]).join(' '); return <label className="sw-slot" key={key}><span>Which group: “{text}”?</span><select value={answer.groups[key] ?? ''} onChange={e => edit({ groups: { ...answer.groups, [key]: e.target.value } })}><option value="">Choose the group</option><option value="1">Group 1: sufficient-condition indicator</option><option value="2">Group 2: necessary-condition indicator</option></select></label>; })}</div>}</>}
      {stage === 'conditions' && <><p>Write the two complete ideas. Keep restrictions such as “within 30 days” or “can enter.” Leave the indicator out.</p><label className="sw-writing">First complete condition<textarea rows={2} value={answer.conditionOne} onChange={e => edit({ conditionOne: e.target.value })}/></label><label className="sw-writing">Second complete condition<textarea rows={2} value={answer.conditionTwo} onChange={e => edit({ conditionTwo: e.target.value })}/></label></>}
      {stage === 'symbols' && <><p>Give each complete condition its own short label. The symbol stands for the whole idea, including every restriction.</p><div className="sw-symbol-grid"><label className="sw-writing"><strong>{answer.conditionOne}</strong><span>First condition’s symbol</span><input aria-label="First condition’s symbol" value={answer.symbolOne} maxLength={12} onChange={e => edit({ symbolOne: e.target.value })}/></label><label className="sw-writing"><strong>{answer.conditionTwo}</strong><span>Second condition’s symbol</span><input aria-label="Second condition’s symbol" value={answer.symbolTwo} maxLength={12} onChange={e => edit({ symbolTwo: e.target.value })}/></label></div>{answer.symbolOne && answer.symbolOne.trim().toLowerCase() === answer.symbolTwo.trim().toLowerCase() && <p role="status">Use different symbols so each condition has one clear meaning.</p>}</>}
      {production && ['diagram', 'contra', 'readback', 'contra-readback'].includes(stage) && <div className="sw-learner-legend"><span>Your symbol legend</span><p><strong>{answer.symbolOne}</strong> = {answer.conditionOne}</p><p><strong>{answer.symbolTwo}</strong> = {answer.conditionTwo}</p></div>}
      {stage === 'diagram' && production && <><p>Use your symbols to build the original arrow. Put the sufficient condition on the left and the necessary condition on the right.</p><label className="sw-writing">Your original diagram<textarea rows={3} value={answer.originalDraft} onChange={e => edit({ originalDraft: e.target.value })} placeholder="Your symbol → your symbol"/></label><p className="sw-notation-help">You can type → or -&gt;. Your labels are your choice; their meanings must stay consistent.</p></>}
      {stage === 'diagram' && !production && <><p>Which condition is enough? Put it on the left. Put what it requires on the right.</p><div className="sw-arrow-row">{slot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{slot('Right: necessary condition', 'right')}</div></>}
      {stage === 'contra' && production && <><div className="sw-prior-rule"><span>Your original diagram</span><p>{answer.originalDraft}</p></div><p>Reverse your two conditions, then negate each whole condition. Use NOT or ~ before a symbol. Keep your symbol meanings unchanged.</p><label className="sw-writing">Your contrapositive diagram<textarea rows={3} value={answer.contraDraft} onChange={e => edit({ contraDraft: e.target.value })}/></label></>}
      {(stage === 'readback' || stage === 'contra-readback') && <>{production ? <div className="sw-prior-rule"><span>{stage === 'readback' ? 'Your original diagram' : 'Your contrapositive diagram'}</span><p>{stage === 'readback' ? answer.originalDraft : answer.contraDraft}</p></div> : <p>Start with the sentence. Write its meaning in ordinary if/then language before you compare it with our version.</p>}<label className="sw-writing">{stage === 'readback' ? 'Write this rule as an if/then sentence.' : 'Write the contrapositive in ordinary language.'}<textarea rows={4} value={stage === 'readback' ? answer.writing : answer.contraWriting} onChange={e => edit(stage === 'readback' ? { writing: e.target.value } : { contraWriting: e.target.value })} placeholder="If …, then …"/></label></>}
      {stage !== 'review' && deferredComparison && <><p className="sw-notation-help">{deferredNote}</p><button className="sw-primary" disabled={!ready} onClick={advance}>Save and continue<ArrowRight size={17}/></button></>}
      {stage !== 'review' && !deferredComparison && <>{!checked ? <button className="sw-primary" disabled={!ready} onClick={() => { setChecked(true); if (objective && !correct) setMisses(count => count + 1); }}>{objective ? 'Check this step' : 'Compare this step'}<ArrowRight size={17}/></button> : <section className={`sw-feedback ${objective && !correct ? 'sw-feedback-revise' : ''}`}><h3 ref={feedback} tabIndex={-1}>{objective ? correct ? 'That step works.' : 'Make one adjustment.' : 'Compare the complete meaning.'}</h3>{stage === 'indicators' && (indicatorsCorrect ? <><p>You found the indicators and their groups.</p><p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p></> : <p>{indicatorCheck.hint}</p>)}{stage === 'conditions' && <><p>Either order is fine here. Your wording can differ, but both complete ideas need to remain.</p><ul className="sw-condition-model">{neutralConditions.map(text => <li key={text}>{text}</li>)}</ul></>}{stage === 'symbols' && <p>Each symbol must keep the meaning you assigned to it. Your two labels are different; compare their full definitions before continuing.</p>}{stage === 'diagram' && <><p>{production ? 'Compare your symbols with these complete conditions. Different labels are fine; the direction must stay the same.' : placementCorrect ? 'The sufficient condition points to what it requires.' : answer.left === answer.right ? 'You used the same condition twice. Each side needs a different complete condition.' : 'Which condition is enough to prove the other? That one goes on the left.'}</p>{(production || placementCorrect) && <p className="sw-answer-diagram">{item.diagram}</p>}</>}{stage === 'contra' && <>{objective && !correct ? <p>{contraHint}</p> : <><p>{objective ? 'Both sides switched, and both were negated. Compare with our version.' : 'Compare your contrapositive with ours. Different labels are fine; both sides must switch and both must be negated.'}</p><p className="sw-answer-diagram">{item.contrapositive}</p>{!production && <p>{item.contrapositiveWords}</p>}</>}</>}{stage === 'readback' && <p className="sw-model-writing">{item.ifThen}</p>}{stage === 'contra-readback' && <p className="sw-model-writing">{item.contrapositiveWords}</p>}{objective && !correct && misses >= 2 && (shown ? <p className="sw-answer-diagram sw-shown">{stage === 'indicators' ? item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ') : stage === 'contra' ? item.contrapositive : item.diagram}</p> : <button type="button" className="sw-text" onClick={() => setShown(true)}>Show me</button>)}{(!objective || correct) && !holdExplanation && <p>{item.explanation}</p>}{(!objective || correct) && <button className="sw-primary" onClick={advance}>{objective ? 'Continue' : holdExplanation ? stage === 'diagram' ? 'My diagram matched' : 'My contrapositive matched' : 'I compared the meaning'}<ArrowRight size={17}/></button>}<button className="sw-text-button" onClick={() => setChecked(false)}>Revise this step</button></section>}</>}
      {stage === 'review' && <section className="sw-final-review"><div className="sw-finish-mark"><Check size={24}/></div><p>You worked through each operation. Read the rule once more.</p>{(production || stages.includes('indicators') || answer.writing) && <details className="sw-your-work" open><summary>Your translation</summary>{stages.includes('indicators') && <div className="sw-your-indicators"><strong>Your indicators and groups</strong><ul>{phrases.map(phrase => <li key={phrase.join('-')}>{phrase.map(i => tokens[i]).join(' ')}: Group {answer.groups[phrase.join('-')] ?? 'not selected'}</li>)}</ul></div>}{answer.conditionOne && <p>{answer.symbolOne && <><strong>{answer.symbolOne}</strong> = </>}{answer.conditionOne}</p>}{answer.conditionTwo && <p>{answer.symbolTwo && <><strong>{answer.symbolTwo}</strong> = </>}{answer.conditionTwo}</p>}{answer.originalDraft && <p><strong>Original diagram: </strong>{answer.originalDraft}</p>}{answer.contraDraft && <p><strong>Contrapositive diagram: </strong>{answer.contraDraft}</p>}{answer.writing && <p><strong>Original in words: </strong>{answer.writing}</p>}{answer.contraWriting && <p><strong>Contrapositive in words: </strong>{answer.contraWriting}</p>}</details>}<p className="sw-eyebrow">Compare with our version</p>{stages.includes('indicators') && stages.includes('diagram') && <p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p>}{stages.includes('diagram') ? <p className="sw-answer-diagram">{item.diagram}</p> : stages.includes('conditions') ? <ul className="sw-condition-model">{neutralConditions.map(text => <li key={text}>{text}</li>)}</ul> : <p>{item.indicators.map(i => `${i.text}: Group ${i.group}`).join(' · ')}</p>}{set.taskKind === 'rephrase' && <p className="sw-model-writing">{item.ifThen}</p>}{stages.includes('contra') && <><p className="sw-answer-diagram">{item.contrapositive}</p><p>{item.ifThen}</p><p>{item.contrapositiveWords}</p></>}<p>{item.explanation}</p><p className="sw-self-check">How did the reasoning compare? This records your review, not a grade for your writing.</p><div className="sw-review-actions"><button aria-pressed={answer.review === 'matched'} onClick={() => update({ review: 'matched', revealed: true })}><Check size={16}/>My reasoning matched</button><button aria-pressed={answer.review === 'revisit'} onClick={() => update({ review: 'revisit', revealed: true })}><RotateCcw size={16}/>Needs another look</button></div></section>}
      </div></div></div><nav className="sw-navigation" aria-label="Sentence navigation"><button disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous</button><label>Go to sentence<select value={current} onChange={e => go(Number(e.target.value))}>{set.items.map((q, i) => <option key={q.id} value={i}>{i + 1}{saved.answers[q.id]?.review ? ' · reviewed' : ''}</option>)}</select></label><button disabled={!answer.review} onClick={() => current === set.items.length - 1 ? setResults(true) : go(current + 1)}>{current === set.items.length - 1 ? 'Review this set' : 'Next'}<ArrowRight size={16}/></button></nav>
    </>}
  </section>;
}
