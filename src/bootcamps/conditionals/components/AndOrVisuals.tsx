import { useId, useState, type ReactNode } from 'react';
import { ArrowRight, Check, Minus, RotateCcw, X } from 'lucide-react';
import { Pill } from './ContrapositiveVisuals';
import {
  allAssignments, atomIdsOf, contrapositive, converse, diagramText, literalShort, literalText, negateSide, ruleHolds, ruleMistakes, ruleSentence, sideStatus, sideText, sideValue,
  type Atom, type Facts, type Rule, type Side,
} from '../content/andOrLogic';
import { andOrLectureMedia, andOrLectureTranscript, andOrLectures } from '../content/andOrLectures';
import { placementExamples } from '../content/andOrItems';
import type { AndOrItem } from '../content/andOrTasks';
import './and-or.css';

const yesNo = (value: boolean) => value ? <><Check size={14} aria-hidden="true"/><span>Yes</span></> : <><X size={14} aria-hidden="true"/><span>No</span></>;

/** One side of a diagram: the members stacked, with the connector sitting on its own line between them. */
function SideStack({ atoms, side, toneOf, label, cancelled = [], rows, anchorRow }: { atoms: Atom[]; side: Side; toneOf: (atom: string) => 'amber' | 'teal'; label: string; cancelled?: string[]; rows: number; anchorRow: number }) {
  // For an even number of connectors, use the lower middle connector consistently.
  const connectorIndex = Math.min(side.members.length - 1, Math.ceil(side.members.length / 2));
  const offset = side.members.length > 1 ? anchorRow - (connectorIndex * 2 + 1) : 0;
  return <div className="ao-side" data-tone="plain" style={{ gridRow: `1 / span ${rows}` }}>
    <span className="ao-side-label">{label}</span>
    <ul>{side.members.map((member, index) => <li key={`${member.atom}-${index}`}>
      {index > 0 && <span className="ao-connector" data-op={side.op} data-arrow-anchor={index === connectorIndex} style={{ gridRow: index * 2 + 1 + offset }}><span aria-hidden="true">{side.op === 'and' ? '+' : 'or'}</span><span className="sr-only">{side.op.toUpperCase()}</span></span>}
      <div className="ao-member" data-cancelled={cancelled.includes(member.atom)} style={{ gridRow: side.members.length === 1 ? anchorRow : index * 2 + 2 + offset }}>
        <Pill text={literalShort(atoms, member)} tone={toneOf(member.atom)} negated={!!member.negated}/>
        {cancelled.includes(member.atom) && <span className="ao-cancel">NOT + NOT = no NOT</span>}
      </div>
    </li>)}</ul>
  </div>;
}

/**
 * A rule drawn the way the lecture recommends: each group stacked vertically, with the arrow leaving the group
 * itself rather than one member. The plain-language readback is always present, never only the picture.
 * `cancelled` marks members whose existing NOT just cancelled, so a double negation is seen and not only stated.
 * Colour travels with the idea, as on the Contrapositive page: an idea that was sufficient in the `origin` rule (default: this rule)
 * stays amber and a necessary one stays teal, however the sides are flipped, negated or switched. The side labels give the current role.
 */
export function AndOrDiagram({ atoms, rule, title, readback = true, cancelled, origin }: { atoms: Atom[]; rule: Rule; title?: string; readback?: boolean; cancelled?: string[]; origin?: Rule }) {
  const source = origin ?? rule;
  const count = Math.max(2, rule.sufficient.members.length, rule.necessary.members.length);
  const rows = count * 2;
  const anchorRow = Math.ceil(count / 2) * 2 + 1;
  const toneOf = (atom: string): 'amber' | 'teal' => source.sufficient.members.some(member => member.atom === atom) ? 'amber' : 'teal';
  return <div className="ao-diagram-frame"><figure className="ao-diagram" aria-label={`${title ? `${title}: ` : ''}${diagramText(atoms, rule)}`}>
    {title && <figcaption>{title}</figcaption>}
    <div className="ao-diagram-row" style={{ gridTemplateRows: `repeat(${rows}, auto)` }}>
      <SideStack atoms={atoms} side={rule.sufficient} toneOf={toneOf} label="Left side · sufficient" cancelled={cancelled} rows={rows} anchorRow={anchorRow}/>
      <span className="ao-arrow" style={{ gridRow: anchorRow }} aria-hidden="true"><b>must</b><ArrowRight size={28} strokeWidth={3}/></span>
      <SideStack atoms={atoms} side={rule.necessary} toneOf={toneOf} label="Right side · necessary" cancelled={cancelled} rows={rows} anchorRow={anchorRow}/>
    </div>
    {readback && <p className="ao-readback">{ruleSentence(atoms, rule)}</p>}
  </figure></div>;
}

// ---- Both, or at least one ------------------------------------------------------------------

/**
 * The four combinations of two facts, answered by two columns. The learner sets the facts. When `heads` is given the
 * two columns are two different rules (for example the same two facts joined by AND, then by OR) and say so.
 */
export function FourCombos({ first, second, mode = 'meaning', heads }: { first: Atom; second: Atom; mode?: 'meaning' | 'opposite'; heads?: [string, string] }) {
  const [a, setA] = useState(true);
  const [b, setB] = useState(false);
  const atoms = [first, second];
  const and: Side = { op: 'and', members: [{ atom: first.id }, { atom: second.id }] };
  const or: Side = { op: 'or', members: and.members };
  const notBoth = negateSide(and);
  const neither: Side = { op: 'and', members: and.members.map(member => ({ atom: member.atom, negated: true })) };
  const rows = allAssignments([first.id, second.id]);
  const now = { [first.id]: a, [second.id]: b };
  const columns = mode === 'meaning'
    ? [{ key: 'and', head: heads?.[0] ?? 'Both (AND)', side: and }, { key: 'or', head: heads?.[1] ?? 'At least one (OR)', side: or }]
    : [{ key: 'and', head: 'Both hold', side: and }, { key: 'notBoth', head: 'Not both', side: notBoth }, { key: 'neither', head: 'Neither', side: neither }];
  const summary = mode === 'meaning'
    ? `${literalText(atoms, { atom: first.id, negated: !a })}, and ${literalText(atoms, { atom: second.id, negated: !b })}. Both: ${sideValue(and, now) ? 'yes' : 'no'}. At least one: ${sideValue(or, now) ? 'yes' : 'no'}.`
    : `${literalText(atoms, { atom: first.id, negated: !a })}, and ${literalText(atoms, { atom: second.id, negated: !b })}. Both hold: ${sideValue(and, now) ? 'yes' : 'no'}. Not both: ${sideValue(notBoth, now) ? 'yes' : 'no'}. Neither: ${sideValue(neither, now) ? 'yes' : 'no'}.`;
  return <div className="ao-combos">
    <div className="ao-combo-controls" role="group" aria-label="Set the facts">
      <button type="button" aria-pressed={a} onClick={() => setA(value => !value)}><span aria-hidden="true">{a ? <Check size={15}/> : <X size={15}/>}</span>Click here to change: {a ? first.yes : first.no}</button>
      <button type="button" aria-pressed={b} onClick={() => setB(value => !value)}><span aria-hidden="true">{b ? <Check size={15}/> : <X size={15}/>}</span>Click here to change: {b ? second.yes : second.no}</button>
    </div>
    <p className="ao-combo-now" role="status">{summary}</p>
    <table className="ao-table">
      <caption>All four combinations</caption>
      <thead><tr><th scope="col">{first.short}</th><th scope="col">{second.short}</th>{columns.map(column => <th scope="col" key={column.key}>{column.head}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={`${row[first.id]}${row[second.id]}`} data-current={row[first.id] === a && row[second.id] === b}>
        <td>{yesNo(row[first.id])}</td><td>{yesNo(row[second.id])}</td>
        {columns.map(column => <td key={column.key} data-on={sideValue(column.side, row)}>{yesNo(sideValue(column.side, row))}</td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

/**
 * A group checked against the facts, member by member. Words and icons carry each state, never colour alone.
 * An unmentioned member is Unknown, which is not the same as No.
 */
export function GroupCheck({ atoms, side, facts }: { atoms: Atom[]; side: Side; facts: Facts }) {
  const ids = side.members.map(member => member.atom);
  const status = sideStatus(side, facts, ids);
  const result = status === 'met' ? 'Group established' : status === 'not-met' ? 'Group ruled out' : 'Not established yet';
  return <div className="ao-groupcheck" data-status={status}>
    <ul>{side.members.map((member, index) => {
      const known = facts[member.atom];
      const holds = known === undefined ? undefined : known !== !!member.negated;
      return <li key={`${member.atom}-${index}`}>
        {index > 0 && <span className="ao-connector" data-op={side.op}>{side.op.toUpperCase()}</span>}
        <Pill text={literalShort(atoms, member)} tone="amber" negated={!!member.negated}/>
        <span className="ao-gc-state" data-state={holds === undefined ? 'unknown' : holds ? 'yes' : 'no'}>{holds === undefined ? <Minus size={14} aria-hidden="true"/> : holds ? <Check size={14} aria-hidden="true"/> : <X size={14} aria-hidden="true"/>}{holds === undefined ? 'Unknown' : holds ? 'Yes' : 'No'}</span>
      </li>;
    })}</ul>
    <p className="ao-gc-result" role="img" aria-label={`${side.op.toUpperCase()} group. ${result}.`}>{status === 'met' ? <Check size={16} aria-hidden="true"/> : status === 'not-met' ? <X size={16} aria-hidden="true"/> : <Minus size={16} aria-hidden="true"/>}{result}</p>
  </div>;
}

// ---- Where the group sits ---------------------------------------------------------------------

/** What the rule gives for some facts. Exported so the logic can be tested against the authored rules. */
export const describeProbe = (item: AndOrItem, facts: Facts) => {
  const ids = atomIdsOf([item.rule]);
  const trigger = sideStatus(item.rule.sufficient, facts, ids);
  const target = item.rule.necessary;
  const known = Object.entries(facts).map(([id, value]) => (value ? item.atoms.find(a => a.id === id)!.yes : item.atoms.find(a => a.id === id)!.no)).join(' and ');
  const text = (value: Side) => sideText(item.atoms, value);
  if (trigger === 'met') {
    const everyMember = target.members.length > 1 && target.op === 'and';
    const oneOf = target.members.length > 1 && target.op === 'or';
    const stillOpen = oneOf && target.members.every(member => facts[member.atom] === undefined);
    const remaining = target.members.filter(member => facts[member.atom] === undefined || facts[member.atom] !== !!member.negated);
    const narrowed = oneOf && remaining.length === 1 && target.members.some(member => facts[member.atom] !== undefined && facts[member.atom] === !!member.negated);
    if (narrowed) return `Given: ${known}. The sufficient condition is met. The rule requires ${text(target)}. The facts rule out the other option, so ${text({ op: 'and', members: remaining })}.`;
    return `Given: ${known}. The sufficient condition is established, so the rule applies: ${everyMember ? `every member of the requirement follows (${text(target)}).` : oneOf ? (stillOpen ? `at least one of the requirements follows (${text(target)}), but the rule does not say which.` : `the requirement follows (${text(target)}), and what is already ruled out narrows it.`) : `${text(target)} follows.`}`;
  }
  // A denied requirement works backward through the rule: the whole sufficient side cannot be met.
  if (sideStatus(target, facts, ids) === 'not-met') {
    return `Given: ${known}. The facts rule out the necessary condition (${text(target)}), so the sufficient side cannot be met. By the contrapositive: ${text(negateSide(item.rule.sufficient))}.`;
  }
  return `Given: ${known}. This does not establish the sufficient condition (${text(item.rule.sufficient)}), so this rule gives no additional conclusion from these facts.`;
};

/** Four different rules about one setting, one tab each. Pick a fact and read what the rule does and does not give. */
export function PlacementExplorer() {
  const [index, setIndex] = useState(0);
  const [probe, setProbe] = useState<number | null>(null);
  const id = useId();
  const example = placementExamples[index];
  const choose = (next: number) => { setIndex(next); setProbe(null); };
  return <div className="ao-explorer">
    <div className="ao-tabs" role="tablist" aria-label="Four different rules about the regional round">
      {placementExamples.map((entry, i) => <button key={entry.id} id={`${id}-t${i}`} role="tab" type="button" aria-selected={i === index} aria-controls={`${id}-panel`} tabIndex={i === index ? 0 : -1}
        onClick={() => choose(i)}
        onKeyDown={event => {
          const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
          if (!move) return;
          event.preventDefault();
          const next = (i + move + placementExamples.length) % placementExamples.length;
          choose(next);
          requestAnimationFrame(() => document.getElementById(`${id}-t${next}`)?.focus());
        }}>{entry.label}</button>)}
    </div>
    <div className="ao-explorer-panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-t${index}`}>
      <p className="ao-rule-tag">Rule {index + 1} of {placementExamples.length}. A different rule from the others.</p>
      <p className="ao-sentence">{example.item.statement}</p>
      <AndOrDiagram atoms={example.item.atoms} rule={example.item.rule}/>
      <p className="ao-probe-lead">Choose a fact to check what follows:</p>
      <div className="ao-probes" role="group" aria-label="Facts to try">{example.probes.map((entry, i) => <button key={entry.label} type="button" aria-pressed={probe === i} onClick={() => setProbe(i)}>{entry.label}</button>)}</div>
      <p className="ao-probe-result" role="status">{probe === null ? 'Choose a fact to see what the rule gives.' : describeProbe(example.item, example.probes[probe].fact)}</p>
    </div>
  </div>;
}

/** The four original rules beside their contrapositives, derived from the same structure. */
export function FourForms() {
  return <div className="ao-forms">{placementExamples.map(entry => <figure key={entry.id} className="ao-form">
    <figcaption>{entry.label}</figcaption>
    <p className="ao-form-original"><span>Original</span>{ruleSentence(entry.item.atoms, entry.item.rule)}</p>
    <p className="ao-form-contra"><span>Contrapositive</span>{ruleSentence(entry.item.atoms, contrapositive(entry.item.rule))}</p>
  </figure>)}</div>;
}

// ---- Flip, negate, switch -----------------------------------------------------------------------

/** A rule becomes its contrapositive in three clicks, then every one of the eight cases is checked from the same data. */
export function ContrapositiveDemo({ item, label }: { item: AndOrItem; label: string }) {
  const [stage, setStage] = useState(0);
  const [checked, setChecked] = useState(false);
  const { atoms, rule } = item;
  const mistakes = ruleMistakes(rule);
  const shown: Rule = stage === 0 ? rule : stage === 1 ? converse(rule) : stage === 2 ? mistakes.find(m => m.kind === 'keeps-connector')!.rule : contrapositive(rule);
  // A NOT that was already on a member cancels when the member is negated. Name it and mark it where it happens.
  const cancelled = [...rule.sufficient.members, ...rule.necessary.members].filter(member => member.negated).map(member => member.atom);
  const cancelNames = cancelled.map(id => `“${atoms.find(a => a.id === id)!.short}”`).join(' and ');
  const captions = [
    'Start with the rule as it stands.',
    'Step 1. The sides switched places. Nothing is negated yet, so this is not a rule we can use.',
    cancelled.length
      ? `Step 2. Every member now carries a NOT. ${cancelNames} already had one, so the two cancel and it reads positive again. AND and OR have not changed yet.`
      : 'Step 2. Every member now carries a NOT. AND and OR have not changed yet.',
    'Step 3. Change AND to OR and OR to AND when negating connected conditions. Now each side is negated correctly. This version says the same thing as the original rule.',
  ];
  const ids = atomIdsOf([rule]);
  const rows = allAssignments(ids);
  const steps: [string, string][] = [['Flip the sides', 'Click here to switch the left and right sides'], ['Put NOT on every member', 'Click here to negate each member'], ['Switch AND and OR', 'Click here to change AND to OR and OR to AND']];
  return <div className="ao-demo" data-stage={stage} role="group" aria-label={label}>
    <p className="ct-flip-sentence" data-kind="rule"><span>The rule</span>{ruleSentence(atoms, rule)}</p>
    <AndOrDiagram atoms={atoms} rule={shown} readback={false} title={stage === 0 ? 'Original' : stage === 3 ? 'Contrapositive' : `After step ${stage}`} cancelled={stage >= 2 ? cancelled : []} origin={rule}/>
    <p className="ct-flip-sentence" data-kind="result" data-show={stage === 3} aria-hidden={stage !== 3}><span>The contrapositive</span>{ruleSentence(atoms, contrapositive(rule))}</p>
    <p className="ao-caption" role="status">{captions[stage]}</p>
    <div className="ct-flip-controls">
      {steps.map(([name, hint], i) => <button key={name} type="button" className="ct-step" data-ready={stage === i} data-done={stage > i} disabled={stage !== i} onClick={() => setStage(i + 1)}><b aria-hidden="true">{stage > i ? <Check size={16} strokeWidth={3}/> : i + 1}</b>Step {i + 1}. {stage === i ? hint : name}</button>)}
      {stage > 0 && <button type="button" className="ct-flip-reset" onClick={() => { setStage(0); setChecked(false); }}><RotateCcw size={15} aria-hidden="true"/>Start over</button>}
    </div>
    {stage === 3 && <div className="ao-check">
      <button type="button" className="ao-check-button" aria-expanded={checked} onClick={() => setChecked(value => !value)}>{checked ? 'Hide the check' : 'Check all eight cases'}</button>
      {checked && <table className="ao-table ao-check-table">
        <caption>Does each version hold in every case? The last two columns match in every row.</caption>
        <thead><tr>{ids.map(id => <th scope="col" key={id}>{atoms.find(a => a.id === id)!.short}</th>)}<th scope="col">Original holds</th><th scope="col">Contrapositive holds</th></tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{ids.map(id => <td key={id}>{yesNo(row[id])}</td>)}<td>{yesNo(ruleHolds(rule, row))}</td><td>{yesNo(ruleHolds(contrapositive(rule), row))}</td></tr>)}</tbody>
      </table>}
    </div>}
  </div>;
}

// ---- Tempting errors --------------------------------------------------------------------------

/** A slim Wrong or Right card: status badge, one line saying what was changed, and a diagram that shows it. */
export interface ErrorCard { verdict: 'right' | 'wrong'; how: string; diagram: ReactNode }
export function ErrorCards({ start, cards }: { start: { label?: string; text: string }; cards: ErrorCard[] }) {
  return <div className="ct-moves3">
    <p className="ct-moves3-start"><span>{start.label ?? 'The rule'}</span><strong>{start.text}</strong></p>
    <div className="ct-moves3-grid">{cards.map(card => <article className="ct-move ao-slim" data-verdict={card.verdict} key={card.how}>
      <p className="ct-move-badge">{card.verdict === 'right' ? <Check size={16} strokeWidth={3} aria-hidden="true"/> : <X size={16} strokeWidth={3} aria-hidden="true"/>}{card.verdict === 'right' ? 'Right' : 'Wrong'}</p>
      <p className="ct-move-how">{card.how}</p>
      <div className="ao-slim-diagram">{card.diagram}</div>
    </article>)}</div>
  </div>;
}

// ---- The film -----------------------------------------------------------------------------------

/**
 * The lesson's narrated film. The learner starts it; nothing autoplays. The written version renders only when the
 * learner opens it or the video fails, so it is never a second always-open copy of the narration.
 */
export function AndOrLecture({ lessonId }: { lessonId: string }) {
  const [failed, setFailed] = useState(false);
  const [read, setRead] = useState(false);
  const lecture = andOrLectures[lessonId];
  if (!lecture) return null;
  const media = andOrLectureMedia(lecture.slug);
  return <figure className="ct-lecture ao-lecture">
    <video controls preload="metadata" playsInline poster={media.poster} aria-label={`A short lecture: ${lecture.title}`} onError={() => setFailed(true)}>
      <source src={media.video} type="video/mp4" onError={() => setFailed(true)}/>
      <track kind="captions" src={media.captions} srcLang="en" label="English" default/>
      Your browser cannot play this video. The lesson is written out below.
    </video>
    {failed && <p role="alert" className="ct-lecture-error">The video couldn't load. The lesson is written out below.</p>}
    <details open={failed || undefined} onToggle={event => setRead(event.currentTarget.open)}><summary>Read what the video says</summary>{(read || failed) && <p>{andOrLectureTranscript(lessonId)}</p>}</details>
  </figure>;
}
