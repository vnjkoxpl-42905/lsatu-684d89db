import { useEffect, useRef, useState } from 'react';
import { createReviewEpisodeService, reviewEpisodeState, type EpisodeSource, type ReviewEpisode, type ReviewEpisodeEvent, type ReviewEventKind } from '@/lib/reviewEpisodes';

const service = createReviewEpisodeService();
interface Props { ownerId: string; source: EpisodeSource; sourceId: string; requestedEpisodeId?: string | null }
/** A fresh keyed child prevents another account or source inheriting unsaved fields. */
export default function SavedReviewEpisodePanel(props: Props) {
  return <EpisodePanel key={`${props.ownerId}:${props.source}:${props.sourceId}:${props.requestedEpisodeId ?? ''}`} {...props} />;
}
function EpisodePanel({ ownerId, source, sourceId, requestedEpisodeId }: Props) {
  const [episodes, setEpisodes] = useState<ReviewEpisode[]>([]);
  const [events, setEvents] = useState<ReviewEpisodeEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null); const [reload, setReload] = useState(0);
  const [answer, setAnswer] = useState(''); const [reflection, setReflection] = useState('');
  const [errorDiagnosis, setErrorDiagnosis] = useState(''); const [rightDiagnosis, setRightDiagnosis] = useState('');
  const pending = useRef<{ episode: ReviewEpisode; id: string; kind: ReviewEventKind; payload: Record<string, string> } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true; setLoading(true); setError(null);
    void service.list(ownerId, ownerId).then(result => {
      if (!active) return;
      const matching = result.episodes.filter(episode => episode.source_kind === source && episode.source_id === sourceId);
      setEpisodes(matching); setEvents(result.events);
      if (requestedEpisodeId && !matching.some(episode => episode.id === requestedEpisodeId)) {
        setSelected(null); setError('The requested review task is unavailable for this saved submission.'); return;
      }
      const incomplete = matching.filter(episode => !reviewEpisodeState(result.events.filter(event => event.episode_id === episode.id)).completed);
      const preferred = incomplete.find(episode => episode.reason === 'teacher_selected') ?? incomplete[0] ?? matching[0];
      setSelected(current => requestedEpisodeId ?? (matching.some(episode => episode.id === current) ? current : preferred?.id ?? null));
    }).catch(() => { if (active) setError('Saved review work could not be loaded. Try again before opening or completing a task.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ownerId, source, sourceId, requestedEpisodeId, reload]);
  const episode = episodes.find(item => item.id === selected) ?? null;
  const state = reviewEpisodeState(events.filter(event => event.episode_id === episode?.id));
  const completion = events.find(event => event.episode_id === episode?.id && event.kind === 'complete');
  async function open() {
    setBusy(true); setError(null);
    try {
      const saved = await service.open({ actorId: ownerId, studentId: ownerId, source, sourceId, reason: 'missed' });
      if (!mounted.current) return;
      setEpisodes(current => current.some(item => item.id === saved.id) ? current : [...current, saved]); setSelected(saved.id);
      // The idempotent open can recover an existing episode after a lost response.
      setReload(current => current + 1);
    } catch { if (mounted.current) setError('Review task was not confirmed in your account. Try opening it again.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function save(kind?: ReviewEventKind, payload?: Record<string, string>) {
    if (!episode) return;
    if (!pending.current && kind && payload) pending.current = { episode, id: crypto.randomUUID(), kind, payload };
    const request = pending.current; if (!request) return;
    setBusy(true); setError(null);
    try {
      const saved = await service.append(ownerId, request.episode, request.id, request.kind, request.payload);
      if (!mounted.current) return;
      setEvents(current => current.some(event => event.id === saved.id) ? current : [...current, saved]); pending.current = null;
    } catch { if (mounted.current) setError('Review work was not confirmed in your account. Your text is retained. Retry this save before continuing.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  const blocked = busy || pending.current !== null || error !== null;
  return <section aria-label="Saved review task" className="space-y-4 rounded-xl border p-5">
    <h2 className="text-lg font-semibold">Save your review work</h2>
    <p className="text-sm text-muted-foreground">This task records new review work for this exact saved submission. The original answer, outcome and flags stay unchanged. Source feedback may already have been visible; a new answer or Reveal here does not reconstruct historical Blind Review.</p>
    {loading ? <p role="status">Loading saved review work…</p> : <>
      {error && <div role="alert"><p>{error}</p>{pending.current ? <button disabled={busy} className="min-h-11 underline" onClick={() => void save()}>Retry save</button> : <button disabled={busy} className="min-h-11 underline" onClick={() => setReload(current => current + 1)}>Reload review work</button>}</div>}
      {!episode ? !error && <button disabled={busy} className="min-h-11 underline" onClick={() => void open()}>Open review task</button> : <>
        {episodes.length > 1 && <label className="block">Review task<select aria-label="Review task" disabled={blocked} value={selected ?? ''} onChange={event => { setSelected(event.target.value); setAnswer(''); setReflection(''); setErrorDiagnosis(''); setRightDiagnosis(''); }}>{episodes.map(item => <option key={item.id} value={item.id}>{item.reason === 'teacher_selected' ? 'Teacher selection' : 'Missed submission'}</option>)}</select></label>}
        {episode.selection_reason && <p>Teacher’s reason: {episode.selection_reason}</p>}
        {state.completed ? <>
          <p role="status">This review task is saved as reviewed. Its source answer and flag are unchanged.</p>
          {state.blindAnswer !== null && <p>Saved review answer: {state.blindAnswer}</p>}
          {state.revealed && <p>Reveal recorded for this review task.</p>}
          {state.reflection !== null && <p>Saved notes: {state.reflection}</p>}
          {completion?.payload.error_diagnosis && <p>Saved error diagnosis: {completion.payload.error_diagnosis}</p>}
          {completion?.payload.right_answer_diagnosis && <p>Saved right-answer diagnosis: {completion.payload.right_answer_diagnosis}</p>}
        </> : <>
          {state.blindAnswer !== null ? <p>Saved review answer: {state.blindAnswer}</p> : !state.revealed && <div><label className="block">Optional answer before recording Reveal<textarea aria-label="Optional review answer" disabled={blocked} value={answer} onChange={event => setAnswer(event.target.value)} className="block w-full rounded border p-2" /></label><button className="min-h-11 underline" disabled={blocked || !answer.trim()} onClick={() => void save('blind_answer', { answer })}>Save review answer</button></div>}
          {state.revealed ? <p>Reveal recorded for this review task.</p> : <button disabled={blocked} className="min-h-11 underline" onClick={() => void save('reveal', {})}>Record Reveal for this task</button>}
          <label className="block">Review notes<textarea aria-label="Review notes" disabled={blocked} value={reflection} onChange={event => setReflection(event.target.value)} className="block w-full rounded border p-2" /></label>
          {state.reflection !== null && <p>Saved notes: {state.reflection}</p>}
          <button disabled={blocked || !reflection.trim()} className="min-h-11 underline" onClick={() => void save('reflection', { text: reflection })}>Save review notes</button>
          {episode.reason === 'missed' && <>
            <label className="block">What caused the error?<textarea aria-label="Error diagnosis" disabled={blocked} value={errorDiagnosis} onChange={event => setErrorDiagnosis(event.target.value)} className="block w-full rounded border p-2" /></label>
            <label className="block">Why is the right answer right?<textarea aria-label="Right answer diagnosis" disabled={blocked} value={rightDiagnosis} onChange={event => setRightDiagnosis(event.target.value)} className="block w-full rounded border p-2" /></label>
          </>}
          <button disabled={blocked || episode.reason === 'missed' && (!errorDiagnosis.trim() || !rightDiagnosis.trim())} className="min-h-11 underline" onClick={() => void save('complete', episode.reason === 'missed' ? { error_diagnosis: errorDiagnosis, right_answer_diagnosis: rightDiagnosis } : {})}>Mark reviewed</button>
        </>}
      </>}
    </>}
  </section>;
}
