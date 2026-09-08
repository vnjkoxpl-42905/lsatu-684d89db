import { ArrowRight, Mic } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import { renderInlineMarks } from "../prompt-format";
import "./section-launch.css";

export interface SectionBriefingPageProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  /** Stimuli in this section, from the assignment snapshot. */
  itemCount?: number;
  /** The clock this section is run against, for this student. */
  timeGoalMinutes?: number | null;
  /** `PT105.S2`. */
  sourceSection?: string | null;
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
  itemCount,
  timeGoalMinutes,
  sourceSection,
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
          <span className="sl-chip">
            <Mic size={11} strokeWidth={2.6} aria-hidden="true" />
            Read, Recall, Colour
          </span>
          <h1 className="sl-title">{title}</h1>
          <p className="sl-tagline">
            {instructions.tagline ? renderInlineMarks(instructions.tagline, "sl-bp-tag") : subtitle}
          </p>
          {/* The section is named in the title already, as its second line, so
              it is not repeated here. What is left is what the title cannot
              say: how much work this is.

              Not "pieces". A piece is one chunk, roughly a sentence, and the
              instructions on this very page use the word that way ("Read each
              piece silently"). Counting stimuli in pieces made the line read as
              22 sentences. */}
          <p className="sl-bp-meta">
            {[
              // Only when the title does not already carry it, which it does for
              // every section ("Read, Recall, Colour · PT104 Section 1").
              title.includes(" · ") ? null : sourceSection,
              typeof itemCount === "number" ? `${itemCount} stimuli` : null,
              timeGoalMinutes ? `about ${timeGoalMinutes} min` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
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
          section records in one take with no pause is said in Step 4 and again
          in the full instructions; saying it a third time here made the notice
          a paragraph she skipped. */}
      <p className="sl-notice" role="status">
        Nothing is recording yet. The microphone opens when you press Start.
      </p>

      {steps.length > 0 && (
        <section className="sl-bp-steps" aria-label="What you do, step by step">
          <h2 className="sl-bp-h2">What you do, step by step</h2>
          <ol className="sl-bp-list">
            {steps.map((step, i) => (
              <li key={i}>
                <span className="sl-bp-n">Step {i + 1}</span>
                <strong>{renderInlineMarks(step.label, `sl-bps-l-${i}`)}</strong>
                <p>{renderInlineMarks(step.body, `sl-bps-b-${i}`)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* The four steps above ARE the instruction. This is the same method told
          again at length, and rendering both open left her reading the method
          twice with no way to tell which one she was meant to follow. Closed by
          default, one click from anyone who wants the long version. */}
      {briefing && (
        <details className="sl-bp-more">
          <summary className="sl-bp-h2">Read the long version</summary>
          <section className="sl-essay sl-bp-essay" aria-label="Full instructions">
          {briefing.lede && <p className="rd-lede">{renderInlineMarks(briefing.lede, "sl-bp-lede")}</p>}
          {briefing.sections.map((section, i) => (
            <section key={i}>
              <h4>{renderInlineMarks(section.heading, `sl-bp-h-${i}`)}</h4>
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

      <footer className="sl-bp-foot">
        <p>When you are ready, press Start. The clock begins counting up and the recording begins.</p>
        <div className="sl-cta">{startButton("Start the section")}</div>
      </footer>
    </div>
  );
}
