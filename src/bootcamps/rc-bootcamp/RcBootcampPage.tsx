/**
 * "Engaging With The Passage" — the RC bootcamp lesson page.
 *
 * 33 screens across 17 chapters. The structure is closed: screens are never
 * merged, split, or reordered. Everything the student reads comes from
 * content.ts verbatim.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CHAPTERS, TOTAL_SCREENS } from './content';
import { createSupabaseAdapter, localAdapter } from './persistence';
import { LessonProvider, useLesson, usePrimaryAction } from './useLesson';
import { ChapterProgress } from './components/ChapterProgress';
import { CompletionScreen } from './components/CompletionScreen';
import { ChevronLeft, ChevronRight, MenuIcon } from './components/Icons';
import {
  InstructionsScreen,
  PassageScreen,
  ProseScreen,
  ReadScreen,
  WalkScreen,
  WriteScreen,
} from './components/screens';
import { StartScreen } from './components/StartScreen';
import { TestDayOverlay } from './components/TestDayOverlay';
import { TocSheet } from './components/TocSheet';
import './styles/scoped.css';

const LESSON_ID = 'rc-engaging-with-the-passage';

function Lesson() {
  const {
    state,
    screen,
    chapterIndex,
    go,
    setOverlay,
    setToc,
    consumeHeadingFocus,
  } = useLesson();
  const primary = usePrimaryAction();
  const navigate = useNavigate();
  const tocButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  const chapterName = CHAPTERS[chapterIndex].name;

  // The timed surface opens on arrival at a read screen and closes to the next
  // screen. Re-entering restarts the clock, which is the intent.
  useEffect(() => {
    if (state.finished) return;
    if (screen.type === 'read') {
      const t = window.setTimeout(() => setOverlay(true), 60);
      return () => window.clearTimeout(t);
    }
    setOverlay(false);
  }, [screen, state.finished, setOverlay]);

  // Every screen change starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.index, state.finished]);

  // A Contents jump hands focus to the new heading.
  useEffect(() => {
    if (!state.focusHeading) return;
    headingRef.current?.focus();
    consumeHeadingFocus();
  }, [state.focusHeading, state.index, consumeHeadingFocus]);

  // Keyboard navigation. The overlay and the Contents dialog own the keys while
  // they are open, and arrows inside a textarea or the progress strip are theirs.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (state.overlayOpen) return;
      if (event.key === 'Escape') {
        setToc(false);
        return;
      }
      if (state.tocOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'TEXTAREA') return;
      if (target?.closest?.('#progress')) return;
      if (event.key === 'ArrowRight' && !primary.disabled) primary.onAct();
      if (event.key === 'ArrowLeft') go(-1);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [state.overlayOpen, state.tocOpen, primary, go, setToc]);

  const progressPercent = state.finished
    ? 100
    : Math.round(((state.index + 1) / TOTAL_SCREENS) * 100);
  const progressText = state.finished
    ? 'Lesson complete'
    : `Chapter ${chapterIndex + 1} of ${CHAPTERS.length}: ${chapterName}`;

  const body = useMemo(() => {
    if (state.finished) return <CompletionScreen />;
    switch (screen.type) {
      case 'prose':
        return <ProseScreen screen={screen} chapterName={chapterName} chapterIndex={chapterIndex} headingRef={headingRef} />;
      case 'instructions':
        return (
          <InstructionsScreen screen={screen} chapterName={chapterName} chapterIndex={chapterIndex} headingRef={headingRef} />
        );
      case 'read':
        return <ReadScreen onReopen={() => setOverlay(true)} />;
      case 'passage':
        return <PassageScreen screen={screen} chapterName={chapterName} chapterIndex={chapterIndex} headingRef={headingRef} />;
      case 'write':
        return <WriteScreen screen={screen} chapterName={chapterName} chapterIndex={chapterIndex} headingRef={headingRef} />;
      case 'walk':
        return <WalkScreen screen={screen} chapterName={chapterName} chapterIndex={chapterIndex} headingRef={headingRef} />;
      default:
        return null;
    }
  }, [screen, chapterName, chapterIndex, state.finished, setOverlay]);

  const layoutClass =
    !state.finished && screen.type === 'prose' && screen.layout === 'payoff'
      ? 'rc-stage mood-payoff'
      : 'rc-stage';
  const screenClass =
    !state.finished && screen.type === 'prose' && screen.layout === 'payoff'
      ? 'rc-screen rc-mood-payoff'
      : 'rc-screen';

  return (
    <div className="rc-bootcamp">
      <header className="rc-top">
        <div className="rc-top-inner">
          <button
            type="button"
            className="rc-exit-btn"
            onClick={() => navigate('/bootcamps')}
          >
            Exit
          </button>
          <div className="rc-brand">
            <div className="rc-brand-mark">RC</div>
            <div className="rc-brand-txt">
              RC Bootcamp <span>· Engaging With The Passage</span>
            </div>
          </div>
          <div className="rc-top-spacer" />
          <div className="rc-counter">
            {state.finished ? 'Complete' : `Chapter ${chapterIndex + 1} of ${CHAPTERS.length}`}
          </div>
          <button
            type="button"
            className="rc-toc-btn"
            ref={tocButtonRef}
            aria-haspopup="dialog"
            aria-expanded={state.tocOpen}
            onClick={() => setToc(true)}
          >
            <MenuIcon />
            Contents
          </button>
        </div>
        <ChapterProgress />
        <div
          className="rc-vh"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-valuetext={progressText}
        />
        <div className="rc-vh" aria-live="polite">
          {state.announcement}
        </div>
        <div className="rc-vh" aria-live="assertive">
          {state.urgentAnnouncement}
        </div>
      </header>

      <TocSheet triggerRef={tocButtonRef} />

      <main className={layoutClass}>
        <div className={screenClass} key={state.finished ? 'complete' : screen.id}>
          {body}
        </div>
      </main>

      <nav className="rc-footnav" aria-label="Lesson navigation">
        <div className="rc-footnav-inner">
          <button
            type="button"
            className={`rc-btn rc-btn-ghost${state.index === 0 && !state.finished ? ' rc-invisible' : ''}`}
            onClick={() => go(-1)}
          >
            <ChevronLeft /> Back
          </button>
          <div className="rc-footnav-spacer" />
          <span className="rc-hint">{primary.hint}</span>
          <button
            type="button"
            className="rc-btn"
            ref={nextButtonRef}
            disabled={primary.disabled}
            onClick={primary.onAct}
          >
            {primary.label}
            {primary.chevron ? <ChevronRight /> : null}
          </button>
        </div>
      </nav>

      {state.overlayOpen && screen.type === 'read' ? (
        <TestDayOverlay
          screen={screen}
          onDone={() => {
            setOverlay(false);
            go(1);
            nextButtonRef.current?.focus();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * The cover gate.
 *
 * `Lesson` mounts only after the student presses Enter, so none of its effects
 * — the timed-read overlay in particular — can fire while the cover is still
 * up. Waiting for hydration before showing the cover is what lets the cover
 * label itself Enter or Resume honestly rather than flashing the wrong one.
 */
function LessonHost() {
  const { state } = useLesson();
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);

  if (!state.hydrated) {
    return <div className="rc-bootcamp" aria-busy="true" />;
  }

  if (!entered) {
    return (
      <div className="rc-bootcamp">
        <StartScreen onEnter={() => setEntered(true)} onExit={() => navigate('/bootcamps')} />
      </div>
    );
  }

  return <Lesson />;
}

export default function RcBootcampPage() {
  const { user } = useAuth();
  const adapter = useMemo(
    () => (user?.id ? createSupabaseAdapter(user.id, LESSON_ID) : localAdapter),
    [user?.id],
  );

  return (
    <LessonProvider adapter={adapter}>
      <LessonHost />
    </LessonProvider>
  );
}
