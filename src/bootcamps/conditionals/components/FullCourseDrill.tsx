import { useId, useRef, useState } from 'react';
import { useCourseStep } from '../courseProgress';
import { chainRule, checkResponse, findChain } from '../content/fullCourseLogic';
import type { Atom, Formula, FullCourseDrillSet, FullCourseItem, ItemResponse, QuantityStatement } from '../content/fullCourseTypes';
import { DrillProgress } from './DrillProgress';
import './full-course.css';

type Answer = { response?: ItemResponse; misses: number; resolved: boolean; correct: boolean; revealed: boolean; hint?: string };
type Run = { version: 1; signature: string; index: number; started: boolean; answers: Record<string, Answer> };
const emptyAnswer = (): Answer => ({ misses: 0, resolved: false, correct: false, revealed: false });
export function formulaText(formula: Formula, atoms: Atom[] = []): string {
  if ('atom' in formula) return atoms.find(a => a.id === formula.atom)?.label ?? formula.atom;
  if ('not' in formula) return `NOT ${'atom' in formula.not ? formulaText(formula.not, atoms) : `(${formulaText(formula.not, atoms)})`}`;
  if ('or' in formula && formula.or.length === 2 && 'not' in formula.or[0]) {
    const side = (member: Formula) => {
      const text = formulaText(member, atoms);
      return 'or' in member && member.or.length === 2 && 'not' in member.or[0] ? `(${text})` : text;
    };
    return `${side(formula.or[0].not)} → ${side(formula.or[1])}`;
  }
  return `(${('and' in formula ? formula.and : formula.or).map(f => formulaText(f, atoms)).join('and' in formula ? ' AND ' : ' OR ')})`;
}
export function quantityText(statement: QuantityStatement, predicates: { id: string; label: string }[]) {
  const label = (id: string) => predicates.find(p => p.id === id)?.label ?? id;
  const amount = statement.quantifier === 'exactly' ? `Exactly ${statement.count}` : statement.quantifier === 'not-all' ? 'Not all' : statement.quantifier === 'none' ? 'No' : statement.quantifier[0].toUpperCase() + statement.quantifier.slice(1);
  const adjectives = new Set(['trained', 'listed', 'indexed']);
  const plural = (word: string) => word === 'person' ? 'people' : adjectives.has(word) ? `${word} people` : `${word}s`;
  const subject = plural(label(statement.subject));
  if (statement.subject === statement.predicate && !statement.predicateNegated && ['some', 'none', 'exactly'].includes(statement.quantifier)) return `${amount} ${subject} exist.`;
  const predicate = label(statement.predicate);
  return `${amount} ${subject} are ${statement.predicateNegated ? 'not ' : ''}${adjectives.has(predicate) ? predicate : plural(predicate)}.`;
}
function FormulaEditor({ value, onChange, atoms, label, depth = 0 }: { value: Formula | null; onChange: (value: Formula | null) => void; atoms: Atom[]; label: string; depth?: number }) {
  const [open, setOpen] = useState(false);
  const palette = useId();
  const selected = !value || ('atom' in value && !value.atom) ? '' : 'atom' in value ? atoms.find(a => a.id === value.atom)?.label ?? '' : 'not' in value ? 'NOT' : 'and' in value ? 'Both (AND)' : 'At least one (OR)';
  const children = value && ('and' in value ? value.and : 'or' in value ? value.or : null);
  function choose(next: Formula | null) { onChange(next); setOpen(false); }
  return <div className="fc-expression">
    <button type="button" className="fc-expression-trigger" aria-label={label} aria-expanded={open} aria-controls={palette} data-empty={!selected} data-value={value && 'atom' in value ? value.atom : selected} onClick={() => setOpen(!open)}>{selected || 'Choose a condition or group'} <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    {open && <div id={palette} className="fc-expression-palette" role="group" aria-label={`${label} choices`}><p className="fc-palette-label">Condition</p>{atoms.map(a => <button type="button" className="fc-expression-option" key={a.id} onClick={() => choose({ atom: a.id })}>{a.label}</button>)}{depth < 4 && <><p className="fc-palette-label">Join or negate complete conditions</p><button type="button" className="fc-expression-option" onClick={() => choose({ not: { atom: '' } })}>NOT</button><button type="button" className="fc-expression-option" onClick={() => choose({ and: [{ atom: '' }, { atom: '' }] })}>Both (AND)</button><button type="button" className="fc-expression-option" onClick={() => choose({ or: [{ atom: '' }, { atom: '' }] })}>At least one (OR)</button></>}{value && <button type="button" className="fc-text" onClick={() => choose(null)}>Clear choice</button>}</div>}
    {value && 'not' in value && <FormulaEditor label={`${label}, inside NOT`} value={value.not} atoms={atoms} depth={depth + 1} onChange={next => onChange({ not: next ?? { atom: '' } })}/>}
    {children && <div className="fc-group">{children.map((child, index) => <div key={index}>{index > 0 && <strong>{'and' in value! ? 'AND' : 'OR'}</strong>}<FormulaEditor label={`${label}, member ${index + 1}`} value={child} atoms={atoms} depth={depth + 1} onChange={next => {
      const members = children.map((f, i) => i === index ? next ?? { atom: '' } : f);
      onChange('and' in value! ? { and: members } : { or: members });
    }}/></div>)}<button type="button" className="fc-text" onClick={() => onChange('and' in value! ? { and: [...children, { atom: '' }] } : { or: [...children, { atom: '' }] })}>Add a member</button></div>}
  </div>;
}
function initialResponse(item: FullCourseItem): ItemResponse {
  switch (item.kind) {
    case 'choice': return { kind: 'choice', optionId: '' };
    case 'build-rule': return { kind: 'build-rule', left: null, right: null };
    case 'build-bridge': return { kind: 'build-bridge', left: null, right: null };
    case 'build-rules': return { kind: 'build-rules', rules: item.targets.map(() => ({ left: null, right: null })) };
    case 'case': return { kind: 'case', values: {} };
    case 'chain': return { kind: 'chain', ruleIds: [] };
    case 'argument': return { kind: 'argument', assumptionId: '' };
    case 'quantity-case': return { kind: 'quantity-case', members: Array.from({ length: item.population }, () => ({})) };
  }
}
function RuleBuilder({ atoms, left, right, onChange, prefix = '' }: { atoms: Atom[]; left: Formula | null; right: Formula | null; onChange: (pair: { left: Formula | null; right: Formula | null }) => void; prefix?: string }) {
  return <div className="fc-builder"><div className="fc-rule-side"><h3>Left: sufficient condition</h3><p>What is enough?</p><FormulaEditor label={`${prefix}Sufficient condition`} atoms={atoms} value={left} onChange={next => onChange({ left: next, right })}/></div><div className="fc-rule-arrow" aria-label="requires">→</div><div className="fc-rule-side fc-required"><h3>Right: necessary condition</h3><p>What does it require?</p><FormulaEditor label={`${prefix}Necessary condition`} atoms={atoms} value={right} onChange={next => onChange({ left, right: next })}/></div></div>;
}
function Task({ item, response, setResponse, disabled }: { item: FullCourseItem; response: ItemResponse; setResponse: (response: ItemResponse) => void; disabled: boolean }) {
  const id = useId();
  if (item.kind === 'choice' && response.kind === 'choice') return <fieldset className="fc-choices" disabled={disabled}><legend className="sr-only">Your answer</legend>{item.options.map(option => <label key={option.id} data-selected={response.optionId === option.id}><input type="radio" name={id} checked={response.optionId === option.id} onChange={() => setResponse({ kind: 'choice', optionId: option.id })}/><span>{option.text}</span></label>)}</fieldset>;
  if (item.kind === 'build-rule' && response.kind === 'build-rule') return <fieldset disabled={disabled}><legend>Build the rule</legend><RuleBuilder atoms={item.atoms} left={response.left} right={response.right} onChange={pair => setResponse({ ...response, ...pair })}/></fieldset>;
  if (item.kind === 'build-rules' && response.kind === 'build-rules') return <fieldset disabled={disabled}><legend>Write both rules</legend>{response.rules.map((rule, index) => <section key={index} className="fc-rule-pair"><h3>Rule {index + 1}</h3><RuleBuilder atoms={item.atoms} left={rule.left} right={rule.right} prefix={`Rule ${index + 1}: `} onChange={pair => setResponse({ kind: 'build-rules', rules: response.rules.map((old, i) => i === index ? pair : old) })}/></section>)}</fieldset>;
  if (item.kind === 'build-bridge' && response.kind === 'build-bridge') return <fieldset disabled={disabled}><legend>Build the rule to add</legend><div className="fc-given"><h3>Premises</h3>{item.premises.map((p, i) => <p key={i}>{formulaText(p, item.atoms)}</p>)}</div><div className="fc-target"><h3>Conclusion to establish</h3><p>{formulaText(item.conclusion, item.atoms)}</p></div><p>Add a connection that makes the conclusion follow from these premises. Show the missing connection rather than repeating the conclusion.</p><RuleBuilder atoms={item.atoms} left={response.left} right={response.right} onChange={pair => setResponse({ ...response, ...pair })}/></fieldset>;
  if (item.kind === 'case' && response.kind === 'case') return <fieldset className="fc-case" disabled={disabled}><legend>Your case</legend>{item.premises.length > 0 && <div className="fc-given"><h3>Keep these premises true</h3>{item.premises.map((p, i) => <p key={i}>{formulaText(p, item.atoms)}</p>)}</div>}{item.task === 'counterexample' && <div className="fc-target"><h3>Make this claim false</h3><p>{formulaText(item.target, item.atoms)}</p></div>}<p>Decide what is true and what is false in this one case.</p>{item.atoms.map(a => <fieldset key={a.id}><legend>{a.label}</legend>{[true, false].map(value => <label key={String(value)} data-selected={response.values[a.id] === value}><input type="radio" name={`${id}-${a.id}`} checked={response.values[a.id] === value} onChange={() => setResponse({ kind: 'case', values: { ...response.values, [a.id]: value } })}/>{value ? 'True' : 'False'}</label>)}</fieldset>)}</fieldset>;
  if (item.kind === 'chain' && response.kind === 'chain') return <fieldset disabled={disabled} className="fc-chain"><legend>Connect the rules</legend><p><strong>Start:</strong> {formulaText(item.start, item.atoms)}</p><p><strong>Establish:</strong> {formulaText(item.target, item.atoms)}</p><ol className="fc-chosen-chain">{response.ruleIds.map((ruleId, index) => { const chosen = chainRule(item, ruleId);return <li key={`${ruleId}-${index}`}>{chosen ? `${formulaText(chosen.if, item.atoms)} → ${formulaText(chosen.then, item.atoms)}` : 'Unavailable rule'}</li>; })}</ol><div className="fc-choices">{item.rules.map(rule => <div key={rule.id} role="group" aria-label={rule.text} className="fc-chain-rule"><p>{rule.text}</p><div className="fc-actions"><button type="button" disabled={disabled || response.ruleIds.includes(rule.id)} onClick={() => setResponse({ kind: 'chain', ruleIds: [...response.ruleIds, rule.id] })}>Use this rule</button><button type="button" disabled={disabled || response.ruleIds.includes(`${rule.id}:contra`)} onClick={() => setResponse({ kind: 'chain', ruleIds: [...response.ruleIds, `${rule.id}:contra`] })}>Use its contrapositive</button></div></div>)}</div><button type="button" className="fc-text" disabled={disabled || !response.ruleIds.length} onClick={() => setResponse({ kind: 'chain', ruleIds: response.ruleIds.slice(0, -1) })}>Remove last rule</button></fieldset>;
  if (item.kind === 'argument' && response.kind === 'argument') return <fieldset className="fc-argument" disabled={disabled}><legend>Add a sufficient rule</legend><div className="fc-given"><h3>Premises</h3>{item.premises.map((p, i) => <p key={i}>{formulaText(p, item.atoms)}</p>)}</div><div className="fc-target"><h3>Conclusion to establish</h3><p>{formulaText(item.conclusion, item.atoms)}</p></div><div className="fc-choices">{item.assumptions.map(option => <label key={option.id} data-selected={response.assumptionId === option.id}><input type="radio" name={id} checked={response.assumptionId === option.id} onChange={() => setResponse({ kind: 'argument', assumptionId: option.id })}/><span>{option.text}</span></label>)}</div></fieldset>;
  if (item.kind === 'quantity-case' && response.kind === 'quantity-case') return <fieldset disabled={disabled} className="fc-quantity"><legend>Build a population of {item.population}</legend><div className="fc-given"><h3>Keep these premises true</h3>{item.premises.map((p, i) => <p key={i}>{quantityText(p, item.predicates)}</p>)}</div><div className="fc-target"><h3>Make this conclusion false</h3><p>{quantityText(item.conclusion, item.predicates)}</p></div><p>For each member, decide which descriptions apply.</p>{response.members.map((member, i) => <fieldset key={i}><legend>Member {i + 1}</legend>{item.predicates.map(predicate => <div key={predicate.id} className="fc-member-predicate"><strong>{predicate.label}</strong><div role="group" aria-label={`Member ${i + 1}: ${predicate.label}`} className="fc-member-choices">{[true, false].map(value => <button type="button" key={String(value)} aria-pressed={member[predicate.id] === value} onClick={() => setResponse({ kind: 'quantity-case', members: response.members.map((m, j) => j === i ? { ...m, [predicate.id]: value } : m) })}>{value ? 'Applies' : 'Does not apply'}</button>)}</div></div>)}</fieldset>)}</fieldset>;
  return <p>This saved response belongs to a different exercise. Reopen the question.</p>;
}
function modelText(item: FullCourseItem): string {
  if (item.kind === 'choice') return item.options.find(o => o.id === item.correctOptionId)?.text ?? '';
  if (item.kind === 'build-rule') return `If ${formulaText(item.target.if, item.atoms)}, then ${formulaText(item.target.then, item.atoms)}.`;
  if (item.kind === 'build-rules') return item.targets.map(rule => `If ${formulaText(rule.if, item.atoms)}, then ${formulaText(rule.then, item.atoms)}.`).join(' ');
  if (item.kind === 'argument') return item.assumptions.find(a => a.id === item.correctAssumptionId)?.text ?? '';
  if (item.kind === 'chain') return findChain(item)?.map(id => { const rule = chainRule(item, id)!;return `${formulaText(rule.if, item.atoms)} → ${formulaText(rule.then, item.atoms)}`; }).join('; ') ?? '';
  return '';
}
function selectedHint(item: FullCourseItem, response?: ItemResponse) {
  if (item.kind === 'choice' && response?.kind === 'choice') return item.options.find(o => o.id === response.optionId)?.hint ?? item.hint;
  if (item.kind === 'argument' && response?.kind === 'argument') return item.assumptions.find(o => o.id === response.assumptionId)?.hint ?? item.hint;
  return item.hint;
}
export function FullCourseDrill({ drill, courseStepId, autoStart = false, embedded = false, onComplete }: { drill: FullCourseDrillSet; courseStepId?: string; autoStart?: boolean; embedded?: boolean; onComplete?: () => void }) {
  const course = useCourseStep(courseStepId ?? drill.id);
  const signature = JSON.stringify(drill.items);
  const priorRun = course?.saved?.state as Run | undefined;
  const revisionChanged = useRef(!!priorRun?.signature && priorRun.signature !== signature);
  const completedPreviously = useRef(course?.saved?.status === 'done' && !revisionChanged.current);
  const [run, setRun] = useState<Run>(() => {
    const prior = course?.saved?.state as Run | undefined;
    if (prior?.version === 1 && prior.signature === signature && prior.answers && typeof prior.answers === 'object') return { ...prior, index: Math.max(0, Math.min(drill.items.length - 1, prior.index || 0)), started: autoStart || prior.started };
    return { version: 1, signature, index: 0, started: autoStart || embedded, answers: {} };
  });
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const item = drill.items[run.index];
  if (!item) return <p>No practice items are available for this lesson.</p>;
  const answer = run.answers[item.id] ?? emptyAnswer();
  const response = answer.response ?? initialResponse(item);
  const done = drill.items.map((question, index) => run.answers[question.id]?.resolved ? index : -1).filter(index => index >= 0);
  const complete = done.length === drill.items.length;
  const explanation = embedded && answer.correct ? item.explanation.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() ?? item.explanation : item.explanation;
  const rejectedCase = answer.revealed && 'atoms' in item ? checkResponse(item, response).counterexample : undefined;
  function persist(next: Run) {
    setRun(next);
    const count = drill.items.filter(question => next.answers[question.id]?.resolved).length;
    if (count === drill.items.length) completedPreviously.current = true;
    course?.record({ status: completedPreviously.current ? 'done' : 'started', ...(revisionChanged.current ? { reopen: true } : {}), done: count, total: drill.items.length, state: next });
    revisionChanged.current = false;
    if (count === drill.items.length) onComplete?.();
  }
  function update(next: ItemResponse) {
    setMessage('');
    persist({ ...run, answers: { ...run.answers, [item.id]: { ...answer, response: next, correct: false, resolved: false, revealed: false } } });
  }
  function check() {
    const result = checkResponse(item, response);
    if (!result.supported) { setMessage(result.reason ?? 'Finish your response before checking.'); return; }
    const hint = result.correct ? undefined : result.reason ?? selectedHint(item, response);
    const nextAnswer = { ...answer, response, misses: answer.misses + (result.correct ? 0 : 1), correct: result.correct, resolved: result.correct, revealed: false, hint };
    setMessage('');
    persist({ ...run, answers: { ...run.answers, [item.id]: nextAnswer } });
  }
  function go(index: number) { setMessage(''); persist({ ...run, index }); requestAnimationFrame(() => heading.current?.focus()); }
  if (!run.started) return <section className="fc-drill fc-entry"><h2>{drill.title}</h2>{drill.instructions.map((instruction, i) => <p key={i}>{instruction}</p>)}<button type="button" className="fc-primary" onClick={() => persist({ ...run, started: true })}>{done.length ? 'Continue practice' : 'Start practice'}</button></section>;
  return <section className={`fc-drill${embedded ? ' fc-embedded' : ''}`} aria-label={embedded ? 'Pop quiz' : drill.title}>
    <DrillProgress completed={done.length} total={drill.items.length} current={run.index} completedIndices={done} label={embedded ? 'Pop quiz progress' : 'Drill progress'}/>
    <div className="fc-task"><h2 ref={heading} tabIndex={-1}>{item.prompt}</h2><Task item={item} response={response} setResponse={update} disabled={answer.resolved}/>
      {!answer.resolved && <div className="fc-actions"><button type="button" className="fc-primary" onClick={check}>Check my answer</button>{answer.misses > 0 && <button type="button" className="fc-secondary" onClick={() => {
        setMessage(''); persist({ ...run, answers: { ...run.answers, [item.id]: { ...answer, response, resolved: true, correct: false, revealed: true } } });
      }}>Show answer</button>}</div>}
      {!answer.resolved && (message || answer.hint) && <div className="fc-feedback fc-hint" role="status"><strong>{message ? 'Check your response.' : embedded ? 'Not that one.' : 'Take another look.'}</strong><p>{message || answer.hint}</p></div>}
      {answer.resolved && <div className={`fc-feedback ${answer.correct ? 'fc-success' : 'fc-revealed'}`} role="status"><strong>{answer.correct ? 'Correct.' : 'Answer explained'}</strong>{answer.revealed && modelText(item) && <p className="fc-model">{modelText(item)}</p>}<p>{explanation}</p>{rejectedCase && 'atoms' in item && <details><summary>Test your answer with this case</summary><p>{item.kind === 'build-rule' || item.kind === 'build-rules' ? 'These truth values make your rule and the original statement differ.' : 'These facts satisfy the premises and your selected connections while making the conclusion false.'}</p><ul>{item.atoms.filter(a => typeof rejectedCase[a.id] === 'boolean').map(a => <li key={a.id}>{rejectedCase[a.id] ? a.label : `NOT (${a.label})`}</li>)}</ul></details>}{answer.revealed && <p className="fc-review-note">You reviewed the answer to this question.</p>}</div>}
    </div>
    <nav className="fc-navigation" aria-label={embedded ? 'Quiz questions' : 'Drill questions'}><button type="button" disabled={run.index === 0} onClick={() => go(run.index - 1)}>Previous question</button>{run.index < drill.items.length - 1 ? <button type="button" disabled={!answer.resolved} onClick={() => go(run.index + 1)}>Next question →</button> : complete ? <p role="status">{embedded ? 'Pop quiz complete.' : 'Practice complete.'}</p> : <span/>}</nav>
  </section>;
}
