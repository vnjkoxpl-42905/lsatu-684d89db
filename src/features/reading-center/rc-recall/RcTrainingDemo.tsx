import { useEffect, useState } from "react";

export const RC_TRAINING_DEMO_PARAGRAPHS = [
  "Millions of people worldwide play multiplayer online games. They each pick, say, a medieval character to play, such as a warrior. Then they might band together in quests to slay magical beasts; their avatars appear as tiny characters striding across a Tolkienesque land.",
  "The economist Edward Castronova noticed something curious about the game he played: it had its own economy, a bustling trade in virtual goods. Players generate goods as they play, often by killing creatures for their treasure and trading it. The longer they play, the wealthier they get.",
];
const paragraphs = RC_TRAINING_DEMO_PARAGRAPHS;

type Voice = "Instructor modelling" | "Your turn" | "In a real section";

interface DemoStep {
  tab: string;
  action: string;
  label: string;
  voice: Voice;
  /** Paragraph indices on screen. Empty means the text is hidden. */
  visible: number[];
  marks?: string[];
  note: string;
  /** An instructor's own example, always labelled as modelling and never offered as the answer to a test. */
  model?: { title: string; text: string };
  repair?: string;
  recording?: boolean;
}

/**
 * Bank passage PT140.S4.P2, taught in the order a student works: paragraph 1 first, then
 * paragraph 2, then both. The two recall steps show no answer. The one example
 * recall appears only after the learner's own attempt, labelled as the
 * instructor's, and it contains a real slip that the check finds and repairs.
 */
const STEPS: DemoStep[] = [
  {
    tab: "Read", action: "Hide paragraph", label: "1. Read paragraph 1", voice: "Your turn", visible: [0],
    note: "Read the whole paragraph. Put each idea into your own words in your head. In practice, press Space or Hide paragraph when you're ready. Choose Start exercise and allow microphone access before reading. Your microphone stays on while you read, recall and check.",
  },
  {
    tab: "Record", action: "Check recall", label: "2. Record your recall of paragraph 1", voice: "Your turn", visible: [], recording: true,
    note: "Explain the whole paragraph out loud in your own words, with the text hidden. In practice, press Space again or Check recall when you've finished. This demonstration does not use your microphone.",
  },
  {
    tab: "Check", action: "Next paragraph", label: "3. Check paragraph 1", voice: "Your turn", visible: [0],
    note: "Recording continues. Compare the text with what you remembered: what did you miss or change? Check your existing understanding instead of beginning a fresh read. Automatic feedback comes at the end of practice.",
  },
  {
    tab: "Read", action: "Hide paragraph", label: "1. Read paragraph 2", voice: "Your turn", visible: [1],
    note: "Read the next whole paragraph in your own words. Notice how it connects to paragraph 1. Then press Space or Hide paragraph.",
  },
  {
    tab: "Record", action: "Check recall", label: "2. Record your recall of paragraph 2", voice: "Your turn", visible: [], recording: true,
    note: "Retell paragraph 2 only, out loud, with its details and connections. In practice, press Space again to check. The source and example answer stay hidden while you recall.",
  },
  {
    tab: "Check", action: "Finish the example", label: "3. Check all the text read so far", voice: "Instructor modelling", visible: [0, 1], marks: ["its own economy", "virtual goods", "The longer they play, the wealthier they get"],
    note: "Recording continues. Check your recall against both paragraphs. Keep the connection between the game world and its economy, plus how players acquire and trade goods. Continue through the passage. You review automatic feedback after finishing practice, not at each checking step.",
  },
  {
    tab: "Finished", action: "Choose a passage", label: "At the end: review feedback", voice: "Instructor modelling", visible: [0], marks: ["might band together", "such as a warrior"],
    model: { title: "Illustrative feedback, not a real attempt", text: "Example transcript: They all play as warriors and team up to fight magical beasts." },
    note: "Complete practice and save your result, then choose Get feedback on my recall. Only hidden recall speech is graded, using 2 points for complete meaning, 1 for partial meaning and 0 for missing or changed meaning. Reading and checking speech are excluded. Review what your explanation kept, missed or changed. A whole-passage recall is optional. Silent recalls and unusable recordings are not automatically graded.",
    repair: "In this example, the recall makes two details too strong. A warrior is one possible character, and players might team up. The text does not say they all do. Keep those qualifications in your next recall.",
  },
];

/** Shows `text` with each phrase in `marks` highlighted. */
function Marked({ text, marks = [] }: { text: string; marks?: string[] }) {
  const hit = marks.find((m) => text.includes(m));
  if (!hit) return <>{text}</>;
  const at = text.indexOf(hit);
  return <>{text.slice(0, at)}<mark>{hit}</mark><Marked text={text.slice(at + hit.length)} marks={marks} /></>;
}

/** The opening of Passage A from the same bank passage used by the RC examples. No attempt is created. */
export default function RcTrainingDemo({ onStartPractice }: { onStartPractice?: () => void } = {}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const step = STEPS[index];
  const hidden = step.visible.length === 0;
  const last = index === STEPS.length - 1;
  useEffect(() => {
    if (!playing) return;
    const delays = [18000, 12000, 22000, 18000, 12000, 22000, 8000];
    const timer = window.setTimeout(() => {
      if (last) setPlaying(false);
      else setIndex((current) => current + 1);
    }, delays[index]);
    return () => window.clearTimeout(timer);
  }, [playing, index, last]);

  const advance = () => {
    setPlaying(false);
    if (!last) { setIndex(index + 1); return; }
    if (onStartPractice) onStartPractice();
    else {
      const target = document.getElementById("rc-recall-start");
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    }
  };

  return <div id="rc-training-example" tabIndex={-1} className="rct-demo" role="group" aria-label="Interactive method demonstration">
    <div className="rct-demo-bar">
      <span className="rct-demo-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>Let's start with one paragraph</span>
      <span className="rct-demo-count">Step {index + 1} of {STEPS.length}</span>
    </div>
    <div className="rct-demo-watch"><span>Online Game Currencies · PT140, Section 4, Passage 2</span><button type="button" onClick={() => { if (last && !playing) setIndex(0); setPlaying(!playing); }}>{playing ? "Pause demo" : "Watch demo"}</button></div>
    <ol className="rct-demo-progress" aria-label="The three steps">
      {["Read", "Record", "Check"].map((label, i) => <li key={label} aria-current={step.tab === label ? "step" : undefined}><span>{i + 1}</span>{label}</li>)}
    </ol>
    <div className="rct-demo-body" aria-live={playing ? "off" : "polite"}>
      <div className="rct-demo-label">{step.label}<span className="rct-demo-badge" data-voice={step.voice}>{step.voice}</span></div>
      {!last && <p role="status" className="rct-demo-badge">Recording shown in demo. Your microphone is off.</p>}
      {hidden ? <div className="rct-demo-hidden">
        <span className="rct-hidden-lines" aria-hidden="true"><i /><i /><i /></span>
        <h3>{last ? "Now try a passage yourself." : "The text is hidden. Recall it now."}</h3>
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
    <div className="rct-demo-footer">
      <span>{playing ? "Playing. Pause to work at your own pace." : "Try each step at your own pace."}</span>
      <div className="rct-demo-controls">
        {index > 0 && <button type="button" className="rct-demo-back" onClick={() => { setPlaying(false); setIndex(last ? 0 : index - 1); }}>{last ? "Try the example again" : "Back"}</button>}
        <button type="button" onClick={advance}>{step.action}<span aria-hidden="true">↗</span></button>
      </div>
    </div>
  </div>;
}
