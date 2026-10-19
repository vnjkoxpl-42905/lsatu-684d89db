import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import RcTrainingVideo from "./RcTrainingVideo";
import "./RcTraining.css";

const practicePath = "/reading-center/rc-recall/passages";

export default function RcTrainingInstructions() {
  const location = useLocation();
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (!target) return;
    target.scrollIntoView?.({ block: "start" });
    target.focus({ preventScroll: true });
  }, [location.hash, location.key]);
  return <main className="rct-page rct-entry-page">
    <div className="rct-content">
      <header className="rct-section-heading">
        <div><h1 className="text-3xl font-semibold tracking-tight">RC Training</h1>
          <p>Read one paragraph, hide it, explain it aloud, then check what you remembered.</p></div>
        <Link to={practicePath} className="rct-button rct-button-primary">Enter RC Training<ArrowRight size={16} aria-hidden="true" /></Link>
      </header>
      <div className="rct-entry-workspace">
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-steps">
        <h2 id="rc-instructions-steps" tabIndex={-1} className="text-xl font-semibold">Work through one paragraph at a time</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6">
          <li><strong>Start exercise.</strong> Allow microphone access. The paragraph appears once recording starts. Your microphone stays on throughout practice.</li>
          <li><strong>Read the whole paragraph.</strong> Put each idea into your own words in your head. Keep its details and connections.</li>
          <li><strong>Hide it and explain it aloud.</strong> Press <strong>Space</strong> or <strong>Hide paragraph</strong>. Retell the whole paragraph from memory in your own words.</li>
          <li><strong>Check.</strong> Press <strong>Space</strong> or <strong>Check recall</strong>. Compare your explanation with the source. Choose <strong>Next paragraph</strong>, or <strong>Finish passage</strong> after its last paragraph.</li>
          <li><strong>Review your feedback.</strong> After saving the finished practice, choose <strong>Get feedback on my recall</strong>. Only hidden recall speech is graded. Check its transcript beside the source.</li>
        </ol>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-video">
        <h2 id="rc-instructions-video" className="text-xl font-semibold">Watch the one-minute demo</h2>
        <RcTrainingVideo />
      </section>
      </div>
      <details className="rct-full-instructions">
        <summary>Recording, timing and feedback</summary>
        <p>Your microphone stays on while you read, recall and check. Only hidden recall speech is graded. Your full recording is transcribed to locate those words; reading and checking speech are excluded from the grade.</p>
        <p>The timer counts up during practice. There is no time limit. Microphone setup and paused time are excluded. Keep the details and connections before trying to go faster.</p>
        <p>Each source unit earns 2 meaning points for complete meaning, 1 for partial meaning, or 0 for missing or changed meaning. This is an AI assessment of your transcript, not an LSAT score. Unclear recordings are left ungraded.</p>
        <p>Practice requires a microphone. If it cannot start, retry or return to passage selection. During practice, open Practice options to Pause and return to passages or Finish early.</p>
      </details>
    </div>
  </main>;
}
