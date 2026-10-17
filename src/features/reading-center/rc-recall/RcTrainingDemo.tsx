import { useState } from "react";

const paragraphs = [
  "A museum moved its evening lectures from Fridays to Wednesdays. Attendance rose by a third, but the director warned that the schedule change may not be the cause.",
  "In the same month, the museum made the lectures free for students. To separate the effects of price and schedule, the director proposed keeping admission free while moving the lectures back to Fridays.",
];

type Voice = "Instructor modelling" | "Your turn" | "In a real section";

interface DemoStep {
  tab: string;
  label: string;
  voice: Voice;
  /** Paragraph indices on screen. Empty means the text is hidden. */
  visible: number[];
  marks?: string[];
  note: string;
  /** An instructor's own example, always labelled as modelling and never offered as the answer to a test. */
  model?: { title: string; text: string };
  repair?: string;
}

/**
 * Original text, taught in the order a student works: paragraph 1 first, then
 * paragraph 2, then both. The two recall steps show no answer. The one example
 * recall appears only after the learner's own attempt, labelled as the
 * instructor's, and it contains a real slip that the check finds and repairs.
 */
const STEPS: DemoStep[] = [
  {
    tab: "Read 1", label: "Paragraph 1: read the whole paragraph", voice: "Instructor modelling", visible: [0],
    note: "Put each idea into your own words as you read, with a brief reaction. For example: \"Attendance rose by a third. Good news, but the director is hedging. Could something else explain the increase?\" Then hide the text.",
  },
  {
    tab: "Recall 1", label: "Paragraph 1: hide it and recall it", voice: "Your turn", visible: [],
    note: "The text is out of sight. Retell paragraph 1 in your own words, in your head. Keep the numbers and the director's caution. Nothing is shown here on purpose. This is where you find out what you can explain without the page.",
  },
  {
    tab: "Check 1", label: "Paragraph 1: check your recall", voice: "Instructor modelling", visible: [0], marks: ["may not be the cause"],
    model: { title: "An instructor's recall that slips", text: "The museum moved its lectures to Wednesdays and attendance went up by a third, so the new schedule worked." },
    note: "Now compare. You check what you remember against the text. You do not start a fresh read.",
    repair: "What was lost: the director's qualification. The recall says the schedule worked. The paragraph says it may not be the cause. A repaired recall: \"The museum moved its evening lectures from Fridays to Wednesdays. Attendance rose by a third, but the director warned that the schedule change might not explain the increase.\"",
  },
  {
    tab: "Read 2", label: "Paragraph 2: read the whole paragraph", voice: "Instructor modelling", visible: [1],
    note: "Same routine, new paragraph. A brief reaction: \"So this is the other change. Price. He wants to test one thing at a time.\" Then hide the text.",
  },
  {
    tab: "Recall 2", label: "Paragraph 2: hide it and recall it", voice: "Your turn", visible: [],
    note: "Recall paragraph 2 only. Do not retell paragraph 1 here. Keep what the museum changed and what the director proposed.",
  },
  {
    tab: "Check both", label: "Paragraphs 1 and 2: check what you have read", voice: "Instructor modelling", visible: [0, 1], marks: ["may not be the cause", "free for students", "keeping admission free", "back to Fridays"],
    note: "Check your recall of paragraph 2, then look at both paragraphs together. Does paragraph 2 explain the caution in paragraph 1? It does: price is the competing explanation, so the director wants to change one thing at a time.",
  },
  {
    tab: "Passage end", label: "End of the passage", voice: "In a real section",
    visible: [],
    note: "You may recall the whole passage with the text hidden, silently or out loud. Only an out loud recall is recorded. It is optional, so you can also continue to the next passage. Your recall is never graded.",
  },
];

/** Shows `text` with each phrase in `marks` highlighted. */
function Marked({ text, marks = [] }: { text: string; marks?: string[] }) {
  const hit = marks.find((m) => text.includes(m));
  if (!hit) return <>{text}</>;
  const at = text.indexOf(hit);
  return <>{text.slice(0, at)}<mark>{hit}</mark><Marked text={text.slice(at + hit.length)} marks={marks} /></>;
}

/** Original illustrative text. This demonstration never creates an attempt. */
export default function RcTrainingDemo() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const hidden = step.visible.length === 0;
  const last = index === STEPS.length - 1;

  return <div className="rct-demo" role="group" aria-label="Interactive method demonstration">
    <div className="rct-demo-bar">
      <span className="rct-demo-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>One passage, paragraph by paragraph</span>
      <span className="rct-demo-count">Step {index + 1} of {STEPS.length}</span>
    </div>
    <div className="rct-demo-tabs" aria-label="Demonstration steps">
      {STEPS.map((s, i) => <button type="button" key={s.tab} aria-pressed={index === i} onClick={() => setIndex(i)}>
        <span>{i + 1}</span>{s.tab}
      </button>)}
    </div>
    <div className="rct-demo-body" aria-live="polite">
      <div className="rct-demo-label">{step.label}<span className="rct-demo-badge" data-voice={step.voice}>{step.voice}</span></div>
      {hidden ? <div className="rct-demo-hidden">
        <span className="rct-hidden-lines" aria-hidden="true"><i /><i /><i /></span>
        <h3>{index === STEPS.length - 1 ? "Optional passage recall" : "The text is out of sight."}</h3>
      </div> : <>
        {step.model && <figure className="rct-demo-example-block">
          <figcaption>{step.model.title}</figcaption>
          <blockquote className="rct-demo-example">{step.model.text}</blockquote>
        </figure>}
        {step.visible.map((i) => <p key={i} className="rct-demo-passage rct-demo-check"><span className="rct-demo-paragraph-number">Paragraph {i + 1}</span> <Marked text={paragraphs[i]} marks={step.marks} /></p>)}
      </>}
      <p className="rct-demo-hint">{step.note}</p>
      {step.repair && <p className="rct-demo-repair">{step.repair}</p>}
    </div>
    <div className="rct-demo-footer"><span>Illustration using original text</span><button type="button" onClick={() => setIndex(last ? 0 : index + 1)}>{last ? "Watch again" : `Next: ${STEPS[index + 1].tab}`}<span aria-hidden="true">↗</span></button></div>
  </div>;
}
