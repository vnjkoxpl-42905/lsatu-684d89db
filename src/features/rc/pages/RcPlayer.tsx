import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialSessionStrip from '@/components/drill/official/OfficialSessionStrip';
import OfficialDrillToolbar from '@/components/drill/official/OfficialDrillToolbar';
import OfficialSmartDrillBar from '@/components/drill/official/OfficialSmartDrillBar';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import HelpSheet from '@/components/help/HelpSheet';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { RcPager, RcToolbarButton, RcToolbarIcon, formatClock } from '../components/RcChrome';
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
import { readActiveRcAnswerBackup, readRcAnswerBackup, writeRcAnswerBackup, clearRcAnswerBackup } from '../lib/rcAnswerBackup';
import { completedRcDestination, rcReviewRedirect } from '../lib/rcSessionDestination';
import { useRcA11y } from '../hooks/useRcA11y';
import { useRcHighlights } from '../hooks/useRcHighlights';
import { loadPassage, loadPassages } from '../lib/rcBank';
import { hydrateFromAttempts } from '../lib/rcHydration';
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
  saveSessionClock,
  setAttemptFlag,
} from '../api/rcProgress';
import type { RcDrillConfig, RcHighlightMode, RcLetter, RcPassage } from '../lib/rcTypes';
// The player owns player.css; rc.css carries the review layer, which mounts
// inside the player too, so it must not depend on the hub having been visited.
import '../rc.css';
import '../player.css';

const DEFAULT_CONFIG: RcDrillConfig = {
  reveal: 'per_passage',
  timing: { mode: 'unlimited' },
  source: 'manual',
};
const isHandoffError = (err: unknown) =>
  err instanceof Error && err.message.includes('another device');
const clockBackupKey = (sessionId: string) => `lsatu:rc-clock:${sessionId}`;

function readClockBackup(sessionId: string): number {
  try {
    const seconds = Number(window.localStorage.getItem(clockBackupKey(sessionId)));
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  } catch {
    return 0;
  }
}

function writeClockBackup(sessionId: string, seconds: number): void {
  try {
    window.localStorage.setItem(clockBackupKey(sessionId), String(Math.max(0, seconds)));
  } catch {
    // The account row still saves on the heartbeat when local storage is unavailable.
  }
}

export default function RcPlayer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  /**
   * Where to go when this sitting is over. Same-origin paths only — it arrives
   * on the query string, so anything else would be an open redirect.
   */
  const returnToParam = params.get('returnTo');
  const returnTo =
    returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//')
      ? returnToParam
      : null;
  /**
   * The way out of the player. A leg of a practice test says where it came
   * from; anything else lands on the RC hub. The LR/RC toggle is a different
   * errand and keeps its own hub navigation below.
   */
  const exitPath = returnTo ?? '/rc';

  const [config, setConfig] = React.useState<RcDrillConfig>(DEFAULT_CONFIG);
  const [passages, setPassages] = React.useState<RcPassage[] | null>(null);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessionOwnerId, setSessionOwnerId] = React.useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [state, dispatch] = React.useReducer(rcSessionReducer, [], () => initialState([]));
  const completedRef = React.useRef(false);
  const completionPendingRef = React.useRef(false);
  const attemptIdsRef = React.useRef(new Map<number, string>());

  const reviewOnly = params.get('review') === '1';
  const targetQuestionId = Number(params.get('q')) || null;

  /* ------------------------------------------------------------ boot */

  React.useEffect(() => {
    let cancelled = false;

    // A new drill starts clean. React Router keeps this component mounted
    // across a search-param change, so without this the previous sitting's
    // re-attempts, clock, scroll positions and open modal ride into the next one.
    setError(null);
    setPassages(null);
    setSessionId(null);
    setSessionOwnerId(null);
    setSessionStatus(null);
    completedRef.current = false;
    completionPendingRef.current = false;
    attemptIdsRef.current.clear();
    pendingSaveRef.current = null;
    setSaveError(null);
    setReattemptPicks(new Map());
    setSkippedReattempt(new Set());
    setFirstAttemptEliminations(new Map());
    setScrollTops(new Map());
    setElapsed(0);
    setPassageOnly(false);
    setFindQuery('');
    setFindIndex(0);
    setHighlightMode('none');
    setModal(null);

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
          if (!user || session.userId !== user.id) throw new Error('This drill belongs to another account.');
          const reviewRedirect = rcReviewRedirect(session.status, reviewOnly, location.search);
          if (reviewRedirect) {
            if (!cancelled) navigate(reviewRedirect, { replace: true });
            return;
          }
          if (session.status === 'completed' && !reviewOnly) {
            if (!cancelled) {
              completedRef.current = true;
              navigate(completedRcDestination(session.id, returnTo, session.config.practiceTestRunId), { replace: true });
            }
            return;
          }
          const loaded = await loadPassages(session.passageIds);
          if (cancelled) return;
          setConfig(session.config);
          setSessionOwnerId(session.userId);
          setSessionStatus(session.status);
          setElapsed(Math.max(session.config.clockElapsedSeconds ?? 0, readClockBackup(session.id)));
          setSessionId(session.id);
          setPassages(loaded);
          return;
        }

        if (passageParam) {
          if (reviewOnly) throw new Error('A saved drill is needed for review.');
          const passage = await loadPassage(Number(passageParam));
          if (!passage) throw new Error('That passage could not be found.');
          const session = await createSession(DEFAULT_CONFIG, [passage.passageId]);
          if (cancelled) return;
          setConfig(DEFAULT_CONFIG);
          setSessionOwnerId(session.userId);
          setSessionStatus(session.status);
          setSessionId(session.id);
          setPassages([passage]);
          return;
        }

        if (routed.passageIds?.length) {
          if (reviewOnly && !routed.sessionId) throw new Error('A saved drill is needed for review.');
          const nextConfig = routed.config ?? DEFAULT_CONFIG;
          const loaded = await loadPassages(routed.passageIds);
          const session =
            routed.sessionId
              ? await getSession(routed.sessionId)
              : await createSession(nextConfig, routed.passageIds);
          if (cancelled) return;
          if (session && (!user || session.userId !== user.id)) throw new Error('This drill belongs to another account.');
          const reviewRedirect = session ? rcReviewRedirect(session.status, reviewOnly, location.search) : null;
          if (reviewRedirect) {
            navigate(reviewRedirect, { replace: true });
            return;
          }
          if (session?.status === 'completed' && !reviewOnly) {
            completedRef.current = true;
            navigate(completedRcDestination(session.id, returnTo, session.config.practiceTestRunId), { replace: true });
            return;
          }
          setConfig(session?.config ?? nextConfig);
          if (session) {
            setSessionOwnerId(session.userId);
            setSessionStatus(session.status);
            setElapsed(Math.max(session.config.clockElapsedSeconds ?? 0, readClockBackup(session.id)));
          }
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
    const targetIndex = targetQuestionId
      ? seeded.items.findIndex((item) => item.question.questionId === targetQuestionId)
      : -1;
    dispatch({
      type: 'restore',
      state: {
        ...seeded,
        currentIndex: targetIndex >= 0 ? targetIndex : seeded.currentIndex,
      },
    });

    if (!sessionId || !sessionOwnerId) return;
    const pendingAnswer = readActiveRcAnswerBackup(sessionOwnerId, sessionId, sessionStatus, reviewOnly);
    if (pendingAnswer) {
      attemptIdsRef.current.set(pendingAnswer.questionId, pendingAnswer.attemptId);
      dispatch({
        type: 'restore',
        state: {
          answers: new Map([[pendingAnswer.questionId, pendingAnswer.selected]]),
          currentIndex: Math.min(Math.max(pendingAnswer.currentIndex, 0), seeded.items.length - 1),
          paused: true,
        },
      });
      setElapsed((old) => Math.max(old, pendingAnswer.elapsed));
      setSaveError('Your last answer still needs to save.');
    }
    // The component stays mounted across a session change, so this promise can
    // land after the player has already moved to a different drill. Without the
    // guard, session A's answers get restored into session B.
    let cancelled = false;
    getSessionAttempts(sessionId)
      .then((attempts) => {
        if (cancelled || attempts.length === 0) return;
        const hydrated = hydrateFromAttempts({
          items: seeded.items,
          attempts,
          revealMode: config.reveal,
          reviewOnly,
        });
        dispatch({
          type: 'restore',
          state: {
            answers: pendingAnswer && !hydrated.recorded.has(pendingAnswer.questionId)
              ? new Map(hydrated.answers).set(pendingAnswer.questionId, pendingAnswer.selected)
              : hydrated.answers,
            // In review this stays empty: `state.eliminations` is what a
            // re-attempt writes, and seeding it with the FIRST attempt's
            // cross-outs would file them against the second. The restored set
            // goes to `firstAttemptEliminations`, for display only. Resuming a
            // live drill is the opposite case — there they are still the
            // student's working set, so they come straight back.
            eliminations: reviewOnly ? new Map() : hydrated.eliminations,
            flagged: hydrated.flagged,
            recorded: hydrated.recorded,
            revealed: hydrated.revealed,
            reviewedPassages: hydrated.reviewedPassages,
            currentIndex:
              pendingAnswer && !hydrated.recorded.has(pendingAnswer.questionId)
                ? pendingAnswer.currentIndex
                : targetIndex >= 0
                ? targetIndex
                : hydrated.firstUnansweredIndex === -1
                  ? 0
                  : hydrated.firstUnansweredIndex,
            submitted: hydrated.submitted,
            paused: !!pendingAnswer && !hydrated.recorded.has(pendingAnswer.questionId),
          },
        });
        if (pendingAnswer && hydrated.recorded.has(pendingAnswer.questionId)) {
          clearRcAnswerBackup(sessionOwnerId, sessionId);
          setSaveError(null);
        }
        // What the student crossed out the first time is theirs to see in
        // review. It is display only: the array written with a re-attempt is
        // built from what they do on this visit, not from this.
        setFirstAttemptEliminations(hydrated.eliminations);
      })
      .catch(() => {
        /* resuming without prior answers is still a usable drill */
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passages, sessionId, sessionOwnerId, sessionStatus, targetQuestionId]);

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
  /**
   * What the student crossed out on their FIRST attempt, restored so review can
   * show it back to them. Held apart from `state.eliminations` on purpose: that
   * map is what a re-attempt writes, and merging the two would file the first
   * attempt's cross-outs against the second.
   */
  const [firstAttemptEliminations, setFirstAttemptEliminations] = React.useState<
    Map<number, RcLetter[]>
  >(new Map());
  /** A write that did not land. Shown to the student rather than swallowed. */
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [retryingSave, setRetryingSave] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [savingNavigation, setSavingNavigation] = React.useState(false);
  const navigationInFlightRef = React.useRef(false);
  const pendingSaveRef = React.useRef<(() => Promise<boolean>) | null>(null);
  const failAccountSave = React.useCallback((message: string) => {
    setSaveError(message);
    dispatch({ type: 'setPaused', paused: true });
  }, []);
  /**
   * LR carries a help circle on every question and RC carried none, in either
   * mode — so a student stuck on a passage had no route to Joshua from where
   * they were stuck.
   */
  const [helpOpen, setHelpOpen] = React.useState(false);

  const item = getCurrentItem(state);
  const type = React.useMemo(
    () => rcTypeStyles(a11y.fontScale, a11y.extraLeading),
    [a11y.fontScale, a11y.extraLeading],
  );

  /* ---------------------------------------------------------- clocks */

  const [elapsed, setElapsed] = React.useState(0);
  const elapsedRef = React.useRef(0);
  elapsedRef.current = elapsed;
  const questionStart = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (state.paused || !sessionId || !passages || reviewOnly) return;
    let lastTick = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = Math.max(0, (now - lastTick) / 1000);
      lastTick = now;
      setElapsed((e) => {
        const next = e + delta;
        writeClockBackup(sessionId, next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.paused, sessionId, passages, reviewOnly]);

  React.useEffect(() => {
    if (!sessionId || reviewOnly || sessionStatus !== 'in_progress' || completedRef.current) return;
    const save = () => {
      if (completedRef.current) return;
      writeClockBackup(sessionId, elapsedRef.current);
      void saveSessionClock(sessionId, elapsedRef.current).catch((err) => {
        if (isHandoffError(err)) {
          setError('This practice test is active on another device. This device has stopped saving.');
          return;
        }
        failAccountSave('The section clock did not save.');
        console.error('[rc:clock] save failed', err);
      });
    };
    const heartbeat = window.setInterval(save, 5000);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', save);
      if (!completedRef.current) save();
    };
  }, [sessionId, sessionStatus, reviewOnly, failAccountSave]);

  const retryAccountSave = async () => {
    if (!sessionId || sessionStatus !== 'in_progress' || retryingSave) return;
    setRetryingSave(true);
    try {
      writeClockBackup(sessionId, elapsedRef.current);
      const pendingAnswer = sessionOwnerId ? readRcAnswerBackup(sessionOwnerId, sessionId) : null;
      const pending = pendingSaveRef.current ?? (pendingAnswer
        ? async () => {
            const target = state.items.find((entry) => entry.question.questionId === pendingAnswer.questionId);
            return target ? writeAttempt(target, pendingAnswer.selected) : false;
          }
        : null);
      // An answer retry alone does not acknowledge the stopped section clock.
      // If completion reached the account before its response was lost, the
      // completion retry is idempotent and there is no active clock to update.
      const latest = completionPendingRef.current ? await getSession(sessionId) : null;
      if (latest?.status !== 'completed' || latest.userId !== sessionOwnerId) {
        await saveSessionClock(sessionId, elapsedRef.current);
      }
      if (pending) {
        if (!await pending()) return;
      }
      pendingSaveRef.current = null;
      setSaveError(null);
      dispatch({ type: 'setPaused', paused: false });
    } catch (err) {
      if (isHandoffError(err)) {
        setError('This practice test is active on another device. This device has stopped saving.');
      } else {
        console.error('[rc:save:retry] account save failed', err);
      }
    } finally {
      setRetryingSave(false);
    }
  };

  React.useEffect(() => {
    questionStart.current = Date.now();
  }, [state.currentIndex]);

  const budget = totalBudgetSeconds(config, passages?.length ?? 0);
  const clockSeconds = budget == null ? Math.floor(elapsed) : budget - Math.floor(elapsed);
  const overBudget = budget != null && clockSeconds < 0;

  /* --------------------------------------------------------- writing */

  const writeAttempt = React.useCallback(
    async (target: RcSessionItem, selected: RcLetter | null): Promise<boolean> => {
      if (!sessionId) return false;
      // A question already written once in this session is not written again.
      // Resume used to lose the reveal state, which left Confirm enabled on a
      // question that was already answered and inserted a second attempt row
      // for it. The reveal state is restored now; this is the belt.
      if (state.recorded.has(target.question.questionId)) return true;
      const questionId = target.question.questionId;
      const attemptId = attemptIdsRef.current.get(questionId) ?? crypto.randomUUID();
      attemptIdsRef.current.set(questionId, attemptId);
      const timeMs = Math.max(0, Date.now() - questionStart.current);
      try {
        await recordAttempt({
          id: attemptId,
          sessionId,
          questionId,
          passageId: target.passage.passageId,
          selected,
          isCorrect: selected ? selected === target.question.correctAnswer : null,
          timeMs,
          flagged: state.flagged.has(target.question.questionId),
          eliminations: state.eliminations.get(target.question.questionId) ?? [],
          isFirstAttempt: true,
        });
        dispatch({ type: 'markRecorded', questionIds: [questionId] });
        if (sessionOwnerId && readRcAnswerBackup(sessionOwnerId, sessionId)?.questionId === questionId) {
          clearRcAnswerBackup(sessionOwnerId, sessionId);
        }
        attemptIdsRef.current.delete(questionId);
        return true;
      } catch (err) {
        if (isHandoffError(err)) {
          setError('This practice test is active on another device. This device has stopped saving.');
          return false;
        }
        /*
         * A failed write used to return quietly and the caller carried on:
         * Confirm revealed, the passage moved into review, and submit walked to
         * the results screen — all of it telling the student work was recorded
         * when none of it was. Losing their place is still the wrong cure, so
         * the drill stays where it is and says what happened instead.
         */
        if (selected && sessionOwnerId) {
          const backedUp = writeRcAnswerBackup(sessionOwnerId, sessionId, {
            questionId,
            selected,
            attemptId,
            currentIndex: state.currentIndex,
            elapsed: elapsedRef.current,
          });
          if (!backedUp) {
            pendingSaveRef.current = () => writeAttempt(target, selected);
            failAccountSave('The answer did not reach your account, and a device backup is unavailable. Keep this page open and retry.');
            return false;
          }
        }
        pendingSaveRef.current = () => writeAttempt(target, selected);
        failAccountSave('That answer did not save.');
        return false;
      }
    },
    [sessionId, sessionOwnerId, state.flagged, state.eliminations, state.recorded, state.currentIndex, failAccountSave],
  );

  const recordPassage = React.useCallback(
    async (passageId: number) => {
      const items = itemsForPassage(state, passageId).filter(
        (i) => !state.recorded.has(i.question.questionId),
      );
      const saveFrom = async (start: number): Promise<boolean> => {
        for (let index = start; index < items.length; index++) {
          const target = items[index];
          if (!await writeAttempt(target, state.answers.get(target.question.questionId) ?? null)) {
            pendingSaveRef.current = () => saveFrom(index);
            return false;
          }
        }
        dispatch({ type: 'reviewPassage', passageId });
        return true;
      };
      return saveFrom(0);
    },
    [state, writeAttempt],
  );

  /* ------------------------------------------------------ navigation */

  const goTo = React.useCallback(
    async (index: number) => {
      if (state.paused || navigationInFlightRef.current) return;
      navigationInFlightRef.current = true;
      setSavingNavigation(true);
      try {
        const leaving = getCurrentItem(state);
        // Save the pending answer before leaving; a failed write keeps the
        // student on this question with their choice still selected.
        if (
          leaving &&
          config.reveal === 'end_of_set' &&
          !state.recorded.has(leaving.question.questionId) &&
          state.answers.has(leaving.question.questionId)
        ) {
          const saved = await writeAttempt(leaving, state.answers.get(leaving.question.questionId) ?? null);
          if (!saved) {
            pendingSaveRef.current = async () => {
              if (!await writeAttempt(leaving, state.answers.get(leaving.question.questionId) ?? null)) return false;
              dispatch({ type: 'goto', index });
              return true;
            };
            return;
          }
        }
        dispatch({ type: 'goto', index });
      } finally {
        navigationInFlightRef.current = false;
        setSavingNavigation(false);
      }
    },
    [state, config.reveal, writeAttempt],
  );

  const handleSubmit = React.useCallback(async () => {
    if (navigationInFlightRef.current || submitting) return;
    navigationInFlightRef.current = true;
    setSubmitting(true);
    const targets = state.items.filter((target) => !state.recorded.has(target.question.questionId));
    const finish = async (): Promise<boolean> => {
      if (!sessionId) return false;
      completionPendingRef.current = true;
      try {
        const latest = await getSession(sessionId);
        if (latest?.status !== 'completed') await saveSessionClock(sessionId, elapsedRef.current);
        await completeSession(sessionId);
      } catch (err) {
        if (isHandoffError(err)) {
          setError('This practice test is active on another device. This device has stopped saving.');
          return false;
        }
        pendingSaveRef.current = finish;
        failAccountSave('The drill did not finish saving.');
        return false;
      }
      completedRef.current = true;
      completionPendingRef.current = false;
      dispatch({ type: 'submit' });
      // A leg of a practice test goes straight back to the invigilator. The
      // session is already completed in the database by this point, so the
      // sitting can score it; showing the results screen first would reveal a
      // section score with sections still to sit. RC is frequently section 1
      // or 2, so this is the common case, not an edge one.
      navigate(completedRcDestination(sessionId, returnTo, config.practiceTestRunId));
      return true;
    };
    const saveFrom = async (start: number): Promise<boolean> => {
      for (let index = start; index < targets.length; index++) {
        const target = targets[index];
        if (!await writeAttempt(target, state.answers.get(target.question.questionId) ?? null)) {
          pendingSaveRef.current = () => saveFrom(index);
          return false;
        }
      }
      return finish();
    };
    try {
      await saveFrom(0);
    } finally {
      setSubmitting(false);
      navigationInFlightRef.current = false;
    }
  }, [state, writeAttempt, sessionId, navigate, returnTo, config.practiceTestRunId, failAccountSave, submitting]);

  const handleSaveExit = React.useCallback(async () => {
    if (reviewOnly) {
      navigate(exitPath);
      return;
    }
    if (!sessionId || state.paused || navigationInFlightRef.current) return;
    navigationInFlightRef.current = true;
    setModal(null);
    try {
      const current = getCurrentItem(state);
      if (current && state.answers.has(current.question.questionId)
        && !state.recorded.has(current.question.questionId)) {
        if (!await writeAttempt(current, state.answers.get(current.question.questionId) ?? null)) return;
      }
      await saveSessionClock(sessionId, elapsedRef.current);
      navigate(exitPath);
    } catch (err) {
      if (isHandoffError(err)) {
        setError('This practice test is active on another device. This device has stopped saving.');
      } else {
        failAccountSave('Your work did not finish saving. Keep this page open and retry.');
        console.error('[rc:exit] account save failed', err);
      }
    } finally {
      navigationInFlightRef.current = false;
    }
  }, [reviewOnly, navigate, exitPath, sessionId, state, writeAttempt, failAccountSave]);

  const toggleFlag = React.useCallback(
    (questionId: number) => {
      if (state.paused || navigationInFlightRef.current || submitting) return;
      dispatch({ type: 'toggleFlag', questionId });
      if (sessionId) {
        void setAttemptFlag(sessionId, questionId, !state.flagged.has(questionId));
      }
    },
    [sessionId, state.flagged, state.paused, submitting],
  );

  /* ------------------------------------------------- selection, guarded */

  /**
   * Is this question still waiting on a blind re-attempt?
   *
   * Review of work the student did not just answer starts with a fresh attempt,
   * and until they make it, nothing on screen may state the verdict — not the
   * question pane, and not the pager.
   *
   * This and everything below it sit ABOVE the loading and error returns. They
   * have to: the keyboard effect is a hook, the early returns are conditional,
   * and a hook declared past a conditional return changes the hook count
   * between renders.
   */
  const awaitingReattempt = React.useCallback(
    (id: number) =>
      reviewOnly &&
      state.recorded.has(id) &&
      !reattemptPicks.has(id) &&
      !skippedReattempt.has(id),
    [reviewOnly, state.recorded, reattemptPicks, skippedReattempt],
  );

  const revealed = item ? isRevealed(state, config.reveal, item) : false;
  const reattemptMode = item ? awaitingReattempt(item.question.questionId) : false;

  /**
   * The ONE way a choice gets picked.
   *
   * The pane and the keyboard used to take different routes: the pane's handler
   * carried the re-attempt and revealed guards, and the keyboard dispatched
   * straight into the reducer with neither. So a keypress during blind review
   * silently overwrote the student's recorded first answer — invisibly, because
   * the row highlight reads `reattemptPick` in that state, not `selected` — and
   * the verdict then reported a first pick they never made.
   */
  const selectLetter = React.useCallback(
    (letter: RcLetter) => {
      if (!item || state.paused || navigationInFlightRef.current || submitting) return;
      const id = item.question.questionId;
      if (!item.question.choices.some((c) => c.letter === letter)) return;

      if (awaitingReattempt(id)) {
        setReattemptPicks((prev) => new Map(prev).set(id, letter));
        if (!sessionId) return;
        void recordAttempt({
          sessionId,
          questionId: id,
          passageId: item.passage.passageId,
          selected: letter,
          isCorrect: letter === item.question.correctAnswer,
          timeMs: Math.max(0, Date.now() - questionStart.current),
          flagged: state.flagged.has(id),
          // What they cross out on THIS visit. The first attempt's cross-outs
          // live in `firstAttemptEliminations` and are never written here.
          eliminations: state.eliminations.get(id) ?? [],
          isFirstAttempt: false,
        }).catch(() => {
          // This was fire-and-forget with no catch, so a failed re-attempt
          // was an unhandled rejection and the student was told nothing.
          setSaveError('That second answer did not save.');
        });
        return;
      }

      if (revealed) return;
      if (sessionId && sessionOwnerId && !reviewOnly) {
        const attemptId = crypto.randomUUID();
        attemptIdsRef.current.set(id, attemptId);
        const backedUp = writeRcAnswerBackup(sessionOwnerId, sessionId, {
          questionId: id,
          selected: letter,
          attemptId,
          currentIndex: state.currentIndex,
          elapsed: elapsedRef.current,
        });
        if (!backedUp) {
          pendingSaveRef.current = () => writeAttempt(item, letter);
          failAccountSave('A device backup could not be saved. Keep this page open and save your answer to your account.');
        }
      }
      dispatch({ type: 'select', questionId: id, letter });
    },
    [item, awaitingReattempt, revealed, sessionId, sessionOwnerId, reviewOnly, state.currentIndex, state.flagged, state.eliminations, state.paused, submitting, writeAttempt, failAccountSave],
  );

  /* -------------------------------------------------------- keyboard */

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!item) return;
      // A paused drill is paused for the keyboard too. The scrim stops the
      // pointer and used to stop nothing else.
      if (state.paused) return;
      if (modal || helpOpen) return;

      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (target?.isContentEditable) return;
      // Radix renders dialogs, sheets and popovers into a portal outside this
      // tree, so `modal` alone does not know they are open. Typing a letter
      // with focus inside one must not answer the question underneath it.
      if (target?.closest?.('[role="dialog"], [role="menu"], [role="listbox"]')) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(state.currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(state.currentIndex + 1);
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFlag(item.question.questionId);
      } else if (/^[a-eA-E]$/.test(e.key)) {
        e.preventDefault();
        selectLetter(e.key.toUpperCase() as RcLetter);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, modal, helpOpen, state.paused, state.currentIndex, toggleFlag, goTo, selectLetter]);

  /* ----------------------------------------------------------- render */

  if (error) {
    return (
      <OfficialDrillFrame notepadEnabled={false}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
          <p className="text-[15px] text-slate-700">{error}</p>
          <button
            type="button"
            className="rounded-full bg-slate-900 px-7 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-black"
            onClick={() => navigate(error.includes('another device') ? '/testing' : exitPath)}
          >
            {error.includes('another device') ? 'Practice Exams' : 'Go to Reading Comprehension'}
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

  // `revealed`, `reattemptMode` and `awaitingReattempt` are declared above the
  // early returns, with the guarded selector that shares them.
  const questionId = item.question.questionId;
  const selected = state.answers.get(questionId) ?? null;

  const passageDone = passageComplete(state, item.passage.passageId);
  const passageReviewed = state.reviewedPassages.has(item.passage.passageId);

  /**
   * A pager entry's verdict as a value. Derived once so the colour classes and
   * the glyph/aria status below can never disagree about what a pill means.
   */
  const pillStatus = (entry: RcPagerEntry): 'correct' | 'incorrect' | 'answered' | 'unanswered' => {
    if (entry.kind !== 'question' || entry.questionId == null) return 'unanswered';
    // A pill that reads "correct" beside a question the student is being asked
    // to answer again blind has already answered it for them.
    if (awaitingReattempt(entry.questionId)) return 'unanswered';
    const target = state.items.find((i) => i.question.questionId === entry.questionId);
    // The pill states the same verdict the review layer does, which reads the
    // latest pick (`secondPick ?? firstPick`). Reading `answers` alone put a
    // green check beside a question whose banner said "Not quite" — the pill
    // was scoring the first attempt while the banner scored the re-attempt.
    const pick = reattemptPicks.get(entry.questionId) ?? state.answers.get(entry.questionId);
    const showResult = target ? isRevealed(state, config.reveal, target) : false;
    if (showResult && pick && target) {
      return pick === target.question.correctAnswer ? 'correct' : 'incorrect';
    }
    return pick ? 'answered' : 'unanswered';
  };

  /** Pill colors for a pager entry that is not the current question. */
  const pillState = (entry: RcPagerEntry): string => {
    if (entry.kind !== 'question' || entry.questionId == null) return '';
    switch (pillStatus(entry)) {
      case 'correct':
        return 'border-green-600 bg-green-50 text-green-700';
      case 'incorrect':
        return 'border-red-500 bg-red-50 text-red-700';
      case 'answered':
        return 'border-slate-400 bg-slate-100 text-slate-700';
      default:
        return 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100';
    }
  };

  /** Label and handler for the footer's primary pill, per reveal mode. */
  const primary = (() => {
    if (reviewOnly) return null;
    if (config.reveal === 'per_question') {
      return {
        label: 'Confirm',
        disabled: !selected || revealed,
        onClick: async () => {
          // Reveal is the reward for a recorded answer, so it waits for one.
          if (await writeAttempt(item, selected)) {
            dispatch({ type: 'reveal', questionId });
          } else {
            pendingSaveRef.current = async () => {
              if (!await writeAttempt(item, selected)) return false;
              dispatch({ type: 'reveal', questionId });
              return true;
            };
          }
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
    { label: 'Reading Comprehension', onClick: () => navigate(exitPath) },
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
        onResume={saveError ? () => { void retryAccountSave(); } : () => dispatch({ type: 'setPaused', paused: false })}
        pauseNoun="Drill"
        header={
          <OfficialSessionStrip
            breadcrumbs={breadcrumbs}
            isPaused={state.paused}
            /* Review has no clock and nothing to pause — the work is already
               done. Pausing a review only puts a scrim over your own answers. */
            onTogglePause={
              reviewOnly
                ? undefined
                : () => dispatch({ type: 'setPaused', paused: !state.paused })
            }
            onComplete={reviewOnly ? undefined : () => setModal('submit')}
            onOpenHelp={() => setHelpOpen(true)}
            pauseNoun="Drill"
            completeLabel="Complete Drill"
          />
        }
      >
        <OfficialDrillToolbar
          directions={RC_DIRECTIONS}
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
          /* No timer in review. A stopwatch running while you read your own
             explanations counts nothing and reads as pressure. */
          timerMode={reviewOnly ? undefined : budget != null ? 'countdown' : 'stopwatch'}
          timerOverBudget={overBudget}
          /*
           * Find used to collect a match count nothing read and an index
           * nothing advanced, so searching a 500-word passage jumped to the
           * first hit and stopped there. The count and the index were already
           * wired all the way to the paint layer; only the controls were
           * missing. This is also the slot the prop docs always claimed RC
           * used and never did.
           */
          rightTools={
            findCount > 0 ? (
              <>
                <span className="px-1 text-[13px] tabular-nums text-slate-700">
                  {Math.min(findIndex, findCount - 1) + 1} of {findCount}
                </span>
                <RcToolbarIcon
                  label="Previous match"
                  onClick={() => setFindIndex((i) => (i - 1 + findCount) % findCount)}
                >
                  <ChevronUp size={18} />
                </RcToolbarIcon>
                <RcToolbarIcon
                  label="Next match"
                  onClick={() => setFindIndex((i) => (i + 1) % findCount)}
                >
                  <ChevronDown size={18} />
                </RcToolbarIcon>
              </>
            ) : undefined
          }
          /* No REVIEW badge here. The toolbar's left group is where the
             section's tools live, and the breadcrumb plus the absent clock
             already say what this is. LR carries no such badge in any mode. */
          leftTools={
            <RcToolbarButton onClick={() => setPassageOnly((v) => !v)}>
              {passageOnly ? 'Passage + Question' : 'Passage Only'}
            </RcToolbarButton>
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
              {/* Review material, so it waits for feedback — and it stays shut
                  during a blind re-answer. A summary states the main point, and
                  the first question on most passages asks for exactly that. */}
              {revealed && !reattemptMode && (
                <RcPassageSummary summaries={item.passage.summaries} />
              )}
            </RcPassagePane>
          }
          question={
            <RcQuestionPane
              item={item}
              selected={selected}
              eliminations={
                // In review the cross-outs on screen are the ones the student
                // made the first time round, restored from their attempt. In a
                // live drill they are the ones they are making now.
                (reviewOnly
                  ? firstAttemptEliminations.get(questionId)
                  : state.eliminations.get(questionId)) ?? []
              }
              revealed={revealed}
              reattemptMode={reattemptMode}
              reattemptPick={reattemptPicks.get(questionId) ?? null}
              flagged={state.flagged.has(questionId)}
              onToggleFlag={() => toggleFlag(questionId)}
              type={type}
              onSelect={selectLetter}
              interactionDisabled={state.paused || savingNavigation || submitting}
              onToggleElimination={(letter) =>
                !navigationInFlightRef.current && !submitting && !state.paused
                  ? dispatch({ type: 'toggleElimination', questionId, letter })
                  : undefined
              }
              onSkipToAnswer={() => setSkippedReattempt((prev) => new Set(prev).add(questionId))}
              highlights={highlights.forPassage(item.passage.passageId)}
              color={highlights.color}
              onColorChange={highlights.setColor}
              highlightMode={highlightMode}
              onAddHighlight={(target, start, end, chosen, kind) =>
                highlights.add(item.passage.passageId, target, start, end, chosen, kind)
              }
              onRemoveHighlight={(target, offset) =>
                highlights.removeAt(item.passage.passageId, target, offset)
              }
              onRemoveRange={(target, start, end) =>
                highlights.removeRange(item.passage.passageId, target, start, end)
              }
            />
          }
        />

        {submitting && !saveError && (
          <div className="rc-save-error" role="status">Saving your section…</div>
        )}

        {saveError && (
          <div className="rc-save-error" role="alert">
            {saveError}{reviewOnly ? '' : ' The clock and questions are paused.'}
            {reviewOnly && (
              <button type="button" className="rc-skip-link" onClick={() => setSaveError(null)}>
                Dismiss
              </button>
            )}
          </div>
        )}

        <OfficialSmartDrillBar
          primaryAction="submit"
          primaryVisible={!!primary}
          primaryLabel={primary?.label}
          primaryDisabled={primary?.disabled || submitting}
          onSubmit={() => primary?.onClick()}
          onNext={() => undefined}
          endLabel={reviewOnly ? 'Exit' : undefined}
          onEnd={() => { void handleSaveExit(); }}
          onOpenMenu={() => setModal('menu')}
          disabled={state.paused || submitting}
          pager={
            <RcPager
              entries={pagerEntries(state)}
              currentIndex={state.currentIndex}
              pillState={pillState}
              pillStatus={pillStatus}
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

      <AlertDialog open={!!saveError && !reviewOnly}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saving paused this section</AlertDialogTitle>
            <AlertDialogDescription>
              {saveError} Your clock and questions are paused. Your current choices remain on this page.
              Retry the account save to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => { void retryAccountSave(); }} disabled={retryingSave}>
              {retryingSave ? 'Trying to save…' : 'Retry save'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {helpOpen && <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />}

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
          /* Review has no clock and nothing to pause, which is why the header
             strip dropped Pause. The menu kept offering it, so the one place
             the student could still put a scrim over their own answers was in
             here. Same rule, both places now. */
          onPause={
            reviewOnly
              ? undefined
              : () => {
                  dispatch({ type: 'setPaused', paused: true });
                  setModal(null);
                }
          }
          onSaveExit={() => { void handleSaveExit(); }}
          saveExitLabel={reviewOnly ? 'Exit review' : 'Save and exit'}
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
