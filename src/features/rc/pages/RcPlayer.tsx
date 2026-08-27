import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialSessionStrip from '@/components/drill/official/OfficialSessionStrip';
import OfficialDrillToolbar from '@/components/drill/official/OfficialDrillToolbar';
import OfficialSmartDrillBar from '@/components/drill/official/OfficialSmartDrillBar';
import { RcPager, RcToolbarButton, formatClock } from '../components/RcChrome';
import { RcExamPane, rcTypeStyles } from '../components/RcExamPane';
import { RcPassagePane } from '../components/RcPassagePane';
import { RcQuestionPane } from '../components/RcQuestionPane';
import { RcPassageSummary } from '../components/RcPassageSummary';
import {
  RcOverflowMenu,
  RcQuestionDetails,
  RcSubmitConfirm,
  RcTextSettings,
} from '../components/RcModals';
import { RC_DIRECTIONS, RC_FONT_SCALE_OPTIONS } from '../lib/rcDirections';
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
import type { RcDrillConfig, RcHighlightMode, RcLetter, RcPassage } from '../lib/rcTypes';
import { useDrillHubSectionNavigation } from '@/hooks/useDrillHubSectionNavigation';
// The player owns player.css; rc.css carries the review layer, which mounts
// inside the player too, so it must not depend on the hub having been visited.
import '../rc.css';
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
  const openDrillHubSection = useDrillHubSectionNavigation();

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
  const [highlightMode, setHighlightMode] = React.useState<RcHighlightMode>('none');
  const [modal, setModal] = React.useState<'details' | 'menu' | 'submit' | null>(null);
  const [scrollTops, setScrollTops] = React.useState<Map<number, number>>(new Map());
  const [reattemptPicks, setReattemptPicks] = React.useState<Map<number, RcLetter>>(new Map());
  const [skippedReattempt, setSkippedReattempt] = React.useState<Set<number>>(new Set());

  const item = getCurrentItem(state);
  const type = React.useMemo(
    () => rcTypeStyles(a11y.fontScale, a11y.extraLeading),
    [a11y.fontScale, a11y.extraLeading],
  );

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

  const toggleFlag = React.useCallback(
    (questionId: number) => {
      dispatch({ type: 'toggleFlag', questionId });
      if (sessionId) {
        void setAttemptFlag(sessionId, questionId, !state.flagged.has(questionId));
      }
    },
    [sessionId, state.flagged],
  );

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
        toggleFlag(item.question.questionId);
      } else if (/^[a-eA-E]$/.test(e.key)) {
        const letter = e.key.toUpperCase() as RcLetter;
        if (item.question.choices.some((c) => c.letter === letter)) {
          dispatch({ type: 'select', questionId: item.question.questionId, letter });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, modal, toggleFlag]);

  /* ----------------------------------------------------------- render */

  if (error) {
    return (
      <OfficialDrillFrame notepadEnabled={false}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <p className="text-[15px] text-slate-700">{error}</p>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-7 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-black"
            onClick={() => navigate('/rc')}
          >
            Go to Reading Comprehension
          </button>
        </div>
      </OfficialDrillFrame>
    );
  }

  if (!passages || !item) {
    return (
      <OfficialDrillFrame notepadEnabled={false}>
        <div className="flex flex-1 items-center justify-center p-10">
          <p className="text-[15px] text-slate-600">Loading the passage…</p>
        </div>
      </OfficialDrillFrame>
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

  /** Pill colors for a pager entry that is not the current question. */
  const pillState = (entry: RcPagerEntry): string => {
    if (entry.kind !== 'question' || entry.questionId == null) return '';
    const target = state.items.find((i) => i.question.questionId === entry.questionId);
    const pick = state.answers.get(entry.questionId);
    const showResult = target ? isRevealed(state, config.reveal, target) : false;
    if (showResult && pick && target) {
      return pick === target.question.correctAnswer
        ? 'border-green-600 bg-green-50 text-green-700'
        : 'border-red-500 bg-red-50 text-red-700';
    }
    if (pick) return 'border-slate-400 bg-slate-100 text-slate-700';
    return 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100';
  };

  /** Label and handler for the footer's primary pill, per reveal mode. */
  const primary = (() => {
    if (reviewOnly) return null;
    if (config.reveal === 'per_question') {
      return {
        label: 'Confirm',
        disabled: !selected || revealed,
        onClick: async () => {
          await writeAttempt(item, selected);
          dispatch({ type: 'reveal', questionId });
        },
      };
    }
    if (config.reveal === 'per_passage') {
      if (!passageReviewed) {
        return {
          label: 'Check passage',
          disabled: !passageDone,
          onClick: () => recordPassage(item.passage.passageId),
        };
      }
      const nextPassageItem = state.items.findIndex(
        (i) => i.passageIndex === item.passageIndex + 1,
      );
      return nextPassageItem === -1
        ? { label: 'Finish drill', disabled: false, onClick: handleSubmit }
        : {
            label: 'Continue to next passage',
            disabled: false,
            onClick: () => goTo(nextPassageItem),
          };
    }
    return { label: 'Submit', disabled: false, onClick: () => setModal('submit') };
  })();

  const breadcrumbs = [
    { label: 'Reading Comprehension', onClick: () => navigate('/rc') },
    { label: `The Official LSAT PrepTest ${item.passage.preptest}` },
    {
      label: `Section ${item.passage.section} · Passage ${item.passage.setNumber} · Question ${item.number}`,
    },
  ];

  return (
    <>
      <OfficialDrillFrame
        fillViewport
        notepadEnabled={false}
        isPaused={state.paused}
        onResume={() => dispatch({ type: 'setPaused', paused: false })}
        pauseNoun="Drill"
        header={
          <OfficialSessionStrip
            breadcrumbs={breadcrumbs}
            isPaused={state.paused}
            onTogglePause={() => dispatch({ type: 'setPaused', paused: !state.paused })}
            onComplete={reviewOnly ? undefined : () => setModal('submit')}
            pauseNoun="Drill"
            completeLabel="Complete Drill"
          />
        }
      >
        <OfficialDrillToolbar
          directions={RC_DIRECTIONS}
          sectionToggle={{
            active: 'rc',
            onSelect: (section) => {
              if (section === 'lr') openDrillHubSection('lr');
            },
          }}
          highlightMode={highlightMode}
          setHighlightMode={(mode) => setHighlightMode(mode as RcHighlightMode)}
          searchTerm={findQuery}
          setSearchTerm={(v) => {
            setFindQuery(v);
            setFindIndex(0);
          }}
          fontScale={a11y.fontScale}
          setFontScale={(n) => a11y.update({ fontSize: Math.round(n * 100) })}
          fontScaleOptions={RC_FONT_SCALE_OPTIONS}
          a11yExtraSections={<RcTextSettings settings={a11y.settings} onChange={a11y.update} />}
          timerLabel={`${budget != null && clockSeconds < 0 ? '+' : ''}${formatClock(Math.abs(clockSeconds))}`}
          timerMode={budget != null ? 'countdown' : 'stopwatch'}
          timerOverBudget={overBudget}
          leftTools={
            <>
              <RcToolbarButton onClick={() => setPassageOnly((v) => !v)}>
                {passageOnly ? 'Passage with Question View' : 'Passage Only View'}
              </RcToolbarButton>
              {reviewOnly && (
                <span className="ml-1 rounded-full bg-[#7f1d1d] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Review
                </span>
              )}
            </>
          }
        />

        <RcExamPane
          schemeClassName={a11y.className}
          passageOnly={passageOnly}
          passage={
            <RcPassagePane
              passage={item.passage}
              highlights={highlights.forPassage(item.passage.passageId)}
              color={highlights.color}
              onColorChange={highlights.setColor}
              onAddHighlight={(start, end, chosen, kind) =>
                highlights.add(item.passage.passageId, 'passage', start, end, chosen, kind)
              }
              onRemoveHighlight={(offset) =>
                highlights.removeAt(item.passage.passageId, 'passage', offset)
              }
              onRemoveRange={(start, end) =>
                highlights.removeRange(item.passage.passageId, 'passage', start, end)
              }
              highlightMode={highlightMode}
              findQuery={findQuery}
              findIndex={findIndex}
              onFindCount={setFindCount}
              scrollTop={scrollTops.get(item.passage.passageId) ?? 0}
              onScroll={(top) =>
                setScrollTops((prev) => new Map(prev).set(item.passage.passageId, top))
              }
              textStyle={type.passage}
              passageOnly={passageOnly}
            >
              {/* The summary is review material, so it only appears once feedback is on. */}
              {revealed && <RcPassageSummary summaries={item.passage.summaries} />}
            </RcPassagePane>
          }
          question={
            <RcQuestionPane
              item={item}
              selected={selected}
              eliminations={state.eliminations.get(questionId) ?? []}
              revealed={revealed}
              reattemptMode={reattemptMode}
              reattemptPick={reattemptPicks.get(questionId) ?? null}
              flagged={state.flagged.has(questionId)}
              onToggleFlag={() => toggleFlag(questionId)}
              type={type}
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
          }
        />

        <OfficialSmartDrillBar
          primaryAction="submit"
          primaryVisible={!!primary}
          primaryLabel={primary?.label}
          primaryDisabled={primary?.disabled}
          onSubmit={() => primary?.onClick()}
          onNext={() => undefined}
          onEnd={() => navigate('/rc')}
          onOpenMenu={() => setModal('menu')}
          disabled={state.paused}
          pager={
            <RcPager
              entries={pagerEntries(state)}
              currentIndex={state.currentIndex}
              pillState={pillState}
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
            />
          }
        />
      </OfficialDrillFrame>

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
    </>
  );
}
