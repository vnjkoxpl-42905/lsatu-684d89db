import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { RcToolbar, RcRightRail, RcBottomBar } from '../components/RcChrome';
import { RcPassagePane } from '../components/RcPassagePane';
import { RcQuestionPane } from '../components/RcQuestionPane';
import {
  RcAccessibilityModal,
  RcOverflowMenu,
  RcPauseOverlay,
  RcQuestionDetails,
  RcReviewModal,
  RcSubmitConfirm,
} from '../components/RcModals';
import { useRcA11y } from '../hooks/useRcA11y';
import { useRcHighlights } from '../hooks/useRcHighlights';
import { loadPassage, loadPassages } from '../lib/rcBank';
import {
  currentItem as getCurrentItem,
  initialState,
  isRevealed,
  itemsForPassage,
  pagerEntries,
  passageComplete,
  rcSessionReducer,
  totalBudgetSeconds,
  unansweredCount,
  type RcPagerEntry,
  type RcSessionItem,
} from '../lib/rcSession';
import {
  completeSession,
  createSession,
  getSession,
  getSessionAttempts,
  recordAttempt,
  setAttemptFlag,
} from '../api/rcProgress';
import type { RcDrillConfig, RcLetter, RcPassage } from '../lib/rcTypes';
import '../player.css';

const DEFAULT_CONFIG: RcDrillConfig = {
  reveal: 'per_passage',
  timing: { mode: 'unlimited' },
  source: 'manual',
};

export default function RcPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();

  const [config, setConfig] = React.useState<RcDrillConfig>(DEFAULT_CONFIG);
  const [passages, setPassages] = React.useState<RcPassage[] | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [state, dispatch] = React.useReducer(rcSessionReducer, [], () => initialState([]));

  const reviewOnly = params.get('review') === '1';

  /* ------------------------------------------------------------ boot */

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const existingId = params.get('sessionId');
        const passageParam = params.get('passage');
        const routed = (location.state ?? {}) as {
          config?: RcDrillConfig;
          passageIds?: number[];
          sessionId?: string;
        };

        if (existingId) {
          const session = await getSession(existingId);
          if (!session) throw new Error('That drill could not be found.');
          const loaded = await loadPassages(session.passageIds);
          if (cancelled) return;
          setConfig(session.config);
          setSessionId(session.id);
          setPassages(loaded);
          return;
        }

        if (passageParam) {
          const passage = await loadPassage(Number(passageParam));
          if (!passage) throw new Error('That passage could not be found.');
          const session = await createSession(DEFAULT_CONFIG, [passage.passageId]);
          if (cancelled) return;
          setConfig(DEFAULT_CONFIG);
          setSessionId(session.id);
          setPassages([passage]);
          return;
        }

        if (routed.passageIds?.length) {
          const nextConfig = routed.config ?? DEFAULT_CONFIG;
          const loaded = await loadPassages(routed.passageIds);
          const session =
            routed.sessionId
              ? await getSession(routed.sessionId)
              : await createSession(nextConfig, routed.passageIds);
          if (cancelled) return;
          setConfig(nextConfig);
          setSessionId(session?.id ?? null);
          setPassages(loaded);
          return;
        }

        throw new Error('No drill to run. Start one from the Reading Comprehension hub.');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-boot when the drill being pointed at changes: React Router keeps this
    // component mounted across a search-param change, so an empty dep list
    // would leave a stale session on screen (resume, drill-your-misses).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('sessionId'), params.get('passage'), location.key]);

  // Seed the machine once the passages land, and restore prior work on resume.
  React.useEffect(() => {
    if (!passages) return;
    const seeded = initialState(passages);
    dispatch({ type: 'restore', state: seeded });

    if (!sessionId) return;
    getSessionAttempts(sessionId)
      .then((attempts) => {
        if (attempts.length === 0) return;
        const answers = new Map<number, RcLetter>();
        const flagged = new Set<number>();
        const recorded = new Set<number>();
        for (const a of attempts) {
          if (a.selected) answers.set(a.questionId, a.selected);
          if (a.flagged) flagged.add(a.questionId);
          recorded.add(a.questionId);
        }
        const firstUnanswered = seeded.items.findIndex((i) => !answers.has(i.question.questionId));
        dispatch({
          type: 'restore',
          state: {
            answers,
            flagged,
            recorded,
            currentIndex: firstUnanswered === -1 ? 0 : firstUnanswered,
            // Review deep links show every question's feedback at once.
            submitted: reviewOnly,
          },
        });
      })
      .catch(() => {
        /* resuming without prior answers is still a usable drill */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passages, sessionId]);

  /* ----------------------------------------------------------- tools */

  const a11y = useRcA11y();
  const passageIds = React.useMemo(() => (passages ?? []).map((p) => p.passageId), [passages]);
  const highlights = useRcHighlights(passageIds);

  const [passageOnly, setPassageOnly] = React.useState(false);
  const [findQuery, setFindQuery] = React.useState('');
  const [findIndex, setFindIndex] = React.useState(0);
  const [findCount, setFindCount] = React.useState(0);
  const [masking, setMasking] = React.useState(false);
  const [timerVisible, setTimerVisible] = React.useState(true);
  const [railOpen, setRailOpen] = React.useState(true);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [modal, setModal] = React.useState<
    'review' | 'a11y' | 'details' | 'menu' | 'submit' | null
  >(null);
  const [scrollTops, setScrollTops] = React.useState<Map<number, number>>(new Map());
  const [reattemptPicks, setReattemptPicks] = React.useState<Map<number, RcLetter>>(new Map());
  const [skippedReattempt, setSkippedReattempt] = React.useState<Set<number>>(new Set());

  const rootRef = React.useRef<HTMLDivElement>(null);
  const item = getCurrentItem(state);

  /* ---------------------------------------------------------- clocks */

  const [elapsed, setElapsed] = React.useState(0);
  const questionStart = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (state.paused) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.paused]);

  React.useEffect(() => {
    questionStart.current = Date.now();
  }, [state.currentIndex]);

  const budget = totalBudgetSeconds(config, passages?.length ?? 0);
  const clockSeconds = budget == null ? elapsed : budget - elapsed;
  const overBudget = budget != null && clockSeconds < 0;

  /* --------------------------------------------------------- writing */

  const writeAttempt = React.useCallback(
    async (target: RcSessionItem, selected: RcLetter | null) => {
      if (!sessionId) return;
      const timeMs = Math.max(0, Date.now() - questionStart.current);
      try {
        await recordAttempt({
          sessionId,
          questionId: target.question.questionId,
          passageId: target.passage.passageId,
          selected,
          isCorrect: selected ? selected === target.question.correctAnswer : null,
          timeMs,
          flagged: state.flagged.has(target.question.questionId),
          eliminations: state.eliminations.get(target.question.questionId) ?? [],
          isFirstAttempt: true,
        });
        dispatch({ type: 'markRecorded', questionIds: [target.question.questionId] });
      } catch {
        // A failed write must not swallow the student's place in the drill.
      }
    },
    [sessionId, state.flagged, state.eliminations],
  );

  const recordPassage = React.useCallback(
    async (passageId: number) => {
      const items = itemsForPassage(state, passageId).filter(
        (i) => !state.recorded.has(i.question.questionId),
      );
      for (const target of items) {
        await writeAttempt(target, state.answers.get(target.question.questionId) ?? null);
      }
      dispatch({ type: 'reviewPassage', passageId });
    },
    [state, writeAttempt],
  );

  /* ------------------------------------------------------ navigation */

  const goTo = React.useCallback(
    (index: number) => {
      const leaving = getCurrentItem(state);
      // end_of_set writes silently as the student moves on.
      if (
        leaving &&
        config.reveal === 'end_of_set' &&
        !state.recorded.has(leaving.question.questionId) &&
        state.answers.has(leaving.question.questionId)
      ) {
        void writeAttempt(leaving, state.answers.get(leaving.question.questionId) ?? null);
      }
      dispatch({ type: 'goto', index });
    },
    [state, config.reveal, writeAttempt],
  );

  const handleSubmit = React.useCallback(async () => {
    for (const target of state.items) {
      if (!state.recorded.has(target.question.questionId)) {
        await writeAttempt(target, state.answers.get(target.question.questionId) ?? null);
      }
    }
    dispatch({ type: 'submit' });
    if (sessionId) {
      await completeSession(sessionId);
      navigate(`/rc/results/${sessionId}`);
    }
  }, [state, writeAttempt, sessionId, navigate]);

  /* -------------------------------------------------------- keyboard */

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (modal) return;
      if (!item) return;

      if (e.key === 'ArrowLeft') dispatch({ type: 'prev' });
      else if (e.key === 'ArrowRight') dispatch({ type: 'next' });
      else if (e.key.toLowerCase() === 'f') {
        dispatch({ type: 'toggleFlag', questionId: item.question.questionId });
        if (sessionId) {
          void setAttemptFlag(
            sessionId,
            item.question.questionId,
            !state.flagged.has(item.question.questionId),
          );
        }
      } else if (/^[a-eA-E]$/.test(e.key)) {
        const letter = e.key.toUpperCase() as RcLetter;
        if (item.question.choices.some((c) => c.letter === letter)) {
          dispatch({ type: 'select', questionId: item.question.questionId, letter });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, modal, sessionId, state.flagged]);

  /* ----------------------------------------------------------- render */

  if (error) {
    return (
      <div className="rc-player" style={{ padding: 40 }}>
        <p style={{ fontSize: 15, marginBottom: 16 }}>{error}</p>
        <button type="button" className="rc-button rc-button-primary" onClick={() => navigate('/rc')}>
          Go to Reading Comprehension
        </button>
      </div>
    );
  }

  if (!passages || !item) {
    return (
      <div className="rc-player" style={{ padding: 40 }}>
        <p style={{ fontSize: 15 }}>Loading the passage…</p>
      </div>
    );
  }

  const revealed = isRevealed(state, config.reveal, item);
  const questionId = item.question.questionId;
  const selected = state.answers.get(questionId) ?? null;

  // Review of work the student did not just answer starts with a fresh attempt.
  const reattemptMode =
    reviewOnly &&
    state.recorded.has(questionId) &&
    !reattemptPicks.has(questionId) &&
    !skippedReattempt.has(questionId);

  const passageDone = passageComplete(state, item.passage.passageId);
  const passageReviewed = state.reviewedPassages.has(item.passage.passageId);

  const pillClassFor = (entry: RcPagerEntry): string => {
    const classes = ['rc-pill'];
    if (entry.index === state.currentIndex && entry.kind === 'question') classes.push('rc-pill-current');
    if (entry.kind === 'question' && entry.questionId != null) {
      const target = state.items.find((i) => i.question.questionId === entry.questionId);
      const pick = state.answers.get(entry.questionId);
      const showResult = target ? isRevealed(state, config.reveal, target) : false;
      if (showResult && pick && target) {
        classes.push(pick === target.question.correctAnswer ? 'rc-pill-correct' : 'rc-pill-incorrect');
      } else if (pick) {
        classes.push('rc-pill-answered');
      }
    }
    return classes.join(' ');
  };

  const bottomAction = (() => {
    if (reviewOnly) return null;
    if (config.reveal === 'per_question') {
      return (
        <button
          type="button"
          className="rc-button rc-button-primary"
          disabled={!selected || revealed}
          onClick={async () => {
            await writeAttempt(item, selected);
            dispatch({ type: 'reveal', questionId });
          }}
        >
          Confirm
        </button>
      );
    }
    if (config.reveal === 'per_passage') {
      if (passageReviewed) {
        const nextPassageItem = state.items.findIndex(
          (i) => i.passageIndex === item.passageIndex + 1,
        );
        return nextPassageItem === -1 ? (
          <button type="button" className="rc-button rc-button-primary" onClick={handleSubmit}>
            Finish drill
          </button>
        ) : (
          <button
            type="button"
            className="rc-button rc-button-primary"
            onClick={() => goTo(nextPassageItem)}
          >
            Continue to next passage
          </button>
        );
      }
      return (
        <button
          type="button"
          className="rc-button rc-button-primary"
          disabled={!passageDone}
          onClick={() => recordPassage(item.passage.passageId)}
        >
          Check passage
        </button>
      );
    }
    return (
      <button type="button" className="rc-button rc-button-primary" onClick={() => setModal('submit')}>
        Submit
      </button>
    );
  })();

  return (
    <div
      className={`rc-player ${a11y.className}${passageOnly ? ' rc-passage-only' : ''}`}
      style={a11y.style}
      ref={rootRef}
    >
      {reviewOnly && <span className="rc-review-badge">REVIEW</span>}

      <RcToolbar
        passageOnly={passageOnly}
        onTogglePassageOnly={() => setPassageOnly((v) => !v)}
        findQuery={findQuery}
        onFindChange={(v) => {
          setFindQuery(v);
          setFindIndex(0);
        }}
        onFindEnter={() => setFindIndex((i) => (findCount === 0 ? 0 : (i + 1) % findCount))}
        findCount={findCount}
        findIndex={findIndex}
        currentNumber={item.number}
        totalQuestions={state.items.length}
        clockSeconds={clockSeconds}
        clockIsCountdown={budget != null}
        clockOverBudget={overBudget}
        timerVisible={timerVisible}
        onToggleTimer={() => setTimerVisible((v) => !v)}
        onOpenMenu={() => setModal('menu')}
      />

      <div className="rc-body">
        <RcPassagePane
          passage={item.passage}
          highlights={highlights.forPassage(item.passage.passageId)}
          color={highlights.color}
          onColorChange={highlights.setColor}
          onAddHighlight={(start, end, chosen) =>
            highlights.add(item.passage.passageId, 'passage', start, end, chosen)
          }
          onRemoveHighlight={(offset) =>
            highlights.removeAt(item.passage.passageId, 'passage', offset)
          }
          findQuery={findQuery}
          findIndex={findIndex}
          onFindCount={setFindCount}
          scrollTop={scrollTops.get(item.passage.passageId) ?? 0}
          onScroll={(top) =>
            setScrollTops((prev) => new Map(prev).set(item.passage.passageId, top))
          }
        />

        {!passageOnly && (
          <RcQuestionPane
            item={item}
            selected={selected}
            eliminations={state.eliminations.get(questionId) ?? []}
            revealed={revealed}
            masking={masking}
            reattemptMode={reattemptMode}
            reattemptPick={reattemptPicks.get(questionId) ?? null}
            onSelect={(letter) => {
              if (reattemptMode) {
                setReattemptPicks((prev) => new Map(prev).set(questionId, letter));
                void recordAttempt({
                  sessionId: sessionId!,
                  questionId,
                  passageId: item.passage.passageId,
                  selected: letter,
                  isCorrect: letter === item.question.correctAnswer,
                  timeMs: Math.max(0, Date.now() - questionStart.current),
                  flagged: state.flagged.has(questionId),
                  eliminations: state.eliminations.get(questionId) ?? [],
                  isFirstAttempt: false,
                });
                return;
              }
              if (revealed) return;
              dispatch({ type: 'select', questionId, letter });
            }}
            onToggleElimination={(letter) =>
              dispatch({ type: 'toggleElimination', questionId, letter })
            }
            onSkipToAnswer={() => setSkippedReattempt((prev) => new Set(prev).add(questionId))}
          />
        )}

        {railOpen && (
          <RcRightRail
            isFullscreen={isFullscreen}
            onFullscreen={() => {
              if (document.fullscreenElement) {
                void document.exitFullscreen();
                setIsFullscreen(false);
              } else {
                void rootRef.current?.requestFullscreen();
                setIsFullscreen(true);
              }
            }}
            onOpenReview={() => setModal('review')}
            onOpenA11y={() => setModal('a11y')}
            onToggleFlag={() => {
              dispatch({ type: 'toggleFlag', questionId });
              if (sessionId) {
                void setAttemptFlag(sessionId, questionId, !state.flagged.has(questionId));
              }
            }}
            flagged={state.flagged.has(questionId)}
            onToggleMasking={() => setMasking((v) => !v)}
            masking={masking}
            onCollapse={() => setRailOpen(false)}
          />
        )}
      </div>

      <RcBottomBar
        itemChip={`PrepTest ${item.passage.preptest} · S${item.passage.section} · P${item.passage.setNumber} · Q${item.number}`}
        entries={pagerEntries(state)}
        currentIndex={state.currentIndex}
        pillClass={pillClassFor}
        isFlagged={(entry) =>
          entry.kind === 'question' && entry.questionId != null
            ? state.flagged.has(entry.questionId)
            : false
        }
        onNavigate={goTo}
        onPrev={() => goTo(Math.max(0, state.currentIndex - 1))}
        onNext={() => goTo(Math.min(state.items.length - 1, state.currentIndex + 1))}
        canPrev={state.currentIndex > 0}
        canNext={state.currentIndex < state.items.length - 1}
        action={bottomAction}
      />

      {modal === 'review' && (
        <RcReviewModal
          items={state.items}
          currentIndex={state.currentIndex}
          answered={(i) => state.answers.has(i.question.questionId)}
          flagged={(i) => state.flagged.has(i.question.questionId)}
          pillClass={(i, index) =>
            pillClassFor({
              kind: 'question',
              passageId: i.passage.passageId,
              index,
              label: String(i.number),
              questionId: i.question.questionId,
            })
          }
          onNavigate={goTo}
          onClose={() => setModal(null)}
          onSubmit={
            config.reveal === 'end_of_set' && !reviewOnly
              ? () => setModal('submit')
              : undefined
          }
        />
      )}

      {modal === 'a11y' && (
        <RcAccessibilityModal
          settings={a11y.settings}
          onChange={a11y.update}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'details' && (
        <RcQuestionDetails
          question={item.question}
          passage={item.passage}
          number={item.number}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'menu' && (
        <RcOverflowMenu
          onClose={() => setModal(null)}
          onQuestionDetails={() => setModal('details')}
          onPause={() => {
            dispatch({ type: 'setPaused', paused: true });
            setModal(null);
          }}
          onSaveExit={() => navigate('/rc')}
          onSubmit={
            config.reveal === 'end_of_set' && !reviewOnly ? () => setModal('submit') : undefined
          }
        />
      )}

      {modal === 'submit' && (
        <RcSubmitConfirm
          unanswered={unansweredCount(state)}
          onCancel={() => setModal(null)}
          onConfirm={() => {
            setModal(null);
            void handleSubmit();
          }}
        />
      )}

      {state.paused && (
        <RcPauseOverlay onResume={() => dispatch({ type: 'setPaused', paused: false })} />
      )}
    </div>
  );
}
