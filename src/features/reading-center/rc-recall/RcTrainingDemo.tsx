import { useState } from "react";
import type { RecallMode } from "./lib/sequence";

const passage = [
  "A museum moved its evening lectures from Fridays to Wednesdays. Attendance rose, but the director cautioned that the new schedule might not explain the increase.",
  "At the same time, the museum had made the lectures free for students. To separate the effects of price and scheduling, the director proposed keeping admission free while moving the lectures back to Fridays.",
];

/** Original illustrative text. This demonstration never creates an attempt. */
export default function RcTrainingDemo({ mode }: { mode: RecallMode }) {
  const [stage, setStage] = useState(0);
  const cumulative = mode === "cumulative_recall";
  const stages = cumulative ? ["Read", "Recall", "Retell together"] : ["Read", "Recall", "Check"];

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
        <p className="rct-demo-context"><strong>Paragraph 1.</strong> {passage[0]}</p>
        <div className="rct-demo-label">Paragraph 2 <span>Read, translate, quip</span></div>
        <p className="rct-demo-passage">{passage[1]}</p>
        <p className="rct-demo-hint">Put the reasoning into your own words. The director wants to change one thing at a time.</p>
      </> : stage === 1 ? <div className="rct-demo-hidden">
        <span className="rct-hidden-lines" aria-hidden="true"><i /><i /><i /></span>
        <h3>The text is out of sight.</h3>
        <p>{cumulative ? "First, retell paragraph 2 on its own. Next, you’ll retell paragraphs 1 and 2 together, still with the text hidden." : "Retell paragraph 2 silently. Include the free admission, the students, and the director’s proposed test."}</p>
      </div> : <>
        <div className="rct-demo-label">{cumulative ? "Example recall" : "Confirm your translation"}<span>{cumulative ? "Paragraphs 1 + 2" : "Silent check"}</span></div>
        {cumulative ? <p className="rct-demo-recall">“The museum moved evening lectures from Fridays to Wednesdays and attendance went up. The director wasn’t sure the schedule caused it: lectures also became free for students. Keep them free, move back to Fridays, and see what happens.”</p>
          : <><p className="rct-demo-context">{passage[0]}</p><p className="rct-demo-passage rct-demo-check">At the same time, the museum had made the lectures <mark>free for students</mark>. To separate the effects of price and scheduling, the director proposed <mark>keeping admission free</mark> while moving the lectures <mark>back to Fridays</mark>.</p></>}
      </>}
    </div>
    <div className="rct-demo-footer"><span>Illustration using original text</span><button type="button" onClick={() => setStage((stage + 1) % 3)}>{stage === 2 ? "Try again" : `Next: ${stages[stage + 1]}`}<span aria-hidden="true">↗</span></button></div>
  </div>;
}
