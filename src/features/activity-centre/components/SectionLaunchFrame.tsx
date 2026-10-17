import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, Mic, Play } from "lucide-react";
import type { ActivityInstructions } from "../api/types";
import { renderInlineMarks } from "../prompt-format";
import { MeadowScene } from "./MeadowScene";
import { RecallDemo } from "./RecallDemo";
import "./section-launch.css";

export interface SectionLaunchFrameProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  /** Whether this page needs the breadcrumb line above its own heading. */
  showBreadcrumbs?: boolean;
  /** The right half of the crumb line: what this page is a page of. */
  meta?: ReactNode;
  /**
   * The page's own primary action, if it has one.
   *
   * A section has one: Start. The library does not; its actions are the
   * section rows, so its hero button carries her down to them instead.
   */
  primaryAction?: ReactNode;
  /**
   * The same action again at the foot of the page, worded for where it sits.
   * A section passes a second Start here; the library needs nothing, since its
   * default carries her back up to the sections.
   */
  closingAction?: ReactNode;
  /**
   * Anything to draw directly under the four step cards, before the examples.
   * The library door puts the demo films here: the steps, then the steps done.
   */
  afterSteps?: ReactNode;
  /**
   * Leave out the closing "Twenty-five minutes" panel and its third
   * "Choose a section" button. The library door already carries the list, so
   * a button pointing at it from the very bottom of the page said nothing.
   */
  hideClose?: boolean;
  /** A caution under the hero, where there is one. It never disables anything. */
  notice?: ReactNode;
  /** Between the hero and the method. The four numbers, where there are four. */
  strip?: ReactNode;
  /** The slab below the method: her runs on a section, her sections in the library. */
  children?: ReactNode;
  /**
   * Put the slab directly under the hero instead of at the foot of the page.
   *
   * The library's slab IS the point of the page — the sections she can start.
   * Burying it under the editorial meant "Choose a section" was a long scroll
   * away, and a student who did not scroll never found a way in.
   */
  sectionsFirst?: boolean;
  onExit?: () => void;
  /** A smaller entrance for the embedded Reading Center library. */
  compact?: boolean;

}

const EASE = [0.22, 1, 0.36, 1] as const;

/** One authored entrance, shared by every block below the hero. */
const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-12% 0px" },
  transition: { duration: 0.8, ease: EASE },
} as const;

const STEP_KINDS = ["read", "tell", "colour", "recall"] as const;

/**
 * The little painted scene above each step.
 *
 * Four small dioramas drawn in the door's own vocabulary: a page, a voice, a
 * stroke of colour, a page emptying. They move while the step is in view and
 * stop under reduced motion; none of them carries anything the words do not.
 */
function StepScene({ kind }: { kind: (typeof STEP_KINDS)[number] }) {
  if (kind === "read") {
    return (
      <div className="rd-scene rd-sc-read" aria-hidden="true">
        <div className="rd-sc-page">
          <i className="rd-sc-line" style={{ width: "88%" }} />
          <i className="rd-sc-line" style={{ width: "72%" }} />
          <i className="rd-sc-line" style={{ width: "94%" }} />
          <i className="rd-sc-line" style={{ width: "58%" }} />
          <span className="rd-sc-sweep" />
        </div>
      </div>
    );
  }
  if (kind === "tell") {
    return (
      <div className="rd-scene rd-sc-tell" aria-hidden="true">
        <div className="rd-sc-bubble">
          <Mic size={13} strokeWidth={2.4} />
          <span className="rd-wave" data-live="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} style={{ animationDelay: `${(i * 0.09).toFixed(2)}s` }} />
            ))}
          </span>
          <span className="rd-sc-bubble-text">in your own words</span>
        </div>
        <div className="rd-sc-page rd-sc-page-turned">
          <i className="rd-sc-line" style={{ width: "80%" }} />
          <i className="rd-sc-line" style={{ width: "64%" }} />
        </div>
      </div>
    );
  }
  if (kind === "colour") {
    return (
      <div className="rd-scene rd-sc-colour" aria-hidden="true">
        <span className="rd-sc-stroke" />
        <div className="rd-sc-chip">
          <span className="rd-sc-chip-head">Colour it</span>
          “Who counted that?”
        </div>
      </div>
    );
  }
  return (
    <div className="rd-scene rd-sc-recall" aria-hidden="true">
      <div className="rd-sc-page rd-sc-page-fading">
        <i className="rd-sc-line" style={{ width: "88%" }} />
        <i className="rd-sc-line" style={{ width: "72%" }} />
        <i className="rd-sc-line" style={{ width: "94%" }} />
        <i className="rd-sc-line" style={{ width: "58%" }} />
      </div>
      <span className="rd-sc-key">space</span>
    </div>
  );
}

/**
 * Shared section entrance. Reading Center uses the compact variant to switch
 * the whole hero between its demonstration, instructions and recorded examples.
 * Standalone section pages keep their existing lower-page teaching layout.
 */
export function SectionLaunchFrame({
  title,
  subtitle,
  instructions,
  showBreadcrumbs = true,
  meta,
  primaryAction,
  closingAction,
  afterSteps,
  hideClose = false,
  notice,
  strip,
  children,
  sectionsFirst = false,
  onExit,
  compact = false,

}: SectionLaunchFrameProps) {
  const reduced = useReducedMotion();

  /**
   * The four beats are `steps` inside ONE briefing section, not the sections.
   * Only "How the method works" carries the procedure; rendering `sections`
   * here would put the essay headings in the strip and lose the method.
   */
  const beatSection = useMemo(
    () => instructions.briefing?.sections.find((s) => (s.steps?.length ?? 0) > 0),
    [instructions.briefing],
  );
  const beats = beatSection?.steps ?? [];

  const [view, setView] = useState<"home" | "instructions" | "examples">("home");
  const switchedHeading = useRef<HTMLHeadingElement>(null);
  const didSwitch = useRef(false);
  useEffect(() => {
    if (!compact || !didSwitch.current) return;
    switchedHeading.current?.focus({ preventScroll: true });
  }, [compact, view]);
  const switchView = (next: typeof view) => {
    didSwitch.current = true;
    setView(next);
    heroRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  const [beat, setBeat] = useState(0);
  const [pane, setPane] = useState<"beat" | "briefing">("beat");

  const heroRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLElement>(null);
  // The four step cards each carry a looping scene. They run while the method
  // is on screen and stop when it is not; `reveal` fires once and cannot.
  const methodRef = useRef<HTMLElement>(null);
  const methodInView = useInView(methodRef);

  /**
   * The hero's scroll, 0 while it is fully on screen and 1 once it has left.
   * The scene planes and the headline all ride this one number, so they move
   * as one picture rather than as separate effects.
   */
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  // 4px, not 14: a large blur radius on a 96px headline layer is one of the
  // most expensive things a scroll can drive, and past about 4px the headline
  // is already unreadable, so the rest of the radius buys nothing.
  const copyFilter = useTransform(scrollYProgress, [0, 0.5], ["blur(0px)", "blur(4px)"]);
  const copyScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.94]);

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

  const openBriefing = useCallback(() => {
    setPane("briefing");
    drawerRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [reduced]);

  const goToSections = useCallback(() => {
    const slab = sectionsRef.current;
    if (!slab) return;
    // Keep the standalone editor-frame fallback, while the workspace scrolls
    // smoothly unless the student has requested reduced motion.
    slab.scrollIntoView({ behavior: compact && !reduced ? "smooth" : "auto", block: "start" });
    slab.focus({ preventScroll: true });
  }, [compact, reduced]);


  const briefing = instructions.briefing;
  const current = beats[beat];

  return (
    <div className={compact ? "sl sl-compact" : "sl"}>
      {/* ---------------------------------------------------------------- hero */}
      <section className="rd-hero" ref={heroRef} aria-labelledby={compact && view !== "home" ? "sl-view-title" : "rd-title"}>
        <motion.div layout={compact && !reduced} transition={{ duration: reduced ? 0 : 0.24, ease: EASE }} className="rd-hero-panel" data-view={compact ? view : undefined}>
          {compact && view !== "home" ? (
            <motion.div key={view} className="sl-workspace-view" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : 0.2 }}>
              <div className="sl-workspace-header">
                <h1 id="sl-view-title" ref={switchedHeading} tabIndex={-1}>{view === "instructions" ? "Instructions" : "Video examples"}</h1>
                <div className="sl-workspace-actions">
                  <button type="button" className="sl-start" onClick={goToSections}>Choose a section</button>
                  {view === "examples" && <button type="button" className="sl-brief" onClick={() => switchView("instructions")}>Back to instructions</button>}
                  <button type="button" className="sl-brief" onClick={() => switchView("home")}>Back to home</button>
                </div>
              </div>
              {view === "instructions" ? (
                <>
                  <div className="sl-workspace-steps">
                    {beats.map((step, i) => (
                      <section className="sl-beat rd-step" key={i} data-kind={STEP_KINDS[i] ?? "read"}>
                        <StepScene kind={STEP_KINDS[i] ?? "read"} />
                        <span className="rd-step-n">Step {i + 1}</span>
                        <h2 className="sl-l">{renderInlineMarks(step.label, `sl-workspace-label-${i}`)}</h2>
                        <p className="sl-d">{renderInlineMarks(step.body, `sl-workspace-body-${i}`)}</p>
                      </section>
                    ))}
                  </div>
                  <div className="sl-workspace-learning">
                    {afterSteps && <button type="button" className="sl-start" onClick={() => switchView("examples")}><Play size={16} aria-hidden="true" />Watch examples</button>}
                    {briefing && (
                      <details className="sl-workspace-more">
                        <summary>Read more</summary>
                        <div className="sl-essay">
                          {briefing.lede && <p className="rd-lede">{renderInlineMarks(briefing.lede, "sl-workspace-lede")}</p>}
                          {briefing.sections.map((section, i) => (
                            <section key={i}>
                              <h2>{renderInlineMarks(section.heading, `sl-workspace-h-${i}`)}</h2>
                              {section.body.map((para, j) => <p key={j}>{renderInlineMarks(para, `sl-workspace-p-${i}-${j}`)}</p>)}
                              {section.demo && <ol>{section.demo.beats.map((item, j) => <li key={j}><strong>{item.kind}</strong> {renderInlineMarks(item.text, `sl-workspace-demo-${i}-${j}`)}</li>)}</ol>}
                            </section>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </>
              ) : afterSteps}
            </motion.div>
          ) : <>

          <div className="rd-hero-top">
            <span className="rd-crumbs">
              {showBreadcrumbs ? (
                <>
                  {onExit ? (
                    <button type="button" className="sl-crumb-back" onClick={onExit}>
                      Library
                    </button>
                  ) : (
                    "Library"
                  )}
                  <span className="rd-crumb-sep">/</span>
                  Out loud
                  <span className="rd-crumb-sep">/</span>
                  <strong>{title}</strong>
                </>
              ) : (
                <>
                  {onExit && (
                    <>
                      <button type="button" className="sl-crumb-back" onClick={onExit}>
                        Library
                      </button>
                      <span className="rd-crumb-sep">/</span>
                    </>
                  )}
                  <strong>Out loud</strong>
                </>
              )}
            </span>
            {meta && <span className="rd-meta">{meta}</span>}
          </div>

          <motion.div
            className="rd-hero-copy"
            style={reduced ? undefined : { y: copyY, opacity: copyOpacity, filter: copyFilter, scale: copyScale }}
          >
            <span className="sl-chip">
              <Mic size={11} strokeWidth={2.6} aria-hidden="true" />
              Read, Recall, Colour
            </span>
            <h1 className="sl-title" id="rd-title" ref={switchedHeading} tabIndex={-1}>
              {/* "Read, Recall, Colour · PT102 Section 3" is one title in the
                  record and two lines on the door: the drill, then the section
                  it is run on, in the same italic the library gives "back".
                  The library door's own title carries no " · ", so it renders
                  whole. It used to hardcode "Recall Rephrase Colour" here, a
                  name the product does not have, one line under a chip reading
                  "Read, Recall, Colour". */}
              {title.includes(" · ") ? (
                <>
                  {title.slice(0, title.indexOf(" · "))}
                  <br />
                  <em>{title.slice(title.indexOf(" · ") + 3)}</em>
                </>
              ) : (
                title
              )}
            </h1>
            {!compact && <p className="sl-tagline">
              {instructions.tagline ? renderInlineMarks(instructions.tagline, "sl-tagline") : subtitle}
            </p>}
            <div className="sl-cta">
              {primaryAction ?? (
                <button type="button" className="sl-start" onClick={goToSections}>
                  Choose a section
                </button>
              )}
              {briefing && (
                <button type="button" className="sl-brief" onClick={compact ? () => switchView("instructions") : openBriefing}>
                  Read the full instructions
                </button>
              )}
            </div>
          </motion.div>

          <div className="rd-hero-space" aria-hidden="true" />

          {/* Last in the DOM, first in the picture: the scene and its planes
              are painted by z-index, so putting them here costs nothing
              visually and stops the demonstration's Play button from being
              the first thing the Tab key finds on the page. The crumb out and
              the two calls to action come first now, which is the order she
              would read them in. */}
          <MeadowScene progress={scrollYProgress}>
            <RecallDemo />
          </MeadowScene>
          </>}
        </motion.div>
      </section>

      {sectionsFirst && (
        <motion.section
          className="rd-slab"
          id="sl-sections"
          ref={sectionsRef}
          tabIndex={-1}
          aria-labelledby="rd-slab-title"
          {...reveal}
        >
          <h2 className="sr-only" id="rd-slab-title">
            Choose a section
          </h2>
          {children}
        </motion.section>
      )}



      {(notice || strip) && (
        <div className="rd-band">
          {notice}
          {strip}
        </div>
      )}

      {/* -------------------------------------------------------------- method */}
      {!compact && beats.length > 0 && (
        <motion.section
          className="rd-method"
          ref={methodRef}
          data-still={!methodInView || undefined}
          aria-labelledby="rd-method-title"
          {...reveal}
        >
          {/* The page's headings were H1, then this section's H3, then the H2
              below it. Every section down the page owns a level-2 heading now,
              named exactly as its label already named it, so the outline reads
              in order whether or not the drawer is open. */}
          <h2 className="sr-only" id="rd-method-title">
            Read, Recall, Colour steps
          </h2>
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
                className="sl-beat rd-step"
                data-kind={STEP_KINDS[i] ?? "read"}
                onClick={() => {
                  setBeat(i);
                  setPane("beat");
                }}
              >
                <StepScene kind={STEP_KINDS[i] ?? "read"} />
                <span className="rd-step-n">Step {i + 1}</span>
                <span className="sl-l">{renderInlineMarks(step.label, `sl-bl-${i}`)}</span>
                <span className="sl-d">{renderInlineMarks(step.body, `sl-bd-${i}`)}</span>
              </button>
            ))}
          </div>

          {briefing && (
            <div className="sl-drawer" ref={drawerRef}>
              <div className="sl-dr-tabs" role="tablist" aria-label="Instruction detail" onKeyDown={onPaneKey}>
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
              </div>

              <div
                className="sl-dr-view"
                id="sl-beat-panel"
                role="tabpanel"
                tabIndex={-1}
                data-pane={pane}
                aria-labelledby={pane === "beat" ? `sl-pane-tab-beat sl-beat-tab-${beat}` : "sl-pane-tab-briefing"}
              >
                {pane === "beat" && current ? (
                  <div className="rd-dr-step">
                    <span className="sl-label">
                      Step {beat + 1} of {beats.length}
                    </span>
                    <h3 className="sl-dr-title">{renderInlineMarks(current.label, `sl-dt-${beat}`)}</h3>
                    <p className="sl-dr-body">{renderInlineMarks(current.body, `sl-db-${beat}`)}</p>
                    <div className="rd-dr-nav">
                      {beat > 0 && (
                        <button type="button" className="sl-close" onClick={() => setBeat(beat - 1)}>
                          Previous step
                        </button>
                      )}
                      {beat < beats.length - 1 ? (
                        <button type="button" className="sl-close" onClick={() => setBeat(beat + 1)}>
                          Next step
                          <ArrowRight size={13} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                      ) : (
                        <button type="button" className="sl-close" onClick={goToSections}>
                          Choose a section
                          <ArrowDown size={13} strokeWidth={2.4} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="sl-essay">
                    {briefing.lede && <p className="rd-lede">{renderInlineMarks(briefing.lede, "sl-lede")}</p>}
                    {briefing.sections.map((section, i) => (
                      <section key={i}>
                        <h3>{renderInlineMarks(section.heading, `sl-h-${i}`)}</h3>
                        {section.body.map((para, j) => (
                          <p key={j}>{renderInlineMarks(para, `sl-p-${i}-${j}`)}</p>
                        ))}
                        {section.steps && (
                          <ol>
                            {section.steps.map((step, j) => (
                              <li key={j}>
                                <strong>{renderInlineMarks(step.label, `sl-sl-${i}-${j}`)}</strong>{" "}
                                {renderInlineMarks(step.body, `sl-sb-${i}-${j}`)}
                              </li>
                            ))}
                          </ol>
                        )}
                        {section.demo && (
                          <ol>
                            {section.demo.beats.map((b, j) => (
                              <li key={j}>
                                <strong>{b.kind}</strong> {renderInlineMarks(b.text, `sl-demo-${i}-${j}`)}
                              </li>
                            ))}
                          </ol>
                        )}
                      </section>
                    ))}
                  </div>
                )}
                {pane === "briefing" && (
                  <div className="sl-dr-side">
                    <button type="button" className="sl-close" onClick={() => setPane("beat")}>
                      Back to the steps
                    </button>
                    <button type="button" className="sl-close" onClick={goToSections}>
                      Choose a section
                      <ArrowDown size={13} strokeWidth={2.4} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.section>
      )}

      {!compact && afterSteps}

      {/* ------------------------------------------------------- what counts */}
      {!compact && <motion.section className="rd-counts" aria-labelledby="rd-counts-title" {...reveal}>
        <div className="rd-counts-head">
          <h2 id="rd-counts-title" className="rd-h2">
            Your own words, <em>every</em> detail.
          </h2>
          <p className="rd-method-sub">
            Three ways to say the same stimulus back. Only one of them is the drill.
          </p>
        </div>
        <div className="rd-counts-grid">
          <div className="rd-count" data-tone="good">
            <span className="rd-count-tag">Retelling</span>
            <p className="rd-count-quote">
              “The planners want to widen the road, but the last three cities that tried it got a fifth
              more traffic in two years, so it will probably backfire.”
            </p>
            <p className="rd-count-note">Own words. Every detail. Held together as an argument. This is the drill.</p>
          </div>
          <div className="rd-count">
            <span className="rd-count-tag">Reciting</span>
            <p className="rd-count-quote">
              “City planners argue that widening Elm Street will ease congestion. But in the three cities
              that widened comparable roads…”
            </p>
            <p className="rd-count-note">Word for word. Coverage looks perfect and nothing was understood.</p>
          </div>
          <div className="rd-count">
            <span className="rd-count-tag">Listing</span>
            <p className="rd-count-quote">“Elm Street. Planners. Three cities. A fifth. Two years. Worse.”</p>
            <p className="rd-count-note">Every fact, no argument. Nothing holds it together.</p>
          </div>
        </div>
      </motion.section>

      }
      {/* --------------------------------------------------------------- slab */}
      {!sectionsFirst && (
        <motion.section
          className="rd-slab"
          id="sl-sections"
          ref={sectionsRef}
          tabIndex={-1}
          aria-labelledby="rd-slab-title"
          {...reveal}
        >
          <h2 className="sr-only" id="rd-slab-title">
            Choose a section
          </h2>
          {children}
        </motion.section>
      )}


      {/* -------------------------------------------------------------- close */}
      {!hideClose && (
      <section className="rd-close" aria-labelledby="rd-close-title">
        <h2 className="sr-only" id="rd-close-title">
          Start
        </h2>
        <div className="rd-close-panel">
          <p className="rd-close-line">
            Twenty-five minutes. No going back. <em>Every detail you can still hold.</em>
          </p>
          {closingAction ?? (
            <button type="button" className="sl-start" onClick={goToSections}>
              Choose a section
              <ArrowDown size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
      )}
    </div>
  );
}
