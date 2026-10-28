import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { drillDemos, type DemoFrame } from '../content/drillDemos';
import './drill-demo.css';

const STEP_MS = 5200;

function reducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function Frame({ frame }: { frame: DemoFrame }) {
  if (frame.kind === 'pick') {
    let order = 0;
    return <div className="dd-pick">
      <p className="dd-sentence">{frame.words.map((word, index) => {
        const picked = frame.picks.includes(index);
        const delay = picked ? 0.7 + 0.7 * order++ : 0;
        return <span key={index} className={picked ? 'dd-word dd-picked' : 'dd-word'} style={picked ? { animationDelay: `${delay}s` } : undefined}>{word}</span>;
      })}</p>
      <span className="dd-chip" style={{ animationDelay: `${0.9 + 0.7 * frame.picks.length}s` }}>{frame.chip}</span>
    </div>;
  }
  if (frame.kind === 'type') return <div className="dd-type">{frame.lines.map((line, index) => <div key={index} className="dd-line">
    {line.label && <span className="dd-label">{line.label}</span>}
    <span className="dd-field"><span className="dd-typed" style={{ animationDelay: `${0.4 + index * 1.4}s` }}>{line.text}</span></span>
  </div>)}</div>;
  if (frame.kind === 'place') return <div className="dd-place">
    <div className="dd-slot"><span className="dd-label">Enough (left)</span><span className="dd-card dd-card-left">{frame.left}</span></div>
    <span className="dd-arrow" aria-hidden="true">→</span>
    <div className="dd-slot"><span className="dd-label">Required (right)</span><span className="dd-card dd-card-right">{frame.right}</span></div>
  </div>;
  return <div className="dd-choose">
    <p className="dd-question">{frame.question}</p>
    <div className="dd-options">{frame.options.map((option, index) => <span key={index} className={index === frame.correct ? 'dd-option dd-correct' : 'dd-option'}>
      <i>{index === frame.correct ? <Check size={13}/> : String.fromCharCode(65 + index)}</i>{option}
    </span>)}</div>
  </div>;
}

/** Instruction-page walkthrough: one animated frame per step of this drill, in drill order. */
export function DrillDemo({ drillId }: { drillId: string }) {
  const demo = drillDemos[drillId];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(reducedMotion);
  useEffect(() => {
    if (!demo || paused) return;
    const timer = setTimeout(() => setIndex(current => (current + 1) % demo.steps.length), STEP_MS);
    return () => clearTimeout(timer);
  }, [demo, index, paused]);
  if (!demo) return null;
  const step = demo.steps[index];
  return <section className="dd-demo" aria-label="How this drill works">
    <p className="dd-eyebrow">How this drill works</p>
    {demo.sentence && <blockquote className="dd-example">Example: {demo.sentence}</blockquote>}
    <ol className="dd-steps">{demo.steps.map((item, i) => <li key={item.title}>
      <button type="button" aria-current={i === index ? 'step' : undefined} onClick={() => { setIndex(i); setPaused(true); }}><span>{i + 1}</span>{item.title}</button>
    </li>)}</ol>
    <div className="dd-stage" key={index} aria-live="polite">
      <p className="dd-caption"><strong>Step {index + 1}.</strong> {step.caption}</p>
      <Frame frame={step.frame}/>
    </div>
    {demo.steps.length > 1 && <div className="dd-progress" aria-hidden="true"><i key={`${index}-${paused}`} className={paused ? 'dd-bar-paused' : ''} style={{ animationDuration: `${STEP_MS}ms` }}/></div>}
  </section>;
}
