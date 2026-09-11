import { RRC_DEMOS, demoDuration, demoLabel, type RrcDemo } from "../content/read-recall-colour-section.demos";

/**
 * The four steps, watched being done.
 *
 * Three stimuli from a real section, each run the way the steps above say,
 * filmed from the student's own eyes: face the page to read, turn away to
 * tell it back and react, come back to check, then the whole argument from
 * memory with the text gone. The caption on each is its practice test,
 * section and question, assembled from the numbers so it cannot drift.
 *
 * Nothing autoplays. The page is quiet until she presses play, the same rule
 * as the microphone: nothing begins without her.
 */
export function SectionDemos({ demos = RRC_DEMOS }: { demos?: RrcDemo[] }) {
  if (demos.length === 0) return null;
  return (
    <section className="sl-bp-demos" aria-labelledby="sl-bp-demos-h">
      <h2 className="sl-bp-h2" id="sl-bp-demos-h">
        Watch it done
      </h2>
      <p className="sl-bp-demos-lede">
        Three stimuli from one real section, each worked exactly as the steps above describe. Listen
        for the look away, the retell in plain words, and the whole argument coming back with the text
        gone.
      </p>
      <ul className="sl-bp-demo-list">
        {demos.map((d) => (
          <li key={d.id} className="sl-bp-demo">
            <div className="sl-bp-demo-frame">
              <video
                controls
                preload="metadata"
                playsInline
                poster={d.poster}
                aria-label={demoLabel(d)}
              >
                <source src={d.src} type="video/mp4" />
              </video>
            </div>
            <div className="sl-bp-demo-cap">
              <span className="sl-bp-demo-label">{demoLabel(d)}</span>
              <span className="sl-bp-demo-time">{demoDuration(d)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
