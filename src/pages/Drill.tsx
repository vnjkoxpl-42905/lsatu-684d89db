import { validateHubOriginOrOrdinary } from '@/lib/reviewHubReturn';
import * as React from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { AdminQuestionNotes } from '@/components/drill/AdminQuestionNotes';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import type {
  DrawerTab,
  DrillDetailsMeta,
  DrillSimilarContext,
} from '@/components/drill/official/DrillNotesPanel';
import type { DrillExplanationContext } from '@/components/drill/official/DrillExplanationTab';
import {
  type InlineChoiceNotes,
} from '@/components/drill/official/InlineChoiceExplanation';
import { useLrExplanation, type LrStyleKey } from '@/hooks/useLrExplanation';
import SectionReviewWalk from '@/components/drill/SectionReviewWalk';
import HelpSheet from '@/components/help/HelpSheet';
import OfficialSessionStrip from '@/components/drill/official/OfficialSessionStrip';
import OfficialDrillToolbar from '@/components/drill/official/OfficialDrillToolbar';
import { SectionDirectionsView } from '@/components/drill/official/SectionDirectionsCard';
import { SECTION_DIRECTIONS } from '@/lib/sectionDirections';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import OfficialAnswerNavigator from '@/components/drill/official/OfficialAnswerNavigator';
import OfficialSmartDrillBar from '@/components/drill/official/OfficialSmartDrillBar';
import AnswerOvals from '@/components/drill/official/AnswerOvals';
import { TutorChatModal } from '@/components/drill/TutorChatModal';
import { resolveTutorLaunch, resolveTutorMode, type TutorMode } from '@/components/drill/tutorBehavior';
import { AI_TUTOR_ENABLED } from '@/components/drill/aiTutorFlag';
import { reviewPolicyForRun } from '@/lib/drillReviewPolicy';
import { lrRunProvenanceForSpec, lrRunProvenanceLabel } from '@/lib/lrRunProvenance';
import ArgumentBreakdown from '@/components/drill/official/ArgumentBreakdown';
import { ReviewModal } from '@/components/drill/ReviewModal';
import { VoiceCoachChip } from '@/components/drill/VoiceCoachChip';
import { VoiceCoachModal } from '@/components/drill/VoiceCoachModal';
import { DrillTopBar } from '@/components/drill/DrillTopBar';
import { GuidedDrillIntroModal } from '@/components/drill/GuidedDrillIntroModal';
import { useHomeworkSet } from '@/hooks/useHomeworkSets';
import { HighlightedText } from '@/components/drill/HighlightedText';
import { BlindReviewSelection } from '@/components/drill/BlindReviewSelection';
import { BlindReviewFlow, type BlindReviewResult as LegacyBlindReviewResult } from '@/components/drill/BlindReviewFlow';
import { SectionComplete } from '@/components/drill/SectionComplete';
import { ScorePrediction } from '@/components/drill/ScorePrediction';
import { ScoreReport } from '@/components/drill/ScoreReport';
import { LRSectionResults } from '@/components/drill/LRSectionResults';
import { EnhancedBlindReview } from '@/components/drill/EnhancedBlindReview';
import { PracticeSetResults } from '@/components/drill/PracticeSetResults';
import { TimerProvider, useTimerContextSafe } from '@/contexts/TimerContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useClassId } from '@/hooks/useClassId';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { questionBank } from '@/lib/questionLoader';
import {
  buildSectionStats,
  logSectionWrongAnswers,
  emailSectionReport,
  persistSectionResults,
  wajQidsForSection,
} from '@/lib/sectionHistorySave';
import {
  clearCloseoutProgress,
  closeoutKey,
  outstandingWajQids,
  recordCloseoutProgress,
} from '@/lib/practiceTestCloseout';
import { isSittingReturn } from '@/lib/practiceTestRunner';
import { isActivePracticeTestDevice } from '@/lib/practiceTestStore';
import { useAdaptiveEngine } from '@/contexts/AdaptiveEngineContext';
import { normalizeText } from '@/lib/utils';
import type { HighlightMode, HighlightRegion } from '@/lib/highlightUtils';
import { useQuestionHighlights } from '@/hooks/useQuestionHighlights';
import { useQuestionStudyTools } from '@/hooks/useQuestionStudyTools';
import {
  bookmarkHref,
  clearQuestionMarks,
  eliminationsFor as studyEliminationsFor,
  highlightsFor as studyHighlightsFor,
  isBookmarked as isStudyBookmarked,
  listBookmarks,
  removeBookmark,
  setEliminations as setStudyEliminations,
  setHighlights as setStudyHighlights,
  studyQuestionKey,
  toggleBookmark,
  type StudyQuestionRef,
} from '@/lib/questionStudyTools';
import { launchDrill } from '@/lib/drillLaunch';
import StudyAidsControls from '@/components/drill/official/StudyAidsControls';
import DrillActorScope from '@/components/drill/DrillActorScope';
import { Switch } from '@/components/ui/switch';
import { setActiveDrillQid } from '@/lib/drillNotepadBus';
import { officialLeadCrumbLabel } from '@/lib/officialBreadcrumbs';
import { upsertLastActivity, type DrillSnapshot, type SectionSnapshot } from '@/lib/lastActivity';
import { getRecentExposureSet, recordExposures } from '@/lib/questionExposure';
import { ArrowLeft, CheckCircle, X, XCircle, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { completeLinkedTodo } from '@/lib/todoActions';
import type { Json } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { LRQuestion } from '@/lib/questionLoader';
import type {
  BlindReviewResult as DrillBlindReviewResult,
  DrillMode,
  DrillSession,
  FullSectionConfig,
  TimerConfig,
  TypeDrillConfig,
} from '@/types/drill';
import { QuestionPoolService, servesFixedQueue, type QuestionUsage } from '@/lib/questionPoolService';
import { QuestionPoolChip } from '@/components/drill/QuestionPoolChip';
import { QuestionPoolExhausted } from '@/components/drill/QuestionPoolExhausted';
import { toast } from 'sonner';
import { QuestionTimer } from '@/lib/questionTimer';
import { record } from '@rrweb/record';
import type { eventWithTime } from '@rrweb/types';
import { timerConfigForRunSpec } from '@/lib/drillRunSpec';
import { useDrillRunSpec } from '@/components/drill/DrillRunSpecContext';
import {
  closeOutAssignedSection,
  closeOutHomeworkAssignment,
  homeworkScore,
} from '@/lib/closeOutAssignedSection';
import { getDrillDisplayNumber } from '@/pages/drillDisplayNumber';
import { getPracticePool } from '@/bootcamps/main-conclusion/data/practiceDrillPools';
import { recordPracticeDrillCompletion } from '@/bootcamps/main-conclusion/lib/recordPracticeCompletion';
import {
  loadPracticeSession,
  savePracticeSessionSnapshot,
  completePracticeSession,
  type PracticeSessionSnapshot,
} from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { recordFlawPerformance } from '@/bootcamps/fallacy-flaw-v2/lib/recordFlawPerformance';
import { appendGuidedResumeParams } from '@/lib/guidedDrillNavigation';
import { DrillSplit } from '@/components/drill/DrillSplit';
import {
  guidedSessionKeyForRunner,
  guidedResumeIndex,
  guidedAttemptId,
  guidedAttemptsToDrillAttempts,
  isLegacyGuidedSessionSuperseded,
  loadGuidedDrillSession,
  completeGuidedDrillSession,
  isResumableGuidedSession,
} from '@/lib/guidedDrillSession';
import {
  drillResumeKey,
  loadDrillResumeSession,
  saveDrillResumeSnapshot,
  writeSectionDeviceBackup,
  hasPendingSectionDeviceBackup,
  completeDrillResumeSession,
  isResumableDrillSession,
  isSpentDrillSession,
} from '@/lib/drillResumeSession';
import {
  createStandaloneDrillRun,
  loadStandaloneDrillRun,
  listStandaloneDrillRuns,
  saveStandaloneDrillRun,
  completeStandaloneDrillRun,
  beginGuidedDrillCloseout,
} from '@/lib/drillRunLedger';


/**
 * The clock a full section was started under, in milliseconds. Unlimited has
 * no budget, which is not the same as a budget of zero.
 */
function sectionBudgetMs(timer?: TimerConfig): number | undefined {
  if (!timer) return undefined;
  switch (timer.mode) {
    case '35':
      return 35 * 60 * 1000;
    case '52.5':
      return 52.5 * 60 * 1000;
    case '70':
      return 70 * 60 * 1000;
    case 'custom':
      return timer.customMinutes ? timer.customMinutes * 60 * 1000 : undefined;
    default:
      return undefined;
  }
}

function DrillContent() {
  const adaptiveEngine = useAdaptiveEngine();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedStandaloneRunId = searchParams.get('run');
  const { user } = useAuth();
  // Depend on the id, never the user object: Supabase hands out a fresh object
  // on every token refresh, and effects keyed on the object re-run for no reason.
  const userId = user?.id;
  // Teaching notes under the question are an admin surface. The panel stays
  // open across questions once opened, so a teaching pass is one click, not ten.
  const { is_admin: isAdmin } = useUserPermissions();
  const [teachingNotesOpen, setTeachingNotesOpen] = React.useState(false);
  const { settings } = useUserSettings();
  const permissions = useUserPermissions();
  const { isLoading: qbLoading } = useQuestionBank();

  // Everything about the run itself comes from the Drill Run Spec, which the
  // gate in front of this page built from the launch in the address bar. The
  // runner does not parse the query string for it: one grammar, one reader.
  const state = useDrillRunSpec();
  const assignmentId = state.assignmentId ?? null;
  const guidedAssignmentId = state.guidedAssignmentId ?? null;
  const guidedDrillId = state.guidedDrillId ?? null;
  const guidedSetId = state.guidedSetId;
  const { set: guidedSet } = useHomeworkSet(guidedSetId);
  const [guidedInfoOpen, setGuidedInfoOpen] = React.useState(false);

  const practicingLabel = state.practicingLabel;

  // Context params for header/breadcrumbs (survive refresh)
  const origin = searchParams.get('origin');
  const returnTo = validateHubOriginOrOrdinary(searchParams.get('returnTo'));
  const drillReturnTo = validateHubOriginOrOrdinary(state.returnTo) ?? validateHubOriginOrOrdinary(returnTo);
  // Which run and leg this section belongs to, when it belongs to one. Comes
  // from the launch rather than from returnTo: that string is a routing hint
  // and nothing load-bearing may depend on it. A refreshed leg used to lose
  // these and then had nothing to write its close-out against, so the section
  // could never be marked finished and the practice test stayed open forever.
  const ptRun = state.ptRun;
  // Routing and score-UI suppression only. Never a clock or integrity decision.
  const inSitting = isSittingReturn(drillReturnTo);
  /**
   * Answer and Explanation are not rendered at all for this run.
   *
   * Two runs are sealed. A practice-test sitting, because a sitting reveals
   * nothing until it is scored and the old per-question gate quietly broke
   * that: attempt a question inside a sitting and the reveal unlocked. And a
   * run launched `?sealed=1`, which is how an assigned section is handed over.
   *
   * The full-section gate further down is a different and weaker thing. It
   * withholds the reveal until the question is attempted and then allows it.
   * That is right for a section a student chose to sit; it is wrong for one
   * assigned as a measurement, where the answer to question 3 must not be
   * available while question 4 is still open.
   */
  const revealSealed = inSitting || !!state.sealed;
  const contextLabel = searchParams.get('label');
  const contextFocus = searchParams.get('focus');
  // Kept as a string: `?initialIndex=0` is a real request to open on the first
  // question, and a number would read as absent.
  const initialIndexParam = state.initialIndex != null ? String(state.initialIndex) : null;
  const isMcPractice = state.practiceSource === 'intro-to-lr-practice-drills';
  // Maps the finished MC practice set back to its module-progress completion id
  // so the Intro to LR path cannot report "core path cleared" before the final
  // practice sets are actually done.
  const mcPracticePool = React.useMemo(
    () => (isMcPractice ? getPracticePool(state.practiceSlug ?? '') : undefined),
    [isMcPractice, state.practiceSlug],
  );
  // Once the set is finished, snapshot writes must stop: a late write would
  // flip the stored row back to in_progress and re-offer "Resume" on a set the
  // student already completed.
  const mcPracticeFinalizedRef = React.useRef(false);
  // Guided drills keep the same kind of durable resume row, keyed by assignment.
  // Null for every other drill surface, which is what leaves library, flagged,
  // and Smart Drill runs untouched.
  const guidedSessionKey = React.useMemo(
    () =>
      guidedSessionKeyForRunner({
        guidedAssignmentId,
        guidedDrillId,
        returnTo,
        practiceSource: state.practiceSource,
      }),
    [guidedAssignmentId, guidedDrillId, returnTo, state.practiceSource],
  );
  const guidedLegacySessionKey = React.useMemo(
    () =>
      guidedDrillId && !guidedAssignmentId && !isMcPractice
        ? guidedSessionKeyForRunner({ returnTo, practiceSource: state.practiceSource })
        : null,
    [guidedDrillId, guidedAssignmentId, isMcPractice, returnTo, state.practiceSource],
  );
  // Same reason as mcPracticeFinalizedRef: once the drill is finished, a late
  // snapshot write would flip the row back to in_progress and offer a resume on
  // a drill the student already completed.
  const guidedFinalizedRef = React.useRef(false);
  const guidedCloseoutAttemptsRef = React.useRef<DrillSession['attempts'] | null>(null);
  const guidedRunIdRef = React.useRef<string | null>(requestedStandaloneRunId);
  const guidedWriteRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const guidedLegacyResumeRef = React.useRef(false);
  const genericResumeIdentity = state.resumeIdentity;
  const standaloneSourceKey = React.useMemo(() => {
    if ((state.mode !== 'type-drill' && state.mode !== 'adaptive') || isMcPractice || state.isGuidedDrill || guidedSetId || guidedSessionKey || assignmentId || ptRun || genericResumeIdentity) return null;
    if (state.savedStandaloneRun) return state.savedStandaloneRun.source_key;
    return drillResumeKey({ mode: state.mode, config: state.config });
  }, [state.mode, state.config, state.isGuidedDrill, state.savedStandaloneRun, guidedSetId, isMcPractice, guidedSessionKey, assignmentId, ptRun, genericResumeIdentity]);
  const standaloneRunIdRef = React.useRef<string | null>(requestedStandaloneRunId);
  const standaloneWriteRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const legacyStandaloneResumeRef = React.useRef(false);
  const historicalStandaloneQidsRef = React.useRef<Set<string>>(new Set());
  // Every remaining drill surface gets the same durable resume row, so closing the browser or
  // signing out mid-drill is never a loss. Null while the guided/practice-set
  // surfaces own the run, so the three can never write over each other.
  const genericResumeKey = React.useMemo(() => {
    if (isMcPractice || guidedSessionKey || standaloneSourceKey) return null;
    if (!state?.mode) return null;
    const mode = state.mode === 'practice-set' ? 'type-drill' : state.mode;
    return drillResumeKey({
      mode,
      config: state.config,
      identity: genericResumeIdentity,
      // A homework assignment is its own sitting. Keyed by the section alone,
      // a second assignment of PT156.S2 opened on the first assignment's row.
      assignmentId,
      ptRun,
    });
  }, [isMcPractice, guidedSessionKey, standaloneSourceKey, state, genericResumeIdentity, assignmentId, ptRun]);
  // Rows written before a bootcamp day had its own identity were named by the
  // picked question list. Read that key only when the day-keyed row is absent;
  // every new snapshot and completion still writes the day-keyed row.
  const genericLegacyResumeKey = React.useMemo(() => {
    if (!genericResumeIdentity || !state?.mode) return null;
    const mode = state.mode === 'practice-set' ? 'type-drill' : state.mode;
    return drillResumeKey({ mode, config: state.config });
  }, [genericResumeIdentity, state]);
  const genericFinalizedRef = React.useRef(false);

  const bootcampPracticeReturnTo =
    validateHubOriginOrOrdinary(returnTo)
      ? validateHubOriginOrOrdinary(returnTo)
      : '/bootcamp/intro-to-lr/practice-drills';

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  // ── Force dark mode: drilling pages always use the dark reading surface ──
  React.useEffect(() => {
    const root = document.documentElement;
    const wasLight = root.classList.contains('light');
    root.classList.remove('light');
    return () => {
      if (wasLight) root.classList.add('light');
    };
  }, []);

  // ── rrweb: start recording on mount, stop on unmount ──
  React.useEffect(() => {
    const stop = record({
      emit: (event) => { eventsRef.current.push(event); },
      sampling: { mousemove: 50, scroll: 150, input: 'last' },
      recordCanvas: false,
      collectFonts: false,
    });
    stopRecordingRef.current = stop ?? null;
    return () => {
      stopRecordingRef.current?.();
      stopRecordingRef.current = null;
      eventsRef.current = [];
    };
  }, []);

  const [session, setSession] = React.useState<DrillSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = React.useState<LRQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = React.useState<string>('');
  const [showSolution, setShowSolution] = React.useState(false);
  const [tutorChatOpen, setTutorChatOpen] = React.useState(false);
  // The authored LSAT Lab explanation. Distinct from the AI tutor: this shows
  // transcribed source content, the tutor generates. Authored wins when it
  // exists; the tutor is the fallback for questions that have none. It renders
  // in two places — the drawer's Explanation tab (question-level) and inline
  // under each choice — so the chosen style is owned here and shared, because
  // the drawer itself is mounted twice by the frame.
  const [activeStyle, setActiveStyle] = React.useState<LrStyleKey | null>(null);
  // Questions the student revealed before attempting. Not scored: the answer is
  // already on screen, so committing it would be meaningless.
  const [unscoredQids, setUnscoredQids] = React.useState<Set<string>>(new Set());
  // Confirm shown when Answer is pressed before an attempt.
  const [revealConfirmOpen, setRevealConfirmOpen] = React.useState(false);
  // Which pill opened the unscored-reveal confirm, so "Show me" finishes the
  // job that was actually asked for: Answer reveals in place, Explanation
  // reveals and brings the drawer with it.
  const [pendingRevealIntent, setPendingRevealIntent] =
    React.useState<'answer' | 'explanation'>('answer');
  // Help sheet, opened from the header strip beside Pause. The global
  // FloatingHelpButton is suppressed on /drill so no bubble floats over the
  // question card.
  const [helpOpen, setHelpOpen] = React.useState(false);
  // Section mode's opt-in reveal, shown on the section navigator. Off by
  // default and deliberately not persisted: a real section shows nothing, and
  // that stays the default every time.
  const [sectionRevealEnabled, setSectionRevealEnabled] = React.useState(false);
  const [tutorQuestionSnapshot, setTutorQuestionSnapshot] = React.useState<LRQuestion | null>(null);
  const [tutorUserAnswerSnapshot, setTutorUserAnswerSnapshot] = React.useState<string>('');
  const [tutorChatMode, setTutorChatMode] = React.useState<TutorMode>('pre-answer');
  // Which tab the unified tutor panel opens on (undefined → derived from mode).
  const [tutorInitialTab, setTutorInitialTab] = React.useState<'coach' | 'breakdown' | 'notes' | undefined>(undefined);
  const [wajModalOpen, setWajModalOpen] = React.useState(false);
  const [voiceCoachOpen, setVoiceCoachOpen] = React.useState(false);
  // The "Explain your reasoning" voice chip is shown whenever a solution is
  // revealed (answer committed) and no overlay is already open. Derived, not
  // stored, so it appears on every reveal path automatically.
  const [questionStartTime, setQuestionStartTime] = React.useState(performance.now());
  /**
   * Where this question's answer trail had got to when the student opened it.
   * The per-question clock restarts on every visit, so a question revisited
   * after two minutes would otherwise stamp its second answer earlier than its
   * first. Carrying the furthest point forward keeps the trail monotonic and
   * makes the results timeline read as one run.
   */
  const trailBaseMs = React.useRef(0);
  /**
   * The question currently open, and what its answer trail looked like when it
   * was opened. Closing the visit compares the two: a visit that ends with the
   * trail the same length it started is a second pass that changed nothing,
   * which is a finding in its own right and invisible from the trail alone.
   */
  const openVisit = React.useRef<{ qid: string; trailLength: number } | null>(null);
  /**
   * Latest eliminations, readable from the visit closer without making it
   * depend on state that changes on every cross-off.
   */
  const eliminatedRef = React.useRef<Map<string, Set<string>>>(new Map());
  const [hasTimer, setHasTimer] = React.useState(false);
  const [answerLocked, setAnswerLocked] = React.useState(false);
  const [eliminatedByQid, setEliminatedByQid] = React.useState<Map<string, Set<string>>>(new Map());
  // Kept current for the visit closer, which must not re-subscribe on every
  // cross-off just to read the latest set.
  eliminatedRef.current = eliminatedByQid;
  // Study aids (bookmark, saved cross-outs, saved highlights) on ordinary
  // practice only. A section, a sealed run, or a practice-test leg keeps the
  // exam screen as it was: nothing is restored into it and nothing saved
  // from it. Filed under the signed-in account, never a shared bucket.
  const studyAidsEnabled = !!userId && state.mode !== 'full-section' && !revealSealed && !ptRun;
  const studyTools = useQuestionStudyTools(studyAidsEnabled ? userId : null);
  const studyRef = React.useMemo<StudyQuestionRef | null>(
    () => (studyAidsEnabled && currentQuestion?.qid ? { family: 'lr', id: currentQuestion.qid } : null),
    [studyAidsEnabled, currentQuestion?.qid],
  );
  // Derived: eliminations for the displayed question only (read-only proxy).
  // Adaptive Smart Drill can render a currentQuestion outside the queued index.
  // Shaped so we can later promote into session.attempts.get(qid).eliminated.
  // A question this run has not touched shows its saved cross-outs, read
  // straight from the study store; they join the run's own record only once
  // the student changes them here, so loading never alters an attempt.
  const eliminatedAnswers = React.useMemo<Set<string>>(() => {
    const qid = currentQuestion?.qid;
    if (!qid) return new Set<string>();
    const live = eliminatedByQid.get(qid);
    if (live) return live;
    return studyRef ? new Set(studyEliminationsFor(studyTools.state, studyRef)) : new Set<string>();
  }, [eliminatedByQid, currentQuestion?.qid, studyRef, studyTools.state]);
  const [highlightMode, setHighlightMode] = React.useState<HighlightMode>('none');
  const questionHighlights = useQuestionHighlights({
    onChange: studyAidsEnabled
      ? (qid, next) => studyTools.update((s) => setStudyHighlights(s, { family: 'lr', id: qid }, next))
      : undefined,
  });
  const seedHighlights = questionHighlights.seed;
  React.useEffect(() => {
    if (studyRef) seedHighlights(studyRef.id, studyHighlightsFor(studyTools.state, studyRef));
    // Seed once per question; later store changes come from this surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyRef, seedHighlights]);
  const [isFlagged, setIsFlagged] = React.useState(false);
  const [showExitDialog, setShowExitDialog] = React.useState(false);
  /**
   * Complete Section asks first. A section ends once, and a student who meant
   * to press Next should not lose the rest of it to a mis-click — least of all
   * silently, with questions still blank and time still on the clock.
   */
  const [submitConfirmOpen, setSubmitConfirmOpen] = React.useState(false);
  // Pausing a section or a practice test raises the notice LawHub raises:
  // it will pause, and the real exam has no pause. It comes up on every press
  // unless the student ticks "Don't show me this message again", which holds
  // for the rest of that sitting and no longer.
  const [pauseNoticeOpen, setPauseNoticeOpen] = React.useState(false);
  const [pauseNoticeMuted, setPauseNoticeMuted] = React.useState(false);
  const pauseNoticeMutedRef = React.useRef(false);
  // Directions mid-section swap the whole player for LawHub's directions
  // screen; the clock keeps running underneath, exactly as on test day.
  const [directionsViewOpen, setDirectionsViewOpen] = React.useState(false);
  // A new run in the same mount (blind review after the section, a retake)
  // starts on its questions, not on the directions the last run left open.
  React.useEffect(() => {
    setDirectionsViewOpen(false);
  }, [session?.mode, session?.fullSectionConfig?.pt, session?.fullSectionConfig?.section]);
  /**
   * What happens when a section's clock runs out.
   *
   * Nothing used to: the countdown sat at 0:00 and the student kept going, so
   * the score said "sat under 35 minutes" about a section that took an hour.
   * Now the buzzer stops the room and asks. Finishing there is the honest
   * score; carrying on turns the clock around and counts up, and the results
   * screen says which questions were answered on which side of it.
   */
  const [overtimeState, setOvertimeState] = React.useState<'none' | 'prompt' | 'running'>('none');
  const [exitDestination, setExitDestination] = React.useState<string>('/');
  const [tutorMode, setTutorMode] = React.useState(true);
  const [brMarked, setBrMarked] = React.useState<Set<string>>(new Set());
  const [showBRSelection, setShowBRSelection] = React.useState(false);
  const [showBRFlow, setShowBRFlow] = React.useState(false);
  const [brSelectedQids, setBrSelectedQids] = React.useState<string[]>([]);
  const [brResults, setBrResults] = React.useState<DrillBlindReviewResult[]>([]);
  const [isRetryAfterWrong, setIsRetryAfterWrong] = React.useState(false);
  const [correctExplanation, setCorrectExplanation] = React.useState<string>('');
  const [showReviewButton, setShowReviewButton] = React.useState(false);
  const [isEndingBootcampPracticeDrill, setIsEndingBootcampPracticeDrill] = React.useState(false);
  
  // New post-section flow states
  const [postSectionScreen, setPostSectionScreen] = React.useState<'predict' | 'complete' | 'review' | 'review-walk' | 'score-report' | null>(null);
  /**
   * What the student guessed before seeing anything. Held for this sitting only
   * and shown beside the real score; nothing persists it, so nothing claims it
   * as history.
   */
  const [predictedScore, setPredictedScore] = React.useState<number | null>(null);
  /**
   * Which questions blind review walks. Null means the whole section, which is
   * what a section's blind review always is. Practice sets set it explicitly,
   * because "Review wrong" there is a shortlist by name and should stay one.
   */
  const [brPassQids, setBrPassQids] = React.useState<string[] | null>(null);
  const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Question pool state
  const [poolStatus, setPoolStatus] = React.useState<string>('');
  const [totalPoolSize, setTotalPoolSize] = React.useState(0);
  const [availablePoolSize, setAvailablePoolSize] = React.useState(0);
  const [poolExhausted, setPoolExhausted] = React.useState(false);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [bootLoadFailed, setBootLoadFailed] = React.useState(false);
  const [handoffLost, setHandoffLost] = React.useState(false);
  const [sectionSaveError, setSectionSaveError] = React.useState(false);
  const [retryingSectionSave, setRetryingSectionSave] = React.useState(false);
  const [adaptiveHydrationStatus, setAdaptiveHydrationStatus] = React.useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const { classId, loading: classIdLoading } = useClassId();
  const [advanceToken, setAdvanceToken] = React.useState(0);
  // Smart Drill: questions skipped (advanced without answering). Excluded from
  // the adaptive selector so a skipped question is not immediately re-served.
  const [skippedQids, setSkippedQids] = React.useState<Set<string>>(new Set());
  // Submit always reveals the correct answer. There used to be a switch to
  // turn that off, but the Answer pill in the header strip already lets a
  // student look or not look, so the switch only hid feedback by accident.
  const autoReveal = true;

  const currentViewId = React.useRef<string | null>(null);

  // rrweb session replay capture (one row per question in session_replays)
  const eventsRef = React.useRef<eventWithTime[]>([]);
  const stopRecordingRef = React.useRef<(() => void) | null>(null);
  const lastRecordedQidRef = React.useRef<string | null>(null);
  const adaptiveCommitInFlightRef = React.useRef<Set<string>>(new Set());
  const adaptiveAdvanceInFlightRef = React.useRef(false);

  // Homework assignment: dedupe the status='in_progress' write per mount.
  const assignmentStartedRef = React.useRef(false);

  // Practice-set mode state
  const [isPracticeSetMode, setIsPracticeSetMode] = React.useState(false);
  const questionTimer = React.useRef(new QuestionTimer());
  const [hideTimer, setHideTimer] = React.useState(false);
  const [showAnswerRevealed, setShowAnswerRevealed] = React.useState<Map<string, boolean>>(new Map());

  // ── Review policy ────────────────────────────────────────────────────────
  // Official testing-format layout is the default for every drill mode; pass
  // ?layout=classic to opt out. Read here, above the handlers, because the
  // review policy depends on it.
  const layoutParam = searchParams.get('layout');
  const isOfficialLayout = state.savedStandaloneRun?.provenance
    ? state.savedStandaloneRun.provenance.layout === 'official' : layoutParam !== 'classic';
  const runtimeStandaloneProvenance = React.useMemo(() =>
    lrRunProvenanceForSpec(state, standaloneSourceKey, isOfficialLayout ? 'official' : 'classic'),
    [standaloneSourceKey, state, isOfficialLayout]);
  const standaloneProvenance = state.savedStandaloneRun
    ? state.savedStandaloneRun.provenance : runtimeStandaloneProvenance;
  // Which review controls this run gets, classified by Drill Launch kind (a
  // pure function of the spec, so no frame can misclassify it). The pick model
  // (`pickModelForRun`: `list` writes attempts in memory, `commit` persists per
  // question) is the same classification the existing `isPracticeSetMode`
  // paths already encode; nothing here needs to read it directly.
  // `revealSealed` folds in a practice-test sitting, which the spec alone does
  // not know about.
  const reviewPolicy = revealSealed ? 'none' : reviewPolicyForRun(state);
  // Answer and Explanation as independent toggles, no Submit pill on a fixed
  // queue, choices that never lock: LSAT Lab's review shape. Every change
  // below is branched on this, with today's code as the else branch.
  const reviewControlsAvailable = reviewPolicy !== 'none' && isOfficialLayout;
  // Explanation pill state per question, independent of the drawer and of the
  // Answer pill. Only read in the review-controls modes.
  const [explanationOpenByQid, setExplanationOpenByQid] = React.useState<Map<string, boolean>>(new Map());
  // The Argument Breakdown expander under the stimulus. Closed whenever
  // Explanation turns on or the question changes.
  const [breakdownOpen, setBreakdownOpen] = React.useState(false);
  // Questions whose answer the student has seen (either pill turned on at
  // least once). The attempt record carries `answerRevealed` from this, so a
  // pick made after seeing the answer is recorded as exactly that.
  const answerSeenQidsRef = React.useRef<Set<string>>(new Set());
  // One synchronous lock around commit-then-navigate. Tested and set before
  // the first await, so a second arrow, oval or End press while a save is in
  // flight returns at once; the mirrored state only rerenders the disabled
  // controls.
  const actionLockRef = React.useRef(false);
  const [actionInFlight, setActionInFlight] = React.useState(false);
  // Single-flight per question inside `handleSubmitNonAdaptive`: a second
  // caller for the same qid receives the promise already in flight.
  const pendingCommitsRef = React.useRef<Map<string, Promise<DrillSession['attempts'] | null>>>(new Map());
  // Official-layout-only local UI state (Find Text + Aa font scale).
  const [officialSearchTerm, setOfficialSearchTerm] = React.useState('');
  const [officialFontScale, setOfficialFontScale] = React.useState(1);
  // Smart Drill docked notes panel open state.
  const [notesOpen, setNotesOpen] = React.useState(false);
  // Active tab inside the docked drill drawer (Notes | Details).
  const [drawerTab, setDrawerTab] = React.useState<DrawerTab>('details');
  
  const timer = useTimerContextSafe();
  /**
   * Time already spent on a resumed run, waiting for the clock to start. Read
   * off the stored row while the session loads and folded in once the timer is
   * running, because the provider's duration is fixed at mount and cannot know
   * about a resume that had not been read yet.
   */
  const pendingResumeElapsedMs = React.useRef<number | null>(null);
  /** The resumed row's clock was already spent: open on the buzzer, not on 00:00. */
  const pendingResumeAtBuzzer = React.useRef(false);

  // BR only for Full Section and Type Drill modes
  const sessionMode = session?.mode;
  // Blind review is a review affordance, and a sitting reveals nothing between
  // sections, so its selection and flow screens must not appear mid-sitting.
  const brEnabled =
    (sessionMode === 'full-section' || sessionMode === 'type-drill') && !inSitting;

  // class_id resolved via useClassId() hook above (F1.10).

  // Guards the session initializer against re-entry. The effect below builds the
  // run once per drill launch; anything that re-fires it afterwards (a Supabase
  // TOKEN_REFRESHED handing React a new `user` object, a settings write) used to
  // re-hydrate from the stored resume row and silently jump the student forward
  // to their furthest-answered question. Mid-lesson that reads as the page
  // skipping on its own. The key is the identity of the run, not of the user.
  const sessionInitKeyRef = React.useRef<string | null>(null);

  // Initialize session with question pool filtering
  React.useEffect(() => {
    if (!state?.mode) {
      navigate('/classroom');
      return;
    }

    const initializeSession = async () => {
      // Wait until the class_id fetch has completed before attempting to build
      // the session.  Without this guard the effect fires twice: once on mount
      // (classId === '') and again when classId resolves, wiping any in-progress
      // answers and causing a premature "could not resolve your class" toast.
      if (classIdLoading) return;
      if (qbLoading) return;

      // One initialization per (launch state, user, resume target). Once the
      // run is live, a repeat firing is a no-op rather than a reset.
      const initKey = JSON.stringify([
        state.mode,
        userId ?? null,
        classId,
        guidedSessionKey ?? null,
        genericResumeKey ?? null,
        requestedStandaloneRunId ?? null,
        mcPracticePool?.slug ?? null,
        initialIndexParam ?? null,
      ]);
      if (sessionInitKeyRef.current === initKey) return;
      sessionInitKeyRef.current = initKey;

      const mode = state.mode === 'practice-set' ? 'type-drill' : state.mode;
      let questionQueue: string[] = [];
      let rawQuestions: LRQuestion[] = [];

      if (state.savedStandaloneRun && mode === 'type-drill') {
        const frozen = state.savedStandaloneRun.session.question_queue;
        rawQuestions = frozen.map(qid => questionBank.getQuestion(qid)).filter((q): q is LRQuestion => !!q);
        if (rawQuestions.length !== frozen.length) {
          setBootError('A question in this saved drill is unavailable. Your saved answers have been kept.');
          return;
        }
        const list = !state.savedStandaloneRun.provenance || state.savedStandaloneRun.provenance.pick_model === 'list';
        setIsPracticeSetMode(list);
        setHasTimer(list);
      } else if (mode === 'adaptive') {
        rawQuestions = questionBank.getAllQuestions();
      } else if (mode === 'full-section' && state.config) {
        const config = state.config as FullSectionConfig;
        rawQuestions = questionBank.getSection(config.pt, config.section);
        // An assigned set drawn from one section runs as that set, in the
        // order it was assigned — not as every question in the section.
        if (state.restrictQids?.length) {
          const allowed = new Set(state.restrictQids);
          const bySection = new Map(rawQuestions.map(q => [q.qid, q]));
          const picked = state.restrictQids
            .map(qid => bySection.get(qid))
            .filter((q): q is LRQuestion => !!q);
          if (picked.length > 0 && picked.length < rawQuestions.length) {
            rawQuestions = picked;
          } else if (picked.length > 0) {
            rawQuestions = rawQuestions.filter(q => allowed.has(q.qid));
          }
        }
        setHasTimer(config.timer.mode !== 'unlimited');
      } else if (mode === 'natural-drill' && state.config) {
        const config = state.config as TypeDrillConfig;
        rawQuestions = config.selectedQids
          ?.map(qid => questionBank.getQuestion(qid))
          .filter((q): q is LRQuestion => !!q) ?? [];
      } else if (mode === 'type-drill' && state.config) {
        const config = state.config as TypeDrillConfig;
        
        // Detect practice-set mode (Build-a-Set)
        if (config.selectedQids && config.selectedQids.length > 0) {
          setIsPracticeSetMode(true);
          setHasTimer(true); // Guided drills use their configured countdown; other fixed queues use stopwatch.
          rawQuestions = config.selectedQids
            .map(qid => questionBank.getQuestion(qid))
            .filter(Boolean) as LRQuestion[];
        } else {
          // Otherwise, filter by criteria
          rawQuestions = questionBank.getQuestionsByFilter({
            qtypes: config.qtypes.length > 0 ? config.qtypes : undefined,
            difficulties: config.difficulties.length > 0 ? config.difficulties : undefined,
            pts: config.pts.length > 0 ? config.pts : undefined,
            sections: config.sections && config.sections.length > 0 ? config.sections : undefined,
            qfeatures: config.qfeatures && config.qfeatures.length > 0 ? config.qfeatures : undefined,
            reasoningTypes:
              config.reasoningTypes && config.reasoningTypes.length > 0
                ? config.reasoningTypes
                : undefined,
            searchQuery: config.searchQuery,
            questionNumber: config.questionNumber,
          });
        }
      }

      // Apply question pool filtering only if classId is available
      let available = rawQuestions;
      let exhausted = false;
      
      // A section is served whole or not at all. Pool dedupe used to run for
      // every mode, so a full section silently lost any question the student
      // had already met in a drill — PT103.S1 handed over 25 of its 26 with
      // nothing on screen to say one was missing.
      const fixedQueue = servesFixedQueue(
        mode,
        state.config as { selectedQids?: string[] } | null,
      );

      if (classId && !fixedQueue && !state.savedStandaloneRun) {
        // Dedupe read can fail (RLS/transport). Don't block the drill: fall back
        // to an empty usage map (repeats possible) but tell the student why.
        let usage: Map<string, QuestionUsage> = new Map();
        try {
          usage = await QuestionPoolService.getQuestionUsage(classId, mode);
        } catch (err) {
          console.error('Failed to load question history for dedupe:', err);
          toast.error("Couldn't check your question history; some questions may repeat.");
        }
        const typeDrillConfig = mode === 'type-drill' ? (state.config as TypeDrillConfig) : null;
        const poolSettings = {
          allowRepeats: typeDrillConfig?.unseen_only ? false : settings.allowRepeats,
          preferUnseen: typeDrillConfig?.unseen_only ? true : settings.preferUnseen,
          recycleAfterDays: settings.recycleAfterDays
        };

        const filtered = QuestionPoolService.filterQuestionPool(
          rawQuestions,
          usage,
          poolSettings
        );
        
        available = filtered.available;
        exhausted = filtered.exhausted;

        setTotalPoolSize(rawQuestions.length);
        setAvailablePoolSize(available.length);
        setPoolExhausted(exhausted);
        setPoolStatus(QuestionPoolService.getPoolStatus(rawQuestions.length, available.length, poolSettings));

        if (exhausted) {
          // Don't initialize session if pool is exhausted — surface the
          // reason so the render layer can show a real message instead of
          // the misleading "Session Complete / Loading…" card.
          setBootError(
            "You've already practiced every available question for this drill type. Adjust your drill settings or come back after recycle."
          );
          return;
        }
      }

      if (rawQuestions.length === 0) {
        setBootError(
          "The question bank hasn't loaded any questions for this drill. Try refreshing or contact support if this persists."
        );
        return;
      }

      // For type-drill, apply balanced selection from available pool (only if not pre-selected)
      let finalQuestions = available;
      if (mode === 'type-drill' && state.config) {
        const config = state.config as TypeDrillConfig;
        
        // Skip pool filtering if questions were pre-selected
        if (state.savedStandaloneRun || config.selectedQids && config.selectedQids.length > 0) {
          finalQuestions = available; // Use them directly
        } else {
          // Balanced mix: group by type × level, round-robin select
          const groups = new Map<string, LRQuestion[]>();
          
          for (const q of available) {
            const key = `${q.qtype}-${q.difficulty}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(q);
          }
          
          // Shuffle each group
          for (const [, questions] of groups) {
            for (let i = questions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [questions[i], questions[j]] = [questions[j], questions[i]];
            }
          }
          
          // Round-robin select
          const selected: LRQuestion[] = [];
          const groupArrays = Array.from(groups.values());
          
          while (selected.length < config.count && groupArrays.some(g => g.length > 0)) {
            for (const group of groupArrays) {
              if (group.length > 0 && selected.length < config.count) {
                selected.push(group.shift()!);
              }
            }
          }
          
          // Final shuffle for variety
          for (let i = selected.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selected[i], selected[j]] = [selected[j], selected[i]];
          }
          
          finalQuestions = selected;
        }
      }

      questionQueue = finalQuestions.map(q => q.qid);

      const requestedInitialIndex = initialIndexParam ? Number.parseInt(initialIndexParam, 10) : 0;
      let initialIndex = Number.isFinite(requestedInitialIndex)
        ? Math.min(Math.max(requestedInitialIndex, 0), Math.max(questionQueue.length - 1, 0))
        : 0;
      const restoredAttempts: DrillSession['attempts'] = new Map();
      // Set only when a stored section had already run out of time.
      let restoredRegulationMark: DrillSession['regulationMark'] | undefined;

      // Intro to LR practice sets resume from durable storage, not from the URL.
      // A student who closed the tab, signed out, or moved to another device
      // comes back to the question they stopped on with every prior answer
      // still marked answered in the navigator.
      if (isMcPractice && mcPracticePool && user) {
        const stored = await loadPracticeSession(user.id, mcPracticePool.slug);
        const sameSet =
          !!stored &&
          stored.status === 'in_progress' &&
          stored.question_queue.length === questionQueue.length &&
          stored.question_queue.every((qid) => questionQueue.includes(qid));

        if (stored && sameSet) {
          questionQueue = stored.question_queue;
          initialIndex = Math.min(
            Math.max(stored.current_index, 0),
            Math.max(questionQueue.length - 1, 0),
          );
          for (const attempt of stored.attempts) {
            restoredAttempts.set(attempt.qid, {
              selectedAnswer: attempt.selected_answer,
              correct: attempt.correct,
              timeMs: attempt.time_ms,
              timestamp: Date.now(),
              confidence: undefined,
              reviewDone: false,
              // The record, not just the answer. A resumed run used to come
              // back flattened: no changes of mind, no marks for review.
              switchCount: attempt.switch_count,
              brMarked: attempt.flagged,
              answerRevealed: attempt.answer_revealed ?? false,
              answerTrail: attempt.answer_trail?.map((e) => ({
                answer: e.answer,
                atMs: e.at_ms,
              })),
            });
          }
        } else if (stored && !sameSet && stored.status === 'in_progress') {
          // The frozen pool changed under a saved run. Starting clean is the
          // only honest option; say so rather than silently dropping answers.
          console.warn('[drill:mc-practice] stored resume set no longer matches pool, starting fresh', {
            slug: mcPracticePool.slug,
          });
        }
      }

      // Guided drills resume the same way, and for the same reason: leaving a
      // drill and coming back must return the student to the question they
      // stopped on with their earlier answers intact, not to a fresh shuffle.
      if (guidedSessionKey && user) {
        const guidedRuns = await listStandaloneDrillRuns(user.id);
        const ownedRun = requestedStandaloneRunId
          ? await loadStandaloneDrillRun(user.id, requestedStandaloneRunId)
          : guidedRuns.find((run) => run.source_key === guidedSessionKey && run.session.status === 'in_progress' && run.session.attempts.length > 0) ?? null;
        if ((requestedStandaloneRunId && !ownedRun) || (ownedRun && ownedRun.source_key !== guidedSessionKey)) {
          setBootError('This guided drill sitting could not be found in your account.');
          return;
        }
        guidedRunIdRef.current = ownedRun?.id ?? null;
        if (ownedRun?.session.status === 'completed') {
          navigate(`/practice/drills/runs/${ownedRun.id}?view=results`, { replace: true });
          return;
        }
        if (ownedRun?.session.question_queue.some((qid) => !questionBank.getQuestion(qid))) {
          setBootError('A question in this saved guided drill is no longer available. Your saved answers are unchanged. Please contact Joshua.');
          return;
        }
        const legacyStored = requestedStandaloneRunId ? null : await loadGuidedDrillSession(
          user.id, guidedSessionKey, guidedLegacySessionKey,
        );
        const staleLegacy = isLegacyGuidedSessionSuperseded(legacyStored,
          guidedRuns.filter((run) => run.source_key === guidedSessionKey && run.session.status === 'completed')
            .map((run) => run.session));
        const stored = ownedRun?.session ?? (staleLegacy ? null : legacyStored);
        if (ownedRun?.closeout_attempts) {
          guidedCloseoutAttemptsRef.current = guidedAttemptsToDrillAttempts(ownedRun.closeout_attempts);
        }
        guidedLegacyResumeRef.current = !ownedRun && stored?.status === 'in_progress' && stored.attempts.length > 0;
        const canResume = ownedRun
          ? stored?.status === 'in_progress' && stored.question_queue.length > 0 &&
            stored.question_queue.every((qid) => !!questionBank.getQuestion(qid))
          : isResumableGuidedSession(stored, questionQueue);
        if (canResume && stored) {
          questionQueue = stored.question_queue;
          initialIndex = guidedResumeIndex(
            questionQueue,
            stored.current_index,
            stored.attempts.map((a) => a.qid),
          );
          for (const attempt of ownedRun?.closeout_attempts ?? stored.attempts) {
            restoredAttempts.set(attempt.qid, {
              selectedAnswer: attempt.selected_answer,
              correct: attempt.correct,
              timeMs: attempt.time_ms,
              timestamp: Date.now(),
              confidence: undefined,
              reviewDone: false,
              // The record, not just the answer. A resumed run used to come
              // back flattened: no changes of mind, no marks for review.
              switchCount: attempt.switch_count,
              brMarked: attempt.flagged,
              answerRevealed: attempt.answer_revealed ?? false,
              answerTrail: attempt.answer_trail?.map((e) => ({
                answer: e.answer,
                atMs: e.at_ms,
              })),
            });
          }
        } else if (stored?.status === 'in_progress' && stored.attempts.length > 0) {
          console.warn('[drill:guided] stored resume set no longer matches this drill, starting fresh', {
            key: guidedSessionKey,
          });
        }
      }

      // Standalone Smart Drill and custom type drills are drawn
      // fresh on every launch, so the stored queue IS the run: adopt it whole
      // rather than comparing it to a new shuffle, or the student loses the
      // questions they already answered. An explicit ?initialIndex wins, since
      // that is someone deliberately jumping to a question.
      if (standaloneSourceKey && user && !initialIndexParam) {
        standaloneRunIdRef.current = requestedStandaloneRunId;
        legacyStandaloneResumeRef.current = false;
        historicalStandaloneQidsRef.current = new Set();
        const ownedRun = state.savedStandaloneRun ?? (requestedStandaloneRunId
          ? await loadStandaloneDrillRun(user.id, requestedStandaloneRunId)
          : mode === 'adaptive'
            ? (await listStandaloneDrillRuns(user.id)).find((run) => run.source_key === standaloneSourceKey && run.session.status === 'in_progress') ?? null
            : null);
        if ((requestedStandaloneRunId && !ownedRun) || (ownedRun && ownedRun.source_key !== standaloneSourceKey)) {
          setBootError('This saved drill run could not be found in your account.');
          return;
        }
        if (ownedRun) standaloneRunIdRef.current = ownedRun.id;
        if (ownedRun && !requestedStandaloneRunId) {
          const params = new URLSearchParams(searchParams);
          params.set('run', ownedRun.id);
          navigate(`/drill?${params.toString()}`, { replace: true });
          return;
        }
        if (ownedRun?.session.status === 'completed') {
          navigate(`/practice/drills/runs/${ownedRun.id}?view=results`, { replace: true });
          return;
        }
        const stored = ownedRun?.session ?? (!requestedStandaloneRunId
          ? await loadDrillResumeSession(user.id, standaloneSourceKey)
          : null);
        if (isResumableDrillSession(stored)) {
          legacyStandaloneResumeRef.current = !ownedRun;
          historicalStandaloneQidsRef.current = new Set(stored.attempts.filter(attempt => !attempt.provenance).map(attempt => attempt.qid));
          questionQueue = stored.question_queue;
          initialIndex = guidedResumeIndex(questionQueue, stored.current_index, stored.attempts.map((a) => a.qid));
          for (const attempt of stored.attempts) {
            restoredAttempts.set(attempt.qid, {
              selectedAnswer: attempt.selected_answer,
              provenance: attempt.provenance,
              correct: attempt.correct,
              timeMs: attempt.time_ms,
              timestamp: Date.now(),
              confidence: undefined,
              reviewDone: false,
              switchCount: attempt.switch_count,
              brMarked: attempt.flagged,
              answerRevealed: attempt.answer_revealed ?? false,
              answerTrail: attempt.answer_trail?.map((entry) => ({ answer: entry.answer, atMs: entry.at_ms })),
            });
          }
        }
      }
      if (genericResumeKey && user && (!initialIndexParam || mode === 'full-section')) {
        const stored = await loadDrillResumeSession(
          user.id,
          genericResumeKey,
          genericLegacyResumeKey,
        );
        // A finished assignment's row is that sitting's record. This mount
        // must never write over it: a reload during blind review re-mounts
        // the runner with a fresh clock and no answers, and the first answer
        // given on it used to flip the finished row back to in_progress.
        if (assignmentId && stored?.status === 'completed') {
          genericFinalizedRef.current = true;
        }
        if (isResumableDrillSession(stored)) {
          if (mode === 'full-section' && hasPendingSectionDeviceBackup(user.id, genericResumeKey)) {
            // The newest device copy has not been acknowledged by the account.
            // Keep the student on that exact question until a retry succeeds.
            initialIndex = stored!.current_index;
            setSectionSaveError(true);
          }
          // Come back on the clock they left. A timed section that resumed
          // with a fresh 35:00 was handing back time already spent, which
          // makes the score it produces meaningless.
          if (stored?.elapsed_ms) pendingResumeElapsedMs.current = stored.elapsed_ms;
          if (stored?.regulation_answered_qids) {
            restoredRegulationMark = { answeredQids: stored.regulation_answered_qids };
          }
          // A row stored at or after the buzzer has no clock left to resume
          // on. It opens on the buzzer instead: answers kept, no time handed
          // back, and the student is asked to finish and score the section.
          const budget =
            mode === 'full-section'
              ? sectionBudgetMs((state.config as FullSectionConfig | undefined)?.timer)
              : undefined;
          if (isSpentDrillSession(stored, budget)) {
            pendingResumeAtBuzzer.current = true;
            if (!restoredRegulationMark) {
              restoredRegulationMark = { answeredQids: stored!.attempts.map((a) => a.qid) };
            }
          }
          questionQueue = stored.question_queue;
          if (!hasPendingSectionDeviceBackup(user.id, genericResumeKey)) {
            initialIndex = guidedResumeIndex(
              questionQueue,
              stored.current_index,
              stored.attempts.map((a) => a.qid),
            );
          }
          for (const attempt of stored.attempts) {
            restoredAttempts.set(attempt.qid, {
              selectedAnswer: attempt.selected_answer,
              correct: attempt.correct,
              timeMs: attempt.time_ms,
              timestamp: Date.now(),
              confidence: undefined,
              reviewDone: false,
              // The record, not just the answer. A resumed run used to come
              // back flattened: no changes of mind, no marks for review.
              switchCount: attempt.switch_count,
              brMarked: attempt.flagged,
              answerRevealed: attempt.answer_revealed ?? false,
              answerTrail: attempt.answer_trail?.map((e) => ({
                answer: e.answer,
                atMs: e.at_ms,
              })),
            });
          }
        }
      }


      setSession({
        mode,
        regulationMark: restoredRegulationMark,
        fullSectionConfig: mode === 'full-section' ? (state.config as FullSectionConfig) : undefined,
        typeDrillConfig: (mode === 'type-drill' || mode === 'natural-drill') ? (state.config as TypeDrillConfig) : undefined,
        questionQueue,
        currentIndex: initialIndex,
        attempts: restoredAttempts,
      });
    };

    void initializeSession().catch((error) => {
      console.warn('[drill] account resume could not be loaded', error);
      setBootLoadFailed(true);
      setBootError('Your saved drill could not be loaded from your account. Reload to try again.');
    });
  }, [state, navigate, classId, classIdLoading, qbLoading, settings.allowRepeats, settings.preferUnseen, settings.recycleAfterDays, initialIndexParam, isMcPractice, mcPracticePool, guidedSessionKey, guidedLegacySessionKey, genericResumeKey, genericLegacyResumeKey, standaloneSourceKey, requestedStandaloneRunId, userId]);

  // Shapes the student's current place into a resume snapshot. Shared by the two
  // surfaces that persist one — Intro to LR practice sets and guided drills — and
  // written on every answer and every question move, so leaving mid-drill is
  // never a loss. The persistence layer writes locally at once and debounces the
  // cloud upsert, so this stays cheap enough to run on each session change.
  /**
   * How much of the section clock has been spent, right now.
   *
   * A countdown reports what is left, so the spend is the budget minus that; a
   * stopwatch already reports the spend. Null when there is no clock at all,
   * which is the difference between "no time used" and "no time to use".
   */
  //
  // Read through a ref: the timer context is a new object on every 250ms
  // tick, and a snapshot function that depended on it made the snapshot
  // effect below fire on every tick: an in_progress write four times a
  // second, and a cloud debounce that never settled while the clock ran.
  const timerRef = React.useRef(timer);
  timerRef.current = timer;
  React.useEffect(() => {
    if (sectionSaveError && session?.mode === 'full-section') timerRef.current?.pause();
  }, [sectionSaveError, session?.mode]);
  const pauseForSectionSave = React.useCallback(() => {
    if (session?.mode !== 'full-section') return;
    if (session.fullSectionConfig?.timer.mode !== 'unlimited') timerRef.current?.pause();
    setSectionSaveError(true);
  }, [session?.mode, session?.fullSectionConfig?.timer.mode]);
  const sectionTimerConfig = session?.fullSectionConfig?.timer;
  const sectionElapsedMs = React.useCallback((): number | undefined => {
    const clock = timerRef.current;
    if (!clock) return undefined;
    if (clock.mode === 'stopwatch') return Math.max(0, Math.round(clock.ms));
    const total = sectionBudgetMs(sectionTimerConfig);
    if (!total) return undefined;
    return Math.max(0, Math.round(total - clock.ms));
  }, [sectionTimerConfig]);

  const drillResumeSnapshot = React.useCallback(
    (source: DrillSession | null): PracticeSessionSnapshot | null => {
      if (!source) return null;
      return {
        questionQueue: source.questionQueue,
        currentIndex: source.currentIndex,
        attempts: Array.from(source.attempts.entries())
          .filter(([, attempt]) => !!attempt.selectedAnswer)
          .map(([qid, attempt]) => ({
            qid,
            selected_answer: attempt.selectedAnswer,
            ...(attempt.provenance || !historicalStandaloneQidsRef.current.has(qid) && runtimeStandaloneProvenance
              ? { provenance: attempt.provenance ?? runtimeStandaloneProvenance } : {}),
            correct: !!attempt.correct,
            time_ms: Number.isFinite(attempt.timeMs) ? Math.max(0, Math.round(attempt.timeMs)) : 0,
            switch_count: attempt.switchCount ?? 0,
            flagged: !!attempt.brMarked,
            answer_revealed: !!attempt.answerRevealed,
            answer_trail: attempt.answerTrail?.map((e) => ({
              answer: e.answer,
              at_ms: Math.max(0, Math.round(e.atMs)),
            })),
          })),
        // Stored as time SPENT, so it reads the same whether the surface
        // counts down or up.
        elapsedMs: sectionElapsedMs(),
        timerMode: source.fullSectionConfig?.timer.mode,
        timerCustomMinutes: source.fullSectionConfig?.timer.customMinutes,
        regulationAnsweredQids: source.regulationMark?.answeredQids,
      };
    },
    [sectionElapsedMs, runtimeStandaloneProvenance],
  );

  const persistStandaloneSession = React.useCallback((source: DrillSession, finish = false): Promise<void> => {
    if (!standaloneSourceKey || !user) return Promise.resolve();
    const snapshot = drillResumeSnapshot(source);
    if (!snapshot || snapshot.attempts.length === 0) return Promise.resolve();
    const task = standaloneWriteRef.current.catch(() => undefined).then(async () => {
      let runId = standaloneRunIdRef.current;
      if (!runId) {
        const run = await createStandaloneDrillRun(user.id, standaloneSourceKey, snapshot, {
          mode: source.mode,
          label: practicingLabel || 'Custom drill',
          provenance: legacyStandaloneResumeRef.current ? undefined : standaloneProvenance,
        });
        runId = run.id;
        standaloneRunIdRef.current = runId;
        const url = new URL(window.location.href);
        url.searchParams.set('run', runId);
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
      if (finish) await completeStandaloneDrillRun(user.id, runId, snapshot);
      else await saveStandaloneDrillRun(user.id, runId, snapshot);
      if (finish && legacyStandaloneResumeRef.current) {
        await completeDrillResumeSession(user.id, standaloneSourceKey, snapshot);
        legacyStandaloneResumeRef.current = false;
      }
    });
    standaloneWriteRef.current = task;
    return task.then(() => undefined);
  }, [standaloneSourceKey, user, drillResumeSnapshot, practicingLabel, standaloneProvenance]);

  const persistGuidedSession = React.useCallback((source: DrillSession, finish = false): Promise<void> => {
    if (!guidedSessionKey || !user) return Promise.resolve();
    const snapshot = drillResumeSnapshot(source);
    if (!snapshot || snapshot.attempts.length === 0) return Promise.resolve();
    const task = guidedWriteRef.current.catch(() => undefined).then(async () => {
      let runId = guidedRunIdRef.current;
      if (!runId) {
        const run = await createStandaloneDrillRun(user.id, guidedSessionKey, snapshot, {
          mode: source.mode, label: practicingLabel || 'Guided drill',
        });
        runId = run.id;
        guidedRunIdRef.current = runId;
        const url = new URL(window.location.href);
        url.searchParams.set('run', runId);
        window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
      }
      if (finish) await completeStandaloneDrillRun(user.id, runId, snapshot);
      else await saveStandaloneDrillRun(user.id, runId, snapshot);
      if (finish && guidedLegacyResumeRef.current) {
        try {
          await completeGuidedDrillSession(user.id, guidedSessionKey, snapshot);
        } catch (error) {
          // The individual sitting is already completed. Do not strand the
          // student because the old singleton cleanup failed.
          console.warn('[drill:guided] legacy resume closeout failed', error);
        }
        guidedLegacyResumeRef.current = false;
      }
    });
    guidedWriteRef.current = task;
    return task.then(() => undefined);
  }, [guidedSessionKey, user, drillResumeSnapshot, practicingLabel]);

  /**
   * The clock keeps running between answers, and a student can sit on one
   * question for five minutes. Snapshots written only on answer changes would
   * hand those five minutes back on resume, so a timed section also saves on a
   * slow heartbeat. Held in a ref because the snapshot function changes on
   * every tick and would otherwise restart the interval each time.
   */
  const snapshotRef = React.useRef(drillResumeSnapshot);
  snapshotRef.current = drillResumeSnapshot;
  React.useEffect(() => {
    if (!genericResumeKey || !user || !session || !hasTimer) return;
    if (genericFinalizedRef.current) return;
    if (session.mode !== 'full-section') return;
    const id = window.setInterval(() => {
      // Re-checked on every beat: the section can finish between two of them.
      if (genericFinalizedRef.current || hasPendingSectionDeviceBackup(user.id, genericResumeKey)) return;
      const snapshot = snapshotRef.current(session);
      if (!snapshot) return;
      void saveDrillResumeSnapshot(user.id, genericResumeKey, snapshot).catch((err) => {
        if (ptRun && err instanceof Error && err.message.includes('another device')) {
          setHandoffLost(true);
        } else {
          pauseForSectionSave();
        }
        console.error('[drill:resume:heartbeat] resume write failed', { err });
      });
    }, 20_000);
    return () => window.clearInterval(id);
  }, [genericResumeKey, user, session, hasTimer, ptRun, pauseForSectionSave]);

  React.useEffect(() => {
    if (!isMcPractice || !mcPracticePool || !user || !session) return;
    if (mcPracticeFinalizedRef.current) return;
    if (session.questionQueue.length === 0) return;
    const snapshot = drillResumeSnapshot(session);
    if (!snapshot || (snapshot.attempts.length === 0 && session.currentIndex === 0)) return;
    void savePracticeSessionSnapshot(user.id, mcPracticePool, snapshot).catch((err) => {
      // Non-fatal: the drill still works, they just lose the resume point.
      console.error('[drill:mc-practice:snapshot] resume write failed', {
        userId: user.id,
        slug: mcPracticePool.slug,
        err,
      });
    });
  }, [session, isMcPractice, mcPracticePool, user, drillResumeSnapshot]);

  // Same snapshot on every answer and every question move for guided drills, so
  // the student's place survives a tab close, a sign-out, or another device —
  // none of which a URL param can carry.
  // Guided sittings are written by the answer and navigation gates below.
  // A background write would hide account failures and could revive a finished run.

  // And the same again for every other drill surface. A section is saved as
  // soon as it starts, even before its first answer; other untouched drills
  // remain fresh on their next launch.
  React.useEffect(() => {
    if (!genericResumeKey || !user || !session) return;
    if (genericFinalizedRef.current) return;
    if (session.mode === 'full-section' && sectionSaveError) return;
    if (session.questionQueue.length === 0) return;
    const snapshot = drillResumeSnapshot(session);
    if (!snapshot || (snapshot.attempts.length === 0 && session.mode !== 'full-section')) return;
    void saveDrillResumeSnapshot(user.id, genericResumeKey, snapshot).catch((err) => {
      if (ptRun && err instanceof Error && err.message.includes('another device')) {
        setHandoffLost(true);
      } else {
        pauseForSectionSave();
      }
      // Non-fatal: the drill still works, they just lose the resume point.
      console.error('[drill:resume:snapshot] resume write failed', {
        userId: user.id,
        key: genericResumeKey,
        err,
      });
    });
  }, [session, genericResumeKey, user, drillResumeSnapshot, ptRun, pauseForSectionSave, sectionSaveError]);

  React.useEffect(() => {
    if (!standaloneSourceKey || !session || genericFinalizedRef.current || session.attempts.size === 0) return;
    void persistStandaloneSession(session).catch((error) => {
      console.error('[drill:run] account save failed', error);
      toast.error("Your drill progress has not saved to your account. Try again before leaving.");
    });
  }, [standaloneSourceKey, session, persistStandaloneSession]);

  const retrySectionSave = async () => {
    if (!user || !genericResumeKey || !session || retryingSectionSave) return;
    const snapshot = drillResumeSnapshot(session);
    if (!snapshot) return;
    setRetryingSectionSave(true);
    try {
      await saveDrillResumeSnapshot(user.id, genericResumeKey, snapshot);
      setSectionSaveError(false);
      timerRef.current?.resume();
    } catch (err) {
      if (ptRun && err instanceof Error && err.message.includes('another device')) {
        setHandoffLost(true);
      }
      console.error('[drill:resume:retry] account save failed', err);
    } finally {
      setRetryingSectionSave(false);
    }
  };



  // Hydrate adaptive engine from DB before Smart Drill selects its first
  // question. If hydration fails, the selector may proceed with current-session
  // state only; it must not cold-start merely because the DB read is still in
  // flight.
  React.useEffect(() => {
    if (sessionMode !== 'adaptive') {
      setAdaptiveHydrationStatus('idle');
      return;
    }

    if (classIdLoading) {
      setAdaptiveHydrationStatus('loading');
      return;
    }

    if (!classId) {
      console.warn('[Drill] adaptive hydration skipped: classId unavailable');
      setAdaptiveHydrationStatus('failed');
      return;
    }

    let cancelled = false;
    const currentHydrationStatus = adaptiveEngine.getHydrationStatus();
    setAdaptiveHydrationStatus(currentHydrationStatus === 'idle' ? 'loading' : currentHydrationStatus);
    adaptiveEngine.ensureHydratedFromDB(classId).then(() => {
      if (!cancelled) setAdaptiveHydrationStatus(adaptiveEngine.getHydrationStatus());
    });

    return () => {
      cancelled = true;
    };
  }, [adaptiveEngine, classId, classIdLoading, sessionMode]);

  // Homework: mark assignment as in_progress on first question render.
  React.useEffect(() => {
    if (!assignmentId || !session || !currentQuestion || !user || assignmentStartedRef.current) return;
    assignmentStartedRef.current = true;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from('homework_assignments')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', assignmentId)
          .eq('student_id', user.id)
          .eq('status', 'assigned');
        if (error) throw error;
      } catch (err) {
          console.error('[drill:assignment:start] update failed', {
            userId: user.id,
            assignmentId,
          err,
        });
        // No user-facing toast — drill works regardless. Completion failure is the one we surface.
      }
    })();
  }, [assignmentId, session?.mode, currentQuestion?.qid, user?.id]);

  // Track question views whenever currentQuestion changes
  React.useEffect(() => {
    if (!currentQuestion || !classId || !session) return;
    // Flush previous question's rrweb events before switching context
    const prevQid = lastRecordedQidRef.current;
    if (prevQid && prevQid !== currentQuestion.qid) {
      flushReplay(prevQid, session.mode);
    }
    lastRecordedQidRef.current = currentQuestion.qid;
    currentViewId.current = null;
    QuestionPoolService.trackQuestionView(currentQuestion.qid, classId, session.mode).then(id => {
      currentViewId.current = id;
    });
  }, [currentQuestion?.qid, classId, session?.mode]);

  // Publish active qid for the floating drill notepad (per-question notes).
  React.useEffect(() => {
    setActiveDrillQid(currentQuestion?.qid ?? null);
    return () => setActiveDrillQid(null);
  }, [currentQuestion?.qid]);

  // Persist "last activity" so the classroom Resume CTA can reopen at exact
  // index. Fires whenever the user lands on a new question OR completes one
  // (attempts.size grows). The service throws on DB failure; we surface as a
  // toast (one-shot per failure) rather than silently swallowing.
  const lastActivityAttemptsRef = React.useRef<number>(-1);
  const lastActivityIndexRef = React.useRef<number>(-1);
  React.useEffect(() => {
    if (!user?.id || !session || !currentQuestion) return;
    const attemptCount = session.attempts.size;
    // Skip the very first render of a fresh session (currentIndex 0, no
    // attempts) — that's not "resumable progress" yet.
    if (attemptCount === 0 && session.currentIndex === 0) return;
    if (lastActivityAttemptsRef.current === attemptCount && session.currentIndex === lastActivityIndexRef.current) {
      return;
    }
    lastActivityAttemptsRef.current = attemptCount;
    lastActivityIndexRef.current = session.currentIndex;

    const isSection = session.mode === 'full-section';
    const prettyMode = isSection
      ? 'Section'
      : session.mode === 'type-drill'
      ? 'Custom Drill'
      : session.mode === 'natural-drill'
      ? 'Smart Drill'
      : 'Drill';
    const snapshot: DrillSnapshot | SectionSnapshot = isSection
      ? {
          kind: 'section',
          pt: currentQuestion.pt,
          section_number: currentQuestion.section,
          qids: session.questionQueue,
          current_qid: currentQuestion.qid,
          current_index: session.currentIndex,
          label: `PT ${currentQuestion.pt} Section ${currentQuestion.section} Q${currentQuestion.qnum}`,
        }
      : {
          kind: 'drill',
          mode: session.mode,
          qids: session.questionQueue,
          current_index: session.currentIndex,
          current_qid: currentQuestion.qid,
          assignment_id: assignmentId ?? undefined,
          label: `${prettyMode} — PT ${currentQuestion.pt} Q${currentQuestion.qnum}`,
        };
    (async () => {
      try {
        await upsertLastActivity(user.id, snapshot);
      } catch (e) {
        console.error('[Drill] upsertLastActivity failed', e);
        toast.error("Couldn't save your place. Resume may be out of date.");
      }
    })();
  }, [user?.id, session?.mode, session?.currentIndex, session?.attempts.size, currentQuestion?.qid, currentQuestion?.pt, currentQuestion?.section, currentQuestion?.qnum, assignmentId]);

  // Adaptive mode: select next question only when advanceToken changes.
  // SELECTOR LAYER ONLY — no rendering changes. Pre-filters the question
  // pool against the user's most-recent-500 exposures (Wave 3A), then writes
  // the picked qid back to question_exposures so subsequent picks see it.
  React.useEffect(() => {
    if (!session || session.mode !== 'adaptive') return;
    if (adaptiveHydrationStatus === 'idle' || adaptiveHydrationStatus === 'loading') return;

    let cancelled = false;
    (async () => {
      let excludedQids = new Set<string>();
      if (user?.id) {
        try {
          excludedQids = await getRecentExposureSet(user.id, 500);
        } catch (e) {
          console.error('[Drill] getRecentExposureSet failed; falling back to no exclusion', e);
        }
      }
      if (cancelled) return;

      // Session initialization has already applied the student's repeat,
      // unseen-first, and recycle settings. Rank that exact pool instead of
      // silently jumping back to the entire bank.
      const eligibleQuestions = session.questionQueue
        .map((qid) => questionBank.getQuestion(qid))
        .filter((question): question is LRQuestion => !!question);
      const sessionAttemptRecords = Array.from(session.attempts.entries()).flatMap(([qid, attempt]) => {
        const q = questionBank.getQuestion(qid);
        if (!q) return [];
        return {
          qid,
          correct: attempt.correct,
          time_ms: attempt.timeMs,
          qtype: q.qtype,
          difficulty: q.difficulty,
          timestamp: new Date(attempt.timestamp),
          reasoningType: q.reasoningType ?? [],
          questionFeatures: q.questionFeatures ?? [],
        };
      });

      const historicalAttempts = adaptiveEngine.getRecentAttempts();
      // A newly saved adaptive answer is already in the engine through
      // recordAttempt. Session rows are only a fallback for restored runs or a
      // failed hydration. Do not count the same answer twice when selecting
      // the next question.
      const historicalQids = new Set(historicalAttempts.map((attempt) => attempt.qid));
      const sessionOnlyAttempts = sessionAttemptRecords.filter(
        (attempt) => !historicalQids.has(attempt.qid),
      );
      const combinedAttempts = [...historicalAttempts, ...sessionOnlyAttempts];
      const profile = adaptiveEngine.buildStudentProfile(combinedAttempts);
      const selection = adaptiveEngine.selectSmartDrillQuestion(eligibleQuestions, profile, {
        attempts: combinedAttempts,
        currentSessionUsedQids: new Set([...session.attempts.keys(), ...skippedQids]),
        recentExposureQids: excludedQids,
      });
      const nextQuestion = selection?.question ?? null;

      if (cancelled) return;

      if (!nextQuestion) {
        setSession(null);
        setBootError(
          "No new Smart Drill questions are available without repeating recent work. Try a focused drill or come back after more questions are added."
        );
        return;
      }

      setCurrentQuestion(nextQuestion);
      resetPerQuestionState();

      // Fire-and-forget exposure write. Service silently skips if the table
      // isn't deployed yet; real errors log + continue (no toast on adaptive
      // pick — would interrupt the student's flow).
      if (user?.id && nextQuestion?.qid) {
        recordExposures(user.id, [nextQuestion.qid]).catch((e) =>
          console.error('[Drill] recordExposures failed', e),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [advanceToken, adaptiveHydrationStatus]);

  // Non-adaptive mode: load question based on session.currentIndex
  React.useEffect(() => {
    if (!session || session.mode === 'adaptive') return;

    if (session.currentIndex < session.questionQueue.length) {
      const qid = session.questionQueue[session.currentIndex];
      const question = questionBank.getQuestion(qid);
      setCurrentQuestion(question || null);
    } else {
      setCurrentQuestion(null);
    }

    resetPerQuestionState();

    // Close the visit we are leaving, then open the one we are entering. Done
    // for every mode: a revisit means the same thing in a drill as in a
    // section, and the record costs one map write.
    if (session) {
      const nextQid = session.questionQueue[session.currentIndex];
      closeOpenVisit();
      if (nextQid) {
        openVisit.current = {
          qid: nextQid,
          trailLength: session.attempts.get(nextQid)?.answerTrail?.length ?? 0,
        };
      }
    }

    // Restore saved answer + revealed solution for any non-adaptive mode.
    // (Adaptive is narrowed out by prior control flow in this effect.)
    if (session) {
      const qid = session.questionQueue[session.currentIndex];
      // A revisit picks the answer trail up where it left off rather than
      // restarting it at zero.
      const priorTrail = qid ? session.attempts.get(qid)?.answerTrail : undefined;
      trailBaseMs.current = priorTrail?.length ? priorTrail[priorTrail.length - 1].atMs : 0;
      if (qid) {
        const savedAttempt = session.attempts.get(qid);
        if (savedAttempt?.selectedAnswer) {
          setSelectedAnswer(savedAttempt.selectedAnswer);
        }
        if (showAnswerRevealed.get(qid)) {
          setShowSolution(true);
        }
      }
    }

    // Check if current question is flagged
    checkIfFlagged();
  }, [session?.currentIndex, session?.mode]);

  // Also trigger initial adaptive selection when session first initializes
  React.useEffect(() => {
    if (
      sessionMode === 'adaptive' &&
      !currentQuestion &&
      (adaptiveHydrationStatus === 'ready' || adaptiveHydrationStatus === 'failed')
    ) {
      setAdvanceToken(t => t + 1);
    }
  }, [sessionMode, currentQuestion, adaptiveHydrationStatus]);

  /**
   * Bank the visit that is ending.
   *
   * Counts the visit, marks the question as one the student actually opened,
   * and — when the trail is no longer than it was on entry — counts it as a
   * pass that changed nothing. A first visit that produced no answer is not
   * one of those: there was no answer to leave alone.
   */
  const closeOpenVisit = React.useCallback(() => {
    const visit = openVisit.current;
    openVisit.current = null;
    if (!visit) return;
    setSession((prev) => {
      if (!prev) return prev;
      const attempts = new Map(prev.attempts);
      const attempt = attempts.get(visit.qid);
      const trailLength = attempt?.answerTrail?.length ?? 0;
      const changedNothing = trailLength > 0 && trailLength === visit.trailLength;
      if (attempt) {
        const crossedOff = [...(eliminatedRef.current.get(visit.qid) ?? [])];
        attempts.set(visit.qid, {
          ...attempt,
          visitCount: (attempt.visitCount ?? 0) + 1,
          noChangeRevisits: (attempt.noChangeRevisits ?? 0) + (changedNothing ? 1 : 0),
          // Kept rather than discarded with the question: three crossed off and
          // a choice between the last two is the state the webinar says must
          // always be flagged.
          eliminations: crossedOff.length > 0 ? crossedOff : attempt.eliminations,
        });
      }
      const visited = new Set(prev.visitedQids ?? []);
      visited.add(visit.qid);
      return { ...prev, attempts, visitedQids: [...visited] };
    });
  }, []);

  const resetPerQuestionState = () => {
    setSelectedAnswer('');
    setShowSolution(false);
    setTutorChatOpen(false);
    setTutorQuestionSnapshot(null);
    setTutorUserAnswerSnapshot('');
    setTutorChatMode('pre-answer');
    setVoiceCoachOpen(false);
    setAnswerLocked(false);
    setQuestionStartTime(performance.now());
    questionHighlights.clearHistory();
    setIsRetryAfterWrong(false);
    setCorrectExplanation('');
    setShowReviewButton(false);

    // Reset visual timer for Smart Drill and Smart Builder only
    if (session?.mode === 'adaptive' || session?.mode === 'natural-drill') {
      timer?.reset();
      timer?.start();
    }
  };

  const checkIfFlagged = async () => {
    if (!currentQuestion || !user) {
      setIsFlagged(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('flagged_questions')
        .select('id')
        .eq('qid', currentQuestion.qid)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking flag status:', error);
      }
      
      setIsFlagged(!!data);
    } catch (err) {
      console.error('Error checking flag:', err);
      setIsFlagged(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (guidedSessionKey && guidedCloseoutAttemptsRef.current) {
      toast.info('Finish is pending. Retry Finish to save these results.');
      return;
    }
    if (!reviewControlsAvailable && !isPracticeSetMode && !isRetryAfterWrong && answerLocked) return;
    // Review controls never lock a choice: a pick after a reveal is a recorded
    // change of mind, not a blocked click.
    if (!reviewControlsAvailable && !tutorMode && showSolution) return;
    
    if (selectedAnswer === answer) {
      setSelectedAnswer('');
      if ((session?.mode === 'full-section' || isPracticeSetMode) && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        newAttempts.delete(currentQuestion.qid);
        if (session.mode === 'full-section' && genericResumeKey && user) {
          const snapshot = drillResumeSnapshot({ ...session, attempts: newAttempts });
          if (snapshot) writeSectionDeviceBackup(user.id, genericResumeKey, snapshot);
        }
        setSession({ ...session, attempts: newAttempts });
        
        if (isPracticeSetMode) {
          questionTimer.current.recordAnswer(currentQuestion.qid, '');
        }
      }
    } else {
      setSelectedAnswer(answer);
      if ((session?.mode === 'full-section' || isPracticeSetMode) && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        const existingAttempt = newAttempts.get(currentQuestion.qid);
        // When this choice was made, measured from the start of the question.
        const atMs = Math.max(
          0,
          trailBaseMs.current + Math.floor(performance.now() - questionStartTime),
        );
        const answerTrail = [...(existingAttempt?.answerTrail ?? []), { answer, atMs }];

        newAttempts.set(currentQuestion.qid, {
          selectedAnswer: answer,
          correct: answer === currentQuestion.correctAnswer,
          timeMs: isPracticeSetMode
            ? questionTimer.current.getTotalTime(currentQuestion.qid)
            : Math.floor(performance.now() - questionStartTime),
          timestamp: Date.now(),
          confidence: existingAttempt?.confidence || null,
          reviewDone: false,
          // The record says whether the answer was on screen before this pick.
          answerRevealed:
            existingAttempt?.answerRevealed ||
            answerSeenQidsRef.current.has(currentQuestion.qid) ||
            false,
          answerTrail,
          // Every entry after the first is a change of mind. Derived here so
          // the count and the trail can never disagree.
          switchCount: Math.max(0, answerTrail.length - 1),
        });
        if (session.mode === 'full-section' && genericResumeKey && user) {
          const snapshot = drillResumeSnapshot({ ...session, attempts: newAttempts });
          if (snapshot) writeSectionDeviceBackup(user.id, genericResumeKey, snapshot);
        }
        setSession({ ...session, attempts: newAttempts });
        
        if (isPracticeSetMode) {
          questionTimer.current.recordAnswer(currentQuestion.qid, answer);
        }
      }
    }
  };

  const handleEliminateAnswer = (key: string) => {
    if (guidedSessionKey && guidedCloseoutAttemptsRef.current) return;
    if (!currentQuestion) return;
    const qid = currentQuestion.qid;
    const current = new Set(eliminatedAnswers);
    if (current.has(key)) {
      current.delete(key);
    } else {
      // A cross-out is a reading aid, never an answer change. It used to
      // clear the pick (and drop a section's attempt) when aimed at the
      // chosen letter; the pane now disables that control instead.
      if (selectedAnswer === key) return;
      current.add(key);
    }
    setEliminatedByQid(prev => new Map(prev).set(qid, current));
    if (studyRef?.id === qid) {
      studyTools.update((s) => setStudyEliminations(s, studyRef, current));
    }
  };

  /** Clear this question's cross-outs and highlights; nothing else. */
  const handleClearStudyMarks = () => {
    if (!currentQuestion || !studyRef) return;
    const qid = currentQuestion.qid;
    setEliminatedByQid(prev => new Map(prev).set(qid, new Set()));
    questionHighlights.clearQuestion(qid);
    studyTools.update((s) => clearQuestionMarks(s, studyRef));
  };

  const handleLongPressStart = (key: string) => {
    const timer = setTimeout(() => {
      handleEliminateAnswer(key);
    }, 500);
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };


  const flushReplay = async (qid: string, mode: DrillMode): Promise<void> => {
    const events = eventsRef.current;
    eventsRef.current = [];
    if (events.length === 0 || !user) return;
    const payloadSize = JSON.stringify(events).length;
    if (payloadSize > 7_500_000) {
      console.warn('Session replay exceeds 7.5MB, skipping', { qid, size: payloadSize });
      return;
    }
    const resolvedClassId = classId || user.id;
    const { error } = await supabase.from('session_replays').insert({
      class_id: resolvedClassId,
      user_id: user.id,
      qid,
      mode,
      events_jsonb: events as unknown as Json,
    });
    if (error) console.error('Failed to save session replay:', error);
  };

  // Throws on any failure path. Callers must surface the error (toast, retry,
  // or rethrow); silent absorption is not allowed. Returns void on success.
  // Returns false ONLY for the "classId not yet resolved" case, which is a
  // deliberate skip during cold-start — not a write failure.
  const saveAttemptToDatabase = async (attemptData: {
    id?: string;
    qid: string;
    correct: boolean;
    time_ms: number;
    qtype: string;
    level: number;
    confidence: number | null;
    mode: DrillMode;
    selected_answer?: string;
  }): Promise<boolean> => {
    const question = questionBank.getQuestion(attemptData.qid);
    if (!question) {
      throw new Error(`saveAttemptToDatabase: unknown qid ${attemptData.qid}`);
    }

    if (!classId && classIdLoading) {
      console.warn('saveAttemptToDatabase called before classId resolved, skipping');
      return false;
    }
    const resolvedClassId = classId || user?.id || '';
    if (!resolvedClassId) {
      throw new Error(
        `saveAttemptToDatabase: no class_id and no user.id for qid ${attemptData.qid}`,
      );
    }
    try {
      const { error } = await supabase.from('attempts').insert({
        ...(attemptData.id ? { id: attemptData.id } : {}),
        user_id: user?.id,
        class_id: resolvedClassId,
        qid: attemptData.qid,
        pt: question.pt,
        section: question.section,
        qnum: question.qnum,
        qtype: attemptData.qtype,
        level: attemptData.level,
        correct: attemptData.correct,
        time_ms: attemptData.time_ms,
        confidence: attemptData.confidence,
        mode: attemptData.mode,
        selected_answer: attemptData.selected_answer || null,
        timestamp_iso: new Date().toISOString(),
      });

      if (error) {
        // Guided sittings use a stable id for each question. A retry after the
        // server accepted an earlier insert is the same attempt, not new work.
        if (attemptData.id && error.code === '23505') return true;
        console.error('[drill:saveAttempt] supabase insert failed', {
          userId: user?.id,
          qid: attemptData.qid,
          mode: attemptData.mode,
          error,
        });
        throw new Error(`saveAttemptToDatabase: insert failed (${error.message})`);
      }
      return true;
    } catch (err) {
      console.error('[drill:saveAttempt] threw', {
        userId: user?.id,
        qid: attemptData.qid,
        mode: attemptData.mode,
        err,
      });
      throw err;
    }
  };

  // UI-level helper for the per-question submit handlers. Wraps the throwing
  // service so the callers' `if (!saved.ok)` toast logic keeps working — the
  // error is logged at the service AND visible to the user via the caller's
  // toast. This does NOT silently swallow: failures are logged, classified
  // where the error still exists, and surfaced through the typed result.
  type PersistResult =
    | { ok: true }
    | { ok: false; errorKind: 'auth' | 'network' | 'db' | 'unknown' };
  const classifyPersistError = (e: unknown): 'auth' | 'network' | 'db' | 'unknown' => {
    const message = e instanceof Error ? e.message : String(e ?? '');
    if (/no class_id and no user\.id|jwt|auth|401|403/i.test(message)) return 'auth';
    if (/fetch|network|timeout|Failed to fetch/i.test(message)) return 'network';
    if (/insert failed|supabase|postgres|duplicate|violates/i.test(message)) return 'db';
    return 'unknown';
  };
  // Structured failure event. No PII: no user id, no answer text. There is no
  // error-reporting sink in this repo as of 2026-09-12, so `console.error` is
  // the sink; swap it here when one lands.
  const reportCommitFailure = (event: {
    qid: string;
    launchKind: string | undefined;
    transition: string;
    errorKind: 'auth' | 'network' | 'db' | 'unknown';
    deduped: boolean;
  }) => {
    console.error('[drill:commit-failed]', event);
  };
  const persistAttempt = async (
    attemptData: Parameters<typeof saveAttemptToDatabase>[0],
  ): Promise<PersistResult> => {
    try {
      if (ptRun && user && !await isActivePracticeTestDevice(user.id, ptRun.runId)) {
        setHandoffLost(true);
        return { ok: false, errorKind: 'auth' };
      }
      const saved = await saveAttemptToDatabase(attemptData);
      if (!saved) pauseForSectionSave();
      return saved ? { ok: true } : { ok: false, errorKind: 'unknown' };
    } catch (e) {
      pauseForSectionSave();
      const errorKind = classifyPersistError(e);
      console.error('[drill:persistAttempt] threw, surfacing as save-failed', {
        qid: attemptData.qid,
        mode: attemptData.mode,
        error: e,
      });
      reportCommitFailure({
        qid: attemptData.qid,
        launchKind: state.launchKind,
        transition: 'persistAttempt',
        errorKind,
        deduped: false,
      });
      return { ok: false, errorKind };
    }
  };

  // Persists every selected-answer attempt in the session. Per design, this
  // is the gate before a section closes — every attempt MUST hit the DB or
  // we rethrow so handleFinishSection can surface the failure rather than
  // silently completing a section with missing data.
  //
  // timeMs values are checked: a value of 0 (or negative) indicates a broken
  // timer somewhere upstream and is logged + counted, never silently saved.
  const commitSessionAttempts = async (
    attempts: DrillSession['attempts'],
    mode: DrillMode
  ): Promise<{
    saved: number;
    wajFailed: number;
    timeMsZero: number;
    /** Attempt rows that landed, so a retry can skip them. */
    savedQids: string[];
    /** Journal rows that landed. A short list means closeout work is owed. */
    wajQids: string[];
  }> => {
    if (ptRun && user && !await isActivePracticeTestDevice(user.id, ptRun.runId)) {
      setHandoffLost(true);
      throw new Error('This practice test is active on another device.');
    }
    let saved = 0;
    let wajFailed = 0;
    let timeMsZero = 0;
    const attemptErrors: unknown[] = [];
    const savedQids: string[] = [];
    const wajQids: string[] = [];

    for (const [qid, attempt] of attempts) {
      const question = questionBank.getQuestion(qid);
      if (!question || !attempt.selectedAnswer) continue;

      if (!Number.isFinite(attempt.timeMs) || attempt.timeMs <= 0) {
        timeMsZero++;
        console.warn('[commitSessionAttempts] non-positive timeMs', {
          qid,
          timeMs: attempt.timeMs,
        });
      }

      try {
        const ok = await saveAttemptToDatabase({
          id: guidedSessionKey && guidedRunIdRef.current
            ? await guidedAttemptId(guidedRunIdRef.current, qid)
            : undefined,
          qid,
          correct: attempt.correct,
          time_ms: attempt.timeMs,
          qtype: question.qtype,
          level: question.difficulty,
          confidence: attempt.confidence ?? null,
          mode,
          selected_answer: attempt.selectedAnswer,
        });
        if (ok === false) {
          // Cold-start skip: classId not yet resolved. Treat as failure so the
          // section is not closed with attempts silently dropped.
          attemptErrors.push(
            new Error(`saveAttemptToDatabase skipped (classId not resolved) for qid ${qid}`),
          );
        } else {
          saved++;
          savedQids.push(qid);
        }
      } catch (e) {
        attemptErrors.push(e);
      }

      // Smart Drill journals each miss at answer time (see the adaptive commit
      // path), so repeating it here would double the history and inflate the
      // revisit count on the same journal row.
      if (!attempt.correct && mode !== 'adaptive') {
        try {
          const { logWrongAnswer } = await import('@/lib/wajService');
          await logWrongAnswer({
            class_id: classId,
            qid,
            pt: question.pt,
            section: question.section,
            qnum: question.qnum,
            qtype: question.qtype,
            level: question.difficulty,
            chosen_answer: attempt.selectedAnswer,
            correct_answer: question.correctAnswer,
            time_ms: attempt.timeMs,
            confidence_1_5: null,
          });
          wajQids.push(qid);
        } catch (error) {
          wajFailed++;
          console.error('[drill:waj:log] commit row failed', {
            userId: user?.id,
            qid,
            mode,
            error,
          });
        }
      }
    }

    if (attemptErrors.length > 0) {
      console.error('[commitSessionAttempts] attempt write failures', attemptErrors);
      const first = attemptErrors[0];
      const firstMsg = first instanceof Error ? first.message : String(first);
      throw new Error(
        `commitSessionAttempts: ${attemptErrors.length} attempt write(s) failed; first: ${firstMsg}`,
      );
    }
    return { saved, wajFailed, timeMsZero, savedQids, wajQids };
  };

  const handleWAJSave = async (review: { whyWrong: string; whyEliminated: string; plan: string }) => {
    if (!currentQuestion || !session) return;
    
    const timeMs = Math.floor(performance.now() - questionStartTime);
    
    // Save to attempts database (final attempt after review)
    const saved = guidedSessionKey ? { ok: true as const } : await persistAttempt({
      qid: currentQuestion.qid,
      correct: false,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      level: currentQuestion.difficulty,
      confidence: null,
      mode: session.mode,
      selected_answer: selectedAnswer,
    });
    if (!saved.ok) {
      if (!classId && !user?.id) {
        toast.error("Your session is out of sync. Please refresh the page or sign back in.");
      } else {
        toast.error("Couldn't save your answer. Check your connection and try the next question.");
      }
      if (session.mode === 'adaptive') return;
    }
    if (currentViewId.current) QuestionPoolService.markViewAnswered(currentViewId.current);

    // Save to WAJ database with real review data
    const { logWrongAnswer } = await import('@/lib/wajService');
    try {
      await logWrongAnswer({
        class_id: classId,
        qid: currentQuestion.qid,
        pt: currentQuestion.pt,
        section: currentQuestion.section,
        qnum: currentQuestion.qnum,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        chosen_answer: selectedAnswer,
        correct_answer: currentQuestion.correctAnswer,
        time_ms: timeMs,
        confidence_1_5: null,
        review: {
          q1: review.whyWrong,
          q2: review.whyEliminated,
          q3: review.plan,
        },
      });
    } catch (error) {
      console.error('[drill:waj:log] review save failed', {
        userId: user?.id,
        qid: currentQuestion.qid,
        mode: session.mode,
        error,
      });
      toast.error("Your answer was saved, but the journal entry didn't log. Let Joshua know if this keeps happening.");
    }

    // Update session
    const newAttempts = new Map(session.attempts);
    newAttempts.set(currentQuestion.qid, {
      selectedAnswer,
      correct: false,
      timeMs,
      timestamp: Date.now(),
      confidence: null,
      reviewDone: true,
    });

    // Record with adaptive engine (in-memory)
    adaptiveEngine.recordAttempt({
      qid: currentQuestion.qid,
      correct: false,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date(),
      reasoningType: currentQuestion.reasoningType ?? [],
      questionFeatures: currentQuestion.questionFeatures ?? [],
    });

    setSession({ ...session, attempts: newAttempts });
    setWajModalOpen(false);
    setShowSolution(true);
    
    // Track question usage
    if (classId && session?.mode) {
      QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
    }
    
    // Stay on the same screen; user can press Next when ready
    // (Removed auto-advance)
  };

  // Persists one pick. Honest: a failed save writes no state and returns null,
  // so every caller stops where it is (no move, no completion, the question
  // stays with its pick). Single-flight per qid: a second caller while a save
  // is in flight gets the same promise, so a double arrow persists once.
  const handleSubmitNonAdaptive = async (
    answerOverride?: string,
    options?: { advanceAfterSubmit?: boolean },
  ): Promise<DrillSession['attempts'] | null> => {
    const ans = answerOverride ?? selectedAnswer;
    if (!currentQuestion || !ans || !session) return null;
    const qid = currentQuestion.qid;
    const pending = pendingCommitsRef.current.get(qid);
    if (pending) return pending;
    const run = (async () => {
      try {
        return await submitNonAdaptiveOnce(ans, options);
      } finally {
        pendingCommitsRef.current.delete(qid);
      }
    })();
    pendingCommitsRef.current.set(qid, run);
    return run;
  };

  const submitNonAdaptiveOnce = async (
    ans: string,
    options?: { advanceAfterSubmit?: boolean },
  ): Promise<DrillSession['attempts'] | null> => {
    if (!currentQuestion || !session) return null;

    const correct = ans === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    // Save attempt to database (no confidence for non-adaptive)
    const saved = guidedSessionKey ? { ok: true as const } : await persistAttempt({
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      level: currentQuestion.difficulty,
      confidence: null,
      mode: session.mode,
      selected_answer: ans,
    });
    if (!saved.ok) {
      if (!classId && !user?.id) {
        toast.error("Your session is out of sync. Please refresh the page or sign back in.");
      } else {
        toast.error("Couldn't save your answer. Check your connection and try the next question.");
      }
      // Nothing below runs: the session must not say an attempt exists that
      // the database never received.
      return null;
    }
    await flushReplay(currentQuestion.qid, session.mode);
    if (currentViewId.current) QuestionPoolService.markViewAnswered(currentViewId.current);

    const newAttempts = new Map(session.attempts);
    newAttempts.set(currentQuestion.qid, {
      selectedAnswer: ans,
      correct,
      timeMs,
      timestamp: Date.now(),
      confidence: null,
      reviewDone: false,
      answerRevealed: answerSeenQidsRef.current.has(currentQuestion.qid),
    });

    if (guidedSessionKey) {
      try {
        await persistOwnedDrillSession({ ...session, attempts: newAttempts });
      } catch (error) {
        toast.error('Your guided drill answer did not save to your account. Retry Submit.');
        return null;
      }
    }
    adaptiveEngine.recordAttempt({
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      difficulty: currentQuestion.difficulty,
      timestamp: new Date(),
      reasoningType: currentQuestion.reasoningType ?? [],
      questionFeatures: currentQuestion.questionFeatures ?? [],
    });

    // Track question usage only after this sitting is saved.
    if (classId && session?.mode) {
      QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
    }
    setSession({ ...session, attempts: newAttempts });
    if (!options?.advanceAfterSubmit) {
      setShowSolution(true);
    }
    return newAttempts;
  };

  const handleSubmit = async (options?: { advanceAfterSubmit?: boolean }) => {
    if (!currentQuestion || !selectedAnswer || !session) return;

    const correct = selectedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    // After wrong answer in adaptive mode, save attempt FIRST then show Joshua's feedback
    if (!correct && session.mode === 'adaptive') {
      // SAVE ATTEMPT FIRST
      const saved = await persistAttempt({
        qid: currentQuestion.qid,
        correct: false,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        confidence: null,
        mode: session.mode,
        selected_answer: selectedAnswer,
      });
      if (!saved.ok) {
        if (!classId && !user?.id) {
          toast.error("Your session is out of sync. Please refresh the page or sign back in.");
        } else {
          toast.error("Couldn't save your answer. Check your connection and try the next question.");
        }
        return;
      }
      await flushReplay(currentQuestion.qid, session.mode);
      if (currentViewId.current) QuestionPoolService.markViewAnswered(currentViewId.current);

      // Update session
      const newAttempts = new Map(session.attempts);
      newAttempts.set(currentQuestion.qid, {
        selectedAnswer,
        correct: false,
        timeMs,
        timestamp: Date.now(),
        confidence: null,
        reviewDone: false,
      });

      // Record with adaptive engine
      adaptiveEngine.recordAttempt({
        qid: currentQuestion.qid,
        correct: false,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        difficulty: currentQuestion.difficulty,
        timestamp: new Date(),
        reasoningType: currentQuestion.reasoningType ?? [],
        questionFeatures: currentQuestion.questionFeatures ?? [],
      });

      // Track question usage
      if (classId && session?.mode) {
        QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
      }

      setSession({ ...session, attempts: newAttempts });

      if (options?.advanceAfterSubmit) return;

      if (AI_TUTOR_ENABLED && tutorMode) {
        // Lock answer so the selected row shows red feedback while tutor is open
        if (!reviewControlsAvailable) setAnswerLocked(true);
        // Show red "Wrong" for 150ms, then open tutor (do not reveal solution yet)
        setIsRetryAfterWrong(true);
        setTimeout(() => {
          if (currentQuestion) {
            console.debug('Opening tutor:', {
              qid: currentQuestion.qid,
              mode: session.mode,
              hasSnapshot: !!currentQuestion
            });
            setTutorQuestionSnapshot(currentQuestion);
            setTutorUserAnswerSnapshot(selectedAnswer);
            setTutorChatMode('socratic');
            setTutorChatOpen(true);
          }
        }, 150);
      } else {
        // Tutor Mode OFF: skip tutor, just show solution
        setShowSolution(true);
      }
    } else {
      // Correct answer - save and show solution with Next button (don't auto-advance)
      const saved = await persistAttempt({
        qid: currentQuestion.qid,
        correct: true,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        confidence: null,
        mode: session.mode,
        selected_answer: selectedAnswer,
      });
      if (!saved.ok) {
        if (!classId && !user?.id) {
          toast.error("Your session is out of sync. Please refresh the page or sign back in.");
        } else {
          toast.error("Couldn't save your answer. Check your connection and try the next question.");
        }
        if (session.mode === 'adaptive') return;
      }
      await flushReplay(currentQuestion.qid, session.mode);
      if (currentViewId.current) QuestionPoolService.markViewAnswered(currentViewId.current);

      const newAttempts = new Map(session.attempts);
      newAttempts.set(currentQuestion.qid, {
        selectedAnswer,
        correct,
        timeMs,
        timestamp: Date.now(),
        confidence: null,
        reviewDone: false,
      });

      adaptiveEngine.recordAttempt({
        qid: currentQuestion.qid,
        correct,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        difficulty: currentQuestion.difficulty,
        timestamp: new Date(),
        reasoningType: currentQuestion.reasoningType ?? [],
        questionFeatures: currentQuestion.questionFeatures ?? [],
      });

      // Track question usage
      if (classId && session?.mode) {
        QuestionPoolService.markQuestionSeen(currentQuestion.qid, classId, session.mode);
      }

      // Log correct answer to WAJ if there's an existing wrong entry
      const { logCorrectAnswer } = await import('@/lib/wajService');
      try {
        await logCorrectAnswer({
          class_id: classId,
          qid: currentQuestion.qid,
          pt: currentQuestion.pt,
          section: currentQuestion.section,
          qnum: currentQuestion.qnum,
          qtype: currentQuestion.qtype,
          level: currentQuestion.difficulty,
          chosen_answer: selectedAnswer,
          correct_answer: currentQuestion.correctAnswer,
          time_ms: timeMs,
          confidence_1_5: null,
        });
      } catch (error) {
        console.error('[drill:waj:log] logCorrectAnswer failed', {
          userId: user?.id,
          qid: currentQuestion.qid,
          mode: session.mode,
          error,
        });
        toast.error("Your answer was saved, but the journal entry didn't log. Let Joshua know if this keeps happening.");
      }

      setSession({ ...session, attempts: newAttempts });

      if (options?.advanceAfterSubmit) return;
      
      
      // If this is a retry after wrong answer, generate explanation
      if (isRetryAfterWrong && session.mode === 'adaptive') {
        await generateCorrectExplanation();
      }
      
      // Auto-open tutor card in bottom-left for ANY wrong answer when Tutor Mode is on
      if (!correct && AI_TUTOR_ENABLED && tutorMode && currentQuestion) {
        if (!reviewControlsAvailable) setAnswerLocked(true);
        setIsRetryAfterWrong(true);
        setTimeout(() => {
          setTutorQuestionSnapshot(currentQuestion);
          setTutorUserAnswerSnapshot(selectedAnswer);
          setTutorChatOpen(true);
        }, 150);
      } else {
        setShowSolution(true);
        setShowReviewButton(true);
      }
      // Don't auto-advance - user clicks Next
    }
  };

  const advanceAdaptiveAfterSave = async (source: DrillSession): Promise<boolean> => {
    if (adaptiveAdvanceInFlightRef.current) return false;
    adaptiveAdvanceInFlightRef.current = true;
    try {
      if (!user) throw new Error('Sign in to save your Smart Drill.');
      await persistStandaloneSession(source);
      setAdvanceToken((token) => token + 1);
      return true;
    } catch {
      toast.error('Your Smart Drill answer has not saved to your account. Retry Next.');
      return false;
    } finally {
      adaptiveAdvanceInFlightRef.current = false;
    }
  };

  const commitCurrentAdaptiveAnswer = async ({
    revealAfterSave,
    advanceAfterSave,
  }: {
    revealAfterSave: boolean;
    advanceAfterSave: boolean;
  }): Promise<boolean> => {
    if (!currentQuestion || !session || session.mode !== 'adaptive') return false;

    const qid = currentQuestion.qid;
    const existingAttempt = session.attempts.get(qid);

    if (existingAttempt) {
      if (revealAfterSave) {
        if (existingAttempt.selectedAnswer) setSelectedAnswer(existingAttempt.selectedAnswer);
        setShowAnswerRevealed(prev => new Map(prev).set(qid, true));
        if (!reviewControlsAvailable) setAnswerLocked(true);
        setSession(prev => {
          if (!prev) return prev;
          const existing = prev.attempts.get(qid);
          if (!existing) return prev;
          const attempts = new Map(prev.attempts);
          attempts.set(qid, { ...existing, answerRevealed: true });
          return { ...prev, attempts };
        });
      }
      if (advanceAfterSave && !await advanceAdaptiveAfterSave(session)) return false;
      return true;
    }

    if (!selectedAnswer) {
      toast.error(
        revealAfterSave
          ? 'Select an answer before showing the answer.'
          : 'Select an answer before moving to the next question.',
      );
      return false;
    }

    if (adaptiveCommitInFlightRef.current.has(qid)) return false;
    adaptiveCommitInFlightRef.current.add(qid);

    const committedAnswer = selectedAnswer;
    const correct = committedAnswer === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    try {
      const saved = await persistAttempt({
        qid,
        correct,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        confidence: null,
        mode: session.mode,
        selected_answer: committedAnswer,
      });

      if (!saved.ok) {
        if (!classId && !user?.id) {
          toast.error("Your session is out of sync. Please refresh the page or sign back in.");
        } else {
          toast.error("Couldn't save your answer. Check your connection and try the next question.");
        }
        return false;
      }

      await flushReplay(qid, session.mode);
      if (currentViewId.current) QuestionPoolService.markViewAnswered(currentViewId.current);

      const committedAttempt: DrillSession['attempts'] extends Map<string, infer Attempt> ? Attempt : never = {
        selectedAnswer: committedAnswer,
        correct,
        timeMs,
        timestamp: Date.now(),
        confidence: null,
        reviewDone: false,
        answerRevealed: revealAfterSave,
      };

      const newAttempts = new Map(session.attempts);
      newAttempts.set(qid, committedAttempt);

      adaptiveEngine.recordAttempt({
        qid,
        correct,
        time_ms: timeMs,
        qtype: currentQuestion.qtype,
        difficulty: currentQuestion.difficulty,
        timestamp: new Date(),
        reasoningType: currentQuestion.reasoningType ?? [],
        questionFeatures: currentQuestion.questionFeatures ?? [],
      });

      if (classId && session.mode) {
        QuestionPoolService.markQuestionSeen(qid, classId, session.mode);
      }

      // The attempt is already durable at this point. Update the UI before the
      // secondary journal write so a slow WAJ request cannot stall Submit.
      setSession({ ...session, attempts: newAttempts });

      // Flip an existing WAJ wrong entry to right when a previously-missed
      // question is re-served and answered correctly. The session-end batch
      // (commitSessionAttempts) only logs wrong answers, so without this the
      // adaptive wrong->right flip never fires append_waj_correct.
      void (async () => {
        try {
          const journalAttempt = {
            class_id: classId,
            qid,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            qtype: currentQuestion.qtype,
            level: currentQuestion.difficulty,
            chosen_answer: committedAnswer,
            correct_answer: currentQuestion.correctAnswer,
            time_ms: timeMs,
            confidence_1_5: null,
          };

          if (correct) {
            const { logCorrectAnswer } = await import('@/lib/wajService');
          await logCorrectAnswer({
              ...journalAttempt,
          });
          } else {
            const { logWrongAnswer } = await import('@/lib/wajService');
          await logWrongAnswer({
              ...journalAttempt,
          });
          }
        } catch (error) {
          console.error('[drill:waj:log] adaptive journal write failed', {
            userId: user?.id,
            qid,
            mode: session.mode,
            error,
          });
          toast.error("Your answer was saved, but the journal entry didn't log. Let Joshua know if this keeps happening.");
        }
      })();

      const tutorLaunch = resolveTutorLaunch({
        flagEnabled: AI_TUTOR_ENABLED,
        tutorModeEnabled: tutorMode,
        correct,
        answerRevealed: revealAfterSave,
      });

      if (revealAfterSave) {
        setShowAnswerRevealed(prev => new Map(prev).set(qid, true));
        if (!reviewControlsAvailable) setAnswerLocked(true);
      }

      if (tutorLaunch.shouldOpen) {
        setAnswerLocked(true);
        setTutorQuestionSnapshot(currentQuestion);
        setTutorUserAnswerSnapshot(committedAnswer);
        setTutorChatMode(tutorLaunch.mode);
        setTutorChatOpen(true);
      }

      if (advanceAfterSave && !await advanceAdaptiveAfterSave({ ...session, attempts: newAttempts })) return false;
      return true;
    } finally {
      adaptiveCommitInFlightRef.current.delete(qid);
    }
  };

  const generateCorrectExplanation = async () => {
    if (!currentQuestion) return;
    
    try {
      const questionData = {
        qid: currentQuestion.qid,
        pt: currentQuestion.pt,
        section: currentQuestion.section,
        qnum: currentQuestion.qnum,
        qtype: currentQuestion.qtype,
        level: currentQuestion.difficulty,
        stimulus: currentQuestion.stimulus,
        questionStem: currentQuestion.questionStem,
        answerChoices: currentQuestion.answerChoices,
        userAnswer: selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        breakdown: currentQuestion.breakdown,
        answerChoiceExplanations: currentQuestion.answerChoiceExplanations,
        reasoningType: currentQuestion.reasoningType,
      };

      const { data, error } = await supabase.functions.invoke('tutor-chat', {
        body: {
          question: questionData,
          messages: [{
            role: 'user',
            content: `I got this question correct on my second try! Can you give me a super specific explanation about why choice (${selectedAnswer}) is correct? Be very specific about how it relates to the question and provide a key insight. Keep it concise but insightful.`
          }],
          mode: 'post-answer'
        }
      });

      if (error) throw error;
      
      if (data?.content) {
        setCorrectExplanation(data.content);
      }
    } catch (err) {
      console.error('Error generating explanation:', err);
      setCorrectExplanation('Great job getting it right! The correct answer demonstrates your understanding of the key concept.');
    }
  };


  // Practice-set mode handlers
  const handleShowAnswer = () => {
    if (!currentQuestion || !isPracticeSetMode) return;
    
    // Mark answer as revealed
    setShowAnswerRevealed(prev => new Map(prev).set(currentQuestion.qid, true));
    
    // Update session to track revealed status
    if (session) {
      const newAttempts = new Map(session.attempts);
      const existingAttempt = newAttempts.get(currentQuestion.qid);
      if (existingAttempt) {
        newAttempts.set(currentQuestion.qid, {
          ...existingAttempt,
          answerRevealed: true,
        });
        setSession({ ...session, attempts: newAttempts });
      }
    }
    
    setShowSolution(true);
  };

  const handlePracticeSetNext = async () => {
    if (!session) return;
    
    // Pause timer on current question
    if (currentQuestion) {
      questionTimer.current.pause();
    }
    
    // Move to next
    if (session.currentIndex < session.questionQueue.length - 1) {
      const nextSession = { ...session, currentIndex: session.currentIndex + 1 };
      if ((standaloneSourceKey || guidedSessionKey) && nextSession.attempts.size > 0) {
        try {
          await persistOwnedDrillSession(nextSession);
        } catch (error) {
          toast.error("Your answer has not saved to your account. Retry Next.");
          return;
        }
      }
      setSession(nextSession);
    } else {
      // Finished
      await handleFinishPracticeSet();
    }
  };

  const handlePracticeSetPrevious = async () => {
    if (!session) return;
    
    // Pause timer on current question
    if (currentQuestion) {
      questionTimer.current.pause();
    }
    
    // Move to previous. Functional, like every other queue move: stepping back
    // can follow an answer that was just committed, and a spread of the
    // closure's `session` would write that attempt straight back out.
    if (session.currentIndex > 0) {
      const previousSession = { ...session, currentIndex: session.currentIndex - 1 };
      if ((standaloneSourceKey || guidedSessionKey) && previousSession.attempts.size > 0) {
        try {
          await persistOwnedDrillSession(previousSession);
        } catch (error) {
          toast.error("Your place has not saved to your account. Retry Previous.");
          return;
        }
      }
      setSession(previousSession);
    }
  };

  /**
   * Close out an Intro to LR practice set: record the module-progress
   * completion that the path and the practice-drills index read, and flip the
   * resume row to completed so it stops offering "Resume".
   *
   * Both finish paths call this. Previously only the "End Drill" header button
   * did, so a student who answered the last question and pressed Next finished
   * the set without it ever being recorded anywhere.
   */
  const finalizeMcPracticeSet = async (attempts: DrillSession['attempts']): Promise<void> => {
    if (!isMcPractice || !mcPracticePool || !user) return;
    mcPracticeFinalizedRef.current = true;

    try {
      await recordPracticeDrillCompletion(user.id, mcPracticePool.completionId);
    } catch (err) {
      console.error('[drill:mc-practice:complete] progress write failed', {
        userId: user.id,
        completionId: mcPracticePool.completionId,
        err,
      });
      toast.error("Couldn't record practice completion on your path. Your attempts saved; let Joshua know.");
    }

    const snapshot = drillResumeSnapshot(session ? { ...session, attempts } : null);
    if (!snapshot) return;
    try {
      await completePracticeSession(user.id, mcPracticePool, snapshot);
    } catch (err) {
      console.error('[drill:mc-practice:complete] resume row write failed', {
        userId: user.id,
        slug: mcPracticePool.slug,
        err,
      });
    }
  };

  /**
   * Close out a guided drill's resume row. Flipping it to completed is what
   * keeps a re-attempt fresh: a completed row is never resumed, so opening the
   * drill again draws a new set of questions rather than replaying the old one.
   *
   * Called from both finish paths — answering the last question, and the End
   * Drill button — for the same reason finalizeMcPracticeSet is.
   */
  const finalizeGuidedDrillSession = async (attempts: DrillSession['attempts']): Promise<void> => {
    if (!guidedSessionKey || !user) return;
    if (guidedFinalizedRef.current) return;
    if (attempts.size === 0 || !session) {
      toast.error('Submit at least one answer before finishing this guided drill.');
      throw new Error('No guided drill answers have been saved.');
    }
    try {
      await persistGuidedSession({ ...session, attempts }, true);
      guidedFinalizedRef.current = true;
    } catch (err) {
      console.error('[drill:guided:complete] account run write failed', {
        userId: user.id,
        key: guidedSessionKey,
        err,
      });
      toast.error('Your guided drill results did not save to your account. Retry Finish.');
      throw err;
    }
  };

  /** Save guided choices to the sitting; final analytics are written on closeout. */
  const persistOwnedDrillSession = async (source: DrillSession): Promise<void> => {
    if (!guidedSessionKey) return persistStandaloneSession(source);
    await persistGuidedSession(source);
  };

  const lockGuidedCloseout = async (source: DrillSession): Promise<DrillSession['attempts']> => {
    if (!guidedSessionKey || !user) return source.attempts;
    if (guidedCloseoutAttemptsRef.current) return guidedCloseoutAttemptsRef.current;
    const snapshot = drillResumeSnapshot(source);
    if (!snapshot?.attempts.length) throw new Error('Submit an answer before finishing.');
    // The first account write creates the sitting; the next seals its answers
    // before analytics receives any row. A failed write stops finish here.
    await persistGuidedSession(source);
    const runId = guidedRunIdRef.current;
    if (!runId) throw new Error('This guided drill sitting could not be saved.');
    const run = await beginGuidedDrillCloseout(user.id, runId, snapshot);
    const locked = guidedAttemptsToDrillAttempts(run.closeout_attempts ?? run.session.attempts);
    guidedCloseoutAttemptsRef.current = locked;
    setSession((current) => current ? { ...current, attempts: locked } : current);
    return locked;
  };

  const finalizeGuidedAssignment = async (): Promise<void> => {
    if (!guidedAssignmentId || !user) return;
    try {
      const { error } = await supabase
        .from('guided_drill_assignments')
        .update({ completed_at: new Date().toISOString(), status: 'completed' })
        .eq('id', guidedAssignmentId)
        .eq('student_id', user.id);
      if (error) throw error;
      await completeLinkedTodo(guidedAssignmentId);
    } catch (err) {
      console.error('[drill:guided-assignment:complete] update failed', {
        userId: user.id,
        guidedAssignmentId,
        err,
      });
      toast.error("Couldn't mark your guided drill complete. Your attempts saved; let Joshua know.");
    }
  };

  /**
   * Close out the resume row for Smart Drill / custom drills / full sections.
   * The row keeps the queue and every answer for review; completing it only
   * stops it being offered as a resume, so the next launch draws fresh
   * questions instead of replaying a finished run.
   */
  const finalizeDrillResumeSession = async (attempts: DrillSession['attempts']): Promise<void> => {
    if (!genericResumeKey || !user) return;
    // Already closed, or sealed at mount because the assignment's row was
    // finished before this page opened. Either way the record stands.
    if (genericFinalizedRef.current) return;
    genericFinalizedRef.current = true;

    const snapshot = drillResumeSnapshot(session ? { ...session, attempts } : null);
    if (!snapshot) return;
    try {
      await completeDrillResumeSession(user.id, genericResumeKey, snapshot);
    } catch (err) {
      // Non-fatal: the attempts are already saved; this only affects resume.
      console.error('[drill:resume:complete] resume row write failed', {
        userId: user.id,
        key: genericResumeKey,
        err,
      });
    }
  };


  const handleFinishPracticeSet = async () => {
    if (!session || !user) return;

    // Flush final-question rrweb events before tearing down the session view
    if (currentQuestion) await flushReplay(currentQuestion.qid, session.mode);

    // Pause timer
    if (timer) timer.pause();

    // Sync timer metrics into attempt.timeMs before commit (practice-set uses cumulative timer)
    let attemptsWithTiming: DrillSession['attempts'] = new Map(session.attempts);
    for (const [qid, attempt] of attemptsWithTiming) {
      const totalTimeMs = questionTimer.current.getMetrics(qid).totalTimeMs;
      attemptsWithTiming.set(qid, { ...attempt, timeMs: totalTimeMs });
    }

    if (guidedSessionKey) attemptsWithTiming = await lockGuidedCloseout({ ...session, attempts: attemptsWithTiming });

    try {
      const { wajFailed, timeMsZero } = await commitSessionAttempts(attemptsWithTiming, 'practice-set');
      if (timeMsZero > 0) {
        toast.warning(
          `${timeMsZero} attempt${timeMsZero === 1 ? '' : 's'} had a missing timer value. Saved, but pacing data may be incomplete.`,
        );
      }
      if (wajFailed > 0) {
        toast.error(
          `${wajFailed} journal entr${wajFailed === 1 ? 'y' : 'ies'} didn't save. Your attempts were recorded but WAJ history may be incomplete.`,
        );
      }
    } catch (e) {
      toast.error('Failed to save practice-set attempts. Your progress may be incomplete.');
      throw e;
    }

    // Intro to LR practice sets: record completion on the natural finish path
    // (answer the last question, press Next), not just the End Drill button.
    await finalizeMcPracticeSet(attemptsWithTiming);

    // Guided drill: close the resume row so a re-attempt starts fresh.
    await finalizeGuidedDrillSession(attemptsWithTiming);
    await finalizeGuidedAssignment();

    // Every other drill surface: same close-out.
    await finalizeDrillResumeSession(attemptsWithTiming);
    if (standaloneSourceKey && !genericFinalizedRef.current) {
      try {
        await persistStandaloneSession({ ...session, attempts: attemptsWithTiming }, true);
        genericFinalizedRef.current = true;
      } catch (error) {
        toast.error("Your drill results could not be saved to your account. Retry Finish.");
        throw error;
      }
    }


    // Homework assignment: write status=completed + score.
    if (assignmentId && user) {
      const score = homeworkScore(session.questionQueue.length, session.attempts);
      try {
        await closeOutHomeworkAssignment(assignmentId, user.id, score);
        toast.success(`Homework complete — ${score.toFixed(0)}%`, {
          action: { label: 'Classroom', onClick: () => navigate('/classroom') },
        });
      } catch (err) {
        console.error('[drill:assignment:complete] update failed', {
          userId: user.id,
          assignmentId,
          score,
          err,
        });
        toast.error("Couldn't mark your assignment complete. Your attempts saved; let Joshua know.");
      }
    }

    // Show results
    setPostSectionScreen('score-report');
  };

  const timedNavigationRef = React.useRef(false);
  const moveTimedSection = async (
    nextIndex: number,
    attempts?: DrillSession['attempts'],
  ): Promise<boolean> => {
    if (!session || sectionSaveError || timerRef.current?.isPaused || timedNavigationRef.current) return false;
    if (!user || !genericResumeKey) {
      pauseForSectionSave();
      return false;
    }
    timedNavigationRef.current = true;
    setActionInFlight(true);
    const nextSession = { ...session, attempts: attempts ?? session.attempts, currentIndex: nextIndex };
    try {
      const snapshot = drillResumeSnapshot(nextSession);
      if (!snapshot) throw new Error('Could not save this section.');
      // Save the destination and current answer together. No question change is
      // visible until the account has acknowledged this exact snapshot.
      await saveDrillResumeSnapshot(user.id, genericResumeKey, snapshot);
      if (nextIndex !== session.currentIndex || attempts) setSession(nextSession);
      return true;
    } catch (err) {
      if (ptRun && err instanceof Error && err.message.includes('another device')) setHandoffLost(true);
      else pauseForSectionSave();
      console.error('[drill:section:navigation] account save failed', err);
      return false;
    } finally {
      timedNavigationRef.current = false;
      setActionInFlight(false);
    }
  };

  const handleNext = async (attempts?: DrillSession['attempts']) => {
    if (!session) return;

    if (session.mode === 'adaptive') {
      if (!currentQuestion || !session.attempts.has(currentQuestion.qid)) {
        toast.error("Save this answer before moving to the next Smart Drill question.");
        return;
      }
      await advanceAdaptiveAfterSave(session);
    } else {
      // Move to next in queue
      if (session.currentIndex < session.questionQueue.length - 1) {
        if (session.mode === 'full-section') {
          await moveTimedSection(session.currentIndex + 1, attempts);
        } else {
          const nextSession = { ...session, attempts: attempts ?? session.attempts, currentIndex: session.currentIndex + 1 };
          if ((standaloneSourceKey || guidedSessionKey) && nextSession.attempts.size > 0) {
            try {
              await persistOwnedDrillSession(nextSession);
            } catch (error) {
              toast.error("Your answer has not saved to your account. Retry Next.");
              return;
            }
          }
          setSession(nextSession);
        }
      } else {
        // Reached the end - show results
        if (session.mode !== 'full-section' || await moveTimedSection(session.currentIndex, attempts)) {
          await handleFinishSection(attempts ?? session.attempts);
        }
      }
    }
  };

  const handlePrevious = async (attempts?: DrillSession['attempts']) => {
    if (!session || session.mode === 'adaptive') return;
    if (session.mode === 'full-section') {
      if (session.currentIndex > 0) await moveTimedSection(session.currentIndex - 1, attempts);
      return;
    }
    
    // Move to previous in queue. See handlePracticeSetPrevious: functional, so
    // an attempt committed moments earlier survives the step back.
    if (session.currentIndex > 0) {
      const previousSession = { ...session, attempts: attempts ?? session.attempts, currentIndex: session.currentIndex - 1 };
      if ((standaloneSourceKey || guidedSessionKey) && previousSession.attempts.size > 0) {
        try {
          await persistOwnedDrillSession(previousSession);
        } catch (error) {
          toast.error("Your place has not saved to your account. Retry Previous.");
          return;
        }
      }
      setSession(previousSession);
    }
  };

  // One-shot: expiry firing while a manual finish is in flight must be a no-op.
  const sittingCloseoutRef = React.useRef(false);

  /**
   * Close out one leg of a practice test.
   *
   * Order is load-bearing: attempts, then the journal, then section_history,
   * then the resume record. The invigilator reads a section_history row as
   * "this leg is finished" and advances past it, so writing history before the
   * journal is complete would make the journal retry unreachable. And the
   * resume record is finalized only after history lands, or a failed persist
   * would leave a completed resume row that re-entry rejects, stranding a leg
   * that can never be scored.
   */
  const runSittingCloseout = async (
    attempts: DrillSession['attempts'],
    finishedSession: DrillSession,
  ) => {
    if (ptRun && user && !await isActivePracticeTestDevice(user.id, ptRun.runId)) {
      setHandoffLost(true);
      return;
    }
    const back = drillReturnTo || '/classroom';
    const key =
      user && ptRun
        ? closeoutKey(user.id, ptRun.runId, ptRun.legIndex)
        : null;

    try {
      if (!user) throw new Error('sitting closeout without a signed-in user');
      if (!ptRun) {
        // A sitting whose launch state lost its identity is a bug, not a case
        // to paper over with a guessed key.
        throw new Error('sitting closeout without run identity');
      }

      const stats = buildSectionStats(finishedSession, undefined);
      const expectedWaj = wajQidsForSection(stats);

      const { savedQids, wajQids } = await commitSessionAttempts(
        attempts,
        'full-section',
      );
      let progress = recordCloseoutProgress(key!, { savedQids, wajQids });

      // commitSessionAttempts journals only ANSWERED misses. The unanswered
      // ones are misses too, and nothing else records them once the results
      // screen stops rendering.
      const owed = outstandingWajQids(expectedWaj, progress);
      if (owed.length > 0) {
        const written = await logSectionWrongAnswers({
          stats,
          qids: owed,
          classId,
        });
        progress = recordCloseoutProgress(key!, { wajQids: written });
      }

      // Incomplete journal means the leg is not finished. Leave the key, write
      // no history row, and let re-entry retry only what is still owed.
      const stillOwed = outstandingWajQids(expectedWaj, progress);
      if (stillOwed.length > 0) {
        console.error('[drill:sitting-closeout] journal incomplete', {
          runId: ptRun.runId,
          legIndex: ptRun.legIndex,
          owed: stillOwed.length,
        });
        return;
      }

      if (!progress.historySaved) {
        const sectionHistoryId = await persistSectionResults({
          session: finishedSession,
          stats,
          classId,
          userId: user.id,
          practiceTestRun: ptRun,
        });
        // Every leg of a practice test is a section, and each one gets its own
        // report. Not awaited: the leg is saved, and the sitting has to be able
        // to move on to the next section whatever the mail server is doing.
        void emailSectionReport(sectionHistoryId);
        progress = recordCloseoutProgress(key!, { historySaved: true });
      }

      await finalizeDrillResumeSession(attempts);
      clearCloseoutProgress(key!);
    } catch (error) {
      console.error('[drill:sitting-closeout] failed', error);
    } finally {
      navigate(back);
    }
  };

  const handleFinishSection = async (
    attemptsOverride?: DrillSession['attempts'],
    options?: { returnToAfterFinish?: string },
  ) => {
    if (!session) return;
    if (ptRun && user && !await isActivePracticeTestDevice(user.id, ptRun.runId)) {
      setHandoffLost(true);
      return;
    }

    // The last question never gets left, so its visit would never be banked.
    // Close it here or every section under-counts by one.
    closeOpenVisit();

    // Stop the section timer so it does not keep ticking through
    // SectionComplete / blind review / LRSectionResults.
    if (timer) timer.pause();

    // Flush final-question rrweb events before tearing down the session view
    if (currentQuestion) await flushReplay(currentQuestion.qid, session.mode);

    // Evaluate correctness for all attempted questions
    let updatedAttempts = new Map(attemptsOverride ?? session.attempts);
    for (const [qid, attempt] of updatedAttempts) {
      const question = questionBank.getQuestion(qid);
      if (question) {
        // Update correctness based on actual answer
        updatedAttempts.set(qid, {
          ...attempt,
          correct: attempt.selectedAnswer === question.correctAnswer,
        });
      }
    }

    // Create updated session with evaluated attempts
    let updatedSession = {
      ...session,
      attempts: updatedAttempts,
    };

    if (guidedSessionKey && !inSitting) {
      updatedAttempts = await lockGuidedCloseout(updatedSession);
      updatedSession = { ...updatedSession, attempts: updatedAttempts };
    }

    // A section sat inside a practice test closes out to the invigilator and
    // never shows a score. The whole path is failure-proof and retryable: any
    // throw still navigates back, because trapping a student on a dead drill
    // screen is worse than an unscored leg, which the invigilator already
    // renders honestly.
    if (inSitting) {
      if (sittingCloseoutRef.current) return;
      sittingCloseoutRef.current = true;
      await runSittingCloseout(updatedAttempts, updatedSession);
      return;
    }

    // Persist per-question attempts to DB (F2.15). commitSessionAttempts throws
    // if any attempt write fails — per the don't-swallow-errors policy, we
    // surface the failure to the user AND rethrow so the section closeout is
    // not silently completed with incomplete data.
    try {
      const { wajFailed, timeMsZero } = await commitSessionAttempts(updatedAttempts, 'full-section');
      if (timeMsZero > 0) {
        toast.warning(
          `${timeMsZero} attempt${timeMsZero === 1 ? '' : 's'} had a missing timer value. Saved, but pacing data may be incomplete.`,
        );
      }
      if (wajFailed > 0) {
        toast.error(
          `${wajFailed} journal entr${wajFailed === 1 ? 'y' : 'ies'} didn't save. Your attempts were recorded but WAJ history may be incomplete.`,
        );
      }
    } catch (e) {
      toast.error('Failed to save section attempts. Your section may be incomplete.');
      throw e;
    }

    // Flaw & Famous Flaws: mirror the outcome into the bootcamp's own
    // performance store so its dashboard and mistake journal stop reading empty.
    if (origin === 'fallacy-flaw' && contextFocus) {
      const outcomes = Array.from(updatedAttempts.values())
        .filter((a) => a.selectedAnswer)
        .map((a) => ({ correct: !!a.correct, timeMs: a.timeMs }));
      recordFlawPerformance(contextFocus, outcomes);
    }

    // Intro to LR final practice sets: record path completion so the learner
    // path reflects the work. Failure is surfaced, not swallowed.
    await finalizeMcPracticeSet(updatedAttempts);

    // Guided drill closed out from here (the End Drill button) rather than by
    // answering the last question — same closeout, so a re-attempt is fresh.
    await finalizeGuidedDrillSession(updatedAttempts);
    await finalizeGuidedAssignment();

    // Close the applicable account-owned sitting before opening its results.
    await finalizeDrillResumeSession(updatedAttempts);
    if (standaloneSourceKey && !genericFinalizedRef.current) {
      try {
        await persistStandaloneSession(updatedSession, true);
        genericFinalizedRef.current = true;
      } catch (error) {
        toast.error("Your drill results could not be saved to your account. Retry Finish.");
        throw error;
      }
    }

    // An assigned section closes its own Classroom card. Sitting the section is
    // the completion, so there is nothing for the student to assert afterwards
    // and no "Mark done" to press. Quiet by design: a failure here leaves the
    // card up, which is where we already were, and must never interrupt the
    // results screen.
    if (session.mode === 'full-section' && user && session.fullSectionConfig) {
      await closeOutAssignedSection(
        user.id,
        session.fullSectionConfig.pt,
        session.fullSectionConfig.section,
      );
    }

    // A homework set that is one whole section runs through here, not through
    // handleFinishPracticeSet, so its row has to be completed here too or the
    // card never leaves Home. Attempts are already committed above; the score
    // is written for Joshua and is not shown to her, because a sealed section
    // reveals nothing until blind review is done.
    if (assignmentId && user) {
      const score = homeworkScore(session.questionQueue.length, updatedAttempts);
      try {
        await closeOutHomeworkAssignment(assignmentId, user.id, score);
      } catch (err) {
        console.error('[drill:assignment:complete] update failed', {
          userId: user.id,
          assignmentId,
          score,
          err,
        });
        toast.error("Couldn't mark your assignment complete. Your answers saved; let Joshua know.");
      }
    }


    setBrPassQids(null);

    // Update session state
    setSession(updatedSession);

    if (session.mode === 'adaptive') {
      navigate(standaloneRunIdRef.current
        ? `/practice/drills/runs/${standaloneRunIdRef.current}?view=results`
        : '/practice/drills');
      return;
    }

    if (options?.returnToAfterFinish) {
      navigate(options.returnToAfterFinish);
      return;
    }

    // Guess first, then the fork. The guess is only worth anything while the
    // real number is still unknown.
    setPredictedScore(null);
    setPostSectionScreen(session.mode === 'full-section' ? 'predict' : 'complete');
  };

  // Enhanced keyboard navigation for section mode
  React.useEffect(() => {
    if (session?.mode !== 'full-section' || !currentQuestion) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Arrow keys for navigation
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        void handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        void handlePrevious();
      }
      // Number keys 1-5 for selecting A-E
      else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const answerKeys = Object.keys(currentQuestion.answerChoices);
        const answerIndex = parseInt(e.key) - 1;
        if (answerIndex < answerKeys.length) {
          handleAnswerSelect(answerKeys[answerIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, handleNext, handlePrevious, currentQuestion]);

  // Highlights are shared with every other question surface through the hook;
  // the pane hands over every block on screen and the hook clips the
  // selection to each, so one drag can mark the stem and a choice together.
  const handleTextSelection = (regions: HighlightRegion[]) =>
    questionHighlights.applySelection(currentQuestion?.qid, highlightMode, regions);

  const handleHighlightClick = (highlightId: string) => {
    if (highlightMode !== 'erase') return;
    questionHighlights.removeHighlight(currentQuestion?.qid, highlightId);
  };

  const handleUndo = questionHighlights.undo;

  const handleToggleFlag = async () => {
    if (!currentQuestion || !user) return;
    
    try {
      if (isFlagged) {
        // Unflag
        const { error } = await supabase
          .from('flagged_questions')
          .delete()
          .eq('qid', currentQuestion.qid)
          .eq('user_id', user.id);
        
        if (error) throw error;
        setIsFlagged(false);
        toast.success("Question unflagged");
      } else {
        // Flag
        const { error } = await supabase
          .from('flagged_questions')
          .insert({
            qid: currentQuestion.qid,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            qtype: currentQuestion.qtype,
            level: currentQuestion.difficulty,
            user_id: user.id,
            class_id: classId,
          });
        
        if (error && error.code !== '23505') { // Ignore unique constraint violation
          throw error;
        }
        setIsFlagged(true);
        // Flag -> journal bridge: surface this question in the Wrong Answer
        // Journal too, recording the current attempt if one was made. Failure
        // here must not undo the flag, but must not be swallowed either.
        try {
          const { ensureJournalEntry } = await import('@/lib/wajService');
          await ensureJournalEntry({
            class_id: classId,
            qid: currentQuestion.qid,
            pt: currentQuestion.pt,
            section: currentQuestion.section,
            qnum: currentQuestion.qnum,
            qtype: currentQuestion.qtype,
            level: currentQuestion.difficulty,
            chosen_answer: selectedAnswer || null,
            correct_answer: currentQuestion.correctAnswer,
          });
        } catch (journalErr) {
          toast.error("Flagged, but couldn't add to Journal", {
            description: journalErr instanceof Error ? journalErr.message : String(journalErr),
          });
        }
        toast.success("Question flagged", {
          action: {
            label: "Open Journal",
            onClick: () => navigate("/journal"),
          },
        });
      }
    } catch (err) {
      console.error('Error toggling flag:', err);
    }
  };

  // Every way out of a guided drill carries the student's place, not just the
  // breadcrumb. The exit dialog promises "your progress will be saved"; before
  // this, that promise was only kept on one of the four exits.
  const isGuidedDrillReturn = !isMcPractice && !!returnTo && returnTo.startsWith('/guided');
  const guidedDrillReturnTo = isGuidedDrillReturn && session
    ? appendGuidedResumeParams(returnTo, session.questionQueue, session.currentIndex)
    : returnTo;
  const guidedAwareReturnTo = isGuidedDrillReturn ? guidedDrillReturnTo : drillReturnTo;

  const handleNavigation = (destination: '/classroom/drill' | '/classroom' | '/dashboard') => {
    setExitDestination(guidedAwareReturnTo || destination);
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    navigate(exitDestination);
  };

  const handleToggleBR = () => {
    if (!currentQuestion || !brEnabled) return;
    
    setBrMarked(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.qid)) {
        newSet.delete(currentQuestion.qid);
      } else {
        newSet.add(currentQuestion.qid);
      }
      return newSet;
    });
  };

  // Keyboard shortcut for BR marking
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only trigger if not in an input field
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleToggleBR();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, brEnabled]);

  // Start timer on mount if a TimerProvider is present (countdown OR stopwatch).
  React.useEffect(() => {
    if (timer && !timer.running && !timer.isPaused) {
      timer.start();
    }
  }, [timer]);

  // Fold a resumed section's spent time into the running clock, once. A clock
  // that comes back with nothing left stops here and asks, the way it would
  // have had the student still been on the page when it ran out.
  React.useEffect(() => {
    if (!timer?.running) return;
    const spent = pendingResumeElapsedMs.current;
    if (!spent) return;
    pendingResumeElapsedMs.current = null;
    timer.adoptElapsed(spent);
    if (pendingResumeAtBuzzer.current) {
      pendingResumeAtBuzzer.current = false;
      timer.pause();
      setOvertimeState('prompt');
    }
  }, [timer]);

  // The buzzer. Stops the clock, records where the student had got to, and
  // asks — once. A section that has already been carried past its buzzer must
  // not be asked again on every tick.
  React.useEffect(() => {
    if (!timer || !session) return;
    if (session.mode !== 'full-section') return;
    if (timer.mode !== 'countdown' || timer.ms > 0) return;
    if (overtimeState !== 'none' || session.regulationMark) return;

    const answeredQids = Array.from(session.attempts.entries())
      .filter(([, a]) => !!a.selectedAnswer)
      .map(([qid]) => qid);
    setSession({ ...session, regulationMark: { answeredQids } });
    timer.pause();
    setOvertimeState('prompt');
  }, [timer, session, overtimeState]);

  // Metadata for the drawer's Details tab, drawn from the active question.
  // MUST be declared before any conditional early returns below to keep hook order stable.
  const drawerMeta = React.useMemo<DrillDetailsMeta | null>(() => {
    if (!currentQuestion) return null;
    return {
      pt: currentQuestion.pt,
      section: currentQuestion.section,
      qnum: currentQuestion.qnum,
      qtype: currentQuestion.qtype,
      reasoningType: currentQuestion.reasoningType,
      questionFeatures: currentQuestion.questionFeatures,
      difficulty: currentQuestion.difficulty,
    };
  }, [currentQuestion]);

  // ── Authored explanation for the active question ─────────────────────────
  // Declared here, above every conditional early return, so hook order stays
  // stable. One fetch feeds both surfaces: the drawer tab and the inline layer.
  const currentRevealed =
    !!currentQuestion &&
    (!!showAnswerRevealed.get(currentQuestion.qid) ||
      // Section mode's opt-in toggle: once on, an answered question reveals.
      (!revealSealed &&
        sectionRevealEnabled &&
        !!session?.attempts?.get(currentQuestion.qid)?.selectedAnswer));

  // Explanation is its own switch in the review-controls modes; elsewhere it
  // is the drawer's Explanation tab riding on the reveal, as before.
  const explanationOpen = reviewControlsAvailable
    ? !!currentQuestion && !!explanationOpenByQid.get(currentQuestion.qid)
    : notesOpen && drawerTab === 'explanation';

  const {
    data: lrExplanation,
    isLoading: lrExplanationLoading,
    isError: lrExplanationError,
  } = useLrExplanation(
    {
      pt: currentQuestion?.pt,
      section: currentQuestion?.section,
      questionNumber: currentQuestion?.qnum,
    },
    reviewControlsAvailable ? explanationOpen : currentRevealed,
  );

  // The breakdown expander closes with every new question.
  React.useEffect(() => {
    setBreakdownOpen(false);
  }, [currentQuestion?.qid]);

  // A style chosen on the previous question must not leak onto one that does
  // not publish it.
  React.useEffect(() => {
    setActiveStyle(null);
  }, [currentQuestion?.qid]);

  const currentStyle = React.useMemo(() => {
    const styles = lrExplanation?.styles ?? [];
    return styles.find((s) => s.style === activeStyle) ?? styles[0] ?? null;
  }, [lrExplanation, activeStyle]);

  // Per-letter inline content. Tags and percentages are real source data and
  // survive even on questions with no prose; a letter with no note simply has
  // none, and the inline layer renders that absence rather than a placeholder.
  const inlineNotes = React.useMemo<InlineChoiceNotes | null>(() => {
    if (!lrExplanation) return null;
    const map: InlineChoiceNotes = {};
    for (const choice of lrExplanation.choices) {
      map[choice.letter] = {
        tag: choice.tag,
        studentPercent: choice.studentPercent,
        note: currentStyle?.notesByLetter[choice.letter] ?? null,
      };
    }
    return map;
  }, [lrExplanation, currentStyle]);



  // Handle session completion and post-section flow
  // Show post-section screens (must be BEFORE the session/currentQuestion check)
  if (postSectionScreen === 'predict' && session) {
    return (
      <ScorePrediction
        total={session.questionQueue.length}
        onPredict={(score) => {
          setPredictedScore(score);
          setPostSectionScreen(assignmentId ? 'review' : 'complete');
        }}
        onSkip={() => setPostSectionScreen(assignmentId ? 'review' : 'complete')}
      />
    );
  }

  if (postSectionScreen === 'complete') {
    return (
      <SectionComplete
        onBlindReview={() => setPostSectionScreen('review')}
        onSeeResults={() => setPostSectionScreen('score-report')}
        score={
          session
            ? [...session.attempts.values()].filter((a) => a.correct).length
            : undefined
        }
        total={session?.questionQueue.length}
      />
    );
  }
  
  if (postSectionScreen === 'review' && session) {
    return (
      <EnhancedBlindReview
        session={session}
        // The pass is the whole section and it carries no marks. Blind review
        // runs before the score, so anything drawn from correctness announces
        // which ones they missed, which is the one thing it must not do.
        reviewQids={brPassQids ?? session.questionQueue}
        onComplete={async (results: DrillBlindReviewResult[]) => {
          setBrResults(results);
          setPostSectionScreen('score-report');
          await saveBRResults(session, results);
        }}
        onBack={() => setPostSectionScreen('complete')}
      />
    );
  }
  
  // Reading a finished section back, read-only. Distinct from 'review', which
  // is the blind review: that one takes answers and scores them, this one takes
  // nothing and writes nothing.
  if (postSectionScreen === 'review-walk' && session) {
    return (
      <SectionReviewWalk
        session={session}
        brResults={brResults}
        onBack={() => setPostSectionScreen('score-report')}
      />
    );
  }

  if (postSectionScreen === 'score-report' && session) {
    // Use PracticeSetResults for practice-set mode
    if (isPracticeSetMode) {
      return (
        <PracticeSetResults
          session={session}
          onReviewWrong={() => {
            const wrongQids = session.questionQueue.filter(qid => {
              const attempt = session.attempts.get(qid);
              return attempt && !attempt.correct;
            });
            // Named a shortlist, so it stays one.
            setBrPassQids(wrongQids);
            setPostSectionScreen('review');
          }}
          onReviewAll={() => {
            setBrPassQids(null);
            setPostSectionScreen('review');
          }}
          onBack={() => navigate(drillReturnTo || '/classroom')}
        />
      );
    }

    // Use new LR Section Results for full-section mode
    if (session.mode === 'full-section') {
      return (
        <LRSectionResults
          session={session}
          brResults={brResults}
          classId={classId}
          onReviewSection={() => setPostSectionScreen('review-walk')}
          onBack={() => navigate(drillReturnTo || '/classroom')}
          backLabel={
            isSittingReturn(drillReturnTo)
              ? 'Back to your practice test'
              : 'Back to Home'
          }
          predictedScore={predictedScore}
        />
      );
    }

    // Fall back to old ScoreReport for other modes
    return (
      <ScoreReport
        session={session}
        onStartReview={() => setPostSectionScreen('review')}
        onFullReview={() => {
          setBrPassQids(null);
          setPostSectionScreen('review');
        }}
        onBack={() => navigate(drillReturnTo || '/classroom')}
      />
    );
  }

  if (handoffLost) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-3">Practice test moved to another device</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This device has stopped saving answers. Continue the test on the device now using it.
          </p>
          <Button onClick={() => navigate('/testing')}>Practice Exams</Button>
        </Card>
      </div>
    );
  }

  // Adaptive: currentQuestion null while session exists = hydration/selection
  // chain still loading. Keep this truthful instead of showing a blank page.
  if (session?.mode === 'adaptive' && !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Preparing Smart Drill…</h2>
          <p className="text-sm text-muted-foreground">
            {adaptiveHydrationStatus === 'loading' || adaptiveHydrationStatus === 'idle'
              ? 'Loading your attempt history.'
              : 'Selecting your next question.'}
          </p>
        </Card>
      </div>
    );
  }

  // Initial loading — class id, question bank, or session not yet ready.
  // Must come BEFORE the "session ended" branch so we don't render
  // "Session Complete" while we're actually still booting.
  if (!session && !bootError && (classIdLoading || qbLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-2">Preparing your drill…</h2>
          <p className="text-sm text-muted-foreground">Loading question bank.</p>
        </Card>
      </div>
    );
  }

  // Initialization failed truthfully (pool exhausted, empty bank, etc.) —
  // show a real message instead of the misleading completion card.
  if (!session && bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-3">{bootLoadFailed ? 'Your drill is paused' : 'No questions available'}</h2>
          <p className="text-sm text-muted-foreground mb-6">{bootError}</p>
          {bootLoadFailed && <Button className="mb-3" onClick={() => window.location.reload()}>Retry loading drill</Button>}
          <Button onClick={() => navigate(drillReturnTo || '/classroom')}>
            Return to {returnTo === '/flagged' ? 'Flagged' : 'your classroom'}
          </Button>
        </Card>
      </div>
    );
  }

  // Handle session completion with BR (old flow)
  if (!session || !currentQuestion) {
    // Check if we should show BR selection
    if (session && brEnabled && brMarked.size > 0 && !showBRSelection && !showBRFlow) {
      setShowBRSelection(true);
    }

    // Show BR Selection screen
    if (showBRSelection) {
      return (
        <BlindReviewSelection
          session={{
            ...session!,
            attempts: new Map(
              Array.from(session!.attempts.entries()).map(([qid, attempt]) => [
                qid,
                { ...attempt, brMarked: brMarked.has(qid) }
              ])
            )
          }}
          onStartBlindReview={(selectedQids) => {
            setBrSelectedQids(selectedQids);
            setShowBRSelection(false);
            setShowBRFlow(true);
          }}
          onSkip={() => {
            navigate(drillReturnTo || '/classroom');
          }}
        />
      );
    }

    // Show BR Flow — on completion, route to the unified score-report
    // surface (LRSectionResults for full-section, ScoreReport otherwise).
    if (showBRFlow) {
      return (
        <BlindReviewFlow
          session={session!}
          selectedQids={brSelectedQids}
          onComplete={async (results: LegacyBlindReviewResult[]) => {
            const enrichedResults: DrillBlindReviewResult[] = results.map((result) => ({
              ...result,
              preCorrect: session!.attempts.get(result.qid)?.correct ?? false,
              // The legacy flow only ever ran questions the student chose, so
              // every result it returns is one they actually re-answered.
              brTouched: true,
            }));
            setBrResults(enrichedResults);
            setShowBRFlow(false);
            setPostSectionScreen('score-report');
            await saveBRResults(session!, enrichedResults);
          }}
        />
      );
    }

    // Regular session complete screen
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Session Complete</h2>
          <p className="text-muted-foreground mb-6">
            {session ? (
              <>
                You answered {session.attempts.size} questions.
                <br />
                Correct: {Array.from(session.attempts.values()).filter(a => a.correct).length} / {session.attempts.size}
              </>
            ) : (
              // Defensive: should be unreachable after the loading and
              // bootError guards above. If we still hit this, send the
              // user back to the hub rather than trapping them.
              'Returning to hub…'
            )}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => navigate(drillReturnTo || '/classroom')}>
              Return to {returnTo === '/flagged' ? 'Flagged' : 'your classroom'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Helper function to save BR results
  const saveBRResults = async (session: DrillSession, results: DrillBlindReviewResult[]) => {
    if (!user) return;

    try {
      const sessionId = crypto.randomUUID();

      // Calculate summary stats
      const correctedCount = results.filter(r => !session.attempts.get(r.qid)?.correct && r.correct).length;
      const stuckCount = results.filter(r => !session.attempts.get(r.qid)?.correct && !r.correct).length;
      const regretCount = results.filter(r => session.attempts.get(r.qid)?.correct && !r.correct).length;
      const confirmedCount = results.filter(r => session.attempts.get(r.qid)?.correct && r.correct).length;
      
      const times = results.map(r => r.brTimeMs).sort((a, b) => a - b);
      const medianTimeMs = times.length > 0 ? times[Math.floor(times.length / 2)] : 0;

      // Save BR session
      if (!classId) {
        console.error('Cannot save BR results: missing class_id');
        toast.error('Session error: missing class ID.');
        return;
      }
      const { error: brSessionError } = await supabase.from('blind_review_sessions').insert({
        class_id: classId,
        session_id: sessionId,
        br_items_count: results.length,
        br_corrected_count: correctedCount,
        br_stuck_count: stuckCount,
        br_regret_count: regretCount,
        br_confirmed_count: confirmedCount,
        br_median_time_ms: medianTimeMs,
      });
      if (brSessionError) throw brSessionError;

      // Update attempts with BR data. Build every row first, then insert in a
      // single round-trip (was one INSERT per question, i.e. an N-query loop).
      const attemptRows = results.flatMap((result) => {
        const previousAttempt = session.attempts.get(result.qid);
        const preCorrect = previousAttempt?.correct || false;

        let brDelta: string;
        if (!preCorrect && result.correct) brDelta = 'corrected';
        else if (!preCorrect && !result.correct) brDelta = 'stuck';
        else if (preCorrect && !result.correct) brDelta = 'regret';
        else brDelta = 'confirmed';

        const question = questionBank.getQuestion(result.qid);
        if (!question) return [];

        return [{
          user_id: user.id,
          class_id: classId,
          qid: result.qid,
          pt: question.pt,
          section: question.section,
          qnum: question.qnum,
          qtype: question.qtype,
          level: question.difficulty,
          correct: result.correct,
          time_ms: result.brTimeMs,
          mode: session.mode,
          br_marked: brMarked.has(result.qid),
          pre_answer: result.preAnswer,
          br_selected: true,
          br_answer: result.brAnswer,
          br_rationale: result.brRationale,
          br_time_ms: result.brTimeMs,
          br_changed: result.brChanged,
          br_outcome: result.correct ? 'correct' : 'incorrect',
          br_delta: brDelta,
        }];
      });

      if (attemptRows.length > 0) {
        const { error: attemptError } = await supabase.from('attempts').insert(attemptRows);
        if (attemptError) throw attemptError;
      }
    } catch (error) {
      toast.error('Failed to save blind review results. Please try again.');
      console.error('Error saving BR results:', error);
    }
  };

  const progress = session.mode !== 'adaptive'
    ? (session.currentIndex / session.questionQueue.length) * 100
    : undefined;

  const isAnswered = session.attempts.has(currentQuestion.qid);
  const previousAttempt = session.attempts.get(currentQuestion.qid);

  // Helper function to get answer groups split by selected answer
  const getAnswerGroups = () => {
    const answerEntries = Object.entries(currentQuestion.answerChoices);
    const selectedIndex = answerEntries.findIndex(([key]) => key === selectedAnswer);
    
    // Guard against invalid selectedIndex
    if (selectedIndex === -1) {
      console.warn('Selected answer not found in answer choices', { selectedAnswer, qid: currentQuestion.qid });
      return {
        before: [],
        selected: answerEntries[0] || ['A', ''], // Fallback to first answer
        after: answerEntries.slice(1),
      };
    }
    
    return {
      before: answerEntries.slice(0, selectedIndex),
      selected: answerEntries[selectedIndex],
      after: answerEntries.slice(selectedIndex + 1),
    };
  };

  // Helper function to render a single answer choice
  const renderAnswerChoice = (
    key: string, 
    text: string, 
    options: {
      isSelected?: boolean;
      showRadio?: boolean;
      inFocusedMode?: boolean;
      isLast?: boolean;
    } = {}
  ) => {
    const { isSelected = false, showRadio = true, inFocusedMode = false } = options;
    const isCorrect = key === currentQuestion.correctAnswer;
    const isWrong = key === selectedAnswer && !isCorrect;
    // Hide feedback during section mode
    const showFeedback = session?.mode !== 'full-section' && isSelected && (
      tutorMode ? answerLocked : showSolution
    );
    // Show green highlight when solution is revealed and this is the correct answer
    const showGreenHighlight = showSolution && isCorrect;

    const isSectionMode = session?.mode === 'full-section';
    const isEliminated = eliminatedAnswers.has(key);
    
    return (
      <div
        key={key}
        className={cn(
          "group relative flex items-start gap-3 py-3.5 px-4 -mx-4 rounded-lg",
          "transition-all duration-[120ms] ease-out",
          isEliminated && "opacity-55",
          showGreenHighlight && "bg-green-50 border-l-4 border-l-green-500"
        )}
      >
        {/* Radio or selected indicator */}
        <div 
          onClick={() => !isEliminated && handleAnswerSelect(key)}
          className={cn(
            "flex items-center h-6 mt-0.5 shrink-0 cursor-pointer",
            isSectionMode && !isEliminated && "hover:opacity-70"
          )}
        >
          {inFocusedMode && isSelected ? (
            <div className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center ring-1 ring-neutral-300">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          ) : showRadio ? (
            <RadioGroupItem value={key} id={`answer-${key}`} className="mt-0 pointer-events-none border-neutral-400 text-neutral-900" />
          ) : (
            <div className="w-5 h-5" />
          )}
        </div>
        
        {/* Answer text - clickable for selection with long-press support */}
        <div 
          onClick={() => !isEliminated && handleAnswerSelect(key)}
          onMouseDown={() => isSectionMode && handleLongPressStart(key)}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
          onTouchStart={() => isSectionMode && handleLongPressStart(key)}
          onTouchEnd={handleLongPressEnd}
          onTouchCancel={handleLongPressEnd}
          className={cn(
            "flex items-start gap-3 flex-1 min-w-0 cursor-pointer touch-manipulation",
            // Section mode styles
            isSectionMode && !isEliminated && "hover:opacity-70 active:opacity-50",
            isSectionMode && isSelected && !isEliminated && "opacity-100"
          )}
        >
          <Label
            htmlFor={`answer-${key}`}
            className={cn(
              "flex-1 cursor-pointer",
              "text-[19px] leading-[1.7]",
              "font-normal text-neutral-900",
              "select-none",
              "transition-all duration-[120ms]",
              isEliminated && "line-through decoration-2 decoration-muted-foreground"
            )}
          >
            <span className="font-semibold mr-3 text-neutral-700">({key})</span>
            <span>{text}</span>
            {!isSectionMode && showFeedback && (
              <Badge
                variant={isCorrect ? 'default' : 'destructive'}
                className="ml-2"
              >
                {isCorrect ? 'Correct' : 'Wrong'}
              </Badge>
            )}
          </Label>
        </div>
        
        {/* × elimination toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEliminateAnswer(key);
          }}
          className={cn(
            "shrink-0 flex items-center justify-center",
            "w-11 h-11 -my-3 -mr-3",
            "rounded-md transition-all duration-[120ms]",
            "hover:bg-neutral-100 active:scale-95",
            "text-neutral-400 hover:text-neutral-900"
          )}
          aria-pressed={isEliminated}
          aria-label={`Cross out choice ${key}`}
          title={isEliminated ? `Restore choice ${key}` : `Cross out choice ${key}`}
        >
          <X 
            className={cn(
              "w-5 h-5 transition-all duration-[120ms]"
            )} 
          />
        </button>
      </div>
    );
  };

  // Floating AI tutor overlay (launcher + chat card). Rendered at page root so
  // its fixed positioning isn't clipped. Shared by BOTH the official testing
  // layout and the legacy DrillTopBar layout — without this the tutor state
  // flips but nothing mounts on the official surface.
  // Open the tutor for the current question. Mode is derived from state:
  // preview (structural breakdown) before a pick, socratic after a pick,
  // post-answer once revealed. Wired to the "Explanation" button beside End.
  const openTutorForCurrent = (tab?: 'coach' | 'breakdown' | 'notes') => {
    if (!AI_TUTOR_ENABLED || !currentQuestion) return;
    setTutorQuestionSnapshot(currentQuestion);
    setTutorUserAnswerSnapshot(selectedAnswer || '');
    setTutorChatMode(resolveTutorMode({
      userAnswer: selectedAnswer,
      answerRevealed: !!showAnswerRevealed.get(currentQuestion.qid),
    }));
    setTutorInitialTab(tab);
    setTutorChatOpen(true);
  };

  // Reveal the correct answer in place, without opening any panel. Used by the
  // Answer and Explanation pills (see handleRevealRequest below).
  const revealAnswerForCurrent = () => {
    if (!currentQuestion) return;
    setShowAnswerRevealed(prev => new Map(prev).set(currentQuestion.qid, true));
  };

  // Revealing is a toggle, not a one-way door. Pressing Answer or Explanation
  // again puts the question back the way it was: correct letter hidden, the
  // per-choice explanations collapsed, the choices live again. Teaching off a
  // built set needs exactly this — showing the answer used to spend the
  // question for good.
  //
  // Only the view is undone. An attempt already written keeps
  // `answerRevealed: true`, because that record is what happened, not what is
  // currently on screen.
  const hideAnswerForCurrent = () => {
    if (!currentQuestion) return;
    const qid = currentQuestion.qid;
    setShowAnswerRevealed(prev => {
      if (!prev.has(qid)) return prev;
      const next = new Map(prev);
      next.delete(qid);
      return next;
    });
    // The peek is forgiven along with the reveal: `unscoredQids` only gates
    // this runner's chrome, so leaving it set would strand the question on
    // Next with no way back to Submit.
    setUnscoredQids(prev => {
      if (!prev.has(qid)) return prev;
      const next = new Set(prev);
      next.delete(qid);
      return next;
    });
    setShowSolution(false);
    if (!session?.attempts.get(qid)?.selectedAnswer) setAnswerLocked(false);
  };

  // The runner has exactly one panel now. Menu, Explanation, and Notes all
  // open it, each on its own tab — there are no separate sheets left.
  //
  // Each control toggles its own tab: pressing it while the drawer already
  // shows that tab closes the drawer. Pressing it while another tab is up
  // switches to this one rather than closing, so no control reads as dead.
  const toggleDrawerOn = (tab: DrawerTab) => {
    if (notesOpen && drawerTab === tab) {
      setNotesOpen(false);
      return;
    }
    setDrawerTab(tab);
    setNotesOpen(true);
  };

  /** Open, never close — the reveal path needs the drawer up, not flipped. */
  const openDrawerOn = (tab: DrawerTab) => {
    setDrawerTab(tab);
    setNotesOpen(true);
  };

  // The drill toolbar's Notes control opens the docked drawer on the Notes tab.
  const toggleNotesPanel = () => toggleDrawerOn('notes');

  // Jump to another question of the same type. Same route the library uses.
  const jumpToQuestion = (qid: string) => {
    navigate(
      `/drill?mode=type-drill&qids=${encodeURIComponent(qid)}&present=smart&returnTo=${encodeURIComponent('/classroom/drill')}`,
    );
  };

  // Answer, pressed before an attempt, is the escape hatch: it reveals
  // everything at once and gives up the score for that question. Pressed after
  // an attempt there is nothing to give up, so it just reveals.
  const handleRevealRequest = (
    attempted: boolean,
    intent: 'answer' | 'explanation' = 'answer',
  ) => {
    if (attempted) {
      revealAnswerForCurrent();
      if (intent === 'explanation') openDrawerOn('explanation');
      return;
    }
    setPendingRevealIntent(intent);
    setRevealConfirmOpen(true);
  };

  const confirmUnscoredReveal = () => {
    if (currentQuestion) {
      setUnscoredQids((prev) => new Set(prev).add(currentQuestion.qid));
    }
    revealAnswerForCurrent();
    if (pendingRevealIntent === 'explanation') openDrawerOn('explanation');
    setRevealConfirmOpen(false);
  };

  // Answer and Explanation are the same switch with different reach. Answer
  // flips the reveal in place; Explanation flips it and takes the drawer with
  // it, so one press gives the whole breakdown and the next press clears the
  // screen back to an untouched question.
  const toggleAnswerReveal = (attempted: boolean, revealed: boolean) => {
    if (revealed) {
      hideAnswerForCurrent();
      return;
    }
    handleRevealRequest(attempted, 'answer');
  };

  const toggleExplanation = (
    attempted: boolean,
    revealed: boolean,
    explanationOpen: boolean,
  ) => {
    if (explanationOpen) {
      setNotesOpen(false);
      if (revealed) hideAnswerForCurrent();
      return;
    }
    if (revealed) {
      openDrawerOn('explanation');
      return;
    }
    handleRevealRequest(attempted, 'explanation');
  };

  // ── Review controls (LSAT Lab shape) ─────────────────────────────────────
  // Answer and Explanation are independent on/off toggles. Neither asks,
  // neither commits a pick, neither touches the drawer, neither locks a
  // choice. The one thing a reveal changes about the record is
  // `answerRevealed`: the answer was on screen, so any pick after this is
  // recorded as made after seeing it. Smart Drill additionally marks the
  // question unscored, silently, so a Submit can never score a revealed
  // question.
  const markAnswerSeen = (qid: string) => {
    answerSeenQidsRef.current.add(qid);
    setSession(prev => {
      if (!prev) return prev;
      const existing = prev.attempts.get(qid);
      if (!existing || existing.answerRevealed) return prev;
      const attempts = new Map(prev.attempts);
      attempts.set(qid, { ...existing, answerRevealed: true });
      return { ...prev, attempts };
    });
    if (reviewPolicy === 'adaptive' && !session?.attempts.get(qid)?.selectedAnswer) {
      setUnscoredQids(prev => (prev.has(qid) ? prev : new Set(prev).add(qid)));
    }
  };

  const toggleAnswerPill = () => {
    if (!currentQuestion) return;
    const qid = currentQuestion.qid;
    if (showAnswerRevealed.get(qid)) {
      setShowAnswerRevealed(prev => {
        const next = new Map(prev);
        next.delete(qid);
        return next;
      });
      return;
    }
    setShowAnswerRevealed(prev => new Map(prev).set(qid, true));
    markAnswerSeen(qid);
  };

  const toggleExplanationPill = () => {
    if (!currentQuestion) return;
    const qid = currentQuestion.qid;
    const wasOpen = !!explanationOpenByQid.get(qid);
    setExplanationOpenByQid(prev => new Map(prev).set(qid, !wasOpen));
    if (wasOpen) return;
    setBreakdownOpen(false);
    markAnswerSeen(qid);
  };

  // Reset Response: the existing un-pick path. Clears the pick and, in the
  // list model, the attempt entry; touches nothing else.
  const handleResetResponse = () => {
    if (!selectedAnswer) return;
    handleAnswerSelect(selectedAnswer);
  };




  const renderTutorOverlay = () => (
    <>
      {/* Floating Tutor Card — fixed bottom-left, rendered at page root so fixed positioning isn't clipped */}
      {AI_TUTOR_ENABLED && tutorChatOpen && tutorQuestionSnapshot && (
        <ErrorBoundary
          onReset={() => {
            setTutorChatOpen(false);
            setTutorQuestionSnapshot(null);
            setTutorUserAnswerSnapshot('');
            setTutorChatMode('pre-answer');
            setAnswerLocked(false);
          }}
        >
          <TutorChatModal
            open={tutorChatOpen}
            question={tutorQuestionSnapshot}
            userAnswer={tutorUserAnswerSnapshot}
            mode={tutorChatMode}
            initialTab={tutorInitialTab}
            sessionId={session?.sessionId}
            tutorContext={{
              eliminatedAnswers: Array.from(eliminatedByQid.get(tutorQuestionSnapshot.qid) ?? []),
              timeMs: Math.max(0, Math.floor(performance.now() - questionStartTime)),
              flagged: isFlagged,
              answerRevealed: !!showAnswerRevealed.get(tutorQuestionSnapshot.qid),
            }}
            onNext={() => {
              setTutorChatOpen(false);
              setTutorQuestionSnapshot(null);
              setTutorUserAnswerSnapshot('');
              setTutorChatMode('pre-answer');
              setAnswerLocked(false);
              const next = isPracticeSetMode ? handlePracticeSetNext : handleNext;
              next();
            }}
            onClose={() => {
              setTutorChatOpen(false);
              setTutorQuestionSnapshot(null);
              setTutorUserAnswerSnapshot('');
              setTutorChatMode('pre-answer');
              setAnswerLocked(false);
            }}
          />
        </ErrorBoundary>
      )}

    </>
  );

  // Voice coach: the "Explain your reasoning" chip only makes sense once the
  // answer is revealed (non-adaptive: showSolution; adaptive Smart Drill:
  // showAnswerRevealed for this qid). Shared across both layouts so the chip
  // and its modal are reachable in the official layout too, not just classic.
  const voiceCoachRevealed =
    !!currentQuestion && (showSolution || !!showAnswerRevealed.get(currentQuestion.qid));

  const renderVoiceCoachChip = () =>
    AI_TUTOR_ENABLED && voiceCoachRevealed && !voiceCoachOpen && !tutorChatOpen ? (
      <div className="mt-6 flex justify-center">
        <VoiceCoachChip onActivate={() => setVoiceCoachOpen(true)} />
      </div>
    ) : null;

  const renderVoiceCoachModal = () => (
    <VoiceCoachModal
      open={voiceCoachOpen}
      question={currentQuestion}
      selectedAnswer={selectedAnswer}
      onTryAgain={() => {
        // For adaptive mode: close and allow retry
        setVoiceCoachOpen(false);
      }}
      onMicroDrill={(questions) => {
        if (!currentQuestion) return;
        // Navigate to micro-drill with the 2 generated questions
        navigate('/drill', {
          state: {
            mode: 'type-drill',
            config: {
              qtypes: [currentQuestion.qtype],
              difficulties: [currentQuestion.difficulty],
              pts: questions.map(q => q.pt),
              count: 2
            }
          }
        });
      }}
      onSaveToJournal={() => {
        // Open WAJ modal
        setVoiceCoachOpen(false);
        setWajModalOpen(true);
      }}
      onClose={() => setVoiceCoachOpen(false)}
      showContrast={settings.showContrast}
    />
  );

  // ── Official testing-format layout ─────────────────────────────────────
  // The default for every drill mode (`isOfficialLayout`, read with the review
  // policy above). Reuses every existing handler so the attempt save / WAJ /
  // blind review / section-complete flow is identical to the classic layout.
  if (isOfficialLayout && session && currentQuestion) {
    const isFullSection = session.mode === 'full-section';
    const isAdaptiveMode = session.mode === 'adaptive';
    const isGuidedDrillRunner =
      !isMcPractice &&
      (!!guidedAssignmentId || !!state.isGuidedDrill || (!!returnTo && returnTo.startsWith('/guided')));
    // Student-facing LSAT question screens share the same action chrome: notes,
    // End/Explanation/Skip/Submit footer, and no top "Complete Section" pill.
    // Question semantics still follow `mode`; this flag only changes the chrome.
    const usesSmartChrome = true;
    const sectionTimer = session.fullSectionConfig?.timer;
    let totalMs: number | undefined;
    if (sectionTimer) {
      switch (sectionTimer.mode) {
        case '35': totalMs = 35 * 60 * 1000; break;
        case '52.5': totalMs = 52.5 * 60 * 1000; break;
        case '70': totalMs = 70 * 60 * 1000; break;
        case 'custom':
          totalMs = sectionTimer.customMinutes ? sectionTimer.customMinutes * 60 * 1000 : undefined;
          break;
        case 'unlimited': totalMs = undefined; break;
      }
    }
    // Fraction still left on the clock, for the depleting bar under the timer.
    // Only a countdown against a known budget has one; a stopwatch or an
    // unlimited section leaves it undefined and the bar does not render.
    // Past the buzzer the clock reads as time owed, not time left: "+2:14" is
    // the honest label for a section that ran over, and 0:00 forever is not.
    const overtimeLabel =
      overtimeState === 'running' && timer
        ? `+${Math.floor(timer.overtimeMs / 60000)}:${Math.floor((timer.overtimeMs % 60000) / 1000)
            .toString()
            .padStart(2, '0')}`
        : null;
    const timerProgress =
      timer?.mode === 'countdown' && totalMs
        ? Math.max(0, Math.min(1, timer.ms / totalMs))
        : undefined;
    const attemptedQids = new Set<string>();
    for (const [qid, attempt] of session.attempts) {
      if (attempt.selectedAnswer) attemptedQids.add(qid);
    }
    // Fixed-queue navigation. A real section lets the student move anywhere in
    // the queue at any time, which is what the oval strip is for. Jumping is
    // frozen while the timer is paused so the paused screen is not a peephole.
    const jumpEnabled = !timer?.isPaused;
    const handleJumpTo = async (idx: number, attempts?: DrillSession['attempts']) => {
      if (!session) return;
      if (session.mode === 'full-section') {
        await moveTimedSection(idx, attempts);
        return;
      }
      if (isPracticeSetMode) questionTimer.current.pause();
      const nextSession = { ...session, attempts: attempts ?? session.attempts, currentIndex: idx };
      if ((standaloneSourceKey || guidedSessionKey) && nextSession.attempts.size > 0) {
        try {
          await persistOwnedDrillSession(nextSession);
        } catch (error) {
          toast.error("Your place has not saved to your account. Retry this question.");
          return;
        }
      }
      setSession(nextSession);
    };
    const handleTogglePauseClick = timer
      ? () => {
          if (sectionSaveError) return;
          if (timer.isPaused) {
            timer.resume();
            return;
          }
          if ((isFullSection || inSitting) && !pauseNoticeMutedRef.current) {
            setPauseNoticeOpen(true);
            return;
          }
          timer.pause();
        }
      : undefined;
    const currentAttempted = attemptedQids.has(currentQuestion.qid);
    // Revealed before attempting: the answer is already on screen, so this
    // question is not scored and the primary action becomes Next.
    const currentUnscored = unscoredQids.has(currentQuestion.qid);
    const drawerExplanation: DrillExplanationContext = {
      data: lrExplanation,
      isLoading: lrExplanationLoading,
      isError: lrExplanationError,
      // Read-only on the Explanation state: the tab shows the content while
      // the pill is on and a placeholder otherwise. Selecting it never turns
      // Explanation on.
      revealed: reviewControlsAvailable ? explanationOpen : currentRevealed,
      explanationPill: reviewControlsAvailable,
      sealed: revealSealed,
      activeStyle,
      onStyleChange: setActiveStyle,
      onAskTutor: AI_TUTOR_ENABLED ? () => openTutorForCurrent() : undefined,
    };
    // Find similar walks the student out of the queue they are sitting. That is
    // fine in a drill and wrong in a section or a practice test: the timer is
    // running on THIS queue, and jumping to another question mid-section is an
    // escape hatch, not a study tool. Null hides the whole block there.
    const drawerSimilar: DrillSimilarContext | null =
      isFullSection || inSitting || isPracticeSetMode
        ? null
        : {
            qid: currentQuestion.qid,
            qtype: currentQuestion.qtype,
            onJumpToQuestion: jumpToQuestion,
          };
    const requiresAnswerBeforeNext = !isFullSection && !isPracticeSetMode;
    const officialNextDisabled =
      !!timer?.isPaused ||
      (requiresAnswerBeforeNext &&
        !selectedAnswer &&
        !currentAttempted &&
        !currentUnscored);
    const officialPrev = isPracticeSetMode
      ? handlePracticeSetPrevious
      : () => { void handlePrevious(); };
    // Walking a built set is free movement in both directions, so an answer
    // sitting on screen uncommitted is saved on the way out rather than
    // silently dropped when the question changes. Returns a discriminated
    // result on every path: `ok` with the attempts to carry forward (persisted,
    // or nothing to persist), or `ok: false` when the save failed.
    const commitPendingSelection = async (): Promise<
      { ok: true; attempts: DrillSession['attempts'] | null } | { ok: false }
    > => {
      if (isAdaptiveMode && selectedAnswer && !currentAttempted && !currentUnscored) {
        toast.error('Submit this answer before ending Smart Drill.');
        return { ok: false };
      }
      if (isAdaptiveMode || !selectedAnswer || currentAttempted || currentUnscored) {
        return { ok: true, attempts: null };
      }
      const attempts = await handleSubmitNonAdaptive(selectedAnswer);
      if (!attempts) {
        reportCommitFailure({
          qid: currentQuestion.qid,
          launchKind: state.launchKind,
          transition: 'commitPendingSelection',
          errorKind: 'unknown',
          deduped: false,
        });
        return { ok: false };
      }
      return { ok: true, attempts };
    };
    const advanceInQueue = async (committed: DrillSession['attempts'] | null) => {
      if (isPracticeSetMode) {
        await handlePracticeSetNext();
      } else if (session.currentIndex >= session.questionQueue.length - 1) {
        if (session.mode !== 'full-section' || await moveTimedSection(session.currentIndex, committed ?? undefined)) {
          await handleFinishSection(committed ?? session.attempts);
        }
      } else {
        await handleNext(committed ?? undefined);
      }
    };
    // One wrapper for leaving a question on a fixed queue: arrows, ovals and
    // the last-question advance all commit first and move only on `ok`. The
    // lock is synchronous, so a second press while the first is saving is a
    // no-op rather than a second insert or a second move.
    const commitThenNavigate = async (
      destination: 'prev' | 'advance' | 'end' | { jumpTo: number },
    ) => {
      if (actionLockRef.current) return;
      actionLockRef.current = true;
      setActionInFlight(true);
      try {
        const result = await commitPendingSelection();
        if (!result.ok) return;
        if (destination === 'prev') {
          if (isPracticeSetMode) await handlePracticeSetPrevious();
          else await handlePrevious(result.attempts ?? undefined);
        }
        else if (destination === 'advance') await advanceInQueue(result.attempts);
        else if (destination === 'end') {
          if (guidedSessionKey && (result.attempts ?? session.attempts).size === 0) {
            navigate(guidedAwareReturnTo || '/classroom/drill');
            return;
          }
          if (session.mode !== 'full-section' || await moveTimedSection(session.currentIndex, result.attempts ?? undefined)) {
            await handleFinishSection(result.attempts ?? session.attempts);
          }
        } else await handleJumpTo(destination.jumpTo, result.attempts ?? undefined);
      } finally {
        actionLockRef.current = false;
        setActionInFlight(false);
      }
    };
    const officialNext = async () => {
      if (timer?.isPaused) return;
      let committedAttempts: DrillSession['attempts'] | null = null;
      // A question revealed before it was attempted is deliberately not
      // scored, so Next walks past it without committing anything.
      if (requiresAnswerBeforeNext && !currentAttempted && !currentUnscored) {
        if (!selectedAnswer) {
          toast.error('Select an answer before moving to the next question.');
          return;
        }
        if (isAdaptiveMode) {
          await commitCurrentAdaptiveAnswer({
            revealAfterSave: false,
            advanceAfterSave: true,
          });
          return;
        } else {
          committedAttempts = await handleSubmitNonAdaptive(selectedAnswer, { advanceAfterSubmit: true });
          // A failed save leaves the question in place with its pick.
          if (!committedAttempts) return;
        }
      }
      if (isPracticeSetMode) {
        handlePracticeSetNext();
      } else if (isAdaptiveMode) {
        setAdvanceToken(t => t + 1);
      } else if (!isAdaptiveMode && session.currentIndex >= session.questionQueue.length - 1) {
        await handleNext(committedAttempts ?? undefined);
      } else {
        await handleNext(committedAttempts ?? undefined);
      }
    };
    const displayNum = getDrillDisplayNumber({
      isMcPractice,
      qnum: currentQuestion.qnum,
      currentIndex: session.currentIndex,
    });
    const questionLabel = `Question ${displayNum}`;
    const sectionLabel = currentQuestion.section
      ? `Section ${currentQuestion.section}`
      : isFullSection
      ? 'Section'
      : 'Practice Drill';
    const mcPracticeTestLabel = currentQuestion.pt
      ? `Practice Test ${currentQuestion.pt}`
      : contextFocus;
    // The first crumb names the PrepTest whenever we know it. "Library" is only
    // a fallback for questions with no PT (custom/generated drills).
    const officialLeadLabel = officialLeadCrumbLabel({
      pt: currentQuestion.pt,
      returnTo,
      isGuidedDrillReturn,
    });
    const officialBreadcrumbs = origin === 'fallacy-flaw' ? [
      {
        label: contextLabel || 'Flaw Bootcamp',
        onClick: () => navigate(returnTo || '/bootcamp/fallacy-flaw')
      },
      {
        label: contextFocus || 'LSAT Questions',
        onClick: () => navigate(returnTo || '/bootcamp/fallacy-flaw')
      },
      {
        label: [
          currentQuestion.pt ? `PT${currentQuestion.pt}` : null,
          currentQuestion.section ? `Section ${currentQuestion.section}` : null,
          questionLabel
        ].filter(Boolean).join(' · ')
      }
    ] : isMcPractice ? [
      {
        label: 'Bootcamp',
        onClick: () => navigate(bootcampPracticeReturnTo),
      },
      ...(mcPracticeTestLabel
        ? [{
            label: mcPracticeTestLabel,
            onClick: () => navigate(bootcampPracticeReturnTo),
          }]
        : []),
      {
        label: [sectionLabel, questionLabel].filter(Boolean).join(' · ')
      },
    ] : returnTo ? [
      {
        label: officialLeadLabel,
        onClick: () => navigate(guidedDrillReturnTo)
      },
      {
        label: [sectionLabel, questionLabel].filter(Boolean).join(' · ')
      }
    ] : [
      // Lead with the practice test, not a generic "Library" crumb — the
      // student already knows where they are; what they want named is the PT.
      {
        label: officialLeadLabel,
        onClick: () => navigate('/classroom/drill'),
      },
      {
        label: [sectionLabel, questionLabel].filter(Boolean).join(' · ')
      },
    ];
    const handleEndBootcampPracticeDrill = async () => {
      if (isEndingBootcampPracticeDrill) return;
      setIsEndingBootcampPracticeDrill(true);
      try {
        await handleFinishSection(undefined, { returnToAfterFinish: bootcampPracticeReturnTo });
      } catch (err) {
        console.error('[drill:intro-to-lr-practice:end] finish failed', err);
        setIsEndingBootcampPracticeDrill(false);
      }
    };
    const officialIsPaused = (!!timer?.isPaused || sectionSaveError) && !isEndingBootcampPracticeDrill;

    return (
      <>
        <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{guidedSessionKey && session.attempts.size > 0 ? 'Finish guided drill?' : isAdaptiveMode && session.attempts.size > 0 ? 'Finish Smart Drill?' : 'Leave drill session?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {guidedSessionKey && session.attempts.size > 0
                  ? 'This sitting will move to Completed. You can review its saved answers afterward.'
                  : guidedSessionKey
                    ? 'No answers have been saved in this sitting.'
                  : isAdaptiveMode && session.attempts.size > 0
                  ? 'This sitting will move to Completed. You can review your saved answers afterward.'
                  : isAdaptiveMode
                    ? 'No answers have been saved in this sitting.'
                    : 'Are you sure you want to leave? Your progress in this session will be saved.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={actionInFlight}
                onClick={() => { void commitThenNavigate('end'); }}
              >
                {(isAdaptiveMode || guidedSessionKey) && session.attempts.size > 0 ? 'Finish drill' : 'Yes, leave'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={sectionSaveError}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Saving paused this section</AlertDialogTitle>
              <AlertDialogDescription>
                Your clock and questions are paused because this section did not save to your account.
                Your current choice remains on this page. Retry the account save to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button onClick={() => { void retrySectionSave(); }} disabled={retryingSectionSave}>
                {retryingSectionSave ? 'Trying to save…' : 'Retry save'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={pauseNoticeOpen} onOpenChange={setPauseNoticeOpen}>
          {/* LawHub's own notice, in LawHub's own dress: white card, plain
              sans, blue buttons. It sits over the official player, so it must
              look like part of it rather than part of the app's chrome. */}
          <AlertDialogContent className="max-w-2xl rounded-md border-0 bg-white p-6 text-center font-sans text-slate-900">
            <AlertDialogHeader className="items-center space-y-3">
              <AlertDialogTitle className="text-3xl font-semibold text-slate-800">Notice</AlertDialogTitle>
              <AlertDialogDescription className="text-lg leading-snug text-slate-800">
                Navigating to this page will pause the test. Note that pause
                functionality will not be available during the real exam.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-2 flex-row justify-center gap-2 sm:justify-center">
              <AlertDialogCancel className="m-0 rounded-md border-2 border-blue-300 bg-slate-500 px-6 text-base text-white hover:bg-slate-600 hover:text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-md bg-blue-600 px-6 text-base text-white hover:bg-blue-700"
                onClick={() => {
                  pauseNoticeMutedRef.current = pauseNoticeMuted;
                  setPauseNoticeOpen(false);
                  timer?.pause();
                }}
              >
                Ok
              </AlertDialogAction>
            </AlertDialogFooter>
            <label className="mt-1 flex items-center justify-center gap-2 text-base text-slate-800">
              <input
                type="checkbox"
                checked={pauseNoticeMuted}
                onChange={(e) => setPauseNoticeMuted(e.target.checked)}
              />
              Don't show me this message again
            </label>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit this section?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const unanswered = session.questionQueue.filter(
                    (qid) => !session.attempts.get(qid)?.selectedAnswer,
                  ).length;
                  const timeLeft =
                    timer?.mode === 'countdown' && timer.ms > 0 ? timer.label : null;
                  if (unanswered === 0 && !timeLeft) {
                    return 'This ends the section and scores it.';
                  }
                  return [
                    unanswered > 0
                      ? `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}`
                      : null,
                    timeLeft ? `${timeLeft} left on the clock` : null,
                  ]
                    .filter(Boolean)
                    .join(' and ') + '.';
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {/* Go back is the primary. Submitting early is the exception. */}
              <AlertDialogAction onClick={() => setSubmitConfirmOpen(false)}>
                Go back
              </AlertDialogAction>
              <AlertDialogCancel onClick={() => { void handleFinishSection(); }}>
                Submit anyway
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* The buzzer. Not dismissible: a section whose time is up has to be
            either scored or deliberately carried on, and clicking the backdrop
            is neither. */}
        <AlertDialog open={overtimeState === 'prompt'}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{assignmentId ? "Time's up." : 'Time.'}</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const total = session.questionQueue.length;
                  const answered = session.regulationMark?.answeredQids.length ?? 0;
                  const left = total - answered;
                  // An assigned section ends at the buzzer, as the test does.
                  // What was answered is what gets scored; blind review is next.
                  if (assignmentId) {
                    return left === 0
                      ? 'You answered every question inside the clock. Next comes blind review.'
                      : `You answered ${answered} of ${total}. The section is scored as you sat it. Next comes blind review.`;
                  }
                  return left === 0
                    ? 'Your section clock is up, and you answered every question inside it.'
                    : `Your section clock is up. You answered ${answered} of ${total}, with ${left} left. You can finish now and be scored on the section as you sat it, or keep working with the clock counting up — either way, the results show which questions you answered before time and which after.`;
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              {assignmentId ? (
                <AlertDialogAction
                  onClick={() => {
                    setOvertimeState('none');
                    void handleFinishSection();
                  }}
                >
                  Go to blind review
                </AlertDialogAction>
              ) : (
                <>
                  <AlertDialogCancel
                    onClick={() => {
                      setOvertimeState('none');
                      void handleFinishSection();
                    }}
                  >
                    Finish and score
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setOvertimeState('running');
                      timer?.resume();
                    }}
                  >
                    Keep working
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={revealConfirmOpen} onOpenChange={setRevealConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Show the answer?</AlertDialogTitle>
              <AlertDialogDescription>
                This reveals the answer and the question won't be scored.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmUnscoredReveal}>Show me</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <OfficialDrillFrame
          isPaused={officialIsPaused}
          onResume={sectionSaveError ? () => { void retrySectionSave(); } : timer?.resume}
          pauseNoun={isFullSection ? 'Section' : 'Question'}
          notesPanelEnabled={usesSmartChrome}
          notesPanelOpen={notesOpen}
          onNotesPanelClose={() => setNotesOpen(false)}
          notesPanelMeta={drawerMeta}
          notesPanelExplanation={drawerExplanation}
          notesPanelSimilar={drawerSimilar}
          notesPanelTab={drawerTab}
          onNotesPanelTabChange={setDrawerTab}
          tutorToggleVisible={false}
          tutorMode={tutorMode}
          onTutorModeChange={(next) => {
            setTutorMode(next);
            if (!next) {
              setTutorChatOpen(false);
            }
          }}
          header={<>
            {standaloneSourceKey && <p className="px-4 py-2 text-xs text-slate-600" role="note">{lrRunProvenanceLabel(legacyStandaloneResumeRef.current ? undefined : standaloneProvenance)}</p>}
            <OfficialSessionStrip
              breadcrumbs={officialBreadcrumbs}
              isPaused={officialIsPaused}
              onTogglePause={handleTogglePauseClick}
              pauseNoun={isFullSection ? 'Section' : 'Question'}
              completeLabel={isMcPractice ? 'End Drill' : undefined}
              onComplete={
                // A section's bottom bar is the navigator, which has no End —
                // so the way out of a section is this pill, as on LawHub. Every
                // other mode keeps its End in the bottom bar and hides this.
                isFullSection
                  ? () => setSubmitConfirmOpen(true)
                  : usesSmartChrome
                  ? undefined
                  : isMcPractice
                  ? () => { void handleEndBootcampPracticeDrill(); }
                  : () => handleFinishSection()
              }
              // Answer and Explanation live up here, not in the bottom bar.
              // The strip sits OUTSIDE the card that OfficialDrillFrame blurs
              // when paused, so both must fold in the paused check themselves.
              // A timed full section also keeps its old gate: revealing
              // mid-section is not an escape hatch there, it defeats the
              // exercise. (Adaptive mode never hits it — the two session modes
              // are mutually exclusive.)
              showAnswerVisible={!revealSealed}
              onShowAnswer={
                revealSealed
                  ? undefined
                  : reviewControlsAvailable
                  ? toggleAnswerPill
                  : () => toggleAnswerReveal(currentAttempted, currentRevealed)
              }
              showAnswerActive={currentRevealed}
              showAnswerDisabled={
                !!timer?.isPaused || actionInFlight || (isFullSection && !currentAttempted)
              }
              // Explanation no longer waits on a separate reveal press: it is
              // the one control that opens the whole breakdown — correct letter,
              // every choice's explanation inline, drawer up — and pressing it
              // again collapses all of it back to an untouched question. A timed
              // section keeps the old gate, where revealing early is not a study
              // move but an escape hatch.
              onExplanation={
                revealSealed
                  ? undefined
                  : reviewControlsAvailable
                  ? toggleExplanationPill
                  : () =>
                      toggleExplanation(currentAttempted, currentRevealed, explanationOpen)
              }
              explanationActive={explanationOpen}
              explanationDisabled={
                !!timer?.isPaused || actionInFlight || (isFullSection && !currentRevealed)
              }
              onOpenHelp={() => setHelpOpen(true)}
            />
          </>}
        >
          {isFullSection && directionsViewOpen ? (
            // LawHub does not pop the directions over the question; it turns
            // the page into the directions screen, clock still counting, with
            // Questions top-left and GO TO QUESTIONS underneath to come back.
            <SectionDirectionsView
              sectionNumber={session.fullSectionConfig?.section ?? 1}
              minutes={totalMs ? totalMs / 60000 : null}
              questionCount={session.questionQueue.length}
              directions={SECTION_DIRECTIONS.lr}
              timerLabel={overtimeLabel ?? timer?.label ?? ""}
              timerOverBudget={!!overtimeLabel}
              onBackToQuestions={() => setDirectionsViewOpen(false)}
            />
          ) : (
          <>
          <OfficialDrillToolbar
            highlightMode={highlightMode}
            setHighlightMode={setHighlightMode}
            timerLabel={overtimeLabel ?? timer?.label ?? ""}
            timerMode={timer?.mode}
            timerProgress={timerProgress}
            searchTerm={officialSearchTerm}
            setSearchTerm={setOfficialSearchTerm}
            fontScale={officialFontScale}
            setFontScale={setOfficialFontScale}
            notesButtonVisible={usesSmartChrome}
            notesOpen={notesOpen}
            onToggleNotes={toggleNotesPanel}
            onOpenDirections={isFullSection ? () => setDirectionsViewOpen(true) : undefined}
            studyTools={
              studyRef ? (
                <StudyAidsControls
                  bookmarked={isStudyBookmarked(studyTools.state, studyRef)}
                  onToggleBookmark={() =>
                    studyTools.update((s) =>
                      toggleBookmark(s, {
                        ...studyRef,
                        label: `PT${currentQuestion.pt} · S${currentQuestion.section} · Q${currentQuestion.qnum}`,
                      }),
                    )
                  }
                  bookmarks={listBookmarks(studyTools.state, 'lr').map((b) => ({
                    key: studyQuestionKey(b),
                    label: b.label,
                    href: bookmarkHref(b, (qid) => `/drill?${launchDrill({ kind: 'questions', qids: [qid] })}`),
                    isCurrent: b.id === currentQuestion.qid,
                  }))}
                  onRemoveBookmark={(key) => {
                    const b = studyTools.state.bookmarks[key];
                    if (b) studyTools.update((s) => removeBookmark(s, b));
                  }}
                  onClearMarks={handleClearStudyMarks}
                  hasMarks={
                    eliminatedAnswers.size > 0 ||
                    questionHighlights.highlightsFor(currentQuestion.qid).length > 0
                  }
                  deviceSaved={studyTools.deviceSaved}
                  notice={studyTools.notice}
                />
              ) : undefined
            }
          />
          <OfficialQuestionPane
            question={{
              qid: currentQuestion.qid,
              qnum: currentQuestion.qnum,
              stimulus: currentQuestion.stimulus,
              questionStem: currentQuestion.questionStem,
              answerChoices: currentQuestion.answerChoices,
            }}
            displayNumber={displayNum}
            selectedAnswer={selectedAnswer}
            eliminatedAnswers={eliminatedAnswers}
            isFlagged={isFlagged}
            answerRevealed={currentRevealed}
            correctAnswer={currentQuestion.correctAnswer}
            // Answer and Explanation are two different asks. Answer says which
            // choice was right and which one you took; Explanation is the one
            // that opens every choice's reasoning inline. Passing the notes
            // whenever the answer was revealed collapsed the two, so pressing
            // Answer unfolded the whole breakdown nobody had asked for.
            inlineNotes={explanationOpen ? inlineNotes : null}
            highlights={questionHighlights.highlightsFor(currentQuestion.qid)}
            highlightMode={highlightMode}
            searchTerm={officialSearchTerm}
            fontScale={officialFontScale}
            onAnswerSelect={handleAnswerSelect}
            onEliminate={handleEliminateAnswer}
            onToggleFlag={handleToggleFlag}
            onTextSelection={handleTextSelection}
            onHighlightClick={handleHighlightClick}
            // Review controls: Choice Notes as closed expanders, choices that
            // stay live after a reveal, Reset Response, and the Argument
            // Breakdown under the stimulus. All opt-in; the legacy modes get
            // the pane exactly as before.
            choiceNoteExpanders={reviewControlsAvailable}
            choicesStayLive={reviewControlsAvailable}
            interactionLocked={actionInFlight}
            onResetResponse={reviewControlsAvailable ? handleResetResponse : undefined}
            belowStimulus={
              reviewControlsAvailable && explanationOpen ? (
                <ArgumentBreakdown
                  data={lrExplanation}
                  isLoading={lrExplanationLoading}
                  isError={lrExplanationError}
                  activeStyle={activeStyle}
                  onStyleChange={setActiveStyle}
                  fontScale={officialFontScale}
                  open={breakdownOpen}
                  onToggle={() => setBreakdownOpen((open) => !open)}
                />
              ) : null
            }
          />
          {renderVoiceCoachChip()}
          {isAdaptiveMode ? (
            <OfficialSmartDrillBar
              primaryAction={currentAttempted || currentUnscored ? 'next' : 'submit'}
              primaryDisabled={!selectedAnswer || !!timer?.isPaused}
              onSubmit={() => {
                void commitCurrentAdaptiveAnswer({
                  revealAfterSave: autoReveal,
                  advanceAfterSave: false,
                });
              }}
              onNext={() => { void handleNext(); }}
              onSkip={() => {
                setSkippedQids(prev => new Set(prev).add(currentQuestion.qid));
                setAdvanceToken(t => t + 1);
              }}
              skipDisabled={currentAttempted || !!timer?.isPaused}
              onEnd={() => handleNavigation('/classroom')}
              disabled={!!timer?.isPaused}
            />
          ) : isFullSection ? (
            // A real timed section is not a submit-one-at-a-time drill: the
            // answer commits the moment it is selected, so Skip and Submit have
            // nothing to do. What the section needs is the official navigator —
            // the oval strip for the whole queue and prev/next arrows in the
            // bottom-right corner, exactly where the paper-and-LawHub interface
            // puts them. Leaving the section runs through Complete Section in
            // the header strip.
            <OfficialAnswerNavigator
              questionQueue={session.questionQueue}
              currentIndex={session.currentIndex}
              attemptedQids={attemptedQids}
              jumpEnabled={jumpEnabled}
              jumpDisabledReason={timer?.isPaused ? 'Paused — resume to navigate' : undefined}
              showQuestionList
              prevDisabled={session.currentIndex <= 0 || !!timer?.isPaused}
              nextDisabled={
                officialNextDisabled ||
                session.currentIndex >= session.questionQueue.length - 1
              }
              nextDisabledReason={
                timer?.isPaused
                  ? 'Paused — resume to navigate'
                  : session.currentIndex >= session.questionQueue.length - 1
                  ? 'Last question — use Complete Section to finish'
                  : undefined
              }
              onJumpTo={handleJumpTo}
              onPrev={officialPrev}
              onNext={() => { void officialNext(); }}
              revealEnabled={revealSealed ? false : sectionRevealEnabled}
              onRevealEnabledChange={revealSealed ? undefined : setSectionRevealEnabled}
            />
          ) : (
            // Same chrome as the adaptive Smart Drill, but driven by the fixed
            // queue the student hand-picked from the Smart LR Drill card. Submit
            // saves and reveals in place; Next
            // walks the queue via the shared officialNext; Skip advances past the
            // answer gate; End finishes the section.
            <OfficialSmartDrillBar
              primaryAction={currentAttempted || currentUnscored ? 'next' : 'submit'}
              primaryDisabled={!selectedAnswer || !!timer?.isPaused || actionInFlight}
              onSubmit={() => {
                void (async () => {
                  const submitted = selectedAnswer;
                  await handleSubmitNonAdaptive(submitted);
                  if (autoReveal) {
                    setShowAnswerRevealed(prev => new Map(prev).set(currentQuestion.qid, true));
                  }
                  // Pop the AI tutor (post-answer when revealed) on a wrong answer
                  // so the student gets a specific, back-and-forth explanation
                  // instead of the old dead "ANALYSIS VALID" placeholder.
                  const tutorLaunch = resolveTutorLaunch({
                    flagEnabled: AI_TUTOR_ENABLED,
                    tutorModeEnabled: tutorMode,
                    correct: submitted === currentQuestion.correctAnswer,
                    answerRevealed: autoReveal,
                  });
                  if (tutorLaunch.shouldOpen) {
                    setAnswerLocked(true);
                    setTutorQuestionSnapshot(currentQuestion);
                    setTutorUserAnswerSnapshot(submitted);
                    setTutorChatMode(tutorLaunch.mode);
                    setTutorChatOpen(true);
                  }
                })();
              }}
              onNext={() => { void officialNext(); }}
              // A built set is a fixed list, so it walks both ways. Skip only
              // ever went forward, and only before the question was answered,
              // which left no way back to a question already worked — the one
              // thing reviewing a set is for.
              onPrev={() => { void commitThenNavigate('prev'); }}
              prevDisabled={session.currentIndex <= 0 || !!timer?.isPaused || actionInFlight}
              onAdvance={() => { void commitThenNavigate('advance'); }}
              advanceDisabled={!!timer?.isPaused || actionInFlight}
              // A fixed drill never shows the Submit pill: the arrows and ovals
              // already commit on the way out, and the review controls live in
              // the strip. Elsewhere Submit is only ever the commit action, and
              // once the question is answered (or deliberately revealed
              // unscored) the Next pill carries the student on.
              primaryVisible={reviewPolicy === 'fixed' ? false : !currentAttempted && !currentUnscored}
              // A built set is a fixed, known list, so it navigates like a
              // section: every question gets an oval, and any of them can be
              // clicked. Jumping commits whatever is selected first, for the
              // same reason Previous does — leaving a question must never be
              // the thing that loses the answer on it.
              pager={
                <AnswerOvals
                  questionQueue={session.questionQueue}
                  currentIndex={session.currentIndex}
                  attemptedQids={attemptedQids}
                  jumpEnabled={!timer?.isPaused && !actionInFlight}
                  jumpDisabledReason={timer?.isPaused ? 'Paused — resume to navigate' : undefined}
                  onJumpTo={(index) => { void commitThenNavigate({ jumpTo: index }); }}
                />
              }
              onEnd={() => handleNavigation('/classroom/drill')}
              disabled={!!timer?.isPaused || actionInFlight}
            />
          )}
          </>
          )}
        </OfficialDrillFrame>
        {helpOpen && <HelpSheet open={helpOpen} onOpenChange={setHelpOpen} />}
        {renderVoiceCoachModal()}
        {renderTutorOverlay()}
      </>
    );
  }

  return (
    <>
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave drill session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? Your progress in this session will be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit}>Yes, leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={cn(
        "min-h-screen flex flex-col relative bg-white",
        session.mode === 'full-section' && "pb-20"
      )}>
        {standaloneSourceKey && <p className="px-4 py-2 text-xs text-slate-600" role="note">{lrRunProvenanceLabel(legacyStandaloneResumeRef.current ? undefined : standaloneProvenance)}</p>}
        {/* Pause Overlay */}
        {timer?.isPaused && (
          <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
            <Card className="p-10 text-center shadow-lg border-border/50 rounded-lg">
              <h2 className="text-2xl font-semibold mb-3 text-foreground">Timer Paused</h2>
              <p className="text-muted-foreground mb-6">Click Resume to continue</p>
              <Button onClick={timer.resume} size="lg" className="min-w-[140px]">
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            </Card>
          </div>
        )}

        {practicingLabel && (
          <div className="w-full bg-[#1a1a1a] text-white text-center py-2 px-4 text-[11px] font-bold uppercase tracking-[0.22em]">
            Practicing: <span className="text-white/80 normal-case tracking-normal font-serif italic ml-1">{practicingLabel}</span>
          </div>
        )}

        {/* Unified Top Bar */}
        <DrillTopBar
          onBack={() => navigate(guidedAwareReturnTo || '/classroom/drill')}
          questionLabel={currentQuestion ? (
            window.innerWidth >= 640
              ? `PT${currentQuestion.pt}-S${currentQuestion.section}-Q${currentQuestion.qnum}`
              : `Q${currentQuestion.qnum}`
          ) : undefined}
          questionTooltip={currentQuestion ? (
            <div className="space-y-1">
              <p className="font-semibold">PT{currentQuestion.pt}-S{currentQuestion.section}-Q{currentQuestion.qnum}</p>
              <p className="text-xs text-muted-foreground">Type: {currentQuestion.qtype}</p>
              <p className="text-xs text-muted-foreground">Difficulty: {currentQuestion.difficulty}/5</p>
              <p className="text-xs text-muted-foreground mt-2">Click to copy ID</p>
            </div>
          ) : undefined}
          onCopyId={() => {
            if (currentQuestion) {
              const text = `PT${currentQuestion.pt}-S${currentQuestion.section}-Q${currentQuestion.qnum}`;
              navigator.clipboard.writeText(text);
              toast('Question ID copied to clipboard');
            }
          }}
          highlightMode={highlightMode}
          onHighlightModeChange={setHighlightMode}
          isFlagged={isFlagged}
          onToggleFlag={handleToggleFlag}
          onUndo={handleUndo}
          canUndo={questionHighlights.canUndo}
          hasTimer={hasTimer}
          timerLabel={timer?.label}
          timerPaused={timer?.isPaused}
          onTimerToggle={timer ? (timer.isPaused ? timer.resume : timer.pause) : undefined}
          showTutorToggle={AI_TUTOR_ENABLED && session?.mode === 'adaptive'}
          tutorMode={tutorMode}
          onTutorModeChange={(next) => {
            setTutorMode(next);
            if (!next) {
              setTutorChatOpen(false);
            }
          }}
          onOpenTutor={AI_TUTOR_ENABLED ? () => {
            if (!currentQuestion) return;
            setTutorQuestionSnapshot(currentQuestion);
            setTutorUserAnswerSnapshot(selectedAnswer);
            setTutorChatMode(resolveTutorMode({
              userAnswer: selectedAnswer,
              answerRevealed: !!showAnswerRevealed.get(currentQuestion.qid),
            }));
            setTutorChatOpen(true);
          } : undefined}
          onOpenInfo={guidedSet?.is_guided_set ? () => setGuidedInfoOpen(true) : undefined}
        />
        <GuidedDrillIntroModal
          set={guidedSet?.is_guided_set ? guidedSet : null}
          open={guidedInfoOpen}
          onOpenChange={setGuidedInfoOpen}
        />

      {/* Main Content */}
      <DrillSplit
        left={
          poolExhausted ? (
                <div className="min-h-0 overflow-y-auto p-8">
                  <QuestionPoolExhausted
                    onReset={async () => {
                      if (classId) {
                        try {
                          await QuestionPoolService.resetPool(classId, session?.mode);
                          toast.success('Question pool reset');
                          window.location.reload();
                        } catch (err) {
                          console.error('Failed to reset question pool:', err);
                          toast.error('Failed to reset question pool');
                        }
                      }
                    }}
                    onExpandCriteria={() => {
                      navigate('/classroom');
                    }}
                    onSettings={() => {
                      navigate('/profile');
                    }}
                    mode={session?.mode || 'drill'}
                  />
                </div>
          ) : (
            // Left Panel — Stimulus
            <div className="flex min-h-0 flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 sm:p-8">
                  {currentQuestion.stimulus && (() => {
                    const fullText = normalizeText(currentQuestion.stimulus);
                    const stimulusHighlights = questionHighlights
                      .highlightsFor(currentQuestion.qid)
                      .filter(h => h.section === 'stimulus');
                    return (
                      <div
                        className={cn(
                          "prose prose-lg max-w-none",
                          "text-[19px] leading-[1.7] text-neutral-900",
                          highlightMode !== 'none' ? 'select-text cursor-text' : 'select-none cursor-default'
                        )}
                        onMouseUp={(e) =>
                          handleTextSelection([
                            { section: 'stimulus', container: e.currentTarget, source: fullText },
                          ])
                        }
                      >
                        <HighlightedText
                          text={fullText}
                          highlights={stimulusHighlights}
                          onHighlightClick={handleHighlightClick}
                          eraserMode={highlightMode === 'erase'}
                        />
                      </div>
                    );
                  })()}

                  {renderVoiceCoachChip()}
                </div>
              </div>
            </div>
          )
        }
        right={
          poolExhausted ? undefined : (
            // Right Panel — Question & Answers
            <div className="min-h-0 overflow-y-auto lg:border-l border-border bg-white">
              <div className="p-6 sm:p-8">
                {/* Question Stem */}
                <div className="mb-4">
                  <div
                    className={cn(
                      "text-[19px] font-semibold text-neutral-900 leading-[1.6] tracking-tight",
                      highlightMode !== 'none' ? 'select-text cursor-text' : 'select-none cursor-default'
                    )}
                    onMouseUp={(e) =>
                      handleTextSelection([
                        { section: 'stem', container: e.currentTarget, source: currentQuestion.questionStem },
                      ])
                    }
                  >
                    <HighlightedText
                      text={currentQuestion.questionStem}
                      highlights={questionHighlights
                        .highlightsFor(currentQuestion.qid)
                        .filter(h => h.section === 'stem')}
                      onHighlightClick={handleHighlightClick}
                      eraserMode={highlightMode === 'erase'}
                    />
                  </div>
                </div>

                {/* Answer choices */}
                {tutorChatOpen ? (
                  <div className="space-y-0">
                    {(() => {
                      const { before, selected, after } = getAnswerGroups();
                  
                      return (
                        <>
                          {before.length > 0 && (
                            <div className="opacity-20 blur-[1px] pointer-events-none">
                              {before.map(([key, text]) => renderAnswerChoice(key, text, { showRadio: false, inFocusedMode: true }))}
                            </div>
                          )}

                          <div className="relative my-4">
                            <div className="absolute -inset-2 bg-neutral-100/80 rounded-lg blur-sm" />
                            <div className="relative">
                              {renderAnswerChoice(selected[0], selected[1], { 
                                isSelected: true, 
                                showRadio: false,
                                inFocusedMode: true
                              })}
                            </div>
                          </div>

                          {after.length > 0 && (
                            <div className="opacity-20 blur-[1px] pointer-events-none">
                              {after.map(([key, text]) => renderAnswerChoice(key, text, { showRadio: false, inFocusedMode: true }))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <RadioGroup
                    value={selectedAnswer}
                    onValueChange={handleAnswerSelect}
                    className="space-y-1 -mx-5"
                  >
                    {Object.entries(currentQuestion.answerChoices).map(([key, text]) => 
                      renderAnswerChoice(key, text, { 
                        isSelected: key === selectedAnswer,
                        showRadio: true
                      })
                    )}
                  </RadioGroup>
                )}

                <AdminQuestionNotes
                  qid={currentQuestion.qid}
                  isAdmin={isAdmin}
                  open={teachingNotesOpen}
                  onOpenChange={setTeachingNotesOpen}
                />

                {/* Show Answer button for practice-set mode */}
                {isPracticeSetMode && selectedAnswer && !showSolution && (
                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={handleShowAnswer}
                      variant="outline"
                      size="lg"
                    >
                      Show Answer
                    </Button>
                  </div>
                )}

                {/* Submit button for adaptive mode — only manual submission triggers evaluation */}
                {session.mode === 'adaptive' && selectedAnswer && !showSolution && !tutorChatOpen && (
                  <div className="flex justify-end gap-3 pt-6 mt-2">
                    <Button
                      onClick={() => handleSubmit()}
                      size="lg"
                      disabled={timer?.isPaused}
                    >
                      Check Answer
                    </Button>
                  </div>
                )}

                {/* Submit button for non-adaptive, non-section, non-practice-set modes */}
                {session.mode !== 'adaptive' && session.mode !== 'full-section' && !isPracticeSetMode && selectedAnswer && !showSolution && (
                  <div className="flex justify-end gap-3 pt-6 mt-2">
                    <Button
                      onClick={() => handleSubmitNonAdaptive()}
                      size="lg"
                      disabled={timer?.isPaused}
                    >
                      Check Answer
                    </Button>
                  </div>
                )}

                {/* Solution */}
                {showSolution && (
                  <div className="mt-6 p-6 border-t space-y-4">
                    <div className="flex items-center gap-2">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <span className="font-semibold text-lg">
                        {selectedAnswer === currentQuestion.correctAnswer
                          ? 'Correct!'
                          : `The correct answer is (${currentQuestion.correctAnswer}).`}
                      </span>
                    </div>
                
                    {/* Good job message with AI explanation for retry success */}
                    {isRetryAfterWrong && selectedAnswer === currentQuestion.correctAnswer && session.mode === 'adaptive' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-700 mb-2">🎉 Good Job!</h4>
                        <p className="text-sm text-green-600 leading-relaxed">
                          {correctExplanation || 'You got it right on your second try! That shows great learning.'}
                        </p>
                      </div>
                    )}

                    {/* Optional Review button for WAJ */}
                    {showReviewButton && session.mode === 'adaptive' && (
                      <Button
                        variant="outline"
                        onClick={() => setWajModalOpen(true)}
                        className="w-full mt-4"
                      >
                        Review in Journal
                      </Button>
                    )}

                    {/* Next button for adaptive mode */}
                    {session.mode === 'adaptive' && (
                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => { void handleNext(); }}
                          size="lg"
                          className="min-w-[120px]"
                        >
                          Next Question
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        }
      />

      {/* Sticky Bottom Navigation Bar - Section & Practice-Set Modes */}
      {(session.mode === 'full-section' || isPracticeSetMode) && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/98 backdrop-blur-sm border-t border-white/[0.06] shadow-lg z-50 animate-slide-up">
          <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-6">
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={isPracticeSetMode ? handlePracticeSetPrevious : () => { void handlePrevious(); }}
              disabled={session.currentIndex === 0 || timer?.isPaused}
              className={cn(
                "rounded-lg transition-all duration-150 min-w-[100px]",
                session.currentIndex === 0 && "invisible"
              )}
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="font-medium">Prev</span>
            </Button>

            {/* Question Circles with Progress */}
            <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto py-1 scrollbar-hide">
              <div className="flex items-center gap-1">
                {session.questionQueue.map((qid, index) => {
                  const isAnswered = session.attempts.has(qid);
                  const isCurrent = index === session.currentIndex;
                  const isFlaggedQ = isFlagged && isCurrent;
                  const printedNumber = Number(/-Q(\d+)$/.exec(qid)?.[1]);
                  const displayNumber = session.mode === 'full-section' && Number.isFinite(printedNumber)
                    ? printedNumber
                    : index + 1;
                  
                  return (
                    <button
                      key={qid}
                      onClick={async () => {
                        if (!timer?.isPaused) {
                          // Pause timer on current question before switching
                          if (isPracticeSetMode && currentQuestion) {
                            questionTimer.current.pause();
                          }
                          if (session.mode === 'full-section') {
                            await moveTimedSection(index);
                          } else {
                            const nextSession = { ...session, currentIndex: index };
                            if ((standaloneSourceKey || guidedSessionKey) && nextSession.attempts.size > 0) {
                              try {
                                await persistOwnedDrillSession(nextSession);
                              } catch (error) {
                                toast.error("Your place has not saved to your account. Retry this question.");
                                return;
                              }
                            }
                            setSession(nextSession);
                          }
                        }
                      }}
                      disabled={timer?.isPaused}
                      className={cn(
                        "flex items-center justify-center rounded-full transition-all duration-150",
                        "text-xs font-semibold tabular-nums",
                        "hover:scale-110 active:scale-95",
                        isCurrent && "w-9 h-9 bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20",
                        !isCurrent && isAnswered && "w-7 h-7 bg-accent text-foreground",
                        !isCurrent && !isAnswered && "w-7 h-7 border border-border text-muted-foreground hover:bg-accent/50"
                      )}
                      title={`Question ${displayNumber}${isAnswered ? ' (answered)' : ''}`}
                    >
                      {displayNumber}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Button */}
            <Button
              variant="default"
              size="lg"
              onClick={isPracticeSetMode ? handlePracticeSetNext : () => { void handleNext(); }}
              disabled={timer?.isPaused}
              className="rounded-lg shadow-md min-w-[100px] font-medium transition-all duration-150 hover:shadow-lg"
            >
              {session.currentIndex < session.questionQueue.length - 1 ? (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              ) : (
                <span>Finish</span>
              )}
            </Button>
          </div>
        </div>
      )}

      <ReviewModal
        open={wajModalOpen}
        onSave={handleWAJSave}
      />

      {renderVoiceCoachModal()}

      {renderTutorOverlay()}
    </div>
    </>
  );
}

export default function Drill() {
  const state = useDrillRunSpec();
  const timerConfig = React.useMemo(() => timerConfigForRunSpec(state), [state]);
  const { user } = useAuth();

  if (timerConfig) {
    return (
      <TimerProvider mode={timerConfig.mode} durationMs={timerConfig.durationMs}>
        <DrillActorScope actorId={user?.id}>
          <DrillContent />
        </DrillActorScope>
      </TimerProvider>
    );
  }

  return (
    <DrillActorScope actorId={user?.id}>
      <DrillContent />
    </DrillActorScope>
  );
}
