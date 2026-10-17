import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import OfficialDrillFrame from '@/components/drill/official/OfficialDrillFrame';
import OfficialQuestionPane from '@/components/drill/official/OfficialQuestionPane';
import { TimedWorkClient, type TimedLetter, type TimedObject } from '@/lib/timedWorkClient';
import { TimedChildController, type TimedChildAnswer, type TimedChildState } from '@/lib/timedChildController';
import { getPracticeTestDeviceId } from '@/lib/practiceTestStore';
import { captureSelectionAcross, type Highlight, type HighlightMode } from '@/lib/highlightUtils';
import { RcTimedReader } from '@/components/timed/RcTimedReader';
import type { RcHighlight, RcHighlightColor } from '@/features/rc/lib/rcTypes';
import '@/features/rc/rc.css';
import '@/features/rc/player.css';

export type TimedChildControllerFactory = (ownerId: string, runId: string, legIndex: number, kind: 'lr' | 'rc', deviceId: string) => TimedChildController;
const defaultFactory: TimedChildControllerFactory = (owner, run, leg, kind, device) => new TimedChildController(new TimedWorkClient(owner, run), owner, run, leg, kind, device);
const emptyAnswer = (kind: 'lr' | 'rc'): TimedChildAnswer => ({ selected: null, timeMs: 0, flagged: false, switchCount: 0, eliminations: [], ...(kind === 'rc' ? { attemptId: crypto.randomUUID() } : {}) });
function format(ms: number | null): string { if (ms === null) return 'Untimed'; const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }

/** Dedicated official route. Legacy Drill/RC runners and their writers never mount here. */
export default function TimedOfficialChildRunner({ kind, controllerFactory = defaultFactory }: { kind: 'lr' | 'rc'; controllerFactory?: TimedChildControllerFactory }) {
  const { runId = '', legIndex: routedLeg = '' } = useParams(); const { user } = useAuth(); const navigate = useNavigate();
  const ownerId = user?.id; const legIndex = /^\d+$/.test(routedLeg) ? Number(routedLeg) : -1;
  const identity = `${ownerId ?? ''}:${runId}:${legIndex}:${kind}`;
  const activeIdentity = React.useRef(identity); activeIdentity.current = identity;
  const generation = React.useRef(0);
  const deviceId = React.useMemo(getPracticeTestDeviceId, []);
  const controller = React.useMemo(() => ownerId && runId && legIndex >= 0 ? controllerFactory(ownerId, runId, legIndex, kind, deviceId) : null,
    [ownerId, runId, legIndex, kind, deviceId, controllerFactory]);
  const [state, setState] = React.useState<TimedChildState | null>(null); const stateRef = React.useRef<TimedChildState | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, TimedChildAnswer>>({}); const answersRef = React.useRef<Record<string, TimedChildAnswer>>({});
  const [busy, setBusy] = React.useState(false); const busyRef = React.useRef(false);
  const [error, setError] = React.useState<string | null>(null); const errorRef = React.useRef<string | null>(null);
  const [loading, setLoading] = React.useState(true); const [loadRevision, retryLoad] = React.useReducer(value => value + 1, 0);
  const [, tick] = React.useReducer(value => value + 1, 0); const lastElapsed = React.useRef(0);
  const [fontScale, setFontScale] = React.useState(1); const [find, setFind] = React.useState(''); const [directions, setDirections] = React.useState(false);
  const [finishConfirm, setFinishConfirm] = React.useState(false); const [passageOnly, setPassageOnly] = React.useState(false);
  const [marker, setMarker] = React.useState<HighlightMode>('none');
  const [highlights, setHighlights] = React.useState<Record<string, Highlight[]>>({});
  const [rcHighlights, setRcHighlights] = React.useState<Record<string, RcHighlight[]>>({});
  const [color, setColor] = React.useState<RcHighlightColor>('yellow'); const [scrollTops, setScrollTops] = React.useState<Record<string, number>>({});
  const telemetry = React.useRef<{ visits: Record<string, number>; trail: Record<string, { answer: string; atMs: number }[]> }>({ visits: {}, trail: {} });
  const regulation = React.useRef<string[] | undefined>(undefined); const regulationAcknowledged = React.useRef(false);
  const [markersReady, setMarkersReady] = React.useState<string | null>(null);
  const markerKey = `lsatu:timed-markers:v1:${encodeURIComponent(ownerId ?? '')}:${encodeURIComponent(runId)}:${legIndex}`;

  const apply = React.useCallback((next: TimedChildState, draft?: Record<string, TimedChildAnswer>) => {
    const previousState = stateRef.current;
    const merged = { ...(draft ?? {}), ...next.answers };
    for (const [qid, previous] of Object.entries(answersRef.current)) {
      if (merged[qid]) merged[qid] = { ...merged[qid], timeMs: Math.max(merged[qid].timeMs, previous.timeMs) };
    }
    stateRef.current = next; setState(next);
    answersRef.current = merged; setAnswers(merged); lastElapsed.current = controller?.clock(next).elapsedMs ?? 0;
    if (next.view && next.snapshot.parent.timed_phase === 'leg-running' && controller?.clock(next).writer === 'active'
      && (!previousState || previousState.currentIndex !== next.currentIndex || previousState.snapshot.parent.timed_phase !== 'leg-running')) {
      const qid = next.questions[next.currentIndex]?.qid;
      if (qid) telemetry.current.visits[qid] = (telemetry.current.visits[qid] ?? 0) + 1;
    }
    if (next.view && 'questions' in next.view && next.view.session.regulation_answered_qids !== undefined) {
      regulation.current = next.view.session.regulation_answered_qids; regulationAcknowledged.current = true;
    }
    if (next.snapshot.parent.current_leg > legIndex && !next.pending) navigate(`/testing/test/${encodeURIComponent(runId)}`, { replace: true });
  }, [controller, navigate, runId, legIndex]);
  const fail = React.useCallback((reason: unknown) => {
    const detail = reason instanceof Error ? reason.message : 'The account could not acknowledge this section.';
    const message = /(?:failed to fetch|networkerror|network request failed|load failed)/i.test(detail)
      ? 'The account could not be reached. Your section is paused. Retry to confirm your saved work.' : detail;
    errorRef.current = message; setError(message);
  }, []);
  React.useEffect(() => {
    const generationGuard = generation;
    let cancelled = false; generation.current++; setLoading(true); setState(null); stateRef.current = null; errorRef.current = null; setError(null);
    setAnswers({}); answersRef.current = {}; busyRef.current = false; setBusy(false);
    regulation.current = undefined; regulationAcknowledged.current = false;
    if (!controller) { setLoading(false); fail('Sign in and open the exact section from your PrepTest.'); return; }
    controller.load().then(next => { if (cancelled) return; apply(next); setLoading(false); }).catch(reason => { if (!cancelled) { fail(reason); setLoading(false); } });
    return () => { cancelled = true; generationGuard.current++; };
  }, [controller, loadRevision, apply, fail]);
  React.useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(markerKey) ?? 'null');
      if (stored?.ownerId === ownerId && stored?.runId === runId && stored?.legIndex === legIndex) {
        setHighlights(stored.highlights ?? {}); setRcHighlights(stored.rcHighlights ?? {});
        if (stored.telemetry) telemetry.current = stored.telemetry;
      } else { setHighlights({}); setRcHighlights({}); telemetry.current = { visits: {}, trail: {} }; }
    } catch { setHighlights({}); setRcHighlights({}); }
    setMarkersReady(markerKey);
  }, [markerKey, ownerId, runId, legIndex]);
  React.useEffect(() => {
    if (markersReady !== markerKey) return;
    try { localStorage.setItem(markerKey, JSON.stringify({ ownerId, runId, legIndex, highlights, rcHighlights, telemetry: telemetry.current })); }
    catch { /* Personal marker failure does not acknowledge or alter account answers. */ }
  }, [markersReady, markerKey, ownerId, runId, legIndex, highlights, rcHighlights, answers]);

  const perform = React.useCallback(async (action: 'save' | 'pause' | 'resume' | 'finish' | 'retry' | 'exit', target?: number, draft?: Record<string, TimedChildAnswer>) => {
    const current = stateRef.current;
    if (!controller || !current || busyRef.current || activeIdentity.current !== identity) return;
    const operationGeneration = generation.current;
    const stillCurrent = () => activeIdentity.current === identity && generation.current === operationGeneration;
    busyRef.current = true; setBusy(true); errorRef.current = null; setError(null);
    try {
      let next = current; const submitted = draft ?? answersRef.current;
      if (action === 'retry') next = await controller.retry(current);
      else if (action === 'resume') next = await controller.control(current, 'resume');
      else {
        if (current.snapshot.parent.timed_phase === 'leg-running') {
          next = await controller.checkpoint(current, target ?? current.currentIndex, submitted, regulation.current);
          if (!stillCurrent()) return;
          apply(next, submitted);
        }
        if (action === 'pause' || (action === 'exit' && next.snapshot.parent.timed_phase === 'leg-running')) next = await controller.control(next, 'pause');
        if (action === 'finish') next = await controller.close(next, submitted, JSON.parse(JSON.stringify({ ...telemetry.current, highlights, rcHighlights })) as TimedObject);
      }
      if (stillCurrent()) {
        apply(next, action === 'retry' ? undefined : submitted);
        if (action === 'exit') navigate(`/testing/test/${encodeURIComponent(runId)}`);
      }
    } catch (reason) { if (stillCurrent()) fail(reason); }
    finally { if (stillCurrent()) { busyRef.current = false; setBusy(false); } }
  }, [controller, apply, fail, highlights, rcHighlights, identity, navigate, runId]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      const current = stateRef.current; if (!controller || !current) return;
      const clock = controller.clock(current); const delta = Math.max(0, clock.elapsedMs - lastElapsed.current); lastElapsed.current = clock.elapsedMs;
      if (clock.writer === 'active' && current.snapshot.parent.timed_phase === 'leg-running' && !errorRef.current) {
        const question = current.questions[current.currentIndex];
        if (question && delta > 0) {
          const previous = answersRef.current[question.qid] ?? emptyAnswer(kind);
          answersRef.current = { ...answersRef.current, [question.qid]: { ...previous, timeMs: previous.timeMs + delta } };
          setAnswers(answersRef.current);
        }
        if (clock.remainingMs === 0) {
          if (kind === 'lr') {
            if (regulation.current === undefined) regulation.current = current.questions.filter(value => answersRef.current[value.qid]?.selected).map(value => value.qid);
            if (!regulationAcknowledged.current && !busyRef.current) void perform('save');
          } else if (!busyRef.current) void perform('finish');
        }
      }
      tick();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [controller, kind, perform]);
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (controller && current && !busyRef.current && !errorRef.current && controller.clock(current).writer === 'active' && current.snapshot.parent.timed_phase === 'leg-running') void perform('save');
    }, 5000);
    return () => window.clearInterval(timer);
  }, [controller, perform]);
  const clock = controller && state ? controller.clock(state) : null;
  const paused = state?.snapshot.parent.timed_phase === 'leg-paused';
  const blocked = busy || Boolean(error) || !state?.view || clock?.writer !== 'active' || paused || (clock?.remainingMs === 0 && (kind === 'rc' || !regulationAcknowledged.current));
  const question = state?.questions[state.currentIndex]; const answer = question ? answers[question.qid] ?? emptyAnswer(kind) : null;
  const mutate = (patch: (previous: TimedChildAnswer) => TimedChildAnswer) => {
    if (!question || blocked || !state) return;
    const next = { ...answersRef.current, [question.qid]: patch(answersRef.current[question.qid] ?? emptyAnswer(kind)) };
    answersRef.current = next; setAnswers(next); void perform('save', state.currentIndex, next);
  };
  const jump = (index: number) => {
    if (blocked || !state || index < 0 || index >= state.questions.length) return;
    void perform('save', index);
  };
  const select = (selected: TimedLetter) => mutate(previous => {
    if (question) telemetry.current.trail[question.qid] = [...(telemetry.current.trail[question.qid] ?? []), { answer: selected, atMs: previous.timeMs }];
    return { ...previous, selected, switchCount: previous.selected && previous.selected !== selected ? previous.switchCount + 1 : previous.switchCount,
      eliminations: previous.eliminations.filter(value => value !== selected) };
  });
  const toggleElimination = (letter: TimedLetter) => mutate(previous => ({ ...previous, eliminations: previous.eliminations.includes(letter) ? previous.eliminations.filter(value => value !== letter) : [...previous.eliminations, letter] }));
  const back = () => navigate(`/testing/test/${encodeURIComponent(runId)}`);
  const pending = controller?.pending();
  if (loading || (state && (state.snapshot.parent.user_id !== ownerId || state.snapshot.parent.id !== runId || state.snapshot.parent.timed_frozen_legs[legIndex]?.kind !== kind
    || (state.view && state.snapshot.parent.current_leg !== legIndex)))) return <div role="status" className="p-8">Loading your account section. The section has not opened.</div>;
  if (!state || error || pending || clock?.writer === 'claim-required' || clock?.writer === 'terminal') return <div className="max-w-xl mx-auto p-8 space-y-4">
    <h1 className="text-xl font-semibold">Section paused</h1>
    <p>{error ?? (pending ? 'Your saved account command needs acknowledgment before continuing.' : clock?.writer === 'claim-required' ? 'Return to your PrepTest to claim or refresh this section.' : 'The account section is not available to continue.')}</p>
    {pending && state ? <Button disabled={busy} onClick={() => void perform('retry')}>Retry saved command</Button> : <Button disabled={busy} onClick={retryLoad}>Retry account load</Button>}
    <Button variant="outline" disabled={busy} onClick={back}>Return to PrepTest</Button>
  </div>;
  const rcView = state.view && 'state' in state.view ? state.view : null; const rcItem = rcView?.state.items[state.currentIndex];
  const rcMarks = rcItem ? rcHighlights[String(rcItem.passage.passageId)] ?? [] : [];
  const updateRcMarks = (next: RcHighlight[]) => rcItem && setRcHighlights(previous => ({ ...previous, [rcItem.passage.passageId]: next }));
  return <OfficialDrillFrame isPaused={paused} onResume={() => void perform('resume')} header={<div className="flex flex-wrap items-center gap-3">
    <span className="font-semibold">PrepTest {state.snapshot.parent.pt} · {kind.toUpperCase()} section</span><span aria-label="Section time remaining">{kind === 'lr' && clock?.remainingMs === 0 && regulationAcknowledged.current ? `Overtime +${format(clock.elapsedMs - (state.snapshot.parent.section_seconds ?? 0) * 1000)}` : format(clock?.remainingMs ?? null)}</span>
    <Button size="sm" variant="outline" disabled={busy} onClick={() => void perform('exit')}>PrepTest</Button>
  </div>}>
    <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <Button size="sm" variant="outline" disabled={blocked} onClick={() => void perform('pause')}>Pause</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setDirections(value => !value)}>Directions</Button>
      <label className="text-sm">Text size <select aria-label="Text size" value={fontScale} onChange={event => setFontScale(Number(event.target.value))}><option value={1}>Standard</option><option value={1.15}>Large</option><option value={1.3}>Larger</option></select></label>
      <label className="text-sm">Marker <select aria-label="Marker" value={marker} onChange={event => setMarker(event.target.value as HighlightMode)}><option value="none">Select</option><option value="yellow">Yellow</option><option value="pink">Pink</option><option value="orange">Orange</option><option value="underline">Underline</option><option value="erase">Erase</option></select></label>
      <input aria-label="Find in passage" className="border rounded px-2 w-36" value={find} onChange={event => setFind(event.target.value)} placeholder="Find in passage" />
      {kind === 'rc' && <Button size="sm" variant="outline" onClick={() => setPassageOnly(value => !value)}>{passageOnly ? 'Show questions' : 'Passage only'}</Button>}
      <span role="status" className="text-xs ml-auto">{busy ? 'Saving to your account…' : 'Account save acknowledged'}</span>
    </div>
    {directions && <div className="border-b p-3 text-sm">Choose the best answer to each question. You can revisit questions and change your answers before finishing. Answers and explanations appear after the PrepTest is complete.</div>}
    {finishConfirm && <div role="dialog" aria-label="Finish section" className="border-b p-3 flex flex-wrap gap-3 items-center"><p>{state.questions.filter(value => !answers[value.qid]?.selected).length} unanswered. Finish this section?</p><Button disabled={busy} onClick={() => { setFinishConfirm(false); void perform('finish'); }}>Confirm finish</Button><Button variant="outline" onClick={() => setFinishConfirm(false)}>Keep working</Button></div>}
    <div className="flex-1 min-h-0 flex flex-col">
      {kind === 'lr' && question && answer && <OfficialQuestionPane key={question.qid} question={{ ...question, stimulus: question.stimulus ?? '' }} displayNumber={state.currentIndex + 1}
        selectedAnswer={answer.selected ?? ''} eliminatedAnswers={new Set(answer.eliminations)} isFlagged={answer.flagged} interactionLocked={blocked}
        highlights={highlights[question.qid] ?? []} highlightMode={marker} searchTerm={find} fontScale={fontScale}
        onAnswerSelect={value => select(value as TimedLetter)} onEliminate={value => toggleElimination(value as TimedLetter)} onToggleFlag={() => mutate(previous => ({ ...previous, flagged: !previous.flagged }))}
        onTextSelection={regions => { if (marker === 'none' || marker === 'erase') return false; const captured = captureSelectionAcross(regions); if (!captured.length) return false;
          setHighlights(previous => ({ ...previous, [question.qid]: [...(previous[question.qid] ?? []), ...captured.map(value => ({ ...value, id: crypto.randomUUID(), color: marker }))] })); window.getSelection()?.removeAllRanges(); return true; }}
        onHighlightClick={id => { if (marker === 'erase') setHighlights(previous => ({ ...previous, [question.qid]: (previous[question.qid] ?? []).filter(value => value.id !== id) })); }} />}
      {kind === 'rc' && rcItem && answer && <RcTimedReader item={rcItem} answer={answer} blocked={blocked} fontScale={fontScale} find={find} marker={marker}
        color={color} onColorChange={setColor} passageOnly={passageOnly} marks={rcMarks} onMarksChange={updateRcMarks}
        scrollTop={scrollTops[rcItem.passage.passageId] ?? 0} onScrollTop={top => setScrollTops(previous => ({ ...previous, [rcItem.passage.passageId]: top }))}
        onSelect={select} onToggleElimination={toggleElimination} onToggleFlag={() => mutate(previous => ({ ...previous, flagged: !previous.flagged }))} />}
    </div>
    <div className="border-t p-2 flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={blocked || state.currentIndex === 0} onClick={() => jump(state.currentIndex - 1)}>Previous</Button>
      <div className="flex flex-wrap gap-1 flex-1" aria-label="Section questions">{state.questions.map((value, index) => <button key={value.qid} type="button" aria-label={`Question ${index + 1}${answers[value.qid]?.flagged ? ', flagged' : ''}`} aria-current={index === state.currentIndex ? 'step' : undefined}
        disabled={blocked} onClick={() => jump(index)} className={`border rounded px-2 py-1 text-xs ${index === state.currentIndex ? 'border-slate-900 font-bold' : ''} ${answers[value.qid]?.selected ? 'bg-slate-200' : ''}`}>
        {index + 1}{answers[value.qid]?.flagged ? ' ⚑' : ''}</button>)}</div>
      <Button variant="outline" size="sm" disabled={blocked || state.currentIndex === state.questions.length - 1} onClick={() => jump(state.currentIndex + 1)}>Next</Button>
      <Button size="sm" disabled={blocked} onClick={() => setFinishConfirm(true)}>Finish section</Button>
    </div>
  </OfficialDrillFrame>;
}
