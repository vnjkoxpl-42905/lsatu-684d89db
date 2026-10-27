import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getPracticeTestDeviceId } from '@/lib/practiceTestStore';
import { legLabel, practiceTestPaceLabel } from '@/lib/practiceTest';
import { TimedWorkClient, type TimedWorkOperation } from '@/lib/timedWorkClient';
import { TimedPracticeTestStore, timedPracticeTestClock, type TimedPracticeTestSnapshot } from '@/lib/timedPracticeTestStore';
import { officialTimedChildPath } from '@/lib/timedPracticeTestEntry';
import { ScoreReport } from './PracticeTestRun';

const mmss = (ms: number) => { const seconds = Math.ceil(Math.max(0, ms) / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; };
export default function TimedPracticeTestRun({ ownerId, runId }: { ownerId: string; runId: string }) {
  const navigate = useNavigate();
  const client = React.useMemo(() => new TimedWorkClient(ownerId, runId), [ownerId, runId]);
  const store = React.useMemo(() => new TimedPracticeTestStore(client, getPracticeTestDeviceId()), [client]);
  const [snapshot, setSnapshot] = React.useState<TimedPracticeTestSnapshot | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const scope = React.useMemo(() => ({ client, active: true, inFlight: false }), [client]);
  React.useEffect(() => { scope.active = true; return () => { scope.active = false; }; }, [scope]);
  const [loaded, setLoaded] = React.useState(false);
  const [tick, setTick] = React.useState(() => performance.now());
  const [pending, setPending] = React.useState(() => client.readPending());
  const [rejection, setRejection] = React.useState(() => client.readRejection());
  const syncRecovery = React.useCallback(() => { setPending(client.readPending()); setRejection(client.readRejection()); }, [client]);
  const perform = React.useCallback(async (action: () => Promise<TimedPracticeTestSnapshot>) => {
    if (!scope.active || scope.inFlight) return null;
    scope.inFlight = true;
    setBusy(true); setError(null);
    try { const next = await action(); if (!scope.active) return null; setSnapshot(next); setTick(performance.now()); return next; }
    catch (e) { if (!scope.active) return null; setError(e instanceof Error ? e.message : 'The account save could not be confirmed. Retry before continuing.'); return null; }
    finally { scope.inFlight = false; if (scope.active) { syncRecovery(); setBusy(false); setLoaded(true); } }
  }, [syncRecovery, scope]);
  React.useEffect(() => {
    setSnapshot(null); setError(null); setLoaded(false); syncRecovery();
    // Preparation retains an exact create command before any account write.
    // Retry that command to obtain authority; an initial read would report a
    // nonexistent parent for a perfectly valid, not-yet-submitted sitting.
    if (client.readPending()?.operation === 'create') { setLoaded(true); return; }
    void perform(() => store.load());
  }, [client, store, perform, syncRecovery]);
  React.useEffect(() => { const timer = window.setInterval(() => setTick(performance.now()), 500); return () => clearInterval(timer); }, []);
  const clock = snapshot ? timedPracticeTestClock({ ...snapshot, pending }, getPracticeTestDeviceId(), tick) : null;
  const phase = snapshot?.parent.timed_phase;
  React.useEffect(() => {
    if (!snapshot || pending || busy || error || clock?.writer !== 'active' || phase !== 'break-running') return;
    const timer = window.setTimeout(() => { void perform(() => store.heartbeat(snapshot)); }, Math.min(5000, snapshot.parent.timed_lease_ms / 3));
    return () => clearTimeout(timer);
  }, [snapshot, pending, busy, error, clock?.writer, phase, perform, store]);
  React.useEffect(() => {
    if (!snapshot || pending || busy || error || clock?.writer !== 'active' || phase !== 'break-running') return;
    const pauseHidden = () => {
      if (document.visibilityState === 'hidden') void perform(async () => { await store.prepare('pause', {}, snapshot); return store.retry(); });
    };
    document.addEventListener('visibilitychange', pauseHidden);
    return () => document.removeEventListener('visibilitychange', pauseHidden);
  }, [snapshot, pending, busy, error, clock?.writer, phase, perform, store]);
  const transition = async (op: TimedWorkOperation, openChild = false) => {
    const next = await perform(async () => { await store.prepare(op, {}, snapshot); return store.retry(); });
    if (next && openChild) {
      try { navigate(officialTimedChildPath(next)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not open the saved section.'); }
    }
  };
  const openCurrent = () => {
    if (!snapshot || pending || busy || error) return;
    try { navigate(officialTimedChildPath(snapshot)); } catch (e) { setError(e instanceof Error ? e.message : 'Reload before opening this section.'); }
  };
  const leave = async () => {
    if (pending || busy) return;
    if (snapshot && ['leg-running', 'break-running'].includes(snapshot.parent.timed_phase) && clock?.writer === 'active') {
      const paused = await perform(async () => { await store.prepare('pause', {}, snapshot); return store.retry(); });
      if (!paused) return;
    }
    navigate('/testing');
  };
  if (!loaded) return <p role="status">Loading your practice test…</p>;
  return <>
    <h1 className="classroom-title">{snapshot ? `Practice Test ${snapshot.run.pt}` : 'Start your practice test'}</h1>
    {snapshot && <p className="testing-lede">{snapshot.run.legs.length} scored sections · {practiceTestPaceLabel(snapshot.run.pace)}</p>}
    {error && <p className="testing-note" role="alert">{error}</p>}
    {pending && <div className="testing-panel">
      <p className="testing-note">{pending.operation === 'create' && !snapshot ? 'Your practice test is ready to save. Confirm it to create or recover this exact sitting in your account.' : 'A saved change is waiting for account confirmation. Retry it before continuing.'}</p>
      <Button disabled={busy} onClick={() => { void perform(() => store.retry()); }}>{pending.operation === 'create' ? 'Confirm and start sitting' : 'Retry saved change'}</Button>
      {rejection && snapshot && <><p className="testing-note">The account rejected this change. Preserve its answers on this device, then reload the account state before continuing.</p><Button disabled={busy} variant="outline" onClick={() => { void perform(() => store.archiveRejectedCommand()); }}>Preserve rejected change and reload</Button></>}
    </div>}
    {!pending && snapshot?.run.status === 'complete' && <ScoreReport run={snapshot.run} userId={ownerId} onExit={() => navigate('/testing')} />}
    {!pending && snapshot?.run.status === 'abandoned' && <p className="testing-note">This sitting was ended. Your saved work remains available in your history.</p>}
    {!pending && snapshot?.run.status === 'in-progress' && <>
      <div className="testing-shape">{snapshot.run.legs.map((leg, index) => <div className="testing-shape-row" key={index} data-state={leg.completedAt ? 'done' : index === snapshot.run.currentLeg ? 'current' : undefined}><b>Section {index + 1}</b><span>{legLabel(leg)}</span><em>{leg.completedAt ? 'Finished' : `${leg.questionCount} questions`}</em></div>)}</div>
      {clock?.writer === 'claim-required' && <div className="testing-panel"><p className="testing-note">Reload and continue on this device when the previous clock lease has ended.</p><Button disabled={busy} onClick={() => { void transition('claim'); }}>Continue on this device</Button></div>}
      {clock?.writer === 'active' && !error && <div className="testing-panel">
        {phase?.startsWith('break-') ? <><h2 className="testing-heading">Break</h2><strong role="timer">{mmss(clock.remainingMs ?? 0)}</strong><p className="testing-note">Stand up, get water, and rest your eyes. Continue when you are ready.</p><Button disabled={busy} onClick={() => { void transition('finish-break'); }}>Finish break and continue</Button></> : phase === 'ready' && !snapshot.run.breakTaken && snapshot.run.currentLeg === snapshot.run.breakAfterLeg ? <Button disabled={busy} onClick={() => { void transition('start-break'); }}>Start ten-minute break</Button> : phase === 'ready' ? <Button disabled={busy} onClick={() => { void transition('start-leg', true); }}>Begin section {snapshot.run.currentLeg + 1}</Button> : ['leg-running', 'leg-paused'].includes(phase ?? '') ? <Button disabled={busy} onClick={openCurrent}>Return to section {snapshot.run.currentLeg + 1}</Button> : <p role="status">Reload to check section closeout.</p>}
        {phase === 'break-running' && <Button disabled={busy} variant="outline" onClick={() => { void transition('pause'); }}>Pause break</Button>}
        {phase === 'break-paused' && <Button disabled={busy} variant="outline" onClick={() => { void transition('resume'); }}>Resume break</Button>}
        <Button disabled={busy} variant="ghost" onClick={() => { void transition('abandon'); }}>End this sitting</Button>
      </div>}
    </>}
    <div className="testing-actions"><Button disabled={busy} variant="outline" onClick={() => { void perform(() => store.load()); }}>Reload account</Button><Button disabled={busy || Boolean(pending)} onClick={() => { void leave(); }}>Back to Practice Exams</Button></div>
  </>;
}
