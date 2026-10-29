import { useEffect, useId, useReducer, useRef, useState } from 'react';
import { useCourseProgress } from '../courseProgress';
import { atom, equivalent, implies, not, or, and } from '../content/fullCourseLogic';
import type { Formula } from '../content/fullCourseTypes';

export type TeachingIdea = { id: string; word: string; positive: string; negative: string; originalNot?: boolean };
type Side = 'if' | 'then';
export type BoardState = { selected: number | null; sides: [number | null, number | null]; negatives: [boolean, boolean]; status: 'editing' | 'hint' | 'success' | 'revealed'; misses: number };
export type BoardAction = { type: 'select'; index: number } | { type: 'place'; side: Side; index?: number } | { type: 'negate'; side: Side } | { type: 'reset' } | { type: 'check'; correct: boolean } | { type: 'reveal'; family: 3 | 4; original: boolean[] };
export const blankBoard = (): BoardState => ({ selected: null, sides: [null, null], negatives: [false, false], status: 'editing', misses: 0 });
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  if (action.type === 'reset') return blankBoard();
  if (action.type === 'select') return { ...state, selected: action.index };
  if (action.type === 'check') return { ...state, status: action.correct ? 'success' : 'hint', misses: state.misses + (action.correct ? 0 : 1) };
  if (action.type === 'reveal') return { ...state, sides: [0, 1], negatives: [action.family === 3, action.family === 4], status: 'revealed' };
  const position = action.side === 'if' ? 0 : 1;
  if (action.type === 'negate') { const negatives = [...state.negatives] as [boolean, boolean]; if (state.sides[position] !== null) negatives[position] = !negatives[position]; return { ...state, negatives, status: 'editing' }; }
  const index = action.index ?? state.selected;
  if (index === null || index === undefined) return state;
  const sides = [...state.sides] as BoardState['sides'];
  const negatives = [...state.negatives] as BoardState['negatives'];
  const oldPosition = sides.indexOf(index);
  if (oldPosition >= 0 && oldPosition !== position) { sides[oldPosition] = null; negatives[oldPosition] = false; }
  // A newly placed idea always starts exactly as it appeared in the sentence.
  if (sides[position] !== index) negatives[position] = false;
  sides[position] = index;
  return { ...state, sides, negatives, selected: index, status: 'editing' };
}
export function boardCorrect(state: BoardState, ideas: TeachingIdea[], family: 3 | 4) {
  if (state.sides.some(i => i === null) || state.sides[0] === state.sides[1]) return false;
  const original = (i: number): Formula => ideas[i].originalNot ? not(atom(ideas[i].id)) : atom(ideas[i].id);
  const placed = (position: number) => state.negatives[position] ? not(original(state.sides[position]!)) : original(state.sides[position]!);
  const target = family === 3 ? or(original(0), original(1)) : not(and(original(0), original(1)));
  return equivalent(implies(placed(0), placed(1)), target).correct;
}
export function IdeaWord({ idea, negated = false }: { idea: TeachingIdea; negated?: boolean }) {
  const negative = !!idea.originalNot !== negated;
  return <span className="ib-word" data-negated={negative}><span className="fc-u-sr">{negative ? 'not ' : ''}</span>{idea.word}</span>;
}
type BoardProps = { sentence: string; ideas: [TeachingIdea, TeachingIdea]; family: 3 | 4; guided?: boolean; title?: string; instanceId?: string };
export function IdeaBoard(props: BoardProps) {
  const course = useCourseProgress();
  const storageKey = `conditional-formative-v1:${course?.storageScope ?? 'preview'}:${props.family}:${props.sentence}${props.instanceId ? `:${props.instanceId}` : ''}`;
  return <IdeaBoardRun key={storageKey} {...props} storageKey={storageKey}/>;
}
function IdeaBoardRun({ sentence, ideas, family, guided = false, title = 'Build the rule', storageKey }: BoardProps & { storageKey: string }) {
  const [state, dispatch] = useReducer(boardReducer, undefined, () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (Array.isArray(saved?.sides) && saved.sides.length === 2 && saved.sides.every((n: unknown) => n === null || n === 0 || n === 1) && (saved.sides[0] === null || saved.sides[0] !== saved.sides[1]) && Array.isArray(saved.negatives) && saved.negatives.length === 2 && saved.negatives.every((n: unknown) => typeof n === 'boolean') && [null, 0, 1].includes(saved.selected) && Number.isInteger(saved.misses) && saved.misses >= 0 && ['editing', 'hint', 'success', 'revealed'].includes(saved.status)) {
        const next = { ...blankBoard(), ...saved } as BoardState;
        if ((next.status === 'success' || next.status === 'revealed') && !boardCorrect(next, ideas, family)) next.status = 'editing';
        return next;
      }
    } catch { /* Formative work can remain in memory. */ }
    return blankBoard();
  });
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Course credit is independent of this optional device state. */ } }, [state, storageKey]);
  const id = useId();
  const [dragging, setDragging] = useState<number | null>(null);
  const pointer = useRef<{ index: number; x: number; y: number } | null>(null);
  const resolved = state.status === 'success' || state.status === 'revealed';
  const read = (position: number) => { const idea = ideas[state.sides[position]!]; return (!!idea.originalNot !== state.negatives[position]) ? idea.negative : idea.positive; };
  const place = (side: Side, index?: number) => dispatch({ type: 'place', side, index });
  return <section className="idea-board" aria-labelledby={id}>
    <h3 id={id}>{title}</h3><p className="ib-sentence">{sentence}</p>
    <p>{guided ? `Choose either idea for IF. ${family === 3 ? 'Negate that idea. Put the other on THEN unchanged.' : 'Keep it unchanged. Put the other on THEN and negate it.'}` : 'Choose an idea, then choose IF or THEN. You can also drag it. Apply the method yourself, then check.'}</p>
    <div className="ib-palette">{ideas.map((idea, index) => <button key={idea.id} type="button" data-dragging={dragging === index} aria-pressed={state.selected === index} onClick={() => dispatch({ type: 'select', index })}
      onPointerDown={event => { pointer.current = { index, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture?.(event.pointerId); }}
      onPointerMove={event => { const start = pointer.current; if (start && Math.hypot(start.x - event.clientX, start.y - event.clientY) >= 8) setDragging(index); }}
      onPointerCancel={() => { pointer.current = null; setDragging(null); }}
      onPointerUp={event => { const start = pointer.current; pointer.current = null; setDragging(null); if (!start || Math.hypot(start.x - event.clientX, start.y - event.clientY) < 8) return; const target = document.elementFromPoint?.(event.clientX, event.clientY)?.closest('[data-idea-side]'); if (target?.closest('.idea-board') !== event.currentTarget.closest('.idea-board')) return; const side = target?.getAttribute('data-idea-side'); if (side === 'if' || side === 'then') place(side, index); }}>
      <IdeaWord idea={idea}/><span>{idea.originalNot ? idea.negative : idea.positive}</span></button>)}</div>
    <p className="ib-drag-status fc-u-sr" aria-live="polite">{dragging !== null ? `Moving ${ideas[dragging].word}. Drop it on IF or THEN.` : ''}</p>
    <div className="ib-slots">{(['if', 'then'] as Side[]).map((side, position) => <div key={side} className="ib-slot" data-dragging={dragging !== null} data-idea-side={side}>
      <h4>{side === 'if' ? 'IF · sufficient condition' : 'THEN · necessary condition'}</h4>
      <div className="ib-placed" aria-live="polite">{state.sides[position] === null ? 'Place an idea here' : <><IdeaWord idea={ideas[state.sides[position]!]} negated={state.negatives[position]}/><span>{read(position)}</span></>}</div>
      <div className="ib-controls"><button type="button" disabled={state.selected === null} onClick={() => place(side)}>Place on {side.toUpperCase()}</button><button type="button" disabled={state.sides[position] === null} onClick={() => dispatch({ type: 'negate', side })}>Negate {side.toUpperCase()} idea</button></div>
    </div>)}</div>
    <div className="fc-actions"><button type="button" className="fc-primary" onClick={() => dispatch({ type: 'check', correct: boardCorrect(state, ideas, family) })}>Check this rule</button><button type="button" onClick={() => dispatch({ type: 'reset' })}>Reset board</button>{state.misses > 0 && !resolved && <button type="button" onClick={() => dispatch({ type: 'reveal', family, original: ideas.map(i => !!i.originalNot) })}>Show one answer</button>}</div>
    <div role="status" className="ib-feedback" aria-live="polite">{state.status === 'hint' && <p>{state.sides.some(i => i === null) ? 'Place one different idea on each side first.' : family === 3 ? 'Negate the idea on IF. The idea on THEN must keep its original meaning, including any original negative.' : 'Keep the IF idea as stated. Negate the other idea on THEN. If it already says not, negating removes that negative.'}</p>}{resolved && <><strong>{state.status === 'success' ? 'This says the same thing.' : 'One answer, explained'}</strong><p>If {read(0)}, then {read(1)}.</p><p>{family === 3 ? 'The IF idea was negated; the other stayed unchanged.' : 'The IF idea stayed unchanged; the THEN idea was negated.'} Now reset and start from the other idea.</p></>}</div>
  </section>;
}
