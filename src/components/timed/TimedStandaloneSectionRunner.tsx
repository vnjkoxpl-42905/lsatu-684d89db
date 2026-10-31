import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import { TimedSectionClient, TimedSectionError, type TimedSectionPayloads } from '@/lib/timedSectionClient';
import { TimedSectionController, type TimedSectionState } from '@/lib/timedSectionController';
import type { TimedChildAnswer } from '@/lib/timedChildController';
import type { TimedLetter } from '@/lib/timedWorkClient';
import { getPracticeTestDeviceId } from '@/lib/practiceTestStore';
import { RcTimedReader } from '@/components/timed/RcTimedReader';
import { initialState } from '@/features/rc/lib/rcSession';
import type { RcHighlight, RcHighlightColor } from '@/features/rc/lib/rcTypes';
import type { HighlightMode } from '@/lib/highlightUtils';
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

/** Dedicated account writer. A URL may offer creation; only an explicit action creates or starts it. */
export default function TimedStandaloneSectionRunner({ controllerFactory = factory }: { controllerFactory?: StandaloneControllerFactory }) {
  const { sittingId = '' } = useParams(); const [params] = useSearchParams(); const { user } = useAuth(); const navigate = useNavigate();
  const device = React.useMemo(getPracticeTestDeviceId, []);
  const identity = `${user?.id ?? ''}:${sittingId}`; const active = React.useRef(identity); active.current = identity;
  const controller = React.useMemo(() => user?.id && uuid.test(sittingId) ? controllerFactory(user.id, sittingId, device) : null, [user?.id, sittingId, device, controllerFactory]);
  const creation = standaloneCreationRequest(params);
  const [state, setState] = React.useState<TimedSectionState | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, TimedChildAnswer>>({});
  const answersRef = React.useRef(answers); answersRef.current = answers;
  const stateRef = React.useRef(state); stateRef.current = state;
  const [error, setError] = React.useState<string | null>(null); const [missing, setMissing] = React.useState(false);
  const [busy, setBusy] = React.useState(false); const busyRef = React.useRef(false);
  const [dirty, setDirty] = React.useState(false);
  const [loading, setLoading] = React.useState(true); const [confirm, setConfirm] = React.useState(false);
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
  const [marksReady, setMarksReady] = React.useState<string | null>(null);
  const marksKey = `lsatu:timed-section-markers:v1:${encodeURIComponent(owner ?? '')}:${encodeURIComponent(sittingId)}`;
  const [localSaveError, setLocalSaveError] = React.useState<string | null>(null);
  const [localRetry, setLocalRetry] = React.useState(0);
  React.useEffect(() => {
    if (!state || state.snapshot.sitting.owner_id !== owner || state.snapshot.sitting.id !== sittingId || marksReady === marksKey) return;
    setLocalSaveError(null);
    setRcMarks({}); setFontScale(1); setExtraLeading(0); setScheme(''); setParagraphFocus(false); setPassageOnly(false); setFind(''); setMarker('none'); setColor('yellow'); setScrollTops({});
    try {
      const stored = JSON.parse(localStorage.getItem(marksKey) ?? 'null');
      if (stored?.ownerId === owner && stored?.sittingId === sittingId) {
        setRcMarks(validateRcTimedMarks(stored.rcMarks, state.passages));
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
      localStorage.setItem(marksKey, JSON.stringify({ ownerId: owner, sittingId, rcMarks, fontScale, extraLeading, scheme, paragraphFocus, passageOnly }));
      setLocalSaveError(null);
    } catch {
      setLocalSaveError('Marks and display settings are not saved on this device. Keep this page open and retry. Account answers are saved separately.');
    }
  }, [marksReady, marksKey, owner, sittingId, rcMarks, fontScale, extraLeading, scheme, paragraphFocus, passageOnly, localRetry]);
  const rcItems = React.useMemo(() => state?.snapshot.sitting.kind === 'rc' ? initialState(state.passages).items : [], [state?.passages, state?.snapshot.sitting.kind]);
  const apply = React.useCallback((next: TimedSectionState) => {
    if (active.current !== identity || next.snapshot.sitting.owner_id !== owner || next.snapshot.sitting.id !== sittingId) return;
    setState(next); stateRef.current = next; setAnswers(next.answers); answersRef.current = next.answers;
    questionStart.current = performance.now(); setMissing(false); setError(null);
    setDirty(false);
    if (next.regulationAnsweredQids !== undefined) { regulation.current = next.regulationAnsweredQids; regulationAcknowledged.current = true; }
  }, [identity, owner, sittingId]);
  React.useEffect(() => {
    let cancelled = false; setState(null); stateRef.current = null; setAnswers({}); setError(null); setMissing(false); setLoading(true); setBusy(false); setDirty(false); busyRef.current = false; regulation.current = undefined; regulationAcknowledged.current = false;
    if (!controller) { setError('Sign in to the section owner account to continue.'); setLoading(false); return; }
    void controller.load().then(next => { if (!cancelled) apply(next); }).catch(failure => {
      if (cancelled || active.current !== identity) return;
      const canPrepare = Boolean(creation && failure instanceof TimedSectionError && failure.kind === 'access' && !controller.pending());
      setMissing(canPrepare);
      setError(canPrepare ? null : failure instanceof Error ? failure.message : 'The account section could not be loaded.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [controller, apply, identity]);
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
  const perform = async (action: 'prepare' | 'start' | 'save' | 'pause' | 'resume' | 'claim' | 'finish' | 'retry' | 'load' | 'recover' | 'heartbeat' | 'exit', index?: number) => {
    if (!controller || busyRef.current) return;
    busyRef.current = true; setBusy(true); const requestIdentity = identity;
    try {
      let next = stateRef.current;
      if (action === 'prepare') { if (!creation || !missing) throw new Error('An explicit manual section launch is required.'); next = await controller.create(creation); }
      else if (action === 'retry') next = await controller.retry();
      else if (action === 'load') next = await controller.load();
      else if (action === 'recover') next = await controller.recoverRejected();
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
      if (next && active.current === requestIdentity) apply(next);
      if (action === 'exit' && active.current === requestIdentity) navigate('/testing');
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
  if (loading || state && (state.snapshot.sitting.owner_id !== owner || state.snapshot.sitting.id !== sittingId)) return <main className="p-8" role="status">Loading your account section…</main>;
  if (!state || error || pending || clock?.writer !== 'active') return <main className="max-w-2xl mx-auto p-8 space-y-4">
    <h1 className="text-xl font-semibold">{missing ? 'Prepare your section' : state?.snapshot.sitting.phase === 'complete' ? 'Section complete' : 'Section paused'}</h1>
    <p role={error ? 'alert' : undefined}>{error ?? (missing ? 'Prepare this manual section in your account. The clock begins only after you press Start section.' : pending ? 'Retry the retained account command before continuing.' : clock?.writer === 'claim-required' ? 'Refresh and claim the account writer to continue.' : 'This section has finished.')}</p>
    {missing && <Button disabled={busy} onClick={() => void perform('prepare')}>Prepare section</Button>}
    {pending && <Button disabled={busy} onClick={() => void perform('retry')}>Retry saved command</Button>}
    {controller?.rejection() && <Button disabled={busy} variant="outline" onClick={() => void perform('recover')}>Keep account version and archive rejected command</Button>}
    {state && error && !pending && state.snapshot.sitting.phase === 'running' && clock?.writer === 'active' && <Button disabled={busy} onClick={() => void perform('save')}>Retry account save</Button>}
    {!missing && !pending && <Button disabled={busy} variant="outline" onClick={() => void perform('load')}>Retry account load</Button>}
    {state && clock?.writer === 'claim-required' && !pending && <Button disabled={busy} onClick={() => void perform('claim')}>Claim this section</Button>}
    {state?.snapshot.sitting.phase === 'complete' && <Button onClick={() => { const href = controller?.reportHref(state); if (href) navigate(href); }}>View section report</Button>}
    <Button variant="outline" disabled={busy} onClick={() => navigate('/testing')}>Return to Testing</Button>
  </main>;
  if (state.snapshot.sitting.phase === 'ready') return <main className="max-w-2xl mx-auto p-8 space-y-4">
    <h1 className="text-xl font-semibold">PrepTest {state.snapshot.sitting.pt} · {state.snapshot.sitting.kind.toUpperCase()} section {state.snapshot.sitting.section}</h1>
    <p>{state.questions.length} verified questions. Choose the best answer to each question. Answers and explanations appear after you finish.</p>
    <p>{format(state.snapshot.sitting.budget_ms)}. Your account has acknowledged this section. The clock has not started.</p>
    <Button disabled={busy} onClick={() => void perform('start')}>Start section</Button>
    <Button variant="outline" disabled={busy} onClick={() => navigate('/testing')}>Return to Testing</Button>
  </main>;
  const question = state.questions[state.currentIndex]; const answer = answers[question.qid]; const rcItem = rcItems[state.currentIndex];
  return <div className="light text-slate-900"><OfficialDrillFrame isPaused={state.snapshot.sitting.phase === 'paused'} onResume={() => void perform('resume')}
    header={<div className="flex flex-wrap gap-3 items-center"><strong>PrepTest {state.snapshot.sitting.pt} · {state.snapshot.sitting.kind.toUpperCase()} section {state.snapshot.sitting.section}</strong><span aria-label="Section time remaining">{clock.remainingMs === 0 && state.snapshot.sitting.kind === 'lr' && regulationAcknowledged.current ? `Overtime +${format(clock.elapsedMs - (state.snapshot.sitting.budget_ms ?? 0))}` : format(clock.remainingMs)}</span>
      <Button variant="outline" disabled={busy || state.snapshot.sitting.phase !== 'running'} onClick={() => void perform('pause')}>Pause</Button><Button variant="outline" disabled={busy} onClick={() => void perform('exit')}>Testing</Button><span role="status">{busy ? 'Saving to your account…' : dirty ? 'Unsaved changes' : 'Account save acknowledged'}</span></div>}>
    {localSaveError && <div role="alert" className="border-b p-2"><p>{localSaveError}</p><Button size="sm" variant="outline" onClick={() => setLocalRetry(value => value + 1)}>Retry saving marks</Button></div>}
    {rcItem && !localSaveError && <p className="px-2 text-sm">Marks and display settings are saved on this device only.</p>}
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
    {rcItem ? <RcTimedReader item={rcItem} answer={answer} blocked={blocked} annotationsDisabled={marksReady !== marksKey} fontScale={fontScale} extraLeading={extraLeading} paragraphFocus={paragraphFocus} schemeClassName={scheme ? `rc-scheme-${scheme}` : ''} find={find} marker={marker}
      color={color} onColorChange={setColor} passageOnly={passageOnly}
      marks={marksReady === marksKey ? rcMarks[String(rcItem.passage.passageId)] ?? [] : []} onMarksChange={next => { if (!blocked && !busyRef.current && marksReady === marksKey) setRcMarks(previous => ({ ...previous, ...validateRcTimedMarks({ [rcItem.passage.passageId]: next }, [rcItem.passage]) })); }}
      scrollTop={scrollTops[rcItem.passage.passageId] ?? 0} onScrollTop={top => setScrollTops(previous => ({ ...previous, [rcItem.passage.passageId]: top }))}
      onSelect={value => change(previous => ({ ...previous, selected: value as TimedLetter, switchCount: previous.switchCount + (previous.selected && previous.selected !== value ? 1 : 0), eliminations: previous.eliminations.filter(letter => letter !== value) }))}
      onToggleElimination={value => change(previous => ({ ...previous, eliminations: previous.eliminations.includes(value as TimedLetter) ? previous.eliminations.filter(letter => letter !== value) : [...previous.eliminations, value as TimedLetter] }))}
      onToggleFlag={() => change(previous => ({ ...previous, flagged: !previous.flagged }))} /> : (
    <OfficialQuestionPane question={{ ...question, stimulus: question.stimulus ?? '' }} displayNumber={state.currentIndex + 1}
      selectedAnswer={answer.selected ?? ''} eliminatedAnswers={new Set(answer.eliminations)} isFlagged={answer.flagged} interactionLocked={blocked}
      highlights={[]} highlightMode="none" searchTerm="" fontScale={1}
      onAnswerSelect={value => change(previous => ({ ...previous, selected: value as TimedLetter, switchCount: previous.switchCount + (previous.selected && previous.selected !== value ? 1 : 0), eliminations: previous.eliminations.filter(letter => letter !== value) }))}
      onEliminate={value => change(previous => ({ ...previous, eliminations: previous.eliminations.includes(value as TimedLetter) ? previous.eliminations.filter(letter => letter !== value) : [...previous.eliminations, value as TimedLetter] }))}
      onToggleFlag={() => change(previous => ({ ...previous, flagged: !previous.flagged }))} onTextSelection={() => false} onHighlightClick={() => undefined} />
    )}
    <div className="border-t p-3 flex flex-wrap gap-2"><Button variant="outline" disabled={blocked || state.currentIndex === 0} onClick={() => void perform('save', state.currentIndex - 1)}>Previous</Button>
      <nav aria-label="Section questions" className="flex flex-wrap gap-1 flex-1">{state.questions.map((value, index) => <button key={value.qid} aria-current={index === state.currentIndex ? 'step' : undefined} disabled={blocked} onClick={() => void perform('save', index)} className="border rounded px-2 py-1">{index + 1}{answers[value.qid].flagged ? ' ⚑' : ''}{answers[value.qid].selected ? ' •' : ''}</button>)}</nav>
      <Button variant="outline" disabled={blocked || state.currentIndex === state.questions.length - 1} onClick={() => void perform('save', state.currentIndex + 1)}>Next</Button><Button disabled={blocked} onClick={() => setConfirm(true)}>Finish section</Button></div>
  </OfficialDrillFrame></div>;
}
