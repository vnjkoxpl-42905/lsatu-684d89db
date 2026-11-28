import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { studentAssignmentsQueryKey } from '@/hooks/useStudentAssignments';
import { ScorePrediction } from '@/components/drill/ScorePrediction';
import { SectionComplete } from '@/components/drill/SectionComplete';
import { saveSectionPrediction } from '@/lib/sectionReviewRecord';
import { Button } from '@/components/ui/button';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import { isAssignedTimedSection, TimedSectionClient, TimedSectionError, type TimedSectionPayloads, type TimedSectionSitting } from '@/lib/timedSectionClient';
import { TimedSectionController, type TimedSectionState } from '@/lib/timedSectionController';
import { claimSectionStart, sectionPace } from '@/lib/timedSectionAdoption';
import type { TimedChildAnswer } from '@/lib/timedChildController';
import type { TimedLetter } from '@/lib/timedWorkClient';
import { getPracticeTestDeviceId } from '@/lib/practiceTestStore';
import { RcTimedReader } from '@/components/timed/RcTimedReader';
import { initialState } from '@/features/rc/lib/rcSession';
import type { RcHighlight, RcHighlightColor } from '@/features/rc/lib/rcTypes';
import { captureSelectionAcross, eraseRange, replaceOverlappingHighlights, type Highlight, type HighlightMode } from '@/lib/highlightUtils';
import { validateRcTimedMarks } from './rcTimedReaderStorage';

export type StandaloneControllerFactory = (owner: string, sitting: string, device: string) => TimedSectionController;
const factory: StandaloneControllerFactory = (owner, sitting, device) => new TimedSectionController(new TimedSectionClient(owner, sitting), device);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function standaloneCreationRequest(params: URLSearchParams): TimedSectionPayloads['create'] | null {
  const kind = params.get('kind'); const pace = params.get('pace');
  const pt = params.get('pt'); const section = params.get('section');
  if (!['lr', 'rc'].includes(kind ?? '') || !['standard', 'time-and-a-half', 'double-time', 'untimed'].includes(pace ?? '')
    || !/^\d+$/.test(pt ?? '') || !/^\d+$/.test(section ?? '') || Number(pt) < 101 || Number(pt) > 159 || Number(section) < 1 || Number(section) > 4) return null;
  return { kind: kind as 'lr' | 'rc', pt: Number(pt), section: Number(section), pace: pace as TimedSectionPayloads['create']['pace'] };
}
function format(ms: number | null) { if (ms === null) return 'Untimed'; const seconds = Math.ceil(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

/** Dedicated account writer. Only an explicit Start gesture can create and start a section. */
export default function TimedStandaloneSectionRunner({ controllerFactory = factory }: { controllerFactory?: StandaloneControllerFactory }) {
  const { assignmentId, sittingId = '' } = useParams(); const [params] = useSearchParams(); const { user } = useAuth(); const navigate = useNavigate();
  const { pathname, search, state: routeState } = useLocation();
  const navigationType = useNavigationType();
  const queryClient = useQueryClient();
  const device = React.useMemo(getPracticeTestDeviceId, []);
  const identity = (user?.id ?? '') + ':' + (assignmentId ?? '') + ':' + sittingId; const active = React.useRef(identity); active.current = identity;
  const controller = React.useMemo(() => user?.id && uuid.test(sittingId) ? controllerFactory(user.id, sittingId, device) : null, [user?.id, sittingId, device, controllerFactory]);
  const creation = React.useMemo(() => assignmentId ? null : standaloneCreationRequest(params), [assignmentId, params]);
  const carriedStart: unknown = navigationType !== 'POP' ? routeState?.timedSectionStart : undefined;
  const returnRoute = assignmentId ? '/classroom' : '/testing';
  const returnLabel = assignmentId ? 'Classroom' : 'Testing';
  const matchesSource = React.useCallback((sitting: TimedSectionSitting) =>
    assignmentId ? isAssignedTimedSection(sitting, assignmentId) : sitting.source_kind === 'manual-canonical',
  [assignmentId]);
  const [state, setState] = React.useState<TimedSectionState | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, TimedChildAnswer>>({});
  const answersRef = React.useRef(answers); answersRef.current = answers;
  const stateRef = React.useRef(state); stateRef.current = state;
  const [error, setError] = React.useState<string | null>(null); const [missing, setMissing] = React.useState(false);
  const [openingFailure, setOpeningFailure] = React.useState<'stopped' | 'uncertain' | null>(null);
  const openingScope = React.useRef<(() => boolean) | null>(null);
  const [busy, setBusy] = React.useState(false); const busyRef = React.useRef(false);
  const [dirty, setDirty] = React.useState(false);
  const [loading, setLoading] = React.useState(true); const [confirm, setConfirm] = React.useState(false);
  const [finishStep, setFinishStep] = React.useState<{ identity: string; step: 'predict' | 'complete' } | null>(null);
  const [failedPrediction, setFailedPrediction] = React.useState<number | null>(null);
  const [savingPrediction, setSavingPrediction] = React.useState(false);
  const [, tick] = React.useState(0); const questionStart = React.useRef(performance.now());
  const regulation = React.useRef<string[] | undefined>(undefined);
  const regulationAcknowledged = React.useRef(false);
  const owner = user?.id;
  // Reader display settings and the student's own marks. Marks are kept on this
  // device only: the sitting has no field for them, so they never touch the
  // account's answer record and a lost marker cannot affect scoring.
  const [extraLeading, setExtraLeading] = React.useState(0);
  const [scheme, setScheme] = React.useState('');
  const [paragraphFocus, setParagraphFocus] = React.useState(false);
  const [fontScale, setFontScale] = React.useState(1); const [find, setFind] = React.useState('');
  const [marker, setMarker] = React.useState<HighlightMode>('none'); const [color, setColor] = React.useState<RcHighlightColor>('yellow');
  const [passageOnly, setPassageOnly] = React.useState(false); const [scrollTops, setScrollTops] = React.useState<Record<string, number>>({});
  const [rcMarks, setRcMarks] = React.useState<Record<string, RcHighlight[]>>({});
  const [lrMarks, setLrMarks] = React.useState<Record<string, Highlight[]>>({});
  const [marksReady, setMarksReady] = React.useState<string | null>(null);
  const marksKey = `lsatu:timed-section-markers:v1:${encodeURIComponent(owner ?? '')}:${encodeURIComponent(sittingId)}`;
  const [localSaveError, setLocalSaveError] = React.useState<string | null>(null);
  const [localRetry, setLocalRetry] = React.useState(0);
  React.useEffect(() => {
    if (!state || state.snapshot.sitting.owner_id !== owner || state.snapshot.sitting.id !== sittingId || marksReady === marksKey) return;
    setLocalSaveError(null);
    setRcMarks({}); setLrMarks({}); setFontScale(1); setExtraLeading(0); setScheme(''); setParagraphFocus(false); setPassageOnly(false); setFind(''); setMarker('none'); setColor('yellow'); setScrollTops({});
    try {
      const stored = JSON.parse(localStorage.getItem(marksKey) ?? 'null');
      if (stored?.ownerId === owner && stored?.sittingId === sittingId) {
        setRcMarks(validateRcTimedMarks(stored.rcMarks, state.passages));
        if (stored.lrMarks && typeof stored.lrMarks === 'object' && !Array.isArray(stored.lrMarks)) setLrMarks(stored.lrMarks);
        if ([1, 1.15, 1.3].includes(stored.fontScale)) setFontScale(stored.fontScale);
        if (typeof stored.passageOnly === 'boolean') setPassageOnly(stored.passageOnly);
        if ([0, 0.2, 0.4].includes(stored.extraLeading)) setExtraLeading(stored.extraLeading);
        if (['', 'grey', 'purple', 'violet', 'navy', 'black'].includes(stored.scheme)) setScheme(stored.scheme);
        if (typeof stored.paragraphFocus === 'boolean') setParagraphFocus(stored.paragraphFocus);
      }
    } catch { setLocalSaveError('Marks and display settings could not be restored on this device. Account answers are saved separately.'); return; }
    setMarksReady(marksKey);
  }, [marksKey, owner, sittingId, state, marksReady, localRetry]);
  React.useEffect(() => {
    if (marksReady !== marksKey) return;
    try {
      localStorage.setItem(marksKey, JSON.stringify({ ownerId: owner, sittingId, rcMarks, lrMarks, fontScale, extraLeading, scheme, paragraphFocus, passageOnly }));
      setLocalSaveError(null);
    } catch {
      setLocalSaveError('Marks and display settings are not saved on this device. Keep this page open and retry. Account answers are saved separately.');
    }
  }, [marksReady, marksKey, owner, sittingId, rcMarks, lrMarks, fontScale, extraLeading, scheme, paragraphFocus, passageOnly, localRetry]);
  const rcItems = React.useMemo(() => state?.snapshot.sitting.kind === 'rc' ? initialState(state.passages).items : [], [state?.passages, state?.snapshot.sitting.kind]);
  const apply = React.useCallback((next: TimedSectionState) => {
    if (active.current !== identity || next.snapshot.sitting.owner_id !== owner || next.snapshot.sitting.id !== sittingId) return;
    const sitting = next.snapshot.sitting;
    if (!matchesSource(sitting)) {
      setError('Open this section from its original entry in My Work or Testing.');
      return;
    }
    setState(next); stateRef.current = next; setAnswers(next.answers); answersRef.current = next.answers;
    questionStart.current = performance.now(); setMissing(false); setError(null);
    setDirty(false);
    if (next.regulationAnsweredQids !== undefined) { regulation.current = next.regulationAnsweredQids; regulationAcknowledged.current = true; }
  }, [identity, matchesSource, owner, sittingId]);
  const openSection = React.useCallback(async (isCurrent: () => boolean, retryUncertainStart = false) => {
    if (!controller || !creation || !isCurrent() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setOpeningFailure(null);
    let mayHaveStarted = retryUncertainStart;
    try {
      mayHaveStarted ||= controller.pending()?.operation === 'start';
      const selected = (sitting: TimedSectionSitting) =>
        sitting.owner_id === owner && sitting.id === sittingId && matchesSource(sitting) &&
        sitting.kind === creation.kind && sitting.pt === creation.pt && sitting.section === creation.section &&
        sectionPace(sitting.budget_ms === null ? null : sitting.budget_ms / 60000) === creation.pace;
      let next: TimedSectionState | undefined;
      try {
        // Recheck the authoritative attempt before retrying any ambiguous start.
        next = await controller.load();
      } catch (failure) {
        if (!(failure instanceof TimedSectionError && failure.kind === 'access') || mayHaveStarted) throw failure;
      }
      if (!isCurrent()) return;
      if (next && !selected(next.snapshot.sitting)) throw new Error('Section launch does not match the selected section.');
      const pendingCommand = controller.pending();
      const pendingOperation = pendingCommand?.operation;
      if (pendingOperation === 'create' || pendingOperation === 'start') {
        if (pendingOperation === 'create' && (
          pendingCommand.payload.kind !== creation.kind || pendingCommand.payload.pt !== creation.pt ||
          pendingCommand.payload.section !== creation.section || pendingCommand.payload.pace !== creation.pace
        )) throw new Error('Retained section launch does not match the selected section.');
        if (controller.rejection()) {
          // A definite rejection can be cleared only after reading the server's
          // version. Lost replies replay the exact command instead.
          next = await controller.recoverRejected();
        } else {
          next = await controller.retry();
        }
      } else if (!next) {
        next = await controller.create(creation);
      }
      if (!isCurrent()) return;
      const sitting = next.snapshot.sitting;
      if (!selected(sitting)) throw new Error('Section launch does not match the selected section.');
      // Resolving an uncertain Start never issues a fresh command. If the
      // authoritative section is still ready, the student gets Start back.
      if (!mayHaveStarted && pendingOperation !== 'start' && sitting.phase === 'ready' && controller.clock(next).writer === 'active') {
        mayHaveStarted = true;
        next = await controller.control(next, 'start');
      }
      if (isCurrent()) apply(next);
    } catch {
      if (isCurrent()) setOpeningFailure(mayHaveStarted ? 'uncertain' : 'stopped');
    } finally {
      if (isCurrent()) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }, [apply, controller, creation, matchesSource, owner, sittingId]);
  React.useEffect(() => {
    setFinishStep(null); setFailedPrediction(null); setSavingPrediction(false);
    let cancelled = false; setState(null); stateRef.current = null; setAnswers({}); setError(null); setMissing(false); setOpeningFailure(null); setLoading(true); setBusy(false); setDirty(false); busyRef.current = false; regulation.current = undefined; regulationAcknowledged.current = false;
    if (!controller) { setError('Sign in to the section owner account to continue.'); setLoading(false); return; }
    const isCurrent = () => !cancelled && active.current === identity;
    openingScope.current = isCurrent;
    // Delay claiming until the surviving effect. React's development
    // setup/cleanup check must neither burn the ticket nor issue a write twice.
    void Promise.resolve().then(async () => {
      if (!isCurrent()) return;
      if (creation && claimSectionStart(carriedStart, owner, pathname + search)) {
        await openSection(isCurrent);
      } else {
        const next = await controller.load();
        if (isCurrent()) apply(next);
      }
    }).catch(failure => {
      if (cancelled || active.current !== identity) return;
      const canPrepare = Boolean(creation && failure instanceof TimedSectionError && failure.kind === 'access' && !controller.pending());
      if (creation && controller.pending()?.operation === 'create') { setOpeningFailure('stopped'); return; }
      setMissing(canPrepare);
      setError(canPrepare ? null : failure instanceof Error ? failure.message : 'The account section could not be loaded.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; openingScope.current = null; };
  }, [controller, apply, identity, creation, carriedStart, owner, pathname, search, openSection]);
  const assignmentPhase = state && matchesSource(state.snapshot.sitting) ? state.snapshot.sitting.phase : null;
  React.useEffect(() => {
    if (!assignmentId || !owner || !assignmentPhase || assignmentPhase === 'ready') return;
    void queryClient.invalidateQueries({ queryKey: studentAssignmentsQueryKey(owner) });
    void queryClient.invalidateQueries({ queryKey: ['classroom-items', owner] });
  }, [assignmentId, assignmentPhase, owner, queryClient]);
  const clock = state && controller ? controller.clock(state) : null;
  // A save in flight has already stored its command; that is not a stalled save, so the section stays on screen.
  const pending = busy ? null : controller?.pending();
  const blocked = busy || Boolean(error) || !state || state.snapshot.sitting.phase !== 'running' || clock?.writer !== 'active'
    || clock.remainingMs === 0 && (state.snapshot.sitting.kind === 'rc' || !regulationAcknowledged.current);
  const accrue = (current: TimedSectionState) => {
    const next = { ...answersRef.current }; const qid = current.questions[current.currentIndex]?.qid;
    if (qid && controller?.clock(current).writer === 'active' && current.snapshot.sitting.phase === 'running') {
      next[qid] = { ...next[qid], timeMs: next[qid].timeMs + Math.max(0, performance.now() - questionStart.current) };
    }
    questionStart.current = performance.now(); answersRef.current = next; setAnswers(next); return next;
  };
  const perform = async (action: 'start' | 'save' | 'pause' | 'resume' | 'claim' | 'finish' | 'retry' | 'load' | 'recover' | 'check-start' | 'heartbeat' | 'exit', index?: number) => {
    if (!controller || busyRef.current) return;
    busyRef.current = true; setBusy(true); const requestIdentity = identity;
    const isCurrent = openingScope.current;
    try {
      let next = stateRef.current;
      if (action === 'retry') next = await controller.retry();
      else if (action === 'load') next = await controller.load();
      else if (action === 'recover') next = await controller.recoverRejected();
      else if (action === 'check-start') {
        next = await controller.load();
        if (!isCurrent?.()) return;
        if (!matchesSource(next.snapshot.sitting)) throw new Error('Open this section from its original entry.');
        if (controller.pending()?.operation === 'start') {
          next = controller.rejection() ? await controller.recoverRejected() : await controller.retry();
        }
      }
      else {
        if (!next) throw new Error('Load the account section first.');
        if (['save', 'pause', 'finish', 'exit'].includes(action) && next.snapshot.sitting.phase === 'running') {
          next = await controller.checkpoint(next, index ?? next.currentIndex, accrue(next), regulation.current);
          if (active.current !== requestIdentity) return;
          apply(next);
        }
        if (action === 'finish') next = await controller.close(next);
        else if (action === 'exit' && next.snapshot.sitting.phase === 'running') next = await controller.control(next, 'pause');
        else if (['start', 'pause', 'resume', 'claim', 'heartbeat'].includes(action)) next = await controller.control(next, action as 'start' | 'pause' | 'resume' | 'claim' | 'heartbeat');
      }
      if (next && active.current === requestIdentity) {
        if ((action === 'finish' || action === 'retry') && stateRef.current?.snapshot.sitting.kind === 'lr'
          && next.snapshot.sitting.phase === 'complete') {
          setFailedPrediction(null);
          setFinishStep({ identity: requestIdentity, step: 'predict' });
        }
        apply(next);
      }
      if (action === 'exit' && active.current === requestIdentity) navigate(returnRoute);
    } catch (failure) {
      if (active.current === requestIdentity) setError(failure instanceof Error ? failure.message : 'The account save was not acknowledged.');
    } finally { if (active.current === requestIdentity) { busyRef.current = false; setBusy(false); } }
  };
  React.useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (current && controller && !error && current.snapshot.sitting.phase === 'running') {
        const currentClock = controller.clock(current);
        if (currentClock.writer === 'active' && currentClock.remainingMs === 0) {
          if (current.snapshot.sitting.kind === 'lr') {
            if (regulation.current === undefined) regulation.current = current.questions.filter(question => answersRef.current[question.qid].selected !== null).map(question => question.qid);
            if (!regulationAcknowledged.current && !busyRef.current) void perform('save');
          } else if (!busyRef.current) void perform('finish');
        }
      }
      tick(value => value + 1);
    }, 500);
    return () => clearInterval(timer);
  }, [controller, identity, error]);
  // Cadence belongs to this mounted owner/sitting only. A failed reply stops automatic writes.
  React.useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (current && !busyRef.current && !error && current.snapshot.sitting.phase === 'running' && controller?.clock(current).writer === 'active') void perform('save');
    }, 10000);
    return () => clearInterval(timer);
  }, [controller, identity, error]);
  const change = (update: (answer: TimedChildAnswer) => TimedChildAnswer) => {
    if (blocked || !state) return;
    const qid = state.questions[state.currentIndex].qid; const next = { ...answersRef.current, [qid]: update(answersRef.current[qid]) };
    answersRef.current = next; setAnswers(next);
    setDirty(true);
  };
  const pendingOpen = pending?.operation === 'start' ? 'uncertain' : pending?.operation === 'create' ? 'stopped' : null;
  const openFailure = openingFailure ?? pendingOpen;
  const returnText = assignmentId ? 'Back to Classroom' : 'Back to Testing Centre';
  if (loading || creation && busy && (!state || state.snapshot.sitting.phase === 'ready') || state && (state.snapshot.sitting.owner_id !== owner || state.snapshot.sitting.id !== sittingId || !matchesSource(state.snapshot.sitting))) {
    return <main className="mx-auto max-w-2xl p-8" role="status">Opening section…</main>;
  }
  if (creation && (openFailure || missing)) {
    const detail = openFailure === 'uncertain' ? 'We couldn’t confirm whether your timer started. Check your section to continue.'
      : openFailure === 'stopped' ? 'We couldn’t open your section. Your timer hasn’t started.' : 'Start when you’re ready.';
    return <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-xl font-semibold">PrepTest {creation.pt} · {creation.kind === 'lr' ? 'Logical Reasoning' : 'Reading Comprehension'} · Section {creation.section}</h1>
      <p role={openFailure ? 'alert' : undefined}>{detail}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => { if (openingScope.current) void openSection(openingScope.current, openFailure === 'uncertain'); }}>
          {openFailure === 'uncertain' ? 'Check and continue' : openFailure ? 'Try again' : 'Start section'}
        </Button>
        <Button variant="outline" onClick={() => navigate(returnRoute)}>{returnText}</Button>
      </div>
    </main>;
  }
  const checkingStart = pending?.operation === 'start' || Boolean(error && state?.snapshot.sitting.phase === 'ready');
  const canRetrySave = error && !pending && state?.snapshot.sitting.phase === 'running' && clock?.writer === 'active';
  const canContinueHere = state && !pending && clock?.writer === 'claim-required';
  const canReload = !checkingStart && !pending && !canRetrySave && !canContinueHere && (!state || error);
  const finish = finishStep?.identity === identity && state?.snapshot.sitting.phase === 'complete' ? finishStep.step : null;
  if (!state || !clock || error || pending || (!finish && clock.writer !== 'active')) return <main className="max-w-2xl mx-auto p-8 space-y-4">
    <h1 className="text-xl font-semibold">{state?.snapshot.sitting.phase === 'complete' ? 'Section complete' : 'Your section'}</h1>
    <p role={error ? 'alert' : undefined}>{checkingStart ? 'We couldn’t confirm whether your timer started. Check your section to continue.'
      : pending ? 'We couldn’t confirm your last change. Try again before continuing.' : clock?.writer === 'claim-required'
      ? 'Open this section on this device to continue.' : canRetrySave ? 'We couldn’t save your last change.'
        : error ? 'We couldn’t open your section.' : 'This section has finished.'}</p>
    {checkingStart && <Button disabled={busy} onClick={() => void perform('check-start')}>Check and continue</Button>}
    {!checkingStart && pending && !controller?.rejection() && <Button disabled={busy} onClick={() => void perform('retry')}>Try again</Button>}
    {!checkingStart && controller?.rejection() && <Button disabled={busy} variant="outline" onClick={() => void perform('recover')}>Use last saved attempt</Button>}
    {canRetrySave && <Button disabled={busy} onClick={() => void perform('save')}>Try saving again</Button>}
    {canReload && <Button disabled={busy} variant="outline" onClick={() => void perform('load')}>Try again</Button>}
    {canContinueHere && <Button disabled={busy} variant="outline" onClick={() => void perform('claim')}>Continue on this device</Button>}
    {state?.snapshot.sitting.phase === 'complete' && <Button onClick={() => { const href = controller?.reportHref(state); if (href) navigate(href); }}>View section report</Button>}
    <Button variant="outline" disabled={busy} onClick={() => navigate(returnRoute)}>{returnText}</Button>
  </main>;
  if (state.snapshot.sitting.phase === 'ready') return <main className="max-w-2xl mx-auto p-8 space-y-4">
    <h1 className="text-xl font-semibold">PrepTest {state.snapshot.sitting.pt} · {state.snapshot.sitting.kind.toUpperCase()} section {state.snapshot.sitting.section}</h1>
    <p>{state.questions.length} questions · {format(state.snapshot.sitting.budget_ms)}.</p>
    <Button disabled={busy} onClick={() => void perform('start')}>Start section</Button>
    <Button variant="outline" disabled={busy} onClick={() => navigate(returnRoute)}>{returnText}</Button>
  </main>;
  const persistPrediction = async (score: number) => {
    const historyId = state.snapshot.sitting.result?.historyId;
    if (typeof historyId !== 'string') return;
    setSavingPrediction(true);
    try {
      await saveSectionPrediction(historyId, score);
      if (active.current === identity) setFailedPrediction(null);
    } catch {
      if (active.current === identity) setFailedPrediction(score);
    } finally {
      if (active.current === identity) setSavingPrediction(false);
    }
  };
  const openReport = (blindReview: boolean) => {
    const href = controller?.reportHref(state);
    if (href) navigate(blindReview ? href + '?blindReview=1' : href);
  };
  const question = state.questions[state.currentIndex]; const answer = answers[question.qid]; const rcItem = rcItems[state.currentIndex];
  return <div className="light text-slate-900"><OfficialDrillFrame isPaused={state.snapshot.sitting.phase === 'paused'} onResume={() => void perform('resume')}
    header={<div className="flex flex-wrap gap-3 items-center"><strong>PrepTest {state.snapshot.sitting.pt} · {state.snapshot.sitting.kind.toUpperCase()} section {state.snapshot.sitting.section}</strong><span aria-label="Section time remaining">{clock.remainingMs === 0 && state.snapshot.sitting.kind === 'lr' && regulationAcknowledged.current ? `Overtime +${format(clock.elapsedMs - (state.snapshot.sitting.budget_ms ?? 0))}` : format(clock.remainingMs)}</span>
      <Button variant="outline" disabled={busy || state.snapshot.sitting.phase !== 'running'} onClick={() => void perform('pause')}>Pause</Button><Button variant="outline" disabled={busy} onClick={() => void perform('exit')}>{returnLabel}</Button><span role="status">{busy ? 'Saving answers…' : dirty ? 'Unsaved changes' : ''}</span></div>}>
    {localSaveError && <div role="alert" className="border-b p-2"><p>{localSaveError}</p><Button size="sm" variant="outline" onClick={() => setLocalRetry(value => value + 1)}>Retry saving marks</Button></div>}
    {confirm && <div role="dialog" aria-label="Finish section" className="p-4 flex flex-wrap gap-3"><p>{Object.values(answers).filter(value => !value.selected).length} unanswered. Finish this section?</p><Button disabled={busy} onClick={() => { setConfirm(false); void perform('finish'); }}>Confirm finish</Button><Button variant="outline" onClick={() => setConfirm(false)}>Keep working</Button></div>}
    {rcItem && <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <details className="relative"><summary className="min-h-11 cursor-pointer rounded border px-3 py-2">Display</summary>
      <div className="absolute left-0 top-full z-30 w-72 max-w-[80vw] space-y-3 rounded border bg-background p-3 shadow-lg">
      <label className="block text-sm">Text size <select aria-label="Text size" value={fontScale} onChange={event => setFontScale(Number(event.target.value))}><option value={1}>Standard</option><option value={1.15}>Large</option><option value={1.3}>Larger</option></select></label>
      <label className="block text-sm">Line spacing <select aria-label="Line spacing" value={extraLeading} onChange={event => setExtraLeading(Number(event.target.value))}><option value={0}>Standard</option><option value={0.2}>Relaxed</option><option value={0.4}>Wide</option></select></label>
      <label className="block text-sm">Color scheme <select aria-label="Color scheme" value={scheme} onChange={event => setScheme(event.target.value)}>
        <option value="">Black on white</option><option value="grey">Grey on light grey</option><option value="purple">Purple on light green</option>
        <option value="violet">Black on violet</option><option value="navy">Yellow on navy</option><option value="black">White on black</option>
      </select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={paragraphFocus} onChange={event => setParagraphFocus(event.target.checked)} />Paragraph focus</label>
      </div></details>
      <label className="text-sm">Marker <select aria-label="Marker" value={marker} onChange={event => setMarker(event.target.value as HighlightMode)}><option value="none">Select</option><option value="yellow">Yellow</option><option value="pink">Pink</option><option value="orange">Orange</option><option value="underline">Underline</option><option value="erase">Erase</option></select></label>
      <input aria-label="Find in passage" className="border rounded px-2 w-36" value={find} onChange={event => setFind(event.target.value)} placeholder="Find in passage" />
      <Button size="sm" variant="outline" onClick={() => setPassageOnly(value => !value)}>{passageOnly ? 'Show questions' : 'Passage only'}</Button>
    </div>}
    {!rcItem && question && <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <label className="text-sm">Marker <select aria-label="Marker" value={marker} onChange={event => setMarker(event.target.value as HighlightMode)}><option value="none">Select</option><option value="yellow">Yellow</option><option value="pink">Pink</option><option value="orange">Orange</option><option value="underline">Underline</option><option value="erase">Erase</option></select></label>
    </div>}
    {rcItem ? <RcTimedReader item={rcItem} answer={answer} blocked={blocked} annotationsDisabled={marksReady !== marksKey} fontScale={fontScale} extraLeading={extraLeading} paragraphFocus={paragraphFocus} schemeClassName={scheme ? `rc-scheme-${scheme}` : ''} find={find} marker={marker}
      color={color} onColorChange={setColor} passageOnly={passageOnly}
      marks={marksReady === marksKey ? rcMarks[String(rcItem.passage.passageId)] ?? [] : []} onMarksChange={next => { if (!blocked && !busyRef.current && marksReady === marksKey) setRcMarks(previous => ({ ...previous, ...validateRcTimedMarks({ [rcItem.passage.passageId]: next }, [rcItem.passage]) })); }}
      scrollTop={scrollTops[rcItem.passage.passageId] ?? 0} onScrollTop={top => setScrollTops(previous => ({ ...previous, [rcItem.passage.passageId]: top }))}
      onSelect={value => change(previous => ({ ...previous, selected: value as TimedLetter, switchCount: previous.switchCount + (previous.selected && previous.selected !== value ? 1 : 0), eliminations: previous.eliminations.filter(letter => letter !== value) }))}
      onToggleElimination={value => change(previous => ({ ...previous, eliminations: previous.eliminations.includes(value as TimedLetter) ? previous.eliminations.filter(letter => letter !== value) : [...previous.eliminations, value as TimedLetter] }))}
      onToggleFlag={() => change(previous => ({ ...previous, flagged: !previous.flagged }))} /> : (
    <OfficialQuestionPane question={{ ...question, stimulus: question.stimulus ?? '' }} displayNumber={state.currentIndex + 1}
      selectedAnswer={answer.selected ?? ''} eliminatedAnswers={new Set(answer.eliminations)} isFlagged={answer.flagged} interactionLocked={blocked}
      highlights={lrMarks[question.qid] ?? []} highlightMode={marker} searchTerm="" fontScale={1}
      onAnswerSelect={value => change(previous => ({ ...previous, selected: value as TimedLetter, switchCount: previous.switchCount + (previous.selected && previous.selected !== value ? 1 : 0), eliminations: previous.eliminations.filter(letter => letter !== value) }))}
      onEliminate={value => change(previous => ({ ...previous, eliminations: previous.eliminations.includes(value as TimedLetter) ? previous.eliminations.filter(letter => letter !== value) : [...previous.eliminations, value as TimedLetter] }))}
      onToggleFlag={() => change(previous => ({ ...previous, flagged: !previous.flagged }))} onTextSelection={regions => { if (blocked || busyRef.current || marksReady !== marksKey || marker === 'none') return false; const captured = captureSelectionAcross(regions); if (!captured.length) return false;
        // Same overlap rules as the PrepTest runner: a new mark cuts away what it covers, so text is never drawn twice.
        setLrMarks(previous => ({ ...previous, [question.qid]: captured.reduce((marks, value) => marker === 'erase'
          ? eraseRange(marks, value.section, value.start, value.end)
          : replaceOverlappingHighlights(marks, { ...value, id: crypto.randomUUID(), color: marker }), previous[question.qid] ?? []) })); window.getSelection()?.removeAllRanges(); return true; }}
      onHighlightClick={id => { if (!blocked && !busyRef.current && marksReady === marksKey && marker === 'erase') setLrMarks(previous => ({ ...previous, [question.qid]: (previous[question.qid] ?? []).filter(value => value.id !== id) })); }} />
    )}
    <div className="border-t p-3 flex flex-wrap gap-2"><Button variant="outline" disabled={blocked || state.currentIndex === 0} onClick={() => void perform('save', state.currentIndex - 1)}>Previous</Button>
      <nav aria-label="Section questions" className="flex flex-wrap gap-1 flex-1">{state.questions.map((value, index) => <button key={value.qid} aria-current={index === state.currentIndex ? 'step' : undefined} disabled={blocked} onClick={() => void perform('save', index)} className="border rounded px-2 py-1">{index + 1}{answers[value.qid].flagged ? ' ⚑' : ''}{answers[value.qid].selected ? ' •' : ''}</button>)}</nav>
      <Button variant="outline" disabled={blocked || state.currentIndex === state.questions.length - 1} onClick={() => void perform('save', state.currentIndex + 1)}>Next</Button><Button disabled={blocked} onClick={() => setConfirm(true)}>Finish section</Button></div>
  </OfficialDrillFrame>
  {finish === 'predict' && <ScorePrediction total={state.questions.length}
    onSkip={() => setFinishStep({ identity, step: 'complete' })}
    onPredict={(score) => { setFinishStep({ identity, step: 'complete' }); void persistPrediction(score); }} />}
  {finish === 'complete' && <SectionComplete score={typeof state.snapshot.sitting.result?.correct === 'number' ? state.snapshot.sitting.result.correct : undefined} total={state.questions.length}
    onBlindReview={() => openReport(true)} onSeeResults={() => openReport(false)}
    pendingPrediction={failedPrediction} retryingPrediction={savingPrediction}
    onRetryPrediction={() => { if (failedPrediction !== null) void persistPrediction(failedPrediction); }} />}
  </div>;
}
