import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSourceWorksheetDrill } from '../content/sourceWorksheetDrills';
import './source-worksheet-drill.css';

type Attempt = { groups: Record<string, string>; fingerprint: string; words: number[]; left: string; right: string; contraLeft: string; contraRight: string; negateLeft: boolean; negateRight: boolean; writing: string; contraWriting: string; revealed: boolean; review: 'matched' | 'revisit' | null };
const blank = (): Attempt => ({ groups: {}, fingerprint: '', words: [], left: '', right: '', contraLeft: '', contraRight: '', negateLeft: false, negateRight: false, writing: '', contraWriting: '', revealed: false, review: null });
type Saved = { current: number; answers: Record<string, Attempt> };
function fingerprint(item: { statement: string; sufficient: string; necessary: string; indicators: unknown; contrapositiveWords: string }) {
  return JSON.stringify([item.statement, item.sufficient, item.necessary, item.indicators, item.contrapositiveWords]);
}
function readSaved(key: string): Saved {
  try {
    const data = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (!data || !Number.isInteger(data.current) || typeof data.answers !== 'object' || !data.answers) return { current: 0, answers: {} };
    const answers: Record<string, Attempt> = {};
    for (const [id, raw] of Object.entries(data.answers)) {
      const a = raw as Attempt;
      if (!a || !Array.isArray(a.words) || !a.words.every(Number.isInteger) || !['left', 'right', 'contraLeft', 'contraRight', 'writing'].every(k => typeof a[k] === 'string') || typeof a.revealed !== 'boolean' || typeof a.negateLeft !== 'boolean' || typeof a.negateRight !== 'boolean' || ![null, 'matched', 'revisit'].includes(a.review)) continue;
      answers[id] = { ...a, groups: a.groups && typeof a.groups === 'object' ? Object.fromEntries(Object.entries(a.groups).filter(([, value]) => value === '1' || value === '2')) : {}, fingerprint: typeof a.fingerprint === 'string' ? a.fingerprint : '', contraWriting: typeof a.contraWriting === 'string' ? a.contraWriting : '' };
    }
    return { current: data.current, answers };
  } catch { return { current: 0, answers: {} }; }
}

export function SourceWorksheetDrill({ setId, run = false, startUrl, title }: { setId: string; run?: boolean; startUrl?: string; title?: string }) {
  const set = getSourceWorksheetDrill(setId);
  if (!set) return <p>This practice set is unavailable.</p>;
  return <div className="opening-course-content"><WorksheetRun key={`${setId}-${run}`} set={set} title={title} run={run} startUrl={startUrl}/></div>;
}

function WorksheetRun({ set, run, startUrl, title }: { set: NonNullable<ReturnType<typeof getSourceWorksheetDrill>>; run: boolean; startUrl?: string; title?: string }) {
  const storageKey = `conditional-worksheet-v1:${set.id}`;
  const [saved, setSaved] = useState(() => {
    const restored = readSaved(storageKey);
    for (const item of set.items) {
      const attempt = restored.answers[item.id];
      if (attempt && attempt.fingerprint !== fingerprint(item)) {
        attempt.revealed = false;
        attempt.review = null;
      }
    }
    for (const attempt of Object.values(restored.answers)) {
      if (set.taskKind === 'contrapositive' && (!attempt.writing.trim() || !attempt.contraWriting.trim()) || set.taskKind === 'rephrase' && (!attempt.left || !attempt.right)) {
        attempt.revealed = false;
        attempt.review = null;
      }
    }
    return restored;
  });
  const [started, setStarted] = useState(run);
  const [results, setResults] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const current = Math.max(0, Math.min(saved.current, set.items.length - 1));
  const item = set.items[current];
  const answer = saved.answers[item.id] ?? blank();
  const reviewed = set.items.filter(i => saved.answers[i.id]?.review).length;
  const revisit = set.items.filter(i => saved.answers[i.id]?.review === 'revisit').length;
  const percent = Math.round(reviewed / set.items.length * 100);
  const needsIndicators = ['identify', 'indicators', 'rephrase'].includes(set.taskKind);
  const needsPlacement = ['identify', 'roles', 'forward', 'rephrase', 'contrapositive'].includes(set.taskKind);
  const needsContra = set.taskKind === 'contrapositive';
  const needsWriting = set.taskKind === 'rephrase';
  const phrases = answer.words.reduce<number[][]>((runs, word) => { const last = runs[runs.length - 1]; if (last && last[last.length - 1] === word - 1) last.push(word); else runs.push([word]); return runs; }, []);
  const ready = (!needsIndicators || answer.words.length > 0 && phrases.every(phrase => ['1', '2'].includes(answer.groups[phrase.join('-')]))) && (!needsPlacement || !!answer.left && !!answer.right) && (!needsContra || !!answer.contraLeft && !!answer.contraRight && !!answer.writing.trim() && !!answer.contraWriting.trim()) && (!needsWriting || !!answer.writing.trim());
  const placementCorrect = answer.left === 'sufficient' && answer.right === 'necessary';
  const contraCorrect = answer.contraLeft === 'necessary' && answer.contraRight === 'sufficient' && answer.negateLeft && answer.negateRight;
  const choices = current % 2 ? ['necessary', 'sufficient'] : ['sufficient', 'necessary'];
  const condition = (value: string) => value === 'sufficient' ? item.sufficient : item.necessary;

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(saved)); setStorageFailed(false); } catch { setStorageFailed(true); } }, [saved, storageKey]);
  useEffect(() => { if (started) heading.current?.focus({ preventScroll: true }); }, [current, started, results]);
  useEffect(() => { if (answer.revealed) feedback.current?.focus({ preventScroll: true }); }, [answer.revealed]);
  function update(patch: Partial<Attempt>) { setSaved(s => ({ ...s, answers: { ...s.answers, [item.id]: { ...(s.answers[item.id] ?? blank()), ...patch, fingerprint: fingerprint(item) } } })); }
  function go(index: number) { setSaved(s => ({ ...s, current: index })); setResults(false); setStarted(true); }
  function slot(label: string, field: 'left' | 'right' | 'contraLeft' | 'contraRight') {
    return <label className="sw-slot"><span>{label}</span>{!answer.revealed && <select aria-label={label} value={answer[field]} onChange={e => update({ [field]: e.target.value })}><option value="">Choose a condition</option>{choices.map(value => <option key={value} value={value}>{condition(value)}</option>)}</select>}{answer[field] && <strong className="sw-selected-condition">{(field === 'contraLeft' && answer.negateLeft || field === 'contraRight' && answer.negateRight) ? `NOT (${condition(answer[field])})` : condition(answer[field])}</strong>}</label>;
  }

  if (!started) return <section className="sw-entry"><div className="sw-entry-art" aria-hidden="true"><span>Enough</span><i>→</i><span>Required</span></div><div data-course-heading><p className="sw-eyebrow">{set.items.length} statements · Guided practice</p><h1>{title ?? set.title}</h1>{title && <h2>{set.title}</h2>}<p className="sw-entry-copy">{set.instructions.replace('Write the indicator expression', 'Select the indicator expression')}</p><ol><li>{needsIndicators ? 'Select the indicator words in the sentence.' : needsWriting ? 'Write an if/then sentence without changing the meaning.' : 'Place the complete conditions beside the arrow.'}</li><li>{needsContra ? 'Build the contrapositive by reversing and negating both conditions.' : needsPlacement && needsIndicators ? 'Choose the sufficient condition on the left and the necessary condition on the right.' : 'Keep every restriction, including deadlines and words such as “can.”'}</li><li>Compare with the explanation, then mark what needs another look.</li></ol>{startUrl ? <Link className="sw-primary" to={startUrl}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></Link> : <button className="sw-primary" onClick={() => setStarted(true)}>{reviewed ? 'Continue practice' : 'Start practice'}<ArrowRight size={18}/></button>}{reviewed > 0 && <p>{reviewed} of {set.items.length} reviewed on this device.</p>}</div></section>;

  return <section className="sw-experience" aria-label={set.title}>
    <header className="sw-header"><div><p className="sw-eyebrow">{set.shortTitle}</p><p>{reviewed === 0 ? 'Ready to begin' : `${reviewed} of ${set.items.length} reviewed`}</p></div>{!run && <button className="sw-text-button" onClick={() => setStarted(false)}>Instructions<ArrowRight size={16}/></button>}{reviewed > 0 && !results && <button className="sw-text-button" onClick={() => setResults(true)}>Review my work</button>}<strong className="sw-percent">{percent}<small>%</small></strong></header>
    <div role="progressbar" aria-label="Statements reviewed" aria-valuemin={0} aria-valuemax={set.items.length} aria-valuenow={reviewed} className="sw-progress"><span style={{ width: `${percent}%` }}/></div>
    {storageFailed && <p role="status" className="sw-storage-error">Your browser could not save this practice. Keep this page open to retain your work.</p>}
    {results ? <div className="sw-results"><Check size={32}/><h2 ref={heading} tabIndex={-1}>{reviewed === set.items.length ? 'Every statement reviewed.' : 'Your practice so far.'}</h2><p>{revisit ? `${revisit} marked for another look. Revisit those statements and explain the relationship again.` : 'Your marks reflect your own comparison with the explanations, not an automatically graded score.'}</p><div className="sw-review-grid">{set.items.map((q, index) => <button key={q.id} onClick={() => go(index)}><strong>{String(index + 1).padStart(2, '0')}</strong><span>{saved.answers[q.id]?.review === 'matched' ? 'Reasoning matched' : saved.answers[q.id]?.review === 'revisit' ? 'Another look' : 'Not reviewed'}</span><ArrowRight size={16}/></button>)}</div></div> : <>
      <div className="sw-question" key={item.id}><aside className="sw-rule"><p className="sw-eyebrow">The statement</p><blockquote>{item.statement}</blockquote><span className="sw-statement-number" aria-hidden="true">{String(current + 1).padStart(2, '0')}</span></aside><div className="sw-work"><p className="sw-eyebrow">Statement {current + 1} of {set.items.length}</p><h2 ref={heading} tabIndex={-1}>{needsIndicators ? 'Find the indicator words.' : needsWriting ? 'Write the same rule as if/then.' : needsContra ? 'Build the rule and its contrapositive.' : 'Put the complete conditions in place.'}</h2>
      {needsIndicators && <fieldset className="sw-tokens" disabled={answer.revealed}><legend>Select each indicator word. Select all the words in a phrase.</legend>{item.statement.split(/\s+/).map((word, index) => <button type="button" key={index} aria-pressed={answer.words.includes(index)} onClick={() => update({ words: answer.words.includes(index) ? answer.words.filter(n => n !== index) : [...answer.words, index].sort((a, b) => a - b) })}>{word}</button>)}</fieldset>}{needsIndicators && phrases.length > 0 && <div className="sw-indicator-groups">{phrases.map(phrase => { const key = phrase.join('-'); const text = phrase.map(index => item.statement.split(/\s+/)[index]).join(' '); return <label className="sw-slot" key={key}><span>Which group: “{text}”?</span><select disabled={answer.revealed} value={answer.groups[key] ?? ''} onChange={e => update({ groups: { ...answer.groups, [key]: e.target.value } })}><option value="">Choose the group</option><option value="1">Group 1: sufficient-condition indicator</option><option value="2">Group 2: necessary-condition indicator</option></select></label>; })}</div>}
      {needsPlacement && <div className="sw-builder"><p className="sw-builder-label">Original rule</p><div className="sw-arrow-row">{slot('Left: sufficient condition', 'left')}<span className="sw-arrow" aria-label="requires">→</span>{slot('Right: necessary condition', 'right')}</div></div>}
      {needsWriting && <label className="sw-writing">Keep the sentence's meaning, including words such as “can” and any deadline.<textarea rows={4} disabled={answer.revealed} value={answer.writing} onChange={e => update({ writing: e.target.value })} placeholder="If …, then …"/></label>}
      {needsContra && <div className="sw-builder sw-contra"><p className="sw-builder-label">Contrapositive</p><p className="sw-notation-help">NOT negates the whole condition. For example, NOT (is a student) means is not a student.</p><div className="sw-arrow-row"><div>{slot('Contrapositive left', 'contraLeft')}<label className="sw-negation"><input type="checkbox" checked={answer.negateLeft} disabled={answer.revealed} onChange={e => update({ negateLeft: e.target.checked })}/>Negate this condition</label></div><span className="sw-arrow" aria-label="requires">→</span><div>{slot('Contrapositive right', 'contraRight')}<label className="sw-negation"><input type="checkbox" checked={answer.negateRight} disabled={answer.revealed} onChange={e => update({ negateRight: e.target.checked })}/>Negate this condition</label></div></div></div>}
      {needsContra && <div className="sw-readbacks"><label className="sw-writing">Read your original diagram in words.<textarea rows={3} disabled={answer.revealed} value={answer.writing} onChange={e => update({ writing: e.target.value })} placeholder="If …, then …"/></label><label className="sw-writing">Read your contrapositive in words.<textarea rows={3} disabled={answer.revealed} value={answer.contraWriting} onChange={e => update({ contraWriting: e.target.value })} placeholder="If …, then …"/></label></div>}{!answer.revealed ? <button className="sw-primary" disabled={!ready} onClick={() => update({ revealed: true })}>Compare with explanation<ArrowRight size={17}/></button> : <section className="sw-feedback"><h3 ref={feedback} tabIndex={-1}>{needsPlacement && (!placementCorrect || needsContra && !contraCorrect) ? 'Revise your diagram.' : 'Compare your reasoning.'}</h3>{needsIndicators && <p><strong>Indicators: </strong>{item.indicators.map(i => `${i.text} (Group ${i.group})`).join('; ')}. Compare these with the words you selected.</p>}{needsPlacement && <p className="sw-answer-diagram">{item.diagram}</p>}{(needsWriting || needsContra) && <p className="sw-model-writing">{item.ifThen}</p>}{needsContra && <><p className="sw-builder-label">Contrapositive</p><p className="sw-answer-diagram">{item.contrapositive}</p><p>{item.contrapositiveWords}</p></>}<p>{item.explanation}</p>{item.correctionNotes.length > 0 && <details className="sw-source-note"><summary>Source adaptation</summary><p><strong>Original statement: </strong>{item.originalStatement}</p><ul>{item.correctionNotes.map(note => <li key={note}>{note}</li>)}</ul></details>}<p className="sw-self-check">{needsPlacement && (!placementCorrect || needsContra && !contraCorrect) && <strong>Your diagram needs a change. Revise the order or negation before marking it as matched. </strong>}Did your reasoning match? Check the direction and every restriction. Wording can differ without changing the meaning.</p><div className="sw-review-actions"><button disabled={needsPlacement && (!placementCorrect || needsContra && !contraCorrect)} aria-pressed={answer.review === 'matched'} onClick={() => update({ review: 'matched' })}><Check size={16}/>My reasoning matched</button><button aria-pressed={answer.review === 'revisit'} onClick={() => update({ review: 'revisit' })}><RotateCcw size={16}/>Needs another look</button></div><button className="sw-text-button" onClick={() => update({ revealed: false, review: null })}>Revise my attempt</button></section>}
      </div></div><nav className="sw-navigation" aria-label="Statement navigation"><button disabled={current === 0} onClick={() => go(current - 1)}><ArrowLeft size={16}/>Previous</button><label>Go to statement<select value={current} onChange={e => go(Number(e.target.value))}>{set.items.map((q, i) => <option key={q.id} value={i}>{i + 1}{saved.answers[q.id]?.review ? ' · reviewed' : ''}</option>)}</select></label><button disabled={!answer.review} onClick={() => current === set.items.length - 1 ? setResults(true) : go(current + 1)}>{current === set.items.length - 1 ? 'Review this set' : 'Next'}<ArrowRight size={16}/></button></nav>
    </>}
  </section>;
}










