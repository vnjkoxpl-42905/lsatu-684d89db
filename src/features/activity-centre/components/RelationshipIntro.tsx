import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ActivityIntroProps } from "./ActivityEditorialIntro";
import "../relationship-intro.css";

/** Keep the launch instructions current even for an older assignment snapshot. */
export function RelationshipIntro({ title, resumeAt = 1, preview, canSaveProgress = false, onStart, onExit }: ActivityIntroProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  return (
    <div className="relationship-intro" data-testid="relationship-intro">
      {onExit && <button type="button" className="relationship-exit" onClick={onExit}><ArrowLeft size={16} aria-hidden="true" />Exit</button>}
      <header className="relationship-heading">
        <p className="relationship-eyebrow">{title}</p>
        <h1>Name the relationship.<br />Find the words that create it.</h1>
        <p>Each answer needs both: the relationship type and its indicator words.</p>
      </header>

      <section className="relationship-video" aria-labelledby="relationship-video-title">
        <h2 id="relationship-video-title">Watch how it works</h2>
        <video
          controls
          preload="none"
          playsInline
          poster="/media/spot-the-relationship/how-to-play-v1.webp"
          src="/media/spot-the-relationship/how-to-play-v1.mp4"
          aria-label="How to play Spot the Relationship"
          onError={() => setVideoFailed(true)}
        >
          <track kind="captions" src="/media/spot-the-relationship/how-to-play-v1.vtt" srcLang="en" label="English" default />
          Your browser cannot play this video. Read the written instructions below.
        </video>
        {videoFailed && <p className="relationship-video-fallback" role="status">The video could not load. Follow the written instructions below.</p>}
      </section>

      <div className="relationship-launch-grid">
        <section className="relationship-instructions" aria-labelledby="relationship-instructions-title">
          <h2 id="relationship-instructions-title">What to write</h2>
          <ol>
            <li><strong>Read the sentence.</strong> Look for a conditional, causal, or comparative relationship.</li>
            <li><strong>Name the type and quote the words.</strong> Include the exact word or phrase that creates that relationship.</li>
            <li><strong>Check for another relationship.</strong> If the sentence contains more than one type, name each type with its own indicator words.</li>
          </ol>
        </section>

        <section className="relationship-example" aria-labelledby="relationship-example-title">
          <h2 id="relationship-example-title">Worked example</h2>
          <p className="relationship-example-label">Sentence</p>
          <p className="relationship-example-sentence">A lantern can be lit <strong>only if</strong> its wick is dry.</p>
          <p className="relationship-example-label">Example answer</p>
          <p className="relationship-example-answer">Conditional, “only if”</p>
          <p className="relationship-example-reason">“Only if” makes a dry wick necessary for lighting the lantern. It does not say that a dry wick causes the lantern to light.</p>
        </section>
      </div>

      <details className="relationship-guide">
        <summary>Review the three relationship types</summary>
        <dl>
          <div><dt>Conditional</dt><dd>A rule: if one thing is true, something else must be true too. The words may tell you what is enough or what is required.</dd></div>
          <div><dt>Causal</dt><dd>One thing produces or changes another. Look for causal verbs as well as words such as “because.”</dd></div>
          <div><dt>Comparative</dt><dd>One thing is compared with another thing, a number, or an earlier state. The comparison does not always use “than.”</dd></div>
        </dl>
      </details>

      <footer className="relationship-launch">
        <div className="relationship-run-notes">
          <p>{preview ? "Teacher preview: trying this activity does not change a student's progress." : canSaveProgress ? "Your submitted answers save as you go. You can leave and return to continue." : "This run does not save answers or change assignment progress."}</p>
        </div>
        <button type="button" className="relationship-start" onClick={onStart}>
          {resumeAt > 1 ? `Back to question ${resumeAt}` : "Start"}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
