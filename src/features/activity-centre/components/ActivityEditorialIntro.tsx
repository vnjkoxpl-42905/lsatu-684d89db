import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ActivityInstructions, ItemFormat } from "../api/types";
import { ActivityExitButton } from "./ActivityExitButton";
import { worldForTitle } from "../worlds/registry";
import { renderInlineMarks } from "../prompt-format";
import "../activities-home.css";

const CONDITIONAL_LEFT_TRIGGERS = [
  "if",
  "when",
  "the only",
  "all",
  "each",
  "any",
  "every",
  "no",
  "whenever",
  "whoever",
  "wherever",
  "ensures",
  "guarantees",
  "implies",
  "any universal group",
];

const CONDITIONAL_RIGHT_TRIGGERS = [
  "only",
  "only if",
  "requires",
  "depends on",
  "must",
  "necessitates",
  "presupposes",
  "unless",
  "without",
  "until",
  "except",
];

const CONDITIONAL_INTRO_SUBTITLE = "Diagram it on paper, then choose the matching answer";
const CONDITIONAL_INTRO_TASK =
  "Diagram the statement on paper first. Then choose the diagram that matches what you wrote. The original conditional and its contrapositive are both correct because they mean the same thing.";

function ConditionalRuleMap() {
  return (
    <section className="act-conditional-map" aria-labelledby="conditional-map-title">
      <div className="act-conditional-map-heading">
        <h2 id="conditional-map-title">The conditional map</h2>
        <p>Find the indicator. Then use the group it belongs to.</p>
      </div>

      <div className="act-conditional-sides">
        <section className="act-conditional-side is-left">
          <div className="act-conditional-group-label">Group 1</div>
          <h3>
            <span>Left</span>
            <small>Sufficient triggers</small>
          </h3>
          <p>{CONDITIONAL_LEFT_TRIGGERS.join(", ")}</p>
        </section>

        <section className="act-conditional-side is-right">
          <div className="act-conditional-group-label">Group 2</div>
          <h3>
            <span>Right</span>
            <small>Necessary triggers</small>
          </h3>
          <p>{CONDITIONAL_RIGHT_TRIGGERS.join(", ")}</p>
        </section>
      </div>

      <div className="act-conditional-specials">
        <section className="act-conditional-special is-negative">
          <div className="act-conditional-group-label">Group 3</div>
          <h3>If not</h3>
          <p>
            Put the negation of either idea on the left: <strong>unless, without, until, except</strong>.
          </p>
        </section>
        <section className="act-conditional-special">
          <div className="act-conditional-group-label">Group 4</div>
          <h3>No A&apos;s are B</h3>
          <p>All A&apos;s are not B.</p>
        </section>
      </div>

      <aside className="act-conditional-takeaway" aria-label="Required conditions">
        <h3>Required means right</h3>
        <p>Whatever the statement requires goes on the right side of the arrow.</p>
      </aside>
    </section>
  );
}

export interface ActivityIntroProps {
  title: string;
  subtitle: string | null;
  instructions: ActivityInstructions;
  /** How many questions the run holds. Shown so the student can size the sitting. */
  itemCount?: number;
  /** How many attempts the Coach allows per question, before the answer shows. */
  maxAttempts?: number;
  /**
   * The Activity's format, because the line describing the sitting is only true
   * of the typed Activities. A spoken one has no tries and no credited answer.
   */
  format?: ItemFormat;
  /**
   * Section mode, which changes what the sitting actually is. Absent on every
   * Activity authored before it, so undefined reads as "not a section".
   */
  mode?: string | null;
  /**
   * 1-based question the Start action would drop them on. Above 1 the run is
   * already under way and the button says so rather than reading as a restart.
   */
  resumeAt?: number;
  /** Teacher previews do not write student progress. */
  preview?: boolean;
  /** Whether this run persists submitted answers to the student's assignment. */
  canSaveProgress?: boolean;
  onStart: () => void;
  /** Omitted when the runner is embedded (teacher preview), which has its own chrome. */
  onExit?: () => void;
}

/**
 * The editorial intro, which is what every Activity except a section still gets.
 *
 * Split out of `ActivityIntro` unchanged. It holds four hooks near the top --
 * `useReducedMotion`, a `useRef`, two `useState`s and a `useEffect` -- so the
 * choice between this and the section surface cannot be an early return inside
 * one component: the return would sit above the hooks and break their order the
 * first time `mode` changed without a remount. The wrapper in `ActivityIntro`
 * makes that choice instead, and calls no hooks of its own.
 *
 * Layout mirrors the "Problem & Solution"
 * reference: a pixel-match hero (breadcrumb-with-arrows top-left, mixed-weight
 * title top-right, two big overlapping circles dominant lower-left, each with a
 * large upper label and a single prose line), then a compact detail section
 * below (credited negations + lean rules + the Start action).
 */
export function ActivityEditorialIntro({
  title,
  subtitle,
  instructions,
  itemCount,
  maxAttempts,
  format,
  mode,
  resumeAt,
  onStart,
  onExit,
}: ActivityIntroProps) {
  const ex = instructions.worked_example;
  const reduce = useReducedMotion();
  const resuming = (resumeAt ?? 1) > 1;
  const startLabel = resuming ? `Back to question ${resumeAt}` : "Start";

  /**
   * The primary action is the last thing on this page, under the rules and the
   * worked example. Measured at 1280x900 it sat 1123px down a 1186px page: the
   * one button the student came here to press was below the fold on a desktop
   * window, and further on a laptop.
   *
   * A sticky bar carries it until the real button is actually on screen, then
   * gets out of the way. It carries the resume label too, so it says which
   * question it would return them to rather than being a second Start.
   */
  const startRef = useRef<HTMLButtonElement | null>(null);
  const [startInView, setStartInView] = useState(false);
  // Without an observer the dock could never retire, and a permanent second
  // Start is worse than the scroll it was meant to save. No observer, no dock.
  const [dockSupported] = useState(() => typeof IntersectionObserver !== "undefined");
  useEffect(() => {
    const node = startRef.current;
    if (!node || !dockSupported) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStartInView(entry.isIntersecting),
      { rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [dockSupported]);

  // The "after" orb is the second half of the before/after pair, so it has to
  // be THIS Activity's answer. It used to be a hardcoded string: Negation
  // Station's gloss, rendered on every Activity's intro. Spot the Callback and
  // Find the Conclusion both showed a line about negating "100% conformity",
  // which belongs to neither, while the "before" orb beside it showed their own
  // real statement. The two halves of one example contradicted each other.
  // Credited answer first because it is short enough to sit in a circle; the
  // explanation is the fallback for an Activity authored without one.
  const afterLine = ex?.credited_answers?.[0] ?? ex?.explanation ?? "";

  /**
   * The line under the task, which tells the student the shape of the sitting.
   *
   * It was one hardcoded sentence written for the typed Activities, and it made
   * two claims that are false of a spoken one: that there are tries before a
   * credited answer shows, and that what saves is an answer. Read, Recall,
   * Colour has neither. It also read "1 questions" for any Activity holding a
   * single item, which Read, Recall, Colour does.
   *
   * No chunk count here on purpose. The intro is handed `items.length`, and for
   * a spoken Activity that is 1 whatever the chunking is, so a number in this
   * sentence would be a number the intro cannot actually see.
   *
   * Section mode has its own line, and what it can honestly say has changed.
   *
   * It used to end "Nothing saves until the end, so it is finished in one go or
   * not at all", which was true and was the warning of a real hazard: the run
   * held twenty minutes of work in the tab and a crash took all of it. Each
   * stimulus is now saved as it finishes, so the sentence is no longer true and
   * the fear it asked for is no longer owed.
   *
   * It still does not promise what the other spoken line promises. Stopping
   * halfway remains not a partial score and not a run, because a section is
   * judged whole. The work is kept; the run is not resumable. Those are
   * different things and the line says only the first.
   *
   * The library door needs a third line, and used to get the wrong one.
   *
   * The branch selected on `mode === "section"` and nothing else, so
   * `section-library` -- the mode every student actually starts from -- fell
   * through to the v1 sentence and promised that she could stop whenever she
   * liked and pick up where she left off. That is the one promise a section
   * cannot keep (ADR 0023), and it was printed directly above six rules saying
   * the opposite.
   *
   * It cannot borrow the section line either. The door holds no items of its
   * own, so `itemCount` is 0 there, and that line would open on "0 stimuli".
   * What is true of the door is that it is a list: she picks, and what she
   * picks behaves like a section.
   */
  const howLine =
    format === "spoken-recall"
      ? mode === "section"
        ? `${itemCount ?? ""} stimuli, out loud, in one sitting. Each one is saved as you finish it, and the whole section is marked at the end.`.trim()
        : mode === "section-library"
          ? "Pick a section. Each one runs out loud in one sitting, against its own clock, and is marked once you reach the end of it."
          : "One stimulus, read and told back a chunk at a time. Every recall saves as you go, so you can stop whenever you like and pick up where you left off."
      : [
          itemCount ? `${itemCount} ${itemCount === 1 ? "question" : "questions"}.` : "",
          maxAttempts ? `${maxAttempts} tries each, then the credited answer shows.` : "",
          "Every answer saves as you go, so you can stop whenever you like and pick up on the same question.",
        ]
          .filter(Boolean)
          .join(" ");

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.06,
        delayChildren: reduce ? 0 : 0.04,
      },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduce ? 0 : 0.4, ease: [0.4, 0, 0.2, 1] },
    },
  };

  // The intro is the world's own lobby: `data-world` re-bases every intro
  // token (canvas, cards, ink, accent, display face) onto the world's shell,
  // so each Activity's front door already stands inside its own place.
  const world = worldForTitle(title);
  const showsConditionalMap = world?.slug === "conditional-rephrase";
  // Existing activity rows snapshot their intro copy. Keep this closed-form
  // drill's visible instruction tied to the frontend so stale stored wording
  // cannot reintroduce internal language such as "route."
  const visibleSubtitle = showsConditionalMap ? CONDITIONAL_INTRO_SUBTITLE : subtitle;
  const visibleTask = showsConditionalMap ? CONDITIONAL_INTRO_TASK : instructions.task;

  return (
    <motion.div
      className="act-edit"
      data-world={world?.slug}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* ---- HERO (pixel-match): crumb top-left, title top-right, orbs lower-left ---- */}
      {/* `data-orbs` is what tells the CSS whether the hero has a lower half.
          The brief is absolutely positioned into the hero's empty right side,
          and the ONLY thing giving the hero the height to hold it is the orb
          cluster. An Activity with a task and no worked example renders no
          orbs, so the hero collapses to the title row and the brief lands on
          top of the title. Read, Recall, Colour and Dumb it Down are both that
          shape. Without orbs the brief goes back to ordinary flow below. */}
      <section className="act-hero" data-orbs={ex ? "true" : "false"}>
        <motion.div variants={item} className="act-hero-top">
          <div className="flex flex-col items-start gap-2">
            {onExit && <ActivityExitButton onExit={onExit} tone="light" />}
            <span className="act-edit-crumb" aria-hidden="true">
              <span className="act-edit-crumb-arrow">◀</span>
              <span>{title}</span>
              <span className="act-edit-crumb-arrow">▶</span>
            </span>
          </div>
          <div className="act-hero-heading">
            <h1 className="act-edit-title">
              <span className="act-edit-title-bold">{title}.</span>{" "}
              {visibleSubtitle && <span className="act-edit-title-light">{visibleSubtitle}.</span>}
            </h1>
            {instructions.tagline && <p className="act-hero-tagline">{instructions.tagline}</p>}
          </div>
        </motion.div>

        {ex && (
          <motion.div variants={item} className="act-orbs" aria-label="Worked example">
            <div className="act-orb act-orb--before">
              <div className="act-orb-inner">
                <p className="act-orb-label">Before</p>
                {/* Statements carry the bank's own `*mark*` notation; render it
                    as emphasis rather than leaking asterisks at the door. */}
                <p className="act-orb-statement">{renderInlineMarks(ex.statement, "intro-before")}</p>
              </div>
            </div>
            <div className="act-orb act-orb--after">
              <div className="act-orb-inner">
                <p className="act-orb-label">After</p>
                <p className="act-orb-statement">{afterLine}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* What the student is actually being asked to do.
            The page used to open on a title, two orbs and five rules about
            indicator words, and never once said what to write in the box. The
            task was authored all along (`instructions.task`) and simply had no
            renderer, so every Activity's front door explained its subject and
            withheld its instruction.

            It sits in the hero rather than below the rules because the hero's
            right-hand side under the title is the one large empty region on the
            page, so the instruction costs the layout no height at all. Putting
            it under the rules pushed a Start action that is already past the
            fold a further hundred and forty pixels down. */}
        {visibleTask && (
          <motion.div variants={item} className="act-brief">
            <p className="act-brief-label">What to do</p>
            <p className="act-task">{visibleTask}</p>
            {!showsConditionalMap && <p className="act-how">{howLine}</p>}
          </motion.div>
        )}
      </section>

      {/* ---- DETAIL (compact): the rules, the credited answers, Start ---- */}
      <section className="act-detail">
        <motion.div
          variants={item}
          className="act-detail-grid"
          data-credited={ex && !showsConditionalMap ? "true" : "false"}
          data-conditional-map={showsConditionalMap ? "true" : "false"}
        >
          {/* No worked example means no credited-answers block, so the second
              column has nothing to hold and the rules sit against an empty
              half. Same failure as the hero, one section further down. */}
          {showsConditionalMap ? (
            <ConditionalRuleMap />
          ) : instructions.rules?.length ? (
            <ol className="act-steps">
              {instructions.rules.map((rule, i) => (
                <li key={i} className="act-step">
                  <span className="act-step-num">{i + 1}</span>
                  <span className="act-step-text">{rule}</span>
                </li>
              ))}
            </ol>
          ) : null}

          {ex && !showsConditionalMap && (
            <div className="act-credited">
              <p className="act-credited-label">After, any of these</p>
              <ul className="act-orb-list">
                {ex.credited_answers.map((answer, i) => (
                  <li key={i}>{answer}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>

        {/* The breakdown.
            The numbered rules above say which buttons to press. They do not say
            why the text is taken away, why a summary counts as a miss, or why
            going slowly is the correct way to do this, and every one of those
            is counter-intuitive enough that a student without the reason will
            reasonably do the easier thing instead. Authored per Activity and
            absent on the ones whose procedure explains itself. */}
        {instructions.briefing && (
          <motion.section variants={item} className="act-briefing" aria-label="How this drill works">
            <p className="act-brief-label">How this works</p>
            {/* Authored prose, and authored prose in this codebase carries the
                bank's own `*mark*` notation. The briefing printed it raw, so
                the one sentence in Read, Recall, Colour's briefing that was
                marked for emphasis -- "**Efficiency is never a licence to leave
                information out.**" -- reached the student with its asterisks
                showing. The markup is intentional and seeded into two
                migrations besides the JSON, so the renderer is the thing to
                change, not the content. Every prose slot goes through it, not
                just the one that happens to be marked today. */}
            {instructions.briefing.lede && (
              <p className="act-briefing-lede">
                {renderInlineMarks(instructions.briefing.lede, "briefing-lede")}
              </p>
            )}
            <div className="act-briefing-flow">
              {instructions.briefing.sections.map((section, i) => (
                <section key={i} className="act-briefing-section">
                  <h2 className="act-briefing-heading">
                    {renderInlineMarks(section.heading, `briefing-h-${i}`)}
                  </h2>
                  {section.body.map((para, j) => (
                    <p key={j} className="act-briefing-body">
                      {renderInlineMarks(para, `briefing-${i}-${j}`)}
                    </p>
                  ))}

                  {/* The procedure, when the section carries one. An ordered
                      list rather than a paragraph because this is the part she
                      will come back to look up, and a numbered step can be
                      found again in a way a sentence inside prose cannot. */}
                  {section.steps && (
                    <ol className="act-briefing-steps">
                      {section.steps.map((step, j) => (
                        <li key={j} className="act-briefing-step">
                          <span className="act-briefing-step-label">
                            {renderInlineMarks(step.label, `briefing-sl-${i}-${j}`)}
                          </span>
                          <span className="act-briefing-step-body">
                            {renderInlineMarks(step.body, `briefing-sb-${i}-${j}`)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* Somebody doing it once, on a real stimulus. Nothing else
                      in a briefing does as much work for a process a student
                      has never seen run. */}
                  {section.demo && (
                    <div className="act-briefing-demo">
                      {section.demo.caption && (
                        <p className="act-briefing-demo-caption">{section.demo.caption}</p>
                      )}
                      <ol className="act-briefing-beats">
                        {section.demo.beats.map((beat, j) => (
                          <li key={j} className={`act-briefing-beat is-${beat.kind
                            .toLowerCase()
                            .replace(/[^a-z]+/g, "-")}`}>
                            <span className="act-briefing-beat-kind">{beat.kind}</span>
                            <span className="act-briefing-beat-text">
                              {renderInlineMarks(beat.text, `briefing-bt-${i}-${j}`)}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </section>
              ))}
            </div>
            {instructions.briefing.closer && (
              <p className="act-briefing-closer">
                {renderInlineMarks(instructions.briefing.closer, "briefing-closer")}
              </p>
            )}
          </motion.section>
        )}

        <motion.div variants={item}>
          <button type="button" onClick={onStart} className="act-start" ref={startRef}>
            {startLabel}
            <ArrowRight size={18} strokeWidth={2.25} />
          </button>
        </motion.div>
      </section>

      {/* Retires the moment the real button is on screen: hidden, unfocusable
          and click-through, so it never competes with the button it stands in
          for. While it is live the real Start is simply further down the page,
          still in the tab order where it belongs. */}
      {dockSupported && (
        <div
          className="act-start-dock"
          data-testid="act-start-dock"
          data-retired={startInView ? "true" : "false"}
          aria-hidden={startInView}
        >
          <button type="button" onClick={onStart} className="act-start" tabIndex={startInView ? -1 : 0}>
            {startLabel}
            <ArrowRight size={18} strokeWidth={2.25} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
