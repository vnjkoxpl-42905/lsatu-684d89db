import { useState } from 'react';
import { Check } from 'lucide-react';
import { demoAction, drillDemos, type DemoFrame } from '../content/drillDemos';
import './drill-demo.css';

function Frame({ frame }: { frame: DemoFrame }) {
  if (frame.kind === 'pick') {
    let order = 0;
    return <div className="dd-pick">
      <p className="dd-sentence">{frame.words.map((word, index) => {
        const picked = frame.picks.includes(index);
        const mark = frame.spans?.findIndex(([from, to]) => index >= from && index <= to);
        const delay = picked ? 0.3 + 0.35 * order++ : 0;
        return <span key={index} data-span={mark !== undefined && mark >= 0 ? mark + 1 : undefined} className={picked ? 'dd-word dd-picked' : 'dd-word'} style={picked ? { animationDelay: `${delay}s` } : undefined}>{word}</span>;
      })}</p>
      <span className="dd-chip" style={{ animationDelay: `${0.5 + 0.35 * frame.picks.length}s` }}>{frame.chip}</span>
    </div>;
  }
  if (frame.kind === 'type') return <div className="dd-type">{frame.lines.map((line, index) => <div key={index} className="dd-line">
    {line.label && <span className="dd-label">{line.label}</span>}
    <span className="dd-field"><span className="dd-typed" style={{ animationDelay: `${0.2 + index * 1.2}s` }}>{line.text}</span></span>
  </div>)}</div>;
  if (frame.kind === 'place') return <div className="dd-place">
    <div className="dd-slot"><span className="dd-label">Left: sufficient condition</span><span className="dd-card dd-card-left">{frame.left}</span></div>
    <span className="dd-arrow" aria-hidden="true">→</span>
    <div className="dd-slot"><span className="dd-label">Right: necessary condition</span><span className="dd-card dd-card-right">{frame.right}</span></div>
  </div>;
  return <div className="dd-choose">
    <p className="dd-question">{frame.question}</p>
    <div className="dd-options">{frame.options.map((option, index) => <span key={index} className={index === frame.correct ? 'dd-option dd-correct' : 'dd-option'}>
      <i>{index === frame.correct ? <Check size={13}/> : String.fromCharCode(65 + index)}</i>{option}
    </span>)}</div>
  </div>;
}

/**
 * Instruction-page walkthrough: one frame per step of this drill, in drill order.
 * Nothing plays on its own. The student clicks "Step 1. Click here to ..." and each step plays once when chosen.
 */
export function DrillDemo({ drillId }: { drillId: string }) {
  const demo = drillDemos[drillId];
  const [index, setIndex] = useState<number | null>(null);
  // Counts every click so choosing the same step again replays it.
  const [plays, setPlays] = useState(0);
  if (!demo) return null;
  const show = (next: number) => { setIndex(next); setPlays(count => count + 1); };
  const step = index === null ? null : demo.steps[index];
  const next = index === null ? 0 : index + 1 < demo.steps.length ? index + 1 : null;
  return <section className="dd-demo" aria-label="How this drill works">
    <p className="dd-eyebrow">How this drill works</p>
    {demo.sentence && <blockquote className="dd-example">Example: {demo.sentence}</blockquote>}
    <ol className="dd-steps">{demo.steps.map((item, i) => <li key={item.title}>
      <button type="button" aria-current={i === index ? 'step' : undefined} onClick={() => show(i)}><span>{i + 1}</span>{item.title}</button>
    </li>)}</ol>
    {step && index !== null && <div className="dd-stage" key={plays} aria-live="polite">
      <p className="dd-caption"><strong>Step {index + 1}.</strong> {step.caption}</p>
      <Frame frame={step.frame}/>
    </div>}
    {next !== null
      ? <button type="button" className="dd-next" onClick={() => show(next)}>Step {next + 1}. Click here to {demoAction(demo.steps[next])}.</button>
      : <button type="button" className="dd-next dd-next-quiet" onClick={() => show(0)}>Start again from Step 1</button>}
  </section>;
}
