import type React from "react";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import { renderInlineMarks } from "../prompt-format";
import { SectionDemos } from "./SectionDemos";
import "./section-launch.css";

export interface SectionBriefingPageProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  onStart: () => void;
  onExit?: () => void;
}

/**
 * The instructions, on their own page, before anything records.
 *
 * Pressing Start on a section used to open the microphone straight away, and
 * the method was folded into tabs on a page she had already scrolled past. This
 * page is the whole briefing laid out in order, every step numbered and open,
 * with one Start button at the top and the same one at the foot. The written
 * instructions sit under it, closed. Nothing here begins the run.
 */
export function SectionBriefingPage({
  title,
  subtitle,
  instructions,
  onStart,
  onExit,
}: SectionBriefingPageProps) {
  const briefing = instructions.briefing;
  const steps = briefing?.sections.find((s) => (s.steps?.length ?? 0) > 0)?.steps ?? [];

  const startButton = (label: string) => (
    <button type="button" className="sl-start" onClick={onStart}>
      {label}
      <ArrowRight size={16} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );

  return (
    <div className="sl sl-briefing-page">
      <header className="sl-bp-head">
        <div>
          {/* No chip. The title already names the drill, and on the door the
              chip earns its place because the H1 there is the bare name. */}
          <h1 className="sl-title">{title}</h1>
          {(instructions.tagline || subtitle) && (
            <p className="sl-tagline">
              {instructions.tagline ? renderInlineMarks(instructions.tagline, "sl-bp-tag") : subtitle}
            </p>
          )}
        </div>
        <div className="sl-cta">
          {startButton("Start the section")}
          {onExit && (
            <button type="button" className="sl-brief" onClick={onExit}>
              Back
            </button>
          )}
        </div>
      </header>

      {/* One fact, the one that lowers her shoulders before she reads. That the
          section records in one take, and what pausing does and does not buy
          her, is said at the foot, beside
          the Start she presses after reading; saying it here as well made the
          notice a paragraph she skipped. (An earlier version of this comment
          claimed Step 4 carried it. It did not: the sentence lived only in
          `instructions.rules`, which this page never renders, so for a day the
          page did not say it anywhere.) */}
      {/* No role="status". A live region is for state that changes without a page
          load; this sentence is the same every time, and announcing it as an
          update is noise. */}
      <p className="sl-notice">
        Nothing is recording yet. The microphone opens when you press Start.
      </p>

      {steps.length > 0 && (
        <section className="sl-bp-steps" aria-label="What you do, step by step">
          <h2 className="sl-bp-h2">What you do, step by step</h2>
          <ol className="sl-bp-list">
            {steps.map((step, i) => (
              <li key={i} style={{ "--i": i } as React.CSSProperties}>
                <span className="sl-bp-n">Step {i + 1}</span>
                <strong>{renderInlineMarks(step.label, `sl-bps-l-${i}`)}</strong>
                <p>{renderInlineMarks(step.body, `sl-bps-b-${i}`)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* The steps, watched being done. Under the steps and before the long
          version: she reads what to do, sees it done, then chooses whether to
          read more. Joshua, 2026-09-10. */}
      <SectionDemos />

      {/* The four steps above ARE the instruction. This is the same method told
          again at length, and rendering both open left her reading the method
          twice with no way to tell which one she was meant to follow. Closed by
          default, one click from anyone who wants the long version. */}
      {briefing && (
        <details className="sl-bp-more">
          {/* The summary carries a real heading rather than only looking like one.
              It read as a section title and was absent from the heading outline,
              which is what left the page jumping H2 to H4. */}
          <summary>
            <h2 className="sl-bp-h2">Read the long version</h2>
          </summary>
          <section className="sl-essay sl-bp-essay" aria-label="Full instructions">
          {briefing.lede && <p className="rd-lede">{renderInlineMarks(briefing.lede, "sl-bp-lede")}</p>}
          {briefing.sections.map((section, i) => (
            <section key={i}>
              <h3>{renderInlineMarks(section.heading, `sl-bp-h-${i}`)}</h3>
              {section.body.map((para, j) => (
                <p key={j}>{renderInlineMarks(para, `sl-bp-p-${i}-${j}`)}</p>
              ))}
              {section.steps && (
                <ol>
                  {section.steps.map((step, j) => (
                    <li key={j}>
                      <strong>{renderInlineMarks(step.label, `sl-bp-sl-${i}-${j}`)}</strong>{" "}
                      {renderInlineMarks(step.body, `sl-bp-sb-${i}-${j}`)}
                    </li>
                  ))}
                </ol>
              )}
              {section.demo && (
                <ol>
                  {section.demo.beats.map((b, j) => (
                    <li key={j}>
                      <strong>{b.kind}</strong> {renderInlineMarks(b.text, `sl-bp-d-${i}-${j}`)}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ))}
          </section>
        </details>
      )}

      {/* The two facts she needs at the moment she presses Start, said where
          she presses it: what a pause costs her, and what the time is for. The
          closer is the authored last beat before Start and belongs here too. */}
      <footer className="sl-bp-foot">
        <p className="sl-bp-fact">
          It runs in one take. You can pause: the text hides and the clock stops
          while you are away, and you cannot go back to a stimulus. Twenty-five
          minutes for the whole section is the goal you are working toward, not a
          limit.
        </p>
        {briefing?.closer && (
          <p className="sl-bp-closer">{renderInlineMarks(briefing.closer, "sl-bp-closer")}</p>
        )}
        {/* Says what happens to her, not how the clock works. "Counting up"
            described the mechanism and left her wondering what it counted
            toward. */}
        <p>
          When you are ready, press Start. Recording begins the moment you do, and the timer
          starts with it. The first time, your browser will ask to use your microphone. Allow it.
        </p>
        <div className="sl-cta">{startButton("Start the section")}</div>
      </footer>
    </div>
  );
}
