import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
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
  useInlineDisclosures,
  type InlineChoiceNotes,
} from '@/components/drill/official/InlineChoiceExplanation';
import { useLrExplanation, type LrStyleKey } from '@/hooks/useLrExplanation';
import HelpSheet from '@/components/help/HelpSheet';
import OfficialSessionStrip from '@/components/drill/official/OfficialSessionStrip';
import OfficialDrillToolbar from '@/components/drill/official/OfficialDrillToolbar';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import OfficialSmartDrillBar from '@/components/drill/official/OfficialSmartDrillBar';
import { TutorChatModal } from '@/components/drill/TutorChatModal';
import { resolveTutorLaunch, resolveTutorMode, type TutorMode } from '@/components/drill/tutorBehavior';
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
import { ScoreReport } from '@/components/drill/ScoreReport';
import { LRSectionResults } from '@/components/drill/LRSectionResults';
import { EnhancedBlindReview } from '@/components/drill/EnhancedBlindReview';
import { PracticeSetResults } from '@/components/drill/PracticeSetResults';
import { TimerProvider, useTimerContextSafe } from '@/contexts/TimerContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useClassId } from '@/hooks/useClassId';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { questionBank } from '@/lib/questionLoader';
import { useAdaptiveEngine } from '@/contexts/AdaptiveEngineContext';
import { normalizeText } from '@/lib/utils';
import { captureTextSelection, replaceOverlappingHighlights, type Highlight, type HighlightColor } from '@/lib/highlightUtils';
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
  TypeDrillConfig,
} from '@/types/drill';
import { QuestionPoolService, type QuestionUsage } from '@/lib/questionPoolService';
import { QuestionPoolChip } from '@/components/drill/QuestionPoolChip';
import { QuestionPoolExhausted } from '@/components/drill/QuestionPoolExhausted';
import { toast } from 'sonner';
import { QuestionTimer } from '@/lib/questionTimer';
import { record } from '@rrweb/record';
import type { eventWithTime } from '@rrweb/types';
import {
  getResolvedDrillRouteState,
  getTimerConfigForDrillRoute,
  type DrillRouteState,
} from '@/lib/drillRouteState';
import { getDrillDisplayNumber } from '@/pages/drillDisplayNumber';
import { getPracticePool } from '@/bootcamps/main-conclusion/data/practiceDrillPools';
import { recordPracticeDrillCompletion } from '@/bootcamps/main-conclusion/lib/recordPracticeCompletion';
import {
  loadPracticeSession,
  savePracticeSessionSnapshot,
  completePracticeSession,
} from '@/bootcamps/main-conclusion/lib/practiceSessionStore';
import { recordFlawPerformance } from '@/bootcamps/fallacy-flaw-v2/lib/recordFlawPerformance';
import { appendGuidedResumeParams } from '@/lib/guidedDrillNavigation';
import {
  guidedSessionKeyForRunner,
  guidedResumeIndex,
  loadGuidedDrillSession,
  saveGuidedDrillSnapshot,
  completeGuidedDrillSession,
  isResumableGuidedSession,
} from '@/lib/guidedDrillSession';
import {
  drillResumeKey,
  loadDrillResumeSession,
  saveDrillResumeSnapshot,
  completeDrillResumeSession,
  isResumableDrillSession,
} from '@/lib/drillResumeSession';


function DrillContent() {
  const adaptiveEngine = useAdaptiveEngine();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const permissions = useUserPermissions();
  const { isLoading: qbLoading } = useQuestionBank();

  // Homework assignments pass mode + qids + assignmentId via URL params so the
  // context survives page refresh. Existing callers use location.state. URL
  // params take priority; fall back to state when absent.
  const assignmentId = searchParams.get('assignmentId');
  const guidedAssignmentId = searchParams.get('guidedAssignmentId');
  const guidedSetId = searchParams.get('guidedSetId') ?? undefined;
  const { set: guidedSet } = useHomeworkSet(guidedSetId);
  const [guidedInfoOpen, setGuidedInfoOpen] = React.useState(false);
  const state = React.useMemo<DrillRouteState>(
    () => getResolvedDrillRouteState(searchParams, location.state),
    [searchParams, location.state],
  );

  const practicingLabel = searchParams.get('focus') || (location.state as { practicingLabel?: string } | null)?.practicingLabel;

  // Context params for header/breadcrumbs (survive refresh)
  const origin = searchParams.get('origin');
  const returnTo = searchParams.get('returnTo');
  const drillReturnTo = state.returnTo ?? (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : undefined);
  const contextLabel = searchParams.get('label');
  const contextFocus = searchParams.get('focus');
  const initialIndexParam = searchParams.get('initialIndex');
  const isMcPractice = searchParams.get('source') === 'intro-to-lr-practice-drills';
  // Maps the finished MC practice set back to its module-progress completion id
  // so the Intro to LR path cannot report "core path cleared" before the final
  // practice sets are actually done.
  const mcPracticePool = React.useMemo(
    () => (isMcPractice ? getPracticePool(searchParams.get('practiceSlug') ?? '') : undefined),
    [isMcPractice, searchParams],
  );
  // Once the set is finished, snapshot writes must stop: a late write would
  // flip the stored row back to in_progress and re-offer "Resume" on a set the
  // student already completed.
  const mcPracticeFinalizedRef = React.useRef(false);
  // Guided drills keep the same kind of durable resume row, keyed by assignment.
  // Null for every other drill surface, which is what leaves library, flagged,
  // and Smart Drill runs untouched.
  const guidedSessionKey = React.useMemo(
    () => guidedSessionKeyForRunner({ guidedAssignmentId, returnTo }),
    [guidedAssignmentId, returnTo],
  );
  // Same reason as mcPracticeFinalizedRef: once the drill is finished, a late
  // snapshot write would flip the row back to in_progress and offer a resume on
  // a drill the student already completed.
  const guidedFinalizedRef = React.useRef(false);
  // Every remaining drill surface — Smart Drill, custom type drills, full
  // sections — gets the same durable resume row, so closing the browser or
  // signing out mid-drill is never a loss. Null while the guided/practice-set
  // surfaces own the run, so the three can never write over each other.
  const genericResumeKey = React.useMemo(() => {
    if (isMcPractice || guidedSessionKey) return null;
    if (!state?.mode) return null;
    const mode = state.mode === 'practice-set' ? 'type-drill' : state.mode;
    return drillResumeKey({ mode, config: state.config });
  }, [isMcPractice, guidedSessionKey, state]);
  const genericFinalizedRef = React.useRef(false);

  const bootcampPracticeReturnTo =
    returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')
      ? returnTo
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
  // Help sheet, opened from the header strip beside Pause. The global
  // FloatingHelpButton is suppressed on /drill so no bubble floats over the
  // question card.
  const [helpOpen, setHelpOpen] = React.useState(false);
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
  const [hasTimer, setHasTimer] = React.useState(false);
  const [answerLocked, setAnswerLocked] = React.useState(false);
  const [eliminatedByQid, setEliminatedByQid] = React.useState<Map<string, Set<string>>>(new Map());
  // Derived: eliminations for the displayed question only (read-only proxy).
  // Adaptive Smart Drill can render a currentQuestion outside the queued index.
  // Shaped so we can later promote into session.attempts.get(qid).eliminated.
  const eliminatedAnswers = React.useMemo<Set<string>>(() => {
    const qid = currentQuestion?.qid;
    return qid ? eliminatedByQid.get(qid) ?? new Set<string>() : new Set<string>();
  }, [eliminatedByQid, currentQuestion?.qid]);
  const [highlightMode, setHighlightMode] = React.useState<'none' | 'yellow' | 'pink' | 'orange' | 'underline' | 'erase'>('none');
  const [highlights, setHighlights] = React.useState<Map<string, Highlight[]>>(new Map());
  const [highlightHistory, setHighlightHistory] = React.useState<Map<string, Highlight[]>[]>([]);
  const [isFlagged, setIsFlagged] = React.useState(false);
  const [showExitDialog, setShowExitDialog] = React.useState(false);
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
  const [postSectionScreen, setPostSectionScreen] = React.useState<'complete' | 'review' | 'score-report' | null>(null);
  const [autoReviewQids, setAutoReviewQids] = React.useState<string[]>([]);
  const [longPressTimer, setLongPressTimer] = React.useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Question pool state
  const [poolStatus, setPoolStatus] = React.useState<string>('');
  const [totalPoolSize, setTotalPoolSize] = React.useState(0);
  const [availablePoolSize, setAvailablePoolSize] = React.useState(0);
  const [poolExhausted, setPoolExhausted] = React.useState(false);
  const [bootError, setBootError] = React.useState<string | null>(null);
  const [adaptiveHydrationStatus, setAdaptiveHydrationStatus] = React.useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const { classId, loading: classIdLoading } = useClassId();
  const [advanceToken, setAdvanceToken] = React.useState(0);
  // Smart Drill: questions skipped (advanced without answering). Excluded from
  // the adaptive selector so a skipped question is not immediately re-served.
  const [skippedQids, setSkippedQids] = React.useState<Set<string>>(new Set());
  // Smart Drill: auto-reveal the correct answer after submitting. Persisted.
  const [autoReveal, setAutoReveal] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('lsatu.smartdrill.autoReveal') !== 'false';
    } catch {
      return true;
    }
  });
  const handleAutoRevealChange = React.useCallback((next: boolean) => {
    setAutoReveal(next);
    try {
      localStorage.setItem('lsatu.smartdrill.autoReveal', String(next));
    } catch {
      /* ignore quota/availability errors */
    }
  }, []);

  const currentViewId = React.useRef<string | null>(null);

  // rrweb session replay capture (one row per question in session_replays)
  const eventsRef = React.useRef<eventWithTime[]>([]);
  const stopRecordingRef = React.useRef<(() => void) | null>(null);
  const lastRecordedQidRef = React.useRef<string | null>(null);
  const adaptiveCommitInFlightRef = React.useRef<Set<string>>(new Set());

  // Homework assignment: dedupe the status='in_progress' write per mount.
  const assignmentStartedRef = React.useRef(false);

  // Practice-set mode state
  const [isPracticeSetMode, setIsPracticeSetMode] = React.useState(false);
  const questionTimer = React.useRef(new QuestionTimer());
  const [hideTimer, setHideTimer] = React.useState(false);
  const [showAnswerRevealed, setShowAnswerRevealed] = React.useState<Map<string, boolean>>(new Map());
  // Official-layout-only local UI state (Find Text + Aa font scale).
  const [officialSearchTerm, setOfficialSearchTerm] = React.useState('');
  const [officialFontScale, setOfficialFontScale] = React.useState(1);
  // Smart Drill docked notes panel open state.
  const [notesOpen, setNotesOpen] = React.useState(false);
  // Active tab inside the docked drill drawer (Notes | Details).
  const [drawerTab, setDrawerTab] = React.useState<DrawerTab>('details');
  
  const timer = useTimerContextSafe();

  // BR only for Full Section and Type Drill modes
  const sessionMode = session?.mode;
  const brEnabled = sessionMode === 'full-section' || sessionMode === 'type-drill';

  // class_id resolved via useClassId() hook above (F1.10).

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

      const mode = state.mode === 'practice-set' ? 'type-drill' : state.mode;
      let questionQueue: string[] = [];
      let rawQuestions: LRQuestion[] = [];

      if (mode === 'adaptive') {
        rawQuestions = questionBank.getAllQuestions();
      } else if (mode === 'full-section' && state.config) {
        const config = state.config as FullSectionConfig;
        rawQuestions = questionBank.getSection(config.pt, config.section);
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
      
      const explicitQids =
        (mode === 'type-drill' || mode === 'natural-drill') &&
        state.config &&
        ((state.config as TypeDrillConfig).selectedQids?.length ?? 0) > 0;

      if (classId && !explicitQids) {
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
        if (config.selectedQids && config.selectedQids.length > 0) {
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
      let restoredAttempts: DrillSession['attempts'] = new Map();

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
        const stored = await loadGuidedDrillSession(user.id, guidedSessionKey);
        if (isResumableGuidedSession(stored, questionQueue)) {
          questionQueue = stored.question_queue;
          initialIndex = guidedResumeIndex(
            questionQueue,
            stored.current_index,
            stored.attempts.map((a) => a.qid),
          );
          for (const attempt of stored.attempts) {
            restoredAttempts.set(attempt.qid, {
              selectedAnswer: attempt.selected_answer,
              correct: attempt.correct,
              timeMs: attempt.time_ms,
              timestamp: Date.now(),
              confidence: undefined,
              reviewDone: false,
            });
          }
        } else if (stored?.status === 'in_progress') {
          console.warn('[drill:guided] stored resume set no longer matches this drill, starting fresh', {
            key: guidedSessionKey,
          });
        }
      }

      // Smart Drill, custom type drills and full sections. These are drawn
      // fresh on every launch, so the stored queue IS the run: adopt it whole
      // rather than comparing it to a new shuffle, or the student loses the
      // questions they already answered. An explicit ?initialIndex wins, since
      // that is someone deliberately jumping to a question.
      if (genericResumeKey && user && !initialIndexParam) {
        const stored = await loadDrillResumeSession(user.id, genericResumeKey);
        if (isResumableDrillSession(stored)) {
          questionQueue = stored.question_queue;
          initialIndex = guidedResumeIndex(
            questionQueue,
            stored.current_index,
            stored.attempts.map((a) => a.qid),
          );
          for (const attempt of stored.attempts) {
            restoredAttempts.set(attempt.qid, {
              selectedAnswer: attempt.selected_answer,
              correct: attempt.correct,
              timeMs: attempt.time_ms,
              timestamp: Date.now(),
              confidence: undefined,
              reviewDone: false,
            });
          }
        }
      }


      setSession({
        mode,
        fullSectionConfig: mode === 'full-section' ? (state.config as FullSectionConfig) : undefined,
        typeDrillConfig: (mode === 'type-drill' || mode === 'natural-drill') ? (state.config as TypeDrillConfig) : undefined,
        questionQueue,
        currentIndex: initialIndex,
        attempts: restoredAttempts,
      });
    };

    initializeSession();
  }, [state, navigate, classId, classIdLoading, qbLoading, settings.allowRepeats, settings.preferUnseen, settings.recycleAfterDays, initialIndexParam, isMcPractice, mcPracticePool, guidedSessionKey, genericResumeKey, user]);

  // Shapes the student's current place into a resume snapshot. Shared by the two
  // surfaces that persist one — Intro to LR practice sets and guided drills — and
  // written on every answer and every question move, so leaving mid-drill is
  // never a loss. The persistence layer writes locally at once and debounces the
  // cloud upsert, so this stays cheap enough to run on each session change.
  const drillResumeSnapshot = React.useCallback(
    (source: DrillSession | null): {
      questionQueue: string[];
      currentIndex: number;
      attempts: Array<{ qid: string; selected_answer: string; correct: boolean; time_ms: number }>;
    } | null => {
      if (!source) return null;
      return {
        questionQueue: source.questionQueue,
        currentIndex: source.currentIndex,
        attempts: Array.from(source.attempts.entries())
          .filter(([, attempt]) => !!attempt.selectedAnswer)
          .map(([qid, attempt]) => ({
            qid,
            selected_answer: attempt.selectedAnswer,
            correct: !!attempt.correct,
            time_ms: Number.isFinite(attempt.timeMs) ? Math.max(0, Math.round(attempt.timeMs)) : 0,
          })),
      };
    },
    [],
  );

  React.useEffect(() => {
    if (!isMcPractice || !mcPracticePool || !user || !session) return;
    if (mcPracticeFinalizedRef.current) return;
    if (session.questionQueue.length === 0) return;
    const snapshot = drillResumeSnapshot(session);
    if (!snapshot) return;
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
  React.useEffect(() => {
    if (!guidedSessionKey || !user || !session) return;
    if (guidedFinalizedRef.current) return;
    if (session.questionQueue.length === 0) return;
    const snapshot = drillResumeSnapshot(session);
    if (!snapshot) return;
    void saveGuidedDrillSnapshot(user.id, guidedSessionKey, snapshot).catch((err) => {
      // Non-fatal: the drill still works, they just lose the resume point.
      console.error('[drill:guided:snapshot] resume write failed', {
        userId: user.id,
        key: guidedSessionKey,
        err,
      });
    });
  }, [session, guidedSessionKey, user, drillResumeSnapshot]);

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

      const allQuestions = questionBank.getAllQuestions();
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
      const combinedAttempts = [...historicalAttempts, ...sessionAttemptRecords];
      const profile = adaptiveEngine.buildStudentProfile(combinedAttempts);
      const selection = adaptiveEngine.selectSmartDrillQuestion(allQuestions, profile, {
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

    // Restore saved answer + revealed solution for any non-adaptive mode.
    // (Adaptive is narrowed out by prior control flow in this effect.)
    if (session) {
      const qid = session.questionQueue[session.currentIndex];
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
    setHighlightHistory([]);
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
    if (!isPracticeSetMode && !isRetryAfterWrong && answerLocked) return;
    if (!tutorMode && showSolution) return;
    
    if (selectedAnswer === answer) {
      setSelectedAnswer('');
      if ((session?.mode === 'full-section' || isPracticeSetMode) && currentQuestion) {
        const newAttempts = new Map(session.attempts);
        newAttempts.delete(currentQuestion.qid);
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
        
        newAttempts.set(currentQuestion.qid, {
          selectedAnswer: answer,
          correct: answer === currentQuestion.correctAnswer,
          timeMs: isPracticeSetMode
            ? questionTimer.current.getTotalTime(currentQuestion.qid)
            : Math.floor(performance.now() - questionStartTime),
          timestamp: Date.now(),
          confidence: existingAttempt?.confidence || null,
          reviewDone: false,
          answerRevealed: existingAttempt?.answerRevealed || false,
        });
        setSession({ ...session, attempts: newAttempts });
        
        if (isPracticeSetMode) {
          questionTimer.current.recordAnswer(currentQuestion.qid, answer);
        }
      }
    }
  };

  const handleEliminateAnswer = (key: string) => {
    if (!currentQuestion) return;
    const qid = currentQuestion.qid;
    setEliminatedByQid(prev => {
      const next = new Map(prev);
      const current = new Set(prev.get(qid) ?? []);
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
        if (selectedAnswer === key) {
          setSelectedAnswer('');
          if ((session?.mode === 'full-section' || isPracticeSetMode) && session) {
            const newAttempts = new Map(session.attempts);
            newAttempts.delete(qid);
            setSession({ ...session, attempts: newAttempts });
          }
        }
      }
      next.set(qid, current);
      return next;
    });
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
  // service so existing `if (!saved)` toast logic keeps working — the error is
  // logged at the service AND visible to the user via the caller's toast. This
  // does NOT silently swallow: failures are logged + surfaced through the
  // boolean return that callers already act on.
  const persistAttempt = async (
    attemptData: Parameters<typeof saveAttemptToDatabase>[0],
  ): Promise<boolean> => {
    try {
      return await saveAttemptToDatabase(attemptData);
    } catch (e) {
      console.error('[drill:persistAttempt] threw, surfacing as save-failed', {
        qid: attemptData.qid,
        mode: attemptData.mode,
        error: e,
      });
      return false;
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
  ): Promise<{ saved: number; wajFailed: number; timeMsZero: number }> => {
    let saved = 0;
    let wajFailed = 0;
    let timeMsZero = 0;
    const attemptErrors: unknown[] = [];

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
        }
      } catch (e) {
        attemptErrors.push(e);
      }

      if (!attempt.correct) {
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
    return { saved, wajFailed, timeMsZero };
  };

  const handleWAJSave = async (review: { whyWrong: string; whyEliminated: string; plan: string }) => {
    if (!currentQuestion || !session) return;
    
    const timeMs = Math.floor(performance.now() - questionStartTime);
    
    // Save to attempts database (final attempt after review)
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
    if (!saved) {
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

  const handleSubmitNonAdaptive = async (
    answerOverride?: string,
    options?: { advanceAfterSubmit?: boolean },
  ) => {
    const ans = answerOverride ?? selectedAnswer;
    if (!currentQuestion || !ans || !session) return null;

    const correct = ans === currentQuestion.correctAnswer;
    const timeMs = Math.floor(performance.now() - questionStartTime);

    // Save attempt to database (no confidence for non-adaptive)
    const saved = await persistAttempt({
      qid: currentQuestion.qid,
      correct,
      time_ms: timeMs,
      qtype: currentQuestion.qtype,
      level: currentQuestion.difficulty,
      confidence: null,
      mode: session.mode,
      selected_answer: ans,
    });
    if (!saved) {
      if (!classId && !user?.id) {
        toast.error("Your session is out of sync. Please refresh the page or sign back in.");
      } else {
        toast.error("Couldn't save your answer. Check your connection and try the next question.");
      }
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
      if (!saved) {
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

      if (tutorMode) {
        // Lock answer so the selected row shows red feedback while tutor is open
        setAnswerLocked(true);
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
      if (!saved) {
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
      if (!correct && tutorMode && currentQuestion) {
        setAnswerLocked(true);
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
        setAnswerLocked(true);
        setSession(prev => {
          if (!prev) return prev;
          const existing = prev.attempts.get(qid);
          if (!existing) return prev;
          const attempts = new Map(prev.attempts);
          attempts.set(qid, { ...existing, answerRevealed: true });
          return { ...prev, attempts };
        });
      }
      if (advanceAfterSave) setAdvanceToken(t => t + 1);
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

      if (!saved) {
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

      // Flip an existing WAJ wrong entry to right when a previously-missed
      // question is re-served and answered correctly. The session-end batch
      // (commitSessionAttempts) only logs wrong answers, so without this the
      // adaptive wrong->right flip never fires append_waj_correct.
      if (correct) {
        const { logCorrectAnswer } = await import('@/lib/wajService');
        try {
          await logCorrectAnswer({
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
          });
        } catch (error) {
          console.error('[drill:waj:log] logCorrectAnswer failed (adaptive)', {
            userId: user?.id,
            qid,
            mode: session.mode,
            error,
          });
          toast.error("Your answer was saved, but the journal entry didn't log. Let Joshua know if this keeps happening.");
        }
      }

      setSession({ ...session, attempts: newAttempts });

      const tutorLaunch = resolveTutorLaunch({
        tutorModeEnabled: tutorMode,
        correct,
        answerRevealed: revealAfterSave,
      });

      if (revealAfterSave) {
        setShowAnswerRevealed(prev => new Map(prev).set(qid, true));
        setAnswerLocked(true);
      }

      if (tutorLaunch.shouldOpen) {
        setAnswerLocked(true);
        setTutorQuestionSnapshot(currentQuestion);
        setTutorUserAnswerSnapshot(committedAnswer);
        setTutorChatMode(tutorLaunch.mode);
        setTutorChatOpen(true);
      }

      if (advanceAfterSave) setAdvanceToken(t => t + 1);
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

  const handlePracticeSetNext = () => {
    if (!session) return;
    
    // Pause timer on current question
    if (currentQuestion) {
      questionTimer.current.pause();
    }
    
    // Move to next
    if (session.currentIndex < session.questionQueue.length - 1) {
      setSession(prev => prev ? {
        ...prev,
        currentIndex: prev.currentIndex + 1,
      } : prev);
    } else {
      // Finished
      handleFinishPracticeSet();
    }
  };

  const handlePracticeSetPrevious = () => {
    if (!session) return;
    
    // Pause timer on current question
    if (currentQuestion) {
      questionTimer.current.pause();
    }
    
    // Move to previous
    if (session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1,
      });
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
    guidedFinalizedRef.current = true;

    const snapshot = drillResumeSnapshot(session ? { ...session, attempts } : null);
    if (!snapshot) return;
    try {
      await completeGuidedDrillSession(user.id, guidedSessionKey, snapshot);
    } catch (err) {
      // Non-fatal: the attempts are already saved; this only affects resume.
      console.error('[drill:guided:complete] resume row write failed', {
        userId: user.id,
        key: guidedSessionKey,
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
    const attemptsWithTiming: DrillSession['attempts'] = new Map(session.attempts);
    for (const [qid, attempt] of attemptsWithTiming) {
      const totalTimeMs = questionTimer.current.getMetrics(qid).totalTimeMs;
      attemptsWithTiming.set(qid, { ...attempt, timeMs: totalTimeMs });
    }

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

    // Homework assignment: write status=completed + score.
    if (assignmentId && user) {
      const total = session.questionQueue.length;
      const correct = Array.from(session.attempts.values()).filter(
        (a) => a.selectedAnswer && a.correct,
      ).length;
      const score = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from('homework_assignments')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            score,
          })
          .eq('id', assignmentId)
          .eq('student_id', user.id);
        if (error) throw error;
        await completeLinkedTodo(assignmentId);
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

    if (guidedAssignmentId && user) {
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
    }

    // Show results
    setPostSectionScreen('score-report');
  };

  const handleNext = () => {
    if (!session) return;

    if (session.mode === 'adaptive') {
      if (!currentQuestion || !session.attempts.has(currentQuestion.qid)) {
        toast.error("Save this answer before moving to the next Smart Drill question.");
        return;
      }
      // Increment advanceToken to trigger adaptive question selection
      setAdvanceToken(t => t + 1);
    } else {
      // Move to next in queue
      if (session.currentIndex < session.questionQueue.length - 1) {
        setSession(prev => prev ? {
          ...prev,
          currentIndex: prev.currentIndex + 1,
        } : prev);
      } else {
        // Reached the end - show results
        handleFinishSection();
      }
    }
  };

  const handlePrevious = () => {
    if (!session || session.mode === 'adaptive') return;
    
    // Move to previous in queue
    if (session.currentIndex > 0) {
      setSession({
        ...session,
        currentIndex: session.currentIndex - 1,
      });
    }
  };

  const handleFinishSection = async (
    attemptsOverride?: DrillSession['attempts'],
    options?: { returnToAfterFinish?: string },
  ) => {
    if (!session) return;

    // Stop the section timer so it does not keep ticking through
    // SectionComplete / blind review / LRSectionResults.
    if (timer) timer.pause();

    // Flush final-question rrweb events before tearing down the session view
    if (currentQuestion) await flushReplay(currentQuestion.qid, session.mode);

    // Evaluate correctness for all attempted questions
    const updatedAttempts = new Map(attemptsOverride ?? session.attempts);
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
    const updatedSession = {
      ...session,
      attempts: updatedAttempts,
    };

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

    // Build automatic review set based on rules (using updated session)
    const reviewSet = buildAutoReviewSet(updatedSession);
    setAutoReviewQids(reviewSet);

    // Update session state
    setSession(updatedSession);

    if (options?.returnToAfterFinish) {
      navigate(options.returnToAfterFinish);
      return;
    }

    // Show section complete screen
    setPostSectionScreen('complete');
  };

  // Build automatic review set: all wrong + all flagged + all unanswered + 2 longest-time + 3 hard-right
  const buildAutoReviewSet = (session: DrillSession): string[] => {
    const qids: string[] = [];
    const wrongQids: string[] = [];
    const unansweredQids: string[] = [];
    const flaggedQids: string[] = [];
    const correctQids: { qid: string; timeMs: number; difficulty: number }[] = [];
    
    // Check all questions in the queue
    for (const qid of session.questionQueue) {
      const attempt = session.attempts.get(qid);
      
      if (!attempt) {
        // Unanswered questions are treated as wrong
        unansweredQids.push(qid);
      } else if (!attempt.correct) {
        wrongQids.push(qid);
      } else {
        const question = questionBank.getQuestion(qid);
        if (question) {
          correctQids.push({ qid, timeMs: attempt.timeMs, difficulty: question.difficulty });
        }
      }
      
      if (attempt?.brMarked) {
        flaggedQids.push(qid);
      }
    }
    
    // Add all wrong and unanswered
    qids.push(...wrongQids, ...unansweredQids);
    
    // Add all flagged (if not already added)
    for (const qid of flaggedQids) {
      if (!qids.includes(qid)) qids.push(qid);
    }
    
    // If no flagged, add 2 longest-time correct answers
    if (flaggedQids.length === 0) {
      const longestTime = [...correctQids]
        .filter(c => !qids.includes(c.qid))
        .sort((a, b) => b.timeMs - a.timeMs)
        .slice(0, 2);
      qids.push(...longestTime.map(c => c.qid));
    }
    
    // Add 3 hard-right (difficulty 4-5, correct)
    const hardRight = [...correctQids]
      .filter(c => !qids.includes(c.qid) && c.difficulty >= 4)
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, 3);
    qids.push(...hardRight.map(c => c.qid));
    
    return qids;
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
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
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

  const handleTextSelection = (e: React.MouseEvent, section: 'stimulus' | 'stem') => {
    if (highlightMode === 'none') return;
    
    const container = e.currentTarget as HTMLElement;
    const selection = captureTextSelection(container);
    
    if (!selection || !currentQuestion) return;
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    
    // Save to history before making changes
    const MAX_HISTORY = 20;
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-MAX_HISTORY);
    });
    
    if (highlightMode === 'erase') {
      // Eraser mode: remove overlapping portions
      const updatedHighlights = currentHighlights.filter(h => {
        // Keep highlights from different sections
        if (h.section !== section) return true;
        
        // Check for overlap
        return h.end <= selection.start || h.start >= selection.end;
      }).concat(
        // Split and keep non-overlapping portions
        currentHighlights
          .filter(h => h.section === section && h.start < selection.end && h.end > selection.start)
          .flatMap(h => {
            const parts: Highlight[] = [];
            
            // Keep the part before the erased selection
            if (h.start < selection.start) {
              parts.push({
                ...h,
                id: `${h.id}-before`,
                end: selection.start,
                text: h.text.slice(0, selection.start - h.start)
              });
            }
            
            // Keep the part after the erased selection
            if (h.end > selection.end) {
              parts.push({
                ...h,
                id: `${h.id}-after`,
                start: selection.end,
                text: h.text.slice(selection.end - h.start)
              });
            }
            
            return parts;
          })
      );
      
      setHighlights(new Map(highlights.set(currentQuestion.qid, updatedHighlights)));
    } else {
      // Highlight mode: add new highlight
      const newHighlight: Highlight = {
        id: crypto.randomUUID(),
        start: selection.start,
        end: selection.end,
        text: selection.text,
        color: highlightMode as HighlightColor,
        section
      };
      
      // Use replaceOverlappingHighlights to implement "last action wins"
      const updatedHighlights = replaceOverlappingHighlights(currentHighlights, newHighlight);
      
      console.log('✓ Highlight created:', {
        color: highlightMode,
        text: selection.text.substring(0, 30) + '...',
        totalHighlights: updatedHighlights.length
      });
      
      setHighlights(new Map(highlights.set(currentQuestion.qid, updatedHighlights)));
    }
    
    // Clear selection
    window.getSelection()?.removeAllRanges();
  };

  const handleHighlightClick = (highlightId: string) => {
    if (highlightMode !== 'erase' || !currentQuestion) return;
    
    // Save to history before erasing
    setHighlightHistory(prev => {
      const newHistory = [...prev, new Map(highlights)];
      return newHistory.slice(-20);
    });
    
    const currentHighlights = highlights.get(currentQuestion.qid) || [];
    const updated = currentHighlights.filter(h => h.id !== highlightId);
    
    setHighlights(new Map(highlights.set(currentQuestion.qid, updated)));
  };

  const handleUndo = () => {
    if (highlightHistory.length === 0) return;
    
    const previousState = highlightHistory[highlightHistory.length - 1];
    setHighlights(new Map(previousState));
    setHighlightHistory(prev => prev.slice(0, -1));
  };

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
  const isGuidedDrillReturn = !!returnTo && returnTo.startsWith('/guided');
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
    !!currentQuestion && !!showAnswerRevealed.get(currentQuestion.qid);

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
    currentRevealed,
  );

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

  const { openLetters, toggleLetter } = useInlineDisclosures({
    questionKey: currentQuestion?.qid,
    revealed: currentRevealed,
    correctLetter: currentQuestion?.correctAnswer,
    selectedLetter: selectedAnswer,
  });



  // Handle session completion and post-section flow
  // Show post-section screens (must be BEFORE the session/currentQuestion check)
  if (postSectionScreen === 'complete') {
    return (
      <SectionComplete
        onBlindReview={() => setPostSectionScreen('review')}
        onSeeResults={() => setPostSectionScreen('score-report')}
      />
    );
  }
  
  if (postSectionScreen === 'review' && session) {
    return (
      <EnhancedBlindReview
        session={session}
        reviewQids={autoReviewQids}
        onComplete={async (results: DrillBlindReviewResult[]) => {
          setBrResults(results);
          setPostSectionScreen('score-report');
          await saveBRResults(session, results);
        }}
        onBack={() => setPostSectionScreen('complete')}
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
            setAutoReviewQids(wrongQids);
            setPostSectionScreen('review');
          }}
          onReviewAll={() => {
            setAutoReviewQids(session.questionQueue);
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
          onBack={() => navigate(drillReturnTo || '/classroom')}
        />
      );
    }

    // Fall back to old ScoreReport for other modes
    return (
      <ScoreReport
        session={session}
        onStartReview={() => setPostSectionScreen('review')}
        onFullReview={() => {
          setAutoReviewQids(session.questionQueue);
          setPostSectionScreen('review');
        }}
        onBack={() => navigate(drillReturnTo || '/classroom')}
      />
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
          <h2 className="text-xl font-semibold mb-3">No questions available</h2>
          <p className="text-sm text-muted-foreground mb-6">{bootError}</p>
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
    if (!currentQuestion) return;
    setTutorQuestionSnapshot(currentQuestion);
    setTutorUserAnswerSnapshot(selectedAnswer || '');
    setTutorChatMode(resolveTutorMode({
      userAnswer: selectedAnswer,
      answerRevealed: !!showAnswerRevealed.get(currentQuestion.qid),
    }));
    setTutorInitialTab(tab);
    setTutorChatOpen(true);
  };

  // Reveal the correct answer in place, without opening any panel. Mirrors the
  // auto-reveal toggle's effect for a student who left it off.
  const revealAnswerForCurrent = () => {
    if (!currentQuestion) return;
    setShowAnswerRevealed(prev => new Map(prev).set(currentQuestion.qid, true));
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
  const handleRevealRequest = (attempted: boolean) => {
    if (attempted) {
      revealAnswerForCurrent();
      return;
    }
    setRevealConfirmOpen(true);
  };

  const confirmUnscoredReveal = () => {
    if (currentQuestion) {
      setUnscoredQids((prev) => new Set(prev).add(currentQuestion.qid));
    }
    revealAnswerForCurrent();
    setRevealConfirmOpen(false);
  };




  const renderTutorOverlay = () => (
    <>
      {/* Floating Tutor Card — fixed bottom-left, rendered at page root so fixed positioning isn't clipped */}
      {tutorChatOpen && tutorQuestionSnapshot && (
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
    voiceCoachRevealed && !voiceCoachOpen && !tutorChatOpen ? (
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
  // Opt-in via /drill?layout=official. Reuses every existing handler so the
  // attempt save / WAJ / blind review / section-complete flow is identical
  // to the default layout. Pure visual swap.
  const layoutParam = searchParams.get('layout');
  // Official testing-format layout is now the default for every drill mode
  // (smart-drill, type-drill, full-section, practice-set, review, etc.).
  // Pass ?layout=classic to opt out.
  const isOfficialLayout = layoutParam !== 'classic';
  if (isOfficialLayout && session && currentQuestion) {
    const isFullSection = session.mode === 'full-section';
    const isAdaptiveMode = session.mode === 'adaptive';
    const isGuidedDrillRunner = !!guidedAssignmentId || !!state.isGuidedDrill || (!!returnTo && returnTo.startsWith('/guided'));
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
    const attemptedQids = new Set<string>();
    for (const [qid, attempt] of session.attempts) {
      if (attempt.selectedAnswer) attemptedQids.add(qid);
    }
    const handleTogglePauseClick = timer
      ? () => {
          if (timer.isPaused) timer.resume();
          else timer.pause();
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
      revealed: currentRevealed,
      activeStyle,
      onStyleChange: setActiveStyle,
      onAskTutor: () => openTutorForCurrent(),
    };
    const drawerSimilar: DrillSimilarContext = {
      qid: currentQuestion.qid,
      qtype: currentQuestion.qtype,
      onJumpToQuestion: jumpToQuestion,
    };
    const requiresAnswerBeforeNext = !isFullSection && !isPracticeSetMode;
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
        }
      }
      if (isPracticeSetMode) {
        handlePracticeSetNext();
      } else if (isAdaptiveMode) {
        setAdvanceToken(t => t + 1);
      } else if (!isAdaptiveMode && session.currentIndex >= session.questionQueue.length - 1) {
        await handleFinishSection(committedAttempts ?? session.attempts);
      } else {
        handleNext();
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
    const officialIsPaused = !!timer?.isPaused && !isEndingBootcampPracticeDrill;

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
          onResume={timer?.resume}
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
          header={
            <OfficialSessionStrip
              breadcrumbs={officialBreadcrumbs}
              isPaused={officialIsPaused}
              onTogglePause={handleTogglePauseClick}
              pauseNoun={isFullSection ? 'Section' : 'Question'}
              completeLabel={isMcPractice ? 'End Drill' : undefined}
              onComplete={
                usesSmartChrome
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
              showAnswerVisible
              onShowAnswer={() => handleRevealRequest(currentAttempted)}
              showAnswerDisabled={!!timer?.isPaused || (isFullSection && !currentAttempted)}
              onExplanation={() => toggleDrawerOn('explanation')}
              explanationDisabled={!!timer?.isPaused || !currentRevealed}
              onOpenHelp={() => setHelpOpen(true)}
            />
          }
        >
          <OfficialDrillToolbar
            highlightMode={highlightMode}
            setHighlightMode={setHighlightMode}
            timerLabel={timer?.label ?? ""}
            timerMode={timer?.mode}
            searchTerm={officialSearchTerm}
            setSearchTerm={setOfficialSearchTerm}
            fontScale={officialFontScale}
            setFontScale={setOfficialFontScale}
            notesButtonVisible={usesSmartChrome}
            notesOpen={notesOpen}
            onToggleNotes={toggleNotesPanel}
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
            inlineNotes={inlineNotes}
            openInlineLetters={openLetters}
            onToggleInlineLetter={toggleLetter}
            highlights={highlights.get(currentQuestion.qid) || []}
            highlightMode={highlightMode}
            searchTerm={officialSearchTerm}
            fontScale={officialFontScale}
            onAnswerSelect={handleAnswerSelect}
            onEliminate={handleEliminateAnswer}
            onToggleFlag={handleToggleFlag}
            onTextSelection={handleTextSelection}
            onHighlightClick={handleHighlightClick}
          />
          {renderVoiceCoachChip()}
          {isAdaptiveMode ? (
            <OfficialSmartDrillBar
              autoReveal={autoReveal}
              onAutoRevealChange={handleAutoRevealChange}
              primaryAction={currentAttempted || currentUnscored ? 'next' : 'submit'}
              primaryDisabled={!selectedAnswer || !!timer?.isPaused}
              onSubmit={() => {
                void commitCurrentAdaptiveAnswer({
                  revealAfterSave: autoReveal,
                  advanceAfterSave: false,
                });
              }}
              onNext={() => setAdvanceToken(t => t + 1)}
              onSkip={() => {
                setSkippedQids(prev => new Set(prev).add(currentQuestion.qid));
                setAdvanceToken(t => t + 1);
              }}
              skipDisabled={currentAttempted || !!timer?.isPaused}
              onEnd={() => handleNavigation('/classroom')}
              disabled={!!timer?.isPaused}
            />
          ) : (
            // Same chrome as the adaptive Smart Drill, but driven by the fixed
            // queue the student hand-picked from the Smart LR Drill card. Submit
            // saves and reveals in place (honoring the auto-reveal toggle); Next
            // walks the queue via the shared officialNext; Skip advances past the
            // answer gate; End finishes the section.
            <OfficialSmartDrillBar
              autoReveal={autoReveal}
              onAutoRevealChange={handleAutoRevealChange}
              primaryAction={currentAttempted || currentUnscored ? 'next' : 'submit'}
              primaryDisabled={!selectedAnswer || !!timer?.isPaused}
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
              onSkip={() => {
                if (isPracticeSetMode) {
                  handlePracticeSetNext();
                } else if (session.currentIndex >= session.questionQueue.length - 1) {
                  void handleFinishSection();
                } else {
                  handleNext();
                }
              }}
              skipDisabled={currentAttempted || !!timer?.isPaused}
              onEnd={() => handleNavigation('/classroom/drill')}
              disabled={!!timer?.isPaused}
            />
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
          canUndo={highlightHistory.length > 0}
          hasTimer={hasTimer}
          timerLabel={timer?.label}
          timerPaused={timer?.isPaused}
          onTimerToggle={timer ? (timer.isPaused ? timer.resume : timer.pause) : undefined}
          showTutorToggle={session?.mode === 'adaptive'}
          tutorMode={tutorMode}
          onTutorModeChange={(next) => {
            setTutorMode(next);
            if (!next) {
              setTutorChatOpen(false);
            }
          }}
          onOpenTutor={() => {
            if (!currentQuestion) return;
            setTutorQuestionSnapshot(currentQuestion);
            setTutorUserAnswerSnapshot(selectedAnswer);
            setTutorChatMode(resolveTutorMode({
              userAnswer: selectedAnswer,
              answerRevealed: !!showAnswerRevealed.get(currentQuestion.qid),
            }));
            setTutorChatOpen(true);
          }}
          onOpenInfo={guidedSet?.is_guided_set ? () => setGuidedInfoOpen(true) : undefined}
        />
        <GuidedDrillIntroModal
          set={guidedSet?.is_guided_set ? guidedSet : null}
          open={guidedInfoOpen}
          onOpenChange={setGuidedInfoOpen}
        />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full max-w-7xl mx-auto">
        {poolExhausted ? (
          <div className="flex-1 overflow-y-auto p-8">
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
          <>
        {/* Left Panel — Stimulus */}
        <div className="flex-1 lg:max-h-full bg-white flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8">
              {currentQuestion.stimulus && (() => {
                const fullText = normalizeText(currentQuestion.stimulus);
                const stimulusHighlights = highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stimulus') || [];
                return (
                  <div
                    className={cn(
                      "prose prose-lg max-w-none",
                      "text-[19px] leading-[1.7] text-neutral-900",
                      highlightMode !== 'none' ? 'select-text cursor-text' : 'select-none cursor-default'
                    )}
                    onMouseUp={(e) => handleTextSelection(e, 'stimulus')}
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

        {/* Right Panel - Question & Answers */}
        <div className="flex-1 overflow-y-auto lg:border-l border-border lg:max-h-full bg-white">
          <div className="p-6 sm:p-8">
            {/* Question Stem */}
            <div className="mb-4">
              <div
                className={cn(
                  "text-[19px] font-semibold text-neutral-900 leading-[1.6] tracking-tight",
                  highlightMode !== 'none' ? 'select-text cursor-text' : 'select-none cursor-default'
                )}
                onMouseUp={(e) => handleTextSelection(e, 'stem')}
              >
                <HighlightedText
                  text={currentQuestion.questionStem}
                  highlights={highlights.get(currentQuestion.qid)?.filter(h => h.section === 'stem') || []}
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
                      onClick={handleNext}
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
        </>
        )}
      </div>

      {/* Sticky Bottom Navigation Bar - Section & Practice-Set Modes */}
      {(session.mode === 'full-section' || isPracticeSetMode) && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/98 backdrop-blur-sm border-t border-white/[0.06] shadow-lg z-50 animate-slide-up">
          <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-6">
            {/* Previous Button */}
            <Button
              variant="ghost"
              size="lg"
              onClick={isPracticeSetMode ? handlePracticeSetPrevious : handlePrevious}
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
                  
                  return (
                    <button
                      key={qid}
                      onClick={() => {
                        if (!timer?.isPaused) {
                          // Pause timer on current question before switching
                          if (isPracticeSetMode && currentQuestion) {
                            questionTimer.current.pause();
                          }
                          setSession({ ...session, currentIndex: index });
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
                      title={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next Button */}
            <Button
              variant="default"
              size="lg"
              onClick={isPracticeSetMode ? handlePracticeSetNext : handleNext}
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = React.useMemo<DrillRouteState>(
    () => getResolvedDrillRouteState(searchParams, location.state),
    [searchParams, location.state],
  );
  const timerConfig = React.useMemo(() => getTimerConfigForDrillRoute(state), [state]);

  if (timerConfig) {
    return (
      <TimerProvider mode={timerConfig.mode} durationMs={timerConfig.durationMs}>
        <DrillContent />
      </TimerProvider>
    );
  }

  return <DrillContent />;
}
