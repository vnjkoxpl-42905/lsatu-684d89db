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
        <h1>{title}</h1>
        <p>Decide whether each sentence contains a conditional, causal, or comparative relationship.</p>
      </header>

      <div className="relationship-launch-grid">
        <div className="relationship-written">
          <section className="relationship-instructions" aria-labelledby="relationship-instructions-title">
            <h2 id="relationship-instructions-title">Instructions</h2>
            <ol>
              <li><strong>Read the whole sentence.</strong></li>
              <li><strong>Give the type and a quotation.</strong> Quote the words you used to identify the relationship. If you find more than one type, include each one with its own quotation.</li>
            </ol>
          </section>

          <section className="relationship-example" aria-labelledby="relationship-example-title">
            <h2 id="relationship-example-title">Example</h2>
            <p className="relationship-example-label">Sentence</p>
            <p className="relationship-example-sentence">A lantern can be lit <strong>only if</strong> its wick is dry.</p>
            <p className="relationship-example-label">Answer</p>
            <p className="relationship-example-answer">Conditional, “only if”</p>
            <p className="relationship-example-reason">The wick has to be dry for the lantern to be lit. “Only if” tells us that. A dry wick alone does not guarantee that the lantern can be lit.</p>
          </section>

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
              <p>{preview ? "Preview only. Student progress is unchanged." : canSaveProgress ? "Your submitted answers save as you go. You can leave and return to continue." : "This run does not save answers or change assignment progress."}</p>
            </div>
            <button type="button" className="relationship-start" onClick={onStart}>
              {resumeAt > 1 ? `Back to question ${resumeAt}` : "Start"}<ArrowRight size={18} aria-hidden="true" />
            </button>
          </footer>
        </div>

        <aside className="relationship-video" aria-labelledby="relationship-video-title">
          <h2 id="relationship-video-title">Video instructions</h2>
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
            Your browser cannot play this video. Read the written instructions on this page.
          </video>
          {videoFailed && <p className="relationship-video-fallback" role="status">The video could not load. You can use the written instructions on this page.</p>}
        </aside>
      </div>
    </div>
  );
}
