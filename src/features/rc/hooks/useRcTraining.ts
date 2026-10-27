import * as React from 'react';
import { createRcLearningEvent, getRcLearningEvents, readRcLearningEvent, recordRcLearningEvent, type RcLearningEvent, type RcLearningKind } from '../lib/rcLearning';

export interface RcTrainingOptions { actorId?: string; sessionId: string | null; passageId?: number; questionId?: number; enabled: boolean; canPredict: boolean }
export function useRcTraining({ actorId, sessionId, passageId, questionId, enabled, canPredict }: RcTrainingOptions) {
  const identity = `${actorId ?? ''}:${sessionId ?? ''}`;
  const active = React.useRef(identity); active.current = identity;
  const [open, setOpen] = React.useState(false);
  const [anticipation, setAnticipation] = React.useState(false);
  const [segmented, setSegmented] = React.useState(false);
  const [paragraphLimit, setParagraphLimit] = React.useState(1);
  const [paragraphCount, setParagraphCount] = React.useState(0);
  const [events, setEvents] = React.useState<RcLearningEvent[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadRevision, reload] = React.useReducer(value => value + 1, 0);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<RcLearningEvent | null>(null);
  const pendingRef = React.useRef<RcLearningEvent | null>(null);
  const busy = React.useRef(false);
  const [saving, setSaving] = React.useState(false);
  const backupKey = `lsatu:rc-learning-pending:v1:${actorId ?? ''}:${sessionId ?? ''}`;
  React.useEffect(() => {
    setOpen(false); setAnticipation(false); setSegmented(false); setParagraphLimit(1); setEvents([]); setLoaded(false); setError(null);
    pendingRef.current = null; setPending(null); busy.current = false; setSaving(false);
    if (!enabled) return;
    try {
      const event = readRcLearningEvent(JSON.parse(localStorage.getItem(backupKey) ?? 'null'));
      if (event?.actorId === actorId && event.sessionId === sessionId) { pendingRef.current = event; setPending(event); setOpen(true); }
    } catch { /* Training remains optional if local backup storage is unavailable. */ }
  }, [identity, enabled, backupKey, actorId, sessionId]);
  React.useEffect(() => {
    if (!enabled || !open || !actorId || !sessionId) return;
    let cancelled = false; setLoaded(false); setError(null);
    void getRcLearningEvents(actorId, sessionId).then(rows => { if (!cancelled) { setEvents(rows); setLoaded(true); } })
      .catch(() => { if (!cancelled) setError('Learning notes could not be loaded. Retry before using training.'); });
    return () => { cancelled = true; };
  }, [enabled, open, actorId, sessionId, loadRevision]);
  React.useEffect(() => { setParagraphLimit(1); }, [passageId]);
  React.useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);
  const retry = React.useCallback(async () => {
    const request = pendingRef.current;
    if (!request || busy.current || request.actorId !== actorId || request.sessionId !== sessionId || !enabled) return;
    const requestIdentity = identity; busy.current = true; setSaving(true); setError(null);
    try {
      const saved = await recordRcLearningEvent(request);
      if (active.current !== requestIdentity || pendingRef.current !== request) return;
      setEvents(rows => rows.some(row => row.id === saved.id) ? rows : [...rows, saved]);
      pendingRef.current = null; setPending(null);
      if (!loaded) reload();
      try { localStorage.removeItem(backupKey); } catch { /* The account event is authoritative. */ }
    } catch { if (active.current === requestIdentity) setError('This learning note is not saved. Retry it before leaving. Your scored answer is separate.'); }
    finally { if (active.current === requestIdentity) { busy.current = false; setSaving(false); } }
  }, [actorId, sessionId, enabled, identity, backupKey, loaded]);
  const save = React.useCallback((kind: RcLearningKind, value: string | number) => {
    if (!enabled || !loaded || !actorId || !sessionId || !passageId || !questionId || pendingRef.current) return;
    const request = createRcLearningEvent(actorId, sessionId, passageId, questionId, kind, value);
    pendingRef.current = request; setPending(request);
    try { localStorage.setItem(backupKey, JSON.stringify(request)); } catch { setError('The device backup failed. Keep this page open until the account saves this learning note.'); }
    void retry();
  }, [enabled, loaded, actorId, sessionId, passageId, questionId, backupKey, retry]);
  const own = events.filter(event => event.passageId === passageId && event.questionId === questionId);
  React.useEffect(() => {
    const progress = events.filter(event => event.passageId === passageId && event.kind === 'reading-progress').at(-1);
    if (progress && typeof progress.value === 'number') setParagraphLimit(Math.max(1, progress.value));
  }, [events, passageId]);
  const latest = (kind: RcLearningKind) => own.filter(event => event.kind === kind).at(-1);
  return { enabled, open, setOpen, anticipation, setAnticipation, segmented, setSegmented, paragraphLimit, setParagraphLimit, paragraphCount, setParagraphCount,
    loaded, error, pending, pendingRequest: pendingRef, saving, retry, reload, save, latest,
    choicesHidden: enabled && anticipation && canPredict && !latest('prediction'),
  };
}
export type RcTrainingState = ReturnType<typeof useRcTraining>;
