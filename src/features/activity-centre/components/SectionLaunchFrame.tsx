import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityInstructions } from "../api/types";
import { renderInlineMarks } from "../prompt-format";
import "./section-launch.css";

export interface SectionLaunchFrameProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  /** Whether this page needs the breadcrumb bar above its own heading. */
  showBreadcrumbs?: boolean;
  /** The right half of the breadcrumb line: what this page is a page of. */
  meta?: ReactNode;
  /**
   * The page's own primary action, if it has one.
   *
   * A section has one: Start. The library does not — its actions are the
   * section rows, and a button above them would have to mean "start which?".
   */
  primaryAction?: ReactNode;
  /**
   * A caution above the method, where there is one.
   *
   * It sits under the head rather than beside Start, because it is about
   * whether to start at all and has to be read before the button is reached. It
   * never disables anything: the one caution that exists so far is the phone
   * notice, and Joshua's call is that a phone is warned and let through.
   */
  notice?: ReactNode;
  /** Between the head and the method. The four numbers, where there are four. */
  strip?: ReactNode;
  /** The slab below the method: her runs on a section, her sections in the library. */
  children?: ReactNode;
  onExit?: () => void;
}

/**
 * The chrome both Read, Recall, Colour doors are drawn in.
 *
 * There are two doors and one design. The library is where she picks tonight's
 * section; the section page is where she reads its clock and starts it. They
 * carry the same crumbs, the same head, the same four beats and the same
 * briefing drawer, and differ only in the slab underneath — so the method is
 * one component rather than two copies that drift.
 *
 * This owns the beat and pane state because both are about reading the method,
 * which is the part that is genuinely shared. Everything about *runs* stays out
 * in the surfaces, where the data lives.
 */
export function SectionLaunchFrame({
  title,
  subtitle,
  instructions,
  showBreadcrumbs = true,
  meta,
  primaryAction,
  notice,
  strip,
  children,
  onExit,
}: SectionLaunchFrameProps) {
  /**
   * The four beats are `steps` inside ONE briefing section, not the sections.
   *
   * The briefing has six sections and only one of them -- "What you actually
   * do." -- carries the procedure. Rendering `sections` here would put the essay
   * headings in the strip and lose the method entirely.
   */
  const beatSection = useMemo(
    () => instructions.briefing?.sections.find((s) => (s.steps?.length ?? 0) > 0),
    [instructions.briefing],
  );
  const beats = beatSection?.steps ?? [];

  const [beat, setBeat] = useState(0);
  const [pane, setPane] = useState<"beat" | "briefing">("beat");

  /**
   * Arrow-key traversal, which is what makes a tablist a tablist rather than a
   * row of buttons wearing the role.
   */
  const beatRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onBeatKey = useCallback(
    (e: React.KeyboardEvent) => {
      const last = beats.length - 1;
      let next: number | null = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = beat === last ? 0 : beat + 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = beat === 0 ? last : beat - 1;
      if (e.key === "Home") next = 0;
      if (e.key === "End") next = last;
      if (next === null) return;
      e.preventDefault();
      setBeat(next);
      setPane("beat");
      beatRefs.current[next]?.focus();
    },
    [beat, beats.length],
  );

  const paneRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onPaneKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const next = pane === "beat" ? "briefing" : "beat";
      setPane(next);
      paneRefs.current[next === "beat" ? 0 : 1]?.focus();
    },
    [pane],
  );

  const briefing = instructions.briefing;
  const current = beats[beat];

  return (
    <div className="sl">
      <div className="sl-sheet">
        {/*
          * The crumb IS the way out.
          *
          * `ActivityExitButton` was drawn here first and could not be read: it
          * takes its ink from the world shell's `--aw-ink`, and this surface is
          * not a world, so on the dark theme it landed as a near-invisible pill
          * floating above the chip. A breadcrumb that goes where it says it
          * goes is the control this page already had.
          */}
        {showBreadcrumbs && (
          <div className="sl-crumbs">
            <span className="sl-label">
              {onExit ? (
                <button type="button" className="sl-crumb-back" onClick={onExit}>
                  Library
                </button>
              ) : (
                "Library"
              )}
              {" / Out Loud / "}
              <strong>{title}</strong>
            </span>
            <span className="sl-label sl-meta">{meta}</span>
          </div>
        )}

        <div className="sl-head">
          <div>
            <span className="sl-chip">Out loud</span>
            <h2 className="sl-title">{title}</h2>
            {(instructions.tagline || subtitle) && (
              <p className="sl-tagline">
                {instructions.tagline
                  ? renderInlineMarks(instructions.tagline, "sl-tagline")
                  : subtitle}
              </p>
            )}
          </div>
          <div className="sl-cta">
            {primaryAction}
            {briefing && (
              <button
                type="button"
                className="sl-brief"
                onClick={() => {
                  setPane("briefing");
                }}
              >
                Read the full instructions
              </button>
            )}
          </div>
        </div>
        {notice}

        {strip}

        {beats.length > 0 && (
          <>
            <div className="sl-mhead">
              <h3>The method</h3>
            </div>
            <div
              className="sl-beats"
              role="tablist"
              aria-label="The method, step by step"
              onKeyDown={onBeatKey}
              style={{ ["--sl-beat-count" as string]: String(beats.length) }}
            >
              {beats.map((step, i) => (
                <button
                  key={i}
                  ref={(el) => {
                    beatRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`sl-beat-tab-${i}`}
                  aria-controls="sl-beat-panel"
                  aria-selected={pane === "beat" && beat === i}
                  tabIndex={beat === i ? 0 : -1}
                  className="sl-beat"
                  onClick={() => {
                    setBeat(i);
                    setPane("beat");
                  }}
                >
                  <span className="sl-n">0{i + 1}</span>
                  <span className="sl-l">{renderInlineMarks(step.label, `sl-bl-${i}`)}</span>
                  <span className="sl-d">{renderInlineMarks(step.body, `sl-bd-${i}`)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {briefing && (
          <div className="sl-drawer">
            <div
              className="sl-dr-tabs"
              role="tablist"
              aria-label="Instruction detail"
              onKeyDown={onPaneKey}
            >
              <button
                ref={(el) => {
                  paneRefs.current[0] = el;
                }}
                type="button"
                role="tab"
                id="sl-pane-tab-beat"
                aria-selected={pane === "beat"}
                aria-controls="sl-beat-panel"
                tabIndex={pane === "beat" ? 0 : -1}
                className="sl-dr-tab"
                onClick={() => setPane("beat")}
              >
                This step
              </button>
              <button
                ref={(el) => {
                  paneRefs.current[1] = el;
                }}
                type="button"
                role="tab"
                id="sl-pane-tab-briefing"
                aria-selected={pane === "briefing"}
                aria-controls="sl-beat-panel"
                tabIndex={pane === "briefing" ? 0 : -1}
                className="sl-dr-tab"
                onClick={() => setPane("briefing")}
              >
                Full instructions
              </button>
              {briefing.closer && (
                <span className="sl-dr-note">
                  {renderInlineMarks(briefing.closer, "sl-closer")}
                </span>
              )}
            </div>

            <div
              className="sl-dr-view"
              id="sl-beat-panel"
              role="tabpanel"
              tabIndex={-1}
              data-pane={pane}
              /*
               * The panel names the tab it is currently showing. Two tablists
               * swap the same region, so without this a screen reader can reach
               * the panel and not be told which of the six tabs it belongs to.
               */
              aria-labelledby={
                pane === "beat"
                  ? `sl-pane-tab-beat sl-beat-tab-${beat}`
                  : "sl-pane-tab-briefing"
              }
            >
              {pane === "beat" && current ? (
                <div>
                  <span className="sl-label">
                    Step {beat + 1} of {beats.length}
                  </span>
                  <h3 className="sl-dr-title">
                    {renderInlineMarks(current.label, `sl-dt-${beat}`)}
                  </h3>
                  <p className="sl-dr-body">
                    {renderInlineMarks(current.body, `sl-db-${beat}`)}
                  </p>
                </div>
              ) : (
                <div className="sl-essay">
                  {briefing.lede && <p>{renderInlineMarks(briefing.lede, "sl-lede")}</p>}
                  {briefing.sections.map((section, i) => (
                    <section key={i}>
                      <h4>{renderInlineMarks(section.heading, `sl-h-${i}`)}</h4>
                      {section.body.map((para, j) => (
                        <p key={j}>{renderInlineMarks(para, `sl-p-${i}-${j}`)}</p>
                      ))}
                      {section.steps && (
                        <ol>
                          {section.steps.map((step, j) => (
                            <li key={j}>
                              <strong>
                                {renderInlineMarks(step.label, `sl-sl-${i}-${j}`)}
                              </strong>{" "}
                              {renderInlineMarks(step.body, `sl-sb-${i}-${j}`)}
                            </li>
                          ))}
                        </ol>
                      )}
                      {section.demo && (
                        <ol>
                          {section.demo.beats.map((b, j) => (
                            <li key={j}>
                              <strong>{b.kind}</strong>{" "}
                              {renderInlineMarks(b.text, `sl-demo-${i}-${j}`)}
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  ))}
                </div>
              )}
              {/* Only from the essay. On the beat pane it was an action back to
                  where she already was, sitting in an otherwise empty column. */}
              {pane === "briefing" && (
                <div className="sl-dr-side">
                  <button type="button" className="sl-close" onClick={() => setPane("beat")}>
                    Back to the steps
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
