import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PURPOSE, RECAP_STANDARD, VOICE_NOTE } from "./lib/instructions";
import "./RcTraining.css";

const practicePath = "/reading-center/rc-recall#rc-recall-start";

export default function RcTrainingInstructions() {
  return <main className="rct-page">
    <div className="rct-content">
      <Link to={practicePath} className="rct-text-button"><ArrowLeft size={16} aria-hidden="true" />Back to RC Training</Link>
      <header className="rct-section-heading">
        <div><h1 className="text-3xl font-semibold tracking-tight">How to practise RC Training</h1>
          <p>Read one paragraph, recall it with the text hidden, then check what you remembered.</p></div>
      </header>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-goal">
        <h2 id="rc-instructions-goal" className="text-xl font-semibold">Keep the meaning when the text is gone</h2>
        <p>{PURPOSE}</p>
        <p>Your goal is to carry the paragraph's ideas, details and connections into your own words. You aren't trying to memorise its exact wording. You are checking whether you understood enough to explain it without looking.</p>
        <p>For example, if an author says a treatment helped some patients but hasn't been tested over several years, keep both parts. “The treatment works” drops the limits on the claim. When you check the text, look for that kind of change.</p>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-steps">
        <h2 id="rc-instructions-steps" className="text-xl font-semibold">Work through one paragraph at a time</h2>
        <ol className="mt-5 list-decimal space-y-5 pl-6">
          <li><strong>Read the whole paragraph.</strong> Put each idea into your own words as you read. Add a brief reaction, such as why an idea matters or what surprises you. Keep the details rather than reducing the paragraph to its main point.</li>
          <li><strong>Hide it and recall.</strong> Press <strong>Hide the text and recall paragraph 1</strong>. The paragraph number changes as you work. Silently retell that paragraph in your own words, with the text hidden. Don't look back while you recall.</li>
          <li><strong>Check what you remembered.</strong> Press <strong>Check my recall</strong> when you've finished. The text appears again. Compare it with what you recalled: what did you leave out, change or connect differently? Check the text you have read so far instead of starting a fresh read.</li>
          <li><strong>Move to the next paragraph.</strong> Press <strong>Next paragraph</strong> and repeat. Recall only the new paragraph with the text hidden. At the checking step, you can see the earlier paragraphs too.</li>
          <li><strong>Choose whether to recall the whole passage.</strong> At the end, the app offers an optional passage recall. You can do it silently, choose <strong>Out loud (recorded)</strong> and press <strong>Start recording</strong>, or skip it. Only this optional out loud recall uses your microphone.</li>
        </ol>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-details">
        <h2 id="rc-instructions-details" className="text-xl font-semibold">Check the details as well as the main point</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6">{RECAP_STANDARD.map(line => <li key={line}>{line}</li>)}</ul>
        <p>For a passage pair, work through Passage A, then Passage B, one paragraph at a time. Headings and source notes aren't paragraphs to recall. When you check a paragraph in Passage B, you can also see the Passage A paragraphs you have already read.</p>
      </section>
      <section className="rct-full-instructions" aria-labelledby="rc-instructions-pace">
        <h2 id="rc-instructions-pace" className="text-xl font-semibold">Take the time you need</h2>
        <p>The optional elapsed timer shows how long you've practised. There is no time limit. Open <strong>Timer</strong> before you begin if you want to hide the clock. Keep the details and connections before trying to go faster.</p>
        <p>{VOICE_NOTE} The app doesn't grade your recall. You compare it with the passage yourself.</p>
        <p>To pause, press <strong>Save my place and leave</strong>. Return to the attempt to continue. Use <strong>End attempt</strong> when you want to finish early rather than resume later.</p>
      </section>
      <Link to={practicePath} className="rct-button rct-button-primary">Choose a passage<ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  </main>;
}
