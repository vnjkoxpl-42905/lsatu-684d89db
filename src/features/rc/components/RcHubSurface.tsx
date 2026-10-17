import * as React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadAllIndexPassages, loadPassages } from '../lib/rcBank';
import { RcMarkdown } from './RcMarkdown';
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
  deleteSession,
  getQuestionHistory,
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
} from '../lib/rcTypes';
import {
  formatPace,
  parseCustomPace,
  plural,
  summarizeRcBuild,
} from '../lib/rcBuilderSummary';
import '../rc.css';
import { canonicalRcSection, manualSectionsEnabled, newManualSectionHref, timedSectionResumeHref } from '@/lib/timedSectionAdoption';

const mmss = formatPace;

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
  { id: 'fresh', label: 'Fresh' },
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
}

interface PendingLaunch { id: string; actorId: string; ids: number[]; config: RcDrillConfig; back?: string; replace?: boolean }
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
export function RcHubSurface({ embedded = false, showHistory = true, onCancel }: RcHubSurfaceProps) {
  const { user } = useAuth();
  return <ActorRcHubSurface key={user?.id ?? 'signed-out'} {...{ embedded, showHistory, onCancel }} actorId={user?.id ?? null} />;
}
function ActorRcHubSurface({ embedded = false, showHistory = true, onCancel, actorId }: RcHubSurfaceProps & { actorId: string | null }) {
  const navigate = useNavigate();
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [params] = useSearchParams();

  const [passages, setPassages] = React.useState<RcIndexPassageWithPt[]>([]);
  const [history, setHistory] = React.useState<RcQuestionHistory>(new Map());
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

  const [count, setCount] = React.useState(1);
  const [timing, setTiming] = React.useState<'untimed' | 'standard' | 'custom'>('untimed');
  const [customSeconds, setCustomSeconds] = React.useState(RC_STANDARD_SECONDS_PER_PASSAGE);
  /* The custom field is controlled text so an invalid entry stays on screen,
     explained, instead of being dropped on blur while the old value launches. */
  const [customText, setCustomText] = React.useState(() => mmss(RC_STANDARD_SECONDS_PER_PASSAGE));
  const [reveal, setReveal] = React.useState<RcRevealMode>('per_passage');
  const [filters, setFilters] = React.useState<RcSelectionFilters>(DEFAULT_FILTERS);
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const [handPickOpen, setHandPickOpen] = React.useState(false);
  const [handPicked, setHandPicked] = React.useState<number[]>([]);
  const [search, setSearch] = React.useState('');
  const [starting, setStarting] = React.useState(false);
  const [autoStart, setAutoStart] = React.useState(false);
  const [inspecting, setInspecting] = React.useState(false);
  const [selectedSet, setSelectedSet] = React.useState<{
    key: string;
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
      const [historyRead, sessionsRead] = await Promise.allSettled([
        getQuestionHistory(),
        showHistory ? listSessions() : Promise.resolve([] as RcDrillSession[]),
      ]);
      if (cancelled) return;
      if (historyRead.status === 'fulfilled') {
        setHistory(historyRead.value);
        refreshEligibility();
        setHistoryStatus('ready');
      } else {
        /* A student with no history gets an empty map, not a throw, so a
           throw is a failed read. Fresh and Incorrect would silently treat
           every passage as unseen; say so instead. */
        setHistoryStatus('failed');
      }
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
  React.useEffect(() => {
    const key = params.toString();
    if (appliedFor.current === key) return;
    appliedFor.current = key;
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
    }

    // The quick-build tile on the drill home sends a passage count and asks the
    // hub to go straight in, so a student who has already made their choices
    // does not land on a builder and press Start a second time.
    if (Number.isFinite(countParam) && countParam >= 1) {
      setCount(Math.min(8, Math.round(countParam)));
    }
    setAutoStart(params.get('start') === '1');
  }, [params]);

  // Apply URL settings before the passage index loads so a later index reply
  // cannot reset reveal/timing choices the student already made. Only linked
  // passage IDs need to wait for the index to validate their membership.
  const selectionAppliedFor = React.useRef<string | null>(null);
  const [selectionQuery, setSelectionQuery] = React.useState<string | null>(null);
  React.useEffect(() => {
    const key = params.toString();
    const ids = params.get('passages');
    if (selectionAppliedFor.current === key || ids !== null && passages.length === 0) return;
    selectionAppliedFor.current = key;
    setSelectionQuery(key);

    if (ids !== null) {
      const wanted = ids.split(',').map((n) => /^\d+$/.test(n.trim()) ? Number(n.trim()) : NaN);
      const known = [...new Set(wanted.filter((id) => Number.isSafeInteger(id) && id > 0
        && passages.some((p) => p.passageId === id && p.questionCount > 0)))];
      if (known.length !== wanted.length) {
        setNotice('The linked passages could not be verified. Choose passages and preview the drill below.');
        setAutoStart(false);
      }
      setHandPicked(known);
      setHandPickOpen(known.length > 0);
      setCount(known.length > 0 ? known.length : 1);
    } else {
      /* A link that names no passages is asking for an adaptive set, and a
         hand-pick left over from the PREVIOUS link would be started instead of
         it — a non-empty selection wins over the count and filters below. The
         reveal and timing above already reset for exactly this reason; the
         selection has to reset with them. */
      setHandPicked([]);
      setHandPickOpen(false);
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
      passageStatus(p, questionIdsByPassage.get(p.passageId) ?? [], history),
    [questionIdsByPassage, history],
  );

  const preview = React.useMemo(
    () =>
      selectPassages({
        pool: passages,
        questionIdsByPassage,
        filters,
        history,
        count,
        seed: 1,
      }),
    [passages, questionIdsByPassage, filters, history, count],
  );

  const drillablePassages = passages.filter((p) => p.questionCount > 0);

  const customPace = parseCustomPace(customText);
  const customPaceError = timing === 'custom' && 'message' in customPace ? customPace.message : null;
  const customInvalid = customPaceError !== null;
  const secondsPerPassage =
    timing === 'standard'
      ? RC_STANDARD_SECONDS_PER_PASSAGE
      : timing === 'custom'
        ? customSeconds
        : 0;
  /* Empty history is valid only after a successful read. New previews and
     launches wait for both eligibility inputs and a custom pace that parses. */
  const builderReady = indexStatus === 'ready' && historyStatus === 'ready'
    && selectionQuery === params.toString() && !customInvalid;

  const ptRun = params.get('ptRun');
  const ptLeg = params.get('ptLeg');
  const practiceTestLegIndex = ptRun && ptLeg !== null && /^\d+$/.test(ptLeg)
    ? Number(ptLeg)
    : undefined;
  const config: RcDrillConfig = {
    reveal,
    timing:
      timing === 'untimed'
        ? { mode: 'unlimited' }
        : { mode: 'per_passage_budget', secondsPerPassage },
    source: handPicked.length > 0 ? 'manual' : 'adaptive',
    practiceTestRunId: practiceTestLegIndex !== undefined ? ptRun ?? undefined : undefined,
    practiceTestLegIndex,
  };

  // A change to any launch setting makes an inspected set stale. The same IDs
  // are used for both the read-only inspection and the eventual session.
  // A retry invalidates immediately; successful index/history reads also revise
  // eligibility so an older inspection cannot survive a refreshed pool.
  const selectionKey = JSON.stringify({ count, timing, customSeconds, customInvalid, reveal, filters, handPicked, handPickOpen,
    eligibilityRevision, loadAttempt, query: params.toString() });
  const selectionKeyRef = React.useRef(selectionKey);
  selectionKeyRef.current = selectionKey;
  const activeSet = selectedSet?.key === selectionKey ? selectedSet : null;
  /** An inspected set that a later change made stale, so the student is told. */
  const staleSet = selectedSet !== null && activeSet === null;

  const summary = summarizeRcBuild({
    requestedPassages: count,
    handPickedIds: handPicked,
    poolPassages: preview.poolSize,
    inspected: activeSet
      ? { passageIds: activeSet.ids, questionCounts: activeSet.passages.map((p) => p.questions.length) }
      : null,
    secondsPerPassage,
  });
  const activeSetKey = activeSet ? activeSet.key + '|' + activeSet.ids.join(',') : null;
  const shortfallAccepted = activeSetKey !== null && acceptedShortfall === activeSetKey;
  const needsShortfallAck = activeSet !== null && summary.shortfall > 0 && !shortfallAccepted;
  const inspectSet = async () => {
    if (!builderReady || (handPickOpen && handPicked.length === 0)) return;
    const request = ++inspectRequest.current;
    const key = selectionKey;
    setSelectedSet(null);
    setAcceptedShortfall(null);
    setInspecting(true);
    setNotice(null);
    try {
      const ids = handPicked.length > 0
        ? [...handPicked]
        : selectPassages({
            pool: passages,
            questionIdsByPassage,
            filters,
            history,
            count,
            seed: Date.now() % 2147483647,
          }).selected.map((p) => p.passageId);
      if (ids.length === 0) {
        setNotice('No passages match those filters. Loosen one and try again.');
        return;
      }
      const full = await loadPassages(ids);
      if (!mounted.current || request !== inspectRequest.current || key !== selectionKeyRef.current) return;
      if (full.length !== ids.length || full.some((passage, index) => passage.passageId !== ids[index])) {
        setNotice('Some passages could not be loaded. Try previewing the drill again.');
        return;
      }
      // A passage that loads without questions would start as an empty
      // reading set, so it cannot pass inspection either.
      if (full.some((passage) => passage.questions.length === 0)) {
        setNotice('A passage in this set loaded without its questions. Choose different passages.');
        return;
      }
      const inspected = { key, ids, passages: full };
      setSelectedSet(inspected);
      return inspected;
    } catch {
      if (mounted.current && request === inspectRequest.current && key === selectionKeyRef.current) {
        setNotice('The selected passages could not be loaded. Try again.');
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
    setStarting(true);
    const replace = options?.replace ?? params.get('start') === '1';
    try {
      // Autostart inspects through the same content checks as a manual Preview.
      // An uncertain launch already owns its validated, immutable request.
      const inspected = uncertainStart.current ? null : activeSet ?? (options?.replace ? await inspectSet() : null);
      if (!mounted.current) return;
      if (!uncertainStart.current && !inspected) {
        startingRef.current = false;
        setStarting(false);
        return;
      }
      if (!uncertainStart.current && inspected!.key !== selectionKeyRef.current) {
        throw new Error('Your settings changed. Preview the drill again before starting.');
      }
      if (!uncertainStart.current && handPicked.length === 0 && inspected!.ids.length < count
        && acceptedShortfall !== inspected!.key + '|' + inspected!.ids.join(',')) {
        throw new Error('Confirm the smaller drill below before starting it.');
      }
      const chosen = uncertainStart.current?.ids ?? inspected!.ids;
      const canonical = params.get('timedSection') === 'manual-canonical' && !params.has('assignmentId') && !params.has('assignment') &&
        !ptRun && !params.has('ptLeg') && reveal === 'end_of_set' ? canonicalRcSection(chosen) : null;
      const protectedPace = timing === 'untimed' ? 'untimed' : secondsPerPassage === 525 ? 'standard' :
        secondsPerPassage === 788 ? 'time-and-a-half' : secondsPerPassage === 1050 ? 'double-time' : null;
      const useProtectedSection = !uncertainStart.current && canonical && protectedPace && await manualSectionsEnabled();
      if (!uncertainStart.current && inspected!.key !== selectionKeyRef.current) {
        throw new Error('Your settings changed. Preview the drill again before starting.');
      }
      if (useProtectedSection) {
        if (!mounted.current) return;
        navigate(newManualSectionHref('rc', canonical.pt, canonical.section, protectedPace), { replace: replace || undefined });
        return;
      }
      if (!actorId || !mounted.current) throw new Error('You need to be signed in to drill.');
      // An unresolved save owns its immutable UUID and settings, even if the
      // student edits or inspects another set while reconnecting.
      const request = uncertainStart.current ?? {
        id: crypto.randomUUID(), actorId, ids: [...chosen], config: structuredClone(config),
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

  const toggle = (key: 'topics' | 'formats' | 'frameworks', value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  const toggleDifficulty = (value: number) =>
    setFilters((f) => ({
      ...f,
      difficulties: f.difficulties.includes(value)
        ? f.difficulties.filter((v) => v !== value)
        : [...f.difficulties, value],
    }));

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearch('');
    setHandPicked([]);
    setHandPickOpen(false);
    setCount(1);
    setTiming('untimed');
    setCustomSeconds(RC_STANDARD_SECONDS_PER_PASSAGE);
    setCustomText(mmss(RC_STANDARD_SECONDS_PER_PASSAGE));
    setReveal('per_passage');
    setSelectedSet(null);
    setAcceptedShortfall(null);
    setNotice(null);
  };

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

  const handPickRows = drillablePassages.filter((p) => {
    const searchable = `${p.title ?? ''} ${p.firstWords ?? ''} PrepTest ${p.preptest} PT ${p.preptest} Section ${p.section} Passage ${p.setNumber}`;
    if (search.trim() && !searchable.toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    return matches(p);
  });

  function matches(p: RcIndexPassageWithPt) {
    const status = statusOf(p);
    if (p.preptest < filters.preptestMin || p.preptest > filters.preptestMax) return false;
    if (filters.topics.length && (!p.topic || !filters.topics.includes(p.topic))) return false;
    if (filters.formats.length && (!p.format || !filters.formats.includes(p.format))) return false;
    if (filters.frameworks.length && !p.frameworks.some((f) => filters.frameworks.includes(f)))
      return false;
    if (filters.difficulties.length && (p.difficulty == null || !filters.difficulties.includes(p.difficulty)))
      return false;
    if (filters.status === 'fresh' && status.state !== 'not_attempted') return false;
    if (filters.status === 'incorrect_before' && !status.everIncorrect) return false;
    if (filters.status === 'incorrect_last' && !status.lastFirstTakeIncorrect) return false;
    return true;
  }

  const pickedQuestionCount = handPicked.reduce(
    (n, id) => n + (passages.find((p) => p.passageId === id)?.questionCount ?? 0),
    0,
  );

  const removeSession = async (id: string) => {
    const ok = window.confirm(
      'Delete this drill? Its answers and timings are deleted with it, and that cannot be undone.',
    );
    if (!ok) return;
    await deleteSession(id);
    setSessions(await listSessions());
  };

  return (
    /* Keeps `rc-page` when embedded: that class is where the observatory token
       ladder is declared (classroom.css), so dropping it would strip every ink,
       surface and hairline value out from under the builder. `rc-embedded`
       removes only the page-level frame — full-height, background, padding,
       centred column — which the drill hub's launcher already provides. */
    <div className={embedded ? 'rc-page rc-embedded' : 'rc-page'}>
      {!embedded && (
        <>
          <h1>Reading Comprehension</h1>
          <p className="rc-page-sub">Drill full passages the way they appear on the test.</p>
          <div className="rc-chip-row" style={{ marginTop: 12 }}>
            <button type="button" className="rc-chip" onClick={() => navigate('/rc/search')}>
              Search passages &amp; questions
            </button>
          </div>
        </>
      )}
      {embedded && (
        <div className="rc-actions" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Build a reading drill</h2>
          {onCancel ? (
            <button type="button" className="rc-chip" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <button type="button" className="rc-chip" onClick={resetFilters}>
              Reset filters
            </button>
          )}
        </div>
      )}

      {loadError && (
        <div className="rc-builder-alert" role="alert">
          <span>
            {loadError}{' '}
            {passages.length > 0
              ? 'Your choices are kept. Preview and Start will be available once it loads.'
              : 'No passage counts are shown until it loads.'}
          </span>
          <button type="button" className="rc-chip" onClick={retryLoad} disabled={indexStatus === 'loading'}>
            {indexStatus === 'loading' ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {historyStatus === 'loading' && !loadError && <p className="rc-field-hint" role="status">Loading your answer history…</p>}
      {historyStatus === 'failed' && !loadError && (
        <div className="rc-builder-alert" role="status">
          <span>
            Your answer history could not be loaded, so the Fresh and Incorrect filters cannot tell
            which passages you have already done. Retry before previewing or starting a new drill.
          </span>
          <button type="button" className="rc-chip" onClick={retryLoad} disabled={indexStatus === 'loading'}>
            Retry
          </button>
        </div>
      )}
      {pendingLoad.error && <p className="rc-page-sub" role="alert">{pendingLoad.error}</p>}
      {notice && <p className="rc-page-sub" role="status">{notice}</p>}
      {!starting && recoveryPending && <div className="rc-builder-alert" role="status">
        <span>A previous Start is pending for {describePendingPassages(recoveryPending.ids)}. Retry checks that original saved drill with its original timing and answer settings; your current edits will not start another drill.</span>
        <button type="button" className="rc-chip" disabled={starting} onClick={() => void start()}>Retry original launch</button>
      </div>}

      {/* ------------------------------------------------------- build card */}
      <div className="rc-card rc-builder">
        {/* Embedded, the launcher header above is the title. Two headings, one
            saying "Build a reading drill" and one saying "Build a drill", read
            as a nesting mistake. */}
        {!embedded && <h2>Build a drill</h2>}

        <div className="rc-builder-settings">
          <div className="rc-field rc-builder-count">
            <div className="rc-field-label" id="rc-passage-count-label">Passages</div>
            <div className="rc-stepper" role="group" aria-labelledby="rc-passage-count-label">
              <button
                type="button"
                aria-label="Fewer passages"
                disabled={handPickOpen}
                onClick={() => setCount((c) => Math.max(1, c - 1))}
              >
                −
              </button>
              <span className="rc-stepper-value">{handPickOpen ? handPicked.length : count}</span>
              <button
                type="button"
                aria-label="More passages"
                disabled={handPickOpen}
                onClick={() => setCount((c) => Math.min(8, c + 1))}
              >
                +
              </button>
            </div>
            <div className="rc-field-hint">
              {handPicked.length > 0
                ? `Using your ${plural(handPicked.length, 'hand-picked passage')}. Choose for me lets you set a passage count instead.`
                : handPickOpen ? 'Add passages from the list below.' : 'Each passage includes all its questions.'}
            </div>
          </div>

          <div className="rc-field">
            <div className="rc-field-label">Timing</div>
            <div className="rc-segmented">
              <button
                type="button"
                aria-pressed={timing === 'untimed'}
                className={`rc-segment${timing === 'untimed' ? ' rc-active' : ''}`}
                onClick={() => setTiming('untimed')}
              >
                Untimed
              </button>
              <button
                type="button"
                aria-pressed={timing === 'standard'}
                className={`rc-segment${timing === 'standard' ? ' rc-active' : ''}`}
                onClick={() => setTiming('standard')}
              >
                Standard pace
                <span className="rc-segment-caption">8:45 per passage</span>
              </button>
              <button
                type="button"
                aria-pressed={timing === 'custom'}
                className={`rc-segment${timing === 'custom' ? ' rc-active' : ''}`}
                onClick={() => setTiming('custom')}
              >
                Custom
              </button>
              {timing === 'custom' && (
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Minutes and seconds per passage"
                  aria-invalid={customInvalid}
                  aria-describedby={customInvalid ? 'rc-custom-pace-error' : undefined}
                  className={`rc-segment${customInvalid ? ' rc-input-invalid' : ''}`}
                  value={customText}
                  onChange={(e) => {
                    setCustomText(e.target.value);
                    const parsed = parseCustomPace(e.target.value);
                    if (parsed.ok) setCustomSeconds(parsed.seconds);
                  }}
                  onBlur={() => {
                    // Same normalised m:ss the link parameter produces.
                    if ('seconds' in customPace) setCustomText(mmss(customPace.seconds));
                  }}
                />
              )}
            </div>
            {customPaceError && (
              <div className="rc-field-error" id="rc-custom-pace-error" role="alert">
                {customPaceError} Enter a valid time to continue.
              </div>
            )}
            {timing !== 'untimed' && !customInvalid && (
              <div className="rc-field-hint">
                {mmss(secondsPerPassage)} per passage · {summary.totalSeconds !== null && summary.plannedPassages > 0
                  ? `${mmss(summary.totalSeconds)} for ${plural(summary.plannedPassages, 'passage')}`
                  : 'no passages to time yet'}
              </div>
            )}
          </div>

          <div className="rc-field">
            <div className="rc-field-label">Reveal answers</div>
            <div className="rc-segmented">
              {REVEAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={reveal === option.id}
                  className={`rc-segment${reveal === option.id ? ' rc-active' : ''}`}
                  onClick={() => setReveal(option.id)}
                >
                  {option.label}
                  <span className="rc-segment-caption">{option.caption}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="rc-field">
          <div className="rc-field-label">Passage selection</div>
          <div className="rc-segmented" role="group" aria-label="Passage selection">
            <button type="button" className={`rc-segment${!handPickOpen ? ' rc-active' : ''}`} aria-pressed={!handPickOpen}
              onClick={() => { setHandPickOpen(false); setHandPicked([]); }}>
              Choose for me
            </button>
            <button type="button" className={`rc-segment${handPickOpen ? ' rc-active' : ''}`} aria-pressed={handPickOpen}
              onClick={() => setHandPickOpen(true)}>
              Choose passages
            </button>
          </div>
          <div className="rc-field-hint">
            {indexStatus === 'ready' || passages.length > 0
              ? historyStatus === 'ready' ? `${plural(preview.poolSize, 'passage')} match your filters` : 'Waiting for your answer history'
              : indexStatus === 'loading'
                ? 'Loading passages…'
                : 'Passage list unavailable'}
          </div>
          <div className="rc-field-hint">
            {!handPickOpen && RC_ADAPTIVE_LABEL}
          </div>
          {!handPickOpen && historyStatus === 'ready' && preview.shortfallMessage && passages.length > 0 && (
            <div className="rc-field-hint">{preview.shortfallMessage}</div>
          )}
          <div className="rc-chip-row" style={{ marginTop: 10 }}>
            <button type="button" className="rc-chip" aria-expanded={customizeOpen} aria-controls="rc-passage-filters" onClick={() => setCustomizeOpen((v) => !v)}>
              {customizeOpen ? 'Hide filters' : 'Filter passages'}
            </button>
          </div>
        </div>

        {customizeOpen && (
          <div className="rc-field rc-builder-filters" id="rc-passage-filters">
            <FilterGroup label="Topic" values={[...RC_TOPICS]} active={filters.topics} onToggle={(v) => toggle('topics', v)} />
            <FilterGroup label="Format" values={[...RC_FORMATS]} active={filters.formats} onToggle={(v) => toggle('formats', v)} />
            <FilterGroup label="Framework" values={[...RC_FRAMEWORKS]} active={filters.frameworks} onToggle={(v) => toggle('frameworks', v)} />

            <div className="rc-field-label" style={{ marginTop: 14 }}>Passage difficulty</div>
            <div className="rc-chip-row">
              <button
                type="button"
                className={`rc-chip${filters.difficulties.length === 0 ? ' rc-active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, difficulties: [] }))}
              >
                Adaptive
              </button>
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`rc-chip${filters.difficulties.includes(d) ? ' rc-active' : ''}`}
                  onClick={() => toggleDifficulty(d)}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="rc-field-label" style={{ marginTop: 14 }}>Status</div>
            <div className="rc-chip-row">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`rc-chip${filters.status === option.id ? ' rc-active' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, status: option.id }))}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="rc-field-label" style={{ marginTop: 14 }}>PrepTests</div>
            <div className="rc-chip-row" style={{ alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                aria-label="Earliest PrepTest"
                min={RC_PREPTEST_MIN}
                max={RC_PREPTEST_MAX}
                value={filters.preptestMin}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    preptestMin: Math.min(Number(e.target.value), f.preptestMax),
                  }))
                }
              />
              <input
                type="range"
                aria-label="Latest PrepTest"
                min={RC_PREPTEST_MIN}
                max={RC_PREPTEST_MAX}
                value={filters.preptestMax}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    preptestMax: Math.max(Number(e.target.value), f.preptestMin),
                  }))
                }
              />
              <span>
                {filters.preptestMin}–{filters.preptestMax}
              </span>
            </div>
            <div className="rc-field-hint">
              Newest tests are held back by default so they stay fresh for timed sections
            </div>
          </div>
        )}

        {handPickOpen && (
          <section className="rc-passage-picker" aria-label="Choose your passages">
            <label className="rc-field-label" htmlFor="rc-passage-search">Find a passage</label>
            <input id="rc-passage-search" type="search" className="rc-segment rc-passage-search"
              placeholder="Search title, opening words or PrepTest" value={search}
              onChange={(e) => setSearch(e.target.value)} />
            {handPicked.length > 0 && (
              <div className="rc-picked-passages" aria-label="Selected passages">
                {handPicked.map(id => {
                  const p = passages.find(passage => passage.passageId === id);
                  return <button key={id} type="button" className="rc-chip rc-active"
                    aria-label={`Remove ${p?.title || `passage ${id}`}`}
                    onClick={() => setHandPicked(prev => prev.filter(value => value !== id))}>
                    {p?.title || `Passage ${id}`} <span aria-hidden="true">×</span>
                  </button>;
                })}
                <button type="button" className="rc-chip" onClick={() => setHandPicked([])}>Clear selection</button>
              </div>
            )}
            <p className="rc-field-hint" role="status">
              {handPicked.length} passage{handPicked.length === 1 ? '' : 's'} · {pickedQuestionCount} question{pickedQuestionCount === 1 ? '' : 's'} selected
            </p>
            <ul className="rc-passage-list" aria-label="Available passages">
              {handPickRows.map(p => {
                const status = statusOf(p);
                const picked = handPicked.includes(p.passageId);
                return (
                  <li key={p.passageId} className={`rc-passage-option${picked ? ' rc-passage-picked' : ''}`}>
                    <div className="rc-passage-option-copy">
                      <div className="rc-passage-location">PrepTest {p.preptest} · Section {p.section} · Passage {p.setNumber}</div>
                      <h3>{p.title || `Passage ${p.setNumber}`}</h3>
                      {p.firstWords && <p className="rc-passage-opening">{p.firstWords}</p>}
                      <div className="rc-passage-metadata">
                        {p.topic && <span>{p.topic}</span>}
                        {p.format && <span>{p.format.startsWith('Standard') ? 'Single passage' : p.format.startsWith('Comparative') ? 'Comparative' : p.format}</span>}
                        <span>{plural(p.questionCount, 'question')}</span>
                        {p.difficulty != null && <span>Difficulty {p.difficulty}/5</span>}
                        <span>{formatPassageStatusLabel(status)}</span>
                      </div>
                    </div>
                    <button type="button" className={`rc-chip${picked ? ' rc-active' : ''}`}
                      aria-label={`${picked ? 'Remove' : 'Add'} ${p.title || `passage ${p.passageId}`}`} aria-pressed={picked}
                      onClick={() => setHandPicked(prev => prev.includes(p.passageId) ? prev.filter(id => id !== p.passageId) : [...prev, p.passageId])}>
                      {picked ? 'Remove' : 'Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
            {handPickRows.length === 0 && <p className="rc-empty">No passages match. Change your search or filters.</p>}
          </section>
        )}

        {activeSet && (
          <section className="rc-drill-preview" aria-label="Selected reading set">
            <h2>Drill preview</h2>
            <p className="rc-field-hint">These exact passages and questions will appear in your drill. Answers and explanations are hidden.</p>
            {activeSet.passages.map((passage, index) => (
              <details key={passage.passageId} style={{ marginTop: 16 }}>
                <summary style={{ cursor: 'pointer' }}>
                  {index + 1}. PT {passage.preptest} · {passage.title || `Passage ${passage.setNumber}`} · {passage.questions.length} questions
                </summary>
                <div style={{ maxHeight: 560, overflowY: 'auto', padding: '12px 4px' }}>
                  <RcMarkdown>{passage.text}</RcMarkdown>
                  {passage.questions.map((question) => (
                    <div key={question.questionId} style={{ marginTop: 24 }}>
                      <strong>Question {question.position}</strong>
                      <RcMarkdown>{question.prompt}</RcMarkdown>
                      <div>
                        {question.choices.map((choice) => <div key={choice.letter} style={{ display: 'flex', gap: 8, marginTop: 8 }}><strong>{choice.letter}.</strong><RcMarkdown>{choice.text}</RcMarkdown></div>)}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </section>
        )}

        <section className="rc-launch-summary" aria-label="Launch summary">
          <dl>
            <div>
              <dt>Requested</dt>
              <dd>
                {handPickOpen && handPicked.length === 0 ? 'No passages selected' : summary.source === 'hand-picked'
                  ? plural(summary.requestedPassages, 'hand-picked passage')
                  : plural(summary.requestedPassages, 'passage')}
              </dd>
            </div>
            <div>
              <dt>This drill</dt>
              <dd>
                {activeSet && summary.inspectedQuestions !== null
                  ? `${plural(summary.plannedPassages, 'passage')} · ${plural(summary.inspectedQuestions, 'question')}`
                  : handPickOpen && handPicked.length === 0 ? 'Choose at least one passage above' : 'Preview to see the passages and exact question count'}
              </dd>
            </div>
            <div>
              <dt>Timing</dt>
              <dd>
                {timing === 'untimed'
                  ? 'Untimed practice, no time limit'
                  : customInvalid
                    ? 'Waiting for a valid custom time'
                    : `Timed, ${mmss(secondsPerPassage)} per passage` +
                      (summary.totalSeconds !== null && summary.plannedPassages > 0
                        ? ` (${mmss(summary.totalSeconds)} in all)`
                        : '')}
              </dd>
            </div>
          </dl>
          {staleSet && (
            <p className="rc-field-hint" role="status">
              Your settings changed. Preview the drill again before starting.
            </p>
          )}
          {activeSet && summary.shortfall > 0 && (
            <label className="rc-shortfall">
              <input
                type="checkbox"
                checked={shortfallAccepted}
                onChange={(e) => setAcceptedShortfall(e.target.checked ? activeSetKey : null)}
              />
              <span>
                Only {plural(summary.plannedPassages, 'passage')} of the {summary.requestedPassages} you asked
                for match these filters. Start with {plural(summary.plannedPassages, 'passage')}.
              </span>
            </label>
          )}
          <p className="rc-field-hint">
            Previewing does not save an attempt or show answers. Your work is saved when you start the drill.
          </p>
        </section>

        <div className="rc-actions" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className="rc-button rc-button-primary"
            disabled={starting || inspecting || recoveryPending !== null || uncertainStart.current !== null || !builderReady || (handPickOpen && handPicked.length === 0) || (activeSet !== null && needsShortfallAck)}
            onClick={() => void (activeSet ? start() : inspectSet())}
          >
            {starting ? 'Starting…' : inspecting ? 'Loading preview…' : activeSet ? 'Start this drill' : 'Preview drill'}
          </button>
          {activeSet && !handPickOpen && (
            <button
              type="button"
              className="rc-button"
              disabled={starting || inspecting || !builderReady}
              onClick={() => void inspectSet()}
            >
              Choose different passages
            </button>
          )}
        </div>
      </div>

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
          {scores.has(s.id) && (
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
            <button type="button" className="rc-chip" onClick={() => removeSession(s.id)}>
              Delete
            </button>
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
    <>
      <div className="rc-field-label" style={{ marginTop: 14 }}>
        {label}
      </div>
      <div className="rc-chip-row">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className={`rc-chip${active.includes(value) ? ' rc-active' : ''}`}
            onClick={() => onToggle(value)}
          >
            {value}
          </button>
        ))}
      </div>
    </>
  );
}
