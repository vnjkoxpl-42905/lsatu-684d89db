import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { displayWord, groupSentence, groupSide, indicatorWordCards, type IndicatorGroup } from '../content/indicatorWordCards';
import { useCourseStep } from '../courseProgress';
import { advance, cardById, isFinished, newRound, pick, readDeckState, summarize, type DeckState } from '../indicatorWordDeck';
import { IndicatorCardBack } from './IndicatorCardBack';
import './indicator-word-deck.css';

export const INDICATOR_DECK_STEP = 'flashcards-indicators';
const DEVICE_KEY = 'conditional-indicator-words-v1';

function readDevice(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

export function IndicatorWordDeck(props: { stepId?: string; group?: IndicatorGroup; storageScope?: string }) {
  return <IndicatorWordDeckRun key={`${props.storageScope ?? 'legacy'}:${props.group ?? 'all'}`} {...props}/>;
}

/** One word per card. The student commits to a group, the card flips, and the back says which group it was. */
function IndicatorWordDeckRun({ storageScope, group, stepId = group ? `${INDICATOR_DECK_STEP}-group-${group}` : INDICATOR_DECK_STEP }: { stepId?: string; group?: IndicatorGroup; storageScope?: string }) {
  const cards = indicatorWordCards.filter(card => !group || card.group === group);
  const legacyKey = group ? `${DEVICE_KEY}-group-${group}` : DEVICE_KEY;
  const deviceKey = storageScope ? `${legacyKey}:${storageScope}` : legacyKey;
  const course = useCourseStep(stepId);
  const record = course?.record;
  const [state, setState] = useState<DeckState>(() => readDeckState(course?.saved?.state, cards) ?? readDeckState(readDevice(deviceKey), cards) ?? newRound(undefined, Math.random, cards));
  const next = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const finished = isFinished(state);
  const touched = state.picked !== null || state.index > 0 || state.round > 1;

  // Every answer is saved to the account, so the student can leave and pick up on the same card in the same order.
  useEffect(() => {
    if (touched) record?.({ state, done: Math.min(state.index + (state.picked !== null ? 1 : 0), state.queue.length), total: state.queue.length, ...(finished ? { status: 'done' as const } : {}) });
    try { localStorage.setItem(deviceKey, JSON.stringify(state)); } catch { /* the account copy still holds it */ }
  }, [state, record, touched, finished, deviceKey]);
  useEffect(() => { if (state.picked !== null) next.current?.focus({ preventScroll: true }); }, [state.picked]);
  useEffect(() => { if (finished) heading.current?.focus({ preventScroll: true }); }, [finished]);

  const progress = <div className="iw-progress" role="progressbar" aria-label="Cards done" aria-valuemin={0} aria-valuemax={state.queue.length} aria-valuenow={Math.min(state.index, state.queue.length)}><span style={{ width: `${Math.min(state.index, state.queue.length) / state.queue.length * 100}%` }}/></div>;

  if (finished) {
    const summary = summarize(state);
    return <section className="iw-deck" aria-label="Indicator word flashcards">
      {progress}
      <div className="iw-summary">
        <h2 ref={heading} tabIndex={-1}>{summary.right} right first time.</h2>
        <p>{summary.missed === 0 ? 'No card needed a second look.' : `${summary.missed} needed a second look.`}{summary.stillMissing.length > 0 && ` Still to practice: ${summary.stillMissing.join(', ')}.`}</p>
        {state.earlier.length > 0 && <p className="iw-earlier">Earlier rounds: {state.earlier.map((r, i) => `Round ${i + 1}, ${r.right} of ${r.total}`).join(' · ')}.</p>}
        <button type="button" className="iw-primary" onClick={() => setState(previous => newRound(previous, Math.random, cards))}><RotateCcw size={17} aria-hidden="true"/>Go again</button>
      </div>
    </section>;
  }

  const entry = state.queue[state.index];
  const card = cardById(entry.id)!;
  const answered = state.picked !== null;
  const right = answered && state.picked === card.group;
  const firstCount = cards.length;
  const position = entry.retry ? `Second look ${state.index - firstCount + 1} of ${state.queue.length - firstCount}` : `Card ${state.index + 1} of ${firstCount}`;
  const lastCard = state.index === state.queue.length - 1;
  const choose = (group: IndicatorGroup) => setState(previous => pick(previous, group));

  return <section className="iw-deck" aria-label="Indicator word flashcards">
    {progress}
    <p className="iw-count">{position}</p>
    <div className="iw-stage" data-result={answered ? (right ? 'right' : 'wrong') : undefined}>
      <div className="iw-card" data-flipped={answered}>
        <div className="iw-face iw-front" aria-hidden={answered}>
          <span className="iw-eyebrow">Which group?</span>
          <span className="iw-word">{displayWord(card.word)}</span>
        </div>
        <div className="iw-face iw-back" aria-hidden={!answered}>
          <IndicatorCardBack card={card} verdict={right ? 'Correct' : 'Not quite'}/>
        </div>
      </div>
    </div>
    <p className="iw-sr" role="status">{answered ? `${right ? 'Correct' : 'Not quite'}. ${displayWord(card.word)}. ${groupSentence(card.group)} Put the idea on the ${groupSide(card.group)} side.` : ''}</p>
    {answered
      ? <button ref={next} type="button" className="iw-primary" onClick={() => setState(advance)}>{lastCard ? 'See my results' : 'Next card'}<ArrowRight size={17} aria-hidden="true"/></button>
      : <div className="iw-choices" role="group" aria-label={`Which group is ${card.word}?`}>
        <button type="button" onClick={() => choose(1)}>Group 1</button>
        <button type="button" onClick={() => choose(2)}>Group 2</button>
      </div>}
  </section>;
}
