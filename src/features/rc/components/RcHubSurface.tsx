import { RcSavedSetsPanel } from './RcSavedSetsPanel';
import { getRcSavedSet } from '../api/rcSavedSets';
import type { RcSavedPayload } from '../lib/rcSavedSetCodec';
import * as React from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { ProfileTimingPreference } from '@/components/classroom/account/ProfileTimingPreference';
import { profilePassageSeconds } from '@/lib/studySettings';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { loadAllIndexPassages, loadPassages } from '../lib/rcBank';
import { RcExposurePreview } from './RcExposurePreview';
import { RcAdaptiveSummary } from './RcAdaptiveSummary';
import { buildRcAdaptiveSummary } from '../lib/rcAdaptiveSummary';
import { getRcExposureHistory } from '../api/rcExposure';
import {
  RC_ADAPTIVE_LABEL,
  formatPassageStatusLabel,
  passageStatus,
  selectPassages,
  type RcIndexPassageWithPt,
  type RcSelectionFilters,
  type RcStatusFilter,
} from '../lib/rcAdaptive';
import {
  createSession,
  abandonSession,
  getRcHistorySnapshot,
  getSession,
  getSessionAttempts,
  listSessions,
} from '../api/rcProgress';
import {
  RC_FORMATS,
  RC_FRAMEWORKS,
  RC_PREPTEST_DEFAULT_MAX,
  RC_PREPTEST_MAX,
  RC_PREPTEST_MIN,
  RC_STANDARD_SECONDS_PER_PASSAGE,
  RC_TOPICS,
  type RcDrillConfig,
  type RcDrillSession,
  type RcQuestionHistory,
  type RcRevealMode,
  type RcPassage,
  type RcTrainingModes,
} from '../lib/rcTypes';
import {
  formatPace,
  parseCustomPace,
  plural,
  summarizeRcBuild,
} from '../lib/rcBuilderSummary';
import { normalizeRcSearchText, parseRcSearchAddress } from '../lib/rcSearch';
import '../rc.css';
import '../rcTypography.css';
import '../rcBuilderRefinement.css';
import { canonicalRcSection, manualSectionsEnabled, newManualSectionHref, timedSectionResumeHref } from '@/lib/timedSectionAdoption';
import { canRevealRcResults } from '../lib/rcResultsReveal';

const mmss = formatPace;
const TIMING_DEFAULT_LOADED_NOTICE = 'Your timing default was loaded from this device. Changes below apply to this drill unless you save a new default.';

const REVEAL_OPTIONS: { id: RcRevealMode; label: string; caption: string }[] = [
  {
    id: 'per_passage',
    label: 'After each passage',
    caption: 'Finish a passage, then walk through it',
  },
  { id: 'end_of_set', label: 'At the end', caption: 'Finish the drill, then review' },
  {
    id: 'per_question',
    label: 'After each question',
    caption: 'Check yourself question by question',
  },
];

const STATUS_OPTIONS: { id: RcStatusFilter; label: string }[] = [
  { id: 'any', label: 'Any' },
  { id: 'fresh', label: 'Not attempted' },
  { id: 'strict_no_exposure', label: 'No recorded exposure' },
  { id: 'incorrect_before', label: 'Incorrect before' },
  { id: 'incorrect_last', label: 'Incorrect on last try' },
];

const DEFAULT_FILTERS: RcSelectionFilters = {
  topics: [],
  formats: [],
  frameworks: [],
  families: [],
  difficulties: [],
  status: 'fresh',
  preptestMin: RC_PREPTEST_MIN,
  preptestMax: RC_PREPTEST_DEFAULT_MAX,
};

export interface RcHubSurfaceProps {
  /**
   * Mounted inside the drill hub's observatory surface rather than standing on
   * its own at /rc. Drops the page title and the search chip — the hub's hero
   * and practice bay already say where you are — and hands styling to the dark
   * `.rc-embedded` override layer.
   */
  embedded?: boolean;
  /** The drill history. Off when the hub's practice bay is already showing it. */
  showHistory?: boolean;
  /** Renders a Cancel control. Present when the surface is a launcher stage. */
  onCancel?: () => void;
  /** A manual-entry shortcut opens the passage picker once, after linked settings load. */
  openPickerOnEntry?: boolean;
}

interface PendingLaunch { id: string; actorId: string; ids: number[]; config: RcDrillConfig; back?: string; replace?: boolean }
/** Passages the manual picker draws at once; the rest load on request. */
const RC_PICKER_PAGE = 12;

function pendingKey(actorId: string) { return `lsatu:rc-pending-launch:v1:${actorId}`; }
function readPending(actorId: string | null): PendingLaunch | null {
  if (!actorId) return null;
  const raw = sessionStorage.getItem(pendingKey(actorId));
  if (!raw) return null;
  const value = JSON.parse(raw) as PendingLaunch;
  if (!value || value.actorId !== actorId || typeof value.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(value.id)
    || !Array.isArray(value.ids) || value.ids.length === 0 || !value.ids.every(id => Number.isSafeInteger(id) && id > 0)
    || new Set(value.ids).size !== value.ids.length
    || !value.config || !['manual', 'adaptive', 'assignment'].includes(value.config.source)
    || !['per_passage', 'per_question', 'end_of_set'].includes(value.config.reveal)
    || !value.config.timing || !['unlimited', 'per_passage_budget'].includes(value.config.timing.mode)
    || value.config.timing.mode === 'per_passage_budget' && (!Number.isFinite(value.config.timing.secondsPerPassage) || value.config.timing.secondsPerPassage <= 0)
    || value.config.practiceTestRunId !== undefined && typeof value.config.practiceTestRunId !== 'string'
    || value.config.practiceTestLegIndex !== undefined && (!Number.isSafeInteger(value.config.practiceTestLegIndex) || value.config.practiceTestLegIndex < 0)
    || value.back !== undefined && safeReturnTo(value.back) !== value.back || value.replace !== undefined && typeof value.replace !== 'boolean') {
    throw new Error('The pending reading drill could not be verified.');
  }
  return value;
}

/**
 * Only same-origin paths are honoured as a return target. A `returnTo` comes
 * off the query string, so an absolute or protocol-relative one would turn an
 * assignment link into an open redirect.
 */
function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return undefined;
  return value;
}

/**
 * The Reading Comprehension builder: passages, timing, reveal, filters,
 * hand-pick, and Start. One component, two mounts — the standalone /rc page and
 * the drill hub's RC section — so the two can never drift into two products
 * the way RcSearch and the LR picker did.
 */
export function RcHubSurface({ embedded = false, showHistory = true, onCancel, openPickerOnEntry = false }: RcHubSurfaceProps) {
  const { user } = useAuth();
  return <ActorRcHubSurface key={user?.id ?? 'signed-out'} {...{ embedded, showHistory, onCancel, openPickerOnEntry }} actorId={user?.id ?? null} />;
}
function ActorRcHubSurface({ embedded = false, showHistory = true, onCancel, openPickerOnEntry = false, actorId }: RcHubSurfaceProps & { actorId: string | null }) {
  const navigate = useNavigate();
  const { settings, profileTimingMode, profileTimingStatus } = useUserSettings();
  const profilePace = profilePassageSeconds(settings.defaultTimingMode) ?? RC_STANDARD_SECONDS_PER_PASSAGE;
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  // Mode is navigation state. It must not reapply linked drill settings or
  // reload a fixed saved selection when switching between local drafts.
  const drillQuery = new URLSearchParams(params);
  drillQuery.delete('builder');
  const drillQueryKey = drillQuery.toString();

  const [passages, setPassages] = React.useState<RcIndexPassageWithPt[]>([]);
  const [history, setHistory] = React.useState<RcQuestionHistory>(new Map());
  const [displayHistory, setDisplayHistory] = React.useState<RcQuestionHistory>(new Map());
  const [hiddenResults, setHiddenResults] = React.useState(false);
  const [exposures, setExposures] = React.useState<Set<number>>(new Set());
  const [exposureStatus, setExposureStatus] = React.useState<'loading' | 'ready' | 'failed'>('loading');
  const [sessions, setSessions] = React.useState<RcDrillSession[]>([]);
  const [scores, setScores] = React.useState<Map<string, { correct: number; total: number }>>(
    new Map(),
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [historyStatus, setHistoryStatus] = React.useState<'loading' | 'ready' | 'failed'>('loading');
  const [eligibilityRevision, refreshEligibility] = React.useReducer((n: number) => n + 1, 0);
  const [indexStatus, setIndexStatus] = React.useState<'loading' | 'ready' | 'failed'>('loading');
  const [loadAttempt, retryLoad] = React.useReducer((n: number) => n + 1, 0);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [previewReveals, setPreviewReveals] = React.useState<Set<string>>(() => new Set());
  const [reviewing, setReviewing] = React.useState(false);
  const pickButton = React.useRef<HTMLButtonElement | null>(null);
  const entryPickerOpened = React.useRef(false);
  const [count, setCount] = React.useState(1);
  const [timing, setTiming] = React.useState<'untimed' | 'standard' | 'custom'>('untimed');
  const [useProfilePace, setUseProfilePace] = React.useState(true);
  const timingEdited = React.useRef(false);
  const [customSeconds, setCustomSeconds] = React.useState(RC_STANDARD_SECONDS_PER_PASSAGE);
  /* The custom field is controlled text so an invalid entry stays on screen,
     explained, instead of being dropped on blur while the old value launches. */
  const [customText, setCustomText] = React.useState(() => mmss(RC_STANDARD_SECONDS_PER_PASSAGE));
  const [reveal, setReveal] = React.useState<RcRevealMode>('per_passage');
  const [training, setTraining] = React.useState<RcTrainingModes>({ anticipation: false, lineByLine: false });
  const [trainingDraft, setTrainingDraft] = React.useState<RcTrainingModes>({ anticipation: false, lineByLine: false });
  const [handPickOpen, setHandPickOpen] = React.useState(false);
  const [filterDrafts, setFilterDrafts] = React.useState({ automatic: DEFAULT_FILTERS, manual: DEFAULT_FILTERS });
  const filters = filterDrafts[handPickOpen ? 'manual' : 'automatic'];
  type RangeDraft = { min: string; max: string } | null;
  const [rangeDrafts, setRangeDrafts] = React.useState<{ automatic: RangeDraft; manual: RangeDraft }>({ automatic: null, manual: null });
  const rangeDraft = rangeDrafts[handPickOpen ? 'manual' : 'automatic'];
  const switchSelectionMode = (manual: boolean) => {
    setHandPickOpen(manual);
    if (location.pathname === '/practice/drills') {
      const next = new URLSearchParams(params);
      next.set('builder', manual ? 'manual' : 'automatic');
      setParams(next, { replace: true, state: location.state });
    }
  };
  const routeMode = params.get('builder');
  React.useEffect(() => {
    if (routeMode === 'manual' || routeMode === 'automatic') setHandPickOpen(routeMode === 'manual');
  }, [routeMode]);
  const [handPicked, setHandPicked] = React.useState<number[]>([]);
  const [lookupAddress, setLookupAddress] = React.useState({ pt: '', section: '', passage: '' });
  // Direct lookup temporarily overrides either builder draft. Clearing it restores
  // the prior draft and its reviewed IDs, rather than rerolling automatic work.
  const lookupSnapshot = React.useRef<typeof selectedSet | undefined>(undefined);
  const lookupPassage = passages.find(p => String(p.preptest) === lookupAddress.pt && String(p.section) === lookupAddress.section && String(p.setNumber) === lookupAddress.passage && p.questionCount > 0);
  const lookupActive = lookupAddress.pt !== '';
  const exactMode = lookupActive || handPickOpen;
  const exactIds = lookupActive ? lookupPassage ? [lookupPassage.passageId] : [] : handPicked;
  const updateLookup = (address: typeof lookupAddress) => {
    if (!lookupActive && address.pt) lookupSnapshot.current = selectedSet;
    if (!address.pt) {
      if (lookupSnapshot.current !== undefined) setSelectedSet(lookupSnapshot.current);
      lookupSnapshot.current = undefined;
    }
    setLookupAddress(address);
  };
  React.useEffect(() => {
    setLookupAddress({ pt: '', section: '', passage: '' });
    lookupSnapshot.current = undefined;
  }, [drillQueryKey]);
  type BuilderDrawer = { kind: 'filters' | 'pick' | 'practice'; mode: 'automatic' | 'manual'; filters: RcSelectionFilters; range: RangeDraft; ids: number[] };
  const [drawerState, setDrawer] = React.useState<BuilderDrawer | null>(null);
  const drawerMethods = React.useRef<Partial<Record<'automatic' | 'manual', BuilderDrawer>>>({});
  const lastDrawer = React.useRef<BuilderDrawer | null>(null);
  if (drawerState) lastDrawer.current = drawerState;
  const drawer = drawerState ?? lastDrawer.current;
  const drawerOpener = React.useRef<HTMLElement | null>(null);
  const announcedIds = React.useRef<number[]>([]);
  const fixedSelectionFilters = (value: RcSelectionFilters): RcSelectionFilters => ({ ...DEFAULT_FILTERS, status: value.status === 'strict_no_exposure' ? 'strict_no_exposure' : 'any', includeUnknownExposure: value.includeUnknownExposure });
  const cloneFilters = (value: RcSelectionFilters): RcSelectionFilters => ({ ...value, topics: [...value.topics], formats: [...value.formats], frameworks: [...value.frameworks], families: [...value.families], difficulties: [...value.difficulties] });
  const openDrawer = (kind: BuilderDrawer['kind'], opener: HTMLElement) => {
    // Any intentional open consumes entry intent, including before the route changes.
    entryPickerOpened.current = true;
    setTrainingDraft({ ...training });
    const mode = kind === 'pick' || handPickOpen ? 'manual' : 'automatic';
    drawerOpener.current = opener;
    announcedIds.current = [...handPicked];
    setSelectionAnnouncement('');
    setPickerLimit(RC_PICKER_PAGE);
    const draft: BuilderDrawer = { kind: lookupActive ? 'practice' : kind, mode, filters: cloneFilters(filterDrafts[mode]), range: rangeDrafts[mode] ? { ...rangeDrafts[mode]! } : null, ids: [...handPicked] };
    drawerMethods.current = { [mode]: draft };
    setDrawer(draft);
  };
  const changeDrawerMethod = (mode: 'automatic' | 'manual') => setDrawer(previous => {
    if (!previous) return previous;
    if (previous.mode === mode) return mode === 'manual' ? { ...previous, kind: 'pick' } : previous;
    drawerMethods.current[previous.mode] = previous;
    const saved = drawerMethods.current[mode];
    return saved ? { ...saved, kind: mode === 'manual' ? 'pick' : 'filters' } : { kind: mode === 'manual' ? 'pick' : 'filters', mode, filters: cloneFilters(filterDrafts[mode]), range: rangeDrafts[mode] ? { ...rangeDrafts[mode]! } : null, ids: [...handPicked] };
  });
  const [selectionAnnouncement, setSelectionAnnouncement] = React.useState('');
  React.useEffect(() => {
    if (drawerState?.kind !== 'pick') { setSelectionAnnouncement(''); return; }
    if (announcedIds.current.join(',') === drawerState.ids.join(',')) return;
    announcedIds.current = [...drawerState.ids];
    const titles = drawerState.ids.map(id => passages.find(passage => passage.passageId === id)?.title || `Passage ${id}`);
    setSelectionAnnouncement(`${drawerState.ids.length} ${drawerState.ids.length === 1 ? 'passage' : 'passages'} selected${titles.length ? `. Order: ${titles.join(', ')}` : ''}`);
  }, [drawerState?.kind, drawerState?.ids, passages]);
  const [search, setSearch] = React.useState('');
  const [pickerSort, setPickerSort] = React.useState<'address' | 'difficulty' | 'title'>('address');
  const [timingDefaultNotice, setTimingDefaultNotice] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [autoStart, setAutoStart] = React.useState(false);
  const [inspecting, setInspecting] = React.useState(false);
  const [restoredSavedQuery, setRestoredSavedQuery] = React.useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = React.useState<RcSavedPayload | null>(null);
  const [selectedSet, setSelectedSet] = React.useState<{
    key: string;
    previewId: number;
    ids: number[];
    passages: RcPassage[];
  } | null>(null);
  const inspectRequest = React.useRef(0);
  /* Synchronous: a second click lands before React re-renders the disabled
     button, and two Starts would create two sessions for one drill. */
  const startingRef = React.useRef(false);
  /**
   * A Start whose create call failed without saying whether the row landed.
   * The next Start reads the account's sessions first, so one click can never
   * become two drills.
   */
  const [pendingLoad] = React.useState(() => { try { return { request: readPending(actorId), error: null }; } catch { return { request: null, error: 'The pending reading drill could not be verified. Reload before starting another drill.' }; } });
  const uncertainStart = React.useRef<PendingLaunch | null>(pendingLoad.request);
  const [recoveryPending, setRecoveryPending] = React.useState<PendingLaunch | null>(pendingLoad.request);
  /** The inspected-set key whose smaller-than-requested size was accepted. */
  const [acceptedShortfall, setAcceptedShortfall] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setHistoryStatus('loading');
    setExposureStatus('loading');
    setIndexStatus('loading');
    (async () => {
      try {
        const all = await loadAllIndexPassages();
        if (!cancelled) {
          setPassages(all as RcIndexPassageWithPt[]);
          refreshEligibility();
          setIndexStatus('ready');
        }
      } catch {
        // A retry that fails keeps whatever list an earlier read produced, so
        // hand-picks stay editable; only a first failure leaves it empty.
        if (!cancelled) {
          setLoadError('The passage list could not be loaded.');
          setIndexStatus('failed');
        }
      }
      /* Question history drives the adaptive filters and is always needed.
         The session list is only for the history block, which the embedded
         builder does not draw — and the RC practice bay mounts
         RcSessionHistory for it anyway, so loading it here would fetch the
         same rows twice plus one attempts query per completed drill. */
      const [historyRead, sessionsRead, exposuresRead] = await Promise.allSettled([
        getRcHistorySnapshot(actorId ?? undefined),
        showHistory ? listSessions() : Promise.resolve([] as RcDrillSession[]),
        actorId ? getRcExposureHistory(actorId) : Promise.reject(new Error('Sign in to check exposure.')),
      ]);
      if (cancelled) return;
      if (historyRead.status === 'fulfilled') {
        setHistory(historyRead.value.history);
        setDisplayHistory(historyRead.value.displayHistory);
        setHiddenResults(historyRead.value.hasHiddenGradedResults);
        refreshEligibility();
        setHistoryStatus('ready');
      } else {
        /* A student with no history gets an empty map, not a throw, so a
           throw is a failed read. Fresh and Incorrect would silently treat
           every passage as unseen; say so instead. */
        setHistoryStatus('failed');
      }
      if (exposuresRead.status === 'fulfilled') { setExposures(exposuresRead.value); setExposureStatus('ready'); }
      else setExposureStatus('failed');
      if (sessionsRead.status !== 'fulfilled') return;
      const s = sessionsRead.value;
      setSessions(s);
      try {
        // Scores for the completed drills, counting first attempts only so the
        // history row and the results page can never disagree.
        const done = showHistory ? s.filter((x) => x.status === 'completed') : [];
        const pairs = await Promise.all(
          done.map(async (x) => {
            const rows = (await getSessionAttempts(x.id)).filter((a) => a.isFirstAttempt);
            return [
              x.id,
              { correct: rows.filter((a) => a.isCorrect === true).length, total: rows.length },
            ] as const;
          }),
        );
        if (!cancelled) setScores(new Map(pairs));
      } catch {
        // Scores are decoration on the history rows; the rows still render.
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAttempt]);

  /* --------------------------------------------------- assignment deep link */

  // Keyed on the query string, not a one-shot flag: arriving at /rc with new
  // params from an already-mounted /rc does not remount this route, so a plain
  // "have I run yet" ref would ignore the second link.
  const appliedFor = React.useRef<string | null>(null);
  const localTimingReadFailed = React.useRef(false);
  React.useEffect(() => {
    const key = drillQueryKey;
    if (appliedFor.current === key) return;
    appliedFor.current = key;
    setRangeDrafts({ automatic: null, manual: null });
    localTimingReadFailed.current = false;
    timingEdited.current = false;
    setTraining({ anticipation: false, lineByLine: false });
    setUseProfilePace(!['timing', 'secondsPerPassage', 'saved', 'assignment', 'assignmentId', 'ptRun', 'ptLeg', 'timedSection'].some(name => params.has(name)));
    setTimingDefaultNotice(null);
    setNotice(null);

    const revealParam = params.get('reveal');
    const timingParam = params.get('timing');
    const countParam = Number(params.get('count'));

    // An assignment link fully describes the drill, so anything it leaves out
    // falls back to the builder default rather than to whatever was on screen.
    setReveal(
      revealParam && REVEAL_OPTIONS.some((o) => o.id === revealParam)
        ? (revealParam as RcRevealMode)
        : 'per_passage',
    );
    // A link may name its own per-passage budget — that is how a Full Section
    // asks for the accommodations paces, which are multiples of the standard
    // 8:45 and so cannot be spelled by `timing=standard` alone. Bounded because
    // this arrives from a URL: below a minute is unusable, above an hour a
    // passage is not a clock anyone set on purpose.
    const secondsParam = Number(params.get('secondsPerPassage'));
    if (Number.isFinite(secondsParam) && secondsParam >= 60 && secondsParam <= 3600) {
      setTiming('custom');
      setCustomSeconds(Math.round(secondsParam));
      setCustomText(mmss(Math.round(secondsParam)));
    } else {
      setTiming(timingParam === 'standard' ? 'standard' : 'untimed');
      const explicit = ['timing', 'secondsPerPassage', 'saved', 'assignment', 'assignmentId', 'ptRun', 'ptLeg', 'timedSection'].some(name => params.has(name));
      if (!explicit && actorId) {
        try {
          const stored = localStorage.getItem(`lsatu:rc-timing-default:v1:${actorId}`);
          if (stored) {
            const preference = JSON.parse(stored) as { mode?: unknown; seconds?: unknown };
            if (!['untimed', 'standard', 'custom'].includes(String(preference.mode)) || !Number.isSafeInteger(preference.seconds) || Number(preference.seconds) < 60 || Number(preference.seconds) > 3600) throw new Error('invalid preference');
            setTiming(preference.mode as 'untimed' | 'standard' | 'custom');
            if (preference.mode === 'custom') { setCustomSeconds(Number(preference.seconds)); setCustomText(mmss(Number(preference.seconds))); }
            setTimingDefaultNotice(TIMING_DEFAULT_LOADED_NOTICE);
          }
        } catch {
          localTimingReadFailed.current = true;
          setAutoStart(false);
          setTimingDefaultNotice('Your timing default could not be read on this device. Choose timing for this drill before starting.');
        }
      }
    }

    // The quick-build tile on the drill home sends a passage count and asks the
    // hub to go straight in, so a student who has already made their choices
    // does not land on a builder and press Start a second time.
    if (Number.isFinite(countParam) && countParam >= 1) {
      setCount(Math.min(8, Math.round(countParam)));
    }
    setAutoStart(params.get('start') === '1' && !(localTimingReadFailed.current));
  }, [params, actorId]);

  React.useEffect(() => {
    const explicitTiming = ['timing', 'secondsPerPassage', 'saved', 'assignment', 'assignmentId', 'ptRun', 'ptLeg', 'timedSection'].some(name => params.has(name));
    if (!profileTimingMode || timingEdited.current || explicitTiming) return;
    setUseProfilePace(true);
    setTiming(profileTimingMode === 'unlimited' ? 'untimed' : 'standard');
  }, [profileTimingMode, drillQueryKey]);

  // Apply URL settings before the passage index loads so a later index reply
  // cannot reset reveal/timing choices the student already made. Only linked
  // passage IDs need to wait for the index to validate their membership.
  const selectionAppliedFor = React.useRef<string | null>(null);
  const [selectionQuery, setSelectionQuery] = React.useState<string | null>(null);
  React.useEffect(() => {
    const key = drillQueryKey;
    const ids = params.get('passages');
    if (selectionAppliedFor.current === key || ids !== null && passages.length === 0) return;
    selectionAppliedFor.current = key;
    setSelectionQuery(key);

    if (ids !== null) {
      const wanted = ids.split(',').map((n) => /^\d+$/.test(n.trim()) ? Number(n.trim()) : NaN);
      const known = [...new Set(wanted.filter((id) => Number.isSafeInteger(id) && id > 0
        && passages.some((p) => p.passageId === id && p.questionCount > 0)))];
      if (known.length !== wanted.length) {
        setNotice('The linked passages could not be verified. Choose passages and review your selection below.');
        setAutoStart(false);
      }
      setHandPicked(known);
      setHandPickOpen(known.length > 0);
      setCount(known.length > 0 ? known.length : 1);
    } else {
      /* A new link clears the previous link's passage selection. The manual
         entry opens an empty picker; other links default to automatic. */
      setHandPicked([]);
      setHandPickOpen(params.get('builder') === 'manual');
    }
  }, [params, passages]);

  /* ------------------------------------------------------------ selection */

  const questionIdsByPassage = React.useMemo(() => {
    const map = new Map<number, number[]>();
    for (const p of passages) map.set(p.passageId, p.questionIds ?? []);
    return map;
  }, [passages]);

  const statusOf = React.useCallback(
    (p: RcIndexPassageWithPt) =>
      passageStatus(p, questionIdsByPassage.get(p.passageId) ?? [], displayHistory),
    [questionIdsByPassage, displayHistory],
  );

  // Outcome filters and observable difficulty use released takes only.
  const selectionHistory = displayHistory;
  const selectionPool = React.useMemo(() => filters.status === 'strict_no_exposure'
    ? exposureStatus === 'ready' && filters.includeUnknownExposure === true ? passages.filter(passage => !exposures.has(passage.passageId)) : [] : passages,
  [filters.status, filters.includeUnknownExposure, exposureStatus, passages, exposures]);

  const preview = React.useMemo(
    () =>
      selectPassages({
        pool: selectionPool,
        questionIdsByPassage,
        filters,
        history: selectionHistory,
        count,
        seed: 1,
      }),
    [selectionPool, questionIdsByPassage, filters, selectionHistory, count],
  );

  const drillablePassages = passages.filter((p) => p.questionCount > 0);

  const customPace = parseCustomPace(customText);
  const customPaceError = timing === 'custom' && 'message' in customPace ? customPace.message : null;
  const customInvalid = customPaceError !== null;
  const secondsPerPassage =
    timing === 'standard'
      ? useProfilePace ? profilePace : RC_STANDARD_SECONDS_PER_PASSAGE
      : timing === 'custom'
        ? customSeconds
        : 0;
  /* Empty history is valid only after a successful read. New previews and
     launches wait for both eligibility inputs and a custom pace that parses. */
  const savedQuery = params.has('saved') ? drillQueryKey : null;
  const rangeMin = Number(rangeDraft?.min ?? filters.preptestMin);
  const rangeMax = Number(rangeDraft?.max ?? filters.preptestMax);
  const rangeInvalid = rangeDraft !== null && (!rangeDraft.min.trim() || !rangeDraft.max.trim() || !Number.isInteger(rangeMin) || !Number.isInteger(rangeMax) || rangeMin < RC_PREPTEST_MIN || rangeMax > RC_PREPTEST_MAX || rangeMin > rangeMax);
  const activeHandPicked = exactMode ? exactIds : [];
  const manualStrictBlocked = exactMode && filters.status === 'strict_no_exposure' ? exactIds.filter(id => { const passage = passages.find(p => p.passageId === id); return !passage || exposures.has(id) || statusOf(passage).state !== 'not_attempted'; }) : [];
  const profileTimingPending = useProfilePace && !timingEdited.current && (profileTimingStatus === 'loading'
    || Boolean(profileTimingMode && timing !== (profileTimingMode === 'unlimited' ? 'untimed' : 'standard')));
  const builderReady = !profileTimingPending && manualStrictBlocked.length === 0 && indexStatus === 'ready' && historyStatus === 'ready'
    && (filters.status !== 'strict_no_exposure' || exposureStatus === 'ready' && filters.includeUnknownExposure === true)
    && selectionQuery === drillQueryKey && !customInvalid && (!rangeInvalid || exactMode) && (!lookupActive || lookupPassage !== undefined) && (savedQuery === null || restoredSavedQuery === savedQuery);

  const ptRun = params.get('ptRun');
  const ptLeg = params.get('ptLeg');
  const practiceTestLegIndex = ptRun && ptLeg !== null && /^\d+$/.test(ptLeg)
    ? Number(ptLeg)
    : undefined;
  const config: RcDrillConfig = {
    reveal,
    ...(training.anticipation || training.lineByLine ? { training } : {}),
    timing:
      timing === 'untimed'
        ? { mode: 'unlimited' }
        : { mode: 'per_passage_budget', secondsPerPassage },
    source: exactMode ? 'manual' : 'adaptive',
    practiceTestRunId: practiceTestLegIndex !== undefined ? ptRun ?? undefined : undefined,
    practiceTestLegIndex,
  };

  React.useEffect(() => {
    const id = params.get('saved');
    if (!id) { setSavedSnapshot(null); setRestoredSavedQuery(null); return; }
    if (!actorId || indexStatus !== 'ready') return;
    let current = true;
    setAutoStart(false); setSelectedSet(null); setAcceptedShortfall(null); setSavedSnapshot(null); setRestoredSavedQuery(null);
    if (['assignment', 'assignmentId', 'ptRun', 'ptLeg', 'timedSection', 'start'].some(key => params.has(key))) {
      setNotice('Open saved RC work on its own. It cannot replace an assignment or protected section.'); return;
    }
    void getRcSavedSet(actorId, id).then(saved => {
      if (!current) return;
      if (!saved.payload) throw new Error(saved.problem ?? 'This saved RC set could not be verified.');
      const payload = saved.payload;
      if (payload.mode === 'fixed' && payload.passageIds.some(id => !passages.some(p => p.passageId === id && p.questionCount > 0))) throw new Error('A passage in this saved set is unavailable. The saved selection has been kept.');
      setRangeDrafts(previous => ({ ...previous, [payload.mode === 'fixed' ? 'manual' : 'automatic']: null })); setFilterDrafts(previous => ({ ...previous, [payload.mode === 'fixed' ? 'manual' : 'automatic']: payload.mode === 'fixed' ? fixedSelectionFilters(payload.filters) : payload.filters })); setCount(payload.count); setReveal(payload.config.reveal);
      setTraining(payload.config.training ?? { anticipation: false, lineByLine: false });
      if (payload.config.timing.mode === 'unlimited') setTiming('untimed');
      else { setTiming('custom'); setCustomSeconds(payload.config.timing.secondsPerPassage); setCustomText(mmss(payload.config.timing.secondsPerPassage)); }
      setLookupAddress({ pt: '', section: '', passage: '' }); lookupSnapshot.current = undefined;
      setHandPicked(payload.mode === 'fixed' ? payload.passageIds : []); setHandPickOpen(payload.mode === 'fixed');
      setSavedSnapshot(payload.mode === 'fixed' ? payload : null); setRestoredSavedQuery(drillQueryKey);
      setNotice(`Opened ${saved.name}. Review the current passages before starting. No drill has started.`);
    }).catch(err => { if (current) setNotice(err instanceof Error ? err.message : 'This saved RC set could not be loaded.'); });
    return () => { current = false; };
  }, [actorId, drillQueryKey, indexStatus, passages]);

  // Only selection changes invalidate passage IDs. Practice conditions are checked
  // separately during asynchronous launch, so timing edits never reroll a set. The same IDs
  // are used for both the read-only inspection and the eventual session.
  // A retry invalidates immediately; successful index/history reads also revise
  // eligibility so an older inspection cannot survive a refreshed pool.
  const selectionKey = JSON.stringify({ count: exactMode ? undefined : count, rangeInvalid: exactMode ? undefined : rangeInvalid, filters: exactMode ? { status: filters.status === 'strict_no_exposure' ? filters.status : 'any', includeUnknownExposure: filters.status === 'strict_no_exposure' ? filters.includeUnknownExposure : undefined } : filters, exactIds: activeHandPicked, exactMode,
    eligibilityRevision, loadAttempt, query: drillQueryKey });
  const selectionKeyRef = React.useRef(selectionKey);
  selectionKeyRef.current = selectionKey;
  const launchKey = JSON.stringify({ selectionKey, timing, secondsPerPassage, customSeconds, customInvalid, reveal, training });
  const launchKeyRef = React.useRef(launchKey);
  launchKeyRef.current = launchKey;
  const activeSet = selectedSet?.key === selectionKey ? selectedSet : null;
  /** An inspected set that a later change made stale, so the student is told. */
  const staleSet = selectedSet !== null && activeSet === null;

  const summary = summarizeRcBuild({
    requestedPassages: exactMode ? exactIds.length : count,
    handPickedIds: activeHandPicked,
    poolPassages: preview.poolSize,
    inspected: activeSet
      ? { passageIds: activeSet.ids, questionCounts: activeSet.passages.map((p) => p.questions.length) }
      : null,
    secondsPerPassage,
  });
  const activeSetKey = activeSet ? activeSet.key + '|' + activeSet.ids.join(',') : null;
  const previewIdentity = activeSet ? `${activeSet.key}:${activeSet.previewId}` : null;
  const shortfallAccepted = activeSetKey !== null && acceptedShortfall === activeSetKey;
  const needsShortfallAck = activeSet !== null && summary.shortfall > 0 && !shortfallAccepted;
  const inspectSet = async (options?: { retainingReviewedSelection?: boolean }) => {
    if (!builderReady || (exactMode && exactIds.length === 0)) return;
    const request = ++inspectRequest.current;
    const key = selectionKey;
    const reportFailure = (message: string) => setNotice(options?.retainingReviewedSelection ? `${message} The previously reviewed passages are still selected.` : message);
    setAcceptedShortfall(null);
    setInspecting(true);
    setNotice(null);
    try {
      const ids = exactMode
        ? [...exactIds]
        : selectPassages({
            pool: selectionPool,
            questionIdsByPassage,
            filters,
            history: selectionHistory,
            count,
            seed: Date.now() % 2147483647,
          }).selected.map((p) => p.passageId);
      if (ids.length === 0) {
        reportFailure('No passages match those filters. Loosen one and try again.');
        return;
      }
      const full = await loadPassages(ids);
      if (!mounted.current || request !== inspectRequest.current || key !== selectionKeyRef.current) return;
      if (full.length !== ids.length || full.some((passage, index) => passage.passageId !== ids[index])) {
        reportFailure('Some passages could not be loaded. Try reviewing the selection again.');
        return;
      }
      // A passage that loads without questions would start as an empty
      // reading set, so it cannot pass inspection either.
      if (full.some((passage) => passage.questions.length === 0)) {
        reportFailure('A passage in this set loaded without its questions. Choose different passages.');
        return;
      }
      if (savedSnapshot && savedSnapshot.passageIds.join(',') === ids.join(',')
        && savedSnapshot.questionIds.join(',') !== full.flatMap(p => p.questions.map(q => q.questionId)).join(',')) {
        reportFailure('The questions in this fixed set have changed. Its saved snapshot has been kept; choose a new selection before starting.'); return;
      }
      const inspected = { key, previewId: request, ids, passages: full };
      setSelectedSet(inspected);
      return inspected;
    } catch {
      if (mounted.current && request === inspectRequest.current && key === selectionKeyRef.current) {
        reportFailure('The selected passages could not be loaded. Try again.');
      }
    } finally {
      if (mounted.current && request === inspectRequest.current) setInspecting(false);
    }
  };

  /**
   * `replace` is for the autostart path only. A link carrying `start=1` puts
   * the builder on the history stack with that param still in the URL, so Back
   * from the drill re-mounts the builder, re-reads the param, and creates a
   * SECOND session. Replacing the entry takes that URL off the stack.
   */
  const start = async (options?: { replace?: boolean }) => {
    if (startingRef.current) return;
    if (pendingLoad.error) { setNotice(pendingLoad.error); return; }
    if (!uncertainStart.current && !builderReady) return;
    startingRef.current = true;
    const startingKey = launchKey;
    setStarting(true);
    const replace = options?.replace ?? params.get('start') === '1';
    try {
      // Autostart inspects through the same content checks as a manual Review.
      // An uncertain launch already owns its validated, immutable request.
      const inspected = uncertainStart.current ? null : activeSet ?? (options?.replace ? await inspectSet() : null);
      if (!mounted.current) return;
      if (!uncertainStart.current && !inspected) {
        startingRef.current = false;
        setStarting(false);
        return;
      }
      if (!uncertainStart.current && (inspected!.key !== selectionKeyRef.current || startingKey !== launchKeyRef.current)) {
        throw new Error('Your settings changed. Review the selection again before starting.');
      }
      if (!uncertainStart.current && !exactMode && inspected!.ids.length < count
        && acceptedShortfall !== inspected!.key + '|' + inspected!.ids.join(',')) {
        setReviewing(true);
        throw new Error('Confirm the smaller drill below before starting it.');
      }
      const chosen = uncertainStart.current?.ids ?? inspected!.ids;
      const canonical = params.get('timedSection') === 'manual-canonical' && !params.has('assignmentId') && !params.has('assignment') &&
        !ptRun && !params.has('ptLeg') && reveal === 'end_of_set' ? canonicalRcSection(chosen) : null;
      const protectedPace = timing === 'untimed' ? 'untimed' : secondsPerPassage === 525 ? 'standard' :
        secondsPerPassage === 788 ? 'time-and-a-half' : secondsPerPassage === 1050 ? 'double-time' : null;
      const useProtectedSection = !uncertainStart.current && canonical && protectedPace && await manualSectionsEnabled();
      if (!uncertainStart.current && (inspected!.key !== selectionKeyRef.current || startingKey !== launchKeyRef.current)) {
        throw new Error('Your settings changed. Review the selection again before starting.');
      }
      if (useProtectedSection) {
        if (!mounted.current) return;
        navigate(newManualSectionHref('rc', canonical.pt, canonical.section, protectedPace), { replace: replace || undefined });
        return;
      }
      if (!actorId || !mounted.current) throw new Error('You need to be signed in to drill.');
      let launchExposures: Set<number> | null = null;
      if (!uncertainStart.current && filters.status === 'strict_no_exposure') {
        let latestHistory: Awaited<ReturnType<typeof getRcHistorySnapshot>>;
        try { latestHistory = await getRcHistorySnapshot(actorId); }
        catch { throw new Error('Saved answers could not be checked. Nothing started. Retry before starting this exposure-filtered drill.'); }
        if (!mounted.current || startingKey !== launchKeyRef.current) throw new Error('Your settings changed. Review the selection again before starting.');
        const answered = chosen.filter(id => { const passage = passages.find(p => p.passageId === id); return !passage || passageStatus(passage, questionIdsByPassage.get(id) ?? [], latestHistory.displayHistory).state !== 'not_attempted'; });
        if (answered.length) {
          setHistory(latestHistory.history); setDisplayHistory(latestHistory.displayHistory); setHiddenResults(latestHistory.hasHiddenGradedResults);
          if (!exactMode) refreshEligibility();
          throw new Error(`A selected passage now has saved answers and does not meet No recorded exposure. Edit your selection or change Practice history. ${describePendingPassages(answered)}`);
        }
      }
      if (!uncertainStart.current) {
        try { launchExposures = await getRcExposureHistory(actorId); }
        catch { if (filters.status === 'strict_no_exposure') throw new Error('Recorded exposure could not be checked. Retry before starting this exposure-filtered drill.'); }
        if (!mounted.current || (inspected!.key !== selectionKeyRef.current || startingKey !== launchKeyRef.current)) throw new Error('Your settings changed. Review the selection again before starting.');
        if (filters.status === 'strict_no_exposure' && chosen.some(id => launchExposures?.has(id))) {
          setExposures(new Set(launchExposures));
          if (!exactMode) refreshEligibility();
          throw new Error(`A selected passage now has recorded exposure, including any text you revealed during review. Choose another status or inspect a different selection before starting. ${describePendingPassages(chosen.filter(id => launchExposures?.has(id)))}`);
        }
      }
      // An unresolved save owns its immutable UUID and settings, even if the
      // student edits or inspects another set while reconnecting.
      const request = uncertainStart.current ?? {
        id: crypto.randomUUID(), actorId, ids: [...chosen], config: { ...structuredClone(config), passageExposureAtStart: Object.fromEntries(chosen.map(id => [String(id), launchExposures === null ? 'unknown' as const : launchExposures.has(id) ? 'recorded-exposure' as const : 'no-recorded-exposure' as const])) },
        back: safeReturnTo(params.get('returnTo')), replace: replace || undefined,
      };
      uncertainStart.current = request;
      // Persist before the write; storage failure prevents an unrepeatable launch.
      sessionStorage.setItem(pendingKey(request.actorId), JSON.stringify(request));
      const verify = (saved: RcDrillSession) => {
        if (saved.id !== request.id || saved.userId !== request.actorId || saved.passageIds.join(',') !== request.ids.join(',')
          || Object.entries(request.config).some(([key, value]) => JSON.stringify(saved.config[key as keyof RcDrillConfig]) !== JSON.stringify(value))) {
          throw new Error('The saved drill does not match this launch. Retry before creating another drill.');
        }
        return saved;
      };
      let saved: RcDrillSession | null;
      try { saved = await getSession(request.id, request.actorId); }
      catch { throw new Error('We could not confirm whether the drill was created. Press Start again to retry this exact launch.'); }
      if (!mounted.current) return;
      if (!saved) {
        try { saved = await createSession(request.config, request.ids, { id: request.id, actorId: request.actorId }); }
        catch (err) {
          if (!mounted.current) return;
          try { saved = await getSession(request.id, request.actorId); }
          catch { throw new Error('We could not confirm whether the drill was created. Press Start again to retry this exact launch.'); }
          if (!saved) {
            sessionStorage.removeItem(pendingKey(request.actorId));
            uncertainStart.current = null;
            setRecoveryPending(null);
            throw err;
          }
        }
      }
      if (!mounted.current) return;
      verify(saved);
      sessionStorage.removeItem(pendingKey(request.actorId));
      uncertainStart.current = null;
      setRecoveryPending(null);
      const testLeg = request.config.practiceTestRunId && request.config.practiceTestLegIndex !== undefined
        ? '&ptRun=' + encodeURIComponent(request.config.practiceTestRunId) + '&ptLeg=' + request.config.practiceTestLegIndex : '';
      navigate('/rc/drill?sessionId=' + saved.id + testLeg + (request.back ? '&returnTo=' + encodeURIComponent(request.back) : ''), { replace: request.replace });
    } catch (err) {
      if (!mounted.current) return;
      setRecoveryPending(uncertainStart.current);
      setNotice(err instanceof Error ? err.message : 'The drill could not be started.');
      startingRef.current = false;
      setStarting(false);
    }
  };

  // Wait for both eligibility reads and URL settings. Invalid/failed links stay
  // at configuration, while valid autostarts still replace their launcher URL.
  React.useEffect(() => {
    if (!autoStart) return;
    if (indexStatus === 'failed' || historyStatus === 'failed' || uncertainStart.current || pendingLoad.error) {
      setAutoStart(false);
      return;
    }
    if (!builderReady || starting) return;
    setAutoStart(false);
    void start({ replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, builderReady, starting, selectionKey, indexStatus, historyStatus]);

  const describePendingPassages = (ids: number[]): string => {
    const labels = ids
      .map((id) => {
        const p =
          passages.find((item) => item.passageId === id) ??
          selectedSet?.passages.find((item) => item.passageId === id);
        if (!p) return null;
        return `PT ${p.preptest} · S${p.section} · P${p.setNumber}${p.title ? ` (${p.title})` : ''}`;
      })
      .filter((label): label is string => Boolean(label));
    if (labels.length === ids.length && labels.length > 0) {
      return labels.join(', ');
    }
    return plural(ids.length, 'selected passage');
  };

  const [pickerLimit, setPickerLimit] = React.useState(RC_PICKER_PAGE);

  const pickerQuery = normalizeRcSearchText(search);
  // The shared grammar calls its third coordinate a question. In this passage
  // picker only P/Passage labels or a dotted reference use that coordinate.
  const passageReference = /\b(?:p|passage)\s*\d/i.test(pickerQuery) || /^\d+[-.]\d+[-.]\d+$/.test(pickerQuery);
  const pickerAddress = parseRcSearchAddress(passageReference
    ? pickerQuery.replace(/\b(?:passage|p)(?=\s*\d)/gi, 'Q') : pickerQuery);
  const pickerCriteria = drawer?.kind === 'pick' ? drawer.filters : filters;
  const searchMatches = drillablePassages.filter((p) => {
    if (pickerAddress) {
      if (p.preptest !== pickerAddress.pt || pickerAddress.section !== undefined && p.section !== pickerAddress.section
        || pickerAddress.qnum !== undefined && (!passageReference || p.setNumber !== pickerAddress.qnum)) return false;
    } else {
      const searchable = normalizeRcSearchText(`${p.title ?? ''} ${p.firstWords ?? ''} PrepTest ${p.preptest} PT ${p.preptest} PT${p.preptest} Section ${p.section} S${p.section} Passage ${p.setNumber} P${p.setNumber}`).toLowerCase();
      if (pickerQuery && !pickerQuery.toLowerCase().split(/\s+/).every(term => searchable.includes(term))) return false;
    }
    return true;
  });
  const excludedSearchMatches = pickerQuery ? searchMatches.filter(p => !matches(p, pickerCriteria)) : [];
  const filteredSearchCount = excludedSearchMatches.length;
  const handPickRows = searchMatches.filter(p => matches(p, pickerCriteria)).sort((a, b) => {
    const address = () => a.preptest - b.preptest || a.section - b.section || a.setNumber - b.setNumber || a.passageId - b.passageId;
    return pickerSort === 'difficulty' ? (a.difficulty ?? 99) - (b.difficulty ?? 99) || address()
      : pickerSort === 'title' ? (a.title ?? '').localeCompare(b.title ?? '') || address() : address();
  });

  // A new search or filter starts the list from the top again. Selections live
  // in `exactIds`, so they are unaffected by how many rows are showing.
  React.useEffect(() => {
    setPickerLimit(RC_PICKER_PAGE);
  }, [search, pickerCriteria, pickerSort, drawerState?.kind]);

  function matches(p: RcIndexPassageWithPt, criteria = filters) {
    const status = statusOf(p);
    if (p.preptest < criteria.preptestMin || p.preptest > criteria.preptestMax) return false;
    if (criteria.topics.length && (!p.topic || !criteria.topics.includes(p.topic))) return false;
    if (criteria.formats.length && (!p.format || !criteria.formats.includes(p.format))) return false;
    if (criteria.frameworks.length && !p.frameworks.some((f) => criteria.frameworks.includes(f)))
      return false;
    if (criteria.difficulties.length && (p.difficulty == null || !criteria.difficulties.includes(p.difficulty)))
      return false;
    if (criteria.status === 'fresh' && status.state !== 'not_attempted') return false;
    if (criteria.status === 'strict_no_exposure' && (exposureStatus !== 'ready' || exposures.has(p.passageId) || status.state !== 'not_attempted')) return false;
    if (criteria.status === 'incorrect_before' && !status.everIncorrect) return false;
    if (criteria.status === 'incorrect_last' && !status.lastFirstTakeIncorrect) return false;
    return true;
  }

  const exclusionReasons = (passage: RcIndexPassageWithPt): string => {
    const reasons: string[] = [];
    const criteria = pickerCriteria;
    const status = statusOf(passage);
    if (passage.preptest < criteria.preptestMin || passage.preptest > criteria.preptestMax) reasons.push(`outside PT ${criteria.preptestMin}–${criteria.preptestMax}`);
    if (criteria.topics.length && (!passage.topic || !criteria.topics.includes(passage.topic))) reasons.push('topic does not match');
    if (criteria.formats.length && (!passage.format || !criteria.formats.includes(passage.format))) reasons.push('format does not match');
    if (criteria.frameworks.length && !passage.frameworks.some(value => criteria.frameworks.includes(value))) reasons.push('framework does not match');
    if (criteria.difficulties.length && (passage.difficulty == null || !criteria.difficulties.includes(passage.difficulty))) reasons.push('difficulty does not match');
    if (criteria.status === 'fresh' && status.state !== 'not_attempted') reasons.push('already attempted');
    if (criteria.status === 'strict_no_exposure') {
      if (exposureStatus !== 'ready') reasons.push('recorded exposure has not been verified');
      if (exposures.has(passage.passageId)) reasons.push('has recorded passage exposure');
      if (status.state !== 'not_attempted') reasons.push('already attempted');
    }
    if (criteria.status === 'incorrect_before' && !status.everIncorrect) reasons.push('no earlier incorrect answer');
    if (criteria.status === 'incorrect_last' && !status.lastFirstTakeIncorrect) reasons.push('last first answer was not incorrect');
    return reasons.join('; ');
  };

  const [discarding, setDiscarding] = React.useState<string | null>(null);
  const discardLock = React.useRef(false);
  const [discardError, setDiscardError] = React.useState<string | null>(null);
  const removeSession = async (id: string) => {
    if (discardLock.current || !window.confirm('Discard this unfinished drill? Your saved answers stay in your history.')) return;
    discardLock.current = true; setDiscarding(id); setDiscardError(null);
    try {
      await abandonSession(id);
      setSessions(await listSessions());
    } catch (error) {
      setDiscardError(error instanceof Error ? error.message : 'The drill could not be discarded. Try again.');
    } finally { discardLock.current = false; setDiscarding(null); }
  };

  const drillSettings = (
        <div className="rc-builder-settings rc-builder-main-options">
          <div className="rc-field rc-builder-timing"><label className="rc-field-label" htmlFor="rc-builder-timing">Timing</label>
            <select id="rc-builder-timing" value={timing} onChange={(event) => { timingEdited.current = true; setUseProfilePace(true); setTiming(event.target.value as typeof timing); }}><option value="untimed">Untimed</option><option value="standard">{useProfilePace && profilePace !== RC_STANDARD_SECONDS_PER_PASSAGE ? `Profile pace · ${mmss(profilePace)} per passage` : 'Standard pace · 8:45 per passage'}</option><option value="custom">Custom time</option></select>
            {timing === 'custom' && <input type="text" inputMode="text" placeholder="8:45" aria-label="Minutes and seconds per passage" aria-invalid={customInvalid} aria-describedby={customInvalid ? 'rc-custom-pace-error' : undefined} className={`rc-segment${customInvalid ? ' rc-input-invalid' : ''}`} value={customText} onChange={(event) => { setCustomText(event.target.value); const parsed = parseCustomPace(event.target.value); if (parsed.ok) setCustomSeconds(parsed.seconds); }} onBlur={() => { if ('seconds' in customPace) setCustomText(mmss(customPace.seconds)); }} />}
            {customPaceError && <div className="rc-field-error" id="rc-custom-pace-error" role="alert">{customPaceError} Enter a valid time to continue.</div>}
            {timingDefaultNotice && timingDefaultNotice !== TIMING_DEFAULT_LOADED_NOTICE && <p className="rc-field-hint" role="status">{timingDefaultNotice}</p>}
          </div>
          <div className="rc-field rc-builder-reveal"><label className="rc-field-label" htmlFor="rc-builder-reveal">Show answers</label><select id="rc-builder-reveal" value={reveal} onChange={(event) => setReveal(event.target.value as RcRevealMode)}>{REVEAL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div>
        </div>

  );

  const drawerMin = Number(drawer?.range?.min ?? drawer?.filters.preptestMin);
  const drawerMax = Number(drawer?.range?.max ?? drawer?.filters.preptestMax);
  const drawerRangeInvalid = Boolean(drawer?.kind !== 'practice' && drawer?.range && (!drawer.range.min.trim() || !drawer.range.max.trim() || !Number.isInteger(drawerMin) || !Number.isInteger(drawerMax) || drawerMin < RC_PREPTEST_MIN || drawerMax > RC_PREPTEST_MAX || drawerMin > drawerMax));
  const updateDrawerFilters = (update: (value: RcSelectionFilters) => RcSelectionFilters) => setDrawer(previous => previous ? { ...previous, filters: update(previous.filters) } : null);
  const toggleDrawer = (group: 'topics' | 'formats' | 'frameworks', value: string) => updateDrawerFilters(previous => ({ ...previous, [group]: previous[group].includes(value) ? previous[group].filter(item => item !== value) : [...previous[group], value] }));
  const updateDrawerRange = (bound: 'min' | 'max', value: string) => setDrawer(previous => {
    if (!previous) return null;
    const next = { min: String(previous.filters.preptestMin), max: String(previous.filters.preptestMax), ...previous.range, [bound]: value };
    const min = Number(next.min), max = Number(next.max);
    const valid = next.min.trim() && next.max.trim() && Number.isInteger(min) && Number.isInteger(max) && min >= RC_PREPTEST_MIN && max <= RC_PREPTEST_MAX && min <= max;
    return { ...previous, range: next, filters: valid ? { ...previous.filters, preptestMin: min, preptestMax: max } : previous.filters };
  });
  const applyDrawer = () => {
    if (!drawerState || drawerRangeInvalid) return;
    setTraining({ ...trainingDraft });
    if (drawerState.kind === 'practice') { setDrawer(null); return; }
    setLookupAddress({ pt: '', section: '', passage: '' }); lookupSnapshot.current = undefined;
    setFilterDrafts(previous => ({ ...previous, [drawerState.mode]: cloneFilters(drawerState.filters) }));
    setRangeDrafts(previous => ({ ...previous, [drawerState.mode]: drawerState.range }));
    if (drawerState.mode === 'manual') setHandPicked([...drawerState.ids]);
    switchSelectionMode(drawerState.mode === 'manual');
    setDrawer(null);
  };
  const changeDraftPick = (id: number) => setDrawer(previous => {
    if (!previous) return null;
    const ids = previous.ids.includes(id) ? previous.ids.filter(value => value !== id) : [...previous.ids, id];
    return { ...previous, ids };
  });
  const moveDraftPick = (index: number, direction: -1 | 1) => setDrawer(previous => {
    if (!previous || index + direction < 0 || index + direction >= previous.ids.length) return previous;
    const ids = [...previous.ids]; [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
    return { ...previous, ids };
  });
  const filterSummary = [filters.topics.length ? filters.topics.join(', ') : 'All topics', filters.difficulties.length ? `Difficulty ${filters.difficulties.join(', ')}` : exactMode ? 'Any difficulty' : 'Adaptive difficulty', STATUS_OPTIONS.find(option => option.id === filters.status)?.label, ...filters.formats, ...filters.frameworks, ...filters.families, `PT ${filters.preptestMin}–${filters.preptestMax}`].filter(Boolean).join(' · ');
  const requestedCount = exactMode ? exactIds.length : count;
  const reviewStage = reviewing && activeSet !== null;
  const wasReviewStage = React.useRef(false);
  React.useEffect(() => {
    if (reviewStage) document.getElementById('rc-review-heading')?.focus();
    else if (wasReviewStage.current) document.getElementById('rc-final-heading')?.focus();
    wasReviewStage.current = reviewStage;
  }, [reviewStage]);
  const showDifferentSelection = async () => { const inspected = await inspectSet({ retainingReviewedSelection: activeSet !== null }); if (inspected) setReviewing(true); };
  const showReview = async () => {
    if (activeSet) { setReviewing(true); return; }
    const inspected = await inspectSet();
    if (inspected) setReviewing(true);
  };
  React.useEffect(() => {
    if (!openPickerOnEntry || entryPickerOpened.current || indexStatus !== 'ready' || selectionQuery !== drillQueryKey || (savedQuery !== null && restoredSavedQuery !== savedQuery)) return;
    if (!pickButton.current) return;
    entryPickerOpened.current = true;
    openDrawer('pick', pickButton.current);
  }, [openPickerOnEntry, indexStatus, selectionQuery, drillQueryKey, savedQuery, restoredSavedQuery]);
  const drawerFilterControls = drawer && <>

              <>
              <FilterGroup label="Topic" values={[...RC_TOPICS]} active={drawer.filters.topics} onToggle={value => toggleDrawer('topics', value)} />
              <details className="rc-filter-select"><summary><span>Passage difficulty</span><strong>{drawer.filters.difficulties.length ? drawer.filters.difficulties.join(", ") : drawer.mode === "automatic" ? "Adaptive" : "Any difficulty"}</strong></summary><div className="rc-chip-row"><button type="button" className={`rc-chip${!drawer.filters.difficulties.length ? ' rc-active' : ''}`} aria-pressed={!drawer.filters.difficulties.length} onClick={() => updateDrawerFilters(previous => ({ ...previous, difficulties: [] }))}>{drawer.mode === 'manual' ? 'Any difficulty' : 'Adaptive'}</button>{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} className={`rc-chip${drawer.filters.difficulties.includes(value) ? ' rc-active' : ''}`} aria-pressed={drawer.filters.difficulties.includes(value)} onClick={() => updateDrawerFilters(previous => ({ ...previous, difficulties: previous.difficulties.includes(value) ? previous.difficulties.filter(item => item !== value) : [...previous.difficulties, value] }))}>{value}</button>)}</div>
              {drawer.mode === 'automatic' && <p className="rc-field-hint">{RC_ADAPTIVE_LABEL}</p>}</details>
              </>
              <label className="rc-field-label" htmlFor="rc-drawer-status">Practice history</label><select id="rc-drawer-status" value={drawer.filters.status} onChange={event => updateDrawerFilters(previous => ({ ...previous, status: event.target.value as RcStatusFilter }))}>{STATUS_OPTIONS.map(option => <option key={option.id} value={option.id} disabled={option.id === 'strict_no_exposure' && exposureStatus !== 'ready'}>{option.label}</option>)}</select>
                <div className="rc-field-label">PrepTest range</div><div className="rc-range-inputs"><label>From <input type="number" aria-label="Earliest PrepTest" min={RC_PREPTEST_MIN} max={RC_PREPTEST_MAX} value={drawer.range?.min ?? drawer.filters.preptestMin} aria-invalid={drawerRangeInvalid} aria-describedby="rc-drawer-range-error" onChange={event => updateDrawerRange('min', event.target.value)} /></label><label>To <input type="number" aria-label="Latest PrepTest" min={RC_PREPTEST_MIN} max={RC_PREPTEST_MAX} value={drawer.range?.max ?? drawer.filters.preptestMax} aria-invalid={drawerRangeInvalid} aria-describedby="rc-drawer-range-error" onChange={event => updateDrawerRange('max', event.target.value)} /></label></div><p id="rc-drawer-range-error" className="rc-field-error" role="alert" hidden={!drawerRangeInvalid}>Enter whole PrepTest numbers from {RC_PREPTEST_MIN} to {RC_PREPTEST_MAX}, with From no greater than To.</p><p className="rc-field-hint">Newest tests are held back by default so they stay fresh for timed sections.</p>
              <details className="rc-final-advanced" open={drawerRangeInvalid || undefined} onToggle={event => { if (drawerRangeInvalid && !event.currentTarget.open) event.currentTarget.open = true; }}><summary>Passage features and format</summary>
                <FilterGroup label="Format" values={[...RC_FORMATS]} active={drawer.filters.formats} onToggle={value => toggleDrawer('formats', value)} />
                <FilterGroup label="Framework" values={[...RC_FRAMEWORKS]} active={drawer.filters.frameworks} onToggle={value => toggleDrawer('frameworks', value)} />
                {drawer.filters.families.length > 0 && <div className="rc-chip-row">{drawer.filters.families.map(value => <button key={value} className="rc-chip rc-active" onClick={() => updateDrawerFilters(previous => ({ ...previous, families: previous.families.filter(item => item !== value) }))}>Remove family: {value}</button>)}</div>}
<button type="button" aria-label="Clear passage filters" className="rc-chip" onClick={() => { updateDrawerFilters(() => ({ ...cloneFilters(DEFAULT_FILTERS), status: 'any', preptestMax: RC_PREPTEST_MAX })); setDrawer(previous => previous ? { ...previous, range: null } : null); }}>Clear all filters</button><button type="button" className="rc-chip" onClick={() => navigate('/rc/search')}>Open question search ↗</button>
              </details>
              <details className="rc-filter-details"><summary>How passage status works</summary><p className="rc-field-hint">Not attempted checks saved answer history. No recorded exposure also checks text reveals recorded by LSAT U. Earlier previews were not tracked, so it cannot prove you have never seen a passage.</p></details>
              {drawer.filters.status === 'strict_no_exposure' && <div className="rc-builder-alert"><p>Earlier exposure is unknown because past previews were not tracked. None is certified never seen.</p><label><input type="checkbox" checked={drawer.filters.includeUnknownExposure === true} disabled={exposureStatus !== 'ready'} onChange={event => updateDrawerFilters(previous => ({ ...previous, includeUnknownExposure: event.target.checked }))} /> Include passages whose earlier exposure is unknown</label></div>}
              {historyStatus === 'ready' && drawer.mode === 'automatic' && <details className="rc-filter-details"><summary>How adaptive selection works</summary><RcAdaptiveSummary summary={buildRcAdaptiveSummary({ history, displayHistory, hasHiddenGradedResults: hiddenResults })} /></details>}
              </>;

  const practiceOptions = <>
            <details className="rc-drawer-options rc-training-options"><summary>Training modes{(trainingDraft.anticipation || trainingDraft.lineByLine) && <span>{[trainingDraft.anticipation, trainingDraft.lineByLine].filter(Boolean).length} on</span>}</summary>
              <div className="rc-training-switches">
                <label><span><strong>Anticipation</strong><small>Keep choices hidden until you reveal them.</small></span><input type="checkbox" checked={trainingDraft.anticipation} onChange={event => setTrainingDraft(previous => ({ ...previous, anticipation: event.target.checked }))} /></label>
                <label><span><strong>Line-by-line</strong><small>Read one sentence at a time, at your own pace.</small></span><input type="checkbox" checked={trainingDraft.lineByLine} onChange={event => setTrainingDraft(previous => ({ ...previous, lineByLine: event.target.checked }))} /></label>
              </div>
            </details>
            <details className="rc-drawer-options rc-profile-options"><summary>Accommodations</summary><ProfileTimingPreference compact /></details>
  </>;

  return (
    /* Keeps `rc-page` when embedded: that class is where the observatory token
       ladder is declared (classroom.css), so dropping it would strip every ink,
       surface and hairline value out from under the builder. `rc-embedded`
       removes only the page-level frame — full-height, background, padding,
       centred column — which the drill hub's launcher already provides. */
    <div className={`${embedded ? 'rc-page rc-embedded' : 'rc-page'}${handPickOpen ? ' rc-builder-manual' : ''} rc-final-builder`}>
      {onCancel && <div className="rc-final-back"><button type="button" className="rc-chip" onClick={onCancel}>Back to RC practice</button></div>}

      {loadError && (
        <div className="rc-builder-alert" role="alert">
          <span>
            {loadError}{' '}
            {passages.length > 0
              ? 'Your choices are kept. You can review and start once it loads.'
              : 'Review is unavailable until the passage list loads.'}
          </span>
          <button type="button" className="rc-chip" onClick={retryLoad} disabled={indexStatus === 'loading'}>
            {indexStatus === 'loading' ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {discardError && <p className="rc-builder-alert" role="alert">{discardError}</p>}
      {historyStatus === 'loading' && !loadError && <p className="rc-field-hint" role="status">Loading your answer history…</p>}
      {historyStatus === 'failed' && !loadError && (
        <div className="rc-builder-alert" role="status">
          <span>
            Your answer history could not be loaded, so the Not attempted and Incorrect filters cannot tell
            which passages you have already done. Retry before reviewing or starting a new drill.
          </span>
          <button type="button" className="rc-chip" onClick={retryLoad} disabled={indexStatus === 'loading'}>
            Retry
          </button>
        </div>
      )}
      {pendingLoad.error && <p className="rc-page-sub" role="alert">{pendingLoad.error}</p>}
      {notice && <p className="rc-page-sub" role="status">{notice}</p>}
      {manualStrictBlocked.length > 0 && <p className="rc-builder-alert" role="alert">{plural(manualStrictBlocked.length, 'selected passage')} {manualStrictBlocked.length === 1 ? 'does' : 'do'} not meet No recorded exposure. Recorded exposure or saved answers were found. Edit your selection or change Practice history in Customize drill.</p>}
      {exposureStatus !== 'ready' && <div className="rc-field-hint" role="status">{exposureStatus === 'loading' ? 'Checking recorded exposure…' : <>Recorded exposure could not be checked. Exposure is unknown; No recorded exposure is unavailable. <button type="button" className="rc-chip" onClick={() => retryLoad()}>Retry recorded exposure</button></>}</div>}
      {!starting && recoveryPending && <div className="rc-builder-alert" role="status">
        <span>A previous Start is pending for {describePendingPassages(recoveryPending.ids)}. Retry checks that original saved drill with its original timing and answer settings; your current edits will not start another drill.</span>
        <button type="button" className="rc-chip" disabled={starting} onClick={() => void start()}>Retry original launch</button>
      </div>}

      {!reviewStage && <section className="rc-card rc-builder rc-final-panel rc-split-setup" aria-labelledby="rc-final-heading">
        <header className="rc-setup-heading">
          <div><p className="rc-setup-eyebrow">RC drill</p>{embedded ? <h2 id="rc-final-heading" tabIndex={-1}>Choose your next {requestedCount > 1 ? 'passages' : 'passage'}</h2> : <h1 id="rc-final-heading" tabIndex={-1}>Choose your next {requestedCount > 1 ? 'passages' : 'passage'}</h1>}</div>
          <p className="rc-setup-description">Whole passages, with every question.</p>
          <section className="rc-direct-lookup" aria-labelledby="rc-direct-lookup-heading">
            <h3 id="rc-direct-lookup-heading">Have a passage in mind?</h3>
            <p>{handPickOpen ? 'Optional. Leave blank to keep your selection.' : 'Optional. Leave blank for Tutor’s choice.'}</p>
            <div className="rc-lookup-address">
              <label>PrepTest<select aria-label="Lookup PrepTest" value={lookupAddress.pt} onChange={event => updateLookup({ pt: event.target.value, section: '', passage: '' })}><option value="">Select</option>{[...new Set(passages.filter(p => p.questionCount > 0).map(p => p.preptest))].sort((a,b) => a-b).map(pt => <option key={pt} value={pt}>{pt}</option>)}</select></label>
              <label>Section<select aria-label="Lookup section" value={lookupAddress.section} disabled={!lookupAddress.pt} onChange={event => updateLookup({ ...lookupAddress, section: event.target.value, passage: '' })}><option value="">Select</option>{[...new Set(passages.filter(p => String(p.preptest) === lookupAddress.pt && p.questionCount > 0).map(p => p.section))].sort((a,b) => a-b).map(section => <option key={section} value={section}>{section}</option>)}</select></label>
              <label>Passage<select aria-label="Lookup passage" value={lookupAddress.passage} disabled={!lookupAddress.section} onChange={event => updateLookup({ ...lookupAddress, passage: event.target.value })}><option value="">Select</option>{passages.filter(p => String(p.preptest) === lookupAddress.pt && String(p.section) === lookupAddress.section && p.questionCount > 0).sort((a,b) => a.setNumber-b.setNumber).map(p => <option key={p.passageId} value={p.setNumber}>{p.setNumber}</option>)}</select></label>
            </div>
            {lookupActive && <div className="rc-lookup-status"><span role="status">{lookupPassage ? `PT ${lookupPassage.preptest} · Section ${lookupPassage.section} · Passage ${lookupPassage.setNumber}` : 'Choose a section and passage to continue.'}</span><button type="button" onClick={() => updateLookup({ pt: '', section: '', passage: '' })}>Clear</button></div>}
          </section>
        </header>
        <div className="rc-setup-workspace">
        <div className="rc-config-groups">
          <fieldset className="rc-config-group" aria-label="Passage settings"><legend>{exactMode ? 'Your passages' : 'Passages'}</legend><div className={`rc-passage-controls${exactMode ? ' rc-manual-passage-controls' : ''}`}>
          <div className="rc-field"><div className="rc-field-label" id="rc-passage-count-label">{exactMode ? 'Selected passages' : 'Passages'}</div>{exactMode ? <div className="rc-final-picked-count"><span role="status">{exactIds.length} selected</span>{!lookupActive && <button ref={pickButton} type="button" className="rc-chip" onClick={event => openDrawer('pick', event.currentTarget)}>{exactIds.length > 0 ? 'Edit selection' : 'Choose passages'}</button>}</div> : <div className="rc-stepper" role="group" aria-label="Passages"><button type="button" aria-label={`Fewer passages, ${count} selected`} disabled={count <= 1} onClick={() => setCount(value => Math.max(1, value - 1))}>−</button><span className="rc-stepper-value" aria-live="polite">{count}</span><button type="button" aria-label={`More passages, ${count} selected`} disabled={count >= 8} onClick={() => setCount(value => Math.min(8, value + 1))}>+</button></div>}</div>
          </div>
{exactMode && exactIds.length > 0 && <ol className="rc-selected-summary" aria-label="Selected drill passages">{exactIds.map(id => { const passage = passages.find(value => value.passageId === id); return <li key={id}><strong>{passage?.title || `Passage ${id}`}</strong><span>{passage ? `PT ${passage.preptest} · S${passage.section} · P${passage.setNumber}` : 'Passage details unavailable'}</span>{manualStrictBlocked.includes(id) && <em className="rc-field-error">Does not meet No recorded exposure: recorded exposure or saved answers.</em>}</li>; })}</ol>}
          </fieldset>
          <fieldset className="rc-config-group rc-conditions-group"><legend>Practice conditions</legend>{drillSettings}</fieldset>
        </div>
        {hiddenResults && <p className="rc-field-hint" role="status">Some saved results are still hidden and are excluded from practice-history filters until released.</p>}
        <div className="rc-final-filter-strip">{filters.status === 'strict_no_exposure' && <p className="rc-field-hint">Launch requirement: No recorded exposure</p>}<button type="button" className="rc-chip" onClick={event => openDrawer('filters', event.currentTarget)}>Customize drill</button>{(training.anticipation || training.lineByLine) && <p className="rc-training-applied">{[training.anticipation && 'Anticipation', training.lineByLine && 'Line-by-line'].filter(Boolean).join(' · ')}</p>}</div>
        {rangeInvalid && <p className="rc-field-error" role="alert">Fix the PrepTest range in Customize drill before reviewing.</p>}
        {filters.status === 'strict_no_exposure' && filters.includeUnknownExposure !== true && <p className="rc-field-hint">Review unknown earlier exposure in Customize drill before reviewing.</p>}
        {staleSet && (!exactMode || exactIds.length > 0) && <p className="rc-field-hint" role="status">Your settings changed. Review the selection again before starting.</p>}

        {!activeSet && !exactMode && indexStatus === 'ready' && passages.length > 0 && historyStatus === 'ready' && preview.shortfallMessage && <p className="rc-field-hint">{preview.shortfallMessage}</p>}
        <div className="rc-final-launch" role="region" aria-label="Launch summary"><p className="rc-field-hint">{exactMode && !exactIds.length ? 'Choose at least one passage to continue.' : 'Review first. Start when you’re ready.'}</p><button type="button" className="rc-button rc-button-primary" disabled={starting || inspecting || recoveryPending !== null || uncertainStart.current !== null || !builderReady || (exactMode && exactIds.length === 0)} onClick={() => void showReview()}>{inspecting ? 'Preparing review…' : 'Review passages'}</button></div>

        </div>
      </section>}
      {reviewStage && activeSet && <section className="rc-drill-preview rc-review-stage" aria-label="Selected reading set">
        <header className="rc-review-heading"><div><p className="rc-review-step">{exactMode ? 'Manually selected' : 'Chosen for you'}</p><h2 id="rc-review-heading" tabIndex={-1}>Review your RC drill</h2></div><div className="rc-review-edit-actions"><button type="button" className="rc-chip" disabled={starting || inspecting} onClick={() => setReviewing(false)}>Edit setup</button>{!exactMode && <button type="button" className="rc-chip rc-final-different" disabled={starting || inspecting || !builderReady} onClick={() => void showDifferentSelection()}>Choose different passages</button>}</div></header>
        <dl className="rc-review-conditions"><div><dt>Passages</dt><dd>{activeSet.ids.length}</dd></div><div><dt>Questions</dt><dd>{summary.inspectedQuestions}</dd></div><div><dt>Timing</dt><dd>{timing === 'untimed' ? 'Untimed' : `${mmss(secondsPerPassage)} per passage`}</dd></div><div><dt>Show answers</dt><dd>{REVEAL_OPTIONS.find(option => option.id === reveal)?.label}</dd></div></dl>
        {(training.anticipation || training.lineByLine) && <p className="rc-review-training">Training: {[training.anticipation && 'Anticipation', training.lineByLine && 'Line-by-line'].filter(Boolean).join(' · ')}</p>}
        {!exactMode && <p className="rc-field-hint">Selection: {filterSummary}</p>}
        {filters.status === 'strict_no_exposure' && <p className="rc-field-hint">Launch requirement: No recorded exposure</p>}
        <p className="rc-field-hint">Your drill will use these passages in this order. Text, answers and explanations stay hidden until you act.</p>
        {activeSet.passages.map((passage, index) => <React.Fragment key={`${previewIdentity}:${passage.passageId}`}>{manualStrictBlocked.includes(passage.passageId) && <p className="rc-field-error">{passage.title || `Passage ${passage.passageId}`}: Does not meet No recorded exposure: recorded exposure or saved answers.</p>}<RcExposurePreview key={`${previewIdentity}:${passage.passageId}`} actorId={actorId} passage={passage} index={index} alreadyRevealed={previewReveals.has(`${previewIdentity}:${passage.passageId}`)} onExposed={id => { setExposures(previous => new Set(previous).add(id)); setPreviewReveals(previous => new Set(previous).add(`${previewIdentity}:${id}`)); }} /></React.Fragment>)}
        {activeSet && summary.shortfall > 0 && <label className="rc-shortfall"><input type="checkbox" checked={shortfallAccepted} onChange={event => setAcceptedShortfall(event.target.checked ? activeSetKey : null)} /><span>Only {plural(summary.plannedPassages, 'passage')} of the {summary.requestedPassages} you asked for {summary.plannedPassages === 1 ? 'matches' : 'match'} these filters. Start with {plural(summary.plannedPassages, 'passage')}.</span></label>}
        <div className="rc-review-launch" role="region" aria-label="Launch summary"><span>{plural(summary.plannedPassages, 'passage')} · {plural(summary.inspectedQuestions ?? 0, 'question')} · {timing === 'untimed' ? 'Untimed' : `${mmss(secondsPerPassage)} per passage`}</span><button type="button" className="rc-button rc-button-primary" disabled={starting || inspecting || recoveryPending !== null || uncertainStart.current !== null || !builderReady || needsShortfallAck} onClick={() => void start()}>{starting ? 'Starting…' : 'Start drill'}</button></div>
      </section>}

      <Sheet open={drawerState !== null} onOpenChange={open => { if (!open) setDrawer(null); }}>
        <SheetContent className="rc-final-drawer" onCloseAutoFocus={event => { event.preventDefault(); (drawerOpener.current?.isConnected ? drawerOpener.current : pickButton.current)?.focus(); }}>
          <div className="rc-final-drawer-head"><SheetTitle>{drawer?.kind === 'pick' ? 'Pick passages' : 'Customize drill'}</SheetTitle><SheetDescription>{drawer?.kind === 'practice' ? 'Adjust how you practice this passage.' : drawer?.kind === 'pick' ? 'Choose whole passages and set their order. Apply when you are ready.' : handPickOpen ? 'Browsing filters help you find passages in the picker; your picks stay unchanged. No recorded exposure, if chosen, is also a launch requirement.' : 'Refine your passages and practice options. Apply when you are ready.'}</SheetDescription></div>
          <div className="rc-final-drawer-body">
            {drawer?.kind !== 'practice' && <div className="rc-drawer-methods" role="group" aria-label="Passage selection method">
              <button type="button" aria-label="Tutor's choice" aria-pressed={drawer?.mode === 'automatic'} onClick={() => changeDrawerMethod('automatic')}><span><strong>Tutor's choice</strong><small>Adaptive selection from your passage pool</small></span><span className="rc-method-mark" aria-hidden="true">{drawer?.mode === 'automatic' ? '●' : '○'}</span></button>
              <button type="button" aria-label="Pick passages" aria-pressed={drawer?.mode === 'manual'} onClick={() => changeDrawerMethod('manual')}><span><strong>Pick passages</strong><small>Search, select, and arrange exact passages</small></span><span className="rc-method-mark" aria-hidden="true">{drawer?.mode === 'manual' ? '●' : '○'}</span></button>
            </div>}
            {drawer?.kind === 'practice' && <p className="rc-field-hint">Your exact passage stays selected. Clear the lookup first to change passage filters.</p>}
            {drawerState?.kind === 'pick' && <p className="sr-only" role="status" aria-live="polite">{selectionAnnouncement}</p>}
            {drawer?.kind !== 'pick' && practiceOptions}
            {drawer?.kind === 'filters' && drawerFilterControls}
            {drawer?.kind === 'pick' && <>
              <label className="rc-field-label" htmlFor="rc-passage-search">Find a passage</label><input id="rc-passage-search" type="search" className="rc-passage-search" placeholder="Search by title or PrepTest" value={search} onChange={event => setSearch(event.target.value)} />
<div className="rc-picker-tools">              <details className="rc-final-pick-filters"><summary>Filters</summary><p className="rc-field-hint">Browsing filters help you find passages. Your selected passages stay in place. If you choose No recorded exposure, it is also enforced when you start.</p>{drawerFilterControls}</details>
              <label className="rc-field-label rc-final-sort">Sort passages <select aria-label="Sort passages" value={pickerSort} onChange={event => setPickerSort(event.target.value as typeof pickerSort)}><option value="address">PrepTest order</option><option value="difficulty">Difficulty</option><option value="title">Title</option></select></label>
</div>              <p className="rc-field-hint">{drawer.ids.length} selected · {plural(handPickRows.length, 'passage')} {handPickRows.length === 1 ? 'matches' : 'match'} your search and browsing filters.</p>

              {drawer.ids.length > 0 && <h3 className="rc-picker-section-heading">Your selection</h3>}
              <ol className="rc-final-ordered" aria-label="Selected passages">{drawer.ids.map((id, index) => { const passage = passages.find(value => value.passageId === id); const title = passage?.title || `Passage ${id}`; return <li key={id}><span>{index + 1}. {title}</span><button type="button" className="rc-chip" aria-label={`Move ${title} earlier`} disabled={index === 0} onClick={() => moveDraftPick(index, -1)}>↑</button><button type="button" className="rc-chip" aria-label={`Move ${title} later`} disabled={index === drawer.ids.length - 1} onClick={() => moveDraftPick(index, 1)}>↓</button><button type="button" className="rc-chip" aria-label={`Remove ${title} from selection`} onClick={() => changeDraftPick(id)}>×</button></li>; })}</ol>
              {drawer.ids.some(id => !handPickRows.some(value => value.passageId === id)) && <p className="rc-field-hint">Picks outside the current search or filters stay selected.</p>}
              <h3 className="rc-picker-section-heading">Available passages</h3><ul className="rc-passage-list" aria-label="Available passages">{handPickRows.slice(pickerLimit - RC_PICKER_PAGE, pickerLimit).map(passage => { const picked = drawer.ids.includes(passage.passageId); return <li key={passage.passageId} className={`rc-passage-option${picked ? ' rc-passage-picked' : ''}`}><div className="rc-passage-option-copy"><h3>{passage.title || `Passage ${passage.setNumber}`}</h3><div className="rc-passage-location">PT {passage.preptest} · S{passage.section} · P{passage.setNumber} · {plural(passage.questionCount, 'question')}</div><div className="rc-passage-quick-meta">{[passage.topic, passage.difficulty == null ? null : `Difficulty ${passage.difficulty}/5`].filter(Boolean).join(' · ')}</div><details className="rc-passage-details"><summary>Passage details</summary>{passage.firstWords && <p className="rc-passage-opening">{passage.firstWords}</p>}<div className="rc-passage-metadata">{passage.topic && <span>{passage.topic}</span>}{passage.format && <span>{passage.format}</span>}{passage.difficulty != null && <span>Difficulty {passage.difficulty}/5</span>}<span>{formatPassageStatusLabel(statusOf(passage))}</span></div></details></div><button type="button" className={`rc-chip${picked ? ' rc-picked-toggle' : ''}`} aria-label={`${picked ? 'Remove' : 'Add'} ${passage.title || `passage ${passage.passageId}`}`} aria-pressed={picked} onClick={() => changeDraftPick(passage.passageId)}>{picked ? <><span aria-hidden="true">✓</span><span className="sr-only">Selected</span></> : 'Add'}</button></li>; })}</ul>
              {handPickRows.length > RC_PICKER_PAGE && <div className="rc-actions"><p className="rc-field-hint">Showing {pickerLimit - RC_PICKER_PAGE + 1}–{Math.min(pickerLimit, handPickRows.length)} of {handPickRows.length} passages.</p><button type="button" className="rc-chip" disabled={pickerLimit === RC_PICKER_PAGE} onClick={() => setPickerLimit(value => value - RC_PICKER_PAGE)}>Previous passages</button><button type="button" className="rc-chip" disabled={pickerLimit >= handPickRows.length} onClick={() => setPickerLimit(value => value + RC_PICKER_PAGE)}>Next passages</button></div>}
              {filteredSearchCount > 0 && <div className="rc-filter-exclusion"><p role="status">{plural(filteredSearchCount, 'matching passage')} excluded by active filters.</p><ul>{excludedSearchMatches.slice(0, 3).map(passage => <li key={passage.passageId}><strong>{passage.title || `Passage ${passage.setNumber}`}</strong> · PT {passage.preptest} · S{passage.section} · P{passage.setNumber}<span>{exclusionReasons(passage)}</span></li>)}</ul>{filteredSearchCount > 3 && <p>And {filteredSearchCount - 3} more. Adjust passage filters to include them.</p>}</div>}{handPickRows.length === 0 && <div className="rc-empty"><p>{filteredSearchCount > 0 ? 'Matching passages are excluded by your active filters. Adjust them to include these passages.' : pickerQuery ? 'No passages match your search. Try a title or PrepTest number.' : 'No passages match these browsing filters. Adjust them to find passages.'} Your selection is kept.</p><button type="button" className="rc-chip" onClick={event => { const details = event.currentTarget.closest('.rc-final-drawer-body')?.querySelector<HTMLDetailsElement>('.rc-final-pick-filters'); if (details) { details.open = true; details.querySelector<HTMLElement>('summary')?.focus(); } }}>Adjust passage filters</button></div>}{search && <button type="button" className="rc-chip" onClick={() => setSearch('')}>Clear search</button>}
            </>}
            {drawer?.kind === 'pick' && practiceOptions}
          </div>
          <div className="rc-final-drawer-footer">{drawer?.kind === 'pick' && <span className="rc-picker-footer-count">{plural(drawer.ids.length, 'passage')} selected</span>}{drawer?.kind !== 'practice' && <button type="button" aria-label={drawer?.kind === 'pick' ? 'Clear selection' : 'Reset filters'} className="rc-chip" onClick={() => setDrawer(previous => previous ? previous.kind === 'pick' ? { ...previous, ids: [] } : { ...previous, filters: cloneFilters(DEFAULT_FILTERS), range: null } : null)}>{drawer?.kind === 'pick' ? 'Clear' : 'Reset to defaults'}</button>}<div><button type="button" className="rc-chip" onClick={() => setDrawer(null)}>Cancel</button><button type="button" className="rc-button rc-button-primary" aria-label="Apply" disabled={drawerRangeInvalid} onClick={applyDrawer}>{drawer?.kind === 'pick' ? drawer.ids.length ? `Apply ${plural(drawer.ids.length, 'passage')}` : 'Apply selection' : 'Apply changes'}</button></div></div>
        </SheetContent>
      </Sheet>

      {reviewStage && <details className="rc-builder-saved"><summary>Save this drill or its settings</summary><RcSavedSetsPanel variant="contextual"
        recipe={builderReady && count <= 8 && !exactMode && !params.has('assignment') && !params.has('assignmentId') && !ptRun ? { kind: 'rc-builder', version: 1, mode: 'recipe', config: { reveal, timing: config.timing, ...(config.training ? { training: config.training } : {}) }, filters, count, passageIds: [], questionIds: [] } : null}
        fixed={builderReady && activeSet && !params.has('assignment') && !params.has('assignmentId') && !ptRun ? { kind: 'rc-builder', version: 1, mode: 'fixed', config: { reveal, timing: config.timing, ...(config.training ? { training: config.training } : {}) }, filters: fixedSelectionFilters(filters), count: activeSet.ids.length, passageIds: activeSet.ids, questionIds: activeSet.passages.flatMap(p => p.questions.map(q => q.questionId)) } : null}
      /></details>}
      {/* ---------------------------------------------------------- history */}
      {showHistory && <h2 style={{ marginTop: 32 }}>Your drills</h2>}
      {showHistory && sessions.length === 0 && <p className="rc-empty">No drills yet.</p>}
      {showHistory && sessions.map((s) => (
        <div
          key={s.id}
          className={`rc-session-row${s.excludedFromAnalytics ? ' rc-session-excluded' : ''}`}
        >
          <span>
            {s.passageIds.length} passage{s.passageIds.length === 1 ? '' : 's'} ·{' '}
            {s.config.timing.mode === 'unlimited' ? 'untimed' : 'timed'} ·{' '}
            {REVEAL_OPTIONS.find((o) => o.id === s.config.reveal)?.label.toLowerCase()}
          </span>
          <span className="rc-status-chip">
            {s.status === 'in_progress' ? 'in progress' : s.status}
          </span>
          {canRevealRcResults(s) && scores.has(s.id) && (
            <span>
              {scores.get(s.id)!.correct} / {scores.get(s.id)!.total}
            </span>
          )}
          {s.excludedFromAnalytics && <span className="rc-status-chip">excluded</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {s.status === 'in_progress' ? (
              <button
                type="button"
                className="rc-chip"
                onClick={() => navigate(s.config.timedSectionSittingId ? timedSectionResumeHref(s.config.timedSectionSittingId) : '/rc/drill?sessionId=' + s.id)}
              >
                Resume
              </button>
            ) : (
              <button
                type="button"
                className="rc-chip"
                onClick={() => navigate('/rc/results/' + s.id)}
              >
                Results
              </button>
            )}
            {s.status === 'in_progress' && !s.config.timedSectionSittingId && !s.config.practiceTestRunId && (
              <button type="button" className="rc-chip" disabled={discarding !== null} onClick={() => removeSession(s.id)}>
                {discarding === s.id ? 'Discarding…' : 'Discard'}
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function FilterGroup({
  label,
  values,
  active,
  onToggle,
}: {
  label: string;
  values: string[];
  active: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <details className="rc-filter-select">
      <summary><span>{label}</span><strong>{active.length ? active.join(', ') : 'Any'}</strong></summary>
      <div className="rc-filter-checklist" role="group" aria-label={label}>
        {values.map((value) => (
          <label key={value}><input type="checkbox" checked={active.includes(value)} onChange={() => onToggle(value)} /><span>{value}</span></label>
        ))}
      </div>
    </details>
  );
}
