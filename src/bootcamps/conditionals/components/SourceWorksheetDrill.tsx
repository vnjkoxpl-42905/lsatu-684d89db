import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSourceWorksheetDrill, type SourceWorksheetDrillSet } from '../content/sourceWorksheetDrills';
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
const names: Record<Stage, string> = { indicators: 'Find the indicators', conditions: 'Keep the complete ideas', symbols: 'Define your symbols', diagram: 'Build the arrow', contra: 'Reverse and negate', readback: 'Read the original', 'contra-readback': 'Read the contrapositive', review: 'Bring it together' };
function stagesFor(kind: SourceWorksheetDrillSet['taskKind']): Stage[] {
  if (kind === 'indicators') return ['indicators', 'review'];
  if (kind === 'identify') return ['indicators', 'conditions', 'review'];
  if (kind === 'rephrase') return ['readback', 'indicators', 'diagram', 'review'];
  if (kind === 'contrapositive') return ['indicators', 'conditions', 'symbols', 'diagram', 'contra', 'readback', 'contra-readback', 'review'];
  return kind === 'forward' ? ['conditions', 'symbols', 'diagram', 'review'] : ['conditions', 'diagram', 'review'];
}
const normalized = (text: string) => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
function fingerprint(item: { statement: string; sufficient: string; necessary: string; indicators: unknown; contrapositiveWords: string }) {
  return JSON.stringify([item.statement, item.sufficient, item.necessary, item.indicators, item.contrapositiveWords]);
}
function readSaved(key: string): Saved {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null');
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
  // Only the local preview reads the legacy preview key. Signed-in users never import it.
  const storageKey = storageScope === 'preview' ? `conditional-worksheet-v1:${set.id}` : `conditional-worksheet-v1:${storageScope}:${set.id}`;
  const stages = stagesFor(set.taskKind);
  const stageName = (value: Stage) => set.taskKind === 'rephrase' && value === 'readback' ? 'Rewrite the rule' : names[value];
  const [saved, setSaved] = useState(() => {
    const restored = readSaved(storageKey);
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
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const current = Math.max(0, Math.min(saved.current, set.items.length - 1));
  const item = set.items[current];
  const answer = saved.answers[item.id] ?? blank();
  const stageIndex = Math.max(0, Math.min(answer.stage, stages.length - 1));
  const stage = stages[stageIndex];
  const reviewed = set.items.filter(i => saved.answers[i.id]?.review).length;
  const revisit = set.items.filter(i => saved.answers[i.id]?.review === 'revisit').length;
  const percent = Math.round(reviewed / set.items.length * 100);
  const tokens = item.statement.split(/\s+/);
  const phrases = answer.words.reduce<number[][]>((runs, word) => { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === word - 1) last.push(word); else runs.push([word]); return runs; }, []);
  const actualIndicators = phrases.map(p => `${normalized(p.map(i => tokens[i]).join(' '))}:${answer.groups[p.join('-')]}`).sort();
  const expectedIndicators = item.indicators.map(i => `${normalized(i.text)}:${i.group}`).sort();
  const indicatorsCorrect = JSON.stringify(actualIndicators) === JSON.stringify(expectedIndicators);
  const placementCorrect = answer.left === 'sufficient' && answer.right === 'necessary';
  const contraCorrect = answer.contraLeft === 'necessary' && answer.contraRight === 'sufficient' && answer.negateLeft && answer.negateRight;
  const production = set.taskKind === 'forward' || set.taskKind === 'contrapositive';
  const deferredComparison = set.taskKind === 'contrapositive' || set.taskKind === 'rephrase' && stage === 'readback';
  const objective = stage === 'indicators' || !production && ['diagram', 'contra'].includes(stage);
  const correct = stage === 'indicators' ? indicatorsCorrect : stage === 'diagram' ? placementCorrect : stage === 'contra' ? contraCorrect : true;
  const ready = stage === 'indicators' ? phrases.length > 0 && phrases.every(p => !!answer.groups[p.join('-')]) : stage === 'conditions' ? !!answer.conditionOne.trim() && !!answer.conditionTwo.trim() : stage === 'symbols' ? !!answer.symbolOne.trim() && !!answer.symbolTwo.trim() && answer.symbolOne.trim().toLowerCase() !== answer.symbolTwo.trim().toLowerCase() : stage === 'diagram' ? production ? !!answer.originalDraft.trim() : !!answer.left && !!answer.right : stage === 'contra' ? production ? !!answer.contraDraft.trim() : !!answer.contraLeft && !!answer.contraRight : stage === 'readback' ? !!answer.writing.trim() : stage === 'contra-readback' ? !!answer.contraWriting.trim() : true;
  const choices = current % 2 ? ['necessary', 'sufficient'] : ['sufficient', 'necessary'];
  const neutralConditions = current % 2 === 0 ? [item.necessary, item.sufficient] : [item.sufficient, item.necessary];
  const condition = (value: string) => value === 'sufficient' ? item.sufficient : item.necessary;

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(saved)); setStorageFailed(false); } catch { setStorageFailed(true); } }, [saved, storageKey]);
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
  if (!started) return <section className="sw-entry"><div className="sw-entry-art" aria-hidden="true"><span>Enough</span><i>→</i><span>Required</span></div><div data-course-heading><p className="sw-eyebrow">{set.items.length} statements · One step at a time</p><h1>{title ?? set.title}</h1>{title && <h2>{set.title}</h2>}<p className="sw-entry-copy">{set.instructions}</p><ol>{phaseSummary.map(s => <li key={s}>{stageName(s)}.</li>)}</ol>{startUrl ? <Link className="sw-primary" to={startUrl}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></Link> : <button className="sw-primary" onClick={() => setStarted(true)}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></button>}</div></section>;

  return <section className="sw-experience" aria-label={set.title}>
    <header className="sw-header"><div><p className="sw-eyebrow">{set.shortTitle}</p><p>{reviewed ? `${reviewed} of ${set.items.length} reviewed` : 'Your first statement awaits'}</p></div>{reviewed > 0 && !results && <button className="sw-text-button" onClick={() => setResults(true)}>Review my work</button>}<strong className="sw-percent">{percent}<small>%</small></strong></header>
    <div role="progressbar" aria-label="Statements reviewed" aria-valuemin={0} aria-valuemax={set.items.length} aria-valuenow={reviewed} className="sw-progress"><span style={{ width: `${percent}%` }}/></div>
    {storageFailed && <p role="status" className="sw-storage-error">Your browser could not save this practice. Keep this page open to retain your work.</p>}
    {results ? <div className="sw-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>{reviewed === set.items.length ? 'Every statement reviewed.' : 'Your practice so far.'}</h2><p>{revisit ? `${revisit} marked for another look.` : 'Written explanations are self-reviewed. Your marks are not an automatically graded score.'}</p><div className="sw-review-grid">{set.items.map((q, index) => <button key={q.id} onClick={() => go(index)}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{saved.answers[q.id]?.review === 'matched' ? 'Reasoning matched' : saved.answers[q.id]?.review === 'revisit' ? 'Another look' : 'Not reviewed'}</span><ArrowRight size={16}/></button>)}</div></div> : <>
      <div className="sw-question" key={item.id}><aside className="sw-rule"><div className="sw-rule-sticky"><p className="sw-eyebrow">Statement {current + 1} of {set.items.length}</p><blockquote>{item.statement}</blockquote><p className="sw-rule-caption">Keep this rule in view. Each step works with the same relationship.</p><ol className="sw-stage-rail" aria-label="Steps in this statement">{stages.map((s, i) => <li key={s} aria-current={i === stageIndex ? 'step' : undefined}><span>{answer.passed.includes(s) ? <Check size={14}/> : String(i + 1).padStart(2, '0')}</span><button disabled={i > stageIndex && !answer.passed.includes(stages[i - 1])} onClick={() => { update({ stage: i }); setChecked(false); }}>{stageName(s)}</button></li>)}</ol></div></aside>
      <div className="sw-work"><p className="sw-eyebrow">Step {stageIndex + 1} of {stages.length}</p><h2 ref={heading} tabIndex={-1}>{stageName(stage)}</h2>
      <div className="sw-active-task" key={stage}>
      {stage === 'indicators' && <><p>Select the words that signal the relationship. For a phrase such as “only if,” select both words.</p><fieldset className="sw-tokens"><legend>Which words are indicators?</legend>{tokens.map((word, index) => <button type="button" key={index} aria-pressed={answer.words.includes(index)} onClick={() => edit({ words: answer.words.includes(index) ? answer.words.filter(n => n !== index) : [...answer.words, index].sort((a, b) => a - b) })}>{word}</button>)}</fieldset>{phrases.length > 0 && <div className="sw-indicator-groups">{phrases.map(phrase => { const key = phrase.join('-'); const text = phrase.map(index => tokens[index]).join(' '); return <label className="sw-slot" key={key}><span>Which group: “{text}”?</span><select value={answer.groups[key] ?? ''} onChange={e => edit({ groups: { ...answer.groups, [key]: e.target.value } })}><option value="">Choose the group</option><option value="1">Group 1: sufficient-condition indicator</option><option value="2">Group 2: necessary-condition indicator</option></select></label>; })}</div>}</>}
      {stage === 'conditions' && <><p>Write the two complete ideas. Keep restrictions such as “within 30 days” or “can enter.” Leave the indicator out.</p><label className="sw-writing">First complete condition<textarea rows={2} value={answer.conditionOne} onChange={e => edit({ conditionOne: e.target.value })}/></label><label className="sw-writing">Second complete condition<textarea rows={2} value={answer.conditionTwo} onChange={e => edit({ conditionTwo: e.target.value })}/></label></>}
      {stage === 'symbols' && <><p>Give each complete condition its own short label. The symbol stands for the whole idea, including every restriction.</p><div className="sw-symbol-grid"><label className="sw-writing"><strong>{answer.conditionOne}</strong><span>First condition’s symbol</span><input aria-label="First condition’s symbol" value={answer.symbolOne} maxLength={12} onChange={e => edit({ symbolOne: e.target.value })}/></label><label className="sw-writing"><strong>{answer.conditionTwo}</strong><span>Second condition’s symbol</span><input aria-label="Second condition’s symbol" value={answer.symbolTwo} maxLength={12} onChange={e => edit({ symbolTwo: e.target.value })}/></label></div>{answer.symbolOne && answer.symbolOne.trim().toLowerCase() === answer.symbolTwo.trim().toLowerCase() && <p role="status">Use different symbols so each condition has one clear meaning.</p>}</>}
      {production && ['diagram', 'contra', 'readback', 'contra-readback'].includes(stage) && <div className="sw-learner-legend"><span>Your symbol legend</span><p><strong>{answer.symbolOne}</strong> = {answer.conditionOne}</p><p><strong>{answer.symbolTwo}</strong> = {answer.conditionTwo}</p></div>}
      {stage === 'diagram' && production && <><p>Use your symbols to build the original arrow. Put the sufficient condition on the left and the necessary condition on the right.</p><label className="sw-writing">Your original diagram<textarea rows={3} value={answer.originalDraft} onChange={e => edit({ originalDraft: e.target.value })} placeholder="Your symbol → your symbol"/></label><p className="sw-notation-help">You can type → or -&gt;. Your labels are your choice; their meanings must stay consistent.</p></>}
      {stage === 'diagram' && !production && <><p>Which condition is enough? Put it on the left. Put what it requires on the right.</p><div className="sw-arrow-row">{slot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{slot('Right: necessary condition', 'right')}</div></>}
      {stage === 'contra' && production && <><div className="sw-prior-rule"><span>Your original diagram</span><p>{answer.originalDraft}</p></div><p>Reverse your two conditions, then negate each whole condition. Use NOT or ~ before a symbol. Keep your symbol meanings unchanged.</p><label className="sw-writing">Your contrapositive diagram<textarea rows={3} value={answer.contraDraft} onChange={e => edit({ contraDraft: e.target.value })}/></label></>}
      {(stage === 'readback' || stage === 'contra-readback') && <>{production ? <div className="sw-prior-rule"><span>{stage === 'readback' ? 'Your original diagram' : 'Your contrapositive diagram'}</span><p>{stage === 'readback' ? answer.originalDraft : answer.contraDraft}</p></div> : <p>Start with the statement. Write its meaning in ordinary if/then language before you compare it with a model.</p>}<label className="sw-writing">{stage === 'readback' ? 'Write this rule as an if/then sentence.' : 'Write the contrapositive in ordinary language.'}<textarea rows={4} value={stage === 'readback' ? answer.writing : answer.contraWriting} onChange={e => edit(stage === 'readback' ? { writing: e.target.value } : { contraWriting: e.target.value })} placeholder="If …, then …"/></label></>}
      {stage !== 'review' && deferredComparison && <><p className="sw-notation-help">The model stays hidden until you have completed the whole translation.</p><button className="sw-primary" disabled={!ready} onClick={advance}>Save and continue<ArrowRight size={17}/></button></>}
      {stage !== 'review' && !deferredComparison && <>{!checked ? <button className="sw-primary" disabled={!ready} onClick={() => setChecked(true)}>{objective ? 'Check this step' : 'Compare this step'}<ArrowRight size={17}/></button> : <section className={`sw-feedback ${objective && !correct ? 'sw-feedback-revise' : ''}`}><h3 ref={feedback} tabIndex={-1}>{objective ? correct ? 'That step works.' : 'Make one adjustment.' : 'Compare the complete meaning.'}</h3>{stage === 'indicators' && <><p>{indicatorsCorrect ? 'You identified the expressions and their groups.' : 'Keep multiword expressions together and check every selected group.'}</p><p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p></>}{stage === 'conditions' && <><p>Either order is fine here. Your wording can differ, but both complete ideas need to remain.</p><ul className="sw-condition-model">{neutralConditions.map(text => <li key={text}>{text}</li>)}</ul></>}{stage === 'symbols' && <p>Each symbol must keep the meaning you assigned to it. Your two labels are different; compare their full definitions before continuing.</p>}{stage === 'diagram' && <><p>{production ? 'Compare your symbols with these complete conditions. Different labels are fine; the direction must stay the same.' : placementCorrect ? 'The sufficient condition points to what it requires.' : answer.left === answer.right ? 'You used the same condition twice. Each side needs a different complete condition.' : 'Follow the requirement: the sufficient condition belongs on the left, and the necessary condition belongs on the right.'}</p><p className="sw-answer-diagram">{item.diagram}</p></>}{stage === 'contra' && <><p>{contraCorrect ? 'Both conditions changed sides, and both were negated.' : answer.contraLeft !== 'necessary' || answer.contraRight !== 'sufficient' ? 'Start with the original right-hand condition. It becomes the new left. Then negate both.' : 'The order is right. Now negate both whole conditions, not just one.'}</p><p className="sw-answer-diagram">{item.contrapositive}</p><p>{item.contrapositiveWords}</p></>}{stage === 'readback' && <p className="sw-model-writing">{item.ifThen}</p>}{stage === 'contra-readback' && <p className="sw-model-writing">{item.contrapositiveWords}</p>}<p>{item.explanation}</p>{(!objective || correct) && <button className="sw-primary" onClick={advance}>{objective ? 'Continue' : 'I compared the meaning'}<ArrowRight size={17}/></button>}<button className="sw-text-button" onClick={() => setChecked(false)}>Revise this step</button></section>}</>}
      {stage === 'review' && <section className="sw-final-review"><div className="sw-finish-mark"><Check size={24}/></div><p>You worked through each operation. Read the relationship once more.</p>{(production || stages.includes('indicators') || answer.writing) && <details className="sw-your-work" open><summary>Your translation</summary>{stages.includes('indicators') && <div className="sw-your-indicators"><strong>Your indicators and groups</strong><ul>{phrases.map(phrase => <li key={phrase.join('-')}>{phrase.map(i => tokens[i]).join(' ')}: Group {answer.groups[phrase.join('-')] ?? 'not selected'}</li>)}</ul></div>}{answer.conditionOne && <p>{answer.symbolOne && <><strong>{answer.symbolOne}</strong> = </>}{answer.conditionOne}</p>}{answer.conditionTwo && <p>{answer.symbolTwo && <><strong>{answer.symbolTwo}</strong> = </>}{answer.conditionTwo}</p>}{answer.originalDraft && <p><strong>Original diagram: </strong>{answer.originalDraft}</p>}{answer.contraDraft && <p><strong>Contrapositive diagram: </strong>{answer.contraDraft}</p>}{answer.writing && <p><strong>Original in words: </strong>{answer.writing}</p>}{answer.contraWriting && <p><strong>Contrapositive in words: </strong>{answer.contraWriting}</p>}</details>}<p className="sw-eyebrow">Compare with the model</p>{stages.includes('indicators') && stages.includes('diagram') && <p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}.</p>}{stages.includes('diagram') ? <p className="sw-answer-diagram">{item.diagram}</p> : stages.includes('conditions') ? <ul className="sw-condition-model">{neutralConditions.map(text => <li key={text}>{text}</li>)}</ul> : <p>{item.indicators.map(i => `${i.text}: Group ${i.group}`).join(' · ')}</p>}{set.taskKind === 'rephrase' && <p className="sw-model-writing">{item.ifThen}</p>}{stages.includes('contra') && <><p className="sw-answer-diagram">{item.contrapositive}</p><p>{item.ifThen}</p><p>{item.contrapositiveWords}</p></>}<p>{item.explanation}</p>{item.correctionNotes.length > 0 && <details className="sw-source-note"><summary>Source adaptation</summary><p><strong>Original statement: </strong>{item.originalStatement}</p><ul>{item.correctionNotes.map(note => <li key={note}>{note}</li>)}</ul></details>}<p className="sw-self-check">How did the reasoning compare? This records your review, not a grade for your writing.</p><div className="sw-review-actions"><button aria-pressed={answer.review === 'matched'} onClick={() => update({ review: 'matched', revealed: true })}><Check size={16}/>My reasoning matched</button><button aria-pressed={answer.review === 'revisit'} onClick={() => update({ review: 'revisit', revealed: true })}><RotateCcw size={16}/>Needs another look</button></div></section>}
      </div></div></div><nav className="sw-navigation" aria-label="Statement navigation"><button disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous</button><label>Go to statement<select value={current} onChange={e => go(Number(e.target.value))}>{set.items.map((q, i) => <option key={q.id} value={i}>{i + 1}{saved.answers[q.id]?.review ? ' · reviewed' : ''}</option>)}</select></label><button disabled={!answer.review} onClick={() => current === set.items.length - 1 ? setResults(true) : go(current + 1)}>{current === set.items.length - 1 ? 'Review this set' : 'Next'}<ArrowRight size={16}/></button></nav>
    </>}
  </section>;
}
