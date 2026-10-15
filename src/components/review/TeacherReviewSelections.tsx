import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudentSubjectScope } from '@/hooks/useStudentSubjectScope';
import { loadScopedReviewSelections, selectScopedReview } from '@/lib/scopedReviewEpisodes';
import { reviewEpisodeState } from '@/lib/reviewEpisodes';
import type { StudentSubjectScope } from '@/lib/studentSubjectScope';
import type { ReviewQueueItem } from './reviewQueueModel';
import { boundedReviewBinding } from '@/lib/scopedReviewEpisodes';
import { StudentIdentityUnavailableError } from '@/lib/studentAccountScope';

export default function TeacherReviewSelections({ studentId }: { studentId: string }) {
  const resolution = useStudentSubjectScope(studentId);
  if (resolution.state === 'loading') return <p role="status">Checking teacher review access…</p>;
  if (resolution.state !== 'ready' || resolution.scope.mode !== 'selected_student') return <p role="status">Teacher selections require an authorized selected-student view.</p>;
  return <SelectionPanel key={`${resolution.scope.actorId}:${resolution.scope.studentId}`} scope={resolution.scope} />;
}
function SelectionPanel({ scope }: { scope: StudentSubjectScope }) {
  const query = useQuery({ queryKey: ['review', 'teacher-selections', scope.actorId, scope.studentId], queryFn: () => loadScopedReviewSelections(scope), staleTime: 0 });
  const [chosen, setChosen] = useState<ReviewQueueItem | null>(null); const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false); const [failed, setFailed] = useState(false); const [saved, setSaved] = useState(false);
  const mounted = useRef(true); const pending = useRef<{ item: ReviewQueueItem; reason: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function select() {
    if (!pending.current && chosen) pending.current = { item: chosen, reason };
    if (!pending.current) return;
    const request = pending.current; setBusy(true); setFailed(false); setSaved(false);
    try {
      await selectScopedReview(scope, request.item, request.reason);
      if (!mounted.current) return;
      pending.current = null; setSaved(true); void query.refetch();
    } catch { if (mounted.current) setFailed(true); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <section aria-label="Teacher-selected review" className="space-y-3 border border-black/15 p-4">
    <h3 className="font-semibold">Select a saved submission for review</h3>
    <p className="text-xs text-black/60">This adds a review task with your reason to this student's Review queue. Supported here: saved misses from the three native Main Conclusion labs and Hard Sentences cluster/capstone. Original answers and flags stay unchanged.</p>
    {query.isLoading ? <p role="status">Loading supported saved submissions…</p> : query.isError ? <div role="alert"><p>{query.error instanceof StudentIdentityUnavailableError ? query.error.message : 'Supported review sources could not be loaded.'}</p><button className="min-h-11 underline" onClick={() => void query.refetch()}>Retry teacher review</button></div> : <>
      {!!query.data?.unavailable.length && <div role="alert"><p>Partial review data: {query.data.unavailable.join(', ')} could not be loaded.</p><button className="min-h-11 underline" onClick={() => void query.refetch()}>Retry teacher review</button></div>}
      {!query.data?.items.length ? <p>No supported saved misses are available.</p> : <ul className="space-y-2">{query.data.items.map(item => {
        const binding = boundedReviewBinding(item);
        const selected = query.data.episodes.find(episode => episode.actor_id === scope.actorId && episode.reason === 'teacher_selected' && episode.source_kind === binding?.source && episode.source_id === binding.sourceId);
        const reviewed = selected && reviewEpisodeState(query.data.events.filter(event => event.episode_id === selected.id)).completed;
        return <li key={item.key} className="border border-black/10 p-3"><strong className="text-sm">{item.label}</strong>
          {selected ? <p className="text-xs">Your saved reason: {selected.selection_reason} · {reviewed ? 'Reviewed by student' : 'Waiting for student review'}</p>
            : <button disabled={busy || pending.current !== null || !query.data.canSelect} className="block min-h-11 text-xs underline" onClick={() => { setChosen(item); setReason(''); setSaved(false); setFailed(false); }}>Choose this submission</button>}
        </li>;
      })}</ul>}
      {chosen && <div className="space-y-2"><p className="font-semibold text-sm">Selected: {chosen.label}</p>
        <label className="block text-sm">Reason for the student<textarea aria-label="Reason for the student" disabled={busy || pending.current !== null || saved} value={reason} onChange={event => setReason(event.target.value)} className="block w-full border p-2" /></label>
        {saved ? <p role="status">Teacher selection and reason are saved in the student's account.</p> : <button disabled={busy || !reason.trim() || !query.data?.canSelect} className="min-h-11 underline" onClick={() => void select()}>{failed ? 'Retry teacher selection' : 'Save teacher selection'}</button>}
        {failed && <div role="alert"><p>The selection was not confirmed. Your reason is retained. Retry this same selection, or reload to check for an existing saved reason.</p>
          <button disabled={busy} className="min-h-11 underline" onClick={() => { pending.current = null; setChosen(null); setFailed(false); setSaved(false); void query.refetch(); }}>Close editor and reload selections</button>
        </div>}
      </div>}
    </>}
  </section>;
}
