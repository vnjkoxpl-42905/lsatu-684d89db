import { useState } from "react";

const passage = [
  "A museum moved its evening lectures from Fridays to Wednesdays. Attendance rose, but the director cautioned that the new schedule might not explain the increase.",
  "At the same time, the museum had made the lectures free for students. To separate the effects of price and scheduling, the director proposed keeping admission free while moving the lectures back to Fridays.",
];

/** Original illustrative text. This demonstration never creates an attempt. */
export default function RcTrainingDemo() {
  const [stage, setStage] = useState(0);
  const stages = ["Read", "Recall", "Check"];

  return <div className="rct-demo" aria-label="Interactive method demonstration">
    <div className="rct-demo-bar">
      <span className="rct-demo-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>A passage, paragraph by paragraph</span>
      <span className="rct-demo-count">2 / 2</span>
    </div>
    <div className="rct-demo-tabs" aria-label="Demonstration steps">
      {stages.map((label, i) => <button type="button" key={i} aria-pressed={stage === i} onClick={() => setStage(i)}>
        <span>{i + 1}</span>{label}
      </button>)}
    </div>
    <div className="rct-demo-body" aria-live="polite">
      {stage === 0 ? <>
        <details className="rct-demo-previous"><summary>Previously: the museum changed its lecture schedule.</summary><p className="rct-demo-context">{passage[0]}</p></details>
        <div className="rct-demo-label">Paragraph 2 <span>Read the whole paragraph</span></div>
        <p className="rct-demo-passage">{passage[1]}</p>
        <p className="rct-demo-hint">Put the reasoning into your own words. The director wants to change one thing at a time.</p>
      </> : stage === 1 ? <div className="rct-demo-hidden">
        <span className="rct-hidden-lines" aria-hidden="true"><i /><i /><i /></span>
        <h3>The text is out of sight.</h3>
        <p>Silently retell paragraph 2 in your own words. This is what a complete recall could sound like:</p>
        <blockquote className="rct-demo-example">The museum also made the lectures free for students. The director wants to find out whether the price or the day caused attendance to rise, so keep admission free and move the lectures back to Fridays.</blockquote>
      </div> : <>
        <div className="rct-demo-label">Check your recall<span>Silent check</span></div>
        <p className="rct-demo-context">{passage[0]}</p><p className="rct-demo-passage rct-demo-check">At the same time, the museum had made the lectures <mark>free for students</mark>. To separate the effects of price and scheduling, the director proposed <mark>keeping admission free</mark> while moving the lectures <mark>back to Fridays</mark>.</p>
        <p className="rct-demo-hint">Check the details and connections you recalled. Then move to the next paragraph.</p>
      </>}
    </div>
    <div className="rct-demo-footer"><span>Illustration using original text</span><button type="button" onClick={() => setStage((stage + 1) % 3)}>{stage === 2 ? "Try again" : `Next: ${stages[stage + 1]}`}<span aria-hidden="true">↗</span></button></div>
  </div>;
}
