import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PURPOSE, RECAP_STANDARD } from "./lib/instructions";
import RcTrainingVideo from "./RcTrainingVideo";
import "./RcTraining.css";

const practicePath = "/reading-center/rc-recall#rc-recall-start";

export default function RcTrainingInstructions() {
  const location = useLocation();
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (!target) return;
    target.scrollIntoView?.({ block: "start" });
    target.focus({ preventScroll: true });
  }, [location.hash, location.key]);
  return <main className="rct-page">
    <div className="rct-content">
      <Link to={practicePath} className="rct-text-button"><ArrowLeft size={16} aria-hidden="true" />Back to RC Training</Link>
      <header className="rct-section-heading">
        <div><h1 className="text-3xl font-semibold tracking-tight">How to practise RC Training</h1>
          <p>Read a paragraph, press Space to hide it, explain it aloud, then press Space again to check.</p></div>
      </header>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-goal">
        <h2 id="rc-instructions-goal" className="text-xl font-semibold">Keep the meaning when the text is gone</h2>
        <p>{PURPOSE}</p>
        <p>Your goal is to explain the whole paragraph in your own words without looking. Keep its details, qualifications and connections. At the end of practice, feedback on your recorded recalls helps you find meaning you missed or changed.</p>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-steps">
        <h2 id="rc-instructions-steps" tabIndex={-1} className="text-xl font-semibold">Work through one paragraph at a time</h2>
        <ol className="mt-5 list-decimal space-y-5 pl-6">
          <li><strong>Start your microphone.</strong> Choose <strong>Start exercise</strong> and allow microphone access. Your microphone stays on while you read, recall and check.</li>
          <li><strong>Read one whole paragraph.</strong> Put each idea into your own words. Add a brief reaction, such as why it matters. Keep the details and connections.</li>
          <li><strong>Hide it and explain it aloud.</strong> Press <strong>Space</strong> or <strong>Hide paragraph</strong>. Retell the whole paragraph from memory in your own words.</li>
          <li><strong>Check your recall.</strong> Press <strong>Space</strong> or <strong>Check recall</strong>. Compare your explanation with the text. Recording continues. Choose <strong>Next paragraph</strong> and repeat. Recall only the new paragraph. A whole-passage recall at the end is optional.</li>
          <li><strong>Get feedback at the end.</strong> Complete practice and save your result, then choose <strong>Get feedback</strong>. Only your hidden recall speech is graded. Review the transcript beside the source to find meaning you missed or changed. Silent recalls and unusable recordings are not graded.</li>
        </ol>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-video">
        <h2 id="rc-instructions-video" className="text-xl font-semibold">Watch the paragraph routine</h2>
        <RcTrainingVideo />
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-details">
        <h2 id="rc-instructions-details" className="text-xl font-semibold">Check the details as well as the main point</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6">{RECAP_STANDARD.map(line => <li key={line}>{line}</li>)}</ul>
        <p>For a passage pair, work through Passage A, then Passage B, one paragraph at a time. Headings and source notes aren't paragraphs to recall. When you check a paragraph in Passage B, you can also see the Passage A paragraphs you have already read.</p>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-pace">
        <h2 id="rc-instructions-pace" className="text-xl font-semibold">Take the time you need</h2>
        <p>Practice starts with <strong>No clock</strong> selected. Choose <strong>Show elapsed time</strong> before starting if you want to see how long you've practised. It counts up. Time pauses when you leave practice and resume later. There is no time limit. Keep the details and connections before trying to go faster.</p>
        <p>Practice opens without the app sidebar. Choose <strong>Hide instructions</strong> when you are ready; the guide also collapses after the first paragraph. Choose <strong>Show instructions</strong> to reopen it. Space and the matching buttons move between reading, recall and checking. They do not stop your microphone.</p>
        <p>If your microphone cannot start, retry or choose <strong>Continue without recording (no automatic feedback)</strong>.</p>
        <details><summary>Recording and grading</summary><p>Your full recording is transcribed to locate the words spoken during each hidden recall. Only those recall words are sent for comparison with the original paragraph. Reading and checking speech are excluded from the grade.</p><p>Each source unit earns 2 meaning points when its complete meaning is kept, 1 when part is kept, or 0 when it is missing or changed. The app calculates earned points out of the fixed total. This is an AI assessment of your transcript, not an LSAT score. Unclear recordings are left ungraded.</p></details>
        <p>To pause, press <strong>Save my place and leave</strong>. Return to the attempt to continue. Use <strong>End attempt</strong> when you want to finish early rather than resume later.</p>
      </section>
      <Link to={practicePath} className="rct-button rct-button-primary">Choose a passage<ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  </main>;
}
