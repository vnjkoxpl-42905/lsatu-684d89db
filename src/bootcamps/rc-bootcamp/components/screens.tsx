/**
 * The six screen types.
 *
 * All lesson prose is repo-authored HTML from content.ts and is injected as
 * markup so the author's emphasis, marks, and paragraphing survive intact. The
 * only untrusted string on any of these screens is the student's own writing,
 * which is rendered as text, never as markup.
 */

import { useEffect, useRef, useState } from 'react';
import { PASSAGES, WRITE_MIN_CHARS, type Callout, type Passage, type Screen } from '../content';
import { FIRST_ATTEMPT_KEY, actOf } from '../lessonMeta';
import { useLesson } from '../useLesson';
import { META_ICONS } from './Icons';

const html = (value: string) => ({ __html: value });

function CalloutBlock({ callout }: { callout: Callout }) {
  if (callout.variant === 'dominant') {
    return (
      <div className="rc-thesis">
        <div className="rc-thesis-label">{callout.label}</div>
        <div className="rc-thesis-body" dangerouslySetInnerHTML={html(callout.body)} />
      </div>
    );
  }
  return (
    <div className="rc-callout">
      <div className="rc-callout-label">{callout.label}</div>
      <div className="rc-callout-body" dangerouslySetInnerHTML={html(callout.body)} />
    </div>
  );
}

/**
 * Act line, kicker, title, lede. The kicker shows the screen's own descriptor
 * when it has one and otherwise the chapter name — never a chapter number. The
 * act line above it says which of the lesson's four parts they are in, and is
 * omitted on the payoff screen where the sparseness is the point.
 */
function ScreenHead({
  screen,
  chapterName,
  chapterIndex,
  headingRef,
}: {
  screen: Extract<Screen, { title: string }>;
  chapterName: string;
  chapterIndex: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const kicker = screen.eyebrow || chapterName;
  const isPayoff = 'layout' in screen && screen.layout === 'payoff';
  const act = isPayoff ? undefined : actOf(chapterIndex);
  return (
    <>
      {act ? <div className="rc-act">{act.label}</div> : null}
      {kicker ? <div className="rc-eyebrow">{kicker}</div> : null}
      {screen.title ? (
        <h1 className="rc-title" tabIndex={-1} ref={headingRef}>
          {screen.title}
        </h1>
      ) : null}
      {'lede' in screen && screen.lede ? <p className="rc-lede">{screen.lede}</p> : null}
    </>
  );
}

function PassageCard({ passage }: { passage: Passage }) {
  // A drop cap on a quotation mark or a bracket reads as a mistake, so only a
  // letter or a digit gets one.
  const firstChar = (passage.paras[0] ?? '').trim().charAt(0);
  const dropCap = /^[A-Za-z0-9]$/.test(firstChar);
  return (
    <div className={`rc-card rc-passage-card${dropCap ? ' rc-has-dropcap' : ''}`}>
      {passage.source ? <div className="rc-passage-source">{passage.source}</div> : null}
      <div className="rc-prose">
        {passage.paras.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </div>
  );
}

/**
 * The student's own from-memory attempt, shown against the author's main point
 * at the moment the lesson reveals it. This is the personal proof the whole
 * exercise is built on, so it is their text verbatim: never edited, never
 * truncated, never stood in for. If they wrote nothing, nothing renders.
 */
function FirstAttemptQuote() {
  const { state } = useLesson();
  const attempt = String(state.data[FIRST_ATTEMPT_KEY] ?? '').trim();
  if (!attempt) return null;
  return (
    <div className="rc-quote rc-ghost-quote">
      <span className="rc-quote-tag">What you remembered after one read</span>
      <p>{attempt}</p>
    </div>
  );
}

export function ProseScreen({
  screen,
  chapterName,
  chapterIndex,
  headingRef,
}: {
  screen: Extract<Screen, { type: 'prose' }>;
  chapterName: string;
  chapterIndex: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  // The dominant callout is the thesis reveal; that is the one place their own
  // attempt belongs. Keyed off the callout, not a chapter number, so it cannot
  // drift if the screen moves.
  const isThesisReveal = screen.callout?.variant === 'dominant';
  return (
    <>
      <ScreenHead
        screen={screen}
        chapterName={chapterName}
        chapterIndex={chapterIndex}
        headingRef={headingRef}
      />
      <div className="rc-prose" dangerouslySetInnerHTML={html(screen.body)} />
      {screen.directive ? <p className="rc-directive">{screen.directive}</p> : null}
      {isThesisReveal ? <FirstAttemptQuote /> : null}
      {screen.callout ? <CalloutBlock callout={screen.callout} /> : null}
    </>
  );
}

export function InstructionsScreen({
  screen,
  chapterName,
  chapterIndex,
  headingRef,
}: {
  screen: Extract<Screen, { type: 'instructions' }>;
  chapterName: string;
  chapterIndex: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <>
      <ScreenHead
        screen={screen}
        chapterName={chapterName}
        chapterIndex={chapterIndex}
        headingRef={headingRef}
      />
      <div className="rc-instr-card">
        <div className="rc-instr-meta">
          {screen.meta.map((item) => {
            const Icon = META_ICONS[item.icon];
            return (
              <span className="rc-chip" key={item.text}>
                <Icon />
                {item.text}
              </span>
            );
          })}
        </div>
        <ol className="rc-steps">
          {screen.steps.map((step, i) => (
            <li key={i} dangerouslySetInnerHTML={html(step)} />
          ))}
        </ol>
      </div>
    </>
  );
}

/**
 * The read screen is a landing pad: the timed surface opens over it on arrival,
 * and this is what the student sees if they close it by accident.
 */
export function ReadScreen({ onReopen }: { onReopen: () => void }) {
  return (
    <>
      <div className="rc-eyebrow">Reading</div>
      <h1 className="rc-title">The passage is open</h1>
      <p className="rc-lede">If you closed it by accident, reopen it below. Nothing is lost.</p>
      <button type="button" className="rc-btn" onClick={onReopen}>
        Reopen the passage
      </button>
    </>
  );
}

export function PassageScreen({
  screen,
  chapterName,
  chapterIndex,
  headingRef,
}: {
  screen: Extract<Screen, { type: 'passage' }>;
  chapterName: string;
  chapterIndex: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <>
      <ScreenHead
        screen={screen}
        chapterName={chapterName}
        chapterIndex={chapterIndex}
        headingRef={headingRef}
      />
      {screen.intro ? <div className="rc-prose" dangerouslySetInnerHTML={html(screen.intro)} /> : null}
      <PassageCard passage={PASSAGES[screen.passageId]} />
      {screen.followUp?.kind === 'prompt' ? (
        <div className="rc-prose rc-after-prompt">
          <p dangerouslySetInnerHTML={html(screen.followUp.text)} />
        </div>
      ) : null}
      {screen.followUp?.kind === 'debrief' ? (
        <div className="rc-reveal rc-after-debrief">
          <div className="rc-reveal-label">Working through it</div>
          <div className="rc-prose" dangerouslySetInnerHTML={html(screen.followUp.html)} />
        </div>
      ) : null}
    </>
  );
}

export function WriteScreen({
  screen,
  chapterName,
  chapterIndex,
  headingRef,
}: {
  screen: Extract<Screen, { type: 'write' }>;
  chapterName: string;
  chapterIndex: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const { state, setWrite, skipWrite, reveal, isFirstWrite } = useLesson();
  const stored = String(state.data[screen.storageKey] ?? '');
  const [text, setText] = useState(stored);
  const [savedPill, setSavedPill] = useState(false);
  const revealRef = useRef<HTMLDivElement>(null);
  const questionId = `write-q-${screen.id}`;

  // Reset when the student navigates to a different write screen.
  useEffect(() => {
    setText(String(state.data[screen.storageKey] ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.id]);

  // The pill only appears for a save that actually succeeded, and only for a
  // save this screen asked for.
  const lastToken = useRef(state.saveToken);
  useEffect(() => {
    if (state.saveToken === lastToken.current) return;
    lastToken.current = state.saveToken;
    if (!state.saveOk) return;
    setSavedPill(true);
    const t = window.setTimeout(() => setSavedPill(false), 1800);
    return () => window.clearTimeout(t);
  }, [state.saveToken, state.saveOk]);

  const trimmed = text.trim();
  const metMinimum = trimmed.length >= WRITE_MIN_CHARS;
  const words = trimmed ? trimmed.split(/\s+/).length : 0;

  function onChange(value: string) {
    setText(value);
    // Put every keystroke into lesson state immediately. The persistence layer
    // mirrors that snapshot locally and serializes cloud writes, so closing or
    // navigating away cannot strand the last 600ms of a student's response.
    setWrite(screen.storageKey, value);
  }

  function onReveal() {
    setWrite(screen.storageKey, text);
    reveal();
  }

  useEffect(() => {
    if (!state.revealed) return;
    revealRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [state.revealed]);

  return (
    <>
      <ScreenHead
        screen={screen}
        chapterName={chapterName}
        chapterIndex={chapterIndex}
        headingRef={headingRef}
      />
      {screen.intro ? <div className="rc-prose" dangerouslySetInnerHTML={html(screen.intro)} /> : null}
      <div className="rc-write">
        <div className="rc-write-label">Your response</div>
        <div className="rc-write-q" id={questionId} dangerouslySetInnerHTML={html(screen.question)} />
        <textarea
          className="rc-textarea"
          aria-labelledby={questionId}
          placeholder={screen.placeholder}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="rc-write-foot">
          <button
            type="button"
            className="rc-btn"
            disabled={!metMinimum || state.revealed}
            onClick={onReveal}
          >
            {state.revealed ? 'Revealed' : screen.reveal.buttonLabel}
          </button>
          {!isFirstWrite && !state.writeSkipped ? (
            <button type="button" className="rc-btn rc-btn-ghost" onClick={skipWrite}>
              Skip without writing
            </button>
          ) : null}
          <span className="rc-count">
            {metMinimum
              ? words
                ? `${words} words`
                : ''
              : `${trimmed.length} of ${WRITE_MIN_CHARS} characters`}
          </span>
          <span className={`rc-savepill${savedPill ? ' on' : ''}`}>
            <span className="dot" />
            Saved
          </span>
        </div>
      </div>
      <div ref={revealRef}>
        {state.revealed ? (
          <div className="rc-reveal">
            <div className="rc-reveal-label">{screen.reveal.sectionLabel}</div>
            <div className="rc-prose" dangerouslySetInnerHTML={html(screen.reveal.html)} />
          </div>
        ) : null}
      </div>
    </>
  );
}

interface BeatPlacement {
  /** Grid coordinates, consumed only by the wide-viewport layout. */
  style: React.CSSProperties;
  /** True when this reaction sits in the margin column beside its quote. */
  margin: boolean;
}

/**
 * Grid coordinates for the wide-viewport margin-note layout.
 *
 * Each quote or check-in opens a row in the main column; a reaction that
 * immediately follows a quote shares that row in the margin column, so it reads
 * like a pencil note beside the line it answers. A reaction with no preceding
 * quote — and every check-in — stays in the main column.
 *
 * This is layout only. It is computed from the full beat list, so a beat's
 * position never shifts as later beats appear, and it has no bearing on the
 * order or timing in which they appear.
 */
function beatPlacement(beats: Extract<Screen, { type: 'walk' }>['beats']): BeatPlacement[] {
  let row = 0;
  return beats.map((beat, i) => {
    const followsQuote = i > 0 && beats[i - 1].kind === 'quote';
    if (beat.kind === 'reaction' && followsQuote) {
      return { style: { '--rc-row': row, '--rc-col': 2 } as React.CSSProperties, margin: true };
    }
    row += 1;
    return { style: { '--rc-row': row, '--rc-col': 1 } as React.CSSProperties, margin: false };
  });
}

/**
 * Walkthrough. PROTECTED INTERACTION: the quote → check-in → author-reaction
 * rhythm and its markup are ported as-is. The student commits to an answer
 * before the reaction appears, and no keyboard path skips that.
 */
export function WalkScreen({
  screen,
  chapterName,
  chapterIndex,
  headingRef,
}: {
  screen: Extract<Screen, { type: 'walk' }>;
  chapterName: string;
  chapterIndex: number;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const { state, pick } = useLesson();
  const shown = screen.beats.slice(0, state.beatsShown);
  const lastBeatRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    lastBeatRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
  }, [state.beatsShown]);

  const complete = state.beatsShown >= screen.beats.length;
  const placement = beatPlacement(screen.beats);

  return (
    <>
      <ScreenHead
        screen={screen}
        chapterName={chapterName}
        chapterIndex={chapterIndex}
        headingRef={headingRef}
      />
      {screen.intro ? (
        <div
          className={`rc-prose rc-intro-block${screen.introStyle === 'why' ? ' rc-intro-why' : ''}`}
          dangerouslySetInnerHTML={html(screen.intro)}
        />
      ) : null}
      <div className="rc-chunks">
        {shown.map((beat, i) => {
          const isLast = i === shown.length - 1;
          const ref = isLast ? lastBeatRef : undefined;
          const place = placement[i];
          if (beat.kind === 'quote') {
            return (
              <div className="rc-chunk" key={i} ref={ref} style={place.style}>
                <div className="rc-quote">
                  <span className="rc-quote-tag">From the passage</span>
                  <div dangerouslySetInnerHTML={html(beat.html)} />
                </div>
              </div>
            );
          }
          if (beat.kind === 'reaction') {
            return (
              <div
                className={`rc-chunk${place.margin ? ' rc-chunk-margin' : ''}`}
                key={i}
                ref={ref}
                style={place.style}
              >
                <div className="rc-react">
                  <div className="rc-react-mark">J</div>
                  <div className="rc-react-body" dangerouslySetInnerHTML={html(beat.html)} />
                </div>
              </div>
            );
          }
          const picked = state.picks[i];
          const questionId = `rc-checkin-${screen.id}-${i}`;
          return (
            <div className="rc-chunk" key={i} ref={ref} style={place.style}>
              <div className="rc-checkin">
                <div className="rc-checkin-q" id={questionId} dangerouslySetInnerHTML={html(beat.question)} />
                <div className="rc-opts" role="radiogroup" aria-labelledby={questionId}>
                  {beat.options.map((option, oi) => (
                    <button
                      key={oi}
                      type="button"
                      className={`rc-opt${picked === oi ? ' picked' : ''}`}
                      role="radio"
                      aria-checked={picked === oi}
                      onClick={() => pick(i, oi, option)}
                    >
                      <span className="rc-opt-key">{String.fromCharCode(65 + oi)}</span>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
                {picked !== undefined && beat.note ? (
                  <div className="rc-checkin-note" dangerouslySetInnerHTML={html(beat.note)} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {complete ? (
        <div>
          {screen.outroCallout ? <CalloutBlock callout={screen.outroCallout} /> : null}
          {screen.outro ? (
            <div className="rc-reveal">
              <div className="rc-reveal-label">Pulling it together</div>
              <div className="rc-prose" dangerouslySetInnerHTML={html(screen.outro)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
