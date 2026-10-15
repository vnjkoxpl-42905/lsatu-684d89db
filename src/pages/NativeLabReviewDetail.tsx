import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { fetchOwnedNativeLabAttempt, type NativeLabReviewAttempt } from '@/components/review/nativeLabReviewSource';
import SavedReviewEpisodePanel from '@/components/review/SavedReviewEpisodePanel';
export default function NativeLabReviewDetail() {
  const { attemptId } = useParams(); const { user } = useAuth(); const [params] = useSearchParams();
  const returnTo = params.get('returnTo');
  const back = returnTo?.split('?')[0] === '/review/to-review' ? returnTo : '/review/to-review?reason=missed';
  const scope = `${user?.id}:${attemptId}`;
  const [saved, setSaved] = useState<{ scope: string; value: NativeLabReviewAttempt | null } | null>(null);
  const [loading, setLoading] = useState(true); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setFailed(false); setSaved(null);
    if (!user?.id || !attemptId) { setLoading(false); return; }
    void fetchOwnedNativeLabAttempt(user.id, attemptId).then(value => { if (active) setSaved({ scope, value }); })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id, attemptId, scope, retry]);
  const attempt = saved?.scope === scope ? saved.value : null;
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-7">
    <Link to={back} className="inline-flex min-h-11 items-center underline">Back to Review</Link>
    {loading ? <p role="status">Loading saved lab answer…</p> : failed ? <div role="alert"><p>This saved lab answer could not be loaded.</p><button className="min-h-11 underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>
      : !attempt ? <p>This saved lab miss is unavailable in your account.</p> : <>
        <h1 className="text-2xl font-semibold">{attempt.question.title}</h1>
        <p>{attempt.row.question_id} · Submission {attempt.ordinal} · {new Date(attempt.row.created_at).toLocaleDateString()}</p>
        <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">The exercise</h2><p>{attempt.question.stimulus}</p><ol className="space-y-2">{attempt.question.options.map((option, i) => <li key={i}>{attempt.kind === 'main-conclusion' ? `${i + 1}. ` : ''}{option.replace(/<[^>]+>/g, '')}</li>)}</ol></section>
        <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">Your saved answer</h2><p>{attempt.kind === 'main-conclusion' ? attempt.question.options[Number(attempt.answer)].replace(/<[^>]+>/g, '') : attempt.answer}</p></section>
        <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-semibold">How to reason through it</h2><p>{attempt.question.explanation}</p></section>
        <p className="text-sm text-muted-foreground">{attempt.ordinal === 1 ? 'This was the first submission for this question in this sitting.' : 'This was a later submission in the same sitting.'} The original saved outcome was incorrect. These labs provide immediate feedback after the account saves an answer; they do not record a separate Blind Review or reveal episode. Current authored wording is shown. Opening this page creates no attempt.</p>
        {user?.id && attemptId && <SavedReviewEpisodePanel ownerId={user.id} source="intro_lr_attempts" sourceId={attemptId} requestedEpisodeId={params.get('episode')} />}
      </>}
  </main>;
}
