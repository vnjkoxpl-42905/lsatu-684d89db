import React from 'react';
import { createRoot } from 'react-dom/client';
import { RcTimedReader } from '../../src/components/timed/RcTimedReader';
import type { RcHighlight, RcPassage } from '../../src/features/rc/lib/rcTypes';
import type { TimedChildAnswer } from '../../src/lib/timedChildController';
import '../../src/index.css';

const bank = await fetch('/data/rc/RC-PT125.json').then(response => response.json()) as { passages: RcPassage[] };
const passage = bank.passages.find(item => item.passageId === 483)!;
function Fixture() {
  const [index, setIndex] = React.useState(0);
  const [find, setFind] = React.useState('');
  const [blocked, setBlocked] = React.useState(false);
  const [only, setOnly] = React.useState(false);
  const [marks, setMarks] = React.useState<RcHighlight[]>([]);
  const [answers, setAnswers] = React.useState<Record<number, TimedChildAnswer>>({});
  const question = passage.questions[index];
  const answer = answers[question.questionId] ?? { selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [] };
  const save = (next: TimedChildAnswer) => setAnswers(value => ({ ...value, [question.questionId]: next }));
  return <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', padding: 8, gap: 8 }}>
    <h1>Comparative reader fixture</h1>
    <p>PT125 · Drilling Muds. Local memory only; no account, clock or answer writes.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <label>Question <select value={index} onChange={event => setIndex(Number(event.target.value))}>{passage.questions.map((item, position) => <option key={item.questionId} value={position}>{position + 1}</option>)}</select></label>
      <label>Find <input value={find} onChange={event => setFind(event.target.value)} /></label>
      <label><input type="checkbox" checked={blocked} onChange={event => setBlocked(event.target.checked)} /> Simulate blocked input</label>
      <label><input type="checkbox" checked={only} onChange={event => setOnly(event.target.checked)} /> Passage only</label>
    </div>
    <RcTimedReader item={{ passage, question, number: index + 1, passageIndex: 0 }} answer={answer} blocked={blocked}
      fontScale={1} find={find} marker="select" color="yellow" onColorChange={() => undefined} passageOnly={only}
      marks={marks} onMarksChange={setMarks} scrollTop={0} onScrollTop={() => undefined}
      onSelect={letter => save({ ...answer, selected: letter })}
      onToggleElimination={letter => save({ ...answer, eliminations: answer.eliminations.includes(letter) ? answer.eliminations.filter(item => item !== letter) : [...answer.eliminations, letter] })}
      onToggleFlag={() => save({ ...answer, flagged: !answer.flagged })} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
